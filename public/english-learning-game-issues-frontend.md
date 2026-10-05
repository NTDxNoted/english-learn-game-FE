# English Learning Game V1: Bộ issue Frontend

Tài liệu này gồm **các issue phần Frontend** (React + Vite + TypeScript) của dự án, tách ra từ bộ issue gốc. Mỗi issue gồm **Mô tả, Tasklist, Endpoints (API contract do backend cung cấp), Response mẫu, Business rule và lưu ý, File structure**. ID issue giữ nguyên so với bộ gốc; cột "Phụ thuộc" có thể trỏ tới issue backend nằm trong file `english-learning-game-issues-backend.md`. Xác thực dùng **AWS Cognito** nhưng frontend **không** gọi trực tiếp Cognito, chỉ gọi API backend (theo `WordMotion_FE_AWS_Cognito_Flow_Guide.md`). Frontend là **một repository riêng** (`english-learning-game-frontend`), không chung repo với backend; đường dẫn trong File structure tính từ thư mục gốc của repo frontend. File này chỉ mô tả, chưa có code.

---

## 0. Thông tin chung

### Stack

| Phần | Công nghệ |
|---|---|
| Frontend | React + Vite + TypeScript (strict), React Router, Axios, TanStack Query, React Hook Form + Zod, MediaPipe (hand tracking) |

### Quy ước API

- Base path: `/api/v1`. JSON dùng `camelCase`, database dùng `snake_case`.
- Xác thực: đăng ký, xác minh OTP, đăng nhập, quên mật khẩu do **AWS Cognito** xử lý, backend là cầu nối (frontend **không** gọi trực tiếp Cognito). Mọi API khác dùng header `Authorization: Bearer <accessToken>` (accessToken do Cognito cấp), trừ nhóm public (ghi rõ ở từng issue). `idToken` không dùng làm Bearer.
- Thời gian trả về theo ISO-8601 kèm múi giờ (`2026-10-14T09:30:00+07:00`). Múi giờ nghiệp vụ là `Asia/Ho_Chi_Minh`.
- Vai trò: `learner` và `admin` (giữ chữ thường giống cột `users.role`).

### Format response chuẩn (dùng cho mọi endpoint)

Thành công:

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": { },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

Thất bại:

```json
{
  "success": false,
  "message": "Email đã được sử dụng",
  "errorCode": "EMAIL_ALREADY_EXISTS",
  "errors": [
    { "field": "email", "message": "Email đã được sử dụng" }
  ],
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

Danh sách có phân trang (nằm trong `data`):

```json
{
  "items": [ ],
  "page": 1,
  "size": 20,
  "totalItems": 135,
  "totalPages": 7
}
```

### Mã lỗi chung

| HTTP | errorCode | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Dữ liệu gửi lên sai định dạng hoặc thiếu |
| 401 | `UNAUTHORIZED` | Thiếu hoặc sai JWT |
| 401 | `TOKEN_EXPIRED` | JWT hết hạn |
| 403 | `FORBIDDEN` | Không đủ quyền (ví dụ learner gọi API admin) |
| 403 | `ACCOUNT_LOCKED` | Tài khoản bị khóa |
| 404 | `NOT_FOUND` | Không tìm thấy dữ liệu |
| 409 | `CONFLICT` | Xung đột trạng thái hoặc dữ liệu trùng |
| 429 | `TOO_MANY_REQUESTS` | Gửi yêu cầu quá nhiều (Cognito giới hạn tần suất) |
| 502 | `COGNITO_ERROR` | Cognito lỗi hoặc cấu hình sai, không ánh xạ được sang mã lỗi nghiệp vụ |
| 500 | `INTERNAL_ERROR` | Lỗi hệ thống (không lộ chi tiết ra client) |

---

## 1. Điểm cần team thống nhất

Tài liệu BR và file SQL còn vài chỗ chưa khớp hoặc chưa nói rõ. Các issue bên dưới đã chọn một hướng (cột "Đang áp dụng"), cần team xác nhận trước khi làm.

| # | Vấn đề | Đang áp dụng trong issue |
|---|---|---|
| 1 | File SQL dùng `cognito_sub`, không có `password_hash`; BR cũ ghi backend tự kiểm tra mật khẩu và cấp JWT | **Đã chốt: dùng AWS Cognito User Pool** làm dịch vụ chính cho đăng ký, OTP, đăng nhập, quên/đặt lại mật khẩu (theo `WordMotion_FE_AWS_Cognito_Flow_Guide.md`). Backend chỉ gọi Cognito, xác thực JWT của Cognito và đồng bộ user vào DB. Backend không lưu mật khẩu, không tự cấp JWT (SETUP-05, AUTH-01 đến AUTH-04) |
| 5 | BR mục 7: frontend xáo trộn chữ, nghĩa là frontend nhận chữ theo đúng thứ tự (lộ đáp án) | Đề xuất: **backend xáo trộn** rồi mới trả về |
| 6 | BR chưa định nghĩa: số từ mỗi phiên, cách tính điểm, thế nào là thắng | Đề xuất: 5 từ/phiên; điểm theo lần thử 10/6/3; **thắng khi mọi từ đúng ngay lần thử đầu**. Lưu trong `game_configs` |
| 8 | `audio_url` đang là dạng `s3://audio/apple.mp3`, trình duyệt không phát được | Backend trả URL có thể phát (presigned URL hoặc CloudFront) qua AUDIO-01 |
| 9 | `enable_mouse_mode` có trong BR mục 12 nhưng không có trong seed `game_configs` | Thêm vào seed (SETUP-02) |
| 10 | `email_verified` có trong bảng; BR V1 chưa có luồng xác thực email | Cognito xác minh email bằng OTP lúc đăng ký. Chưa xác minh thì không đăng nhập được (`ACCOUNT_NOT_VERIFIED`). Backend đồng bộ `email_verified=true` khi đăng nhập |
| 12 | Guide ghi API không có tiền tố `/api/v1` và dùng `/api/users/me` | Giữ tiền tố `/api/v1` cho thống nhất: `/api/v1/auth/...` và `/api/v1/users/me` |
| 13 | Guide ghi `POST /auth/logout` không cần token, nhưng `GlobalSignOut` của Cognito cần accessToken | Logout **yêu cầu** token. Frontend vẫn xóa token cục bộ dù API lỗi |
| 14 | Guide lưu `refreshToken` nhưng chưa có API dùng nó; accessToken Cognito mặc định hết hạn sau 1 giờ | Bổ sung `POST /api/v1/auth/refresh` (AUTH-02) và `POST /api/v1/auth/resend-code` gửi lại OTP (AUTH-01) |
| 15 | Login trả cả `idToken` | Frontend chỉ lưu `accessToken` và `refreshToken`. Chỉ `accessToken` dùng làm Bearer, backend từ chối `idToken` |

---

## 2. Danh sách issue

