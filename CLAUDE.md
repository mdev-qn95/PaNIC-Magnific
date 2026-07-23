# CLAUDE.md — PaNIC-Magnific ("Phụng Vụ Slides")

> Tài liệu handoff cho Claude Code. Đọc toàn bộ file này trước khi viết dòng code đầu tiên.
> Ứng dụng trình chiếu thánh lễ cho giáo xứ: thay thế PowerPoint, tự sinh slide bài hát/kinh nguyện, hỗ trợ tivi ngang & dọc, có Presenter View như PowerPoint.

---

## 1. Tổng quan dự án

**Vấn đề:** Mỗi thánh lễ phải soạn slide thủ công (tìm ảnh poster, gõ lời bài hát, kinh nguyện) rất tốn thời gian; cần bản quyền Office; tivi trong nhà thờ đặt dọc còn tivi phòng họp đặt ngang nên phải soạn 2 bản.

**Giải pháp:** Web app chạy trên PC (nối tivi qua HDMI, chế độ Extend display):
- Thư viện nội dung nhập một lần dùng mãi: bài hát, kinh nguyện, ảnh nền theo mùa phụng vụ.
- Soạn lễ bằng kéo-thả, slide bài hát **tự sinh** từ lời trong thư viện.
- Trình chiếu 2 cửa sổ: cửa sổ fullscreen trên tivi + cửa sổ điều khiển (Presenter View) trên laptop.
- Layout tự thích ứng tivi ngang/dọc.
- Lịch phụng vụ Công giáo tích hợp: chọn ngày → biết mùa, màu lễ phục, gợi ý ảnh nền.

**Người dùng:** Người phụ trách phụng vụ/ca đoàn của giáo xứ. Không phải dân kỹ thuật → UI phải cực kỳ đơn giản, tiếng Việt 100%.

**KHÔNG làm (đã quyết định loại bỏ):**
- ❌ Import từ file PowerPoint (.pptx) cũ
- ❌ Highlight đoạn đang hát trên slide
- ❌ Bản in / Xuất PDF (route `/print/[id]`) — loại bỏ 07/2026, không cần thiết

---

## 2. Tech stack

| Thành phần | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Giống PaNIC-Aurora |
| Styling | Tailwind CSS | Design tokens ở mục 6 |
| Database + Storage | Supabase (Postgres + Storage cho ảnh nền) | |
| Offline | Service Worker (PWA) + IndexedDB (Dexie.js) | Nút "Tải lễ để chiếu offline" |
| Sync 2 cửa sổ | **BroadcastChannel API** | Không cần server, xem mục 7 |
| Kéo thả | @dnd-kit/core | |
| Deploy | Vercel | Nhưng phải chạy tốt khi mất mạng (xem mục 9) |
| Font | Be Vietnam Pro (UI + lời hát); display theo theme: Baloo 2 (Đồng Xanh) / Fraunces (Tĩnh Lặng) | Google Fonts, self-host để offline |

---

## 3. Kiến trúc trình chiếu 2 cửa sổ (Presenter View)

```
┌─────────────────────────┐         ┌─────────────────────────┐
│  LAPTOP (màn hình 1)    │         │  TIVI (màn hình 2, HDMI) │
│  /present/[id]/control  │ ──────► │  /present/[id]/screen    │
│                         │ Broadcast│                          │
│  • Slide đang chiếu     │ Channel │  Fullscreen (F11)        │
│  • Preview next/prev    │         │  Chỉ hiển thị slide      │
│  • Lưới tất cả slide    │         │  hiện tại                │
│  • Đồng hồ, phím tắt    │         │                          │
└─────────────────────────┘         └─────────────────────────┘
```

**Luồng sử dụng:** Mở lễ → bấm "Bắt đầu trình chiếu" → app `window.open('/present/[id]/screen')` → người dùng kéo cửa sổ mới sang tivi, bấm F11 (có màn hình hướng dẫn kèm hình minh họa lần đầu dùng).

**Protocol message (BroadcastChannel, channel name = `magnific-{massId}`):**

```ts
type PresentMessage =
  | { type: 'GOTO'; index: number }
  | { type: 'NEXT' } | { type: 'PREV' }
  | { type: 'BLACK'; on: boolean }        // đèn đen khi cha giảng
  | { type: 'REQUEST_STATE' }              // screen mới mở xin state
  | { type: 'STATE'; index: number; black: boolean };
```

