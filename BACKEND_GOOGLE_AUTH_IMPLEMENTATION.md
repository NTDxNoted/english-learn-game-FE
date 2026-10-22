# Tài Liệu Đặc Tả Kỹ Thuật (Backend Implementation Guide): Đăng Nhập Bằng Google OAuth2 (AWS Cognito)

**Dự án:** Alphabet Universe (`english-learn-game-BE`)  
**Module:** `auth`, `user`, `security`  
**Mục tiêu:** Bổ sung API đổi mã OAuth2 Authorization Code khi đăng nhập bằng Google (`POST /api/auth/google`) và hỗ trợ đồng bộ thông tin người dùng Google vào bảng `users` (`POST /api/auth/sync`).

---

## 1. Bối cảnh & Nguyên nhân cần cập nhật Backend

1. **Luồng đăng nhập Google trên Frontend:**
   - Người dùng bấm **"Tiếp tục với Google"** tại trang `/login`.
   - Frontend chuyển hướng tới AWS Cognito Hosted UI:
     ```text
     GET {aws.cognito.domain}/oauth2/authorize
       ?identity_provider=Google
       &client_id={aws.cognito.client-id}
       &response_type=code
       &scope=openid email profile
       &redirect_uri=http://localhost:5173/callback
     ```
   - Sau khi xác thực Google thành công, Cognito redirect về Frontend: `http://localhost:5173/callback?code=<AUTHORIZATION_CODE>`.
   - Frontend gửi `POST /api/auth/google` kèm `{ code, redirectUri }` lên Backend để đổi lấy bộ token (`accessToken`, `idToken`, `refreshToken`, `expiresIn`), sau đó gọi `POST /api/auth/sync` để đồng bộ user vào PostgreSQL.

2. **Tại sao cần sửa `CognitoUserAttributeServiceImpl` khi gọi `POST /api/auth/sync`?**
   - Trên AWS Cognito App Client của dự án, Google OAuth2 chỉ cấp 3 scope: `openid email profile` (không có scope `aws.cognito.signin.user.admin`).
   - Hiện tại `CognitoUserAttributeServiceImpl.getProfile(accessToken)` đang gọi AWS SDK `cognitoClient.getUser(...)`. Hàm `GetUser` của Cognito **bắt buộc** token phải có scope `aws.cognito.signin.user.admin`; nếu dùng token Google OAuth2 sẽ bị Cognito ném lỗi `NotAuthorizedException: Access Token does not have required scopes`.
   - Do đó, khi `cognitoClient.getUser(...)` ném `NotAuthorizedException` / `ForbiddenException`, Backend cần fallback sang gọi chuẩn OIDC **`GET {aws.cognito.domain}/oauth2/userInfo`** bằng `Bearer <accessToken>` để lấy `email` và `name`.

---

## 2. Danh sách các file cần thêm mới / chỉnh sửa

| STT | Hành động | Đường dẫn file | Mô tả ngắn |
|---|---|---|---|
| 1 | **Tạo mới** | `src/main/java/com/aws/alphabetuniverse/auth/dto/GoogleAuthRequest.java` | Request DTO nhận `code` và `redirectUri` từ Frontend |
| 2 | **Chỉnh sửa** | `src/main/java/com/aws/alphabetuniverse/security/config/SecurityConfig.java` | Cho phép `permitAll()` với endpoint `/api/auth/google` |
| 3 | **Chỉnh sửa** | `src/main/java/com/aws/alphabetuniverse/auth/service/AuthService.java` | Khai báo method `loginWithGoogle(GoogleAuthRequest request)` |
| 4 | **Chỉnh sửa** | `src/main/java/com/aws/alphabetuniverse/auth/controller/AuthController.java` | Thêm endpoint `POST /api/auth/google` |
| 5 | **Chỉnh sửa** | `src/main/java/com/aws/alphabetuniverse/auth/service/impl/AuthServiceImpl.java` | Implement `loginWithGoogle`: đổi `code` qua `/oauth2/token`, verify JWT và kiểm tra trạng thái user |
| 6 | **Chỉnh sửa** | `src/main/java/com/aws/alphabetuniverse/user/service/impl/CognitoUserAttributeServiceImpl.java` | Thêm fallback đọc `/oauth2/userInfo` cho token Google và fallback `displayName` từ `email` |

---

## 3. Chi tiết triển khai từng file

### 3.1. Tạo mới `GoogleAuthRequest.java`
**File:** `src/main/java/com/aws/alphabetuniverse/auth/dto/GoogleAuthRequest.java`

```java
package com.aws.alphabetuniverse.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
        @NotBlank(message = "Authorization code is required")
        String code,

        @NotBlank(message = "Redirect URI is required")
        String redirectUri
) {
}
```