| ID | Tên | Phạm vi | Ưu tiên | Kích thước | Phụ thuộc | Trạng thái |
|---|---|---|---|---|---|---|
| SETUP-01 | Khởi tạo repository frontend, môi trường, CI | FE | P0 | M | | ✅ Đã hoàn thành |
| SETUP-04 | Frontend nền tảng: router, API client, layout | FE | P0 | M | SETUP-01 | ✅ Đã hoàn thành |
| AUTH-01 | Đăng ký và xác minh OTP (AWS Cognito) | BE + FE | P0 | L | SETUP-03, 04, 05 | ✅ Đã hoàn thành |
| AUTH-02 | Đăng nhập và làm mới token (AWS Cognito) | BE + FE | P0 | L | AUTH-01, SETUP-02 | ✅ Đã hoàn thành |
| AUTH-03 | Đăng xuất, thông tin tài khoản, đồng bộ user, bảo vệ route | BE + FE | P0 | M | AUTH-02 | ✅ Đã hoàn thành |
| AUTH-04 | Quên mật khẩu và đặt lại mật khẩu (AWS Cognito) | BE + FE | P1 | M | AUTH-01 | ✅ Đã hoàn thành |
| CONFIG-01 | Đọc cấu hình game (`game_configs`) | BE + FE | P0 | S | SETUP-02, 03 | ✅ Đã hoàn thành |
| TOPIC-01 | Danh sách topic | BE + FE | P0 | S | AUTH-03 | ✅ Đã hoàn thành |
| VOCAB-01 | Danh sách từ vựng theo topic (màn học) | BE + FE | P0 | M | TOPIC-01 | ⏳ Chưa làm |
| AUDIO-01 | Phát âm từ vựng (Polly + S3) | BE + FE | P1 | L | VOCAB-01, CONFIG-01 | ⏳ Chưa làm |
| GAME-01 | Lớp nhập liệu: cử chỉ tay và chuột (FE) | FE | P0 | L | SETUP-04, CONFIG-01 | ✅ Đã hoàn thành |
| GAME-05 | Màn hình chơi và màn hình kết quả (FE) | FE | P0 | L | GAME-01, 02, 03, 04 | ✅ Đã hoàn thành |
| PROGRESS-01 | Tiến trình học và streak | BE + FE | P0 | M | GAME-04 | ⏳ Chưa làm |
| LEADERBOARD-01 | Bảng xếp hạng tuần | BE + FE | P1 | M | GAME-04 | ⏳ Chưa làm |
| ADMIN-01 | Admin: quản lý người dùng | BE + FE | P1 | M | AUTH-03 | ⏳ Chưa làm |
| ADMIN-02 | Admin: quản lý topic | BE + FE | P1 | M | AUTH-03 | ⏳ Chưa làm |
| ADMIN-03 | Admin: quản lý từ vựng và audio | BE + FE | P1 | L | ADMIN-02, AUDIO-01 | ⏳ Chưa làm |
| ADMIN-04 | Admin: quản lý cấu hình game | BE + FE | P1 | S | CONFIG-01 | ⏳ Chưa làm |

> 📌 **Ghi chú tiến trình:** Xem báo cáo kỹ thuật chi tiết và sơ đồ tích hợp dịch vụ AWS tại [PULL_REQUEST_NOTES.md](./PULL_REQUEST_NOTES.md).

Thứ tự gợi ý: nhóm SETUP, rồi AUTH-01 đến AUTH-03, TOPIC/VOCAB/CONFIG, GAME-01 đến GAME-05, PROGRESS, sau đó các issue P1.

---

## 3. Chi tiết issue

---

## [SETUP-01] Khởi tạo repository frontend, môi trường, CI

**Nhãn:** `setup` `frontend` · **Ưu tiên:** P0 · **Kích thước:** M

### Mô tả

Tạo repository **frontend riêng** (`english-learning-game-frontend`) để nhóm frontend làm việc cùng một cấu trúc. Có hướng dẫn chạy local, file mẫu biến môi trường và CI chạy tự động khi tạo Pull Request. Mục tiêu: thành viên mới clone repo về là chạy được frontend trong vài phút (kết nối tới backend đang chạy ở repo khác).

### Tasklist

- [x] Tạo repo `english-learning-game-frontend`.
- [x] Viết `README.md`: yêu cầu cài đặt (Node LTS), cách chạy, cách build, cách chạy lint, cách trỏ tới backend qua `VITE_API_BASE_URL`.
- [x] Thêm `.gitignore`, `.editorconfig`, mẫu Pull Request, bộ label issue (`bug`, `P0`, `P1`).
- [x] Quy ước nhánh: `main` (ổn định), `develop`, nhánh tính năng `feature/<ID>-<mô-tả-ngắn>`.
- [x] GitHub Actions: lint + build khi có Pull Request.
- [x] Khởi tạo Vite + React + TypeScript, bật `strict`.
- [x] Cấu hình ESLint/Oxlint, Vitest, script `lint`, `build`, `test`, `dev`.
- [x] `.env.example` với `VITE_API_BASE_URL`.

### Endpoints

Không có.

### Business rule và lưu ý

- Không commit file `.env` thật, chỉ commit `.env.example`.
- Mọi biến `VITE_*` bị đóng gói vào bundle và ai cũng đọc được, nên **không đặt bí mật** (khóa, mật khẩu) trong frontend.
- Backend ở repo khác, cần backend cho phép CORS đúng origin của frontend. Khi dev local có thể dùng proxy của Vite để tránh lỗi CORS.

### File structure

```
english-learning-game-frontend/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── .editorconfig
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   └── pull_request_template.md
├── docs/
└── src/
```

---

## [SETUP-04] Frontend nền tảng: router, API client, layout

**Nhãn:** `setup` `frontend` · **Ưu tiên:** P0 · **Kích thước:** M · **Phụ thuộc:** SETUP-01

### Mô tả

Dựng bộ khung frontend TypeScript: cấu trúc thư mục theo tính năng, router có phân loại trang công khai/riêng tư/admin, API client dùng chung và kiểu dữ liệu response chuẩn. Các issue frontend sau chỉ việc thêm trang và gọi API.

### Tasklist

- [ ] Cấu trúc thư mục theo tính năng (xem File structure).
- [ ] Kiểu dùng chung: `ApiResponse<T>`, `ApiError`, `PageResponse<T>` khớp format response chuẩn.
- [x] Axios instance: `baseURL` từ `VITE_API_BASE_URL`; interceptor request gắn `Authorization: Bearer`; interceptor response bóc `data` và chuyển lỗi thành `ApiError` có `errorCode`.
- [x] Khi nhận 401 (`TOKEN_EXPIRED` hoặc `UNAUTHORIZED`): xóa token, về trang đăng nhập (chi tiết hoàn thiện ở AUTH-03 kèm Mutex refresh).
- [x] TanStack Query provider, cấu hình retry hợp lý (không retry lỗi 4xx).
- [x] React Router: nhóm route công khai (`/login`, `/register`, `/verify-register`, `/forgot-password`, `/reset-password`), riêng tư (`/topics`, `/game/...`, `/progress`, `/leaderboard`), admin (`/admin/...`). Guard hoàn thiện qua `<ProtectedRoute>`.
- [x] Layout cơ bản: header, vùng nội dung, trang 404, trang lỗi.
- [x] Hệ thống thông báo (toast) và component loading/empty/error dùng chung.
- [x] Quản lý biến môi trường (`.env.example`).

### Endpoints

Không có.

### Business rule và lưu ý

- Mã lỗi nghiệp vụ lấy từ `errorCode` của response, không so sánh với chuỗi message.
- Bật `strict` trong `tsconfig`, không dùng `any` cho dữ liệu API.
- Frontend **không** dùng AWS Access Key/Secret Key, không kết nối trực tiếp Cognito, không tự tạo JWT, không lưu mật khẩu, không truy cập database. Frontend chỉ gọi API backend, lưu token nhận được, gắn Bearer token và quản lý luồng giao diện.

### File structure