**Phím tắt (cửa sổ điều khiển):** `→`/`Space`/`PageDown` = tiếp, `←`/`PageUp` = lùi, `B` = đèn đen bật/tắt, `Home`/`End` = đầu/cuối, gõ số + `Enter` = nhảy tới slide.

Cửa sổ screen cũng nhận phím (trường hợp chỉ dùng 1 màn hình Duplicate) nhưng cửa sổ control là nơi điều khiển chính.

---

## 4. Danh sách màn hình (13 màn hình)

### Nhóm A — Trang chủ & soạn lễ
| # | Route | Màn hình | Mô tả |
|---|---|---|---|
| 1 | `/` | Trang chủ | Lễ sắp tới (theo ngày), nút "Soạn lễ mới", "Nhân bản lễ gần nhất". Hiển thị mùa phụng vụ hiện tại + màu lễ phục hôm nay. |
| 2 | `/masses` | Danh sách lễ | Tất cả lễ đã soạn, lọc theo tháng, nhân bản / xóa / xuất gói. |
| 3 | `/masses/new` & `/masses/[id]/edit` | **Trình soạn lễ** (màn hình quan trọng nhất) | Chọn ngày → app tự điền tên lễ + màu phụng vụ từ lịch. Cột trái: cấu trúc lễ (kéo-thả các mục: Poster, Bài hát, Kinh, Slide trống, Slide tùy chỉnh). Cột phải: preview slide của mục đang chọn (toggle ngang/dọc). Thêm bài hát = search trong thư viện. Upload ảnh poster riêng cho lễ này. |
| 4 | `/masses/[id]/preview` | Xem trước toàn lễ | Lưới toàn bộ slide đã render, toggle ngang/dọc, nút "Bắt đầu trình chiếu" và "Tải để chiếu offline". |

### Nhóm B — Thư viện nội dung
| # | Route | Màn hình | Mô tả |
|---|---|---|---|
| 5 | `/songs` | Thư viện bài hát | Search theo tên/tác giả, lọc theo thể loại (Nhập lễ, Đáp ca, Dâng lễ, Hiệp lễ, Kết lễ, Đức Mẹ, Chầu…). |
| 6 | `/songs/new` & `/songs/[id]/edit` | Soạn bài hát | Textarea dán lời thô → **auto-chia slide** (mục 8) → preview các slide bên phải, chỉnh tay được điểm ngắt. Đánh dấu điệp khúc bằng dòng bắt đầu `ĐK:`. |
| 6b | `/responsorials` | **Đáp Ca - Tung Hô Tin Mừng** | Thư viện phụng vụ theo mùa (789 mục, nhập từ `doc/Đáp Ca - Tung hô tin mừng/`). Lọc theo mùa, tìm kiếm, xem 2 slide (Đáp ca + Tung hô). Chỉ tra cứu — không sửa trong app. |
| 7 | `/prayers` | Thư viện kinh nguyện | Có sẵn seed data: Kinh Lạy Cha, Kính Mừng, Sáng Danh, Tin Kính, Cáo Mình, Ăn Năn Tội, Lạy Nữ Vương… |
| 8 | `/prayers/new` & `/prayers/[id]/edit` | Soạn kinh | Giống soạn bài hát nhưng không có điệp khúc. |
| 9 | `/backgrounds` | Thư viện ảnh nền | Upload ảnh, gắn tag mùa phụng vụ / lễ trọng, chọn **focal point** (điểm quan trọng của ảnh) để crop đẹp cho cả ngang lẫn dọc. |

### Nhóm C — Trình chiếu
| # | Route | Màn hình | Mô tả |
|---|---|---|---|
| 10 | `/present/[id]/control` | **Presenter View** | Slide đang chiếu (to), next/prev (nhỏ), lưới tất cả slide (click nhảy nhanh), đồng hồ, chỉ báo đèn đen, chỉ báo cửa sổ screen đã kết nối chưa. |
| 11 | `/present/[id]/screen` | Màn hình tivi | Fullscreen, chỉ render slide hiện tại. Tự chọn layout theo `window.innerWidth/Height` (ngang/dọc), có nút gạt ép hướng thủ công. |

### Nhóm D — Khác
| # | Route | Màn hình | Mô tả |
|---|---|---|---|
| 12 | `/settings` | Cài đặt | **Chủ đề giao diện (Đồng Xanh / Tĩnh Lặng — mục 6)**, tên giáo xứ, số dòng tối đa/slide (ngang & dọc riêng), cỡ chữ mặc định, hướng tivi mặc định. |
| 13 | `/share` | Xuất/Nhập gói lễ | Xuất lễ thành file `.magnific.json` (kèm ảnh base64 hoặc link), nhập gói từ giáo xứ khác. |

