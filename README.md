# Gym Book

Sổ tập tạ chạy hoàn toàn trong trình duyệt. Một file `index.html`, không backend,
không tài khoản. Mọi số liệu nằm trong `localStorage` của máy bạn.

- **Tập** — mở là vào thẳng buổi hôm nay (tự chọn A hay B theo buổi gần nhất).
  Mỗi lần một bài, có thanh tiến độ và dãy chấm để biết đang ở đâu. Tạ và rep điền
  sẵn từ set trước, chỉnh bằng nút −/+, bấm một nút là xong set. Đồng hồ nghỉ tự
  chạy sau mỗi set và rung báo khi hết. Bấm vào set đã ghi để sửa, bấm × để xoá.
  Mỗi bài có ảnh minh hoạ hai khung (tư thế bắt đầu → kết thúc); tự mở sẵn ở
  bài bạn chưa từng tập.
  Phòng đông, máy bận: bấm một bài thay thế ngay dưới tên bài (Bench → đẩy ngực
  tạ tay, Xà → Lat Pulldown…). Bài thay thế có lịch sử tạ riêng nên không làm
  lệch gợi ý của bài chính; buổi sau tự về lại bài chính.
- **Nhật ký** — các buổi đã ghi, nhóm theo tuần, mỗi buổi thu gọn một dòng
  (tên buổi, số bài, số set, tổng khối lượng tạ × rep); bấm để xem chi tiết.
  Tuần đếm từ ngày bắt đầu giáo án (mặc định thứ Hai của tuần đầu), tiêu đề
  tuần ghi rõ khoảng ngày. Ngày bắt đầu không phải thứ Hai thì tab Tôi có nút
  lùi về thứ Hai cho khớp lịch.
- **Tôi** — cân nặng, BMI, mục tiêu calo/đạm (Mifflin–St Jeor), trình sửa chương
  trình, xuất/nhập JSON.

Kèm sẵn một giáo án **đẩy / kéo / chân** cho người từng tập tạ vài năm rồi
nghỉ, mục tiêu tăng cân tăng cơ. Ba buổi xoay vòng, hợp với 5–6 buổi/tuần: mỗi
buổi chỉ quanh một hai khu của phòng tập nên đỡ phải đi tới lui chờ máy. Mức tạ
khởi điểm đặt ở khoảng 65% mức cũ; khối lượng dồn về đùi trước vì đó thường là
nhóm bị bỏ khi tập kiểu chia nhóm cơ. Sửa thoải mái — nó chỉ là dữ liệu khởi
tạo.

Vì không có PT đi kèm, app tự lo mấy việc PT hay nhắc:

- **Tăng tạ** — buổi trước đạt số rep cao nhất ở mọi set thì hôm nay tự gợi ý
  tăng một bước tạ.
- **Khởi động** — danh sách khởi động chung ở bài đầu, và set khởi động tính
  sẵn theo mức tạ chính cho Squat, Bench, Deadlift, OHP.
- **Giãn cơ sau buổi** — xong bài chính hoặc xong buổi thì hiện 5 động tác
  giãn ~5 phút theo buổi Đẩy / Kéo / Chân (tên buổi khác thì dùng bộ chung).
  Mỗi động tác có ảnh minh hoạ. Không bắt buộc, không ghi nhật ký.
- **Cách thở** — dưới nút ghi set luôn có một dòng nhắc thở. Squat, deadlift,
  RDL, bench, OHP: hít căng bụng rồi nín trong rep (kèm lưu ý cho người huyết áp
  cao); bài còn lại: thở ra khi gắng sức, hít vào khi hạ.
- **Bỏ qua set** — dưới nút ghi set có *Bỏ qua set* và *Bỏ qua bài*: set bỏ qua
  vẫn tính vào tiến độ để bài coi như xong, nhưng không vào nhật ký. Bấm × ở
  dòng "đã bỏ qua" để hoàn lại.
