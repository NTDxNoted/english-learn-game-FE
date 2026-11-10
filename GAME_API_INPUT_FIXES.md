# Sửa dữ liệu game/streak và chuyển điều khiển

## Thay đổi

- Header gọi `GET /api/users/me/streak`, không đọc `currentStreak` từ `/users/me` (DTO này không có field đó).
- Tiến trình dùng thống kê thật, lịch sử đọc đúng `content`, `totalElements`, `isWon`, `endedAt`. Lỗi API có thử lại và không bị thay bằng số 0/100% giả.
- Danh sách chủ đề không còn dùng các ID mẫu khi API lỗi; tiến trình ghép theo `topicId` từ `/users/me/progress`.
- Tạo phiên xong sẽ lấy snapshot qua API active để nhận cấu hình lượt thử của phiên. Resume dùng đúng câu hiện tại, điểm và lượt còn lại.
- Bỏ kết quả thắng/điểm/streak cố định và nhánh tự chấm đúng theo độ dài từ khi API lỗi. POST attempts là nơi BE chấm và kết thúc phiên; FE dùng `sessionCompleted`, `sessionWon`, `totalScore`, `nextVocabularyId`.
- Nếu POST mất kết nối, FE yêu cầu đọc lại trạng thái trước khi gửi lượt mới. Khi phiên đã kết thúc, đọc game history; không tự tạo phiên khác trong lúc khôi phục.
- Chơi lại tạo phiên thật trên BE. Lỗi CHECKPOINT không còn tự đổi sang FREE_PLAY.
- Video/canvas giữ nguyên node khi chuyển sang chuột hoặc thu nhỏ preview; có trạng thái đang bật camera và thông báo lỗi để thử lại.
- Hủy startup/camera/worker khi đổi chế độ, kết thúc hoặc rời màn chơi. Bỏ phụ thuộc API `/game-configs/public` không tồn tại trong BE hiện tại.
- Giữ phát MP3 từ `audioUrl` đúng vocabulary ID, bao gồm resume và REVIEW.

## Quy tắc BE cần lưu ý

FREE_PLAY và REVIEW không cộng điểm checkpoint hoặc tăng streak. BE chỉ tăng streak khi thắng CHECKPOINT đủ 5 câu và cấu hình phiên cho phép. FE hiển thị giá trị BE trả về; không tự cộng streak theo số lần thắng. CHECKPOINT yêu cầu đã học đủ nhóm từ, REVIEW yêu cầu mở khóa; lỗi điều kiện sẽ được hiển thị.

## Kiểm tra

Chạy `npm test`, `npm run build`, `npm run lint` tại thư mục FE. Regression test dùng API/controller giả lập để kiểm tra kết quả server, mất kết nối, resume, gửi trùng và đổi chế độ. Chưa kiểm tra camera vật lý hoặc tài khoản thật end-to-end. Không có thay đổi BE trong đợt sửa này và không khởi động dev server.

Kiểm tra thực tế với server do bạn chạy: xem streak ở Header/Trang tiến trình; chọn chế độ rồi vào một chủ đề; chuyển chuột → webcam → chuột; thu nhỏ rồi chuyển lại; hoàn tất một phiên và so kết quả với API; thử chơi lại. Nếu camera bị từ chối, cho phép camera cho localhost trong trình duyệt rồi nhấn thử lại.