---

## 5. Database schema (Supabase)

```sql
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
  item_type text not null,         -- 'poster' | 'song' | 'prayer' | 'blank' | 'custom'
  ref_id uuid,                     -- songs.id hoặc prayers.id (null với poster/blank/custom)
  custom_slides jsonb,             -- với item_type='custom': [{ lines: string[] }]
  background_id uuid references backgrounds(id),  -- nền riêng cho mục này, null = nền theo mùa
  overrides jsonb default '{}'     -- ví dụ: bỏ bớt slide, đổi cỡ chữ riêng mục này
);

create index on mass_items (mass_id, position);
```

**Bảng `responsorials`** (Đáp Ca + Tung Hô Tin Mừng — xem `supabase/responsorials.sql`): `season`, `occasion` (dịp lễ dạng chữ), `psalm_response`, `gospel_acclamation`, `slides`, `sort_order`. Là dữ liệu tham chiếu chỉ-đọc trong app; thêm vào lễ qua `mass_items.item_type = 'responsorial'` (`ref_id` → `responsorials.id`, không có FK ràng buộc).

**Gợi ý đáp ca theo ngày lễ** (`lib/responsorials.ts` — `matchesDay`, có unit test):
- Chúa Nhật: mùa + tuần + năm A/B/C
- Ngày thường: thứ + tuần + **năm lẻ/chẵn** (`LiturgicalDay.weekdayCycle`, suy từ `yearNumber` chẵn/lẻ; đổi chu kỳ từ CN I Mùa Vọng)
- Lễ trọng kính Chúa: khớp tên lễ — **chỉ đối chiếu đoạn TÊN LỄ in hoa** (`solemnityName`), vì phần ngữ cảnh kiểu "Chúa nhật sau lễ Chúa Ba Ngôi" từng gây khớp nhầm
- Lễ kính các Thánh: khớp theo ngày dương lịch cố định ("Ngày 25-1")

**Đăng nhập & phân quyền** (`supabase/auth.sql`, `lib/auth.ts`, `components/AuthProvider.tsx`):
- Bảng `profiles(id → auth.users, role)`. Hàm `is_admin()` SECURITY DEFINER (tránh đệ quy RLS).
- **RLS bật trên mọi bảng**: `select using (true)` cho tất cả; `for all` chỉ khi `is_admin()`. Storage cũng vậy.
- **Chỉ admin cần đăng nhập** — ca đoàn mở app là dùng ngay (xem, chiếu, xuất).
- **Người dùng thường soạn lễ vẫn được**: lễ lưu vào IndexedDB (`lib/local-masses.ts`, id có tiền tố `local-`).
  `getMassBundle`/`saveMassSmart`/`deleteMass` tự định tuyến theo tiền tố id; nội dung (bài hát,
  kinh, đáp ca) vẫn đọc từ DB chung. Trang `/masses` gộp cả 2 nguồn, lễ trên máy có nhãn "trên máy".
- ⚠️ Sau khi bật RLS, **script nhập liệu hàng loạt bằng anon key sẽ bị chặn** — phải đăng nhập admin.

**Ảnh poster:** lưu theo TỪNG mục (`mass_items.overrides.poster_path`), không phải cấp lễ —
mỗi mục Poster một ảnh riêng. Vẫn đọc `masses.poster_path` làm dự phòng cho dữ liệu cũ.

**Quan trọng — nhân bản lễ:** copy row `masses` + toàn bộ `mass_items` sang ngày mới, app tự tính lại `title` + `liturgical_color` theo ngày mới.

**Snapshot khi chiếu:** khi bấm "Tải để chiếu offline" hoặc "Bắt đầu trình chiếu", resolve toàn bộ lễ (join songs/prayers/backgrounds) thành một object `MassSnapshot` duy nhất lưu IndexedDB → trình chiếu không phụ thuộc mạng và không bị ảnh hưởng nếu ai đó sửa bài hát giữa chừng.

---

## 6. Design tokens — hệ 2 theme

**Đã chốt (07/2026): dual-theme người dùng tự chọn** — mock tham chiếu trực quan chính thức là `magnific-mockups-v4-dual-theme.html` (12 màn demo, đổi theme trực tiếp bằng nút góc phải trên hoặc trong màn Cài đặt).

