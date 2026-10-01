# English Learning Game - Frontend (V1)

Ứng dụng web học từ vựng tiếng Anh tương tác, nhận diện cử chỉ bàn tay qua webcam (MediaPipe Hands), tích hợp các dịch vụ đám mây **AWS (Cognito, Polly, S3)** thông qua Backend API.

---

## 1. Kiến trúc dịch vụ đám mây AWS trong dự án

Dự án áp dụng mô hình kiến trúc bảo mật chuẩn Enterprise cho ứng dụng Frontend tương tác với AWS:

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

## 2. Yêu cầu hệ thống

- **Node.js**: Phiên bản LTS (`>= 20.x` hoặc `22.x`)
- **Trình quản lý gói**: `npm` (`>= 10.x`) hoặc `pnpm`
- Trình duyệt hiện đại hỗ trợ WebRTC & WebGL (Chrome, Edge, Firefox, Brave) và có Webcam để sử dụng chế độ cử chỉ tay.

---

## 3. Hướng dẫn cài đặt và khởi chạy

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

> **Lưu ý bảo mật:** Mọi biến có tiền tố `VITE_*` đều sẽ được đóng gói vào client bundle và người dùng có thể đọc được. Tuyệt đối **không lưu trữ secret keys hoặc mật khẩu** trong repository này.

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

## 4. Các Scripts hữu ích

| Lệnh | Ý nghĩa |
|---|---|
| `npm run dev` | Khởi động Vite dev server với Hot Module Replacement (HMR) |
| `npm run lint` | Quét kiểm tra lỗi cú pháp và code quality |
| `npm run build` | Kiểm tra kiểu dữ liệu TypeScript (`tsc -b`) và đóng gói mã nguồn vào thư mục `dist/` |
| `npm run preview` | Khởi chạy server local để kiểm tra trước bản build sản phẩm (`dist/`) |

---

## 5. Cấu trúc thư mục (Feature-based Architecture)

```
src/
├── app/                  # Điểm khởi tạo ứng dụng, router, TanStack Query & Toast providers
├── lib/                  # Axios apiClient chuẩn hóa (tự động refresh token Cognito), tokenStorage
├── types/                # Types dữ liệu chuẩn (ApiResponse, ApiError, PageResponse, AuthTokens)
├── components/
│   ├── layout/           # AppLayout, Header điều hướng (Learner / Admin)
│   └── common/           # Loading spinner, EmptyState, ErrorState, Toast notification
├── pages/                # Các trang cấp cao (HomePage, NotFoundPage 404, ErrorPage)
└── features/             # Các module tính năng theo nghiệp vụ
    ├── auth/             # Đăng ký & OTP (AUTH-01), Đăng nhập & Refresh (AUTH-02), Quên mật khẩu (AUTH-04)
    ├── topics/           # Danh sách chủ đề học (TOPIC-01)
    ├── vocabularies/     # Từ vựng & Phát âm AWS Polly (VOCAB-01, AUDIO-01)
    ├── game/             # Màn hình chơi và lớp nhận diện cử chỉ MediaPipe (GAME-01..05)
    ├── progress/         # Tiến trình học và streak (PROGRESS-01)
    ├── leaderboard/      # Bảng xếp hạng tuần (LEADERBOARD-01)
    └── admin/            # Quản trị User, Topic, Vocabulary, Game Config (ADMIN-01..04)
```

---

## 6. Quy ước nhánh và Quy trình phát triển (Git Workflow)

- **`main`**: Nhánh chính, mã nguồn luôn ở trạng thái ổn định, sẵn sàng triển khai.
- **`develop`**: Nhánh tích hợp các tính năng chuẩn bị cho bản phát hành tiếp theo.
- **Nhánh tính năng**: Tạo từ nhánh `develop` theo quy ước:
  ```
  feature/<ID-Issue>-<mô-tả-ngắn>
  ```
  *Ví dụ:* `feature/AUTH-01-cognito-register-otp`, `feature/AUDIO-01-polly-speech`.
- **Pull Request (PR)**:
  - Khi tạo PR vào `main` hoặc `develop`, GitHub Actions CI sẽ tự động kích hoạt kiểm tra:
    1. Cài đặt dependencies (`npm ci`).
    2. Chạy kiểm tra code (`npm run lint`).
    3. Kiểm tra kiểu dữ liệu TypeScript và build (`npm run build`).
  - PR chỉ được merge sau khi CI đã pass hoàn toàn (màu xanh).
