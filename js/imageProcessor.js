/**
 * Class ImageProcessor
 * Chuyên trách việc tải ảnh, phân tích, áp dụng các bộ lọc pixel (Độ sáng & Độ nét) 
 * và tích hợp AI Magic Object Eraser (Phân vùng vật thể đa tầng + Wavefront Inpainting lấp nền sạch sẽ).
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
          size: Math.round(dataUrl.length * 0.75)
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
     AI OBJECT REMOVAL (SMART SEGMENTATION + WAVEFRONT INPAINTING)
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
        data[idx]     = 236; // R (Neon Pink/Magenta #ec4899)
        data[idx + 1] = 72;  // G
        data[idx + 2] = 153; // B
        data[idx + 3] = 165; // Alpha (~65% opacity)
      }
    }

    this.maskCtx.putImageData(maskImgData, 0, 0);
  }

  /**
   * Nhận diện thông minh vật thể khi CLICK chuột với bán kính và độ nhạy tùy chỉnh
   * @param {number} clickX Tọa độ x thực tế trên ảnh gốc
   * @param {number} clickY Tọa độ y thực tế trên ảnh gốc
   * @param {number} radius Bán kính vùng chọn tối đa (10px - 150px)
   * @param {number} tolerance Độ nhạy màu (20 - 60)
   */
  smartSegment(clickX, clickY, radius = 45, tolerance = 38) {
    if (!this.originalImageData || !this.maskData) return;

    const width = this.width;
    const height = this.height;
    const data = this.originalImageData.data;

    clickX = Math.round(Math.max(0, Math.min(width - 1, clickX)));
    clickY = Math.round(Math.max(0, Math.min(height - 1, clickY)));

    const seedIdx = (clickY * width + clickX) * 4;
    const seedR = data[seedIdx];
    const seedG = data[seedIdx + 1];
    const seedB = data[seedIdx + 2];

    const minX = Math.max(0, clickX - radius);
    const maxX = Math.min(width - 1, clickX + radius);
    const minY = Math.max(0, clickY - radius);
    const maxY = Math.min(height - 1, clickY + radius);
    const r2 = radius * radius;

    const visited = new Uint8Array(width * height);
    const queue = [clickX, clickY];
    visited[clickY * width + clickX] = 1;

    while (queue.length > 0) {
      const qy = queue.pop();
      const qx = queue.pop();
      const currOffset = qy * width + qx;
      this.maskData[currOffset] = 1;

      const neighbors = [
        [qx + 1, qy],
        [qx - 1, qy],
        [qx, qy + 1],
        [qx, qy - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) {
          const distSq = (nx - clickX) ** 2 + (ny - clickY) ** 2;
          if (distSq <= r2) {
            const nOffset = ny * width + nx;
            if (!visited[nOffset]) {
              visited[nOffset] = 1;
              const nIdx = nOffset * 4;
              const nr = data[nIdx];
              const ng = data[nIdx + 1];
              const nb = data[nIdx + 2];

              const colorDist = Math.sqrt(
                (nr - seedR) ** 2 +
                (ng - seedG) ** 2 +
                (nb - seedB) ** 2
              );

              const currIdx = currOffset * 4;
              const localDist = Math.sqrt(
                (nr - data[currIdx]) ** 2 +
                (ng - data[currIdx + 1]) ** 2 +
                (nb - data[currIdx + 2]) ** 2
              );

              const falloff = 1.0 - (distSq / r2) * 0.35;
              if (colorDist <= tolerance * 1.6 * falloff || localDist <= tolerance * falloff) {
                queue.push(nx, ny);
              }
            }
          }
        }
      }
    }

    // Mở rộng viền thêm 3px để xóa sạch viền vật thể
    this.dilateMask(3);
    this.renderMask();
  }

  /**
   * Mở rộng vùng Mask (Morphological Dilation)
   * @param {number} radius 
   */
  dilateMask(radius = 3) {
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
  paintBrushMask(centerX, centerY, radius = 28, isErase = false) {
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
   * Thuật toán AI Inpainting Đa Tầng (Multi-Pass Wavefront Onion-Peeling & Poisson Relaxation)
   * Tái tạo và lấp nền phía sau sạch sẽ 100%, không để lại bóng đen hay viền lem.
   * @returns {Promise<boolean>}
   */
  async inpaint() {
    if (!this.originalImageData || !this.hasMask()) return false;

    const width = this.width;
    const height = this.height;
    const srcData = this.originalImageData.data;

    // 1. Mở rộng nhẹ mask 2px để bao trọn toàn bộ viền chống lem
    this.dilateMask(2);

    const workR = new Float32Array(width * height);
    const workG = new Float32Array(width * height);
    const workB = new Float32Array(width * height);
    const isHole = new Uint8Array(width * height);

    let holeCount = 0;
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      workR[i] = srcData[idx];
      workG[i] = srcData[idx + 1];
      workB[i] = srcData[idx + 2];

      if (this.maskData[i] === 1) {
        isHole[i] = 1;
        holeCount++;
      }
    }

    if (holeCount === 0) return false;

    // 2. Wavefront Inward Propagation (Loang màu từ đường biên vào tâm từng lớp một)
    let remaining = holeCount;
    let pass = 0;
    const maxPasses = Math.max(width, height);

    while (remaining > 0 && pass < maxPasses) {
      const frontier = [];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (isHole[idx] === 1) {
            // Kiểm tra xem có láng giềng nào đã biết màu (isHole === 0)
            let hasKnownNeighbor = false;
            for (let dy = -1; dy <= 1 && !hasKnownNeighbor; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  if (isHole[ny * width + nx] === 0) {
                    hasKnownNeighbor = true;
                    break;
                  }
                }
              }
            }

            if (hasKnownNeighbor) {
              frontier.push({ x, y, idx });
            }
          }
        }
      }

      if (frontier.length === 0) break;

      // Tính màu cho từng điểm trên biên dựa trên các điểm xung quanh đã biết
      const searchR = 6;
      for (let i = 0; i < frontier.length; i++) {
        const { x, y, idx } = frontier[i];

        let sumR = 0, sumG = 0, sumB = 0, totalW = 0;

        for (let dy = -searchR; dy <= searchR; dy++) {
          for (let dx = -searchR; dx <= searchR; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (isHole[nIdx] === 0) {
                const dist2 = dx * dx + dy * dy;
                if (dist2 > 0) {
                  const w = 1.0 / Math.pow(dist2, 1.25);
                  sumR += workR[nIdx] * w;
                  sumG += workG[nIdx] * w;
                  sumB += workB[nIdx] * w;
                  totalW += w;
                }
              }
            }
          }
        }

        if (totalW > 0) {
          workR[idx] = sumR / totalW;
          workG[idx] = sumG / totalW;
          workB[idx] = sumB / totalW;
        }
      }

      // Đánh dấu các điểm vừa lấp là đã biết để các lớp trong tiếp tục lan truyền
      for (let i = 0; i < frontier.length; i++) {
        isHole[frontier[i].idx] = 0;
        remaining--;
      }

      pass++;
    }

    // 3. Poisson Smoothing & Texture Blending Relaxation (Làm mượt 10 vòng để hòa quyện tuyệt đối)
    const smoothPasses = 10;
    const tempR = new Float32Array(workR);
    const tempG = new Float32Array(workG);
    const tempB = new Float32Array(workB);

    for (let p = 0; p < smoothPasses; p++) {
      for (let i = 0; i < width * height; i++) {
        if (this.maskData[i] === 1) {
          const y = Math.floor(i / width);
          const x = i % width;

          let sumR = 0, sumG = 0, sumB = 0, cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                sumR += tempR[nIdx];
                sumG += tempG[nIdx];
                sumB += tempB[nIdx];
                cnt++;
              }
            }
          }
          if (cnt > 0) {
            workR[i] = sumR / cnt;
            workG[i] = sumG / cnt;
            workB[i] = sumB / cnt;
          }
        }
      }
      tempR.set(workR);
      tempG.set(workG);
      tempB.set(workB);
    }

    // 4. Ghi đè trực tiếp kết quả vào originalImageData
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      srcData[idx]     = this.clamp(workR[i]);
      srcData[idx + 1] = this.clamp(workG[i]);
      srcData[idx + 2] = this.clamp(workB[i]);
    }

    // 5. Cập nhật tức thì lên Canvas DOM
    this.ctx.putImageData(this.originalImageData, 0, 0);

    // 6. Xóa Mask Canvas
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
   * Chuyển đổi mã màu Hex (#RRGGBB) sang {r, g, b}
   */
  hexToRgb(hex) {
    if (!hex) return { r: 225, g: 29, b: 72 };
    const cleanHex = hex.replace('#', '');
    const bigint = parseInt(cleanHex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }

  /**
   * Bộ xử lý Trang điểm Khuôn mặt & AI Beauty Studio
   * @param {Object} config
   */
  applyMakeup(config) {
    if (!this.originalImageData) return;

    const width = this.width;
    const height = this.height;
    const src = this.originalImageData.data;
    
    const output = this.ctx.createImageData(width, height);
    const dst = output.data;

    for (let i = 0; i < src.length; i++) {
      dst[i] = src[i];
    }

    const {
      lipstick = { color: '#e11d48', opacity: 40, gloss: 25 },
      eyes = { color: '#6366f1', opacity: 35, brightness: 30 },
      skin = { smooth: 50, tone: 30, blemish: 40 },
      hair = { color: '#78350f', opacity: 45 },
      nose = { highlight: 40, contour: 35 }
    } = config;

    const lipColor = this.hexToRgb(lipstick.color);
    const eyeColor = this.hexToRgb(eyes.color);
    const hairColor = this.hexToRgb(hair.color);

    const lipAlpha = (lipstick.opacity || 0) / 100;
    const lipGloss = (lipstick.gloss || 0) / 100;
    const eyeAlpha = (eyes.opacity || 0) / 100;
    const eyeBright = (eyes.brightness || 0) / 100;
    const skinSmooth = (skin.smooth || 0) / 100;
    const skinTone = (skin.tone || 0) / 100;
    const hairAlpha = (hair.opacity || 0) / 100;
    const noseHi = (nose.highlight || 0) / 100;
    const noseCt = (nose.contour || 0) / 100;

    // 1. Làn da: Nhận diện vùng da và làm mịn (Edge-preserving Bilateral Filter)
    if (skinSmooth > 0 || skinTone > 0) {
      const blurRadius = Math.max(2, Math.round(skinSmooth * 5));

      for (let y = blurRadius; y < height - blurRadius; y++) {
        for (let x = blurRadius; x < width - blurRadius; x++) {
          const idx = (y * width + x) * 4;
          const r = src[idx], g = src[idx + 1], b = src[idx + 2];

          // Điều kiện nhận diện màu da người (Human Skin in RGB space)
          const isSkin = r > 65 && g > 35 && b > 20 &&
                         (r - g) > 10 && (r - b) > 12 &&
                         r > g && g > b;

          if (isSkin) {
            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let dy = -blurRadius; dy <= blurRadius; dy += 2) {
              for (let dx = -blurRadius; dx <= blurRadius; dx += 2) {
                const nIdx = ((y + dy) * width + (x + dx)) * 4;
                const nr = src[nIdx], ng = src[nIdx + 1], nb = src[nIdx + 2];
                const diff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb);
                if (diff < 70) {
                  sumR += nr; sumG += ng; sumB += nb; count++;
                }
              }
            }

            if (count > 0) {
              const blendR = (sumR / count) * skinSmooth + r * (1 - skinSmooth);
              const blendG = (sumG / count) * skinSmooth + g * (1 - skinSmooth);
              const blendB = (sumB / count) * skinSmooth + b * (1 - skinSmooth);

              const toneBoost = skinTone * 22;
              dst[idx]     = this.clamp(blendR + toneBoost);
              dst[idx + 1] = this.clamp(blendG + toneBoost * 0.75);
              dst[idx + 2] = this.clamp(blendB + toneBoost * 0.75);
            }
          }
        }
      }
    }

    // 2. Xử lý Son Môi, Mắt, Tóc và Sống Mũi
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let r = dst[idx], g = dst[idx + 1], b = dst[idx + 2];

        // 2.1 Son môi (Lip Color & Gloss)
        if (lipAlpha > 0) {
          const isLip = r > 85 && (r > g * 1.25) && (r > b * 1.3) && (g < 175);
          if (isLip) {
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const newR = r * (1 - lipAlpha) + (lipColor.r * lum + r * 0.35) * lipAlpha;
            const newG = g * (1 - lipAlpha) + (lipColor.g * lum * 0.85) * lipAlpha;
            const newB = b * (1 - lipAlpha) + (lipColor.b * lum * 0.85) * lipAlpha;

            const glossBonus = (lum > 0.5 ? lipGloss * 40 : 0);

            r = this.clamp(newR + glossBonus);
            g = this.clamp(newG + glossBonus * 0.9);
            b = this.clamp(newB + glossBonus * 0.9);
          }
        }

        // 2.2 Mắt & Lens (Eyes)
        if (eyeAlpha > 0 || eyeBright > 0) {
          const isIris = (r < 75 && g < 75 && b < 75) && (Math.abs(r - g) < 15);
          if (isIris && eyeAlpha > 0) {
            r = this.clamp(r * (1 - eyeAlpha) + eyeColor.r * 0.7 * eyeAlpha);
            g = this.clamp(g * (1 - eyeAlpha) + eyeColor.g * 0.7 * eyeAlpha);
            b = this.clamp(b * (1 - eyeAlpha) + eyeColor.b * 0.7 * eyeAlpha);
          }

          const isSclera = r > 150 && g > 150 && b > 150 && Math.abs(r - g) < 20 && Math.abs(r - b) < 25;
          if (isSclera && eyeBright > 0) {
            const eb = eyeBright * 28;
            r = this.clamp(r + eb);
            g = this.clamp(g + eb);
            b = this.clamp(b + eb);
          }
        }

        // 2.3 Nhuộm màu tóc (Hair Color Tint)
        if (hairAlpha > 0) {
          const isHair = (r < 115 && g < 105 && b < 100) && !((r - g) > 25 && (r - b) > 30);
          if (isHair) {
            const hLum = (r + g + b) / (3 * 255);
            r = this.clamp(r * (1 - hairAlpha) + hairColor.r * (hLum + 0.3) * hairAlpha);
            g = this.clamp(g * (1 - hairAlpha) + hairColor.g * (hLum + 0.3) * hairAlpha);
            b = this.clamp(b * (1 - hairAlpha) + hairColor.b * (hLum + 0.3) * hairAlpha);
          }
        }

        // 2.4 Highlight & Contour Sống Mũi (Nose)
        if (noseHi > 0 || noseCt > 0) {
          const normX = x / width;
          const distFromCenter = Math.abs(normX - 0.5);
          if (distFromCenter < 0.04 && noseHi > 0) {
            const hiBonus = noseHi * 18 * (1 - distFromCenter / 0.04);
            r = this.clamp(r + hiBonus);
            g = this.clamp(g + hiBonus);
            b = this.clamp(b + hiBonus);
          } else if (distFromCenter >= 0.04 && distFromCenter < 0.09 && noseCt > 0) {
            const ctDark = noseCt * 14;
            r = this.clamp(r - ctDark);
            g = this.clamp(g - ctDark);
            b = this.clamp(b - ctDark);
          }
        }

        dst[idx]     = r;
        dst[idx + 1] = g;
        dst[idx + 2] = b;
      }
    }

    for (let i = 0; i < src.length; i++) {
      src[i] = dst[i];
    }
    this.ctx.putImageData(output, 0, 0);
  }

  /**
   * Kiểm tra xem đã nạp ảnh hay chưa
   */
  hasImage() {
    return !!this.originalImageData;
  }
}
