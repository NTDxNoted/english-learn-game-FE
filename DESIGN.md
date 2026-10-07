# DESIGN.md — Signly Design System (English Learning Game V1)
> Chuẩn hóa theo Google Labs DESIGN.md, Impeccable (Anti-AI-Slop) & Hallmark 57-Point Craft.

## 1. Nhận diện & Triết lý Thiết kế (Brand Aesthetic)
- **Phong cách chủ đạo:** Playful Tactile 3D EdTech (Học tập tương tác xúc giác 3D, ấm áp, rõ ràng, truyền cảm hứng).
- **Phân loại chế độ bề mặt (Impeccable Surface Modes):**
  - **Experience & Play (`/game/...`, `/topics`):** Khối nổi 3D, thẻ Pastel ấm, phản hồi cử chỉ tay/chuột tức thì, ưu tiên không gian thao tác thoáng đãng.
  - **Read & Learn (`/topics/:topicId`, `/progress`, `/leaderboard`):** Phân cấp chữ rõ ràng (Word > IPA > Meaning), dễ quét mắt, tôn vinh thành tích (Streak, Best Score).
  - **Operate (`/admin/...`):** Bảng dữ liệu mật độ cao vừa phải, bộ lọc rõ ràng, thao tác CRUD có xác nhận an toàn, số liệu thẳng hàng (`tabular-nums`).

## 2. Hệ thống Bảng màu (Signly Color Tokens)
> **QUY TẮC CẤM (Impeccable Rule):** Tuyệt đối KHÔNG dùng màu đen thuần (`#000000`), xám thuần (`#808080`) hay trắng chói làm nền chính. Mọi màu trung tính phải pha sắc ấm (Warm Tint) hoặc sắc tím Indigo (Indigo Tint).

### 2.1. Nền & Bề mặt (Backgrounds & Surfaces)
- `--color-bg-canvas`: `#fbfaf7` (Canvas Warm Cream — Nền tổng thể toàn ứng dụng)
- `--color-bg-surface`: `#ffffff` (Bề mặt thẻ trắng nổi trên nền kem)
- `--color-bg-elevated`: `#f4f2ec` (Vùng đệm, ô trống chưa điền, thanh công cụ phụ)

### 2.2. Thương hiệu & Nhấn (Brand & Accents)
- `--color-brand-primary`: `#322c82` (Royal Indigo — Màu chủ đạo, tiêu đề, viền chính, chữ đậm)
- `--color-brand-shadow`: `#1e1a52` (Indigo Deep Shadow — Đổ bóng cứng 3D cho nút và khối chữ)
- `--color-brand-accent`: `#ff7b62` (Coral Pink — Nút CTA chính "Chơi ngay", "Xác nhận", điểm nhấn Streak)
- `--color-brand-accent-shadow`: `#d95840` (Đổ bóng cứng 3D cho nút Coral Pink)

### 2.3. Bảng màu Pastel Chủ đề & Trạng thái (Pastel Palette)
- **Pastel Yellow (Chú ý / Hạng 1 / Sao):** Nền `#fff0c2` · Viền `#e6cf8b` · Chữ `#7a5c00`
- **Pastel Mint (Hoàn thành / Đúng / Hạng 2):** Nền `#d8f1e7` · Viền `#9fd6c0` · Chữ `#19634b`
- **Pastel Coral (Cảnh báo / Sai / Streak):** Nền `#ffdcd4` · Viền `#f5b1a2` · Chữ `#8c2d19`
- **Pastel Lavender (Thông tin / IPA / Hạng 3):** Nền `#ebe9ff` · Viền `#c5bfff` · Chữ `#322c82`

### 2.4. Màu Găng tay Cử chỉ Ảo (Virtual Glove Canvas Overlay)
- **Bàn tay 1:** Vải `#eef2fa` · Đường may `#322c82` · Đệm nhấn `#ff7b62` · Hào quang gắp `#ffdcd4`
- **Bàn tay 2:** Vải `#d8f1e7` · Đường may `#19634b` · Đệm nhấn `#10b981` · Hào quang gắp `#a3e4cb`

## 3. Typography & Quy chuẩn Hiển thị Số
- **Tiêu đề & Khối chữ cái (`LetterTile`):** Font sans-serif bo tròn thân thiện (Plus Jakarta Sans / Nunito / Fredoka), `font-weight: 700–800`, `letter-spacing: -0.02em`.
- **Phiên âm quốc tế (`IPA`):** Bắt buộc dùng font hỗ trợ đầy đủ ký tự ngữ âm (`system-ui`, `Noto Sans`, `Inter`), đặt trong badge hoặc màu tím dịu (`#5a5499`).
- **Số liệu (Điểm, Streak, FPS, Thứ hạng, Đếm ngược OTP):** Bắt buộc bật `font-variant-numeric: tabular-nums` để chữ số không bị nhảy ngang khi thay đổi theo thời gian thực.

## 4. Độ sâu 3D, Bo góc & Khoảng cách (Elevation & Geometry)
- **Hiệu ứng Khối 3D Đặc trưng (Tactile 3D Press):**
  - Trạng thái mặc định (`default`): `border: 2px solid #322c82; box-shadow: 0 6px 0 var(--color-brand-shadow); transform: translateY(0);`
  - Trạng thái di chuột (`hover`): `transform: translateY(-2px); box-shadow: 0 8px 0 var(--color-brand-shadow);`
  - Trạng thái nhấn/gắp (`active` / `grabbed`): `transform: translateY(4px); box-shadow: 0 2px 0 var(--color-brand-shadow);`
- **Quy tắc Bo góc Đồng tâm (Concentric Border Radius):**
  - Nếu thẻ ngoài bo góc `R_outer = 24px` và có `padding = 16px`, thì phần tử con bên trong phải có `R_inner = R_outer - padding = 8px` (hoặc tối thiểu `12px` hài hòa).
- **Lưới khoảng cách (8pt Grid):** Mọi `gap`, `padding`, `margin` chỉ dùng bội số của `4px` / `8px` (`4, 8, 12, 16, 24, 32, 48px`). 