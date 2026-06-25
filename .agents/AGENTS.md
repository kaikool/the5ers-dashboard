# Quy tắc vận hành The5ers Scraper

## 🚨 BẢO VỆ TOKEN ROTATION (DESCOPE DSR)
Descope sử dụng cơ chế bảo mật Token Rotation nghiêm ngặt. Việc gửi trùng lặp Token Refresh (`THE5ERS_REFRESH_TOKEN` hoặc cookie `DSR`) sẽ kích hoạt chế độ chống replay và **hủy toàn bộ chuỗi token family ngay lập tức**.

Để tránh làm hỏng token và bắt người dùng phải cấu hình lại cookie bằng tay:

1. **CHỈ SỬ DỤNG DUY NHẤT 1 FILE CHẠY CHÍNH**:
   - Mọi hoạt động kết nối API, lấy dữ liệu, xoay vòng token chỉ được nằm trong [fetch_data.mjs](file:///d:/Hermes/the5ers/the5ers-dashboard/scraper/fetch_data.mjs).
   - **CẤM TUYỆT ĐỐI** tạo hoặc chạy các file script phụ, script test, script debug độc lập để gọi tới API The5ers hay Descope sử dụng chung token trong `.env`.

2. **CƠ CHẾ LẤY TRẠNG THÁI TÀI KHOẢN (ACTIVE / INACTIVE)**:
   - Dữ liệu trạng thái tài khoản thực tế (`available` hay `disable` từ Hub) cần được đọc trực tiếp từ API `/user` hoặc API stats chi tiết trong script chính [fetch_data.mjs](file:///d:/Hermes/the5ers/the5ers-dashboard/scraper/fetch_data.mjs).
   - Tuyệt đối không được hardcode `'active'` cho tất cả tài khoản trong file đồng bộ dữ liệu.
