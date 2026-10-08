/**
 * App.js
 * Điều phối toàn bộ hoạt động của ứng dụng: ImageProcessor, UI, AuthManager & HistoryManager.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const ui = new UI();
  const processor = new ImageProcessor(ui.getCanvas());
  const auth = new AuthManager();
  const historyMgr = new HistoryManager();

  // Khởi tạo IndexedDB
  await historyMgr.init();

  // Khởi tạo Mask Canvas cho ImageProcessor
  if (ui.maskCanvas) {
    processor.setMaskCanvas(ui.maskCanvas);
  }

  // Trạng thái ứng dụng
  const state = {
    brightness: 0,
    sharpness: 0,
    fileName: 'lumina_edited.png',
    rafId: null,
    eraserMode: 'click', // 'click' | 'brush' | 'erase'
    clickRadius: 45,
    brushSize: 28,
    isPainting: false,
  };

  /**
   * Lấy User ID hiện tại (hoặc 'guest' nếu chưa đăng nhập)
   */
  function getCurrentUserId() {
    return auth.currentUser ? auth.currentUser.id : 'guest';
  }

  /**
   * Tải và cập nhật danh sách lịch sử ảnh
   */
  async function refreshHistoryUI() {
    const userId = getCurrentUserId();
    const items = await historyMgr.getHistoryByUser(userId);
    ui.renderHistory(
      items,
      // Khi click mở ảnh từ lịch sử
      async (item) => {
        try {
          ui.setLoading(true);
          state.fileName = item.fileName;
          const meta = await processor.loadImageFromDataUrl(item.imageDataUrl);
          ui.enableControls();
          ui.updateImageMetadata(meta);
          
          state.brightness = item.brightness || 0;
          state.sharpness = item.sharpness || 0;
          ui.updateSliderDisplay(state.brightness, state.sharpness);
          
          ui.toggleHistoryModal(false);
          ui.showToast(`Đã mở lại ảnh "${item.fileName}"`, 'success');
        } catch (err) {
          console.error('Lỗi khi mở lại ảnh:', err);
          ui.showToast('Không thể mở ảnh từ lịch sử.', 'error');
        } finally {
          ui.setLoading(false);
        }
      },
      // Khi click xoá ảnh khỏi lịch sử
      async (itemId) => {
        await historyMgr.deleteHistoryItem(itemId);
        ui.showToast('Đã xoá ảnh khỏi lịch sử', 'info');
        refreshHistoryUI();
      }
    );
  }

  /**
   * Khởi tạo giao diện người dùng & phiên làm việc
   */
  ui.updateAuthUI(auth.currentUser);
  await refreshHistoryUI();

  /**
   * Cập nhật và vẽ lại ảnh với hiệu ứng mượt mà qua requestAnimationFrame
   */
  function scheduleRender() {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
    }
    state.rafId = requestAnimationFrame(() => {
      processor.process(state.brightness, state.sharpness);
      state.rafId = null;
    });
  }

  /**
   * Xử lý nạp file ảnh từ máy tính
   * @param {File} file 
   */
  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      ui.showToast('Vui lòng chọn một file hình ảnh hợp lệ (PNG, JPG, WEBP,...)', 'error');
      return;
    }

    try {
      ui.setLoading(true);
      state.fileName = file.name.replace(/\.[^/.]+$/, '') + '_edited.png';
      
      const meta = await processor.loadImage(file);
      ui.enableControls();
      ui.updateImageMetadata(meta);

      // Đặt lại các thông số về mặc định khi nạp ảnh mới
      resetFilters();
      ui.showToast('Đã tải ảnh lên thành công!', 'success');
    } catch (error) {
      console.error('Lỗi khi tải ảnh:', error);
      ui.showToast('Đã xảy ra lỗi khi mở hình ảnh này.', 'error');
    } finally {
      ui.setLoading(false);
    }
  }

  /**
   * Đặt lại toàn bộ bộ lọc về 0
   */
  function resetFilters() {
    state.brightness = 0;
    state.sharpness = 0;
    ui.updateSliderDisplay(0, 0);
    scheduleRender();
  }

  /**
   * Lưu ảnh hiện tại vào lịch sử và chốt trạng thái làm việc
   */
  async function saveCurrentToHistory() {
    if (!processor.hasImage()) return;

    try {
      ui.setLoading(true);
      if (ui.loadingText) ui.loadingText.textContent = '💾 Đang lưu phiên bản ảnh...';
      await new Promise(r => setTimeout(r, 40));

      const dataUrl = processor.getDataURL('image/png', 1.0);
      await historyMgr.saveHistoryItem({
        userId: getCurrentUserId(),
        fileName: state.fileName,
        imageDataUrl: dataUrl,
        brightness: state.brightness,
        sharpness: state.sharpness,
        width: processor.width,
        height: processor.height
      });

      await refreshHistoryUI();
      ui.showToast('💾 Đã lưu ảnh thành công vào Lịch sử!', 'success');
    } catch (e) {
      console.error('Lỗi khi lưu lịch sử:', e);
      ui.showToast('Không thể lưu ảnh vào lịch sử.', 'error');
    } finally {
      ui.setLoading(false);
      if (ui.loadingText) ui.loadingText.textContent = 'Đang xử lý pixel...';
    }
  }

  /* ================= LẮNG NGHE SỰ KIỆN XỬ LÝ ẢNH ================= */

  // Chọn file qua input
  ui.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });

  // Kéo và thả file ảnh vào Drop Zone
  const dropZone = ui.dropZone;
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files && dt.files[0]) {
      handleFile(dt.files[0]);
    }
  });

  // Thanh trượt Độ sáng (Brightness)
  ui.brightnessSlider.addEventListener('input', (e) => {
    state.brightness = parseInt(e.target.value, 10);
    ui.updateSliderDisplay(state.brightness, state.sharpness);
    scheduleRender();
  });

  // Thanh trượt Độ nét (Sharpness)
  ui.sharpnessSlider.addEventListener('input', (e) => {
    state.sharpness = parseInt(e.target.value, 10);
    ui.updateSliderDisplay(state.brightness, state.sharpness);
    scheduleRender();
  });

  // Nút Đặt lại (Reset)
  ui.btnReset.addEventListener('click', () => {
    resetFilters();
    ui.showToast('Đã khôi phục thông số mặc định', 'info');
  });

  // Nút Lưu trên Header và Sidebar
  if (ui.btnSaveTop) {
    ui.btnSaveTop.addEventListener('click', () => saveCurrentToHistory());
  }
  if (ui.btnSaveHistory) {
    ui.btnSaveHistory.addEventListener('click', () => saveCurrentToHistory());
  }

  // Phím tắt Ctrl+S / Cmd+S để lưu ảnh nhanh
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (processor.hasImage()) {
        saveCurrentToHistory();
      }
    }
  });

  // Nút Tải ảnh về (Download)
  ui.btnDownload.addEventListener('click', async () => {
    if (!processor.hasImage()) return;
    
    const link = document.createElement('a');
    link.download = state.fileName;
    const dataUrl = processor.getDataURL('image/png', 1.0);
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Tự động lưu bản ghi vào Lịch sử
    await saveCurrentToHistory();
    ui.showToast('Đã tải ảnh về máy thành công!', 'success');
  });

  // Giữ chuột để so sánh với ảnh gốc (Hold to Compare)
  const startCompare = (e) => {
    e.preventDefault();
    if (!processor.hasImage()) return;
    processor.renderOriginal();
    ui.btnCompare.classList.add('active');
  };

  const endCompare = (e) => {
    e.preventDefault();
    if (!processor.hasImage()) return;
    scheduleRender();
    ui.btnCompare.classList.remove('active');
  };

  ui.btnCompare.addEventListener('mousedown', startCompare);
  ui.btnCompare.addEventListener('mouseup', endCompare);
  ui.btnCompare.addEventListener('mouseleave', endCompare);
  ui.btnCompare.addEventListener('touchstart', startCompare);
  ui.btnCompare.addEventListener('touchend', endCompare);

  // Preset hiệu ứng nhanh
  ui.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      switch (preset) {
        case 'brighten':
          state.brightness = 25;
          state.sharpness = 0;
          break;
        case 'sharpen':
          state.brightness = 0;
          state.sharpness = 60;
          break;
        case 'vivid':
          state.brightness = 20;
          state.sharpness = 45;
          break;
        case 'moody':
          state.brightness = -20;
          state.sharpness = 30;
          break;
      }
      ui.updateSliderDisplay(state.brightness, state.sharpness);
      scheduleRender();
    });
  });

  /* ================= LẮNG NGHE SỰ KIỆN AI OBJECT ERASER ================= */

  /**
   * Chuyển đổi tọa độ con trỏ trên màn hình sang tọa độ pixel thực tế của ảnh gốc
   */
  function getRealCoords(e) {
    if (!ui.maskCanvas || !processor.hasImage()) return { x: 0, y: 0 };
    const rect = ui.maskCanvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    const scaleX = processor.width / rect.width;
    const scaleY = processor.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  // Chuyển đổi các chế độ Eraser (Click / Brush / Erase Mask)
  function setEraserMode(mode) {
    state.eraserMode = mode;
    [ui.btnModeClick, ui.btnModeBrush, ui.btnModeEraseMask].forEach(b => b.classList.remove('active'));

    if (mode === 'click') {
      ui.btnModeClick.classList.add('active');
      if (ui.clickSizeRow) ui.clickSizeRow.classList.remove('hidden');
      if (ui.brushSizeRow) ui.brushSizeRow.classList.add('hidden');
      if (ui.maskCanvas) ui.maskCanvas.style.cursor = 'crosshair';
    } else if (mode === 'brush') {
      ui.btnModeBrush.classList.add('active');
      if (ui.clickSizeRow) ui.clickSizeRow.classList.add('hidden');
      if (ui.brushSizeRow) ui.brushSizeRow.classList.remove('hidden');
      if (ui.maskCanvas) ui.maskCanvas.style.cursor = 'cell';
    } else if (mode === 'erase') {
      ui.btnModeEraseMask.classList.add('active');
      if (ui.clickSizeRow) ui.clickSizeRow.classList.add('hidden');
      if (ui.brushSizeRow) ui.brushSizeRow.classList.remove('hidden');
      if (ui.maskCanvas) ui.maskCanvas.style.cursor = 'alias';
    }
  }

  ui.btnModeClick.addEventListener('click', () => setEraserMode('click'));
  ui.btnModeBrush.addEventListener('click', () => setEraserMode('brush'));
  ui.btnModeEraseMask.addEventListener('click', () => setEraserMode('erase'));

  // Slider cỡ vùng chọn Click
  if (ui.clickSizeSlider) {
    ui.clickSizeSlider.addEventListener('input', (e) => {
      state.clickRadius = parseInt(e.target.value, 10);
      if (ui.clickSizeVal) ui.clickSizeVal.textContent = `${state.clickRadius}px`;
    });
  }

  // Slider cỡ cọ
  if (ui.brushSizeSlider) {
    ui.brushSizeSlider.addEventListener('input', (e) => {
      state.brushSize = parseInt(e.target.value, 10);
      if (ui.brushSizeVal) ui.brushSizeVal.textContent = `${state.brushSize}px`;
    });
  }

  // Tương tác chuột trên Mask Canvas
  if (ui.maskCanvas) {
    const startAction = (e) => {
      if (!processor.hasImage()) return;
      e.preventDefault();
      const coords = getRealCoords(e);

      if (state.eraserMode === 'click') {
        processor.smartSegment(coords.x, coords.y, state.clickRadius, 38);
        ui.showToast('Đã nhận diện vùng vật thể!', 'info');
      } else {
        state.isPainting = true;
        processor.paintBrushMask(coords.x, coords.y, state.brushSize, state.eraserMode === 'erase');
      }
    };

    const moveAction = (e) => {
      if (!processor.hasImage() || !state.isPainting) return;
      e.preventDefault();
      const coords = getRealCoords(e);
      processor.paintBrushMask(coords.x, coords.y, state.brushSize, state.eraserMode === 'erase');
    };

    const stopAction = () => {
      state.isPainting = false;
    };

    ui.maskCanvas.addEventListener('mousedown', startAction);
    ui.maskCanvas.addEventListener('mousemove', moveAction);
    window.addEventListener('mouseup', stopAction);

    ui.maskCanvas.addEventListener('touchstart', startAction, { passive: false });
    ui.maskCanvas.addEventListener('touchmove', moveAction, { passive: false });
    window.addEventListener('touchend', stopAction);
  }

  // Nút Hủy vùng chọn (Clear Mask)
  ui.btnClearMask.addEventListener('click', () => {
    processor.clearMask();
    ui.showToast('Đã hủy vùng chọn vật thể.', 'info');
  });

  // Nút Thực thi Xóa Vật Thể (Execute AI Inpaint)
  ui.btnExecuteErase.addEventListener('click', async () => {
    if (!processor.hasImage()) return;
    if (!processor.hasMask()) {
      ui.showToast('Vui lòng click hoặc quét cọ chọn vật thể trước khi xóa!', 'warning');
      return;
    }

    try {
      ui.setLoading(true);
      if (ui.loadingText) ui.loadingText.textContent = '✨ AI đang phân tích & khôi phục nền...';

      // Chờ một chút để UI render spinner
      await new Promise(r => setTimeout(r, 60));

      const success = await processor.inpaint();
      if (success) {
        // Tái tạo lại hiệu ứng độ sáng / độ nét lên ảnh mới đã inpaint
        processor.process(state.brightness, state.sharpness);
        ui.showToast('✨ Đã xóa vật thể và phục hồi nền sạch sẽ!', 'success');
      } else {
        ui.showToast('Không thể xử lý vùng chọn này.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi AI Inpainting:', err);
      ui.showToast('Đã xảy ra lỗi trong quá trình xóa vật thể.', 'error');
    } finally {
      ui.setLoading(false);
      if (ui.loadingText) ui.loadingText.textContent = 'Đang xử lý pixel...';
    }
  });

  /* ================= LẮNG NGHE SỰ KIỆN AI MAKEUP & BEAUTY STUDIO ================= */

  const makeupConfig = {
    lipstick: { color: '#e11d48', opacity: 50, gloss: 30 },
    eyes: { color: '#6366f1', opacity: 45, brightness: 40 },
    skin: { smooth: 60, tone: 40, blemish: 50 },
    hair: { color: '#78350f', opacity: 55 },
    nose: { highlight: 45, contour: 40 }
  };

  let makeupRafId = null;
  function scheduleMakeupRender() {
    if (!processor.hasImage()) return;
    if (makeupRafId) cancelAnimationFrame(makeupRafId);
    makeupRafId = requestAnimationFrame(() => {
      processor.applyMakeup(makeupConfig);
      processor.process(state.brightness, state.sharpness);
      makeupRafId = null;
    });
  }

  // Chuyển đổi tab Makeup (Lips / Eyes / Skin / Hair / Nose)
  if (ui.mTabBtns) {
    ui.mTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.mtab;
        ui.mTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        ui.mTabContents.forEach(c => c.classList.add('hidden'));
        const activeContent = document.getElementById(`mtabContent${target.charAt(0).toUpperCase() + target.slice(1)}`);
        if (activeContent) activeContent.classList.remove('hidden');
      });
    });
  }

  // Chọn màu son môi
  if (ui.lipColorPalette) {
    ui.lipColorPalette.addEventListener('click', (e) => {
      const swatch = e.target.closest('.color-swatch');
      if (swatch) {
        ui.lipColorPalette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        makeupConfig.lipstick.color = swatch.dataset.color;
        scheduleMakeupRender();
      }
    });
  }
  if (ui.customLipColor) {
    ui.customLipColor.addEventListener('input', (e) => {
      makeupConfig.lipstick.color = e.target.value;
      scheduleMakeupRender();
    });
  }
  if (ui.lipOpacitySlider) {
    ui.lipOpacitySlider.addEventListener('input', (e) => {
      makeupConfig.lipstick.opacity = parseInt(e.target.value, 10);
      if (ui.lipOpacityVal) ui.lipOpacityVal.textContent = `${makeupConfig.lipstick.opacity}%`;
      scheduleMakeupRender();
    });
  }
  if (ui.lipGlossSlider) {
    ui.lipGlossSlider.addEventListener('input', (e) => {
      makeupConfig.lipstick.gloss = parseInt(e.target.value, 10);
      if (ui.lipGlossVal) ui.lipGlossVal.textContent = `${makeupConfig.lipstick.gloss}%`;
      scheduleMakeupRender();
    });
  }

  // Chọn màu mắt & Lens
  if (ui.eyeColorPalette) {
    ui.eyeColorPalette.addEventListener('click', (e) => {
      const swatch = e.target.closest('.color-swatch');
      if (swatch) {
        ui.eyeColorPalette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        makeupConfig.eyes.color = swatch.dataset.color;
        scheduleMakeupRender();
      }
    });
  }
  if (ui.customEyeColor) {
    ui.customEyeColor.addEventListener('input', (e) => {
      makeupConfig.eyes.color = e.target.value;
      scheduleMakeupRender();
    });
  }
  if (ui.eyeOpacitySlider) {
    ui.eyeOpacitySlider.addEventListener('input', (e) => {
      makeupConfig.eyes.opacity = parseInt(e.target.value, 10);
      if (ui.eyeOpacityVal) ui.eyeOpacityVal.textContent = `${makeupConfig.eyes.opacity}%`;
      scheduleMakeupRender();
    });
  }
  if (ui.eyeBrightSlider) {
    ui.eyeBrightSlider.addEventListener('input', (e) => {
      makeupConfig.eyes.brightness = parseInt(e.target.value, 10);
      if (ui.eyeBrightVal) ui.eyeBrightVal.textContent = `${makeupConfig.eyes.brightness}%`;
      scheduleMakeupRender();
    });
  }

  // Làn da
  if (ui.skinSmoothSlider) {
    ui.skinSmoothSlider.addEventListener('input', (e) => {
      makeupConfig.skin.smooth = parseInt(e.target.value, 10);
      if (ui.skinSmoothVal) ui.skinSmoothVal.textContent = `${makeupConfig.skin.smooth}%`;
      scheduleMakeupRender();
    });
  }
  if (ui.skinToneSlider) {
    ui.skinToneSlider.addEventListener('input', (e) => {
      makeupConfig.skin.tone = parseInt(e.target.value, 10);
      if (ui.skinToneVal) ui.skinToneVal.textContent = `${makeupConfig.skin.tone}%`;
      scheduleMakeupRender();
    });
  }
  if (ui.skinBlemishSlider) {
    ui.skinBlemishSlider.addEventListener('input', (e) => {
      makeupConfig.skin.blemish = parseInt(e.target.value, 10);
      if (ui.skinBlemishVal) ui.skinBlemishVal.textContent = `${makeupConfig.skin.blemish}%`;
      scheduleMakeupRender();
    });
  }

  // Màu tóc
  if (ui.hairColorPalette) {
    ui.hairColorPalette.addEventListener('click', (e) => {
      const swatch = e.target.closest('.color-swatch');
      if (swatch) {
        ui.hairColorPalette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        makeupConfig.hair.color = swatch.dataset.color;
        scheduleMakeupRender();
      }
    });
  }
  if (ui.customHairColor) {
    ui.customHairColor.addEventListener('input', (e) => {
      makeupConfig.hair.color = e.target.value;
      scheduleMakeupRender();
    });
  }
  if (ui.hairOpacitySlider) {
    ui.hairOpacitySlider.addEventListener('input', (e) => {
      makeupConfig.hair.opacity = parseInt(e.target.value, 10);
      if (ui.hairOpacityVal) ui.hairOpacityVal.textContent = `${makeupConfig.hair.opacity}%`;
      scheduleMakeupRender();
    });
  }

  // Sống mũi
  if (ui.noseHighlightSlider) {
    ui.noseHighlightSlider.addEventListener('input', (e) => {
      makeupConfig.nose.highlight = parseInt(e.target.value, 10);
      if (ui.noseHighlightVal) ui.noseHighlightVal.textContent = `${makeupConfig.nose.highlight}%`;
      scheduleMakeupRender();
    });
  }
  if (ui.noseContourSlider) {
    ui.noseContourSlider.addEventListener('input', (e) => {
      makeupConfig.nose.contour = parseInt(e.target.value, 10);
      if (ui.noseContourVal) ui.noseContourVal.textContent = `${makeupConfig.nose.contour}%`;
      scheduleMakeupRender();
    });
  }

  // Nút Áp dụng Makeup
  if (ui.btnApplyMakeup) {
    ui.btnApplyMakeup.addEventListener('click', async () => {
      if (!processor.hasImage()) return;
      try {
        ui.setLoading(true);
        if (ui.loadingText) ui.loadingText.textContent = '💄 Đang hoàn thiện nét trang điểm...';
        await new Promise(r => setTimeout(r, 60));

        processor.applyMakeup(makeupConfig);
        processor.process(state.brightness, state.sharpness);
        ui.showToast('✨ Đã áp dụng trang điểm & làm đẹp thành công!', 'success');
      } catch (err) {
        console.error('Lỗi makeup:', err);
        ui.showToast('Không thể áp dụng makeup lên ảnh này.', 'error');
      } finally {
        ui.setLoading(false);
        if (ui.loadingText) ui.loadingText.textContent = 'Đang xử lý pixel...';
      }
    });
  }

  // Nút Đặt lại Makeup
  if (ui.btnResetMakeup) {
    ui.btnResetMakeup.addEventListener('click', () => {
      makeupConfig.lipstick.opacity = 0;
      makeupConfig.lipstick.gloss = 0;
      makeupConfig.eyes.opacity = 0;
      makeupConfig.eyes.brightness = 0;
      makeupConfig.skin.smooth = 0;
      makeupConfig.skin.tone = 0;
      makeupConfig.hair.opacity = 0;
      makeupConfig.nose.highlight = 0;
      makeupConfig.nose.contour = 0;

      if (ui.lipOpacitySlider) { ui.lipOpacitySlider.value = 0; ui.lipOpacityVal.textContent = '0%'; }
      if (ui.lipGlossSlider) { ui.lipGlossSlider.value = 0; ui.lipGlossVal.textContent = '0%'; }
      if (ui.eyeOpacitySlider) { ui.eyeOpacitySlider.value = 0; ui.eyeOpacityVal.textContent = '0%'; }
      if (ui.eyeBrightSlider) { ui.eyeBrightSlider.value = 0; ui.eyeBrightVal.textContent = '0%'; }
      if (ui.skinSmoothSlider) { ui.skinSmoothSlider.value = 0; ui.skinSmoothVal.textContent = '0%'; }
      if (ui.skinToneSlider) { ui.skinToneSlider.value = 0; ui.skinToneVal.textContent = '0%'; }
      if (ui.skinBlemishSlider) { ui.skinBlemishSlider.value = 0; ui.skinBlemishVal.textContent = '0%'; }
      if (ui.hairOpacitySlider) { ui.hairOpacitySlider.value = 0; ui.hairOpacityVal.textContent = '0%'; }
      if (ui.noseHighlightSlider) { ui.noseHighlightSlider.value = 0; ui.noseHighlightVal.textContent = '0%'; }
      if (ui.noseContourSlider) { ui.noseContourSlider.value = 0; ui.noseContourVal.textContent = '0%'; }

      processor.applyMakeup(makeupConfig);
      processor.process(state.brightness, state.sharpness);
      ui.showToast('Đã đặt lại các thông số trang điểm', 'info');
    });
  }

  /* ================= LẮNG NGHE SỰ KIỆN AUTHENTICATION ================= */

  // Mở & đóng modal Auth
  ui.btnOpenAuth.addEventListener('click', () => ui.toggleAuthModal(true));
  ui.btnCloseAuth.addEventListener('click', () => ui.toggleAuthModal(false));
  ui.authModal.addEventListener('click', (e) => {
    if (e.target === ui.authModal) ui.toggleAuthModal(false);
  });

  // Chuyển tab Đăng nhập / Đăng ký
  ui.tabLogin.addEventListener('click', () => ui.switchAuthTab('login'));
  ui.tabRegister.addEventListener('click', () => ui.switchAuthTab('register'));

  // Xử lý Form Đăng nhập
  ui.formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;

    try {
      const user = auth.login(email, pass);
      ui.updateAuthUI(user);
      ui.toggleAuthModal(false);
      ui.showToast(`Chào mừng ${user.fullname} đã đăng nhập!`, 'success');
      await refreshHistoryUI();
    } catch (err) {
      ui.loginError.textContent = err.message;
      ui.loginError.classList.remove('hidden');
    }
  });

  // Xử lý Form Đăng ký
  ui.formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regFullname').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;

    try {
      const user = auth.register(name, email, pass);
      ui.updateAuthUI(user);
      ui.toggleAuthModal(false);
      ui.showToast(`Đăng ký thành công! Chào mừng ${user.fullname}!`, 'success');
      await refreshHistoryUI();
    } catch (err) {
      ui.regError.textContent = err.message;
      ui.regError.classList.remove('hidden');
    }
  });

  // Nút đăng nhập nhanh tài khoản Demo
  ui.btnQuickDemoLogin.addEventListener('click', async () => {
    const demoUser = {
      id: 'usr_demo',
      fullname: 'Nguyễn Thành Nam (Demo)',
      email: 'nam.demo@lumina.io',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NamDemo'
    };
    auth.setSession(demoUser);
    ui.updateAuthUI(demoUser);
    ui.toggleAuthModal(false);
    ui.showToast('Đã đăng nhập bằng tài khoản trải nghiệm!', 'success');
    await refreshHistoryUI();
  });

  // Đăng xuất
  ui.btnLogout.addEventListener('click', async () => {
    auth.logout();
    ui.updateAuthUI(null);
    ui.showToast('Đã đăng xuất tài khoản.', 'info');
    await refreshHistoryUI();
  });

  /* ================= LẮNG NGHE SỰ KIỆN LỊCH SỬ (HISTORY) ================= */

  // Mở & đóng modal Lịch sử
  ui.btnOpenHistory.addEventListener('click', () => {
    refreshHistoryUI();
    ui.toggleHistoryModal(true);
  });
  ui.btnCloseHistory.addEventListener('click', () => ui.toggleHistoryModal(false));
  ui.historyModal.addEventListener('click', (e) => {
    if (e.target === ui.historyModal) ui.toggleHistoryModal(false);
  });

  // Xoá tất cả lịch sử của user
  ui.btnClearHistory.addEventListener('click', async () => {
    if (confirm('Bạn có chắc chắn muốn xoá toàn bộ lịch sử ảnh này không?')) {
      await historyMgr.clearUserHistory(getCurrentUserId());
      await refreshHistoryUI();
      ui.showToast('Đã dọn dẹp sạch lịch sử ảnh.', 'info');
    }
  });
});
