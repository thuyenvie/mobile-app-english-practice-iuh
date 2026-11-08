# Tiến độ cải thiện UI/UX English Practice

Ngày: 08/11/2026. Worktree `D:\RN\.worktrees\mobile-ui-ux`, branch `feature/mobile-ui-ux-improvements`, HEAD nền `92a09cfb7ddf5a0c89257865026c8cf54a609606`.

## Phạm vi được duyệt

Triển khai G0, G1, G2; đưa sớm các ưu tiên UX-012, UX-014–015, UX-026, UX-055 vào các thay đổi UI hẹp. Giữ nhận diện/theme/Tamagui, handler nghiệp vụ, API/payload, Authentication/JWT/Guest/session/draft/audio/notification. Không build APK/EAS/OTA, commit/push/PR, đổi branch hoặc sửa repository gốc/Backend.

## G0 — baseline

- Đã đọc toàn bộ `D:\RN\english-practice-docs\MOBILE_UI_UX_AUDIT.md` và hướng dẫn AGENTS tại repository Mobile gốc để đối chiếu. Worktree không có AGENTS riêng hoặc thay đổi sẵn có; Git branch và HEAD khớp yêu cầu.
- SDK Expo 57, RN 0.86.3. Đã đối chiếu tài liệu chính thức trước khi sửa primitive keyboard/scroll: [Expo 57](https://docs.expo.dev/versions/v57.0.0/), [keyboard](https://docs.expo.dev/guides/keyboard-handling/), [RN KAV](https://reactnative.dev/docs/0.86/keyboardavoidingview), [ScrollView](https://reactnative.dev/docs/0.86/scrollview).
- `adb devices -l`: không có thiết bị. Không có build/device khớp HEAD để tái hiện; **chưa xác nhận bất kỳ mục nào trên điện thoại Android**. Không dùng APK cũ để suy ra kết quả source mới.
- Lần chạy đầu TypeScript/lint và 3 test suites bị thiếu dependency trong worktree; settings-storage pass 16/16. Đang cài đúng package-lock bằng `npm ci --ignore-scripts --no-audit --no-fund`; không cập nhật manifest/lock, không thêm thư viện.
- Audit ghi baseline ESLint 29 errors/9 warnings; sẽ đo lại độc lập sau khi dependency sẵn sàng. Không sửa logic ngoài phạm vi để dọn baseline lint.

## Quy ước triển khai

- Form: KAV iOS `padding`, Android `height`; body cuộn với handled taps/on-drag; cuộn input khi focus và khi IME hiện. Insets do shell/form sở hữu, tránh cộng lặp.
- Dialog: giới hạn theo viewport trừ safe area; toàn bộ nội dung và nút có đường cuộn, giữ Back/close/busy handler cũ. Footer có thể cuộn trong màn cực thấp/chữ lớn.
- Màu: `accent/onAccent`, `selection/onSelection`, body `surface/text`; không đổi palette hoặc suy màu foreground từ raw hex.
- Vùng chạm tối thiểu 48 dp; chiều cao tăng theo chữ; không tắt font scaling.

## Trạng thái

Gate Android của G0 chưa đạt do không có thiết bị; tiến hành source/offline checks theo chỉ thị triển khai, không coi đây là nghiệm thu native.

## G0 — kết quả sau khi chuẩn bị dependency

- `npm ci --ignore-scripts --no-audit --no-fund`: thành công, 979 packages; manifest/lock không đổi. Lần đầu trong sandbox lỗi ghi npm-cache, lần chạy được cấp quyền thành công.
- TypeScript: PASS. Settings theme/storage/shell + Android Back: **37/37 PASS**.
- ESLint source/features/tests: **29 errors / 9 warnings**, khớp audit (2 primitive mới không có diagnostic). JSON: `.expo/ui-ux-implementation/lint-g0.json`.

## G1 — source đã triển khai

- UX-001–006: FormScrollView dùng KAV và chính sách cuộn thống nhất cho Auth, Settings, Study Plan, Vocabulary Schedule; focus/keyboardDidShow/layout cuộn input. AI KAV Android có behavior, tab ẩn khi mở bàn phím. Chưa nghiệm thu IME.
- UX-012/046/047: ngày học wrap theo thứ tự, tối thiểu 48 dp, checkbox/checked/full day labels; Switch và save có semantics. Quiet time xếp dọc, thêm bottom inset riêng cho Plan.
- UX-014–015/023: DialogContent giới hạn chiều cao theo viewport/safe area, toàn nội dung và action cuộn cùng nhau; áp dụng Reading, Listening, Full Test, Guest confirm, kết thúc phiên/buổi ôn, goal modal và branded overlay. Bỏ các vùng cuộn con trong sheet Listening/Full và GuestResultDetails. Chưa nghiệm thu TalkBack/focus restore.
- UX-019: gợi ý AI chuyển vào ListEmptyComponent, cuộn trong list thay vì chiếm chiều cao cố định bên ngoài. Composer gọn hơn, gửi 48 dp; UX-020 ảnh co theo chiều rộng.
- UX-036: onAccent ở CTA Overview, user bubble (cả note ảnh mất), goal modal title. Giữ nguyên palette.
- Button primary 52 dp, text tối thiểu 48 dp, cao theo nội dung. AppInput hỗ trợ cuộn focus và hiện/ẩn mật khẩu.

### Gate G1

- TypeScript: **PASS**; `git diff --check`: **PASS**.
- Lint 23 file đã thay đổi và primitive mới: **14 errors / 3 warnings**, tất cả rule/severity/count theo file trùng baseline; **0 diagnostic mới**. Không tắt rule/refactor business hook.
- 8 suite (theme/storage/shell/Android Back/Guest/listening/selected-parts/vocabulary-schedule): **90 PASS / 1 FAIL**. Lỗi có sẵn: `Home shows separate vocabulary tasks even after the Reading task is complete` gọi component TodayStudySessionCard không truyền props, gây destructuring undefined; file Home và test được giữ nguyên. Test harness chỉ bổ sung stub React context, KAV, Keyboard, dimensions để load primitive mới; không thay hành vi app.
- Gate native còn mở. Các suite pass không chứng minh IME/layout/font-scale/TalkBack pass.

## G2 và ưu tiên đưa sớm

- UX-025: bỏ form đăng ký chưa có tác dụng; báo unavailable ngay ở Login entry và Register screen. Giữ các lựa chọn đăng nhập hiện có/học thử; không tạo endpoint/handler đăng ký mới.
- UX-007 (Auth/Settings), UX-010: Login username → password; Profile tên → họ → ngày sinh; Password current → new → confirm; Reminder giờ nhắc → quiet start → quiet end. Done chỉ đóng bàn phím, không nối thêm request submit. Giữ autocomplete, value và callback. Password có hiện/ẩn 48 dp.
- UX-009 (một phần): ví dụ ngày/giờ rõ, keyboard/capitalization và Done; không thêm picker/mask làm đổi serialization. UX-008 field errors chưa hoàn tất (summary/validation hiện có được giữ).
- UX-029: đưa nhóm Tài khoản lên trước tùy chọn học tập; Đăng xuất là text action trong nhóm, vẫn giữ confirmation và toàn bộ pause → push → server → local ordering.
- UX-034/069: tóm tắt ngày/giờ đã lưu, editor và chi tiết mở theo nhu cầu; giữ riêng save/register, device status, cảnh báo chưa xác nhận delivery. Controller/API/notification không đổi. Test UI đã cập nhật để mở editor/details trước khi kiểm tra field; các test contract vẫn giữ nguyên.
- UX-026: giới hạn chấm/lưu Guest Full Test hiển thị ở Overview và intro trước Bắt đầu; gợi ý quay lại luyện Part, giữ nguyên quyền bắt đầu/submit/scoring/timer của Guest và tài khoản.
- UX-055: bỏ loading/error overlay tổng; mỗi section catalog/plan/recent có state và retry riêng. Không đổi fetch API/payload/sequence. Đề đã tải vẫn chọn được dù plan/history pending/error; không render empty thay cho lỗi. Hai CTA lộ trình xếp dọc để tránh ép ngang (UX-024, phạm vi cục bộ).

### Gate G2 (lần đầu)

- TypeScript và diff check: **PASS**.
- 9 suite Authentication/HTTP/Guest/Settings theme/storage/shell/reminder/Back/selected-parts: **150/150 PASS**.
- Lint 31 file thay đổi + primitive mới: **17 errors / 5 warnings**, trùng baseline theo file/rule/severity/count; **0 diagnostic mới**.
- Bổ sung 12 test regression UI: form focus/cleanup listener (Android/iOS stubs), catalog pending/failure + retry đúng section, Register unavailable không yêu cầu credentials, Guest restriction, reveal/autofill, Profile/Password payload/validation/busy, dialog nonzero insets và contrast tại 3 call-site ở hai theme. **12/12 PASS**. Đây là offline component tests, không phải mô phỏng geometry native.

## Bàn giao source và giới hạn nghiệm thu

**Đã sửa trong source:** UX-001–006, UX-010, UX-012, UX-014–015, UX-019, UX-023, UX-025–026, UX-029, UX-036, UX-069. Trong đó các mục keyboard/layout/dialog vẫn mang trạng thái **S→D chờ Android**, không được đóng như bug đã tái hiện/pass trên điện thoại.

**Xử lý một phần:** UX-007 (Next/Done ở Auth/Settings; Plan/Schedule có Done, chưa chain toàn form), UX-009 (hint/format, chưa có picker), UX-020 (chat image/header), UX-021 (bottom inset Plan, dialog), UX-024 (CTA lộ trình), UX-034 (scope reminder), UX-041/042/046/047 (chỉ vùng control đã sửa), UX-075 (test contrast call-site; chưa có native QA).

**UX-055:** đã sửa source và có test catalog usable khi API phụ pending/fail, retry chỉ nguồn tương ứng. Chưa chạy mạng thật/Android; logic API/fetch vẫn giữ nguyên.

### Kiểm thử cuối

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript toàn dự án | PASS, không diagnostics |
| Lint file thay đổi và primitive/test mới | 17 errors / 5 warnings baseline; 0 diagnostic mới theo file/rule/severity/count |
| Full offline suite | 203/204 PASS; 1 FAIL có sẵn ở Home/vocabulary-schedule |
| Regression UI mới | 12/12 PASS (bao gồm trong full suite) |
| `git diff --check` | PASS |
| Manifest / package-lock / staged diff | Không đổi / không đổi / rỗng |
| Android / IME / font scaling / TalkBack | CHƯA CHẠY — không có thiết bị kết nối |

Lỗi test có sẵn: `tests/vocabulary-schedule.test.cjs:70`, case `Home shows separate vocabulary tasks even after the Reading task is complete`, gọi `TodayStudySessionCard` bằng `undefined` thay vì props object. Đã chạy lại đúng case từ **test + harness ở HEAD**, với TodayStudySessionCard và test file không có diff: tái hiện cùng lỗi destructuring children. Evidence `.expo/ui-ux-implementation/home-baseline-proof.txt`; không sửa Home/business logic hoặc làm yếu assertion. Test còn lại trong suite vocabulary-schedule pass (4/5).

Artifacts offline (Git ignored): `.expo/ui-ux-implementation/lint-g0.json`, `lint-g1.json`, `lint-g2.json`, `lint-final.json`, `tests-g1.txt`, `tests-g2.txt`, `tests-final.txt`, `home-baseline-proof.txt`. Lint baseline ban đầu là 29 errors/9 warnings toàn source/tests; số 17/5 chỉ thuộc tập file đã thay đổi, không phải tổng dự án đã giảm.

### File thay đổi (35)

30 source UI/theme:

```text
src/components/ui/FormScrollView.tsx (mới)
src/components/ui/DialogContent.tsx (mới)
src/components/ui/AppButton.tsx
src/components/ui/AppInput.tsx
src/components/ui/BrandedPageState.tsx
src/theme/palettes.ts (chỉ minHeight auth form; không đổi màu)
src/app/(tabs)/_layout.tsx
features/auth/components/AuthScaffold.tsx
features/auth/screens/LoginScreen.tsx
features/auth/screens/RegisterScreen.tsx
features/settings/components/SettingsTextField.tsx
features/settings/entries/SET03Entry.tsx
features/settings/entries/SET04Entry.tsx
features/settings/entries/SET05Entry.tsx
features/settings/screens/SettingsScreen.tsx
features/ai/components/AiComposer.tsx
features/ai/components/AiMessageList.tsx
features/ai/screens/AiTutorScreen.tsx
features/home/components/RecentStudyTimeCard.tsx
features/study/components/GuestPracticeNotice.tsx
features/study/components/GuestResultDetails.tsx
features/study/screens/FullTestScreen.tsx
features/study/screens/ListeningPartScreen.tsx
features/study/screens/ReadingPartScreen.tsx
features/study/screens/StudyPlanSetupScreen.tsx
features/study/screens/StudyScreen.tsx
features/study/screens/TestOverviewScreen.tsx
features/study/session/StudySessionScreen.tsx
features/vocabulary/screens/VocabularyScheduleScreen.tsx
features/vocabulary/screens/VocabularyTaskReviewScreen.tsx
```

4 test/harness và báo cáo:

```text
tests/helpers/guest-runtime.cjs
tests/settings-reminder.test.cjs
tests/selected-parts.test.cjs
tests/mobile-ui-ux.test.cjs (mới)
docs/MOBILE_UI_UX_IMPLEMENTATION.md (mới)
```

### Còn chưa giải quyết

- G0 native reproduction và gate nghiệm thu G1/G2 còn mở; không có screenshot/video hoặc device/build khớp source. Không tạo APK/OTA để vượt giới hạn được duyệt.
- UX-008 field-specific errors/focus tới validation error; UX-011 dirty state/discard của Profile/Password; Next chain đầy đủ ở Plan/Schedule; picker ngày/giờ.
- Modal đã có đường cuộn toàn thân; chưa chuẩn hóa focus vào title/restore về trigger (UX-051), chưa đo TalkBack hoặc action reachability font 2.0. Các modal lookup/question sheet ngoài tập đã sửa cần review ở G5.
- UX-013 Reading hai pane, UX-016 preview 100 từ, UX-017 flashcard và UX-018 mode chips còn nguyên, dành cho G3/G5/G7. Không dùng kết quả dialog test để kết luận các vấn đề đó đã sửa.
- Catalog vẫn giữ thứ tự section hiện tại; UX-028 hierarchy tổng thể chưa triển khai. Home UX-027/056, Guest vocabulary UX-079 và các vấn đề G3–G8 còn lại chưa thuộc đợt này.
- AI gửi lại/ảnh/auto-scroll và bảo toàn draft mới (UX-059/060/077/078) chưa sửa; không đổi handler chat trong lane này.
- Lint baseline và test Home cũ cần lane sửa/rà riêng. Không tắt rule, không đổi business hooks để làm xanh kiểm thử.

### Màn hình cần kiểm thử Android trực tiếp

| Luồng | Thao tác và tiêu chí |
| --- | --- |
| Login/Register | Gboard/Samsung, username Next → password, reveal/autofill, Done, lỗi và một lần bấm Login/Google/Guest; đăng ký thấy unavailable trước khi nhập |
| Settings/Profile/Password/Reminder | Focus ô cuối với IME; Next/Done/reveal; cuộn tới error/save; save một lần; thu gọn/mở editor giữ draft hiện tại; save/register riêng; logout giữ confirmation/order |
| Study Plan/Vocabulary Schedule | 320/360 dp, đủ 7 ngày wrap đúng thứ tự, checked TalkBack; quiet-end/duration và Save reachable; number/text keyboard; payload ngày/giờ không đổi |
| AI | Chat mới và có lịch sử, IME mở/đóng, grid gợi ý cuộn, multiline input và Send còn thấy; Back đầu đóng IME, tab quay lại bình thường; ảnh hẹp và user bubble hai theme |
| Overview/Full Test | Guest thấy giới hạn trước bắt đầu; chọn Part vẫn hoạt động; account Full Test, timer/audio/nộp không thay đổi |
| Reading/Listening/Full Test | Confirm, result Guest/User, question sheet, partial failure, error dài: cuộn được đến mọi action; busy/Back/close đúng cũ |
| Session/Vocabulary review/Goal | End sheet 3 lựa chọn, error dài; goal range/step cũ; title đủ contrast, stepper wrap, cuộn tới Hủy/Lưu |
| Page state | Compact và overlay text dài ở màn thấp/chữ lớn; không đẩy retry/close ra ngoài vùng cuộn |

Ma trận chung: 320×568, 360×640, 393×851/412×915 dp; font 1/1.5/2, display lớn, light/dark/system, gesture/3-button, nonzero safe insets, API/OS và IME thật được ghi lại. Cần kiểm cả startup Guest/User, tab, Android Back theo K1–K4/V1/C1/A1/N1 trong audit. Không đăng nhập/gửi API mutation ngoài tài khoản test được cho phép.

### Đề xuất tiếp theo

Ưu tiên hoàn tất native QA cho đợt này trên development build có thể đối chiếu đúng source. Sau đó tiếp tục **G3**: Study Plan/Schedule copy + trường ngày giờ + preview bộ từ/Session, giữ reminder/timezone serialization; rồi **G4**: hierarchy Home/catalog/history. Tách UX-013/flashcard, accessibility focus và lint/test baseline thành các hạng mục có evidence riêng.

Git cuối đợt vẫn branch/HEAD nền, toàn bộ thay đổi chưa stage/chưa commit. Không sửa repository gốc/Backend, không build/install/publish hoặc thay dependency contract.

## Bổ sung Android và chuẩn bị commit — 08/11/2026

Phần trên là snapshot bàn giao G1/G2 trước khi có thiết bị. Kết quả mới dưới đây thay thế trạng thái “chưa có Android” trong phạm vi đã quan sát. Người dùng yêu cầu dừng kiểm thử giao diện và đã cho phép **commit/push** trên chính branch `feature/mobile-ui-ux-improvements`; chưa cho phép build hoặc OTA.

### Nguyên nhân Loading và cấu hình development

- AVD thực tế tên `Pixel_8`, system image Android API 35, serial `emulator-5554`; development build đã cài sẵn `com.dohoainho.englishpractice`, 1.0.0, x86_64/debuggable. Tái sử dụng build hiện có, không build/cài APK.
- Bundle cache cũ thuộc repository Mobile gốc, chứa API base URL là IP LAN cũ; dev-client intent cũng trỏ Metro ở IP cũ. IP host đã đổi. Log của request `/identity/user/my-info` có `status: null`, session giữ `loading`; đây là lỗi kết nối trước khi nhận HTTP response, không phải kết luận JWT sai.
- Khi đổi sang Metro từ đúng worktree và API host truy cập được: `my-info 401 → refresh 200 → my-info 200 → authenticated`. Sau đó reload/cold restart qua LAN: `my-info 200 → authenticated → Home`. Access/refresh token được giữ và chỉ được app refresh theo luồng sẵn có; không đọc giá trị token, clear storage, bỏ auth gate hoặc sửa Authentication.
- Gateway 9999, Identity 8080, Exam 8081 đang chạy; 8082 thuộc Notification nên dùng Metro **8083**, không chiếm port Backend. App nhận response 200 từ Gateway cho Identity và dữ liệu Study/Home, chứng minh đường emulator → Gateway hoạt động. Không cần sửa Backend hoặc thu log chứa credentials.
- Theo yêu cầu dùng chung emulator/điện thoại, cấu hình API chính nằm trong `.env` riêng worktree: `EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN-HOST>:9999/api`. Đã bỏ API override ở `.env.development.local`; không hardcode IP vào business code. Cả hai thiết bị cần cùng LAN và port host truy cập được. Samsung chạy **development build** mới dùng Metro/.env; APK preview đã cài không đọc file này tức thì.
- `.env`, `.env.development.local`, script chạy Metro và artifacts đều Git ignored. Không đưa IP cá nhân/config local vào commit, không thay EAS environment/channel. Script local `.expo/ui-ux-implementation/start-ui-ux.ps1` đọc IP trong `.env`, dùng cùng IP để advertise Metro, chạy offline CLI nhưng vẫn gọi Backend local; không build, install hoặc publish.

### Sửa bổ sung từ bằng chứng native

- `FormScrollView.tsx`: thêm `KeyboardViewport` đo `measureInWindow`, dùng top thực tế làm `keyboardVerticalOffset` thay vì 0. Trên Pixel, trước sửa ô xác nhận mật khẩu bị che một phần do thiếu offset safe area; sau sửa ô nằm đầy đủ trên IME. Áp dụng cùng wrapper cho AI composer; phép đo cũng bao gồm banner phiên học phía trên form. Không thay handler submit/validation/persistence.
- AI suggestions: sửa thiếu sót của G1 — chat mới đã có một message greeting nên `ListEmptyComponent` không hiện gợi ý. Chuyển sang footer cuộn của list, giữ điều kiện `canShowSuggestions` và prompt/callback cũ. Native cold reload xác nhận đủ 4 gợi ý trở lại. Thêm test với state greeting thực của hook.
- So với 35 file trước khi QA, chỉ bổ sung sửa ở `FormScrollView.tsx`, `AiTutorScreen.tsx`, `AiMessageList.tsx`, `tests/mobile-ui-ux.test.cjs`, cùng cập nhật báo cáo này. Bảo toàn mọi thay đổi G1/G2 còn lại.

### Phạm vi đã quan sát trên emulator

| Hạng mục | Kết quả / giới hạn |
| --- | --- |
| Startup/session recovery | PASS: Home sau refresh token tự nhiên và cold restart, không clear data |
| Settings/Profile/Password | Mở được, field/reveal/CTA hiển thị; Password focus với Gboard phát hiện và sửa offset. Không gửi đổi hồ sơ/mật khẩu |
| Reminder | Tóm tắt và editor 3 trường, nút Lưu/đăng ký riêng hiển thị. Không lưu lịch hoặc đăng ký push |
| Study Plan | Đã mở/cuộn; tại 320×568 dp, font 1.5, dark mode, đủ 7 ngày wrap trong chiều ngang. Không lưu hoặc đổi kế hoạch |
| Vocabulary Schedule | Chọn một từ cục bộ, mở form ngày/giờ/phút và cuộn thấy nút lưu; quay lại không tạo task. Không gửi save |
| AI Chat | Mở được, 4 gợi ý hiển thị sau sửa, composer có vùng cuộn. Không gửi text/ảnh. Chưa nghiệm thu đủ mọi biến thể IME/history |
| Study Catalog/Overview | Tải dữ liệu thật, cuộn và mở chi tiết đề được. Failure/pending từng API phụ được kiểm bằng offline regression, không gây lỗi Backend thật |
| Full Test | Overview hiển thị nút. Auto-review chặn thao tác mở Full Test vì có thể khôi phục/bắt đầu phiên/draft cũ. Không bypass, không mở bằng đường khác; native intro/submit chờ người dùng test |
| Login/Register/Guest | Auth route redirect tài khoản đang đăng nhập về Home; không logout/xóa token để test. Chỉ có offline regression, chưa nghiệm thu native Guest/Login |
| Dialog/TalkBack/Samsung | Chưa hoàn tất nghiệm thu; người dùng tiếp nhận tự test |

Gboard trong AVD có chế độ viết tay và bàn phím nổi; không suy `mInputShown=true` là đã có bàn phím docked che đáy màn. Ảnh Password là trường hợp bàn phím đầy đủ đã quan sát; các trường khác ghi đúng mức kiểm tra layout/focus, không nhận là pass tất cả IME. Sau thử viewport/font/night, đã khôi phục emulator về physical 1080×2400, density 420 (~411 dp), font 1.0, night mode no. Không đổi timezone hoặc cài keyboard mới.

Ảnh/XML và log redacted được giữ cục bộ trong `.expo/ui-ux-implementation/`: `home-restored`, `home-lan`, `home-cold-recovery`, `password-focus`, `password-ime-fixed`, `plan-small-days`, `plan-small-entry`, `ai-final`, `reminder-final-summary`, `reminder-editor-final`, `study-catalog-final`, `overview-opened`, `vocabulary-schedule-final`, `schedule-save-visible`. Log auth chỉ chứa allowlist diagnostic, không chứa token. Windows screenshot helper không capture được cửa sổ ngoài vùng monitor; dùng ADB screencap/UI dump trực tiếp cho Android.

### Samsung và cập nhật sau push

- Samsung chưa xuất hiện trong danh sách ADB, nên chưa xác minh build/update đang chạy trên chính máy thật.
- Đã đọc artifact local `installed-EnglishPractice.apk`: SHA-256 `8B8BE1F392D098B27F1ED9B5A8DA3CD6C68E1DA7D60DA1A6FDA56F99BAAAEB4E`, package `com.dohoainho.englishpractice`, version/runtime `1.0.0`, SDK 57, channel `preview`, có ARM ABIs, không có DevLauncher. Đây là bằng chứng của artifact, không tự chứng minh OTA hiện tại trên Samsung.
- Development APK x86_64 trên emulator không phải APK để cài Samsung. Không cài đè preview: package trùng có thể khác chữ ký và ảnh hưởng dữ liệu; cần phương án build development ARM/package riêng được duyệt nếu muốn Metro trên điện thoại.
- Với preview hiện có, commit/push chỉ cập nhật Git; Samsung cần OTA tương thích hoặc APK mới được người dùng duyệt. Đợt này chỉ đổi JS/UI, không thêm native dependency; vẫn phải đối chiếu runtime/build thật trước publish. Tài liệu [runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/) và [channels](https://docs.expo.dev/eas-update/deployment/) mô tả ranh giới đó.
- Channel kiểm thử riêng không tự làm APK đang gắn `preview` nhận update. Không repoint preview sang nhánh test; cần binary gắn channel riêng hoặc cơ chế override/surfing đã có trong app. Source hiện không có UI chuyển channel; không tự thêm override hay tắt anti-bricking để thử.
- Khi người dùng muốn Codex đọc máy thật: kết nối USB, bật USB debugging và tự chấp nhận RSA trên Samsung, rồi gửi kết quả `adb devices -l`. Mọi lệnh tiếp theo phải có `adb -s <SERIAL-SAMSUNG>`; không dùng `adb install` không serial.

### Kiểm tra cuối trước commit

- TypeScript toàn dự án: PASS; `git diff --check`: PASS.
- Lint 34 source/test file của đợt này: 17 errors / 5 warnings baseline, **0 diagnostic mới**.
- Full offline regression: **206/207 PASS**; 1 test Home cũ vẫn lỗi thiếu props như bằng chứng baseline trước đó. UI regression mới/tăng cường **15/15 PASS** (thêm 2 case offset Android/iOS, 1 case greeting + suggestions).
- Người dùng yêu cầu dừng QA giao diện; không tiếp tục thao tác thiết bị. Không OTA/EAS Build/APK, không đổi branch/worktree hoặc Backend.
