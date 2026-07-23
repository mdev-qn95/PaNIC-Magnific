-- Storage cho ảnh nền + poster (Phase 2)
-- Chạy trong Supabase SQL Editor (sau schema.sql). Nếu hiện dialog RLS → "Run without RLS"
-- không áp dụng ở đây vì đây là policy cho storage.objects (bảng có sẵn của Supabase).

insert into storage.buckets (id, name, public)
values ('magnific', 'magnific', true)
on conflict (id) do nothing;

-- Bucket public: đọc qua public URL. Các policy dưới cho phép anon upload/sửa/xóa
-- trong bucket này (app nội bộ giáo xứ — sẽ siết lại khi thêm đăng nhập).
create policy "magnific_read" on storage.objects
  for select using (bucket_id = 'magnific');

create policy "magnific_insert" on storage.objects
  for insert with check (bucket_id = 'magnific');

create policy "magnific_update" on storage.objects
  for update using (bucket_id = 'magnific');

create policy "magnific_delete" on storage.objects
  for delete using (bucket_id = 'magnific');