| Theme | Cảm hứng | Đặc trưng |
|---|---|---|
| 🌿 **Đồng Xanh** (mặc định) | TV 22 "Chúa là mục tử… đồng cỏ xanh" | Xanh phụng vụ làm màu chính, nền sáng tươi, bo góc lớn, Baloo 2 tròn thân thiện |
| 🏺 **Tĩnh Lặng** | Đất nung, đá ấm, tối giản | Trung tính ấm + accent đất nung, phẳng không đổ bóng, nhiều khoảng thở, Fraunces serif mềm |

**Cơ chế (bắt buộc tuân thủ khi code):**
- Theme = attribute `data-theme="dx" | "tl"` trên `<html>`. Chọn ở `/settings`, lưu localStorage (đọc trước khi render để không nháy theme) + đồng bộ DB.
- Mọi component **chỉ dùng semantic token** (`var(--primary)`, `var(--surface)`…) — cấm hardcode hex trong component. Tailwind map token qua `theme.extend.colors`.
- Theme đổi cả giao diện soạn lễ, Presenter View **và phong cách slide chiếu** (đã quyết định: slide đổi theo theme).
- **Màu phụng vụ của ngày lễ vẫn là accent động** trên slide, giá trị tùy theme (bảng dưới).

```
Token                    🌿 Đồng Xanh (dx)       🏺 Tĩnh Lặng (tl)
--f-display              'Baloo 2'               'Fraunces'
--bg                     #F5F8F3                 #F6F4EF
--surface                #FFFFFF                 #FFFFFF
--surface-2              #EAF2E9                 #EFEBE2
--ink                    #22331F                 #242220
--ink-2                  #66795F                 #6F6A61
--ink-3                  #9AAB93                 #A7A196
--line                   #DCE6D8                 #E7E2D8
--heading                #1F4A2C                 #242220
--primary                #2E7D46                 #B0553B
--primary-hover          #276A3C                 #994A32
--primary-soft           #E4F1E8                 #F4E5DE
--dk-badge               #C9A227 (vàng)          #5E6B54 (sage)
--radius / --radius-2    16px / 12px             14px / 10px

Màn tối (Presenter View + màn tivi):
--pres-bg                #152318 (xanh rừng)     #1C1A16 (nâu than ấm)
--pres-surface           #1F3324                 #26231D
--pres-ink               #E7F0E4                 #EDE9E0
--pres-line              #2C4633                 #38342B
--pres-accent            #5CBF7A                 #D08A6E

Màu phụng vụ (accent động theo lễ):
--lit-xanh               #2E7D46                 #5E7A4E
--lit-tim                #6B3FA0                 #6E5296
--lit-do                 #B3261E                 #B0453A
--lit-trang (vàng)       #C9A227                 #B08A46
--lit-hong               #D77FA1                 #C58AA0
```

**Khác biệt cấu trúc giữa 2 theme** (ngoài token — xử lý bằng CSS scope theo `data-theme`):
- Nav đang chọn: dx = "viên thuốc" nền xanh (border-radius 0 22px 22px 0); tl = vạch mảnh 3px bên trái, không nền.
- Slide mặc định: dx = gradient nhẹ trắng→xanh nhạt, dải phụng vụ 4px; tl = phẳng giấy ấm `#FBFAF6`, dải 3px.
- Topbar: dx = nền surface + viền dưới; tl = trong suốt, tiêu đề lớn hơn.
- Sidebar: dx = nền trắng; tl = trùng nền trang.

**Quy tắc chung cho cả 2 theme:** UI + lời hát/kinh dùng Be Vietnam Pro (sans đọc xa tốt — ưu tiên tuyệt đối cho cộng đoàn); cỡ chữ slide dùng clamp() + auto-fit (mục 8). **Slide có ảnh nền:** overlay đen ~40% + chữ trắng, text-shadow nhẹ — phải đọc được từ cuối nhà thờ. **Signature:** dải màu phụng vụ mảnh chạy dọc cạnh trái slide + viền cùng màu quanh thumbnail trong Presenter View; chip mùa phụng vụ cuối sidebar đổi màu theo mùa.

---

## 7. Layout ngang/dọc

