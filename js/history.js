/**
 * Class HistoryManager
 * Quản lý lịch sử ảnh đã chỉnh sửa bằng IndexedDB (lưu trữ dung lượng lớn an toàn, nhanh chóng).
 */
class HistoryManager {
  constructor() {
    this.dbName = 'LuminaEditDB';
    this.storeName = 'edit_history';
    this.db = null;
  }

  /**
   * Khởi tạo kết nối IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('Lỗi khi mở IndexedDB:', e);
        reject(e);
      };
    });
  }

  /**
   * Lưu một bản ghi lịch sử ảnh
   * @param {Object} item 
   */
  async saveHistoryItem(item) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const record = {
        id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        userId: item.userId || 'guest',
        fileName: item.fileName || 'lumina_image.png',
        imageDataUrl: item.imageDataUrl, // Ảnh kết quả
        brightness: item.brightness || 0,
        sharpness: item.sharpness || 0,
        width: item.width || 0,
        height: item.height || 0,
        timestamp: Date.now()
      };

      const request = store.add(record);
      request.onsuccess = () => resolve(record);
      request.onerror = (e) => reject(e);
    });
  }

  /**
   * Lấy toàn bộ lịch sử ảnh của một User (sắp xếp mới nhất lên đầu)
   * @param {string} userId 
   */
  async getHistoryByUser(userId = 'guest') {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('userId');
      const request = index.getAll(IDBKeyRange.only(userId));

      request.onsuccess = (e) => {
        const results = e.target.result || [];
        // Sắp xếp giảm dần theo thời gian
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };

      request.onerror = (e) => reject(e);
    });
  }

  /**
   * Xóa một bản ghi lịch sử
   * @param {string} id 
   */
  async deleteHistoryItem(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e);
    });
  }

  /**
   * Xóa toàn bộ lịch sử của User
   * @param {string} userId 
   */
  async clearUserHistory(userId = 'guest') {
    const items = await this.getHistoryByUser(userId);
    if (!this.db) await this.init();

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    for (const item of items) {
      store.delete(item.id);
    }

    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve(true);
    });
  }
}
