# Báo cáo cải thiện Login và Bottom Tab Navigation

- Ngày: 15/10/2026.
- Dự án: `D:/RN/mobile-app-english-practice-iuh`.
- Nhánh đã xác minh trước khi sửa: `thuyen`.
- Phạm vi: UI Login, Bottom Tab và component/style liên quan trực tiếp.
- Giữ Tamagui, dùng StyleSheet của React Native cho style thanh tab. Không thêm dependency, animation, route hoặc thay đổi cấu trúc thư mục.

## 1. File thay đổi

| File | Nội dung |
| --- | --- |
| `features/auth/screens/LoginScreen.tsx` | Typography, input, nút, liên kết và khoảng cách Login; dùng variant Login cho các component chung. |
| `features/auth/components/AuthScaffold.tsx` | Padding riêng cho Login; vùng cuộn tránh bàn phím và đóng bàn phím khi kéo trên Login. |
| `features/auth/components/AuthHeader.tsx` | Header Login gọn hơn, chỉnh kích thước và bo góc khung placeholder logo. |
| `features/auth/components/GoogleButton.native.tsx` | Variant Login với chiều cao, radius, nền và icon Google đồng nhất. |
| `features/auth/components/GoogleButton.web.tsx` | Khai báo prop variant để thống nhất giao diện component đa nền tảng; giữ nguyên widget Google trên web. |
| `features/auth/components/GoogleButton.d.ts` | Bổ sung kiểu variant tương ứng. |
| `src/theme/tokens.ts` | Thêm loginDesign riêng; không sửa giá trị authDesign/homeDesign đang được các màn hình khác dùng. |
| `src/app/(tabs)/_layout.tsx` | Màu active/inactive, icon/label, vùng bấm, chiều cao responsive và safe area. |
| `fix/LOGIN_BOTTOM_TAB_UI_REPORT.md` | Báo cáo này và gợi ý nhóm commit. |

## 2. Login

- Giữ nền tối và màu xanh dương chủ đạo; header xanh từ 137 xuống 116dp, chưa tính safe area trên.
- Giữ ô dấu X làm placeholder cho logo thương hiệu sau này theo xác nhận của người dùng. Chỉnh từ 100x80 xuống 88x64dp, bo góc 12dp; không thay bằng logo khác.
- Tiêu đề 26px, mô tả 14px; tăng độ rõ của label và liên kết từ 11 lên 14px.
- Input cao tối thiểu 52dp, nền tối #1c2029, border #343c49, bo góc 12dp, focus xanh #75b8ff; padding rộng hơn.
- Nút Xác nhận và Google cao tối thiểu 52dp, cùng bo góc 12dp. Icon Google lấy từ FontAwesome trong dependency @expo/vector-icons sẵn có.
- Bỏ margin âm của hàng liên kết; chỉnh khoảng cách tiêu đề, form, Google và caption. Caption tự xuống dòng theo bề rộng thay vì ép dòng.
- Giữ ScrollView, keyboardShouldPersistTaps="handled" và padding safe area. Login Android dựa vào adjustResize có sẵn trong native project; tránh thêm xử lý chiều cao hai lần. iOS vẫn dùng KeyboardAvoidingView padding.
- Không chỉnh RegisterScreen; các component chung giữ style mặc định khi không truyền variant Login.

## 3. Bottom Tab Navigation

- Giữ đúng thứ tự và route: Trang chủ/home, Gia sư AI/ai, Học tập/study, Từ vựng/vocabulary, Cài đặt/settings.
- Giữ initialRouteName="home", backBehavior="initialRoute" và các handler điều hướng hiện có.
- Bỏ border quanh từng tab; chỉ giữ đường phân cách trên mảnh.
- Nền thanh tab #161c26; active xanh #75b8ff, nền quanh icon active #203c5c; inactive #98a3b4. Không dùng nền xanh lá active cũ.
- Icon 24dp, căn giữa trong vùng 44x30dp; các tab chia đều với flex: 1.
- Label 11px, tối đa hai dòng, tự giữ đủ vùng chữ khi màn hình hẹp hoặc cỡ chữ lớn.
- Chiều cao thông thường 64dp cộng padding dưới ít nhất 8dp hoặc safe area thực tế. Chỉ tăng vùng label khi bề rộng từng tab không đủ cho cỡ chữ hệ thống.
- Giữ thanh tab ở đáy theo layout navigator; không dùng absolute positioning hay nâng tab giữa. Tắt animation chuyển tab.
- Chưa thay đổi màu/cấu hình Android navigation bar native; nền tab kéo xuống vùng gesture inset để không đè nhãn lên thanh gesture.

## 4. Kiểm tra đã thực hiện

| Kiểm tra | Kết quả |
| --- | --- |
| `git branch --show-current` | thuyen trước khi sửa. |
| `git status --short` trước khi sửa | Không có thay đổi sẵn có. |
| `npm run typecheck` sau chỉnh sửa | PASS, exit code 0. |
| `npm run lint -- --no-cache` sau chỉnh sửa | PASS, không báo lỗi. |
| `git -c core.safecrlf=false diff --check` | PASS. |
| So sánh state và toàn bộ handler Login với HEAD bằng Node | Không thay đổi. |
| Android bundling qua Metro localhost IPv4 cổng 8082 | Thành công. |
| `adb devices` | Có emulator-5554. |

