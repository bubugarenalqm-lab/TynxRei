export const PROMPTS = [
  "Điều nhỏ nào hôm nay khiến bạn mỉm cười?", "Khoảnh khắc nào của hai bạn gần đây bạn muốn giữ mãi?", "Một điều bạn biết ơn ở người ấy hôm nay là gì?",
  "Bạn nhớ nhất điều gì ở lần đầu hai người gặp nhau?", "Một món ăn bạn muốn nấu hoặc ăn cùng người ấy?", "Bài hát nào làm bạn nghĩ đến hai người?",
  "Nơi nào bạn muốn cùng người ấy đến vào mùa tới?", "Điều gì người ấy làm mà bạn thấy rất dễ thương?", "Hôm nay bạn cần được người ấy giúp điều gì?",
  "Một thói quen nhỏ của hai người mà bạn yêu?", "Bạn muốn hai người cùng học điều gì mới?", "Một lời cảm ơn bạn chưa kịp nói?",
  "Ngày cuối tuần lý tưởng của hai bạn trông thế nào?", "Điều gì khiến bạn thấy an toàn khi ở bên người ấy?", "Kỷ niệm nào làm bạn bật cười chỉ vì nghĩ lại?",
  "Một điều bạn tự hào về người ấy?", "Nếu có một ngày rảnh trọn vẹn, bạn muốn làm gì cùng người ấy?", "Điều gì bạn muốn hai người làm nhiều hơn?",
  "Một lần người ấy khiến bạn bất ngờ?", "Mùi hương hay âm thanh nào gợi bạn nhớ đến người ấy?", "Bạn mong điều gì ở một năm nữa?",
  "Một điều nhỏ bạn muốn người ấy biết nhưng chưa nói?", "Bức ảnh nào của hai người bạn thích nhất, vì sao?", "Điều gì giúp bạn bình tĩnh khi ngày dài mệt mỏi?",
  "Một lời hứa nhỏ bạn muốn giữ trong tuần này?", "Điều gì ở thành phố hay nơi bạn sống làm bạn nghĩ đến người ấy?", "Bạn muốn hai người có thói quen buổi sáng nào?",
  "Điều gì người ấy dạy bạn mà bạn không ngờ?", "Một món quà nhỏ không tốn tiền bạn có thể tặng người ấy?", "Hôm nay bạn đã có mặt cho người ấy bằng cách nào?",
];
export const promptFor = (day: string) => PROMPTS[Math.floor(Date.parse(day) / 864e5) % PROMPTS.length];
