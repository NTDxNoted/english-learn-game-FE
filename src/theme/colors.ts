/**
 * Signly Design System - Color Tokens & Theme Standards
 * BẢNG MÀU CHUẨN CỦA DỰ ÁN ENGLISH LEARNING GAME (SIGNLY)
 * 
 * QUY TẮC BẮT BUỘC CHO MỌI MODULE & AI LẬP TRÌNH:
 * Tuyệt đối KHÔNG tự ý sử dụng các mã màu khác ngoài bảng mã này.
 * Khi code tính năng mới, hãy sử dụng các biến CSS hoặc hằng số được định nghĩa tại đây.
 */

export const THEME_COLORS = {
  // 1. Màu thương hiệu chủ đạo (Brand Primary & Accents)
  brand: {
    primary: '#322c82',       // Tím than đậm (Deep Royal Indigo) - Màu chủ đạo các tiêu đề, nút chính, logo
    shadow: '#211c61',        // Màu bóng 3D của nút bấm (3D Button Bottom Shadow)
    accent: '#ff7b62',        // Cam san hô tươi (Coral Orange) - Điểm nhấn, logo "ly", chuỗi streak flame
    accentHover: '#f06247',   // Cam san hô đậm hơn khi hover
  },

  // 2. Màu nền giao diện (Backgrounds)
  background: {
    canvas: '#fbfaf7',        // Màu nền kem ấm áp (Warm Cream) của toàn bộ ứng dụng
    white: '#ffffff',         // Trắng tinh khiết cho các thẻ bề mặt
    whiteAlpha80: 'rgba(255, 255, 255, 0.8)',
    whiteAlpha75: 'rgba(255, 255, 255, 0.75)',
  },

  // 3. Màu chữ & Văn bản (Typography)
  text: {
    primary: '#322c82',       // Chữ tiêu đề lớn, brand header
    dark: '#262626',          // Chữ đen mềm mặc định
    body: '#6f6b7c',          // Chữ mô tả, nội dung bài học
    bodyDark: '#625e73',      // Chữ mô tả trong card pastel
    muted: '#8c8997',         // Chữ phụ, ghi chú, icon nhạt
    subtle: '#817c8c',        // Chữ phụ cấp 2 (ví dụ từ tiếng Anh dưới tiêu đề)
  },

  // 4. Bảng màu thẻ Pastel (Pastel Palette for Levels, Topics & Badges)
  pastel: {
    yellow: {
      bg: '#fff0c2',          // Vàng ấm pastel (Dễ, badge 'Học bằng đôi tay')
      text: '#8e641d',
      border: '#ffe293',
      bubble: '#ffe293',
    },
    lavender: {
      bg: '#ebe9ff',          // Tím oải hương pastel (Khung vẽ minh họa tay, chủ đề Gia đình)
      text: '#322c82',
      shadow: '#dedafa',
      border: '#b9c8ff',
    },
    mint: {
      bg: '#d8f1e7',          // Xanh bạc hà pastel (Trung bình)
      text: '#19634b',
      border: '#a3e4cb',
    },
    peach: {
      bg: '#ffdcd4',          // Cam đào pastel (Khó, chủ đề Đồ ăn #ffe4d8)
      bgLight: '#ffe4d8',
      text: '#9c3826',
      border: '#ffb7a7',
    },
    blue: {
      bg: '#dce9ff',          // Xanh da trời pastel (Chủ đề Thể thao)
      bgLight: '#d8e7ff',
      text: '#225399',
      border: '#b2d1ff',
    },
    pink: {
      bg: '#ffdce8',          // Hồng pastel (Chủ đề Cảm xúc)
      text: '#9b2b53',
      border: '#ffb8d1',
    },
  },

  // 5. Trạng thái phản hồi (Feedback & System States)
  state: {
    success: '#10b981',       // Thành công
    error: '#ef4444',         // Thất bại
    warning: '#f59e0b',       // Cảnh báo
    info: '#3b82f6',          // Thông tin
  },
} as const;

export type PastelThemeKey = 'yellow' | 'lavender' | 'mint' | 'peach' | 'blue' | 'pink';
