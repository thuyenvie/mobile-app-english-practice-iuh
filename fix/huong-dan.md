# Hướng dẫn chạy Android bằng development build

Hướng dẫn này dành cho thành viên chạy dự án trên máy ảo Android, đặc biệt trên Windows. APK được build trên EAS của Expo, sau đó cài vào máy ảo. Không cần chạy `expo run:android` hay tự sửa Java/CMake/Ninja trên máy để làm theo luồng này.

`com.dohoainho.englishpractice` là mã định danh Android của app, không phải thư viện hoặc thư mục cần xóa. Lỗi `No development build (...) is installed` nghĩa là máy ảo chưa có APK development của app.

## 1. Chuẩn bị

- Tài khoản Expo tại https://expo.dev.
- Node.js đáp ứng Expo SDK 57 (tối thiểu 22.13.x), các dependency của dự án đã được cài theo lockfile mà nhóm thống nhất.
- Android Studio với Android SDK và một máy ảo đã tạo. Mở **Device Manager**, bấm nút chạy máy ảo và chờ vào màn hình chính. Với Google Sign-In, chọn system image có Google Play/Google APIs.
- Mở terminal tại thư mục chứa `package.json`, `app.json` và `eas.json`.

Các lệnh dưới đây dùng PowerShell trên Windows. `npx.cmd` tránh lỗi PowerShell chặn `npx.ps1`. Trên macOS có thể thay `npx.cmd` bằng `npx`. Không cần cài EAS CLI toàn hệ thống; luôn gọi qua `npx.cmd eas-cli@latest`.

Nếu nhóm đã có APK development phù hợp với phiên bản native hiện tại và kiến trúc máy ảo, xin APK đó rồi chuyển đến bước 6. Không phải mỗi thành viên đều cần tạo dự án EAS và build riêng.

## 2. Cấu hình môi trường local

Nếu chưa có `.env`, tạo từ `.env.example` tại thư mục gốc. Không ghi đè `.env` đã có cấu hình riêng.

Ví dụ cho máy ảo Android và backend chạy trên cùng máy tính:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:9999/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=WEB_CLIENT_ID_CUA_NHOM.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=ANDROID_CLIENT_ID_CUA_NHOM.apps.googleusercontent.com
```

- Thay các giá trị mẫu bằng Client ID nhóm cung cấp. Web Client ID phải có loại **Web application**, cùng giá trị backend dùng để kiểm tra ID token.
- Android Client ID là biến tùy chọn để kiểm tra cấu hình trong code hiện tại; điền biến này không thay thế việc đăng ký package và SHA-1 trên Google Cloud.
- Chạy riêng Android thì không cần điền iOS Client ID giả.
- Không đưa `GOOGLE_WEB_CLIENT_SECRET` vào app hoặc bất kỳ biến `EXPO_PUBLIC_*` nào. Secret chỉ thuộc backend.
- `10.0.2.2` trỏ về máy tính đang chạy Android Emulator. Nếu backend chạy trên máy thành viên khác, dùng địa chỉ mạng có thể truy cập của máy đó. Cần khởi động backend để các API hoạt động.

`.env` được Git bỏ qua. Development build sẽ dùng Metro local ở bước 7 để tải mã JS và cấu hình public local. Nếu sau này bundle JS trên EAS cho bản preview/production, cần cấu hình các biến tương ứng trên EAS; không mặc định cho rằng `.env` bị Git bỏ qua sẽ được upload.

## 3. Đăng nhập Expo và kiểm tra tài khoản

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest whoami
```

Hoàn tất đăng nhập trong trình duyệt. Lệnh `whoami` phải trả về tài khoản bạn muốn dùng để build.

Đăng nhập thành công không đồng nghĩa với có quyền truy cập dự án của người khác. Nếu gặp `Entity Not Authorized`, kiểm tra liên kết dự án ở bước 4; đăng nhập lại cùng tài khoản không tự cấp thêm quyền.

## 4. Liên kết EAS project

