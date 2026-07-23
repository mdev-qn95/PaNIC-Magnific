-- PaNIC-Magnific — schema (CLAUDE.md mục 5)
-- Chạy trong Supabase SQL Editor, sau đó chạy seed-prayers.sql

-- Bài hát
create table songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  category text not null,          -- 'nhap_le' | 'dap_ca' | 'dang_le' | 'hiep_le' | 'ket_le' | 'duc_me' | 'chau' | 'khac'
  lyrics_raw text not null,        -- lời thô người dùng dán vào
  slides jsonb not null,           -- kết quả auto-chia, đã chỉnh tay: [{ lines: string[], is_chorus: boolean }]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Kinh nguyện
create table prayers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content_raw text not null,
  slides jsonb not null,           -- [{ lines: string[] }]
  is_seed boolean default false,   -- kinh có sẵn của app
  created_at timestamptz default now()
);

-- Ảnh nền
create table backgrounds (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,      -- Supabase Storage
  season text,                     -- 'vong' | 'giang_sinh' | 'chay' | 'phuc_sinh' | 'thuong_nien' | null
  feast_tag text,                  -- 'duc_me' | 'tu_dao_vn' | 'thanh_gia' | ... (tùy chọn)
  focal_x real default 0.5,        -- điểm crop 0..1
  focal_y real default 0.5,
  created_at timestamptz default now()
);

-- Thánh lễ
create table masses (
  id uuid primary key default gen_random_uuid(),
  mass_date date not null,
  title text not null,             -- ví dụ 'Chúa Nhật XV Thường Niên B'
  liturgical_color text not null,  -- 'xanh' | 'tim' | 'trang' | 'do' | 'hong'
  poster_path text,                -- ảnh poster riêng của lễ (Storage), nullable
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Các mục trong lễ (thứ tự = position)
create table mass_items (
  id uuid primary key default gen_random_uuid(),
  mass_id uuid references masses(id) on delete cascade,
  position int not null,
  item_type text not null,         -- 'poster' | 'song' | 'prayer' | 'responsorial' | 'blank' | 'custom'
  ref_id uuid,                     -- songs.id / prayers.id / responsorials.id (null với poster/blank/custom)
  custom_slides jsonb,             -- với item_type='custom': [{ lines: string[] }]
  background_id uuid references backgrounds(id),  -- nền riêng cho mục này, null = nền theo mùa
  overrides jsonb default '{}'     -- ví dụ: bỏ bớt slide, đổi cỡ chữ riêng mục này
);

create index on mass_items (mass_id, position);

-- Cài đặt giáo xứ (1 dòng duy nhất)
create table settings (
  id int primary key default 1 check (id = 1),
  parish_name text default '',
  diocese text default '',
  theme text default 'dx',              -- 'dx' | 'tl'
  max_lines_landscape int default 4,
  max_lines_portrait int default 6,
  ascension_on_sunday boolean default true,
  tu_dao_on_sunday boolean default true,
  updated_at timestamptz default now()
);

insert into settings (id) values (1) on conflict do nothing;
