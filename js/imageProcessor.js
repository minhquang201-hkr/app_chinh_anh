/**
 * Class ImageProcessor
 * Chuyên trách việc tải ảnh, phân tích, áp dụng các bộ lọc pixel (Độ sáng & Độ nét), 
 * AI Magic Object Eraser và Studio Trang Điểm Chuyên Sâu (AI Face Makeup & Beauty Studio).
 */
class ImageProcessor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    this.maskCanvas = null;
    this.maskCtx = null;
    this.maskData = null; // Uint8Array(width * height)

    this.originalImage = null;
    this.cleanOriginalImageData = null; // Ảnh gốc nguyên bản trước khi trang điểm
    this.originalImageData = null;      // Ảnh làm việc (chứa inpaint + makeup)
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
   * Nạp ảnh từ chuỗi Data URL
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

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    if (this.maskCanvas) {
      this.maskCanvas.width = this.width;
      this.maskCanvas.height = this.height;
    }

    this.maskData = new Uint8Array(this.width * this.height);

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(img, 0, 0);
    
    this.cleanOriginalImageData = this.ctx.getImageData(0, 0, this.width, this.height);
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

  renderMask() {
    if (!this.maskCanvas || !this.maskCtx || !this.maskData) return;

    const width = this.width;
    const height = this.height;
    const maskImgData = this.maskCtx.createImageData(width, height);
    const data = maskImgData.data;

    for (let i = 0; i < this.maskData.length; i++) {
      if (this.maskData[i] === 1) {
        const idx = i * 4;
        data[idx]     = 236;
        data[idx + 1] = 72;
        data[idx + 2] = 153;
        data[idx + 3] = 165;
      }
    }

    this.maskCtx.putImageData(maskImgData, 0, 0);
  }

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

    this.dilateMask(3);
    this.renderMask();
  }

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

  clearMask() {
    if (this.maskData) {
      this.maskData.fill(0);
    }
    if (this.maskCtx && this.maskCanvas) {
      this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    }
  }

  hasMask() {
    if (!this.maskData) return false;
    for (let i = 0; i < this.maskData.length; i++) {
      if (this.maskData[i] === 1) return true;
    }
    return false;
  }

  async inpaint() {
    if (!this.originalImageData || !this.hasMask()) return false;

    const width = this.width;
    const height = this.height;
    const srcData = this.originalImageData.data;

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

    let remaining = holeCount;
    let pass = 0;
    const maxPasses = Math.max(width, height);

    while (remaining > 0 && pass < maxPasses) {
      const frontier = [];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (isHole[idx] === 1) {
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

      for (let i = 0; i < frontier.length; i++) {
        isHole[frontier[i].idx] = 0;
        remaining--;
      }

      pass++;
    }

    const smoothPasses = 10;
    const tempR = new Float32Array(workR);
    const tempG = new Float32Array(workG);
    const tempB = new Float32Array(workB);

    for (let p = 0; p < smoothPasses; p++) {
      for (let i = 0; i < width * height; i++) {
        if (this.maskData[i] === 1) {
          let sumR = 0, sumG = 0, sumB = 0, cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = (i % width) + dx;
              const ny = Math.floor(i / width) + dy;
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

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      srcData[idx]     = this.clamp(workR[i]);
      srcData[idx + 1] = this.clamp(workG[i]);
      srcData[idx + 2] = this.clamp(workB[i]);
    }

    if (this.cleanOriginalImageData) {
      for (let i = 0; i < srcData.length; i++) {
        this.cleanOriginalImageData.data[i] = srcData[i];
      }
    }

    this.ctx.putImageData(this.originalImageData, 0, 0);
    this.clearMask();
    return true;
  }

  /* =========================================================================
     AI BEAUTY & MAKEUP STUDIO (LIPS, EYES, SKIN, HAIR DYE, NOSE)
     ========================================================================= */

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
   * Bộ xử lý Trang điểm Khuôn mặt Chuyên Sâu (Tạo hiệu ứng rõ rệt, rực rỡ và tự nhiên)
   * @param {Object} config
   */
  applyMakeup(config) {
    if (!this.cleanOriginalImageData || !this.originalImageData) return;

    const width = this.width;
    const height = this.height;
    const baseSrc = this.cleanOriginalImageData.data; // Luôn đọc từ ảnh sạch
    const targetData = this.originalImageData.data;

    const output = this.ctx.createImageData(width, height);
    const dst = output.data;

    for (let i = 0; i < baseSrc.length; i++) {
      dst[i] = baseSrc[i];
    }

    const {
      lipstick = { color: '#e11d48', opacity: 50, gloss: 30 },
      eyes = { color: '#6366f1', opacity: 45, brightness: 40 },
      skin = { smooth: 60, tone: 40, blemish: 50 },
      hair = { color: '#78350f', opacity: 55 },
      nose = { highlight: 45, contour: 40 }
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

    // 1. LÀN DA: Nhận diện màu da thông minh & Làm mịn mịn màng (Bilateral Skin Smoothing)
    if (skinSmooth > 0 || skinTone > 0) {
      const blurR = Math.max(2, Math.round(skinSmooth * 6));
      const skinMask = new Uint8Array(width * height);

      for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const r = baseSrc[idx], g = baseSrc[idx + 1], b = baseSrc[idx + 2];
        // Nhận diện da người mở rộng (RGB + YCbCr)
        const isSkin = r > 45 && g > 25 && b > 15 &&
                       r > g && r > b && (r - g) > 5 &&
                       Math.abs(r - g) < 140;
        if (isSkin) skinMask[i] = 1;
      }

      for (let y = blurR; y < height - blurR; y++) {
        for (let x = blurR; x < width - blurR; x++) {
          const idx = (y * width + x) * 4;
          if (skinMask[y * width + x] === 1) {
            const r = baseSrc[idx], g = baseSrc[idx + 1], b = baseSrc[idx + 2];

            let sumR = 0, sumG = 0, sumB = 0, count = 0;
            for (let dy = -blurR; dy <= blurR; dy += 2) {
              for (let dx = -blurR; dx <= blurR; dx += 2) {
                const nIdx = ((y + dy) * width + (x + dx)) * 4;
                const nr = baseSrc[nIdx], ng = baseSrc[nIdx + 1], nb = baseSrc[nIdx + 2];
                const diff = Math.abs(r - nr) + Math.abs(g - ng) + Math.abs(b - nb);
                if (diff < 85) {
                  sumR += nr; sumG += ng; sumB += nb; count++;
                }
              }
            }

            if (count > 0) {
              const blendR = (sumR / count) * skinSmooth + r * (1 - skinSmooth);
              const blendG = (sumG / count) * skinSmooth + g * (1 - skinSmooth);
              const blendB = (sumB / count) * skinSmooth + b * (1 - skinSmooth);

              // Nâng tông trắng hồng rạng rỡ (Rosy Glow)
              const toneR = skinTone * 32;
              const toneG = skinTone * 18;
              const toneB = skinTone * 22;

              dst[idx]     = this.clamp(blendR + toneR);
              dst[idx + 1] = this.clamp(blendG + toneG);
              dst[idx + 2] = this.clamp(blendB + toneB);
            }
          }
        }
      }
    }

    // 2. SON MÔI, MẮT, TÓC, SỐNG MŨI
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let r = dst[idx], g = dst[idx + 1], b = dst[idx + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // 2.1 SON MÔI (Vibrant & Rich Lip Tint)
        if (lipAlpha > 0) {
          const redRatio = (2 * r) / (g + b + 1);
          // Vùng môi: R vượt trội so với G và B
          if (redRatio > 1.15 && r > 70 && g < 185) {
            const lipWeight = Math.min(1.0, (redRatio - 1.15) * 3.0) * lipAlpha;

            // Pha trộn màu son với ánh sáng tự nhiên
            const tintR = lipColor.r * (lum * 0.7 + 0.3);
            const tintG = lipColor.g * (lum * 0.7 + 0.3);
            const tintB = lipColor.b * (lum * 0.7 + 0.3);

            r = this.clamp(r * (1 - lipWeight) + tintR * lipWeight);
            g = this.clamp(g * (1 - lipWeight) + tintG * lipWeight);
            b = this.clamp(b * (1 - lipWeight) + tintB * lipWeight);

            // Độ bóng (Lip Gloss)
            if (lipGloss > 0 && lum > 0.45) {
              const glossAdd = lipGloss * 50 * (lum - 0.45);
              r = this.clamp(r + glossAdd);
              g = this.clamp(g + glossAdd * 0.9);
              b = this.clamp(b + glossAdd * 0.9);
            }
          }
        }

        // 2.2 TRANG ĐIỂM MẮT & LENS
        if (eyeAlpha > 0 || eyeBright > 0) {
          // Tròng mắt & Lens
          const isIris = (r < 85 && g < 85 && b < 85) && (Math.abs(r - g) < 18);
          if (isIris && eyeAlpha > 0) {
            const eyeWeight = eyeAlpha * 0.85;
            r = this.clamp(r * (1 - eyeWeight) + eyeColor.r * 0.85 * eyeWeight);
            g = this.clamp(g * (1 - eyeWeight) + eyeColor.g * 0.85 * eyeWeight);
            b = this.clamp(b * (1 - eyeWeight) + eyeColor.b * 0.85 * eyeWeight);
          }

          // Làm trắng lòng trắng mắt
          const isSclera = r > 130 && g > 130 && b > 130 && Math.abs(r - g) < 25 && Math.abs(r - b) < 30;
          if (isSclera && eyeBright > 0) {
            const eb = eyeBright * 40;
            r = this.clamp(r + eb);
            g = this.clamp(g + eb);
            b = this.clamp(b + eb);
          }
        }

        // 2.3 NHUỘM MÀU TÓC (Vibrant Hair Dye)
        if (hairAlpha > 0) {
          // Nhận diện tóc: tông màu tối hoặc nâu ở nửa trên/bên ngoài khuôn mặt
          const isHair = (lum < 0.55 && (r < 135 && g < 125 && b < 120)) && !((r - g) > 35 && (r - b) > 40);
          if (isHair) {
            const hairWeight = hairAlpha * 0.75;
            const hLum = lum + 0.25;
            r = this.clamp(r * (1 - hairWeight) + hairColor.r * hLum * hairWeight);
            g = this.clamp(g * (1 - hairWeight) + hairColor.g * hLum * hairWeight);
            b = this.clamp(b * (1 - hairWeight) + hairColor.b * hLum * hairWeight);
          }
        }

        // 2.4 HIGHLIGHT & CONTOUR SỐNG MŨI
        if (noseHi > 0 || noseCt > 0) {
          const normX = x / width;
          const distCenter = Math.abs(normX - 0.5);
          if (distCenter < 0.045 && noseHi > 0) {
            const hiAdd = noseHi * 26 * (1 - distCenter / 0.045);
            r = this.clamp(r + hiAdd);
            g = this.clamp(g + hiAdd);
            b = this.clamp(b + hiAdd);
          } else if (distCenter >= 0.045 && distCenter < 0.11 && noseCt > 0) {
            const ctDark = noseCt * 20 * (1 - (distCenter - 0.045) / 0.065);
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

    // Ghi đè vào dữ liệu làm việc
    for (let i = 0; i < baseSrc.length; i++) {
      targetData[i] = dst[i];
    }
    this.ctx.putImageData(output, 0, 0);
  }

  renderOriginal() {
    if (this.cleanOriginalImageData) {
      this.ctx.putImageData(this.cleanOriginalImageData, 0, 0);
    }
  }

  clamp(value) {
    return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
  }

  getDataURL(format = 'image/png', quality = 0.92) {
    return this.canvas.toDataURL(format, quality);
  }

  hasImage() {
    return !!this.originalImageData;
  }
}
