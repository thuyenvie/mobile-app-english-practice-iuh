# Hướng dẫn chạy Android/Expo và xử lý lỗi

Áp dụng cho `mobile-app-english-practice-iuh` trên **Windows / PowerShell**, dùng Android Studio Emulator và bản native development build. Tài liệu tổng hợp chuỗi lỗi đã xử lý đến khi ứng dụng chạy thành công.

> Chạy lệnh tại thư mục gốc project, trừ khi có chỉ dẫn khác. Thay đường dẫn JDK/SDK theo máy của bạn. Giữ file lock của nhóm; không tự nâng Gradle, CMake hoặc các package lên bản mới nhất để chữa lỗi.

## 1. Cài và đồng bộ Expo packages

Chuẩn bị Node.js/npm theo cấu hình project, Android Studio, Android SDK, emulator và **JDK 17**. Đặt project ở đường dẫn ngắn, ví dụ `D:\RN\mobile-app-english-practice-iuh`, và cấu hình `.env` theo hướng dẫn của nhóm.

```powershell
Set-Location 'D:\RN\mobile-app-english-practice-iuh'
npm install
npx expo install --fix
npx expo-doctor
```

`expo install --fix` đồng bộ các dependency với Expo SDK của project. Kiểm tra thay đổi `package.json` và `package-lock.json`, chia sẻ cùng nhau để cả nhóm dùng chung phiên bản. Không cài riêng Worklets/Reanimated bản mới nhất.

Nếu gặp `NativeModule: AsyncStorage is null`, kiểm tra dependency và cài bằng Expo nếu thiếu hoặc sai phiên bản:

```powershell
npx expo install @react-native-async-storage/async-storage
```

Sau khi thêm hoặc đổi native package, cần **build và cài lại APK** bằng `npx expo run:android --port 3000`; chỉ reload JavaScript hoặc xóa cache Metro không bổ sung native module vào APK cũ.

## 2. Chuyển JDK 25 sang JDK 17

Chuỗi build này đã gặp lỗi khi dùng JDK 25 và đi tiếp được sau khi chuyển sang JDK 17. Cài JDK 17, rồi đặt biến môi trường trong PowerShell hiện tại:

```powershell
# Thay bằng thư mục JDK 17 thực tế trên máy; không trỏ vào thư mục bin.
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java --version
```

Kết quả phải là Java **17**. Các biến trên chỉ áp dụng cho phiên PowerShell hiện tại. Để lưu lâu dài, đặt `JAVA_HOME` trong Environment Variables, ưu tiên `%JAVA_HOME%\bin` trong `Path`, rồi mở terminal mới.

### Xác minh chính Gradle cũng dùng JDK 17

```powershell
Push-Location android
.\gradlew.bat --stop
.\gradlew.bat --version
Pop-Location
```

Kiểm tra phần `JVM` hoặc `Launcher JVM` / `Daemon JVM` và đường dẫn Java trong output. Nếu còn trỏ JDK 25, kiểm tra `org.gradle.java.home` trong `android/gradle.properties` và `%USERPROFILE%\.gradle\gradle.properties`, cùng cấu hình daemon JVM nếu project có. Khi build từ Android Studio, đặt **Gradle JDK** của IDE thành JDK 17. Dừng daemon và kiểm tra lại sau khi sửa; không commit đường dẫn JDK riêng của máy vào cấu hình chung.

## 3. Lỗi react-native-worklets / CMake / Ninja và đường dẫn dài

Các dấu hiệu đã gặp:

```text
ninja: error: manifest 'build.ninja' still dirty after 100 tries
The maximum full path to an object file is 250 characters
```

Tên task có `react-native-worklets` hoặc `react-native-reanimated` chưa đủ để kết luận package bị lỗi. Trong chuỗi này cần xử lý cache native và đường dẫn project quá sâu.

1. Kiểm tra ngày giờ bằng `Get-Date`. Nếu sai, vào **Windows Settings → Time & language → Date & time**, chỉnh múi giờ và chọn **Sync now**. Thông báo Ninja gợi ý vấn đề timestamp, nhưng không khẳng định đồng hồ là nguyên nhân duy nhất.
2. Dừng Metro/build, đóng project trong IDE và dừng Gradle daemon trước khi chuyển thư mục.
3. Chuyển project từ đường dẫn sâu như `D:\IUH\Y4\HK1\Lap_Trinh_Thiet_Bi_Di_Dong\BTL\project\...` sang `D:\RN\mobile-app-english-practice-iuh` (hoặc ngắn hơn nếu vẫn có cảnh báo).
4. Mở terminal tại vị trí mới và làm sạch theo mục 4.

## 4. Xóa cache và cài lại sau khi chuyển project

Lỗi đặc trưng:

```text
Configuring project ':react-native-worklets' without an existing directory is not allowed
```

Nếu `projectDirectory` vẫn chứa đường dẫn cũ, cache Gradle/autolinking đang giữ vị trí cũ. Không tạo lại thư mục cũ để né lỗi.

Đoạn dưới chỉ xóa dependency và dữ liệu build có thể tạo lại. **Kiểm tra đúng thư mục project trước khi chạy**; giữ nguyên source, `.env`, keystore và file lock.