### Trường hợp A: dùng dự án chung và đã có quyền

Giữ nguyên cấu hình `owner` và `extra.eas.projectId` của nhóm, rồi chạy:

```powershell
npx.cmd eas-cli@latest project:info
```

Nếu truy cập được đúng dự án, chuyển đến bước 5. Nếu thiếu quyền, nhờ chủ dự án cấp quyền phù hợp hoặc gửi APK development đã build.

### Trường hợp B: tạo dự án riêng thuộc tài khoản của bạn

Ghi lại `owner` và `extra.eas.projectId` hiện tại để có thể khôi phục liên kết của nhóm. Các thay đổi liên kết riêng không nên commit vào nhánh chung nếu nhóm chưa thống nhất.

Trong `app.json`:

1. Đặt `expo.owner` bằng username Expo của bạn, ví dụ `thuyenvie`.
2. Xóa riêng đối tượng `expo.extra.eas` chứa project ID cũ. Giữ `extra.router` và các cấu hình khác.
3. Giữ nguyên `android.package`, `scheme` và `ios.bundleIdentifier`. Kiểm tra dấu phẩy để JSON hợp lệ.

Ví dụ các phần liên quan sau khi bỏ liên kết cũ (không thay toàn bộ `app.json` bằng đoạn này):

```json
"owner": "thuyenvie",
"extra": {
  "router": {}
}
```

Tạo/liên kết EAS project dưới tài khoản của mình:

```powershell
npx.cmd eas-cli@latest init --account thuyenvie
```

Thay `thuyenvie` bằng username của bạn. Chọn đồng ý khi CLI hỏi tạo project. Nếu tài khoản đã có project cùng slug, kiểm tra đúng project trước khi đồng ý liên kết.

Dự án có `app.config.js`. Nếu CLI không thể tự cập nhật dynamic config, lấy **project ID mới mà CLI trả về** rồi thêm vào `app.json`. File `app.config.js` hiện tại kế thừa cấu hình này:

```json
"extra": {
  "router": {},
  "eas": {
    "projectId": "PROJECT_ID_MOI_DO_EAS_TRA_VE"
  }
}
```

Không dùng Android package, Google Client ID hoặc tự đặt một chuỗi bất kỳ làm EAS project ID.

Kiểm tra lại:

```powershell
npx.cmd eas-cli@latest project:info
```

Chỉ tiếp tục khi CLI hiển thị đúng tài khoản/project của bạn và không còn lỗi quyền truy cập. Nếu vẫn báo ID cũ, kiểm tra lại `extra.eas.projectId` và mọi phần ghi đè trong `app.config.js`.

## 5. Build APK development trên EAS

`eas.json` đã có profile cần dùng:

```json
"development": {
  "developmentClient": true,
  "distribution": "internal"
}
```

Chạy:

```powershell
npx.cmd eas-cli@latest build --platform android --profile development
```

- Nếu EAS hỏi tạo Android keystore mới cho dự án riêng, chọn Yes. Nếu dùng dự án chung đã có keystore, dùng cấu hình ký mà nhóm quản lý.
- Theo dõi đường dẫn build CLI cung cấp. Có thể phải chờ hàng đợi hoặc xử lý giới hạn tài khoản.
- Chờ trạng thái thành công rồi tải file `.apk`. Nếu build thất bại, đọc log bước lỗi trên EAS; chạy `expo start` không thay thế được bước tạo APK.

Keystore mới có SHA-1 khác. Để Google Sign-In hoạt động, nhờ người quản lý Google Cloud đăng ký OAuth client Android với package `com.dohoainho.englishpractice` và SHA-1 của keystore dùng để ký bản APK này. Web Client ID vẫn phải khớp backend.

## 6. Cài APK lên đúng máy ảo

1. Mở máy ảo và chờ Android khởi động xong.
2. Kéo thả file APK vừa tải vào cửa sổ máy ảo.
3. Chờ cài xong; kiểm tra app xuất hiện trong danh sách ứng dụng.

