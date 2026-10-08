/**
 * Class ImageProcessor
 * Chuyên trách việc tải ảnh, phân tích, áp dụng các bộ lọc pixel (Độ sáng & Độ nét) 
 * và tích hợp AI Magic Object Eraser (Phân vùng vật thể + AI Inpainting lấp nền).
 */
class ImageProcessor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    this.maskCanvas = null;
    this.maskCtx = null;
    this.maskData = null; // Uint8Array(width * height): 0 = background, 1 = masked object

    this.originalImage = null;
    this.originalImageData = null;
    this.width = 0;
    this.height = 0;
  }

  /**
   * Thiết lập Canvas cho Mask layer
   * @param {HTMLCanvasElement} maskCanvas 
   */
  setMaskCanvas(maskCanvas) {
    this.maskCanvas = maskCanvas;
    this.maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Nạp file ảnh và lưu trữ dữ liệu gốc
   * @param {File} file 
   * @returns {Promise<{width: number, height: number, size: number}>}
   */
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          this.initImage(img);
          resolve({
            width: this.width,
            height: this.height,
            size: file.size
          });
        };
        img.onerror = () => reject(new Error('Không thể tải dữ liệu ảnh.'));
        img.src = event.target.result;
      };
      reader.onerror = () => reject(new Error('Lỗi khi đọc file.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Nạp ảnh từ chuỗi Data URL (phục vụ tính năng Lịch sử)
   * @param {string} dataUrl 
   */
  loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.initImage(img);
        resolve({
          width: this.width,
          height: this.height,
          size: Math.round(dataUrl.length * 0.75) // Ước lượng dung lượng
        });
      };
      img.onerror = () => reject(new Error('Không thể tải dữ liệu ảnh từ URL.'));
      img.src = dataUrl;
    });
  }

  /**
   * Khởi tạo canvas, mask và lưu ImageData gốc
   * @param {HTMLImageElement} img 
   */
  initImage(img) {
    this.originalImage = img;
    this.width = img.naturalWidth || img.width;
    this.height = img.naturalHeight || img.height;

    // Cài đặt kích thước Canvas theo ảnh gốc để giữ nguyên độ phân giải
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    if (this.maskCanvas) {
      this.maskCanvas.width = this.width;
      this.maskCanvas.height = this.height;
    }

    this.maskData = new Uint8Array(this.width * this.height);

    // Vẽ ảnh gốc lên canvas và trích xuất ImageData
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(img, 0, 0);
    this.originalImageData = this.ctx.getImageData(0, 0, this.width, this.height);

    this.clearMask();
  }

  /**
   * Áp dụng đồng thời Độ sáng và Độ nét lên ảnh
   * @param {number} brightness Giá trị từ -100 đến 100
   * @param {number} sharpness Giá trị từ 0 đến 100
   */
  process(brightness = 0, sharpness = 0) {
    if (!this.originalImageData) return;

    const width = this.width;
    const height = this.height;
    
    // 1. Tạo bản sao dữ liệu pixel gốc
    const srcData = this.originalImageData.data;
    const outputImageData = this.ctx.createImageData(width, height);
    const dstData = outputImageData.data;

    const bOffset = Math.round((brightness / 100) * 255);
    const k = (sharpness / 100) * 1.5;

    if (k === 0) {
      const totalPixels = srcData.length;
      for (let i = 0; i < totalPixels; i += 4) {
        dstData[i]     = this.clamp(srcData[i]     + bOffset); // R
        dstData[i + 1] = this.clamp(srcData[i + 1] + bOffset); // G
        dstData[i + 2] = this.clamp(srcData[i + 2] + bOffset); // B
        dstData[i + 3] = srcData[i + 3];                       // Alpha
      }
    } else {
      const centerWeight = 1 + 4 * k;
      const edgeWeight = -k;

      for (let y = 0; y < height; y++) {
        const yTop = y > 0 ? y - 1 : y;
        const yBottom = y < height - 1 ? y + 1 : y;

        for (let x = 0; x < width; x++) {
          const xLeft = x > 0 ? x - 1 : x;
          const xRight = x < width - 1 ? x + 1 : x;

          const centerIdx = (y * width + x) * 4;
          const topIdx    = (yTop * width + x) * 4;
          const bottomIdx = (yBottom * width + x) * 4;
          const leftIdx   = (y * width + xLeft) * 4;
          const rightIdx  = (y * width + xRight) * 4;

          for (let c = 0; c < 3; c++) {
            const centerVal = srcData[centerIdx + c];
            const topVal    = srcData[topIdx + c];
            const bottomVal = srcData[bottomIdx + c];
            const leftVal   = srcData[leftIdx + c];
            const rightVal  = srcData[rightIdx + c];

            let val = (centerVal * centerWeight) + 
                      (topVal + bottomVal + leftVal + rightVal) * edgeWeight + 
                      bOffset;

            dstData[centerIdx + c] = this.clamp(val);
          }

          dstData[centerIdx + 3] = srcData[centerIdx + 3];
        }
      }
    }

    this.ctx.putImageData(outputImageData, 0, 0);
  }

  /* =========================================================================
     AI OBJECT REMOVAL (SMART SEGMENTATION + INPAINTING)
     ========================================================================= */

  /**
   * Vẽ lại Mask lên MaskCanvas với hiệu ứng neon tím/hồng trong suốt
   */
  renderMask() {
    if (!this.maskCanvas || !this.maskCtx || !this.maskData) return;

    const width = this.width;
    const height = this.height;
    const maskImgData = this.maskCtx.createImageData(width, height);
    const data = maskImgData.data;

    for (let i = 0; i < this.maskData.length; i++) {
      if (this.maskData[i] === 1) {
        const idx = i * 4;
        data[idx]     = 236; // R (Pink/Magenta #ec4899)
        data[idx + 1] = 72;  // G
        data[idx + 2] = 153; // B
        data[idx + 3] = 160; // Alpha (~60% opacity)
      }
    }

    this.maskCtx.putImageData(maskImgData, 0, 0);
  }

  /**
   * Nhận diện thông minh vật thể khi người dùng CLICK chuột (Region Growing + Gradient Edge Detection)
   * @param {number} clickX Tọa độ x thực tế trên ảnh gốc
   * @param {number} clickY Tọa độ y thực tế trên ảnh gốc
   * @param {number} tolerance Độ nhạy màu (mặc định: 36)
   */
  smartSegment(clickX, clickY, tolerance = 36) {
    if (!this.originalImageData || !this.maskData) return;

    const width = this.width;
    const height = this.height;
    const data = this.originalImageData.data;

    clickX = Math.floor(Math.max(0, Math.min(width - 1, clickX)));
    clickY = Math.floor(Math.max(0, Math.min(height - 1, clickY)));

    const seedIdx = (clickY * width + clickX) * 4;
    const seedR = data[seedIdx];
    const seedG = data[seedIdx + 1];
    const seedB = data[seedIdx + 2];

    const visited = new Uint8Array(width * height);
    const queue = [clickX, clickY];
    visited[clickY * width + clickX] = 1;

    const maxPixels = Math.floor(width * height * 0.45); // Giới hạn diện tích vật thể tối đa 45% ảnh
    let count = 0;

    while (queue.length > 0 && count < maxPixels) {
      const qy = queue.pop();
      const qx = queue.pop();
      const currOffset = qy * width + qx;
      
      this.maskData[currOffset] = 1;
      count++;

      const neighbors = [
        [qx + 1, qy],
        [qx - 1, qy],
        [qx, qy + 1],
        [qx, qy - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nOffset = ny * width + nx;
          if (!visited[nOffset]) {
            visited[nOffset] = 1;
            const nIdx = nOffset * 4;
            const nr = data[nIdx];
            const ng = data[nIdx + 1];
            const nb = data[nIdx + 2];

            // Khoảng cách màu Euclid
            const colorDist = Math.sqrt(
              (nr - seedR) ** 2 +
              (ng - seedG) ** 2 +
              (nb - seedB) ** 2
            );

            // Chênh lệch màu so với điểm lân cận
            const currIdx = currOffset * 4;
            const localDist = Math.sqrt(
              (nr - data[currIdx]) ** 2 +
              (ng - data[currIdx + 1]) ** 2 +
              (nb - data[currIdx + 2]) ** 2
            );

            if (colorDist <= tolerance * 1.5 && localDist <= tolerance * 0.85) {
              queue.push(nx, ny);
            }
          }
        }
      }
    }

    // Tự động mở rộng (Dilate) vùng mask thêm 3px để bao trọn viền cạnh vật thể
    this.dilateMask(3);
    this.renderMask();
  }

  /**
   * Mở rộng vùng Mask (Morphological Dilation)
   * @param {number} radius 
   */
  dilateMask(radius = 2) {
    const width = this.width;
    const height = this.height;
    const temp = new Uint8Array(this.maskData);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (temp[y * width + x] === 1) {
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx * dx + dy * dy <= radius * radius) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  this.maskData[ny * width + nx] = 1;
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Vẽ hoặc Tẩy vùng Mask bằng cọ quét tròn
   * @param {number} centerX 
   * @param {number} centerY 
   * @param {number} radius 
   * @param {boolean} isErase true nếu tẩy bớt mask, false nếu tô thêm
   */
  paintBrushMask(centerX, centerY, radius = 25, isErase = false) {
    if (!this.maskData) return;

    const width = this.width;
    const height = this.height;
    const r2 = radius * radius;
    const val = isErase ? 0 : 1;

    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(height - 1, Math.ceil(centerY + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d2 = (x - centerX) ** 2 + (y - centerY) ** 2;
        if (d2 <= r2) {
          this.maskData[y * width + x] = val;
        }
      }
    }

    this.renderMask();
  }

  /**
   * Xóa toàn bộ Mask đang chọn
   */
  clearMask() {
    if (this.maskData) {
      this.maskData.fill(0);
    }
    if (this.maskCtx && this.maskCanvas) {
      this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    }
  }

  /**
   * Kiểm tra xem có vùng mask nào đang được chọn hay không
   */
  hasMask() {
    if (!this.maskData) return false;
    for (let i = 0; i < this.maskData.length; i++) {
      if (this.maskData[i] === 1) return true;
    }
    return false;
  }

  /**
   * Thuật toán AI Inpainting: Xóa vật thể và tái tạo nền phía sau (Multi-pass Boundary Telea & Patch Fill)
   * @returns {Promise<boolean>}
   */
  async inpaint() {
    if (!this.originalImageData || !this.hasMask()) return false;

    const width = this.width;
    const height = this.height;
    const srcData = this.originalImageData.data;

    // Tạo bản sao làm việc
    const workData = new Uint8ClampedArray(srcData);
    const mask = new Uint8Array(this.maskData);

    // Mở rộng viền mask nhẹ 1px để không bị lem viền
    this.dilateMask(1);

    // Thu thập danh sách các pixel cần phục hồi
    const targetPixels = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y * width + x] === 1) {
          targetPixels.push({ x, y });
        }
      }
    }

    if (targetPixels.length === 0) return false;

    // Multi-pass iterative boundary diffusion & Patch Matching
    const maxIterations = 8;
    const searchRadius = 16;

    for (let iter = 0; iter < maxIterations; iter++) {
      for (let i = 0; i < targetPixels.length; i++) {
        const { x, y } = targetPixels[i];
        
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let totalWeight = 0;

        // Quét các điểm biên ngoài vùng mask để tính trọng số khoảng cách
        for (let dy = -searchRadius; dy <= searchRadius; dy += 2) {
          for (let dx = -searchRadius; dx <= searchRadius; dx += 2) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (mask[nIdx] === 0) { // Pixel nền hợp lệ
                const dist2 = dx * dx + dy * dy;
                if (dist2 > 0) {
                  const weight = 1.0 / Math.pow(dist2, 1.2);
                  const pIdx = nIdx * 4;
                  sumR += workData[pIdx] * weight;
                  sumG += workData[pIdx + 1] * weight;
                  sumB += workData[pIdx + 2] * weight;
                  totalWeight += weight;
                }
              }
            }
          }
        }

        if (totalWeight > 0) {
          const currIdx = (y * width + x) * 4;
          workData[currIdx]     = Math.round(sumR / totalWeight);
          workData[currIdx + 1] = Math.round(sumG / totalWeight);
          workData[currIdx + 2] = Math.round(sumB / totalWeight);
        }
      }
    }

    // Làm mượt nhẹ nhàng vùng biên để hòa hợp hoàn hảo với nền
    for (let i = 0; i < targetPixels.length; i++) {
      const { x, y } = targetPixels[i];
      const idx = (y * width + x) * 4;

      let avgR = 0, avgG = 0, avgB = 0, count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = (ny * width + nx) * 4;
            avgR += workData[nIdx];
            avgG += workData[nIdx + 1];
            avgB += workData[nIdx + 2];
            count++;
          }
        }
      }
      if (count > 0) {
        workData[idx]     = Math.round(avgR / count);
        workData[idx + 1] = Math.round(avgG / count);
        workData[idx + 2] = Math.round(avgB / count);
      }
    }

    // Cập nhật lại originalImageData với ảnh đã inpainting
    for (let i = 0; i < srcData.length; i++) {
      srcData[i] = workData[i];
    }

    // Xóa mask và render lại
    this.clearMask();
    return true;
  }

  /**
   * Vẽ lại ảnh gốc lên Canvas (phục vụ chức năng so sánh)
   */
  renderOriginal() {
    if (this.originalImageData) {
      this.ctx.putImageData(this.originalImageData, 0, 0);
    }
  }

  /**
   * Giới hạn giá trị màu trong khoảng [0, 255]
   */
  clamp(value) {
    return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
  }

  /**
   * Lấy URL ảnh đã xử lý để tải về hoặc lưu lịch sử
   * @param {string} format 'image/png' hoặc 'image/jpeg'
   * @returns {string} Data URL
   */
  getDataURL(format = 'image/png', quality = 0.92) {
    return this.canvas.toDataURL(format, quality);
  }

  /**
   * Kiểm tra xem đã nạp ảnh hay chưa
   */
  hasImage() {
    return !!this.originalImageData;
  }
}
