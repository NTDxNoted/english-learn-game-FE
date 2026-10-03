# 🚀 Pull Request: Tổng Hợp Tiến Trình Triển Khai Frontend (Auth, AWS Services, Game Engine & Play Screen)

## 📌 Liên kết Issue (Issue IDs)
- **SETUP**: [SETUP-01], [SETUP-02], [SETUP-03], [SETUP-04] (Cấu trúc nền tảng, Design System Signly, Axios Interceptors, TanStack Query)
- **AUTH**: [AUTH-01], [AUTH-02], [AUTH-03], [AUTH-04] (Vòng đời người dùng hoàn chỉnh tích hợp AWS Cognito)
- **CONFIG & GAME**: [CONFIG-01], [GAME-01], [GAME-05] (Cấu hình động, Bộ điều khiển Cử chỉ tay MediaPipe on-device, Màn chơi ghép chữ & Kết quả)

---

## ☁️ Kiến Trúc Dịch Vụ AWS & Cơ Chế Hoạt Động (AWS Cloud Integration)

Hệ thống được thiết kế theo mô hình **Cloud-Native & Edge Computing** tối ưu chi phí và bảo mật tuyệt đối cho người học:

```mermaid
flowchart TD
    subgraph ClientBrowser ["Trình duyệt người học (Client / Edge)"]
        Cam[Camera / Webcam] -->|Frame Bitmap| Worker[Web Worker: MediaPipe Hands]
        Worker -->|Tọa độ ngón tay 21 điểm| InputCtrl[GestureInputController]
        Mouse[Chuột / Cảm ứng] --> InputCtrl
        InputCtrl -->|Grab / Release / Move| GamePlay[GameSessionPage / WordBoard]
        AuthUI[Auth Forms: Login/Register/OTP] --> AuthCtx[AuthContext + Axios Mutex]
    end

    subgraph AWSCognito ["AWS Cognito Service"]
        UserPool[Cognito User Pool]
        AppClient[Cognito App Client]
        UserPool --- AppClient
    end

    subgraph AWSCloud ["AWS Infrastructure"]
        APIGW[AWS API Gateway + JWT Authorizer]
        Backend[Backend Service: Spring Boot / ECS / Lambda]
        DB[(Amazon RDS / DynamoDB: configs, sessions)]
        S3CF[Amazon S3 + CloudFront CDN]
    end

    AuthUI -->|SignUp / ConfirmSignUp / ForgotPassword| UserPool
    AuthCtx -->|Token Refresh / Revoke / GlobalSignOut| UserPool
    GamePlay -->|POST /attempts, POST /finish (Chỉ gửi text JSON)| APIGW
    APIGW -->|Verify Cognito JWT Bearer| Backend
    Backend --> DB
    S3CF -.->|Phục vụ Static Assets, WASM, Model Worker| ClientBrowser
```

### 1. AWS Cognito User Pools & Identity
- **Đăng ký & Xác thực OTP ([AUTH-01])**:
  - `authApi.register` $\rightarrow$ Tương ứng Cognito `SignUp`. Backend/Cognito sinh mã xác thực OTP 6 số gửi qua Amazon SES (Simple Email Service).
  - `authApi.confirmRegister` $\rightarrow$ Tương ứng Cognito `ConfirmSignUp`. Kích hoạt tài khoản khi người dùng nhập đúng OTP.
  - `authApi.resendCode` $\rightarrow$ Tương ứng Cognito `ResendConfirmationCode`. Có throttle và đếm ngược 60 giây chống spam.
- **Đăng nhập & Quản lý phiên ([AUTH-02])**:
  - `authApi.login` $\rightarrow$ Tương ứng Cognito `InitiateAuth` (AuthFlow: `USER_PASSWORD_AUTH` / `USER_SRP_AUTH`).
  - Nhận về bộ ba Tokens:
    - **ID Token**: Chứa claims (`sub`, `email`, `custom:role`, `exp`).
    - **Access Token**: Token dạng Bearer dùng kèm vào Header `Authorization: Bearer <token>` của mọi request API.
    - **Refresh Token**: Dùng để xin cấp mới Access Token khi hết hạn mà không bắt người học đăng nhập lại.
  - **Token Mutex Lock**: Xử lý chống race condition khi có nhiều request đồng thời gặp lỗi 401: chỉ 1 request gọi refresh, các request còn lại đưa vào hàng đợi chờ token mới rồi retry.