```
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers/
│       └── QueryProvider.tsx
├── lib/
│   ├── apiClient.ts
│   └── tokenStorage.ts
├── types/
│   └── api.types.ts
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   └── Header.tsx
│   └── common/
│       ├── Loading.tsx
│       ├── EmptyState.tsx
│       └── ErrorState.tsx
├── pages/
│   ├── NotFoundPage.tsx
│   └── ErrorPage.tsx
└── features/
    ├── auth/
    ├── topics/
    ├── game/
    ├── progress/
    ├── leaderboard/
    └── admin/
```

---

## [AUTH-01] Đăng ký và xác minh OTP (AWS Cognito)

**Nhãn:** `auth` `frontend` · **Ưu tiên:** P0 · **Kích thước:** L · **Phụ thuộc:** SETUP-03, SETUP-04, SETUP-05

### Mô tả

Người dùng tạo tài khoản bằng email, mật khẩu và tên hiển thị. Backend gọi Cognito `SignUp`, Cognito lưu mật khẩu và gửi email chứa mã OTP. Người dùng nhập OTP, backend gọi `ConfirmSignUp`. Bước này **chưa** tạo bản ghi trong database, user được đồng bộ vào DB khi đăng nhập lần đầu (AUTH-02). Xác minh xong, frontend chuyển sang trang đăng nhập.

### Tasklist

- [x] Trang `RegisterPage` (`/register`): email, mật khẩu, nhập lại mật khẩu, tên hiển thị.
- [x] Validate bằng Zod giống policy mật khẩu của User Pool, hiển thị lỗi theo từng trường.
- [x] Lỗi `EMAIL_ALREADY_EXISTS` hiển thị tại ô email, kèm link "Đã đăng ký nhưng chưa xác minh?" dẫn tới `/verify-register`.
- [x] Đăng ký thành công: chuyển sang `/verify-register` kèm email (qua route state hoặc query, **không** kèm mật khẩu).
- [x] Trang `VerifyRegisterPage` (`/verify-register`): ô nhập mã OTP, nút xác nhận, nút "Gửi lại mã" có đếm ngược 60 giây. Nếu không có email từ trang trước thì cho nhập email.
- [x] Hiển thị các lỗi `OTP_INVALID`, `OTP_EXPIRED`, `TOO_MANY_REQUESTS` bằng thông báo thân thiện.
- [x] Xác minh thành công: toast và chuyển sang `/login`.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| POST | `/api/v1/auth/register` | Công khai |
| POST | `/api/v1/auth/confirm-register` | Công khai |
| POST | `/api/v1/auth/resend-code` | Công khai |

Request `register`:

```json
{
  "email": "user1@gmail.com",
  "password": "Password@123",
  "displayName": "John"
}
```

Request `confirm-register`:

```json
{
  "email": "user1@gmail.com",
  "code": "123456"
}
```

Request `resend-code`:

```json
{ "email": "user1@gmail.com" }
```

### Response mẫu

`register` thành công (200):

