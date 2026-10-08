# Auto Git Push Rule

Khi hoàn thành bất kỳ yêu cầu thêm tính năng, sửa lỗi hoặc cải tiến code từ người dùng:
1. Tự động kiểm tra thay đổi bằng `git status`.
2. Tự động chạy lệnh thêm và commit mã nguồn với thông điệp Conventional Commit rõ ràng:
   `git add . ; git commit -m "<type>: <description>"`
3. Tự động đẩy code lên repository GitHub (`git push`).
4. Báo cáo ngắn gọn cho người dùng commit hash và trạng thái đẩy code.
