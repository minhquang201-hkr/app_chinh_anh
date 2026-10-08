/**
 * Class AuthManager
 * Quản lý xác thực người dùng (Đăng ký, Đăng nhập, Đăng xuất, Lưu phiên làm việc) qua LocalStorage.
 */
class AuthManager {
  constructor() {
    this.USERS_KEY = 'lumina_users_db';
    this.CURRENT_USER_KEY = 'lumina_current_session';
    this.currentUser = this.getCurrentUser();
  }

  /**
   * Lấy danh sách tài khoản đã đăng ký trong hệ thống
   */
  getUsers() {
    try {
      const users = localStorage.getItem(this.USERS_KEY);
      return users ? JSON.parse(users) : [];
    } catch (e) {
      console.error('Lỗi khi đọc danh sách tài khoản:', e);
      return [];
    }
  }

  /**
   * Lưu danh sách tài khoản
   */
  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  /**
   * Lấy thông tin người dùng đang đăng nhập
   */
  getCurrentUser() {
    try {
      const user = localStorage.getItem(this.CURRENT_USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Đăng ký tài khoản mới
   * @param {string} fullname 
   * @param {string} email 
   * @param {string} password 
   */
  register(fullname, email, password) {
    const users = this.getUsers();
    
    // Kiểm tra email đã tồn tại chưa
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('Email này đã được đăng ký!');
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      fullname: fullname.trim(),
      email: email.trim().toLowerCase(),
      password: password, // Trong thực tế backend sẽ hash bằng bcrypt
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fullname)}`,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    // Tự động đăng nhập sau khi đăng ký
    this.setSession(newUser);
    return newUser;
  }

  /**
   * Đăng nhập
   * @param {string} email 
   * @param {string} password 
   */
  login(email, password) {
    const users = this.getUsers();
    const user = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác!');
    }

    this.setSession(user);
    return user;
  }

  /**
   * Lưu phiên đăng nhập
   */
  setSession(user) {
    this.currentUser = {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      avatar: user.avatar
    };
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(this.currentUser));
  }

  /**
   * Đăng xuất
   */
  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }

  /**
   * Kiểm tra xem người dùng đã đăng nhập chưa
   */
  isLoggedIn() {
    return !!this.currentUser;
  }
}