Nếu đã cấu hình `adb`, có thể kiểm tra và cài bằng terminal:

```powershell
adb devices
adb install -r "C:\duong-dan\toi\development.apk"
adb shell pm path com.dohoainho.englishpractice
```

Thay đường dẫn APK bằng file thực tế. Lệnh `pm path` trả về đường dẫn `package:.../base.apk` khi app đã được cài. Nếu có nhiều thiết bị, dùng `adb -s SERIAL ...` để chọn đúng thiết bị.

Nếu báo `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, bản cũ và mới có chữ ký khác nhau. Chỉ gỡ bản cũ trên máy ảo nếu chấp nhận mất dữ liệu local của app, rồi cài APK mới. Nếu báo không tương thích ABI, cần APK hỗ trợ kiến trúc của máy ảo (thường là `x86_64` trên Windows).

## 7. Kết nối app với code local

Tại thư mục dự án, chạy:

```powershell
npx.cmd expo start --dev-client --port 3000
```

Nhấn `a` để mở app trên Android. Nếu có nhiều thiết bị, dùng `Shift+A` để chọn đúng máy ảo đã cài APK.

Nếu cổng 3000 đang được dùng bởi một Metro cũ của bạn, dừng terminal đó bằng `Ctrl+C` trước khi chạy lại. Chờ Metro bundle xong và kiểm tra app hiển thị giao diện.

Nếu APK đã cài nhưng không kết nối được Metro, kiểm tra máy ảo có kết nối mạng và Metro còn chạy. Với ADB, có thể chuyển tiếp cổng:

```powershell
adb reverse tcp:3000 tcp:3000
```

Sau đó dùng địa chỉ `http://127.0.0.1:3000` trong màn hình development launcher trên máy ảo nếu cần nhập URL thủ công.

## 8. Những lần chạy tiếp theo

Sau khi APK development đã được cài, thông thường chỉ cần mở máy ảo và chạy lại lệnh ở bước 7. Không phải build APK mỗi lần sửa JS/TypeScript hoặc giao diện.

Cần build và cài lại khi thay đổi phần native, thêm thư viện native, thay đổi cấu hình plugin cần native build hoặc nâng Expo SDK. Sau khi đổi `.env`, khởi động lại Metro và reload app.

## Các lỗi thường gặp

| Thông báo | Cách xử lý |
| --- | --- |
| `eas is not recognized` | Dùng `npx.cmd eas-cli@latest ...`, không gọi trực tiếp `eas`. |
| `npx.ps1 ... running scripts is disabled` | Dùng `npx.cmd`; không cần đổi Execution Policy. |
| `Entity Not Authorized` | Tài khoản chưa có quyền EAS project đang liên kết. Làm bước 4. |
| `No development build (com.dohoainho.englishpractice) ... is installed` | Build thành công và cài APK lên đúng máy ảo theo bước 5–6. Đổi tên package không sửa được việc thiếu APK. |
| `Launching in Expo Go` | Đang mở Expo Go. Muốn dùng Google Sign-In native thì cài APK development và chạy với `--dev-client`. |
| Google `DEVELOPER_ERROR` / code `10` | Kiểm tra package + SHA-1 của APK trên Google Cloud và Web Client ID. |
| App mở được nhưng API không hoạt động | Kiểm tra backend, `EXPO_PUBLIC_API_BASE_URL` và khả năng truy cập mạng. Đây là lỗi riêng với việc cài APK. |

## Tài liệu chính thức

- [EAS CLI: tạo hoặc liên kết project](https://docs.expo.dev/eas/cli/#eas-projectinit)
- [Sử dụng development build](https://docs.expo.dev/develop/development-builds/use-development-builds/)
- [Expo SDK 57 và yêu cầu Node.js](https://docs.expo.dev/versions/v57.0.0/)
- [Cấu hình Google Sign-In](https://react-native-google-signin.github.io/docs/setting-up/get-config-file)
