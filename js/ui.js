/**
 * Class UI
 * Quản lý các phần tử DOM, trạng thái tương tác, Modal Auth, Lịch sử và Toast thông báo.
 */
class UI {
  constructor() {
    // Buttons & Canvas Inputs
    this.fileInput = document.getElementById('fileInput');
    this.dropZone = document.getElementById('dropZone');
    this.canvasWrapper = document.getElementById('canvasWrapper');
    this.canvas = document.getElementById('imageCanvas');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    
    this.btnReset = document.getElementById('btnReset');
    this.btnDownload = document.getElementById('btnDownload');
    this.btnCompare = document.getElementById('btnCompare');
    this.btnSaveHistory = document.getElementById('btnSaveHistory');
    this.presetBtns = document.querySelectorAll('.preset-btn');
    
    // Sliders & Badges
    this.brightnessSlider = document.getElementById('brightnessSlider');
    this.sharpnessSlider = document.getElementById('sharpnessSlider');
    this.brightnessValue = document.getElementById('brightnessValue');
    this.sharpnessValue = document.getElementById('sharpnessValue');
    
    // Metadata Badges
    this.imgDimensions = document.getElementById('imgDimensions');
    this.imgSize = document.getElementById('imgSize');

    // Auth Elements
    this.btnOpenAuth = document.getElementById('btnOpenAuth');
    this.authModal = document.getElementById('authModal');
    this.btnCloseAuth = document.getElementById('btnCloseAuth');
    this.tabLogin = document.getElementById('tabLogin');
    this.tabRegister = document.getElementById('tabRegister');
    this.formLogin = document.getElementById('formLogin');
    this.formRegister = document.getElementById('formRegister');
    this.loginError = document.getElementById('loginError');
    this.regError = document.getElementById('regError');
    this.btnQuickDemoLogin = document.getElementById('btnQuickDemoLogin');
    
    // User Profile in Header
    this.userProfile = document.getElementById('userProfile');
    this.userAvatar = document.getElementById('userAvatar');
    this.userName = document.getElementById('userName');
    this.userEmail = document.getElementById('userEmail');
    this.btnLogout = document.getElementById('btnLogout');

    // History Elements
    this.btnOpenHistory = document.getElementById('btnOpenHistory');
    this.historyModal = document.getElementById('historyModal');
    this.btnCloseHistory = document.getElementById('btnCloseHistory');
    this.btnClearHistory = document.getElementById('btnClearHistory');
    this.historyGrid = document.getElementById('historyGrid');
    this.historyEmpty = document.getElementById('historyEmpty');
    this.historyCountBadge = document.getElementById('historyCountBadge');

    // Toast Container
    this.toastContainer = document.getElementById('toastContainer');

    // Mask Canvas & AI Eraser Elements
    this.maskCanvas = document.getElementById('maskCanvas');
    this.btnModeClick = document.getElementById('btnModeClick');
    this.btnModeBrush = document.getElementById('btnModeBrush');
    this.btnModeEraseMask = document.getElementById('btnModeEraseMask');
    this.clickSizeRow = document.getElementById('clickSizeRow');
    this.clickSizeSlider = document.getElementById('clickSizeSlider');
    this.clickSizeVal = document.getElementById('clickSizeVal');
    this.brushSizeRow = document.getElementById('brushSizeRow');
    this.brushSizeSlider = document.getElementById('brushSizeSlider');
    this.brushSizeVal = document.getElementById('brushSizeVal');
    this.btnClearMask = document.getElementById('btnClearMask');
    this.btnExecuteErase = document.getElementById('btnExecuteErase');
    this.loadingText = document.getElementById('loadingText');
  }

  /**
   * Kích hoạt toàn bộ các nút điều khiển khi đã có ảnh
   */
  enableControls() {
    this.brightnessSlider.disabled = false;
    this.sharpnessSlider.disabled = false;
    this.btnReset.disabled = false;
    this.btnDownload.disabled = false;
    this.btnCompare.disabled = false;
    this.btnSaveHistory.disabled = false;
    
    this.btnModeClick.disabled = false;
    this.btnModeBrush.disabled = false;
    this.btnModeEraseMask.disabled = false;
    this.btnClearMask.disabled = false;
    this.btnExecuteErase.disabled = false;

    this.presetBtns.forEach(btn => btn.disabled = false);

    // Chuyển chế độ xem từ Dropzone sang Canvas
    this.dropZone.classList.add('hidden');
    this.canvasWrapper.classList.remove('hidden');
  }

  /**
   * Cập nhật số liệu hiển thị trên thanh trượt
   * @param {number} brightness 
   * @param {number} sharpness 
   */
  updateSliderDisplay(brightness, sharpness) {
    this.brightnessSlider.value = brightness;
    this.sharpnessSlider.value = sharpness;

    this.brightnessValue.textContent = (brightness > 0 ? `+${brightness}` : `${brightness}`);
    this.sharpnessValue.textContent = `${sharpness}%`;
  }

