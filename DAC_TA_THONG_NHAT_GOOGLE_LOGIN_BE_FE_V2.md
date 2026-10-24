# Đặc tả thống nhất Google Login — Backend và Frontend — V2

**Dự án:** Alphabet Universe  
**Ngày chốt tài liệu:** 10/11/2026  
**Đối tượng:** Member Backend, Frontend và người quản lý Google/Cognito.  
**Trạng thái:** Hợp đồng V2 và danh sách việc cần thực hiện, chưa phải báo cáo V2 đã triển khai thành công.

Hai bên dùng file này làm chuẩn cho các quyết định Google Login bên dưới. Các tài liệu Google Login trước đó phản ánh thiết kế/bản triển khai trước; những khác biệt được chốt lại tại mục 3.

Việc tạo file này không sửa Java/TypeScript, database, biến môi trường đang chạy hoặc cấu hình AWS. Mọi mục nghiệm thu cần có kết quả kiểm thử thực tế sau khi hai bên hoàn thành.

## 1. Phương án V1 của sản phẩm được chốt

| Hạng mục | Quyết định chung |
|---|---|
| Đăng nhập Google | Cognito làm trung gian giữa Google và ứng dụng |
| OAuth flow | Authorization Code + PKCE S256 |
| Bên khởi tạo state/verifier/challenge | FE |
| Bên kiểm tra state callback | FE, đối chiếu giao dịch đã lưu trong cùng tab |
| Bên đổi authorization code | BE qua POST /api/auth/google |
| Token gọi API | Cognito accessToken |
| Token/hồ sơ trước Sync | Chưa được coi là phiên đăng nhập ứng dụng thành công |
| Bên đọc hồ sơ và ghi user local | POST /api/auth/sync |
| Scope OAuth yêu cầu tới Cognito | openid email profile aws.cognito.signin.user.admin |
| API đọc hồ sơ | GetUser trong phạm vi đã chọn đủ scope |
| API cập nhật tên | PATCH /api/users/me hiện có, sử dụng UpdateUserAttributes |
| Refresh V1 | Giữ nhánh SDK REFRESH_TOKEN_AUTH, không bật rotation trong đợt tích hợp này |
| FE gọi BE khi dev | VITE_API_BASE_URL=/api qua Vite Proxy |
| Cổng local thống nhất | FE 3000, BE 8080 |
| Callback ứng dụng local | http://localhost:3000/callback |
| Trùng email khác Cognito sub | Sync trả 409; không tự liên kết tài khoản |
| Vai trò | User mới learner; user cũ giữ nguyên role/status |
| Cấu trúc file FE | Tái sử dụng file hiện có; không bắt buộc tạo bốn file riêng |
| Database | Không thêm bảng/cột cho chức năng cơ bản |

### Lưu ý về scope — điều kiện để áp dụng bản này

FE đã báo App Client hiện chỉ bật ba scope và gặp invalid_scope khi yêu cầu scope thứ tư. Đây là thông tin FE cung cấp; chưa được xác nhận trực tiếp từ AWS Console trong lần tạo tài liệu này.

**Người quản lý Cognito phải bật aws.cognito.signin.user.admin trên đúng App Client trước khi kiểm thử luồng bốn scope.** FE không tự bỏ scope; BE không tự bỏ kiểm tra để đưa người dùng vào một luồng hồ sơ chưa hỗ trợ.

Scope này phục vụ thao tác hồ sơ của chính user. Nó không cấp role admin của ứng dụng hoặc quyền IAM quản trị hệ thống. GetUser và UpdateUserAttributes đều yêu cầu scope tương ứng.

Nguồn: [GetUser](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_GetUser.html), [UpdateUserAttributes](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UpdateUserAttributes.html).

Nếu nhóm không thể bật scope này, bản bốn scope chưa đủ điều kiện triển khai. Khi đó cần đặc tả khác cho userInfo và cách cập nhật hồ sơ, thay vì mỗi bên tự đổi một phần. Không thêm fallback chung khi token sai/hết hạn hoặc AWS WAF chặn.

## 2. Các giá trị phải giống nhau ở BE, FE và AWS