- Component `SlideRenderer` nhận prop `orientation: 'landscape' | 'portrait'` — dùng chung cho: cửa sổ screen, preview trong editor, lưới presenter.
- Cửa sổ screen tự detect: `innerWidth >= innerHeight ? landscape : portrait`, lắng nghe `resize`. Có toggle ép tay trong góc (ẩn sau 3s).
- Khác biệt chính giữa 2 hướng:
  - Ngang: tối đa **4 dòng**/slide (mặc định, chỉnh trong Settings), chữ rộng.
  - Dọc: tối đa **6 dòng**/slide, mỗi dòng ngắn hơn, cỡ chữ lớn hơn tương đối.
- Ảnh nền crop theo `focal_x/focal_y` với `object-fit: cover; object-position: calc(...)` — một ảnh dùng được cả 2 hướng.
- **Auto-chia slide chạy theo hướng**: cùng một bài hát sinh 2 bộ slide (bộ ngang, bộ dọc) từ cùng `lyrics_raw`; snapshot chứa cả hai.

---

## 8. Auto-chia slide lời bài hát (thuật toán)

Input: `lyrics_raw` (text người dùng dán). Quy tắc:

1. Chuẩn hóa NFC, trim, tách khối theo dòng trống (mỗi khối = 1 phiên khúc hoặc điệp khúc).
2. Khối bắt đầu bằng `ĐK:` / `ĐK.` / `Điệp khúc` → đánh dấu `is_chorus: true` (bỏ prefix khỏi nội dung hiển thị, hiện badge "ĐK" nhỏ ở góc slide).
3. Mỗi khối chia thành các slide tối đa `maxLines` dòng (theo hướng, xem mục 7). Ưu tiên ngắt tại dấu chấm/chấm hỏi cuối dòng; không tách đôi một dòng.
4. **Tự lặp điệp khúc:** sau mỗi phiên khúc, chèn lại slide điệp khúc gần nhất phía trên (bật/tắt được per-bài). Nếu người dùng đã tự dán lặp thì detect trùng và không chèn thêm.
5. Người dùng chỉnh tay được trong editor: gộp/tách slide, kéo điểm ngắt — kết quả lưu vào `slides` jsonb, `lyrics_raw` giữ nguyên để chia lại khi đổi settings.

**Auto-fit chữ khi render:** nếu text vẫn tràn khung (dòng quá dài), giảm font-size từng nấc 5% (tối đa 4 nấc) bằng đo `scrollHeight` — không bao giờ để tràn slide.

---

## 9. Offline (PWA)

- Service Worker precache: app shell, fonts, seed prayers.
- Nút **"Tải để chiếu offline"** ở màn preview: resolve `MassSnapshot` (mục 5) + tải toàn bộ ảnh nền của lễ về IndexedDB (blob).
- Route `/present/[id]/*` đọc từ IndexedDB trước, fallback Supabase — nghĩa là ở nhà thờ **mất mạng hoàn toàn vẫn chiếu được**, miễn đã bấm tải trước ở nhà.
- Banner cảnh báo trong Presenter View nếu lễ chưa được tải offline mà mạng đang yếu.

---

## 10. Lịch phụng vụ (tự tính, không cần API)

Module `lib/liturgical-calendar.ts`:

1. **Lễ Phục Sinh:** thuật toán Meeus/Jones/Butcher (Computus) → từ đó suy ra: Thứ Tư Lễ Tro (PS − 46), Lễ Lá (PS − 7), Tam Nhật Thánh, Chúa Thăng Thiên (PS + 39, VN thường dời sang CN kế = PS + 42 → cho chọn trong Settings), Hiện Xuống (PS + 49), Chúa Ba Ngôi, Mình Máu Thánh, Thánh Tâm.
2. **Mùa Vọng:** CN I Vọng = Chúa Nhật thứ 4 trước 25/12. Giáng Sinh → Lễ Hiển Linh → Chúa Chịu Phép Rửa (kết thúc mùa GS).
3. **Thường Niên:** đánh số tuần 2 giai đoạn (sau Chịu Phép Rửa → trước Lễ Tro, và sau Hiện Xuống → CN 34 Kitô Vua). Năm phụng vụ A/B/C = năm chia 3 dư (0=C? kiểm tra: 2026 dư 1... quy ước: bắt đầu Mùa Vọng; năm A khi (năm+1) % 3 == 1 tính từ CN I Vọng — **viết unit test đối chiếu 2025–2028** với lịch Công giáo VN).
4. **Lễ trọng cố định VN quan tâm:** Đức Maria Mẹ Thiên Chúa 1/1, Truyền Tin 25/3, Đức Mẹ Lên Trời 15/8, Các Thánh 1/11, Các Đẳng 2/11, **Các Thánh Tử Đạo Việt Nam 24/11** (VN thường mừng CN gần nhất — cho chọn), Đức Mẹ Vô Nhiễm 8/12.
5. Output: `{ title, season, color, rank }` — điền sẵn vào form soạn lễ, người dùng sửa được (nguồn chân lý cuối cùng vẫn là người dùng, vì lịch giáo phận có thể dời lễ).

