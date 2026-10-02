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