- **Đăng xuất & Bảo mật đa thiết bị ([AUTH-03])**:
  - `authApi.logout` $\rightarrow$ Tương ứng Cognito `GlobalSignOut`. Thu hồi toàn bộ Refresh Token trên mọi thiết bị đăng nhập, xóa sạch token ở localStorage/in-memory, chuyển hướng về `/login`.
  - **Session Restore & Route Guard**: Khởi động app tự kiểm tra token, khôi phục session và tự gia hạn nếu sắp hết hạn; bảo vệ các route riêng tư thông qua `<ProtectedRoute>`.
- **Quên mật khẩu & Đặt lại mật khẩu ([AUTH-04])**:
  - `authApi.forgotPassword` $\rightarrow$ Cognito `ForgotPassword` gửi mã reset code về email.
  - `authApi.confirmForgotPassword` $\rightarrow$ Cognito `ConfirmForgotPassword` với code mới và password mới.

### 2. AWS API Gateway & Backend Services
- **Cognito JWT Authorizer**: API Gateway tự động giải mã và kiểm tra chữ ký khóa công khai (JWKS) từ AWS Cognito User Pool trước khi forward request vào backend, giảm tải xác thực cho backend core.
- **Endpoint công khai (Public)**:
  - `GET /api/v1/game-configs/public` ([CONFIG-01]): Đọc luật chơi (`enableMouseMode`, `maxAttemptPerWord`, `sessionTimeoutMinutes`, `enableAudio`).
- **Endpoint bảo vệ (Authenticated)**:
  - `POST /api/v1/game-sessions`: Tạo phiên chơi mới theo Topic.
  - `GET /api/v1/game-sessions/current`: Khôi phục phiên chơi đang dở (nếu người học reload trang).
  - `POST /api/v1/game-sessions/{id}/attempts`: Chấm điểm từ đã ghép.
  - `POST /api/v1/game-sessions/{id}/finish`: Kết thúc phiên và ghi nhận kết quả.
  - `POST /api/v1/game-sessions/{id}/cancel`: Hủy phiên khi người chơi chủ động thoát.