| Giá trị | Local đã chốt | Nơi sử dụng |
|---|---|---|
| FE origin | http://localhost:3000 | Vite, FRONTEND_URL, CORS |
| FE callback | http://localhost:3000/callback | FE authorize, BE allowlist, Cognito Allowed callback URLs |
| FE sign-out URL | http://localhost:3000/login | BE logout URL, Cognito Allowed sign-out URLs |
| BE target | http://localhost:8080 | Vite Proxy |
| FE API base URL | /api | Axios/apiClient |
| Cognito domain | https://<prefix>.auth.<region>.amazoncognito.com | Cùng domain ở BE và FE |
| Cognito App Client ID | <cognito-app-client-id> | Cùng giá trị ở BE, FE và App Client đang cấu hình |
| Google callback | https://<cognito-domain>/oauth2/idpresponse | Google OAuth Client Authorized redirect URIs |

Chọn cổng 3000 theo vite.config.ts của bản FE đã đọc, có strictPort=true. Nếu nhóm đổi cổng sau này, phải thay đồng bộ các URL liên quan; không dùng lẫn 3000 và 5173.

Callback Google → Cognito và callback Cognito → FE là hai URL khác nhau. Proxy /api chỉ áp dụng cho request API của FE, không thay thế callback OAuth.

## 3. Khác biệt giữa BE đang có và hợp đồng V2

| Nội dung | Code trước V2 | Mục tiêu V2 |
|---|---|---|
| API Google đọc profile user mới | Có gọi GetUser và kiểm tra email | Bỏ bước đọc profile/email tại API Google |
| Kiểm tra email trùng | Có ở API Google; Sync kiểm tra sau INSERT cho user mới | Chốt trách nhiệm tại Sync, kiểm tra sớm trước INSERT |
| Mã lỗi email | API Google có GOOGLE_ACCOUNT_EMAIL_CONFLICT; Sync có thể chỉ trả message | Sync thống nhất EMAIL_ALREADY_EXISTS với HTTP 409 |
| Hồ sơ user mới trong Sync | Có thể đọc hai lần | Một lần thông thường; đọc lại khi xử lý user do request khác tạo |
| Số lần đọc profile cho Google user mới | Có thể ba lần cho exchange + Sync | Một lần thông thường trong Sync |
| Callback trong ví dụ cũ | Thường là 5173 | Local chung dùng 3000 |
| FE base URL trong ví dụ cũ | Có ví dụ gọi thẳng BE | Giữ /api qua Vite Proxy |
| Refresh | BE đã có SDK mặc định và OAuth tùy cấu hình | Giữ sdk trong phạm vi tích hợp V1 này |
| Cấu trúc FE | Có đề xuất bốn file mới | Giữ callback/LoginForm hiện có nếu đáp ứng đúng hành vi |

**Mã EMAIL_ALREADY_EXISTS là quyết định contract V2**, chưa phải khẳng định BE đã sửa handler theo mã này. Cần sửa cả kiểm tra sớm lẫn handler UNIQUE email để FE nhận cùng cấu trúc khi có race.

Trong thời gian chuyển phiên bản, FE có thể nhận diện cả mã cũ và HTTP 409. Khi nghiệm thu V2, kiểm thử phải xác nhận code thống nhất tại Sync.

## 4. Flow liên thông

~~~mermaid
sequenceDiagram
    actor U as Người dùng
    participant FE as Frontend
    participant C as Cognito
    participant G as Google
    participant BE as Backend
    participant DB as PostgreSQL
    U->>FE: Tiếp tục với Google
    FE->>FE: Tạo state + verifier + challenge S256
    FE->>C: Điều hướng authorize với bốn scope
    C->>G: Xác thực Google
    G-->>C: Kết quả xác thực
    C-->>FE: /callback?code=...&state=...
    FE->>FE: Kiểm tra state và giao dịch
    FE->>BE: POST /api/auth/google
    BE->>C: Đổi code + verifier tại /oauth2/token
    C-->>BE: Bộ token Cognito
    BE->>BE: Verify access token và scope
    BE->>DB: Kiểm tra trạng thái user nếu đã tồn tại
    BE-->>FE: Token nếu hợp lệ
    FE->>FE: Giữ token tạm, chưa authenticated
    FE->>BE: POST /api/auth/sync bằng token tạm
    BE->>C: GetUser theo quy tắc transaction Sync
    BE->>DB: Kiểm tra email, tạo/cập nhật user
    BE-->>FE: UserResponse ACTIVE hoặc lỗi
    FE->>FE: Chỉ commit phiên nếu Sync thành công
~~~

HTTP 200 của /auth/google chỉ xác nhận đổi code và kiểm tra tương ứng đã thành công. Nó không có nghĩa PostgreSQL đã tạo user hoặc người dùng đã được vào ứng dụng.
