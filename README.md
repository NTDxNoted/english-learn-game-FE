# English Learning Game (Signly) - Frontend (V1)

Ứng dụng web học từ vựng tiếng Anh tương tác, nhận diện cử chỉ bàn tay qua webcam (MediaPipe Hands), tích hợp các dịch vụ đám mây **AWS (Cognito, Polly, S3)** thông qua Backend API.

---

## 1. Thiết Kế & Quy Chuẩn Bảng Màu (Design System & Color Tokens)

Dự án sử dụng **Signly Design System** đồng nhất với các tông màu chuẩn mực:
- **Tài liệu quy chuẩn chi tiết**: Xem [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- **Hằng số màu TypeScript**: [src/theme/colors.ts](./src/theme/colors.ts)
- **Màu thương hiệu**:
  - Tím than chủ đạo (Primary): `#322c82`
  - Đổ bóng 3D của nút (Button Shadow): `#211c61`
  - Cam san hô điểm nhấn (Accent): `#ff7b62`
  - Nền toàn bộ ứng dụng (Canvas): `#fbfaf7` (Warm Cream)
- **Bộ màu pastel bài học**:
  - Yellow: `#fff0c2` (Dễ)
  - Lavender: `#ebe9ff` (Gia đình)
  - Mint: `#d8f1e7` (Trung bình)
  - Peach: `#ffdcd4` / `#ffe4d8` (Đồ ăn, Khó)
  - Blue: `#dce9ff` (Thể thao)
  - Pink: `#ffdce8` (Cảm xúc)

> **LƯU Ý QUAN TRỌNG:** Mọi tính năng phát triển tiếp theo phải sử dụng các màu chuẩn này, không tự ý đưa thêm màu sắc mới lệch tông thiết kế.

---

## 2. Kiến trúc dịch vụ đám mây AWS trong dự án

Dự án áp dụng mô hình kiến trúc bảo mật chuẩn Enterprise:

1. **AWS Cognito User Pool (Xác thực & Quản lý danh tính)**:
   - **Frontend KHÔNG gọi trực tiếp AWS Cognito SDK** và **tuyệt đối KHÔNG chứa AWS Access Key / Secret Key**.
   - Backend đóng vai trò cầu nối (Bridge/Proxy) gọi Cognito SDK (`SignUp`, `ConfirmSignUp`, `InitiateAuth`, `ForgotPassword`, `GlobalSignOut`).
   - Token trả về gồm:
     - `accessToken`: Dùng làm Bearer token duy nhất (`Authorization: Bearer <accessToken>`) cho mọi API được bảo vệ.
     - `refreshToken`: Được frontend lưu an toàn trong `localStorage` và tự động làm mới khi `accessToken` hết hạn sau 60 phút qua hàng đợi interceptor `apiClient`.
     - `idToken`: Không lưu và không dùng làm Bearer token (Backend sẽ từ chối).
   - Luồng xác thực hỗ trợ mã OTP gửi qua email: Đăng ký (`/register`) -> Nhập OTP (`/verify-register`) -> Đăng nhập (`/login`).
   - Quên mật khẩu: Nhập email (`/forgot-password`) -> Nhận OTP và đổi mật khẩu mới (`/reset-password`).

2. **AWS Polly & AWS S3 / CloudFront (Âm thanh phát âm từ vựng)**:
   - File âm thanh giọng đọc bản xứ được Backend tự động tạo qua AWS Polly khi thêm từ vựng mới và lưu trên AWS S3.
   - Frontend nhận `audioUrl` (presigned URL hoặc CloudFront CDN) và phát qua HTML5 Audio mà không cần quyền truy cập AWS trực tiếp.

---

## 3. Yêu cầu hệ thống

- **Node.js**: Phiên bản LTS (`>= 20.x` hoặc `22.x`)
- **Trình quản lý gói**: `npm` (`>= 10.x`) hoặc `pnpm`
- Trình duyệt hiện đại hỗ trợ WebRTC & WebGL (Chrome, Edge, Firefox, Brave) và có Webcam để sử dụng chế độ cử chỉ tay.

---

## 4. Hướng dẫn cài đặt và khởi chạy

### Bước 1: Clone kho mã nguồn

```bash
git clone https://github.com/NTDxNoted/english-learn-game.git
cd english-learn-game
```

### Bước 2: Thiết lập biến môi trường

Sao chép file mẫu `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Chỉnh sửa giá trị `VITE_API_BASE_URL` trỏ tới địa chỉ Backend API (mặc định: `http://localhost:8080/api/v1`):

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

### Bước 3: Cài đặt dependencies

```bash
npm install
```

### Bước 4: Chạy môi trường phát triển (Dev Server)

```bash
npm run dev
```

Ứng dụng sẽ khả dụng tại: `http://localhost:3000` (hoặc cổng được Vite cung cấp).

---

## 5. Các Scripts hữu ích

| Lệnh | Ý nghĩa |
|---|---|
| `npm run dev` | Khởi động Vite dev server với Hot Module Replacement (HMR) |
| `npm run lint` | Quét kiểm tra lỗi cú pháp và code quality |
| `npm run build` | Kiểm tra kiểu dữ liệu TypeScript (`tsc -b`) và đóng gói mã nguồn vào thư mục `dist/` |
| `npm run preview` | Khởi chạy server local để kiểm tra trước bản build sản phẩm (`dist/`) |