```powershell
Set-Location 'D:\RN\mobile-app-english-practice-iuh'
Get-Location
if (!(Test-Path -LiteralPath '.\package.json') -or
    !(Test-Path -LiteralPath '.\android\gradlew.bat')) {
    throw 'Chưa đứng tại thư mục gốc project Android/Expo.'
}

Push-Location android
.\gradlew.bat --stop
Pop-Location

$buildPaths = @(
    'android\.gradle',
    'android\.cxx',
    'android\build',
    'android\app\.cxx',
    'android\app\build',
    'node_modules\react-native-worklets\android\.cxx',
    'node_modules\react-native-reanimated\android\.cxx',
    'node_modules\expo-modules-core\android\.cxx',
    'node_modules'
)
foreach ($buildPath in $buildPaths) {
    if (Test-Path -LiteralPath $buildPath) {
        Remove-Item -LiteralPath $buildPath -Recurse -Force -ErrorAction Stop
    }
}

npm install
java --version
npx expo run:android --port 3000
```

Xóa riêng các thư mục `.cxx` hữu ích khi chỉ làm sạch native cache; xóa toàn bộ `node_modules` cũng đã bao gồm các thư mục đó. Nếu xóa bị khóa file, dừng tiến trình build/IDE đang giữ file rồi chạy lại. Không cần chạy `gradlew clean` trước khi xóa cache nếu Gradle đang thất bại ngay ở bước cấu hình đường dẫn cũ.

## 5. Emulator / ADB không kết nối được port 5554

Dấu hiệu: `could not connect to TCP port 5554`, `127.0.0.1:5554 ... refused (10061)` hoặc thiết bị `offline`.

```powershell
adb devices
adb kill-server
adb start-server
```

Mở **Android Studio → Device Manager → Pixel_8_API_35 → Start** (hoặc AVD của bạn), chờ vào màn hình chính Android, rồi kiểm tra:

```powershell
adb devices
```

Kết quả mong đợi trong lần xử lý này:

```text
emulator-5554   device
```

Nếu vẫn lỗi, dùng **Cold Boot Now**. Chỉ dùng **Wipe Data** khi cần vì thao tác này xóa dữ liệu của emulator. Có thể kiểm tra cổng bằng `netstat -ano | findstr :5554`; không có output nghĩa là chưa thấy tiến trình lắng nghe cổng đó. Serial/cổng có thể khác trên máy khác.

Nếu PowerShell không nhận `adb`, thêm thư mục `platform-tools` của Android SDK vào `Path` (máy đã xử lý dùng `D:\Android\SDK\platform-tools`). Sau khi thiết bị ở trạng thái `device`, chạy lại `npx expo run:android --port 3000`.

## 6. INSTALL_FAILED_UPDATE_INCOMPATIBLE: chữ ký APK khác nhau

Nếu log đã có `BUILD SUCCESSFUL` nhưng cài đặt báo:

```text
INSTALL_FAILED_UPDATE_INCOMPATIBLE
Existing package com.dohoainho.englishpractice signatures do not match newer version
```

APK cũ và APK mới có cùng package nhưng được ký bằng key khác nhau. Cách đã xử lý là gỡ ứng dụng cũ trên emulator rồi cài lại.

> Gỡ ứng dụng sẽ xóa dữ liệu local của ứng dụng: AsyncStorage, trạng thái đăng nhập và database local. Sao lưu dữ liệu cần giữ trước khi thực hiện.

```powershell
# Thay serial nếu adb devices hiển thị thiết bị khác.
adb -s emulator-5554 uninstall com.dohoainho.englishpractice
# Chờ kết quả Success, rồi build/cài lại:
npx expo run:android --port 3000
```

## 7. Chạy Expo/Metro ở port 3000

Project sử dụng **port 3000 cho Expo/Metro**. Dừng Metro đang chạy bằng `Ctrl+C`, rồi chọn lệnh phù hợp:

```powershell
# Build native, cài APK và khởi động Metro ở port 3000:
npx expo run:android --port 3000

# Khi đã cài development build và chỉ sửa JavaScript:
npx expo start --dev-client --port 3000
```

Chạy một trong hai lệnh trên tùy trường hợp. Nếu cổng 3000 đang bị chiếm, dừng phiên Metro cũ hoặc kiểm tra tiến trình đang sử dụng cổng trước khi chạy lại. Khi Expo đề nghị đổi cổng, giải phóng cổng 3000 để giữ đúng cấu hình của nhóm.

Tham khảo: [Expo CLI](https://docs.expo.dev/more/expo-cli/).
## 8. Kiểm tra hoàn tất

- Java và Gradle đều dùng JDK 17.
- Log không còn tham chiếu đường dẫn project cũ hoặc lỗi CMake/Ninja.
- `adb devices` hiển thị emulator ở trạng thái `device`.
- Build thành công, APK cài được và ứng dụng mở được.
- Kiểm tra lại chức năng dùng AsyncStorage trên bản APK vừa build.
- Expo/Metro đang chạy ở port `3000` và development build kết nối được.

Sau khi đã cài development build, các lần chỉ sửa JavaScript có thể chạy `npx expo start --dev-client --port 3000`. Khi đổi dependency native hoặc cấu hình native, chạy lại `npx expo run:android --port 3000`.