### Kiểm tra trực quan trên Android emulator

- Đã chạy bản UI mới, quan sát Login và focus viền input ở kích thước gốc 1080x2400, density 420, font scale 1.0.
- Đã mở tab Cài đặt và bấm sang Học tập; quan sát active/inactive, icon, nhãn và vùng gesture navigation.
- Cây accessibility ở cấu hình bình thường cho thấy 5 vùng bấm đều rộng 216px, vùng bấm cao khoảng 50dp trong lần kiểm tra đầu; Cài đặt có selected=true.
- Đã thử override 840x1491 ở density 420, tương đương rộng 320dp, font scale 1.3. Phát hiện nhãn bị rút gọn và sửa thành tối đa hai dòng; kiểm tra lại thấy đủ Trang chủ/Gia sư AI và các nhãn còn lại.
- Đã kiểm tra cuộn Login ở màn hình nhỏ/cỡ chữ lớn, tiếp cận được nút Xác nhận, Google và caption.
- Đã khôi phục emulator về kích thước gốc 1080x2400 và font scale 1.0. Khoảng đen quanh ứng dụng trong ảnh người dùng gửi là lúc emulator tạm chạy kích thước nhỏ để thử responsive.
- Sau phản hồi về chiều cao, thanh tab ở cấu hình bình thường được thu gọn về 64dp; vẫn giữ vùng hai dòng cho cấu hình hẹp/chữ lớn.

## 5. Giới hạn và mục cần kiểm tra thủ công

- Khi mở Home trực tiếp bằng deep link, gặp cảnh báo development: `The action 'REPLACE' with payload {"name":"auth/login","params":{}} was not handled by any navigator.` Chưa kết luận nguyên nhân; không sửa session/authentication hoặc routing ngoài phạm vi UI. Cần kiểm tra lại Home bằng luồng đăng nhập thực với session hợp lệ.
- Đã focus input và xác nhận IME báo đang mở, nhưng emulator hiển thị dạng nhập liệu thu gọn/handwriting thay vì bàn phím QWERTY đầy đủ. Cần thử bàn phím Gboard đầy đủ trên Android thật, cả username/password và khả năng cuộn tới nút khi bàn phím mở.
- Chưa thực hiện đăng nhập tài khoản, Google Sign-In, lưu token hoặc kiểm thử session end-to-end. Không có thay đổi trong các handler/API/hook liên quan.
- Chưa kiểm tra chế độ Android navigation ba nút, iOS, web và cỡ chữ rất lớn. Widget Google web giữ nguyên hành vi và style nhà cung cấp.
- Màu tối hiện tại vẫn được giữ; không bổ sung chuyển theme hệ thống hay sửa cấu hình giao diện toàn ứng dụng.

## 6. Lỗi môi trường/sandbox gặp trong quá trình làm

- Đường dẫn workspace ban đầu D:/Downloads/23636821_DoHoaiNho_Tuan7 không tồn tại trong môi trường terminal, gây CreateProcessWithLogonW error 267.
- Đường dẫn mới D:/RN/mobile-app-english-practice-iuh đọc được, nhưng nằm ngoài writable roots ban đầu của chat. Các lần ghi file đã chạy qua cơ chế cấp quyền của công cụ.
- `npm run lint` mặc định bị EPERM khi ghi cache .expo. Dùng `npm run lint -- --no-cache` đã chạy thành công.
- Metro localhost ban đầu bind ::1 làm ADB reverse báo EOF. Đã dùng `node --dns-result-order=ipv4first node_modules/expo/bin/cli start --dev-client --localhost --port 8082` để bind 127.0.0.1 và kiểm tra thành công. Không sửa backend/cổng 8081.
- Automatic approval review từ chối --lan vì khả năng mở mã nguồn ra mạng nội bộ; đã tiếp tục bằng localhost IPv4 qua ADB, không cần mở LAN.

## 7. Gợi ý commit (chưa thực hiện)

Có thể tách thành 3 commit theo thứ tự dưới đây. Commit tab dùng loginDesign nên đặt sau commit Login.

### Commit 1: Login và style liên quan

Thông điệp: `style(auth): refine login layout and dark theme controls`

Gồm:

- features/auth/screens/LoginScreen.tsx
- features/auth/components/AuthScaffold.tsx
- features/auth/components/AuthHeader.tsx
- features/auth/components/GoogleButton.native.tsx
- features/auth/components/GoogleButton.web.tsx
- features/auth/components/GoogleButton.d.ts
- src/theme/tokens.ts

### Commit 2: Bottom Tab

Thông điệp: `style(navigation): align bottom tabs and improve responsive labels`

Gồm: src/app/(tabs)/_layout.tsx.

### Commit 3: Báo cáo

Thông điệp: `docs: record login and bottom tab UI changes`

Gồm: fix/LOGIN_BOTTOM_TAB_UI_REPORT.md.

Nếu nhóm muốn một commit cho toàn bộ thay đổi: `style: polish login and bottom tab navigation`.

Không tự động stage, commit hoặc push Git.

## Tài liệu đã đối chiếu

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo keyboard handling](https://docs.expo.dev/guides/keyboard-handling/)
- [Expo Router JavaScript tabs](https://docs.expo.dev/router/advanced/tabs/)
