-- Đáp Ca + Tung Hô Tin Mừng (Phase 3+, thư viện phụng vụ theo mùa)
-- Chạy trong Supabase SQL Editor. Nếu hiện dialog RLS → "Run without RLS".

create table responsorials (
  id uuid primary key default gen_random_uuid(),
  season text not null,              -- 'vong'|'giang_sinh'|'chay'|'phuc_sinh'|'thuong_nien'|'le_trong'|'cac_thanh'|'phu_truong'
  occasion text not null,            -- dịp lễ: 'Chúa nhật II Thường Niên năm A', 'Thứ 2-1 (Năm lẻ)', 'Ngày 25-1 — Thánh Phao-lô...'
  psalm_response text not null,      -- câu đáp (đáp ca)
  gospel_acclamation text,           -- câu tung hô Tin Mừng (Alleluia)
  slides jsonb not null,             -- render sẵn: [{ title, lines: string[] }]
  sort_order int not null default 0, -- giữ đúng thứ tự phụng vụ
  created_at timestamptz default now()
);

create index on responsorials (season, sort_order);

-- App nội bộ giáo xứ dùng anon key (giống các bảng khác) — tắt RLS cho đồng bộ.
-- Nếu lỡ bấm "Run and enable RLS" ở popup, dòng này đảm bảo bảng vẫn ghi/đọc được.
alter table responsorials disable row level security;