---

### 3.2. Cập nhật `SecurityConfig.java`
**File:** `src/main/java/com/aws/alphabetuniverse/security/config/SecurityConfig.java`

Thêm `"/api/auth/google"` vào danh sách `.permitAll()` của các public auth endpoints:

```java
                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/confirm-register",
                                "/api/auth/login",
                                "/api/auth/google",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                "/api/auth/logout",
                                "/api/auth/resend-confirmation"
                        ).permitAll()
```

---

### 3.3. Cập nhật `AuthService.java`
**File:** `src/main/java/com/aws/alphabetuniverse/auth/service/AuthService.java`

Bổ sung chữ ký hàm `loginWithGoogle`:

```java
public interface AuthService {
    public UserResponse syncUser(Jwt jwt);
    public LogoutResponse logout();
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request);
    public ResetPasswordResponse resetPassword(ResetPasswordRequest request);
    public RegisterResponse register(RegisterRequest request);
    public ConfirmRegisterResponse confirmRegister(ConfirmRegisterRequest request);
    public LoginResponse login(LoginRequest request);
    public LoginResponse loginWithGoogle(GoogleAuthRequest request);
    public RefreshTokenResponse refreshToken(RefreshTokenRequest request);
    public ResendConfirmationResponse resendConfirmationCode(String email);
}
```

---

### 3.4. Cập nhật `AuthController.java`
**File:** `src/main/java/com/aws/alphabetuniverse/auth/controller/AuthController.java`

Thêm endpoint `POST /api/auth/google`:

```java
    @PostMapping("/google")
    public LoginResponse loginWithGoogle(
            @Valid @RequestBody GoogleAuthRequest request
    ) {
        return authService.loginWithGoogle(request);
    }
```

---

### 3.5. Cập nhật `AuthServiceImpl.java`
**File:** `src/main/java/com/aws/alphabetuniverse/auth/service/impl/AuthServiceImpl.java`

1. **Khai báo thêm `ObjectMapper` và `HttpClient` trong class:**
```java
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
```

2. **Implement method `loginWithGoogle(GoogleAuthRequest request)`:**
```java
    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LoginResponse loginWithGoogle(GoogleAuthRequest request) {
        if (request == null
                || request.code() == null
                || request.code().isBlank()
                || request.redirectUri() == null
                || request.redirectUri().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Authorization code and redirect URI are required"
            );
        }

        String tokenEndpoint = cognitoDomain.replaceAll("/+$", "") + "/oauth2/token";
        String formBody = "grant_type=authorization_code"
                + "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&code=" + URLEncoder.encode(request.code().trim(), StandardCharsets.UTF_8)
                + "&redirect_uri=" + URLEncoder.encode(request.redirectUri().trim(), StandardCharsets.UTF_8);

        try {
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(tokenEndpoint))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    httpRequest,
                    HttpResponse.BodyHandlers.ofString()
            );

            JsonNode json = response.body() != null && !response.body().isBlank()
                    ? objectMapper.readTree(response.body())
                    : objectMapper.createObjectNode();

            if (response.statusCode() != 200) {
                String errorDesc = json.path("error_description").asText(
                        json.path("error").asText("Google OAuth code exchange failed")
                );
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, errorDesc);
            }

            String accessToken = json.path("access_token").asText(null);
            String idToken = json.path("id_token").asText(null);
            String refreshToken = json.path("refresh_token").asText(null);
            int expiresIn = json.path("expires_in").asInt(3600);

            if (accessToken == null || accessToken.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Cognito returned an invalid OAuth token response"
                );
            }

            Jwt authenticatedJwt;
            try {
                authenticatedJwt = jwtDecoder.decode(accessToken);
            } catch (JwtException ex) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Cognito returned an invalid access token",
                        ex
                );
            }

            if (authenticatedJwt == null
                    || authenticatedJwt.getSubject() == null
                    || authenticatedJwt.getSubject().isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Cognito returned an invalid user identity"
                );
            }

            // Nếu tài khoản đã tồn tại trong DB nhưng đang bị khóa (BLOCKED) thì chặn ngay
            userRepository.findByCognitoSubForUpdate(authenticatedJwt.getSubject())
                    .ifPresent(this::assertAccountActive);

            return LoginResponse.builder()
                    .accessToken(accessToken)
                    .idToken(idToken)
                    .refreshToken(refreshToken)
                    .expiresIn(expiresIn)
                    .build();
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to exchange Google OAuth code with Cognito", ex);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Unable to complete Google sign-in with Cognito",
                    ex
            );
        }
    }
```