⚠️ Đây là phần dễ sai nhất — **bắt buộc viết unit test** cho toàn bộ Chúa Nhật của 3 năm liền, đối chiếu lịch Công giáo Việt Nam.

---

## 11. Lộ trình phát triển

### Phase 1 — MVP chiếu được lễ thật (ưu tiên tuyệt đối)
- [x] Setup Next.js + Supabase + Tailwind + design tokens *(07/2026 — schema + seed sẵn trong `supabase/`, cần điền `.env.local` để kết nối)*
- [x] CRUD bài hát + auto-chia slide (mục 8) + editor chỉnh điểm ngắt *(07/2026 — đã kiểm chứng đầu-cuối với Supabase thật)*
- [x] CRUD kinh nguyện + seed các kinh phổ biến *(07/2026 — 7 kinh seed, nhân bản/xóa đã kiểm chứng)*
- [x] Trình soạn lễ kéo-thả + lịch phụng vụ cơ bản *(07/2026 — chọn ngày tự điền tên+màu, dnd-kit, picker thư viện, đã kiểm chứng đầu-cuối)*
- [x] SlideRenderer ngang/dọc + auto-fit chữ *(container queries, 4 nấc giảm 5%)*
- [x] Trình chiếu 2 cửa sổ: control + screen, BroadcastChannel, phím tắt, đèn đen *(07/2026 — đồng bộ 2 tab đã kiểm chứng; màn dọc render bộ landscape + typography dọc để giữ index đồng bộ, xem ghi chú `lib/present.ts`)*
- [x] Nhân bản lễ *(07/2026 — từ danh sách lễ + nút "Nhân bản lễ gần nhất" trang chủ, tự tính lại tên+màu theo ngày mới)*

### Phase 2 — Xịn hơn PowerPoint
- [x] Thư viện ảnh nền + focal point + tag mùa; template nền tự động theo mùa *(07/2026 — kiểm chứng đầu-cuối: upload Storage, focal point, nền theo mùa tự áp vào slide với crop đúng focal)*
- [x] Upload poster riêng cho lễ *(07/2026 — kiểm chứng: upload trong MassEditor, poster_path lưu DB, slide poster chiếu nguyên ảnh không đè chữ)*
- [x] PWA offline + "Tải để chiếu offline" (MassSnapshot) *(07/2026 — Dexie/IndexedDB đã kiểm chứng; lưu ý: đọc mạng trước với timeout 5s rồi mới fallback IndexedDB — xem lý do trong `lib/offline.ts`)*
- [x] Settings đầy đủ (gồm chọn theme Đồng Xanh / Tĩnh Lặng) *(07/2026 — bảng settings, maxLines nối vào editors, tùy chọn lịch VN nối vào mọi chỗ tính lịch)*

### Phase 3 — Cộng đồng & tiện nghi
- [x] Xuất/nhập gói lễ `.magnific.json` *(07/2026 — kiểm chứng round-trip: export kèm nội dung + ảnh base64, import với 3 lựa chọn xử lý trùng tên)*
- [x] Điều khiển từ điện thoại *(07/2026 — transport hợp nhất BroadcastChannel + Supabase Realtime trong `lib/present-transport.ts`, dedupe bằng envelope id; route `/present/[id]/remote` mobile-first; đã kiểm chứng đồng bộ 2 chiều)*
- [x] Thống kê bài hát hay dùng, gợi ý bài theo mùa *(07/2026 — cột "Dùng gần nhất" ở /songs, picker sort theo tần suất + ⭐ gợi ý theo mùa của lễ đang soạn)*

---

## 12. Quy ước code

- TypeScript strict, không `any`.
- Tiếng Việt trong toàn bộ UI; tên biến/code tiếng Anh.
- Chuẩn hóa mọi text input về Unicode **NFC** trước khi lưu (tiếng Việt gõ từ nhiều bộ gõ khác nhau).
- Component slide (`SlideRenderer`) là **pure component** nhận data + orientation — không tự fetch, để dùng chung mọi nơi.
- Ưu tiên sửa đổi bằng targeted diff, giữ backward compatibility với data đã nhập.
