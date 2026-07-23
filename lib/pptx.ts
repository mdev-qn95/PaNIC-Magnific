/**
 * Xuất thánh lễ ra PowerPoint (.pptx) — cho ai muốn chiếu bằng PowerPoint.
 * Giữ đúng tinh thần slide trong app: nền theo theme, dải màu phụng vụ cạnh trái,
 * ảnh nền phủ kín + lớp phủ tối 40% và chữ trắng.
 */

import type { LiturgicalColor } from './liturgical-calendar';
import type { MassSnapshot, SnapshotSlide } from './present';

type Orientation = 'landscape' | 'portrait';

/** Màu (hex không có #) theo 2 theme — pptx cần màu đặc, không dùng được gradient/CSS var. */
const THEME = {
  dx: { bg: 'F1F8F2', title: '1F4A2C', text: '22331F' },
  tl: { bg: 'FBFAF6', title: '242220', text: '242220' },
} as const;

const LIT_HEX: Record<ThemeId, Record<LiturgicalColor, string>> = {
  dx: { xanh: '2E7D46', tim: '6B3FA0', do: 'B3261E', trang: 'C9A227', hong: 'D77FA1' },
  tl: { xanh: '5E7A4E', tim: '6E5296', do: 'B0453A', trang: 'B08A46', hong: 'C58AA0' },
};

/** Màu nhãn tag góc phải (ĐK / Đáp ca / Tung hô) — trùng --dk-badge của theme. */
const BADGE_HEX: Record<ThemeId, string> = { dx: 'C9A227', tl: '5E6B54' };

type ThemeId = 'dx' | 'tl';

function currentTheme(): ThemeId {
  if (typeof document === 'undefined') return 'dx';
  return document.documentElement.dataset.theme === 'tl' ? 'tl' : 'dx';
}

/** Tải ảnh về dạng base64 để nhúng thẳng vào file pptx (không phụ thuộc mạng khi mở). */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface PptxProgress {
  done: number;
  total: number;
}

export async function exportMassToPptx(
  snap: MassSnapshot,
  orientation: Orientation,
  onProgress?: (p: PptxProgress) => void,
): Promise<string> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();

  const W = orientation === 'landscape' ? 13.333 : 7.5;
  const H = orientation === 'landscape' ? 7.5 : 13.333;
  pptx.defineLayout({ name: 'MAGNIFIC', width: W, height: H });
  pptx.layout = 'MAGNIFIC';
  pptx.title = snap.massTitle;

  const theme = currentTheme();
  const c = THEME[theme];
  const litHex = LIT_HEX[theme][snap.color];

  const slides: SnapshotSlide[] = snap[orientation];
  // gom ảnh nền (mỗi URL chỉ tải 1 lần)
  const imgCache = new Map<string, string | null>();
  const getImg = async (url: string) => {
    if (!imgCache.has(url)) imgCache.set(url, await toDataUrl(url));
    return imgCache.get(url) ?? null;
  };

  const titleSize = orientation === 'landscape' ? 34 : 30;
  const lineSize = orientation === 'landscape' ? 26 : 24;

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const slide = pptx.addSlide();

    if (s.kind === 'blank') {
      slide.background = { color: '000000' };
      onProgress?.({ done: i + 1, total: slides.length });
      continue;
    }

    const bgData = s.background?.url ? await getImg(s.background.url) : null;

    if (bgData) {
      slide.background = { data: bgData };
      // lớp phủ tối để chữ đọc được từ cuối nhà thờ
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W, h: H,
        fill: { color: '000000', transparency: 60 },
        line: { color: '000000', transparency: 100 },
      });
    } else {
      slide.background = { color: c.bg };
      // dải màu phụng vụ cạnh trái (chữ ký nhận diện của app)
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 0.07, h: H,
        fill: { color: litHex },
        line: { color: litHex },
      });
    }

    const white = Boolean(bgData);
    // Hệ số cỡ chữ của mục (mục 5) — nhân vào cỡ mặc định; shrinkText vẫn co nếu tràn
    const fs = s.fontScale ?? 1;
    const body: { text: string; options?: Record<string, unknown> }[] = [];
    if (s.title) {
      body.push({
        text: s.title,
        options: {
          fontSize: Math.round(titleSize * fs), bold: true, color: white ? 'FFFFFF' : c.title,
          breakLine: true, paraSpaceAfter: 6,
        },
      });
    }
    (s.lines ?? []).forEach((l, idx, arr) => {
      body.push({
        text: l,
        options: {
          fontSize: Math.round(lineSize * fs), bold: true, color: white ? 'FFFFFF' : c.text,
          breakLine: idx < arr.length - 1,
        },
      });
    });

    if (body.length) {
      slide.addText(body, {
        x: 0.6, y: 0.4, w: W - 1.2, h: H - 0.8,
        align: 'center', valign: 'middle',
        fontFace: 'Be Vietnam Pro',
        lineSpacingMultiple: 1.25,
        shrinkText: true, // co chữ nếu tràn — giống auto-fit trong app
      });
    }

    // Nhãn tag góc trên phải: "ĐK" (bài hát) / "Đáp ca" / "Tung hô Tin Mừng"
    const badgeText = s.badge ?? (s.isChorus ? 'ĐK' : null);
    if (badgeText) {
      const bw = Math.max(0.75, 0.35 + badgeText.length * 0.135);
      slide.addText(badgeText, {
        x: W - bw - 0.28, y: 0.24, w: bw, h: 0.44,
        shape: pptx.ShapeType.roundRect, rectRadius: 0.07,
        fill: { color: BADGE_HEX[theme] },
        align: 'center', valign: 'middle',
        fontFace: 'Be Vietnam Pro', fontSize: 13, bold: true, color: 'FFFFFF',
      });
    }

    onProgress?.({ done: i + 1, total: slides.length });
  }

  const safe = snap.massTitle
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  const fileName = `${snap.massDate}-${safe || 'thanh-le'}.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
}
