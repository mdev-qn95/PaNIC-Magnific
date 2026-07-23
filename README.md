<div align="center">

# 🕊️ PaNIC‑Magnific — *Phụng Vụ Slides*

**Ứng dụng trình chiếu Thánh lễ cho giáo xứ — thay thế PowerPoint, tự sinh slide bài hát & kinh nguyện.**

Soạn lễ bằng kéo‑thả, chiếu 2 cửa sổ như PowerPoint (Presenter View), tự thích ứng tivi ngang/dọc, và chạy tốt cả khi **mất mạng**.

<br/>

![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-offline-5A0FC8?logo=pwa&logoColor=white)
![Tiếng Việt](https://img.shields.io/badge/Giao%20di%E1%BB%87n-Ti%E1%BA%BFng%20Vi%E1%BB%87t-da291c)

</div>

---

## ✨ Vì sao có ứng dụng này?

> Mỗi Thánh lễ phải soạn slide thủ công (tìm ảnh poster, gõ lời bài hát, kinh nguyện) rất tốn thời gian; cần bản quyền Office; tivi nhà thờ đặt **dọc** còn tivi phòng họp đặt **ngang** nên phải soạn 2 bản.

**PaNIC‑Magnific** giải quyết trọn vẹn:

- 📚 **Thư viện nội dung nhập một lần dùng mãi** — bài hát, kinh nguyện, đáp ca, ảnh nền theo mùa phụng vụ.
- 🖱️ **Soạn lễ bằng kéo‑thả** — slide bài hát **tự sinh** từ lời trong thư viện.
- 🖥️ **Trình chiếu 2 cửa sổ** — màn hình tivi (fullscreen) + màn hình điều khiển (Presenter View) trên laptop.
- 🔁 **Một lần soạn, chiếu cả ngang lẫn dọc** — layout tự thích ứng hướng tivi.
- 📅 **Lịch phụng vụ Công giáo tích hợp** — chọn ngày là biết mùa, màu lễ phục, gợi ý đáp ca.
- 📴 **Chạy offline hoàn toàn** — tải lễ về trước, ở nhà thờ mất mạng vẫn chiếu được.

Giao diện **100% tiếng Việt**, cực kỳ đơn giản cho người phụ trách phụng vụ / ca đoàn.

---

## 🎬 Tính năng nổi bật

| Nhóm | Tính năng |
|---|---|
| **Soạn lễ** | Chọn ngày → tự điền tên lễ + màu phụng vụ · Kéo‑thả cấu trúc lễ (Poster, Bài hát, Kinh, Đáp ca, Tung hô, Slide trống, Tùy chỉnh) · Nhân bản lễ · Upload poster riêng từng mục |
| **Chiếu** | Presenter View (slide hiện tại + trước/sau + lưới nhảy nhanh + đồng hồ) · Đèn đen khi cha giảng · Phím tắt như PowerPoint · **Điều khiển bằng điện thoại** |
| **Slide** | Tự chia slide lời bài hát, tự lặp điệp khúc · Auto‑fit cỡ chữ không tràn khung · Chỉnh cỡ chữ & tách/gộp slide riêng từng mục · Chữ đọc rõ từ cuối nhà thờ |
| **Thư viện** | Bài hát (618 bài mẫu) · Kinh nguyện (có seed) · **Đáp Ca – Tung Hô Tin Mừng** (789 mục theo mùa) · Ảnh nền + focal point crop đẹp cả 2 hướng |
| **Tiện ích** | Xuất slide ra **PowerPoint (.pptx)** · Xuất/Nhập gói lễ `.magnific.json` · Gợi ý đáp ca theo ngày lễ · Thống kê bài hay dùng |
| **Hệ thống** | 2 theme tự chọn · PWA offline · Đăng nhập & phân quyền (chỉ admin ghi dữ liệu chung) |

---

## 🎨 Hai giao diện tùy chọn

Người dùng tự chọn theme trong **Cài đặt** — đổi cả giao diện soạn lễ, Presenter View **và phong cách slide chiếu**.

| 🌿 **Đồng Xanh** (mặc định) | 🏺 **Tĩnh Lặng** |
|---|---|
| Cảm hứng TV 22 *"Chúa là mục tử… đồng cỏ xanh"* | Cảm hứng đất nung, đá ấm, tối giản |
| Xanh phụng vụ, nền sáng tươi, bo góc lớn, font Baloo 2 | Trung tính ấm + accent đất nung, phẳng, font Fraunces serif |

> Màu lễ phục của ngày (xanh / tím / đỏ / trắng‑vàng / hồng) luôn là **accent động** trên slide, đổi giá trị theo từng theme. Mock tham chiếu trực quan: `magnific-mockups-v4-dual-theme.html`.

---

## 🧱 Công nghệ

| Thành phần | Lựa chọn |
|---|---|
| Framework | **Next.js 14** (App Router) + **TypeScript** (strict, không `any`) |
| Styling | **Tailwind CSS** — design tokens 2 theme qua CSS variables |
| Database + Storage | **Supabase** (Postgres + Storage cho ảnh nền) |
| Offline | Service Worker (PWA) + **IndexedDB** (Dexie.js) |
| Đồng bộ 2 cửa sổ | **BroadcastChannel** + Supabase Realtime (điều khiển từ xa) |
| Kéo‑thả | **@dnd-kit** |
| PowerPoint | **pptxgenjs** |
| Font | Be Vietnam Pro (UI + lời hát) · Baloo 2 / Fraunces (theo theme) — self‑host để chạy offline |

---

## 🚀 Bắt đầu nhanh

### 1. Cài đặt

```bash
git clone https://github.com/mdev-qn95/PaNIC-Magnific.git
cd PaNIC-Magnific
npm install
```

### 2. Tạo project Supabase

Tạo project miễn phí tại [supabase.com](https://supabase.com), rồi vào **SQL Editor** chạy lần lượt các file trong thư mục `supabase/`:

| Thứ tự | File | Nội dung |
|---|---|---|
| 1 | `schema.sql` | Bảng bài hát, kinh, ảnh nền, thánh lễ, mục lễ |
| 2 | `seed-prayers.sql` | Các kinh phổ biến có sẵn (Lạy Cha, Kính Mừng…) |
| 3 | `storage.sql` | Bucket Storage cho ảnh nền / poster |
| 4 | `responsorials.sql` | Bảng Đáp Ca – Tung Hô Tin Mừng |
| 5 | `auth.sql` | Đăng nhập + phân quyền (RLS). **Chạy sau cùng** — sửa email admin theo hướng dẫn trong file |

### 3. Cấu hình biến môi trường

Sao chép `.env.example` thành `.env.local` rồi điền 2 giá trị từ **Supabase → Project Settings → API**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> 🔒 Chỉ dùng **anon / publishable key** (an toàn ở client). **Không bao giờ** đưa secret key vào file. `.env*.local` đã được `.gitignore` bỏ qua.

### 4. Chạy

```bash
npm run dev      # http://localhost:3000
```

---

## 📜 Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production |
| `npm start` | Chạy bản đã build |
| `npm test` | Chạy unit test (Vitest) |
| `npm run test:watch` | Test ở chế độ watch |

---

## 🏛️ Kiến trúc đáng chú ý

- **Trình chiếu 2 cửa sổ** — cửa sổ điều khiển gửi lệnh qua `BroadcastChannel` (`magnific-{massId}`) tới cửa sổ tivi; hợp nhất thêm Supabase Realtime để điều khiển từ điện thoại. → `lib/present-transport.ts`
- **Snapshot khi chiếu** — resolve toàn bộ lễ (join bài hát/kinh/ảnh nền) thành một `MassSnapshot` lưu IndexedDB → chiếu không phụ thuộc mạng và không bị ảnh hưởng nếu ai đó sửa dữ liệu giữa chừng. → `lib/present.ts`, `lib/offline.ts`
- **Lịch phụng vụ tự tính** — thuật toán Computus (Meeus/Jones/Butcher) suy ra Phục Sinh, các mùa, lễ trọng; có **unit test** đối chiếu lịch Công giáo VN. → `lib/liturgical-calendar.ts`
- **Tự chia slide** — chuẩn hóa NFC, tách khối theo dòng trống, nhận diện `ĐK:`, tự lặp điệp khúc; auto‑fit cỡ chữ. → `lib/slide-splitter.ts`
- **Component `SlideRenderer` thuần** — nhận data + `orientation`, dùng chung cho editor, Presenter View, cửa sổ tivi và bản xuất PowerPoint.
- **Phân quyền RLS** — mọi người **xem** được (chiếu/xuất/offline không cần đăng nhập); chỉ **admin** ghi dữ liệu chung. Người dùng thường vẫn soạn lễ được — lưu vào IndexedDB. → `lib/local-masses.ts`

### Cấu trúc thư mục

```
app/(shell)/      Màn có sidebar: trang chủ, thư viện, soạn lễ, cài đặt…
app/present/      Trình chiếu: /control (điều khiển) · /screen (tivi) · /remote (điện thoại)
components/       SlideRenderer, MassEditor, các editor, UI dùng chung
lib/              Lịch phụng vụ, chia slide, present, offline, supabase, pptx…
supabase/         Schema + seed + RLS (các file .sql)
```

---

## 🧪 Kiểm thử

Phần dễ sai nhất (lịch phụng vụ, chia slide, gợi ý đáp ca) đều có unit test:

```bash
npm test
```

---

## ☁️ Triển khai

Deploy thẳng lên **Vercel** (thêm 2 biến môi trường `NEXT_PUBLIC_SUPABASE_*`). Nhờ PWA + IndexedDB, sau khi bấm **"Tải để chiếu offline"** ở nhà, tại nhà thờ **mất mạng hoàn toàn vẫn chiếu được**.

---

## 📖 Tài liệu

Đặc tả kỹ thuật đầy đủ (handoff, schema, thuật toán, design tokens): [**CLAUDE.md**](CLAUDE.md).

## 📄 Giấy phép

Dự án phục vụ cộng đồng giáo xứ. Bạn được tự do sử dụng và điều chỉnh cho giáo xứ của mình.

<div align="center">
<br/>

*“Chúa là mục tử chăn dắt tôi, tôi chẳng thiếu thốn gì.”* — Tv 22

</div>
