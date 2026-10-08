/**
 * Class ImageProcessor
 * Chuyên trách việc tải ảnh, phân tích và áp dụng các bộ lọc pixel (Độ sáng & Độ nét) trên HTML5 Canvas.
 */
class ImageProcessor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    this.originalImage = null;
    this.originalImageData = null;
    this.width = 0;
    this.height = 0;
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
   * Khởi tạo canvas và lưu ImageData gốc
   * @param {HTMLImageElement} img 
   */
  initImage(img) {
    this.originalImage = img;
    this.width = img.naturalWidth || img.width;
    this.height = img.naturalHeight || img.height;

    // Cài đặt kích thước Canvas theo ảnh gốc để giữ nguyên độ phân giải
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Vẽ ảnh gốc lên canvas và trích xuất ImageData
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(img, 0, 0);
    this.originalImageData = this.ctx.getImageData(0, 0, this.width, this.height);
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

    // Hệ số độ sáng (chuyển đổi từ -100..100 sang -255..255)
    const bOffset = Math.round((brightness / 100) * 255);
    
    // Hệ số độ nét k (0 -> 0, 100 -> 1.5)
    const k = (sharpness / 100) * 1.5;

    // Nếu không có hiệu ứng độ nét (k === 0), chỉ cần chỉnh độ sáng
    if (k === 0) {
      const totalPixels = srcData.length;
      for (let i = 0; i < totalPixels; i += 4) {
        dstData[i]     = this.clamp(srcData[i]     + bOffset); // R
        dstData[i + 1] = this.clamp(srcData[i + 1] + bOffset); // G
        dstData[i + 2] = this.clamp(srcData[i + 2] + bOffset); // B
        dstData[i + 3] = srcData[i + 3];                       // Alpha
      }
    } else {
      // Áp dụng bộ lọc ma trận làm nét (Unsharp 3x3 Convolution Kernel)
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

          // Xử lý lần lượt 3 kênh R, G, B
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

          // Giữ nguyên kênh Alpha
          dstData[centerIdx + 3] = srcData[centerIdx + 3];
        }
      }
    }

    // Vẽ kết quả lên Canvas
    this.ctx.putImageData(outputImageData, 0, 0);
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
