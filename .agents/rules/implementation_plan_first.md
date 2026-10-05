# Quy Tắc Bắt Buộc: Ưu Tiên Tham Chiếu Implementation Plan (Implementation-First Workflow)

Khi làm việc với các task lập trình trong Antigravity IDE:

1. **Implementation Plan là "Single Source of Truth" (Căn cứ kỹ thuật duy nhất)**:
   - Trước mỗi issue / tính năng lớn, kế hoạch triển khai chi tiết (`<feature>_implementation_plan.md`) luôn được lập ra trước với đầy đủ kiến trúc, phân tích mã nguồn tham khảo, cấu trúc thư mục và logic nghiệp vụ.
   - Khi tiếp tục công việc (sau compaction hoặc qua phiên mới), báo cáo tiến độ, cập nhật tài liệu hoặc kiểm tra thay đổi: **AI BẮT BUỘC phải đọc lại Implementation Plan artifact tương ứng trước tiên**.

2. **Cấm lạm dụng `git diff` để mò mẫm code**:
   - KHÔNG ĐƯỢC chạy hàng loạt lệnh `git diff` rời rạc để suy đoán hoặc tái khám phá xem mình đã viết gì, vì toàn bộ giải pháp kiến trúc, quyết định kỹ thuật và danh sách file đã nằm đầy đủ trong Implementation Plan.
   - Chỉ dùng `git diff` ở bước cuối cùng với mục đích duy nhất: kiểm tra lại định dạng trước khi commit.

3. **Đồng bộ hóa báo cáo từ Implementation Plan**:
   - Khi làm báo cáo Pull Request (như `PULL_REQUEST_NOTES.md`) hoặc cập nhật tài liệu issue (như `english-learning-game-issues-frontend.md`), AI phải lấy trực tiếp các giải pháp kỹ thuật, công thức toán học, cấu trúc file từ Implementation Plan đã lập để cập nhật vào tài liệu, tránh báo cáo hời hợt hoặc thiếu thông tin.
