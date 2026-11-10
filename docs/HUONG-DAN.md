# Hướng dẫn sử dụng Sổ Thu Chi & Đầu Tư

## 1. Cài đặt từ mã nguồn (Windows)

Cần cài [Node.js](https://nodejs.org) bản LTS trước.

```bat
git clone https://github.com/DucNguyen7606/so_tai_chinh_ca_nhan.git
cd so_tai_chinh_ca_nhan\electron
npm install
npm run build
```

App được tạo trong `electron\out\win-unpacked\`. Chép cả thư mục này ra một chỗ cố định (ví dụ `D:\SoThuChi\app`) rồi bấm đúp `So Thu Chi Dau Tu.exe`.

- Lần đầu Windows có thể cảnh báo vì app chưa ký số: bấm **More info > Run anyway**.
- Tạo biểu tượng ngoài Desktop: chuột phải `So Thu Chi Dau Tu.exe` > **Send to > Desktop (create shortcut)**.
- Chạy thử không cần build: `npm start` trong thư mục `electron`.

App chạy hoàn toàn trên máy, không cần mạng và không gửi dữ liệu đi đâu. Các link tra giá chỉ mở trong trình duyệt khi bạn bấm.

## 2. Cập nhật lên bản mới mà không mất dữ liệu

1. Tắt app.
2. `git pull`, rồi `npm run build` trong thư mục `electron`.
3. Chỉ chép đè file `electron\out\win-unpacked\resources\app.asar` vào `resources\` của thư mục app đang dùng (nên đổi tên file cũ thành `app.asar.bak` trước).
4. Không đụng tới `so-tai-chinh-data.json` và thư mục `sao-luu`.

Dữ liệu nằm ngoài `app.asar`, nên cập nhật không làm mất dữ liệu.

## 3. Mật khẩu

- Lần đầu mở app sẽ yêu cầu tạo mật khẩu. Dữ liệu được mã hoá AES-256 (PBKDF2 + AES-GCM).
- **Quên mật khẩu là không mở lại được dữ liệu.** Hãy ghi mật khẩu ở nơi an toàn.
- Đổi mật khẩu hoặc khoá app: nút 💾 trong app.

## 4. Dữ liệu và sao lưu

- `so-tai-chinh-data.json`: toàn bộ dữ liệu, tự lưu sau mỗi thay đổi. App tìm file này theo thứ tự: đường dẫn ghi trong `data-dir.txt` cạnh file .exe, rồi thư mục cha của thư mục app nếu ở đó đã có file dữ liệu, cuối cùng là thư mục chứa .exe.
- `sao-luu\`: mỗi ngày tự giữ 1 bản sao, giữ 30 ngày gần nhất.
- Nút 💾: mở thư mục dữ liệu, xuất bản sao lưu, nhập lại từ bản sao lưu.
- Chuyển sang máy khác: chép nguyên thư mục (app + file dữ liệu + sao-luu).
- **Không bao giờ đưa `so-tai-chinh-data.json` lên GitHub.** File `.gitignore` đã chặn sẵn.

## 5. Bắt đầu nhanh

1. **Ngân sách**: nhập thu và chi dự kiến của tháng. Dòng **Thặng dư** cho biết còn bao nhiêu để chia vào Tiết kiệm và Đầu tư. Nếu chia vượt Thặng dư, app báo đỏ và hiện cảnh báo.
2. **Quỹ tiết kiệm**: tạo quỹ khẩn cấp và các quỹ mục tiêu, đặt 📌 Cố định hoặc 🌿 Linh hoạt. Khi tiền nhàn rỗi không đủ, thẻ **Cân đối** gợi ý lùi hạn các quỹ linh hoạt. Bấm áp dụng để cập nhật hạn.
3. **Quỹ đầu tư**: thêm khoản đầu tư, mục tiêu, hạn và lợi nhuận %/năm. Mỗi thẻ hiện **cần góp mỗi tháng**. Có bảng so sánh lãi suất (sửa được, ví dụ các kỳ hạn Tikop) để xem giá trị tương lai.
   - Vàng: nhập giá mua, bán và số chỉ. App quy đổi số tiền góp thành chỉ và tính giá trị theo giá mua vào.
   - Hướng dẫn có link tra giá vàng (SJC, PNJ, BTMC), cổ phiếu (SSI, CafeF, Vietstock), trái phiếu (HNX) và NAV quỹ (Fmarket, Dragon Capital, VinaCapital).
4. **Thu chi**: ghi từng khoản hằng ngày (gõ `50k`, `1.5tr`...).
   - Mỗi dòng hiện **số dư** như app ngân hàng. Đặt số dư đầu kỳ ở ô số dư, và ô đối chiếu giúp so với số dư thật trong ngân hàng.
   - Mỗi ngày có thanh tách riêng, ghi tổng thu, tổng chi và số dư cuối ngày.
   - Bấm ✏️ để sửa khoản đã nhập. Khoản góp quỹ hoặc đầu tư đi kèm cũng được sửa theo.
5. Nút ✨ bật hoặc tắt hiệu ứng "tiền tài về".

## 6. Cấu trúc mã nguồn

| Đường dẫn | Nội dung |
|---|---|
| `electron/main.js` | Cửa sổ Electron, đọc/ghi file dữ liệu, sao lưu hằng ngày |
| `electron/preload.js` | Cầu nối API an toàn cho giao diện |
| `electron/so-tai-chinh.html` | App đã build (không chứa dữ liệu cá nhân) |
| `src/so-tai-chinh.html` | Mã nguồn giao diện |
| `src/build/` | Script `build.py` chèn LocalDB và màn khoá vào HTML |
