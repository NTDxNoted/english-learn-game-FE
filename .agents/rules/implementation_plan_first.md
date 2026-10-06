# Quy Tắc Bắt Buộc: Ưu Tiên Tham Chiếu Implementation Plan (Implementation-First Workflow)

Khi làm việc với các task lập trình trong Antigravity IDE:

1. **Đọc Implementation Plan (.md) luôn nhanh và đầy đủ hơn `git diff`**:
   - Trước mỗi issue / tính năng lớn, một kế hoạch triển khai chi tiết (`<feature>_implementation_plan.md`) luôn được phân tích và lưu trữ.
   - Tài liệu Implementation Plan (.md) cung cấp bức tranh toàn cảnh: giải pháp kiến trúc, công thức toán học, cấu trúc file và logic nghiệp vụ theo cấu trúc mạch lạc. Đọc file markdown này nhanh hơn, tiết kiệm token hơn và nắm trọn vẹn ngữ cảnh hơn nhiều so với việc phải dò từng dòng trong output của `git diff`.
   - **BẮT BUỘC**: Khi tiếp tục công việc (sau compaction hoặc chuyển phiên), báo cáo tiến độ, cập nhật tài liệu hoặc kiểm tra lại các tính năng đã làm, AI phải mở và đọc lại Implementation Plan artifact tương ứng trước tiên.

2. **Vai trò đúng của `git diff`**:
   - Vẫn được phép sử dụng `git diff` khi cần kiểm tra cụ thể từng dòng code đã sửa hoặc rà soát định dạng (formatting/linting) ngay trước khi commit.
   - Tuy nhiên, không dùng `git diff` làm phương thức chính để "tái khám phá" kiến trúc hay tìm hiểu lại những gì đã thực hiện.

3. **Đồng bộ hóa báo cáo từ Implementation Plan**:
   - Khi viết báo cáo Pull Request (như `PULL_REQUEST_NOTES.md`) hoặc cập nhật tài liệu issue (như `english-learning-game-issues-frontend.md`), AI phải trích xuất trực tiếp các giải pháp kỹ thuật, công thức toán học và sơ đồ từ Implementation Plan để nội dung báo cáo luôn sâu sắc, chuẩn xác và không bị thiếu sót.
