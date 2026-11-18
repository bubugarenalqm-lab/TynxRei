const SECTIONS: [string, string][] = [
  ["Chúng mình", "Trò chuyện thời gian thực: chữ, ảnh, tệp, tin nhắn thoại, thả cảm xúc. Bạn thấy khi nào tin được gửi, nhận và xem, và khi nào người ấy đang trực tuyến."],
  ["Vườn kỷ niệm", "Lưu lại những khoảnh khắc đáng nhớ kèm ảnh. Có tìm kiếm, và nhắc lại những kỷ niệm của đúng ngày này những năm trước."],
  ["Hoa mỗi ngày", "Mỗi ngày một câu hỏi chung. Câu trả lời của người ấy chỉ hiện ra sau khi bạn cũng đã trả lời."],
  ["Điều nhỏ bé", "Số ngày bên nhau, chuỗi ngày cả hai cùng ghé, cái chạm nhẹ 'đang nghĩ về em/anh', và thời tiết tâm trạng do chính bạn chọn."],
  ["Câu chuyện và Bản đồ khu vườn", "Mọi thứ hai bạn đã giữ lại, xếp theo thời gian. Ở Bản đồ, mỗi thứ là một cây mọc dần từ trái sang phải. Chạm vào để mở."],
  ["Hộp thời gian và Thư", "Niêm phong lời nhắn (và ảnh) tới một ngày trong tương lai. Thư chỉ đến tay người nhận vào đúng ngày giao. Việc giấu nội dung do database đảm nhiệm, không ai mở sớm được."],
  ["Giấc mơ, Bài hát, Sổ lưu niệm", "Bảng những điều muốn cùng làm, danh sách bài hát của hai bạn (nghe ngay tại chỗ với YouTube hoặc Spotify), và sổ lưu niệm tự tổng hợp theo tháng, in ra PDF được."],
  ["Trang của tôi và Hộp quà", "Chỉ mình bạn đọc được. Nội dung được mã hóa ngay trên máy bạn bằng mật khẩu riêng. Máy chủ chỉ giữ dữ liệu đã mã hóa. Nếu quên mật khẩu riêng thì không ai khôi phục được."],
  ["Cam kết", "Ứng dụng không nhắn thay ai, không đọc tâm trạng của người này để báo cho người kia, không chấm điểm mối quan hệ. Nó chỉ nhớ những gì hai bạn chọn giữ lại."],
];
export default function HelpPage() {
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">Trợ giúp</h1>
      <p className="mt-1 text-sm text-muted">Tyn.fm làm gì, và vì sao nó nhẹ nhàng như vậy.</p>
      <div className="mt-6 grid max-w-3xl gap-4">{SECTIONS.map(([t, d]) => (<section key={t} className="rounded-3xl bg-card p-6 shadow-soft"><h2 className="font-display text-2xl">{t}</h2><p className="mt-1 text-sm text-muted">{d}</p></section>))}</div>
      <p className="mt-6 text-xs text-muted">Muốn xem lại phần giới thiệu ban đầu? Xóa dữ liệu trang (site data) của trang này trong trình duyệt.</p>
    </div>
  );
}
