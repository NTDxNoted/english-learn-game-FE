# Cập nhật UI Signly — 03/11/2026

Áp dụng tiêu chí phù hợp từ D:/AWS/SKILL.md và hệ thống thiết kế của dự án
(DESIGN.md, DESIGN_SYSTEM.md, src/index.css). Không thay đổi API hay phân quyền.

- Bảng màu dùng token Indigo/Coral/Pastel và bề mặt nền kem; chữ phụ tăng tương phản.
- Toàn site: menu mobile có bàn phím/Escape, skip link, focus-visible, vùng chạm,
  nút disabled/loading và hỗ trợ prefers-reduced-motion.
- Trang chủ/chủ đề: typography, khoảng cách và grid co giãn; progress dùng scaleX.
- Auth: nhãn/lỗi liên kết ARIA, autocomplete, nút hiện mật khẩu dễ bấm.
- Game: bố cục câu hỏi/nút âm thanh/ô chữ vừa màn nhỏ; giữ nguyên Audio/API/camera.
- Tiến trình/xếp hạng: số tabular, tên dài xuống dòng, icon SVG đồng bộ.
- Admin: sidebar, bảng/bộ lọc, empty CTA, skeleton, error/success và các form
  validation inline. Mobile hiển thị dữ liệu từng hàng có nhãn.

Nguồn token: brand/surface/semantic từ index.css; font Plus Jakarta Sans + DM Sans;
bo góc 8/14/20/28px; shadow-card hiện có; spacing bội số 4/8px.
Admin dùng OPERATE, trang học READ, trang chủ PERSUADE và game EXPERIENCE.

Kiểm tra: build TypeScript/Vite, 102 test; preview 12 màn ở 375/768/1280px không
tràn ngang viewport. Preview dùng dữ liệu mẫu riêng trong staging, không triển khai
lên FE đang dùng. Thao tác API/DB/AWS thật không được chạy để kiểm tra UI.

Sau cập nhật, dùng Ctrl+F5. Không cần cài thêm dependency.
