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

---

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