---

### 3.6. Cập nhật `CognitoUserAttributeServiceImpl.java`
**File:** `src/main/java/com/aws/alphabetuniverse/user/service/impl/CognitoUserAttributeServiceImpl.java`

Bổ sung `@Value("${aws.cognito.domain}")` và hàm fallback `fetchOAuthUserInfo(String accessToken)` khi `cognitoClient.getUser(...)` báo `NotAuthorizedException` hoặc `ForbiddenException`:

```java
    private final CognitoIdentityProviderClient cognitoClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${aws.cognito.domain}")
    private String cognitoDomain;

    @Override
    public CognitoUserProfile getProfile(String accessToken) {
        validateAccessToken(accessToken);
        try {
            GetUserResponse response = cognitoClient.getUser(
                    GetUserRequest.builder().accessToken(accessToken).build());
            String email = null;
            String displayName = null;
            for (AttributeType attribute : response.userAttributes()) {
                if ("email".equals(attribute.name())) {
                    email = attribute.value();
                } else if ("name".equals(attribute.name())) {
                    displayName = attribute.value();
                }
            }
            if ((displayName == null || displayName.isBlank()) && email != null && email.contains("@")) {
                displayName = email.substring(0, email.indexOf('@'));
            }
            return new CognitoUserProfile(email, displayName);
        } catch (CognitoIdentityProviderException ex) {
            // Token từ Google OAuth2 (Hosted UI) chỉ có scope openid/email/profile
            // nên GetUser sẽ trả NotAuthorizedException; đọc qua /oauth2/userInfo.
            if (ex instanceof NotAuthorizedException || ex instanceof ForbiddenException) {
                CognitoUserProfile oauthProfile = fetchOAuthUserInfo(accessToken);
                if (oauthProfile != null) {
                    return oauthProfile;
                }
            }
            throw translateCognitoException(ex);
        } catch (SdkClientException ex) {
            throw unavailable("Unable to read Cognito profile", ex);
        }
    }

    private CognitoUserProfile fetchOAuthUserInfo(String accessToken) {
        if (cognitoDomain == null || cognitoDomain.isBlank()) {
            return null;
        }
        try {
            String endpoint = cognitoDomain.replaceAll("/+$", "") + "/oauth2/userInfo";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(10))
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200 || response.body() == null || response.body().isBlank()) {
                return null;
            }
            JsonNode json = objectMapper.readTree(response.body());
            String email = json.path("email").asText(null);
            String displayName = json.path("name").asText(null);
            if (displayName == null || displayName.isBlank()) {
                displayName = json.path("given_name").asText(null);
            }
            if ((displayName == null || displayName.isBlank()) && email != null && email.contains("@")) {
                displayName = email.substring(0, email.indexOf('@'));
            }
            return new CognitoUserProfile(email, displayName);
        } catch (Exception e) {
            log.warn("Failed to read Cognito /oauth2/userInfo fallback: {}", e.getMessage());
            return null;
        }
    }
```

---

## 4. Cấu hình Biến môi trường cần đảm bảo (`.env` / `application.properties`)

Đảm bảo file `.env` của Backend có đủ 3 biến Cognito:
```properties
AWS_COGNITO_CLIENT_ID=2ggkvcbqmfdbni8n7fe1g83sqm
AWS_COGNITO_DOMAIN=https://us-east-1i2fjaym0t.auth.us-east-1.amazoncognito.com
FRONTEND_URL=http://localhost:5173
```

---

## 5. Checklist Kiểm thử sau khi code xong (Definition of Done)

- [ ] Project compile thành công (`./mvnw test-compile`).
- [ ] `POST /api/auth/google` không yêu cầu header `Authorization` (đã mở trong `SecurityConfig`).
- [ ] Khi truyền `code` và `redirectUri` (`http://localhost:5173/callback`) hợp lệ từ Google OAuth2, `POST /api/auth/google` trả về `200 OK` kèm `accessToken`, `idToken`, `refreshToken`, `expiresIn`.
- [ ] Gọi tiếp `POST /api/auth/sync` với header `Authorization: Bearer <accessToken>` vừa nhận được:
  - Tạo mới (hoặc cập nhật) bản ghi trong bảng `users` với `role = "learner"`, `status = "ACTIVE"`.
  - Nếu tài khoản Google không có trường `name`, `displayName` tự động lấy phần trước `@` của email (không bị lỗi `NULL` constraint).
- [ ] Nếu tài khoản trong DB đang có `status = "BLOCKED"`, cả `POST /api/auth/google` và `POST /api/auth/sync` đều chặn và trả về lỗi `403 ACCOUNT_BLOCKED`.

