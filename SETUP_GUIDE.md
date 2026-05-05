# 🏸 Badminton Setup - Tích Hợp Đăng Nhập Google & Chia Sẻ Link

## 🔐 Đăng Nhập Bằng Google ✅ (Đã có sẵn)

Google Login đã được tích hợp hoàn chỉnh. Người dùng có thể:

- Nhấp nút **"🔑 Đăng nhập"** ở góc trên phải
- Google sẽ hiện popup xác thực
- Sau đăng nhập, avatar Google sẽ hiện thị trên thanh navigation
- Có tùy chọn **Thiết lập thanh toán** để lưu thông tin ngân hàng

## 🔗 Chia Sẻ Link Xem Trực Tiếp (MỚI)

### Tính Năng

Quản lý buổi giao lông có thể chia sẻ link cho phó để xem trực tiếp sơ đồ sân, danh sách, và chi phí.

### Cách Sử Dụng

#### 1. **Tạo Link Chia Sẻ**

- Vào trang **Màn quản lý** (Live)
- Nhấp nút **"🔗 Chia sẻ"** ở góc trên phải của header
- Chọn **"🔗 Tạo link chia sẻ"**
- Link được tạo tự động

#### 2. **Chia Sẻ Link**

Sau khi link được tạo, bạn có thể:

- **📋 Copy**: Sao chép vào clipboard
- **💬 WhatsApp**: Gửi trực tiếp qua WhatsApp
- **📧 Email**: Mở ứng dụng email (Gmail, Outlook, etc.)
- **📱 QR Code**: Hiển thị mã QR để quét nhanh

#### 3. **Quản Lý Chia Sẻ**

- Nhấp **⚙️** để mở modal quản lý
- Xem lại link bất cứ khi nào
- **🔒 Hủy chia sẻ** - Link cũ sẽ không còn hoạt động

### Quyền Hạn Khách

Người xem thông qua link chia sẻ **CHỈ CÓ QUYỀN XEM (Read-only)**:

- ✅ Xem danh sách căn hộ
- ✅ Xem sơ đồ sân (ai đang chơi ở sân nào)
- ✅ Xem chi phí (tổng chi, chi/người)
- ✅ Cập nhật tự động khi quản lý thay đổi dữ liệu

**KHÔNG THỂ**:

- ❌ Chỉnh sửa dữ liệu
- ❌ Thêm/xóa người
- ❌ Thay đổi sân
- ❌ Cần đăng nhập

## 📱 Quy Trình Tương Tác

```
Quản Lý Buổi                    Khách (Chưa đăng nhập)
    |                                    |
    ├─ Đăng nhập Google ✓               |
    ├─ Tạo buổi mới                    |
    ├─ Thêm người, ghép sân            |
    ├─ Tạo link chia sẻ                |
    ├─ Chia sẻ link ────────────────────→ | Nhấp link
    │                                   ├─ Xem trực tiếp
    │                                   ├─ Tự động cập nhật
    │                                   └─ Không cần đăng nhập
    └─ Hủy chia sẻ                      └─ Link không còn hoạt động
```

## 🛠️ Công Nghệ

- **Firebase Firestore**: Lưu trữ session + share tokens (real-time)
- **QRCode.js**: Tạo mã QR
- **Vue 3 + Pinia**: State management và giao diện
- **Google Sign-In**: Xác thực

## 🔍 Files Thay Đổi

- `src/stores/index.js` - Thêm hàm share token
- `src/main.js` - Thêm route `/shared/:token`
- `src/views/LiveView.vue` - Thêm nút chia sẻ + modal
- `src/views/SharedLiveView.vue` - **[NEW]** View cho khách

## 📝 Lưu Ý

1. **Share Token**: Token được lưu trong session Firestore, mất khi buổi kết thúc
2. **Bảo mật**: Link public, nên chia sẻ cẩn thận (không ẩn bất cứ thông tin gì vì đã public)
3. **Hết hạn**: Hủy chia sẻ bất kỳ lúc nào bằng nút **🔒 Hủy chia sẻ**
4. **Real-time**: Khách sẽ thấy cập nhật tức tì khi bạn thay đổi dữ liệu

## ✨ Bước Tiếp Theo (Optional)

- [ ] Thêm password protection cho link
- [ ] Giới hạn thời gian hiệu lực của link
- [ ] Thêm counter xem tổng số người đã xem link
- [ ] Lịch sử chia sẻ (ai xem, lúc nào)
