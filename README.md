# English Learning Game - Frontend (V1)

Ứng dụng web học từ vựng tiếng Anh tương tác, nhận diện cử chỉ bàn tay qua webcam (MediaPipe Hands) và hỗ trợ chuột.

---

## 1. Yêu cầu hệ thống

- **Node.js**: Phiên bản LTS (`>= 20.x` hoặc `22.x`)
- **Trình quản lý gói**: `npm` (`>= 10.x`) hoặc `pnpm`
- Trình duyệt hiện đại hỗ trợ WebRTC & WebGL (Chrome, Edge, Firefox, Brave) và có Webcam để sử dụng chế độ cử chỉ tay.

---

## 2. Hướng dẫn cài đặt và khởi chạy

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

## 3. Các Scripts hữu ích

| Lệnh | Ý nghĩa |
|---|---|
| `npm run dev` | Khởi động Vite dev server với Hot Module Replacement (HMR) |
| `npm run lint` | Quét kiểm tra lỗi cú pháp và code quality |
| `npm run build` | Kiểm tra kiểu dữ liệu TypeScript (`tsc -b`) và đóng gói mã nguồn vào thư mục `dist/` |
| `npm run preview` | Khởi chạy server local để kiểm tra trước bản build sản phẩm (`dist/`) |

---

## 4. Cấu trúc thư mục (Feature-based Architecture)

```
src/
├── app/                  # Điểm khởi tạo ứng dụng, router, TanStack Query & Toast providers
├── lib/                  # Axios apiClient chuẩn hóa, tokenStorage quản lý JWT
├── types/                # Types dữ liệu chuẩn (ApiResponse, ApiError, PageResponse, User)
├── components/
│   ├── layout/           # AppLayout, Header điều hướng (Learner / Admin)
│   └── common/           # Loading spinner, EmptyState, ErrorState, Toast notification
├── pages/                # Các trang cấp cao (HomePage, NotFoundPage 404, ErrorPage)
└── features/             # Các module tính năng theo nghiệp vụ
    ├── auth/             # Đăng ký (AUTH-01), Đăng nhập (AUTH-02), Quên mật khẩu (AUTH-04)
    ├── topics/           # Danh sách chủ đề học (TOPIC-01)
    ├── vocabularies/     # Từ vựng & Phát âm Polly (VOCAB-01, AUDIO-01)
    ├── game/             # Màn hình chơi và lớp nhận diện cử chỉ MediaPipe (GAME-01..05)
    ├── progress/         # Tiến trình học và streak (PROGRESS-01)
    ├── leaderboard/      # Bảng xếp hạng tuần (LEADERBOARD-01)
    └── admin/            # Quản trị User, Topic, Vocabulary, Game Config (ADMIN-01..04)
```

---

## 5. Quy ước nhánh và Quy trình phát triển (Git Workflow)

- **`main`**: Nhánh chính, mã nguồn luôn ở trạng thái ổn định, sẵn sàng triển khai.
- **`develop`**: Nhánh tích hợp các tính năng chuẩn bị cho bản phát hành tiếp theo.
- **Nhánh tính năng**: Tạo từ nhánh `develop` theo quy ước:
  ```
  feature/<ID-Issue>-<mô-tả-ngắn>
  ```
  *Ví dụ:* `feature/AUTH-01-register-form`, `feature/TOPIC-01-topic-list`.
- **Pull Request (PR)**:
  - Khi tạo PR vào `main` hoặc `develop`, GitHub Actions CI sẽ tự động kích hoạt kiểm tra:
    1. Cài đặt dependencies (`npm ci`).
    2. Chạy kiểm tra code (`npm run lint`).
    3. Kiểm tra kiểu dữ liệu TypeScript và build (`npm run build`).
  - PR chỉ được merge sau khi CI đã pass hoàn toàn (màu xanh).
