# Signly Design System — Hướng Dẫn Quy Chuẩn Giao Diện & Bảng Màu

Tài liệu này xác lập **Quy chuẩn Thiết kế và Bảng màu chuẩn mực (Design Tokens)** của dự án **English Learning Game (Signly)**.

> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC CHO MỌI LẦN CODE TIẾP THEO (DÀNH CHO AI & LẬP TRÌNH VIÊN):**
> Khi thực hiện các issue tiếp theo (`AUTH-01..04`, `TOPIC-01`, `VOCAB-01`, `AUDIO-01`, `GAME-01..05`, `PROGRESS-01`, `LEADERBOARD-01`, `ADMIN-01..04`), **TUYỆT ĐỐI KHÔNG SỬ DỤNG MÃ MÀU NÀO KHÁC** ngoài bảng màu bên dưới. Hãy dùng trực tiếp CSS Variables hoặc hằng số trong `src/theme/colors.ts`.

---

## 1. Bảng màu chuẩn (Palette Tokens)

### 1.1. Màu Thương hiệu (Brand Colors)
| Vai trò | Tên biến CSS | Mã màu HEX | Sử dụng cho |
|---|---|---|---|
| **Primary** | `--color-brand-primary` | `#322c82` | Tiêu đề H1-H6, mặt nút bấm 3D, nền logo, chữ thương hiệu "Sign" |
| **Primary Shadow (3D)** | `--color-brand-shadow` | `#211c61` | Đổ bóng phía dưới của nút bấm 3D (`box-shadow: 0 6px 0 #211c61`) |
| **Accent (Coral)** | `--color-brand-accent` | `#ff7b62` | Điểm nhấn chữ ("ly", "Nhớ bằng tim"), ngọn lửa Streak (`Flame`), eyebrow text |
| **Accent Hover** | `--color-brand-accent-hover` | `#f06247` | Trạng thái hover của các chi tiết accent |

### 1.2. Màu Nền & Bề mặt (Canvas & Surface)
| Vai trò | Tên biến CSS | Mã màu HEX | Sử dụng cho |
|---|---|---|---|
| **Canvas** | `--color-bg-canvas` | `#fbfaf7` | Nền toàn bộ trang web (Warm Cream đặc trưng của Signly) |
| **White Card** | `--color-bg-white` | `#ffffff` | Thẻ nội dung nổi, Form xác thực, Header pill |

### 1.3. Màu Chữ (Typography Colors)
| Vai trò | Tên biến CSS | Mã màu HEX | Sử dụng cho |
|---|---|---|---|
| **Heading** | `--color-text-primary` | `#322c82` | Tiêu đề trang, tên chủ đề, tiêu đề thẻ |
| **Body Dark** | `--color-text-dark` | `#262626` | Chữ đọc thông thường |
| **Body Soft** | `--color-text-body` | `#6f6b7c` | Đoạn văn mô tả, hướng dẫn |
| **Body In Card** | `--color-text-body-dark` | `#625e73` | Chữ mô tả nằm trong các thẻ nền pastel |
| **Muted** | `--color-text-muted` | `#8c8997` | Chữ phụ, số thứ tự (01, 02), icon nhạt |
| **Subtle** | `--color-text-subtle` | `#817c8c` | Tên tiếng Anh dưới tiêu đề (Family, Food...) |

### 1.4. Bảng màu Thẻ Pastel (Pastel Card Palettes)
Dùng cho các thẻ cấp độ, thẻ chủ đề học từ vựng và huy hiệu:

| Nhóm Pastel | Nền Card | Chữ / Icon | Đổ bóng / Viền | Ứng dụng |
|---|---|---|---|---|
| **Yellow** | `#fff0c2` | `#8e641d` | `#ffe293` | Cấp độ Dễ, Badge "Học bằng đôi tay" |
| **Lavender** | `#ebe9ff` | `#322c82` | `#dedafa` / `#b9c8ff` | Khung minh họa MediaPipe, Chủ đề Gia đình |
| **Mint** | `#d8f1e7` | `#19634b` | `#a3e4cb` | Cấp độ Trung bình |
| **Peach** | `#ffdcd4` / `#ffe4d8` | `#9c3826` | `#ffb7a7` | Cấp độ Khó, Chủ đề Đồ ăn |
| **Blue** | `#dce9ff` / `#d8e7ff` | `#225399` | `#b2d1ff` | Chủ đề Thể thao |
| **Pink** | `#ffdce8` | `#9b2b53` | `#ffb8d1` | Chủ đề Cảm xúc |

---

## 2. Typography

- **Phông tiêu đề (Display)**: `'Plus Jakarta Sans', sans-serif` (đậm nét `font-weight: 800`, tracking âm nhẹ).
- **Phông văn bản (Body)**: `'DM Sans', 'Plus Jakarta Sans', sans-serif` (dễ đọc, thân thiện).

---

## 3. UI Components Chuẩn

### 3.1. Nút bấm 3D Đặc trưng (`.btn-3d`)
```html
<button className="btn-3d">
  <Play className="fill-current" />
  <span>Bắt đầu học</span>
</button>
```
*Đặc tính:*
- Nền `#322c82`, chữ trắng, bo góc `rounded-2xl` (`1rem`).
- Đổ bóng 3D: `box-shadow: 0 6px 0 #211c61`.
- Khi hover: nhấc lên `transform: translateY(-2px); box-shadow: 0 8px 0 #211c61`.
- Khi active (click): lún xuống `transform: translateY(4px); box-shadow: 0 2px 0 #211c61`.

### 3.2. Khung Minh họa Cử chỉ Tay (Hero Illustration Card)
- Khung lớn bo góc `rounded-[46px]`, nền `#ebe9ff`, bóng `0 20px 0 #dedafa`.
- Vòng tròn trung tâm `#fff0c2` chứa icon bàn tay `<Hand />`.
- Hai nhãn nổi xoay nghiêng: `Hello!` (`-rotate-6`) và `Nice to meet you` (`rotate-6`, chữ `#ff7b62`).

### 3.3. Các Thẻ Chủ đề & Cấp độ (`.card-choice`, `.card-topic`, `.card-mode`)
- Bo góc mềm mại `rounded-[24px]` hoặc `rounded-[28px]`.
- Nền thuộc bảng pastel Yellow, Lavender, Mint, Peach, Blue, Pink.
- Hiệu ứng hover nhấc nổi mượt mà `transform: translateY(-6px)`.

---

## 4. Cách sử dụng trong mã nguồn TypeScript

```typescript
import { THEME_COLORS } from '@/theme/colors';

// Ví dụ: lấy mã màu pastel vàng chuẩn
const yellowBg = THEME_COLORS.pastel.yellow.bg; // #fff0c2
const primary = THEME_COLORS.brand.primary;      // #322c82
```
Hoặc dùng CSS class đã định nghĩa sẵn trong `src/index.css`:
- `.bg-pastel-yellow`, `.bg-pastel-lavender`, `.bg-pastel-mint`
- `.bg-pastel-peach`, `.bg-pastel-blue`, `.bg-pastel-pink`
- `.btn-3d`, `.btn-outline`, `.btn-ghost`
