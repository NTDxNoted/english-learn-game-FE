# Quy Chuẩn Bắt Buộc Về Bảng Màu & Giao Diện (Signly Design System)

Bất kỳ AI hoặc lập trình viên nào khi làm các issue tiếp theo (AUTH-01..04, TOPIC-01, VOCAB-01, AUDIO-01, GAME-01..05, PROGRESS-01, LEADERBOARD-01, ADMIN-01..04) **BẮT BUỘC** phải tuân theo các quy tắc sau:

1. **Bảng màu chuẩn bất biến**:
   - Primary: `#322c82` (Deep Royal Indigo) cho tiêu đề, mặt nút 3D, viền chính, logo.
   - Primary Shadow (3D): `#211c61` cho `box-shadow: 0 6px 0 #211c61`.
   - Accent: `#ff7b62` (Coral Orange) cho điểm nhấn, badge active, flame streak.
   - Canvas: `#fbfaf7` (Warm Cream) cho nền trang.
   - Pastel Palette:
     - Yellow: `#fff0c2` (text: `#8e641d`)
     - Lavender: `#ebe9ff` (text: `#322c82`, shadow: `#dedafa`)
     - Mint: `#d8f1e7` (text: `#19634b`)
     - Peach: `#ffdcd4` / `#ffe4d8` (text: `#9c3826`)
     - Blue: `#dce9ff` (text: `#225399`)
     - Pink: `#ffdce8` (text: `#9b2b53`)
2. **Cấm**:
   - CẤM sử dụng màu tối đen thuần `#000000`, màu tím neon `#6366f1` hay các màu ngẫu nhiên khác không có trong bảng màu.
   - Mọi mã màu phải tham chiếu từ `src/theme/colors.ts` hoặc CSS variables trong `src/index.css`.
3. **Phong cách thành phần (Component Style)**:
   - Các nút bấm hành động chính (Primary Action) phải dùng class `.btn-3d` (nút bấm nổi 3D đặc trưng).
   - Card bài học và chủ đề phải có bo góc lớn (`rounded-[24px]` hoặc `var(--radius-xl)`), nền pastel hoặc trắng sạch, hiệu ứng hover nhấc nhẹ (`hover:-translate-y-2`).


---

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
