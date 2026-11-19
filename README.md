# Tyn.fm

Không gian riêng cho hai người (Tyn và Rei), lấy cảm hứng từ My Bibi, chạy trên Next.js + Supabase + Vercel.

## Đã có
Vườn kỷ niệm (ảnh, tìm kiếm, ngày này năm xưa), Hoa mỗi ngày (câu trả lời chỉ hiện khi cả hai đã trả lời), Điều nhỏ bé (ngày bên nhau, "đang nghĩ về em/anh", thời tiết tâm trạng tự chọn),
Câu chuyện, Bản đồ khu vườn, Thư (niêm phong tới ngày giao), **Sheet nhạc** (thư viện lấy từ server của Tyn, đọc nhạc kiểu nốt rơi, nghe thử 6 loại đàn, ghim "bài của mình" kèm ghi chú),
giao diện sáng/tối + 7 màu.

## Thiết lập
1. Supabase > SQL Editor: dán và chạy `supabase/migrations/0001_bibi_setup.sql`. Dòng cuối phải hiện 2 dòng `tyn` và `rei`.
1b. Chạy tiếp `supabase/migrations/0002_memories_bloom.sql`.
1c. Chạy tiếp `supabase/migrations/0003_capsules_letters.sql`.
1d. Chạy tiếp `supabase/migrations/0004_dreams_songs.sql`.
1e. Chạy tiếp `supabase/migrations/0005_vault_capsule_photo.sql`.
1f. Chạy tiếp `0006_our_sheets.sql`. (`0007_cleanup_removed_features.sql` là TÙY CHỌN, xóa vĩnh viễn dữ liệu của chat/nhật ký/… đã gỡ.)
2. Authentication > Users: hai tài khoản `tyn@tynxrei.example.com` và `rei@tynxrei.example.com` (tick Auto Confirm). Nếu tạo sau khi chạy SQL thì chạy lại file SQL.
3. Authentication > Sign In / Providers > Email: tắt "Allow new users to sign up".
4. Vercel: biến `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Kết nối thư viện sheet (biến môi trường phía máy chủ trên Vercel, không có NEXT_PUBLIC_)
`SHEET_SERVER_URL`, `SHEET_LICENSE_KEY` (một key riêng cho web), `SHEET_DEVICE_ID` (chuỗi cố định, từ 8 ký tự), `SHEET_AES_KEY_HEX`,
`SHEET_SHOP_SUPABASE_URL`, `SHEET_SHOP_ANON_KEY`. Kích hoạt key cho web một lần bằng POST /api/license/activate với đúng `SHEET_DEVICE_ID`.
