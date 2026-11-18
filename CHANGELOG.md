# Lịch sử thay đổi

## 1.1.1 (18/11/2026)

### Giao diện
- Tất cả các ô chọn ngày trong app (thu chi, quỹ, đầu tư, kế hoạch, số dư) hiển thị theo định dạng ngày/tháng/năm (dd/mm/yyyy) thay vì tháng/ngày/năm. Dữ liệu lưu không đổi.

## 1.1.0 (16/11/2026)

### Bảo mật
- Quên mật khẩu: khôi phục bằng câu hỏi bảo mật (họ tên đầy đủ + ngày sinh), sau đó đặt mật khẩu mới.
- Màn đặt mật khẩu hỏi thêm họ tên và ngày sinh.
- File dữ liệu định dạng mới (v3): dữ liệu mã hoá bằng khoá ngẫu nhiên, khoá được bọc bằng mật khẩu và bằng câu hỏi bảo mật. File cũ được tự nâng cấp khi cài câu hỏi bảo mật.
- Nút đổi câu hỏi bảo mật trong hộp Dữ liệu.

## 1.0.0 (11/2026)

### Thu chi
- Số dư chạy sau mỗi khoản như app ngân hàng, đặt số dư đầu kỳ và đối chiếu với ngân hàng.
- Thanh tách theo ngày với tổng thu, chi và số dư cuối ngày.
- Sửa khoản thu chi đã nhập, đồng bộ với khoản góp quỹ hoặc đầu tư liên kết.

### Ngân sách
- Dòng Thặng dư và Còn lại chưa phân bổ.
- Cảnh báo khi chi vượt thu, nhóm chi vượt mức, hoặc tiết kiệm + đầu tư vượt thặng dư.
- Ngân sách tự điền tiền nhàn rỗi cho tab Quỹ.

### Quỹ tiết kiệm và đầu tư
- Ưu tiên Cố định / Linh hoạt và bảng cân đối theo tiền nhàn rỗi, có nút áp dụng gợi ý.
- Số tiền cần góp mỗi tháng cho từng khoản đầu tư.
- Vàng định lượng theo chỉ, định giá theo giá mua vào.
- Bảng so sánh giá trị tương lai theo nhiều mức lãi suất.
- Link tra giá vàng, cổ phiếu, trái phiếu, NAV quỹ.

### Cảnh báo nhập liệu
- Cảnh báo ngày trong tương lai, số tiền bất thường, hạn kết thúc trước ngày bắt đầu, mục tiêu bằng 0.

### Giao diện
- Hiệu ứng "tiền tài về": đồng xu vàng, lì xì, câu khẳng định, mưa xu khi có khoản thu.

### Đóng gói
- App Electron cho Windows, dữ liệu mã hoá AES-256, sao lưu tự động hằng ngày.
