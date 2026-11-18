# Tyn.fm

Không gian riêng cho hai người (Tyn và Rei), lấy cảm hứng từ My Bibi, chạy trên Next.js + Supabase + Vercel.

## Đã có
Đăng nhập tài khoản + mật khẩu (chỉ 2 tài khoản), trò chuyện thời gian thực (chữ, ảnh, cảm xúc, đã nhận / đã xem, trực tuyến),
Điều nhỏ bé (ngày bên nhau, chuỗi ngày, "đang nghĩ về em/anh", thời tiết tâm trạng tự chọn), giao diện sáng/tối, 5 màu nhấn, cỡ chữ, đổi mật khẩu.

Giai đoạn B: Vườn kỷ niệm (ảnh, tìm kiếm, ngày này năm xưa), Hoa mỗi ngày (câu trả lời chỉ hiện khi cả hai đã trả lời), Câu chuyện của mình.
Giai đoạn C: Hộp thời gian và Thư (niêm phong ở phía database tới ngày mở/giao).

## Thiết lập
1. Supabase > SQL Editor: dán và chạy `supabase/migrations/0001_bibi_setup.sql`. Dòng cuối phải hiện 2 dòng `tyn` và `rei`.
1b. Chạy tiếp `supabase/migrations/0002_memories_bloom.sql`.
1c. Chạy tiếp `supabase/migrations/0003_capsules_letters.sql`.
2. Authentication > Users: hai tài khoản `tyn@tynxrei.example.com` và `rei@tynxrei.example.com` (tick Auto Confirm). Nếu tạo sau khi chạy SQL thì chạy lại file SQL.
3. Authentication > Sign In / Providers > Email: tắt "Allow new users to sign up".
4. Vercel: biến `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
