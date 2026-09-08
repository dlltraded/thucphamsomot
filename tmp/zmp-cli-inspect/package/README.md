# Zalo Mini App CLI

Zalo Mini App CLI là một công cụ dòng lệnh cung cấp các lệnh giúp bạn đăng nhập, kiểm tra và thử nghiệm Zalo Mini App, tương tự như Zalo Mini App Extension. Tuy nhiên, bạn có thể sử dụng Zalo Mini App CLI với bất kỳ IDE hoặc trình soạn thảo văn bản nào, hoặc tích hợp vào các hệ thống CI/CD để tự động hóa các bước trong quá trình phát triển Zalo Mini App.

## Cài Đặt

Để cài đặt Zalo Mini App CLI, bạn có thể thực hiện các bước sau:

1. Mở terminal hoặc command prompt trên máy tính của bạn.
2. Chạy lệnh:

   ```sh
   npm install -g zmp-cli
   ```

Bạn có thể kiểm tra xem quá trình cài đặt đã thành công hay không bằng cách chạy lệnh `zmp --help`.

![zmp --help](https://mini.zalo.me/documents/img/zmp-help.gif)

## Đăng nhập

Trong quá trình phát triển Zalo Mini App, bạn sẽ thường xuyên được yêu cầu đăng nhập để xác thực tài khoản nhà phát triển Zalo Mini App. Zalo Mini App CLI cung cấp các cách để bạn đăng nhập và xác thực tài khoản sau:

| Hình thức    | Mô tả                                                                                                                                                                                                                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QR Code      | Một mã QR sẽ xuất hiện trên màn hình của bạn. Bạn cần sử dụng ứng dụng Zalo trên điện thoại để quét mã QR này. Sau khi quét mã QR, bạn cần nhấn vào nút Xác nhận trên ứng dụng Zalo trên điện thoại để hoàn tất quá trình đăng nhập trên Zalo Mini App CLI.                                                                             |
| Access Token | Bạn cần cung cấp một access token hợp lệ. Để lấy access token, bạn có thể truy cập trang [Zalo for Developers](https://developers.zalo.me), sau đó chọn `Công cụ` > `API Explorer` và nhấn nút `Lấy Access Token`. Đảm bảo rằng bạn đã chọn đúng ứng dụng Zalo App mà bạn đang phát triển khi lấy access token (ở mục `Chọn ứng dụng`). |

![zmp login](https://mini.zalo.me/documents/img/zmp-login.gif)

## Tạo dự án

```sh
zmp init
```

Để tạo Zalo Mini App, bạn có thể lựa chọn một trong hai cách sau:

- **Create a new ZMP project** (Tạo mới): Zalo Mini App CLI sẽ tạo ra cấu trúc thư mục cho dự án mới và cài đặt các dependencies cần thiết vào thư mục hiện hành đang sử dụng (working directory).
- **Use ZMP to deploy only** (Chuyển đổi ứng dụng Web có sẵn thành Zalo Mini App): Zalo Mini App CLI sẽ bổ sung các file thiết lập cần thiết để bạn có thể đưa dự án có sẵn lên Zalo Mini App. Chi tiết bạn có thể tham khảo bài viết [Hướng dẫn chuyển đổi Web App thành Zalo Mini App trong 30 phút
  ](https://mini.zalo.me/blog/huong-dan-chuyen-doi-web-app-thanh-zalo-mini-app-trong-30-phut)

### Các tuỳ chọn khi tạo dự án

| Thiết lập            | Tạo mới | Chuyển đổi ứng dụng có sẵn | Mô tả                                                                                                                                                                                                                               |
| -------------------- | ------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zalo Mini App ID** | ✓       | ✓                          | ID của Zalo Mini App mà bạn đã đăng ký. Nếu chưa có, bạn có thể tạo ID cho mini app của mình ở [mini.zalo.me](https://mini.zalo.me/developers).                                                                                     |
| **Template**         | ✓       |                            | CLI hỗ trợ tạo dự án với hai nhóm template: `Mới` chỉ gồm các thiết lập cơ bản để bạn tự phát triển từ đầu và `Dựng sẵn` cho các Mini App nhanh như quán ăn, cà phê, cửa hàng bán lẻ,…                                              |
| **Name**             | ✓       | ✓                          | Tên dự án.                                                                                                                                                                                                                          |
| **Folder name**      | ✓       |                            | Với luồng **Tạo mới**, CLI sẽ tạo một thư mục mới với tên này bên trong working directory để chứa mã nguồn của dự án. Với luồng **Chuyển đổi ứng dụng có sẵn**, thiết lập bổ sung sẽ được cập nhật trực tiếp vào working directory. |

## Khởi động

```sh
zmp start
```

Để phát triển ứng dụng, bạn có thể sử dụng Zalo Mini App CLI để khởi động dự án trên máy tính. Khi đó, Mini App của bạn sẽ chạy giống như một ứng dụng web và bạn có thể sử dụng bất kỳ trình duyệt nào để xem trước giao diện.

![zmp start](https://mini.zalo.me/documents/assets/images/zmp-start-3ca76fd382d17e3af55991da9f63003b.gif)

### Chế độ Device

Zalo Mini App CLI cũng hỗ trợ khởi động dự án ở Device mode. Các yêu cầu đối với dự án là như nhau:

> - Liên kết với một Zalo Mini App ID hợp lệ.
> - Sử dụng phiên bản SDK mới nhất.
> - Sử dụng Vite 2.x cho dự án của bạn. Dự án sử dụng Webpack sẽ không tương thích với chế độ này.

Để khởi động dự án ở chế độ Device, bạn chỉ cần thêm flag `-D` vào cuối lệnh `start`:

```bash
zmp start -D
```

Một mã QR code sẽ hiển thị và bạn cần sử dụng ứng dụng Zalo trên thiết bị thật để quét mã này.

Để sử dụng các công cụ như Elements inspector, Console log, hay Network trong Devtools, bạn cần mở trình duyệt và nhập đường dẫn `http://localhost:<PORT>` được hiển thị trong output sau khi chạy lệnh start. Lưu ý: cần sử dụng trình duyệt Google Chrome hoặc một trình duyệt khác có nhân Chromium để mở đường dẫn trên.

![zmp start -D](https://mini.zalo.me/documents/img/zmp-start-d.gif#bordered)

## Xuất bản

```sh
zmp deploy
```

Lệnh này sẽ giúp bạn xuất bản ứng dụng của mình lên Zalo Mini App, từ đó bạn có thể gửi xét duyệt và cho phép người dùng truy cập và sử dụng ứng dụng của bạn trên Zalo.

### Các tuỳ chọn khi xuất bản

| Thiết lập      | Giá trị mặc định | Mô tả                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version status | Development      | <ul><li>Development: không hiển thị trên mục Quản lý phiên bản của mini app và sẽ bị ghi đè bởi bản phát triển mới mỗi khi deploy. Điều này tiện lợi khi bạn muốn kiểm tra nhanh trên Zalo khi ứng dụng vẫn đang được phát triển.</li><li>Testing: tất cả các phiên bản kiểm thử đều được đánh số và lưu trữ trên mục Quản lý phiên bản. Bạn có thể gửi phiên bản kiểm thử để xem xét và phát hành phiên bản đã được xem xét để người dùng Zalo có thể sử dụng.</li></ul> |
| Description    |                  | Mô tả phiên bản                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

![zmp login](https://mini.zalo.me/documents/assets/images/zmp-deploy-b1b48e06267d443950111ab895778fa1.gif#bordered)