### 3. Edge Computing & Privacy-First Architecture (Client-Side Camera)
- **Zero Server Video Streaming**:
  - Không truyền video frame lên server AWS (tiết kiệm băng thông, giảm chi phí Kinesis/Rekognition, bảo mật tuyệt đối quyền riêng tư và chuẩn GDPR/COPPA cho học sinh).
  - Web Worker ([hand-worker.js](file:///public/workers/hand-worker.js)) chạy MediaPipe Tasks-Vision WASM trực tiếp trên trình duyệt bằng Transferable `ImageBitmap`.
  - Backend AWS chỉ tiếp nhận payload chữ cái siêu nhẹ dạng JSON qua REST.
- **Amazon S3 & CloudFront CDN**:
  - Phục vụ Static frontend bundle (Vite React), Web Worker scripts và WASM model binary với độ trễ thấp toàn cầu.

---

## 🛠️ Chi Tiết Triển Khai Kỹ Thuật

### 1. Chuẩn Hóa Giao Diện & Bảng Màu (Signly Design System)
- Khởi tạo bảng màu Signly chuẩn mực tại [src/constants/colors.ts](file:///src/constants/colors.ts) và [GEMINI.md](file:///GEMINI.md):
  - Canvas Warm Cream: `#fbfaf7`
  - Royal Indigo (Primary): `#322c82`
  - Coral Pink (Accent): `#ff7b62`
  - Pastel Palette: Vàng (`#fff0c2`), Xanh bạc hà (`#d8f1e7`), Hồng san hô (`#ffdcd4`), Tím oải hương (`#ebe9ff`).
  - Khối chữ cái 3D và Slot có hiệu ứng bóng đổ đổ khối (`box-shadow: 0 6px 0 var(--color-brand-shadow)`).

### 2. Engine Cử Chỉ Tay & Điều Khiển Đa Phương Thức ([GAME-01])
- **Khử rung & Lọc nhiễu**:
  - Vector toán học đo khoảng cách 3 chiều giữa đầu ngón cái (`THUMB_TIP`) và ngón trỏ (`INDEX_FINGER_TIP`).
  - Tỷ lệ co ngón bất biến theo cự ly xa gần (`pinchRatio = pinchDistance / palmWidth`).
  - Hysteresis 2-frame: Gắp khi `pinchRatio < 0.58`; Thả khi `pinchRatio > 0.95`.
  - Bộ lọc vận tốc thích ứng $\tau$: di chuyển nhanh mượt mà không trễ, đứng yên ổn định không giật con trỏ.
- **Chế độ Dự phòng Chuột (Mouse Fallback)**:
  - Cho phép người chơi trải nghiệm kéo thả bằng chuột/cảm ứng nếu máy không có camera hoặc camera bị hỏng.
  - Tự động cảnh báo khi FPS rơi xuống dưới 15 FPS để gợi ý chuyển đổi.
  - Dừng hoàn toàn webcam tracks khi unmount để bảo vệ pin và quyền riêng tư.

### 3. Sân Chơi Ghép Chữ & Kết Quả Game ([GAME-05])
- **WordBoard Subcomponent Keyed Architecture**: Tách board chơi riêng và gắn `key={currentWordIndex}` tuân thủ React 19 Compiler, loại bỏ triệt để cảnh báo re-render cascading và lỗi state cũ đè từ mới.
- **Tương tác trực quan**:
  - Gắp chữ cái di chuyển thả vào ô trống.
  - Click/thả chữ trong ô trống để hoàn trả lại kho chữ.
  - Chỉ cho phép bấm "Xác nhận từ" khi đã điền đủ các ô để tránh nộp nhầm do cử chỉ tay vô ý.
  - Phát âm từ vựng chuẩn giọng bản ngữ qua Web Speech API.
  - Hộp thoại kết quả vinh danh chuỗi streak, điểm số, và tùy chọn "Chơi lại" / "Về chủ đề".

---

## 📋 Danh Sách Công Việc Hoàn Thành (PR Checklist)

- [x] Tuân thủ cấu trúc thư mục quy chuẩn theo Feature-driven Architecture:
  - `src/features/auth/` (api, components, hooks, pages, types, schemas)
  - `src/features/game/` (api, components, hooks, input, pages, types)
- [x] TypeScript `strict: true`, 100% type-safe, không sử dụng `any`.
- [x] Đã chạy và vượt qua bộ kiểm thử tự động: `npm test` (**7/7 tests passed** - 119ms).
- [x] Đã chạy và vượt qua kiểm tra linter: `npm run lint` (**0 errors, 0 warnings** trên 73 files).
- [x] Đã build thành công bản production: `npm run build` (`tsc -b && vite build` thành công trong 489ms).
- [x] Đã cập nhật checklist trong tài liệu đặc tả [english-learning-game-issues-frontend.md](file:///public/english-learning-game-issues-frontend.md).
- [x] An toàn thông tin: Video camera hoàn toàn không gửi lên backend AWS.

---

## 📷 Tính Năng Giao Diện & Màn Hình

1. **Màn hình Đăng nhập / Đăng ký / Xác minh OTP / Quên mật khẩu**: Form chuẩn Zod Validation, thông báo Toast trực quan, đếm ngược OTP 60s.
2. **Màn hình Xin quyền Camera (CameraPermissionGate)**: Giải thích minh bạch mục đích sử dụng camera on-device trước khi bật webcam.
3. **Màn hình Chơi game (GameSessionPage)**:
   - Thẻ gợi ý nghĩa tiếng Việt + phiên âm IPA + nút Audio.
   - Hàng ô trống (AnswerSlots) bắt hitbox khi gắp chữ.
   - Kho chữ cái (LetterTile) 3D sống động.
   - Camera mini preview hiển thị FPS và trạng thái nhận diện cử chỉ.
   - Hộp thoại kết quả hoàn thành phiên chơi (GameResultModal).