  /**
   * Cập nhật thông tin chi tiết kích thước & dung lượng ảnh
   * @param {{width: number, height: number, size: number}} meta 
   */
  updateImageMetadata(meta) {
    if (this.imgDimensions) {
      this.imgDimensions.textContent = `${meta.width} × ${meta.height} px`;
    }
    if (this.imgSize) {
      const sizeInMB = (meta.size / (1024 * 1024)).toFixed(2);
      const sizeInKB = (meta.size / 1024).toFixed(1);
      this.imgSize.textContent = meta.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
    }
  }

  /**
   * Cập nhật giao diện Người dùng đăng nhập / Chưa đăng nhập
   * @param {Object|null} user 
   */
  updateAuthUI(user) {
    if (user) {
      this.btnOpenAuth.classList.add('hidden');
      this.userProfile.classList.remove('hidden');
      this.userName.textContent = user.fullname;
      this.userEmail.textContent = user.email;
      this.userAvatar.src = user.avatar;
    } else {
      this.btnOpenAuth.classList.remove('hidden');
      this.userProfile.classList.add('hidden');
    }
  }

  /**
   * Chuyển đổi tab Đăng nhập / Đăng ký
   * @param {'login'|'register'} mode 
   */
  switchAuthTab(mode) {
    this.loginError.classList.add('hidden');
    this.regError.classList.add('hidden');

    if (mode === 'login') {
      this.tabLogin.classList.add('active');
      this.tabRegister.classList.remove('active');
      this.formLogin.classList.remove('hidden');
      this.formRegister.classList.add('hidden');
    } else {
      this.tabRegister.classList.add('active');
      this.tabLogin.classList.remove('active');
      this.formRegister.classList.remove('hidden');
      this.formLogin.classList.add('hidden');
    }
  }

  /**
   * Mở/Đóng Modal Auth
   * @param {boolean} open 
   */
  toggleAuthModal(open) {
    if (open) {
      this.authModal.classList.remove('hidden');
      this.switchAuthTab('login');
    } else {
      this.authModal.classList.add('hidden');
    }
  }

  /**
   * Mở/Đóng Modal Lịch sử ảnh
   * @param {boolean} open 
   */
  toggleHistoryModal(open) {
    if (open) {
      this.historyModal.classList.remove('hidden');
    } else {
      this.historyModal.classList.add('hidden');
    }
  }

  /**
   * Cập nhật số lượng ảnh trong lịch sử lên badge
   * @param {number} count 
   */
  updateHistoryBadge(count) {
    if (count > 0) {
      this.historyCountBadge.textContent = count;
      this.historyCountBadge.classList.remove('hidden');
    } else {
      this.historyCountBadge.classList.add('hidden');
    }
  }

  /**
   * Render danh sách ảnh trong Lịch sử
   * @param {Array} items 
   * @param {Function} onLoadItem 
   * @param {Function} onDeleteItem 
   */
  renderHistory(items, onLoadItem, onDeleteItem) {
    this.historyGrid.innerHTML = '';
    this.updateHistoryBadge(items.length);

    if (items.length === 0) {
      this.historyEmpty.classList.remove('hidden');
      this.historyGrid.classList.add('hidden');
      return;
    }

    this.historyEmpty.classList.add('hidden');
    this.historyGrid.classList.remove('hidden');

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card';
      
      const dateStr = new Date(item.timestamp).toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
      });

      card.innerHTML = `
        <div class="history-thumb-wrapper">
          <img src="${item.imageDataUrl}" alt="${item.fileName}">
        </div>
        <div class="history-card-body">
          <span class="history-filename" title="${item.fileName}">${item.fileName}</span>
          <div class="history-badges">
            <span class="history-badge">Sáng: ${item.brightness > 0 ? '+' + item.brightness : item.brightness}</span>
            <span class="history-badge">Nét: ${item.sharpness}%</span>
          </div>
          <span class="history-date"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
          <div class="history-actions">
            <button class="history-btn btn-load-hist" title="Mở ảnh này để chỉnh tiếp">
              <i class="fa-solid fa-pen-to-square"></i> Mở
            </button>
            <a href="${item.imageDataUrl}" download="${item.fileName}" class="history-btn" title="Tải ảnh về máy">
              <i class="fa-solid fa-download"></i>
            </a>
            <button class="history-btn history-btn-del btn-del-hist" title="Xoá khỏi lịch sử">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;

      // Event click mở ảnh
      card.querySelector('.btn-load-hist').addEventListener('click', () => {
        onLoadItem(item);
      });

      // Event click xoá ảnh
      card.querySelector('.btn-del-hist').addEventListener('click', () => {
        onDeleteItem(item.id);
      });

      this.historyGrid.appendChild(card);
    });
  }

  /**
   * Hiển thị Toast thông báo ngắn
   * @param {string} message 
   * @param {'info'|'success'|'error'} type 
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Hiển thị hoặc ẩn spinner đang xử lý
   * @param {boolean} show 
   */
  setLoading(show) {
    if (show) {
      this.loadingOverlay.classList.remove('hidden');
    } else {
      this.loadingOverlay.classList.add('hidden');
    }
  }

  /**
   * Lấy canvas element
   */
  getCanvas() {
    return this.canvas;
  }
}
