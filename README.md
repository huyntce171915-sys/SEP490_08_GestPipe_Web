# GestPipe Web Application

Dự án nhận diện cử chỉ tay (Hand Gesture Recognition) tích hợp Web Dashboard.

## 📂 Cấu trúc dự án
- `hybrid_realtime_pipeline/`: Mã nguồn Python xử lý AI/MediaPipe.
- `SEP490_08_GestPipe_WebApplication/backend`: Server Node.js.
- `SEP490_08_GestPipe_WebApplication/frontend`: Giao diện Web React/Next.js.

## 🚀 Hướng dẫn Cài đặt & Chạy (Dành cho Windows)

### 1. Yêu cầu hệ thống
- **Node.js**: [Tải tại đây](https://nodejs.org/) (LTS).
- **Python**: [Tải tại đây](https://www.python.org/) (Phiên bản 3.10 hoặc 3.11).

### 2. Cấu hình Bảo mật (Quan trọng)
Dự án này sử dụng file nén bảo mật để chứa các thông tin nhạy cảm.
1. Tìm file **`secrets.zip`** trong thư mục gốc.
2. Giải nén file này (Chuột phải -> Extract Here).
3. Nhập mật khẩu được cung cấp bởi tác giả (ví dụ: `GestPipe2025`).
4. Sau khi giải nén, các file `credentials.json`, `token.json` và `.env` sẽ tự động nằm đúng vị trí.

### 3. Cài đặt (Chạy 1 lần đầu tiên)
- Click đúp vào file **`install_all.bat`** ở thư mục gốc.
- Script sẽ tự động cài đặt PM2 và các thư viện cần thiết.

### 4. Khởi động dự án
- Click đúp vào file **`run_project.bat`**.
- Hệ thống sẽ chạy ngầm (background).
- Truy cập Web tại: `http://localhost:3000`.

### 5. Dừng dự án
- Click đúp vào file **`stop_project.bat`** để tắt hoàn toàn hệ thống.

---
**Quản lý nâng cao:**
- Xem log lỗi: Mở CMD và gõ `pm2 logs`
- Xem trạng thái: Mở CMD và gõ `pm2 monit`
