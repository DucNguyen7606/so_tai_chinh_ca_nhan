# Sổ Thu Chi & Đầu Tư

Ứng dụng quản lý thu chi, ngân sách, quỹ tiết kiệm và đầu tư chạy offline trên Windows (Electron). Dữ liệu được mã hoá AES-GCM bằng mật khẩu và lưu ở file `so-tai-chinh-data.json` cạnh app, kèm bản sao lưu hằng ngày trong `sao-luu/`.

## Tính năng chính
- Thu chi có số dư chạy như app ngân hàng, thanh tách theo ngày, sửa khoản đã nhập
- Ngân sách tháng với dòng Thặng dư và cảnh báo phân bổ vượt
- Quỹ tiết kiệm và đầu tư: ưu tiên cố định / linh hoạt, gợi ý cân đối, số cần góp mỗi tháng
- Vàng quy đổi theo chỉ, so sánh lãi suất (ví dụ Tikop), link tra giá vàng, cổ phiếu, trái phiếu, NAV quỹ
- Hiệu ứng "tiền tài về" (tắt được bằng nút ✨)

## Cấu trúc
- `electron/` – mã đóng gói Electron (`main.js`, `preload.js`, `package.json`) và file app đã build sạch (không có dữ liệu cá nhân)
- `src/so-tai-chinh.html` – mã nguồn giao diện
- `src/build/` – script build chèn LocalDB và màn khoá vào file HTML
- `docs/HUONG-DAN.txt` – hướng dẫn cài đặt

## Build
```
cd electron
npm install
npx electron-builder --win dir
```