```json
{
  "success": true,
  "message": "Đăng ký thành công. Vui lòng kiểm tra email để lấy mã xác minh",
  "data": {
    "email": "user1@gmail.com",
    "codeDeliveryDestination": "u***@g***.com",
    "userConfirmed": false
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

`confirm-register` thành công (200):

```json
{
  "success": true,
  "message": "Xác minh tài khoản thành công",
  "data": null,
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

`register` lỗi (409):

```json
{
  "success": false,
  "message": "Email đã được sử dụng",
  "errorCode": "EMAIL_ALREADY_EXISTS",
  "errors": [{ "field": "email", "message": "Email đã được sử dụng" }],
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

`confirm-register` lỗi (400):

```json
{
  "success": false,
  "message": "Mã xác minh không đúng",
  "errorCode": "OTP_INVALID",
  "errors": [],
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- Mật khẩu do Cognito lưu và kiểm tra, backend không lưu mật khẩu (xem mục 1, điểm 1).
- Mật khẩu (theo policy User Pool, SETUP-05): 8 đến 64 ký tự trên giao diện, có chữ hoa, chữ thường, số và ký tự đặc biệt.
- Tên hiển thị (đề xuất): 3 đến 20 ký tự, dùng cho bảng xếp hạng, lưu vào thuộc tính `name` của Cognito.
- Mã OTP do Cognito tạo và gửi qua email. Thời hạn do Cognito quy định, frontend không hard-code mà xử lý theo mã lỗi `OTP_EXPIRED`.
- Chưa xác minh OTP thì chưa đăng nhập được (AUTH-02).
- Chỉ tạo tài khoản `learner`. Tài khoản `admin` tạo trong Cognito và đặt `users.role` trong DB (SETUP-05).
- Email OTP dùng email mặc định của Cognito ở dev (giới hạn số email mỗi ngày), môi trường thật cấu hình qua SES.
- Người đã đăng ký nhưng chưa xác minh mà đăng ký lại sẽ nhận `EMAIL_ALREADY_EXISTS`. Frontend gợi ý họ sang trang xác minh và dùng `resend-code`.
- Xác nhận lại tài khoản đã xác minh: nên xử lý idempotent (trả thành công hoặc `ACCOUNT_ALREADY_VERIFIED`), cần kiểm tra lại hành vi thực tế của Cognito khi làm.

Ánh xạ lỗi Cognito:

| Lỗi Cognito | errorCode | HTTP |
|---|---|---|
| `UsernameExistsException` | `EMAIL_ALREADY_EXISTS` | 409 |
| `InvalidPasswordException` | `WEAK_PASSWORD` | 400 |
| `InvalidParameterException` | `VALIDATION_ERROR` | 400 |
| `CodeMismatchException`, `UserNotFoundException` (khi xác nhận) | `OTP_INVALID` | 400 |
| `ExpiredCodeException` | `OTP_EXPIRED` | 400 |
| `LimitExceededException`, `TooManyRequestsException` | `TOO_MANY_REQUESTS` | 429 |
| Lỗi khác (mạng, quyền, cấu hình) | `COGNITO_ERROR` | 502 |

### File structure

```
src/features/auth/
├── api/authApi.ts
├── components/
│   ├── RegisterForm.tsx
│   └── VerifyRegisterForm.tsx
├── pages/
│   ├── RegisterPage.tsx
│   └── VerifyRegisterPage.tsx
├── schemas/
│   ├── registerSchema.ts
│   └── verifyRegisterSchema.ts
└── types/auth.types.ts
```

---

## [AUTH-02] Đăng nhập và làm mới token (AWS Cognito)

**Nhãn:** `auth` `frontend` · **Ưu tiên:** P0 · **Kích thước:** L · **Phụ thuộc:** AUTH-01, SETUP-02

### Mô tả

Người dùng đăng nhập bằng email và mật khẩu. Backend gọi Cognito `InitiateAuth`, nhận token từ Cognito và trả về cho frontend. Sau khi đăng nhập thành công, backend **đồng bộ** thông tin user từ Cognito vào database (tạo `users` và `user_streaks` nếu chưa có). Mọi API khác yêu cầu `accessToken` của Cognito. Backend không tự cấp JWT.

### Tasklist

- [x] Trang `LoginPage` (`/login`): email, mật khẩu, nút đăng nhập, link tới quên mật khẩu và đăng ký.
- [x] Gọi API, lưu **chỉ** `accessToken` và `refreshToken` qua `tokenStorage` (không lưu `idToken`).
- [x] Sau khi đăng nhập gọi `GET /api/v1/users/me` (AUTH-03), rồi chuyển hướng: `learner` về `/topics`, `admin` về `/admin`.
- [x] Hiển thị lỗi thân thiện cho `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `TOO_MANY_REQUESTS`.
- [x] Lỗi `ACCOUNT_NOT_VERIFIED`: hiển thị gợi ý và dẫn tới `/verify-register` kèm email.
- [x] Interceptor trong `apiClient`: gặp 401 `TOKEN_EXPIRED` thì gọi `POST /auth/refresh` **một lần**, các request đồng thời chờ chung kết quả đó, rồi gửi lại request ban đầu. Refresh thất bại thì xóa token và về `/login`.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| POST | `/api/v1/auth/login` | Công khai |
| POST | `/api/v1/auth/refresh` | Công khai |

Request `login`:

```json
{
  "email": "user1@gmail.com",
  "password": "Password@123"
}
```

Request `refresh`:

```json
{ "refreshToken": "eyJjdHkiOiJKV1Qi..." }
```

### Response mẫu

`login` thành công (200):

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "accessToken": "eyJraWQiOi...",
    "idToken": "eyJraWQiOi...",
    "refreshToken": "eyJjdHkiOi...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

`refresh` thành công (200):

```json
{
  "success": true,
  "message": "Làm mới token thành công",
  "data": {
    "accessToken": "eyJraWQiOi...",
    "idToken": "eyJraWQiOi...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

`login` lỗi (401):

```json
{
  "success": false,
  "message": "Email hoặc mật khẩu không đúng",
  "errorCode": "INVALID_CREDENTIALS",
  "errors": [],
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- Backend không tự cấp JWT. Token do Cognito cấp, backend chỉ chuyển cho frontend và xác thực (mục 1, điểm 1).
- Thông tin user (role, status, streak) nằm ở database. Cognito chỉ giữ danh tính và mật khẩu.
- Sai email hoặc sai mật khẩu đều trả `INVALID_CREDENTIALS` (không tiết lộ email có tồn tại).
- `accessToken` hết hạn sau 60 phút theo `expiresIn`. Có refresh để người chơi không bị đăng xuất giữa lúc đang chơi (mục 1, điểm 14).
- Lưu token ở `localStorage` cho đơn giản ở V1. Cần chống XSS (không chèn HTML thô, không dùng thư viện không rõ nguồn).
- Tùy chọn: Cognito đã giới hạn số lần đăng nhập sai và trả `TOO_MANY_REQUESTS`, không cần tự làm lại.

Ánh xạ lỗi Cognito và trạng thái:

| Nguồn | errorCode | HTTP |
|---|---|---|
| `NotAuthorizedException`, `UserNotFoundException` | `INVALID_CREDENTIALS` | 401 |
| `UserNotConfirmedException` | `ACCOUNT_NOT_VERIFIED` | 403 |
| `PasswordResetRequiredException` | `PASSWORD_RESET_REQUIRED` | 403 |
| `users.status = 'LOCKED'` | `ACCOUNT_LOCKED` | 403 |
| Refresh token sai hoặc hết hạn | `REFRESH_TOKEN_INVALID` | 401 |
| Challenge Cognito không hỗ trợ | `CHALLENGE_NOT_SUPPORTED` | 400 |
| Token hợp lệ nhưng chưa có bản ghi `users` | `USER_NOT_SYNCED` | 401 |
| `LimitExceededException`, `TooManyRequestsException` | `TOO_MANY_REQUESTS` | 429 |

### File structure

```
src/
├── features/auth/
│   ├── api/authApi.ts
│   ├── components/LoginForm.tsx
│   ├── pages/LoginPage.tsx
│   ├── schemas/loginSchema.ts
│   └── types/auth.types.ts
└── lib/
    ├── apiClient.ts        (thêm interceptor refresh token)
    └── tokenStorage.ts
```

---

## [AUTH-03] Đăng xuất, thông tin tài khoản, đồng bộ user, bảo vệ route

**Nhãn:** `auth` `frontend` · **Ưu tiên:** P0 · **Kích thước:** M · **Phụ thuộc:** AUTH-02

### Mô tả

Hoàn thiện vòng đời phiên đăng nhập: đăng xuất qua Cognito, lấy thông tin người dùng hiện tại khi tải lại trang, đồng bộ user từ Cognito vào database khi cần, và bảo vệ các route theo trạng thái đăng nhập và vai trò.

### Tasklist

- [x] `AuthProvider`: khi mở ứng dụng, nếu có token thì gọi `GET /users/me` để khôi phục trạng thái đăng nhập, trong lúc chờ hiển thị màn loading. Không có token thì về `/login`.
- [x] Nếu `/users/me` trả `USER_NOT_SYNCED`: gọi `POST /auth/sync` rồi gọi lại `/users/me`.
- [x] Hook `useAuth()`: `user`, `isAuthenticated`, `login`, `logout`.
- [x] `logout`: gọi API, **dù API lỗi vẫn** xóa token, xóa cache TanStack Query và chuyển về `/login`.
- [x] `ProtectedRoute` (cần đăng nhập, áp dụng cho Game, Profile, Progress) và `RoleRoute` (cần vai trò `admin`). Learner vào trang admin thì chuyển về `/topics`.
- [x] Khi bị đưa về `/login` do hết phiên, giữ lại đường dẫn đang xem để quay lại sau khi đăng nhập.
- [x] Nút đăng xuất và tên người dùng trên header.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| POST | `/api/v1/auth/logout` | Đã đăng nhập (Bearer accessToken) |
| GET | `/api/v1/users/me` | Đã đăng nhập |
| POST | `/api/v1/auth/sync` | Token Cognito hợp lệ (chưa cần có bản ghi DB) |

### Response mẫu

`GET /api/v1/users/me` (200), `POST /api/v1/auth/sync` trả cùng dạng:

```json
{
  "success": true,
  "message": "Lấy thông tin tài khoản thành công",
  "data": {
    "id": 1000002,
    "email": "user1@gmail.com",
    "displayName": "John",
    "role": "learner",
    "currentStreak": 3
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

`POST /api/v1/auth/logout` (200):

```json
{
  "success": true,
  "message": "Đăng xuất thành công",
  "data": null,
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- `GlobalSignOut` thu hồi refresh token, nhưng backend xác thực accessToken bằng chữ ký nên token cũ vẫn dùng được đến khi hết hạn (tối đa 60 phút). Chấp nhận ở V1 (mục 1, điểm 13).
- Đăng xuất không hủy phiên chơi đang dở. Phiên tự hết hạn theo `session_timeout_minutes` (GAME-02).
- Phân quyền kiểm tra ở backend là bắt buộc. Guard ở frontend chỉ để trải nghiệm tốt hơn.
- Frontend chỉ lưu `accessToken` và `refreshToken`, không tự tạo hay sửa token.

### File structure

```
src/features/auth/
├── context/AuthProvider.tsx
├── hooks/useAuth.ts
├── components/
│   ├── ProtectedRoute.tsx
│   └── RoleRoute.tsx
└── api/
    ├── authApi.ts
    └── userApi.ts
```

---

## [AUTH-04] Quên mật khẩu và đặt lại mật khẩu (AWS Cognito)

**Nhãn:** `auth` `frontend` · **Ưu tiên:** P1 · **Kích thước:** M · **Phụ thuộc:** AUTH-01

### Mô tả

Người dùng quên mật khẩu nhập email, backend gọi Cognito `ForgotPassword`, Cognito gửi email chứa mã OTP. Người dùng nhập mã và mật khẩu mới, backend gọi `ConfirmForgotPassword`. Backend không tự tạo token, không tự gửi email và không lưu gì về reset trong database.

### Tasklist

- [x] `ForgotPasswordPage` (`/forgot-password`): nhập email, hiển thị "Nếu email tồn tại, chúng tôi đã gửi mã xác minh", rồi chuyển sang `/reset-password` kèm email.
- [x] `ResetPasswordPage` (`/reset-password`): email (điền sẵn), mã OTP, mật khẩu mới và nhập lại. Nếu không có email từ trang trước thì cho nhập.
- [x] Thành công: toast và chuyển về `/login`.
- [x] Lỗi `OTP_INVALID`, `OTP_EXPIRED`: hiển thị thông báo và link "Yêu cầu mã mới" về `/forgot-password`. Lỗi `WEAK_PASSWORD` hiển thị tại ô mật khẩu.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| POST | `/api/v1/auth/forgot-password` | Công khai |
| POST | `/api/v1/auth/reset-password` | Công khai |

Request `forgot-password`:

```json
{ "email": "user1@gmail.com" }
```

Request `reset-password`:

```json
{
  "email": "user1@gmail.com",
  "code": "123456",
  "newPassword": "NewPassword@123"
}
```

### Response mẫu

`forgot-password` (200):

```json
{
  "success": true,
  "message": "Nếu email tồn tại, chúng tôi đã gửi mã xác minh đặt lại mật khẩu",
  "data": null,
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

`reset-password` thành công (200):

```json
{
  "success": true,
  "message": "Đặt lại mật khẩu thành công",
  "data": null,
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

`reset-password` lỗi (400):

```json
{
  "success": false,
  "message": "Mã xác minh không đúng hoặc đã hết hạn",
  "errorCode": "OTP_INVALID",
  "errors": [],
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- Cognito sinh mã, gửi email và quyết định thời hạn mã. Backend không cần cột `reset_password_token` hay `reset_password_expired_at`.
- Không để lộ email có tồn tại hay không (chống dò tài khoản), kết hợp với "Prevent user existence errors" ở SETUP-05.
- Cognito tự giới hạn số lần yêu cầu và thử mã, vượt giới hạn thì trả `TOO_MANY_REQUESTS`.
- Email gửi bằng email mặc định của Cognito ở dev, môi trường thật dùng SES (cần xác minh địa chỉ gửi, thoát sandbox).
- Người dùng chưa xác minh email không đặt lại mật khẩu được, cần xác minh OTP đăng ký trước (AUTH-01).

### File structure

```
src/features/auth/
├── pages/
│   ├── ForgotPasswordPage.tsx
│   └── ResetPasswordPage.tsx
├── schemas/
│   ├── forgotPasswordSchema.ts
│   └── resetPasswordSchema.ts
└── api/authApi.ts
```

---

## [CONFIG-01] Đọc cấu hình game (`game_configs`)

**Nhãn:** `config` `frontend` · **Ưu tiên:** P0 · **Kích thước:** S · **Phụ thuộc:** SETUP-02, SETUP-03

### Mô tả

Các luật game lưu trong bảng `game_configs` và không được hard-code. Issue này tạo một service dùng chung để backend đọc cấu hình (có cache ngắn), và một endpoint công khai để frontend biết những cấu hình cần thiết (bật/tắt âm thanh, chế độ chuột, số lần thử, thời gian hết hạn).

### Tasklist

- [x] Hook `useGameConfig()` gọi endpoint khi khởi động ứng dụng, lưu trong cache.
- [x] Kiểu `PublicGameConfig`.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/game-configs/public` | Công khai |

### Response mẫu

```json
{
  "success": true,
  "message": "Lấy cấu hình game thành công",
  "data": {
    "maxAttemptPerWord": 3,
    "sessionTimeoutMinutes": 30,
    "enableAudio": true,
    "enableMouseMode": true,
    "streakEnabled": true,
    "wordsPerSession": 5
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- BR mục 11 và 12: số lần thử và thời gian hết hạn phiên lấy từ `game_configs`, không hard-code.
- Các key hiện có: `max_attempt_per_word`, `session_timeout_minutes`, `enable_audio`, `audio_cache`, `streak_enabled`, `leaderboard_limit`. Key thêm mới (SETUP-02): `enable_mouse_mode`, `words_per_session`, `score_by_attempt`.
- `score_by_attempt` (ví dụ `10,6,3`) chỉ backend dùng, không trả ra endpoint công khai.

### File structure

```
src/features/game/
├── api/gameConfigApi.ts
├── hooks/useGameConfig.ts
└── types/gameConfig.types.ts
```

---

## [TOPIC-01] Danh sách topic

**Nhãn:** `topic` `frontend` · **Ưu tiên:** P0 · **Kích thước:** S · **Phụ thuộc:** AUTH-03

### Mô tả

Sau khi đăng nhập, người dùng thấy các card topic (Food, Travel, Technology, Family, Animal, Nature, Sport, School, Work, Daily Life) và chọn một topic để học hoặc chơi. Mỗi card hiển thị tên, mô tả, số từ và tiến độ của người dùng trong topic đó.

### Tasklist

- [x] Trang `TopicListPage`: lưới card topic, trạng thái loading/lỗi/rỗng.
- [x] Card có biểu tượng (`iconUrl`, có ảnh thay thế nếu null), thanh tiến độ `completedWords/totalWords`.
- [x] Bấm card đi tới `/topics/:topicId` (màn học, VOCAB-01).

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/topics` | Đã đăng nhập |

### Response mẫu

```json
{
  "success": true,
  "message": "Lấy danh sách topic thành công",
  "data": [
    {
      "id": 1,
      "name": "Food",
      "description": "Đồ ăn",
      "iconUrl": null,
      "orderNo": 1,
      "totalWords": 20,
      "completedWords": 4
    }
  ],
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- BR mục 5: người dùng học theo topic, không phân loại theo trình độ (A0, A1-A2, B1-B2).
- Topic bị ẩn (`is_active=false`) không xuất hiện.

### File structure

```
src/features/topics/
├── api/topicApi.ts
├── components/TopicCard.tsx
├── pages/TopicListPage.tsx
└── types/topic.types.ts
```

---

## [VOCAB-01] Danh sách từ vựng theo topic (màn học)

**Nhãn:** `vocabulary` `frontend` · **Ưu tiên:** P0 · **Kích thước:** M · **Phụ thuộc:** TOPIC-01

### Mô tả

Trong một topic, người dùng xem danh sách từ vựng gồm từ tiếng Anh, nghĩa tiếng Việt, phiên âm IPA, nút nghe phát âm, và biết từ nào đã hoàn thành. Từ màn này người dùng bấm "Chơi ngay" để bắt đầu phiên chơi (GAME-02).

### Tasklist

- [ ] Trang `TopicDetailPage` (`/topics/:topicId`): tiêu đề topic, danh sách từ dạng thẻ.
- [ ] Mỗi thẻ: từ, nghĩa, IPA, nút nghe (hoạt động sau khi có AUDIO-01), dấu đã hoàn thành.
- [ ] Nút "Chơi ngay" điều hướng sang màn chơi (GAME-05).
- [ ] Trạng thái loading, rỗng, lỗi `TOPIC_NOT_FOUND`.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/topics/{topicId}/vocabularies?page=1&size=20` | Đã đăng nhập |

### Response mẫu

```json
{
  "success": true,
  "message": "Lấy danh sách từ vựng thành công",
  "data": {
    "items": [
      {
        "id": 1,
        "word": "apple",
        "meaningVi": "Quả táo",
        "ipa": "/ˈæp.əl/",
        "hasAudio": true,
        "completed": true,
        "bestScore": 10
      }
    ],
    "page": 1,
    "size": 20,
    "totalItems": 20,
    "totalPages": 1
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- BR mục 6: từ vựng gồm word, meaning, IPA, audio URL.
- Màn học cho phép xem từ (đây là màn học, không phải màn chơi nên không cần giấu từ).
- Từ có `is_active=false` (xóa mềm) không hiển thị.

### File structure

```
src/features/topics/
├── api/vocabularyApi.ts
├── components/VocabularyCard.tsx
├── pages/TopicDetailPage.tsx
└── types/vocabulary.types.ts
```

---

## [AUDIO-01] Phát âm từ vựng (Polly + S3)

**Nhãn:** `audio` `frontend` · **Ưu tiên:** P1 · **Kích thước:** L · **Phụ thuộc:** VOCAB-01, CONFIG-01

### Mô tả

Người dùng bấm nút loa để nghe phát âm. Audio được tạo bằng AWS Polly, lưu trên S3 và đường dẫn lưu vào `vocabularies.audio_url`. Từ đã có audio thì dùng lại, không gọi Polly nữa. Backend trả URL mà trình duyệt phát được.

### Tasklist

- [ ] Component `AudioButton`: lấy URL (có cache theo `vocabId`), phát bằng thẻ audio, trạng thái đang tải/đang phát.
- [ ] Ẩn nút khi `enableAudio=false` (từ CONFIG-01). Hiển thị thông báo nhẹ khi `AUDIO_UNAVAILABLE`.
- [ ] Dùng trong màn học (VOCAB-01) và màn chơi (GAME-05).

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/vocabularies/{id}/audio` | Đã đăng nhập |

### Response mẫu

```json
{
  "success": true,
  "message": "Lấy audio thành công",
  "data": {
    "enabled": true,
    "audioUrl": "https://bucket.s3.ap-southeast-1.amazonaws.com/audio/apple.mp3?X-Amz-Signature=...",
    "expiresIn": 3600
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- BR mục 13: tạo audio khi có từ mới, lưu `audio_url`, người dùng nghe lại dùng file đã có, **không gọi Polly lại nhiều lần**.
- Frontend không bao giờ nhận trực tiếp chuỗi `s3://` (xem mục 1, điểm 8).
- Bucket S3 để riêng tư, truy cập qua presigned URL hoặc CloudFront.

### File structure

```
src/features/audio/
├── api/audioApi.ts
├── components/AudioButton.tsx
└── hooks/useAudio.ts
```

---

## [GAME-01] Lớp nhập liệu: cử chỉ tay và chuột (Frontend)

**Nhãn:** `game` `frontend` · **Ưu tiên:** P0 · **Kích thước:** L · **Phụ thuộc:** SETUP-04, CONFIG-01

### Mô tả

Phần nhận diện cử chỉ (MediaPipe/TensorFlow.js) đã được nhóm làm xong ở mức thử nghiệm. Issue này đóng gói nó thành một **lớp nhập liệu dùng chung**, để màn chơi chỉ làm việc với các sự kiện "chọn chữ", "thả chữ" mà không quan tâm đầu vào là tay hay chuột. Khi camera lỗi thì chuyển sang chuột nếu cấu hình cho phép.

### Tasklist

- [x] Định nghĩa giao diện `InputController`: sự kiện con trỏ di chuyển, `grab` (gắp), `release` (thả), cùng hàm `start()` và `stop()`.
- [x] `GestureInputController`: khởi tạo MediaPipe, theo dõi bàn tay, nhận diện cử chỉ gắp (ví dụ chụm ngón cái và ngón trỏ), chuyển tọa độ sang tọa độ màn hình, làm mượt chuyển động.
- [x] `MouseInputController`: kéo thả bằng chuột và cảm ứng.
- [x] Hook `useInputController()`: ưu tiên cử chỉ nếu người dùng cho phép camera; khi từ chối quyền hoặc camera lỗi, chuyển sang chuột nếu `enableMouseMode = true`; nếu `enableMouseMode = false` thì hiển thị màn lỗi hướng dẫn.
- [x] Xin quyền camera có màn giải thích trước ("video chỉ xử lý trên máy bạn, không gửi đi đâu").
- [x] Dừng hẳn camera (`track.stop()`) khi rời màn chơi, tab bị ẩn hoặc phiên kết thúc.
- [x] Hiển thị con trỏ bàn tay trên màn hình, khung xem trước camera nhỏ có thể ẩn.
- [x] Đo FPS, cảnh báo nhẹ khi dưới ngưỡng dễ chơi (ví dụ dưới 15 FPS) và gợi ý đổi sang chuột.
- [x] Chống nhận nhầm: cần giữ cử chỉ ổn định một khoảng ngắn (vài khung hình) mới tính là gắp hoặc thả.
- [x] Viết bộ test cho phần logic không phụ thuộc camera (làm mượt, ngưỡng cử chỉ, chuyển chế độ).

### Endpoints

Không có.

### Business rule và lưu ý

- BR mục 9: camera xử lý hoàn toàn ở frontend. **Video không gửi lên backend và không lưu ở server.** Backend chỉ nhận chữ cái người dùng chọn và kết quả thao tác.
- BR mục 9 và 12: camera lỗi thì có thể chuyển sang chế độ chuột, điều khiển bởi `enable_mouse_mode`.
- Chế độ chuột và chế độ cử chỉ dùng chung luật chơi và cách chấm điểm.
- Tải mô hình MediaPipe một lần và tái sử dụng; hiển thị trạng thái đang tải.

### File structure

```
src/features/game/input/
├── InputController.ts
├── GestureInputController.ts
├── MouseInputController.ts
├── useInputController.ts
├── gestureUtils.ts
├── components/
│   ├── CameraPermissionGate.tsx
│   ├── HandCursor.tsx
│   └── CameraPreview.tsx
└── __tests__/
    └── gestureUtils.test.ts
```

---

## [GAME-05] Màn hình chơi và màn hình kết quả (Frontend)

**Nhãn:** `game` `frontend` · **Ưu tiên:** P0 · **Kích thước:** L · **Phụ thuộc:** GAME-01, GAME-02, GAME-03, GAME-04

### Mô tả

Màn hình chơi chính: với mỗi từ, người dùng thấy nghĩa tiếng Việt, IPA, nút nghe phát âm và các chữ cái đã xáo trộn. Người dùng dùng tay (hoặc chuột) gắp từng chữ vào các ô trống để ghép thành từ rồi xác nhận. Sau khi hoàn thành các từ là màn hình kết quả.

### Tasklist

- [x] Máy trạng thái của phiên: `idle` → `loading` → `playing` → `submitting` → `wordFeedback` → `finished` / `expired` / `error`.
- [x] Khi vào màn chơi: gọi `GET /game-sessions/current` để khôi phục phiên đang dở (nếu có), nếu không thì tạo phiên mới.
- [x] Giao diện từ hiện tại: nghĩa, IPA, `AudioButton`, các ô trống đúng bằng `wordLength`, vùng chữ cái.
- [x] Gắp chữ vào ô trống bằng `InputController` (GAME-01); cho phép gắp lại chữ đã đặt trả về vùng chữ.
- [x] Nút **Xác nhận** (chỉ nộp khi người chơi bấm, và ô đã đầy) và nút **Xóa làm lại**. Không tự động nộp theo từng lần đặt chữ để tránh nộp nhầm do cử chỉ.
- [x] Gọi `POST .../attempts`, hiển thị đúng/sai, số lần thử còn lại, hiển thị đáp án khi từ đã xong (`correctWord`).
- [x] Thanh tiến độ `wordsDone/totalWords` và điểm hiện tại.
- [x] Khi `sessionDone=true` tự gọi `POST .../finish`.
- [x] Màn kết quả: thắng/thua, điểm, số từ đúng ngay lần đầu, streak hiện tại, nút "Chơi lại" và "Về danh sách topic".
- [x] Xử lý `SESSION_EXPIRED`: hiển thị hộp thoại và về danh sách topic. Thoát giữa chừng thì hỏi xác nhận rồi gọi `cancel`.
- [x] Chặn nộp trùng khi đang chờ phản hồi (disable nút, tránh double-click).
- [x] Giao diện cho cả hai chế độ nhập, bố cục co giãn theo kích thước màn hình máy tính.

### Endpoints

Sử dụng lại các endpoint của GAME-02, GAME-03, GAME-04. Frontend không có endpoint riêng.

### Business rule và lưu ý

- Frontend không biết đáp án trước khi từ xong, mọi đúng/sai do backend quyết định.
- Frontend không gửi video, chỉ gửi chuỗi chữ cái (BR mục 9).
- Số lần thử tối đa và thời gian hết hạn hiển thị theo giá trị backend trả về, không hard-code.
- Phiên chưa kết thúc mà người dùng đóng tab: để phiên tự hết hạn.

### File structure

```
src/features/game/
├── api/gameSessionApi.ts
├── hooks/
│   ├── useGameSession.ts
│   └── useWordBoard.ts
├── state/
│   └── gameMachine.ts
├── components/
│   ├── LetterTile.tsx
│   ├── AnswerSlots.tsx
│   ├── WordPrompt.tsx
│   ├── ProgressBar.tsx
│   └── AttemptFeedback.tsx
├── pages/
│   ├── GamePage.tsx
│   └── GameResultPage.tsx
└── types/
    └── gameSession.types.ts
```

---

## [PROGRESS-01] Tiến trình học và streak

**Nhãn:** `progress` `frontend` · **Ưu tiên:** P0 · **Kích thước:** M · **Phụ thuộc:** GAME-04

### Mô tả

Người dùng xem tiến trình học của mình: số từ đã hoàn thành theo từng topic, điểm cao nhất, thời điểm hoàn thành đầu tiên và streak hiện tại.

### Tasklist

- [ ] Trang `ProgressPage`: thẻ streak, danh sách topic kèm thanh tiến độ.
- [ ] Bấm vào topic mở chi tiết từng từ.
- [ ] Trạng thái rỗng khi chưa chơi, có nút dẫn tới danh sách topic.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/progress` | Đã đăng nhập |
| GET | `/api/v1/progress/topics/{topicId}` | Đã đăng nhập |

### Response mẫu

`GET /api/v1/progress` (200):

```json
{
  "success": true,
  "message": "Lấy tiến trình học thành công",
  "data": {
    "currentStreak": 3,
    "topics": [
      {
        "topicId": 1,
        "name": "Food",
        "totalWords": 20,
        "completedWords": 4
      }
    ]
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

`GET /api/v1/progress/topics/1` (200):

```json
{
  "success": true,
  "message": "Lấy chi tiết tiến trình thành công",
  "data": {
    "topicId": 1,
    "name": "Food",
    "words": [
      {
        "vocabId": 1,
        "word": "apple",
        "completed": true,
        "bestScore": 10,
        "firstCompletedAt": "2026-10-13T20:15:00+07:00"
      }
    ]
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- BR mục 15: progress lưu từ đã hoàn thành, điểm cao nhất, thời điểm hoàn thành đầu tiên.
- BR mục 16: streak là số lần hoàn thành liên tiếp, không phải số ngày đăng nhập.
- Người dùng chỉ xem được tiến trình của chính mình.

### File structure

```
src/features/progress/
├── api/progressApi.ts
├── components/
│   ├── StreakCard.tsx
│   └── TopicProgressRow.tsx
├── pages/ProgressPage.tsx
└── types/progress.types.ts
```

---

## [LEADERBOARD-01] Bảng xếp hạng tuần

**Nhãn:** `leaderboard` `frontend` · **Ưu tiên:** P1 · **Kích thước:** M · **Phụ thuộc:** GAME-04

### Mô tả

Hiển thị bảng xếp hạng điểm của tuần hiện tại. Mỗi dòng gồm thứ hạng, tên hiển thị và tổng điểm. Tuần tính từ 00:00 thứ Hai theo giờ Việt Nam. Người dùng luôn thấy vị trí của mình dù không nằm trong top.

### Tasklist

- [ ] Trang `LeaderboardPage`: bảng xếp hạng, đánh dấu dòng của chính mình, hiển thị khoảng ngày của tuần.
- [ ] Trạng thái rỗng khi chưa ai có điểm.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/leaderboard/weekly` | Đã đăng nhập |

### Response mẫu

```json
{
  "success": true,
  "message": "Lấy bảng xếp hạng tuần thành công",
  "data": {
    "weekStart": "2026-10-12",
    "weekEnd": "2026-10-18",
    "items": [
      { "rank": 1, "displayName": "Anna", "totalScore": 240, "isMe": false },
      { "rank": 2, "displayName": "John", "totalScore": 190, "isMe": true }
    ],
    "me": { "rank": 2, "displayName": "John", "totalScore": 190 }
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- BR mục 17: theo tuần, lưu user và tổng điểm, hiển thị display name và score, không hiển thị email.
- Điểm cộng dồn nên người chơi lại nhiều lần sẽ có lợi thế (mục 1, điểm 11). Ghi nhận để cải tiến sau.

### File structure

```
src/features/leaderboard/
├── api/leaderboardApi.ts
├── components/LeaderboardTable.tsx
├── pages/LeaderboardPage.tsx
└── types/leaderboard.types.ts
```

---

## [ADMIN-01] Admin: quản lý người dùng

**Nhãn:** `admin` `frontend` · **Ưu tiên:** P1 · **Kích thước:** M · **Phụ thuộc:** AUTH-03

### Mô tả

Admin xem danh sách người dùng, xem chi tiết một người và khóa hoặc mở khóa tài khoản. Tài khoản bị khóa không đăng nhập được và token đang dùng cũng bị từ chối ngay.

### Tasklist

- [ ] Trang `AdminUserListPage`: bảng, ô tìm kiếm, bộ lọc vai trò/trạng thái, phân trang.
- [ ] Trang chi tiết người dùng, nút Khóa/Mở khóa có hộp xác nhận.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/admin/users` | Admin |
| GET | `/api/v1/admin/users/{id}` | Admin |
| PATCH | `/api/v1/admin/users/{id}/status` | Admin |

Request đổi trạng thái:

```json
{ "status": "LOCKED" }
```

### Response mẫu

Danh sách (200):

```json
{
  "success": true,
  "message": "Lấy danh sách người dùng thành công",
  "data": {
    "items": [
      {
        "id": 1000002,
        "email": "user1@gmail.com",
        "displayName": "John",
        "role": "learner",
        "status": "ACTIVE",
        "createdAt": "2026-10-01T08:00:00+07:00"
      }
    ],
    "page": 1,
    "size": 20,
    "totalItems": 4,
    "totalPages": 1
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

Lỗi (400):

```json
{
  "success": false,
  "message": "Không thể khóa tài khoản của chính bạn",
  "errorCode": "CANNOT_LOCK_SELF",
  "errors": [],
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- BR mục 3: admin có quyền quản lý user.
- Các ràng buộc "không khóa chính mình, không khóa admin khác" là đề xuất an toàn, team có thể bỏ nếu không cần.
- Lưu lại thao tác khóa/mở khóa trong log ứng dụng (ai làm, lúc nào, với ai).
- `accessToken` Cognito còn hợp lệ về chữ ký đến khi hết hạn, nên backend kiểm tra `users.status` ở **mỗi request** (AUTH-02) để khóa có hiệu lực ngay.
- Các API `Admin*` của Cognito cần quyền IAM cho backend, giới hạn theo ARN của User Pool (SETUP-05).

### File structure

```
src/features/admin/users/
├── api/adminUserApi.ts
├── components/
│   ├── UserTable.tsx
│   └── LockUserDialog.tsx
├── pages/
│   ├── AdminUserListPage.tsx
│   └── AdminUserDetailPage.tsx
└── types/adminUser.types.ts
```

---

## [ADMIN-02] Admin: quản lý topic

**Nhãn:** `admin` `frontend` · **Ưu tiên:** P1 · **Kích thước:** M · **Phụ thuộc:** AUTH-03

### Mô tả

Admin tạo, xem, sửa và xóa (mềm) topic. Topic hiển thị cho người học là các topic đang hoạt động.

### Tasklist

- [ ] Trang `AdminTopicListPage` với bảng, nút thêm/sửa/xóa.
- [ ] Form tạo/sửa topic có validate, hộp xác nhận khi xóa.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/admin/topics` | Admin |
| GET | `/api/v1/admin/topics/{id}` | Admin |
| POST | `/api/v1/admin/topics` | Admin |
| PUT | `/api/v1/admin/topics/{id}` | Admin |
| DELETE | `/api/v1/admin/topics/{id}` | Admin |

Request tạo/sửa:

```json
{
  "name": "Food",
  "description": "Đồ ăn",
  "iconUrl": null,
  "orderNo": 1,
  "isActive": true
}
```

### Response mẫu

Tạo (201):

```json
{
  "success": true,
  "message": "Tạo topic thành công",
  "data": {
    "id": 11,
    "name": "Music",
    "description": "Âm nhạc",
    "iconUrl": null,
    "orderNo": 11,
    "isActive": true,
    "totalWords": 0
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- BR mục 18: admin có CRUD đầy đủ cho topic. Việc "Delete" thực hiện dưới dạng xóa mềm để không làm hỏng lịch sử chơi và tiến trình.
- Topic ẩn không xuất hiện cho người học (TOPIC-01) và không thể bắt đầu phiên mới (GAME-02).

### File structure

```
src/features/admin/topics/
├── api/adminTopicApi.ts
├── components/TopicForm.tsx
├── pages/AdminTopicListPage.tsx
└── types/adminTopic.types.ts
```

---

## [ADMIN-03] Admin: quản lý từ vựng và audio

**Nhãn:** `admin` `frontend` · **Ưu tiên:** P1 · **Kích thước:** L · **Phụ thuộc:** ADMIN-02, AUDIO-01

### Mô tả

Admin thêm, sửa, xóa mềm từ vựng (từ, nghĩa, IPA) và quản lý audio phát âm. Khi thêm từ mới, hệ thống tạo audio bằng Polly và lưu `audio_url`.

### Tasklist

- [ ] Trang `AdminVocabularyListPage`: bảng, lọc theo topic, tìm kiếm, phân trang.
- [ ] Form thêm/sửa từ, nghe thử audio, nút tạo lại audio.
- [ ] Hộp xác nhận khi xóa.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/admin/vocabularies` | Admin |
| GET | `/api/v1/admin/vocabularies/{id}` | Admin |
| POST | `/api/v1/admin/vocabularies` | Admin |
| PUT | `/api/v1/admin/vocabularies/{id}` | Admin |
| DELETE | `/api/v1/admin/vocabularies/{id}` | Admin |
| POST | `/api/v1/admin/vocabularies/{id}/audio/regenerate` | Admin |

Request tạo/sửa:

```json
{
  "topicId": 1,
  "word": "apple",
  "meaningVi": "Quả táo",
  "ipa": "/ˈæp.əl/",
  "isActive": true
}
```

### Response mẫu

Tạo (201):

```json
{
  "success": true,
  "message": "Tạo từ vựng thành công",
  "data": {
    "id": 201,
    "topicId": 1,
    "word": "lemon",
    "meaningVi": "Quả chanh",
    "ipa": "/ˈlem.ən/",
    "hasAudio": true,
    "isActive": true,
    "warnings": []
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- BR mục 6: admin được thêm, sửa, xóa mềm từ vựng.
- BR mục 7: game chỉ dùng 26 chữ cái nên từ vựng chỉ gồm A-Z.
- BR mục 13: audio tạo khi có từ mới, lưu `audio_url`, không gọi Polly lặp lại.
- Từ đã có người chơi thì không xóa cứng.

### File structure

```
src/features/admin/vocabularies/
├── api/adminVocabularyApi.ts
├── components/
│   ├── VocabularyForm.tsx
│   └── VocabularyTable.tsx
├── pages/AdminVocabularyListPage.tsx
├── schemas/vocabularySchema.ts
└── types/adminVocabulary.types.ts
```

---

## [ADMIN-04] Admin: quản lý cấu hình game

**Nhãn:** `admin` `frontend` · **Ưu tiên:** P1 · **Kích thước:** S · **Phụ thuộc:** CONFIG-01

### Mô tả

Admin xem và chỉnh các luật game lưu trong `game_configs` (số lần thử, thời gian hết hạn phiên, bật/tắt phát âm, chế độ chuột, streak...). Thay đổi có hiệu lực mà không cần sửa code hay triển khai lại.

### Tasklist

- [ ] Trang `AdminGameConfigPage`: bảng cấu hình, sửa tại chỗ, kiểu ô nhập theo loại giá trị (số, bật/tắt), nút Lưu.

### Endpoints (API contract do backend cung cấp)

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/admin/game-configs` | Admin |
| PUT | `/api/v1/admin/game-configs/{id}` | Admin |

Request:

```json
{
  "configValue": "3",
  "isActive": true
}
```

### Response mẫu

```json
{
  "success": true,
  "message": "Cập nhật cấu hình thành công",
  "data": {
    "id": 1,
    "configKey": "max_attempt_per_word",
    "configValue": "3",
    "description": "Số lần thử tối đa mỗi từ",
    "isActive": true
  },
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

Lỗi (400):

```json
{
  "success": false,
  "message": "Giá trị không hợp lệ",
  "errorCode": "VALIDATION_ERROR",
  "errors": [
    { "field": "configValue", "message": "max_attempt_per_word phải từ 1 đến 5" }
  ],
  "timestamp": "2026-10-14T09:30:00+07:00"
}
```

### Business rule và lưu ý

- BR mục 18: admin thay đổi số lần thử, timeout và các tính năng game.
- Cấu hình đổi giữa chừng áp dụng cho lần đọc kế tiếp (có thể ảnh hưởng phiên đang chơi). Nếu cần chặt chẽ hơn, lưu bản chụp cấu hình vào phiên khi bắt đầu (ngoài phạm vi V1).

### File structure

```
src/features/admin/configs/
├── api/adminGameConfigApi.ts
├── components/ConfigRow.tsx
├── pages/AdminGameConfigPage.tsx
└── types/adminGameConfig.types.ts
```



