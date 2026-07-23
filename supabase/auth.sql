-- ============================================================
-- Đăng nhập + phân quyền (chạy trong Supabase SQL Editor)
--
-- Nguyên tắc: MỌI NGƯỜI đọc được (không cần đăng nhập) — ca đoàn mở app là
-- dùng ngay. Chỉ tài khoản role='admin' mới GHI được xuống DB.
-- Hàng rào đặt ở tầng database (RLS), không phải chỉ ẩn nút trên giao diện.
--
-- TRƯỚC KHI CHẠY: tạo tài khoản admin ở Authentication → Users → Add user
-- (nhớ tick "Auto Confirm User"). Sau đó sửa email ở BƯỚC 6 bên dưới.
-- ============================================================

-- 1. Bảng hồ sơ người dùng ------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles_read_self" on profiles;
create policy "profiles_read_self" on profiles
  for select using (auth.uid() = id);

-- 2. Hàm kiểm tra admin ---------------------------------------
-- SECURITY DEFINER để không bị đệ quy RLS khi policy khác gọi hàm này.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 3. Tự tạo hồ sơ (role='user') khi có người đăng ký ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. RLS cho các bảng dữ liệu ---------------------------------
-- Đọc: tất cả. Ghi (thêm/sửa/xóa): chỉ admin.
do $$
declare t text;
begin
  foreach t in array array['songs', 'prayers', 'responsorials', 'backgrounds', 'masses', 'mass_items', 'settings']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t || '_read_all', t);
    execute format('drop policy if exists %I on %I', t || '_write_admin', t);
    execute format('create policy %I on %I for select using (true)', t || '_read_all', t);
    execute format(
      'create policy %I on %I for all using (public.is_admin()) with check (public.is_admin())',
      t || '_write_admin', t
    );
  end loop;
end $$;

-- 5. Storage: đọc công khai, ghi chỉ admin --------------------
drop policy if exists "magnific_read" on storage.objects;
drop policy if exists "magnific_insert" on storage.objects;
drop policy if exists "magnific_update" on storage.objects;
drop policy if exists "magnific_delete" on storage.objects;

create policy "magnific_read" on storage.objects
  for select using (bucket_id = 'magnific');
create policy "magnific_insert" on storage.objects
  for insert with check (bucket_id = 'magnific' and public.is_admin());
create policy "magnific_update" on storage.objects
  for update using (bucket_id = 'magnific' and public.is_admin());
create policy "magnific_delete" on storage.objects
  for delete using (bucket_id = 'magnific' and public.is_admin());

-- 6. ⚠️ ĐỔI EMAIL DƯỚI ĐÂY thành email tài khoản admin của bạn --
insert into profiles (id, email, role)
select id, email, 'admin' from auth.users
where email = 'doi-thanh-email-cua-ban@example.com'
on conflict (id) do update set role = 'admin';

-- Kiểm tra: phải thấy 1 dòng role = admin
select email, role from profiles;
