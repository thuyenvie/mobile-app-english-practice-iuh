# Lỗi đồng bộ Git trên Windows: SSL backend OpenSSL không được hỗ trợ

Ngày ghi nhận: 28/10/2026. Repo: `mobile-app-english-practice-iuh`. Nhánh: `thuyen`.

## 1. Đây là lỗi gì?

Đây là lỗi cấu hình SSL của Git khi kết nối HTTPS đến GitHub. SSL/TLS là cơ chế bảo vệ kết nối mạng. Git cần một backend SSL tương thích để thực hiện các thao tác như fetch, pull và push.

Lỗi xảy ra trong quá trình đồng bộ Git, không phải lỗi biên dịch hoặc chạy ứng dụng React Native.

## 2. Các thông báo trong log

| Thông báo | Ý nghĩa và mức độ xác minh |
| --- | --- |
| `An Application Control policy has blocked this file` | Windows báo chính sách kiểm soát ứng dụng đã chặn việc tải một file. Log chưa xác định file cụ thể hoặc chính sách nào đã chặn. |
| `Unsupported SSL backend 'openssl'` | Git đang được cấu hình dùng OpenSSL nhưng backend này không khả dụng trong lần chạy đó. |
| `Supported SSL backends: schannel` | Git báo backend khả dụng là Schannel, sử dụng cơ chế TLS của Windows. |
| `remote helper 'https' aborted session` | Thành phần kết nối HTTPS của Git dừng sau lỗi trên. |
| `fatal: not a git repository` | Trong phần log cũ, VS Code kiểm tra các thư mục không chứa repo. FE sau đó đã được nhận diện đúng; thông báo này không phải nguyên nhân của lỗi SSL. |

Lệnh thất bại được ghi lại là:

```text
git pull --tags origin thuyen
```

Vì vậy, log cho thấy thao tác đồng bộ dừng ở bước pull trước khi có bằng chứng push được thực hiện.

## 3. Nguyên nhân đã xác minh

Máy đang dùng Git `2.56.0.windows.3`. Kiểm tra cấu hình cho thấy:

```text
system  file:C:/Program Files/Git/etc/gitconfig  http.sslbackend openssl
```

Cấu hình cấp hệ thống chọn `openssl`, trong khi thông báo lỗi của Git chỉ liệt kê `schannel` là backend được hỗ trợ. Đây là điểm không khớp đã xác minh.

Thông báo Application Control có thể liên quan đến việc tải thư viện, nhưng chưa đủ bằng chứng để kết luận nó chặn thư viện nào hoặc là nguyên nhân duy nhất khiến OpenSSL không khả dụng.

## 4. Cách khắc phục cho từng máy

Mở PowerShell và chuyển đến thư mục repo FE của mình. Ví dụ trên máy gặp lỗi:

```powershell
cd D:\RN\mobile-app-english-practice-iuh
git config --show-origin --show-scope --get-all http.sslBackend
git config --local http.sslBackend schannel
git config --show-origin --get http.sslBackend
```

Kết quả mong đợi của lệnh cuối:

```text
file:.git/config  schannel
```

Lệnh `--local` chỉ áp dụng cho repo hiện tại trên máy đang chạy. Cấu hình nằm trong `.git/config`, không được đưa vào commit và không tự truyền sang máy các thành viên khác. Thành viên chỉ cần áp dụng nếu gặp cùng lỗi và Git của họ hỗ trợ Schannel.

Không cần thay đổi cấu hình toàn hệ thống hoặc tắt chính sách Application Control để áp dụng cách sửa này. Giữ nguyên việc kiểm tra chứng chỉ TLS; không dùng `http.sslVerify false` để xử lý lỗi backend.

## 5. Kiểm tra kết nối và push

Kiểm tra nhánh, trạng thái và kết nối đọc remote trước:

```powershell
git status --short --branch
git ls-remote --heads origin thuyen
```

Nếu lệnh `ls-remote` trả về mã commit và `refs/heads/thuyen`, Git đã đọc được nhánh trên remote. Điều này chưa xác nhận tài khoản có quyền push.

Sau đó push nhánh đã commit:

```powershell
git push origin thuyen
```

Nếu Git báo `non-fast-forward` hoặc `fetch first`, remote có lịch sử cần đồng bộ. Fetch và kiểm tra trước khi tích hợp; không dùng force push để xử lý lỗi SSL:

```powershell
git fetch origin
git log --oneline --left-right HEAD...origin/thuyen
```

## 6. Kết quả kiểm tra trong phiên xử lý

- Đã đặt `http.sslBackend=schannel` ở cấp local của repo FE và đọc lại đúng giá trị.
- Lần kiểm tra `git ls-remote` sau đó báo lỗi kết nối mạng:

```text
Failed to connect to github.com:443
Could not connect to server
```

Lần kiểm tra này không còn báo `Unsupported SSL backend`, nhưng chưa kết nối được đến GitHub trong môi trường chạy lệnh. Chưa đủ bằng chứng để xác định nguyên nhân mạng là firewall, proxy, VPN hay hạn chế của môi trường. Cần chạy lại trong terminal trên máy thành viên để xác nhận.

Nếu vẫn lỗi, gửi nhóm kết quả các lệnh sau cùng thông báo lỗi mới:

```powershell
git --version
git config --show-origin --show-scope --get-all http.sslBackend
git status --short --branch
git ls-remote --heads origin thuyen
Test-NetConnection github.com -Port 443
```

Không gửi token, mật khẩu hoặc URL remote có chứa thông tin đăng nhập.

## 7. Trạng thái mã nguồn tại thời điểm ghi nhận

- Commit FE đã tạo: `fd6dffc` — `feat(study): add guest practice with account-aware sessions`.
- Nhánh FE: `thuyen`.
- Trước khi tạo tài liệu này, working tree sạch và nhánh local đi trước `origin/thuyen` một commit theo dữ liệu remote đang lưu trên máy.
- Chưa xác nhận push thành công. Lỗi kết nối không làm mất commit local.
