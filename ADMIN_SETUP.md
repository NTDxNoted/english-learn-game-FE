# Signly Admin V1

## Chạy local

```powershell
npm ci
npm run dev
```

FE: `http://localhost:3000`. Đăng nhập bằng tài khoản có User local
`role=admin`, `status=ACTIVE`, rồi mở `/admin/topics` hoặc chọn menu **Quản trị**.
FE không có thao tác đổi role hoặc tự tạo Admin. Dùng tài khoản test do người
quản lý backend chuẩn bị; không ghi password/token vào repo.

File `.env`:

```dotenv
VITE_API_BASE_URL=/api
VITE_BACKEND_URL=http://localhost:8080
```

Vite proxy `/api` sang backend. Restart Vite sau khi đổi `.env` hoặc config.
Production cần reverse proxy `/api` hoặc build với base URL backend tương ứng.
Không đặt AWS/Merriam-Webster secrets trong biến VITE_.

## Các màn đã triển khai

- `/admin/topics`: danh sách đầy đủ, tìm/lọc local, thêm/sửa ảnh, ẩn/khôi phục.
- `/admin/topics/:topicId/vocabularies`: danh sách, thêm/sửa/ẩn từ, IPA preview,
  nghe MP3 từ S3, lấy lại URL khi lỗi, tạo âm thanh còn thiếu và báo lỗi từng ID.
- `/admin/game-configs/global`: bốn key hỗ trợ, configValue kiểu String.
- `/admin/topics/:topicId/game-configs`: override, bật/tắt áp dụng và reset.
- `/admin/users`: lọc/phân trang server, khóa/mở Learner, refetch và retry
  đúng status sau lỗi đồng bộ Cognito.
- `/admin/game-configs/audits`: lọc/phân trang, chi tiết JSON trước/sau,
  lọc theo operationId và thời gian UTC+7.

21 endpoint Admin được kết nối qua `src/features/admin/api/adminApi.ts`.
Các response BE vẫn là DTO/array/page trực tiếp; envelope `ApiResponse` là
adapter nội bộ của HTTP client FE.

## Setup backend cần kiểm tra

- CORS có origin chính xác của FE; mặc định local 3000/5173.
- Đã bổ sung ở backend workspace: `spring.servlet.multipart.max-file-size=2MB`,
  `spring.servlet.multipart.max-request-size=3MB`. Restart BE để áp dụng.
  `application.properties` hiện gitignored; cần mang cấu hình này sang môi trường khác.
- DB có đủ bốn global config và trigger audit/upsert constraints đã triển khai.
- SDK credentials và quyền IAM: Cognito AdminDisableUser/AdminEnableUser trên
  đúng pool, Polly synthesize, S3 object theo service; bucket/region/key từ điển
  cấu hình ở BE. FE không gọi AWS trực tiếp.
- Chuẩn bị dữ liệu test: Admin ACTIVE, Learner ACTIVE/BLOCKED, Topic/từ
  active/inactive, audio null, một trường hợp lỗi dịch vụ ngoài.
- User date chưa có offset: bảng hiển thị nguyên giá trị BE; audit Instant được
  chuyển sang giờ Việt Nam. Chốt lại timezone của dữ liệu User cũ trước khi đổi cách hiển thị.

## Lưu ý nghiệp vụ

- Ẩn Topic/từ vựng là soft delete. Chưa có restore Vocabulary, clear mô tả Topic,
  đổi role User, upload MP3 hoặc đổi thứ tự thủ công.
- Tắt override nghĩa là kế thừa Global. Muốn tắt một tính năng riêng ở Topic:
  giá trị `"false"`, override active=true.
- Khóa User lỗi 502/503 vẫn có thể đã BLOCKED trong DB. UI tải lại danh sách và
  cho retry cùng status yêu cầu; không tự đảo về ACTIVE. Không có sync-state
  AWS bền vững trong GET User; cảnh báo chỉ ghi nhớ lỗi của thao tác trên màn hiện tại.
- Backfill 200 có thể thành công một phần. Timeout không chứng minh BE đã dừng.
  Tải lại danh sách trước khi gửi lại; không có tiến độ/job ID để dựng phần trăm.
- Audio signed URL không lưu vào localStorage; phát lỗi sẽ tải lại danh sách
  đúng Topic, lấy URL cùng vocabulary ID và retry một lần.
- Request create/update Vocabulary có timeout 60 giây; backfill 180 giây;
  User status 30 giây. Không tự retry mutation khi kết quả chưa xác định.

## Kiểm tra

```powershell
npm run build
npm test
npm run lint
```

Nếu chạy bản staging dưới `backend/target`, dùng
`npx oxlint --no-ignore src vite.config.ts` vì gitignore của repo cha bỏ qua target.

Test tự động dùng mock API/DOM/Audio, gồm guard/auth, đồng thời refresh,
multipart/204, validation, config, Cognito partial failure, audit và audio.
Chưa thay thế kiểm tra tích hợp 21 endpoint trên DB/AWS/S3 thật. Không dùng
dữ liệu production để kiểm tra khóa/ẩn/reset.
