# Tổng hợp sửa đăng nhập Google và hiển thị tên người dùng

Ngày: 04/10/2026.

## 1. Nguyên nhân và cấu hình ngoài Git

- Google Sign-In báo `10/DEVELOPER_ERROR` do chữ ký APK đang cài không khớp Android OAuth client đã cấu hình.
- Đã lấy APK trực tiếp từ máy ảo và kiểm tra bằng `apksigner`: APK dùng debug keystore, SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
- Keystore EAS có SHA-1 khác: `08:04:CB:67:E7:3E:C0:5C:DB:A3:E7:27:35:AA:EB:C7:C7:37:34:87`.
- Package Android: `com.dohoainho.englishpractice`. Mỗi chữ ký cần Android OAuth client tương ứng trong Google Cloud project dùng cho ứng dụng.
- Người dùng đã chỉnh `.env` frontend và backend để thống nhất Web Client ID; `GOOGLE_ID_TOKEN_AUDIENCE` cũng dùng cùng giá trị. Hai file `.env` được Git bỏ qua, không nằm trong commit.
- Các biến cần đồng bộ: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_ID_TOKEN_AUDIENCE`.
- Android Client ID không thay thế việc đăng ký package/SHA-1. Không đưa client secret hoặc API key vào tài liệu/commit.

## 2. Thay đổi frontend

| File | Thay đổi và mục đích |
| --- | --- |
| `features/auth/hooks/useGoogleLogin.native.ts` | Giữ nguyên `AxiosError` để màn hình đăng nhập đọc được thông báo backend, thay vì chỉ hiện HTTP 400. |
| `src/lib/axios/axios.ts` | Không đính kèm Authorization vào POST đăng nhập thường, Google, Google mobile và outbound authentication. Token phiên cũ không còn chặn việc đăng nhập mới. Các API được bảo vệ vẫn dùng token. |
| `features/home/data/homeDataSource.ts` | Gọi `GET /identity/user/my-info`, ghép `firstName` và `lastName`; nếu thiếu tên thì dùng `userName`, sau cùng là “bạn”. Kiểm tra response trước khi hiển thị. |
| `features/home/data/homeMock.ts` | Thay tên mẫu “Tèo” bằng “bạn”. Dữ liệu bài học vẫn là mock; hồ sơ trang chủ lấy từ backend. |
| `features/home/hooks/useHomeData.ts` | Đổi thông báo lỗi sang không tải được dữ liệu trang chủ, phù hợp với việc tải cả hồ sơ. |

API hồ sơ và việc lưu tên Google đã có ở backend; đợt này không thêm endpoint hay trường dữ liệu mới. Chưa bổ sung ảnh đại diện Google.

## 3. Thay đổi backend

File: `identity-service/src/main/java/vn/edu/iuh/english_practice/configuration/InitialApplication.java`.

- Inject `RoleRepository` và import `Role`.
- Kiểm tra, tạo role `admin` và `user` còn thiếu trước khi tạo các tài khoản mặc định.
- Giữ các role đã tồn tại khi chạy lại tuần tự.
- Khắc phục trường hợp Google tạo user mới nhưng không tìm thấy role `user`, dẫn đến lỗi `NOT_FOUND` với thông báo gây hiểu nhầm “Router not found”.

Runner vẫn phụ thuộc điều kiện `spring.datasource.driver-class-name=com.microsoft.sqlserver.jdbc.SQLServerDriver`. Cần restart identity-service để chạy bước khởi tạo. Biên dịch không tự restart tiến trình.

Thay đổi này chưa gán bù role cho tài khoản mặc định đã tồn tại mà thiếu role. Nó cũng chưa bổ sung cơ chế chống tạo trùng role khi nhiều instance khởi động đồng thời.

## 4. Kiểm tra đã thực hiện

- Xác minh chữ ký APK đang cài trên `emulator-5554` bằng `apksigner`.
- Gửi Google ID token giả để kiểm tra luồng HTTP: không có Bearer header trả 400 `Unauthenticated`; có Bearer không hợp lệ trả 401 body rỗng. Không dùng token người dùng cho phép thử này.
- Backend compile thành công bằng JDK 21 (`mvnw.cmd -B -DskipTests compile`). Không chạy integration test database.
- Frontend TypeScript check thành công; lint các file code sửa thành công.
- Lần lint toàn frontend trước đó có 5 lỗi và 2 cảnh báo ở phần khác; chưa xác nhận toàn repo lint sạch.
- Người dùng xác nhận đăng nhập Google thành công sau khi restart backend.
- Việc hiển thị tên đã nối API và kiểm tra tĩnh; chưa có xác nhận giao diện thực tế sau lần sửa này.

## 5. Chạy lại

1. Restart identity-service bằng JDK 21 sau khi cập nhật backend; chờ log `Application initialization completed .....`.
2. Restart Metro nếu đổi `.env`, reload app nếu chỉ đổi frontend JS/TypeScript. Không cần build APK cho các thay đổi frontend trong đợt này.
3. Đăng nhập Google và kiểm tra tên ở trang chủ. API hồ sơ cần token hệ thống trả về sau đăng nhập.

## 6. Phạm vi commit

Frontend: 5 file code ở mục 2 và tài liệu này.

Backend: chỉ `InitialApplication.java` cho commit sửa đăng nhập.

Khi kiểm tra Git, `exam-service/src/main/resources/application.properties` cũng đang bị sửa ngoài phạm vi đăng nhập: API key được viết trực tiếp thay cho biến môi trường. Không stage file này vào commit. Khôi phục cách tham chiếu biến môi trường trước khi muốn commit cấu hình exam-service; nếu key đã được chia sẻ ngoài phạm vi tin cậy, cần thu hồi/đổi key.

## 7. Commit đề xuất

### Frontend

```text
fix(auth): handle login errors and display the signed-in user's name

Preserve Axios errors so the login screen can show backend messages.
Omit stored bearer tokens from login requests to prevent stale sessions
from causing authentication failures.

Load the home profile from the authenticated my-info endpoint and
replace the hardcoded name with the user's name or a username fallback.
Update the home loading error and document the Google login fixes.

Validation: TypeScript check and lint for changed files passed.
```

### Backend

```text
fix(identity): seed missing roles before initializing users

Create missing admin and user roles before creating default accounts.
Reuse existing roles on subsequent startups.

This supplies the user role required when provisioning Google accounts,
avoiding the misleading "Router not found" error on databases without it.
Keep the existing SQL Server startup condition.

Validation: identity-service compiled successfully with JDK 21.
```
