-- TÙY CHỌN. XÓA VĨNH VIỄN dữ liệu của các tính năng đã gỡ: chat, hộp thời gian, giấc mơ, bài hát, nhật ký, hộp quà, chuỗi ngày.
-- Ứng dụng vẫn chạy bình thường nếu bạn KHÔNG chạy file này. Chỉ chạy khi chắc chắn không cần dữ liệu cũ.
drop table if exists message_reactions, messages, streak_log, time_capsules, dream_steps, dreams, songs, journal_entries, gift_items, vault_keys cascade;
drop function if exists mark_seen();
drop function if exists mark_delivered();
drop function if exists list_capsules();