- **Bài chính / bài phụ** — bài phụ có viền đứt và nhãn "Phụ". Nút *Ẩn bài
  phụ* ở thanh trên chỉ giữ lại bài chính cho ngày mệt hay phòng đông; xong
  bài chính thì app báo để bạn chọn làm tiếp hay về. Đổi nhãn trong tab Tôi →
  Chương trình.
- **Giữ màn hình sáng** — ở tab Tập màn hình không tự tắt (Screen Wake Lock),
  để xem đồng hồ nghỉ khỏi mở khoá máy. Sang tab khác hoặc ẩn app thì thả ra.
  Tắt được trong tab Tôi; mặc định bật.
- **Nhịp tăng cân** — trong tab Tôi, so các lần cân cách nhau 1–3 tuần và báo
  nên ăn thêm, giữ nguyên hay bớt.

**Giáo án mẫu** (tab Tôi → Giáo án): ngoài Đẩy / Kéo / Chân còn Trên / Dưới
(4 buổi), Trên / Dưới + Đẩy / Kéo / Chân (5 buổi), Toàn thân (3 buổi) và Tối
thiểu (2 buổi, cho tuần bận). Dựng theo các tổng quan nghiên cứu về số set,
tần suất, độ sát hết sức, thời gian nghỉ và bài tập ở tư thế cơ bị kéo dài;
mỗi giáo án hiện số set/tuần cho từng nhóm cơ. Đổi giáo án vẫn giữ nhật ký:
bài đã tập của giáo án cũ được cất lại để tab Nhật ký gọi đúng tên, bài trùng
tên gợi ý tạ theo lần tập gần nhất.

Chương trình có `progVersion`: khi bản mặc định đổi, app tự thay vào nếu bạn
chưa ghi buổi nào; đã tập rồi thì xếp lại các bài theo bản mới nhưng giữ id,
mức tạ và nhật ký của từng bài (khoá nhật ký được đổi theo buổi mới, bài trùng
tên dư ra thì giữ lại và gắn nhãn phụ).

## Cài lên điện thoại

Mở link bằng trình duyệt trên điện thoại rồi thêm vào màn hình chính:

- **iPhone / Safari** — nút Chia sẻ → *Thêm vào MH chính*
- **Android / Chrome** — menu ⋮ → *Cài ứng dụng*, hoặc bấm nút trong tab Tôi

Mở từ icon sẽ chạy toàn màn hình (không thanh địa chỉ) và dùng được cả khi mất
mạng — service worker lưu sẵn trang, icon và font.

## App Android

`android-app/` bọc chính `index.html` bằng [Capacitor](https://capacitorjs.com/),
thêm những thứ bản web không làm được:

- **Báo hết giờ nghỉ khi đã tắt màn hình** hoặc đang ở app khác — thông báo hệ
  thống có rung và chuông, đúng giây (quyền `USE_EXACT_ALARM`).
- **Giữ màn hình sáng** bằng cờ của cửa sổ Android thay cho Wake Lock.
- **Xuất JSON** mở bảng Chia sẻ (Drive, Zalo, email…) vì WebView không tải file.

Dữ liệu của app nằm riêng, không chung với trình duyệt: xuất JSON ở bản web rồi
nhập vào app (tab Tôi → Dữ liệu).

Build APK (cần JDK 21 và Android SDK 36; Java mới hơn thì Gradle 8 không chạy):

```
cd android-app
npm install
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
JAVA_HOME=/đường/dẫn/jdk-21 npm run apk
# → android/app/build/outputs/apk/debug/app-debug.apk
```

`npm run apk` chép bản web mới nhất vào `www/` rồi mới build, nên sửa
`index.html` xong chỉ cần chạy lại lệnh này.

## Chạy local

```
python3 -m http.server 8080
```

## Deploy

Copy `index.html` lên bất kỳ host tĩnh nào.

## Nguồn ảnh

Ảnh động tác trong `img/` (cả bài chính lẫn bài thay thế, 55 động tác) lấy từ
[free-exercise-db](https://github.com/yuhonas/free-exercise-db),
giấy phép **Unlicense** (phạm vi công cộng). Đã thu nhỏ còn 400px và nén để
service worker lưu được cho chế độ offline.
