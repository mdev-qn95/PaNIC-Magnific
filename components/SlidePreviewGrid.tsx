'use client';

import SlideRenderer, { type SlideBackground, type SlideContent } from '@/components/SlideRenderer';
import type { LiturgicalColor } from '@/lib/liturgical-calendar';

export interface PreviewSlide extends SlideContent {
  /** Chú thích dưới slide. Mặc định = số thứ tự. */
  caption?: string;
  /** Slide trống (đèn đen) — render ô đen. */
  blank?: boolean;
  background?: SlideBackground | null;
  /** Hệ số cỡ chữ của mục (mục 5). Mặc định 1. */
  fontScale?: number;
}

/**
 * Lưới xem trước slide DÙNG CHUNG cho mọi trang (thư viện bài hát/kinh/đáp ca,
 * xem trước toàn lễ). Kích thước slide cố định qua auto-fill minmax → slide
 * luôn cùng cỡ dù nhiều hay ít, không bị kéo giãn to nhỏ khác nhau giữa các trang.
 */
export default function SlidePreviewGrid({
  slides,
  color = 'xanh',
  orientation = 'landscape',
  limit,
  minWidth,
}: {
  slides: PreviewSlide[];
  color?: LiturgicalColor;
  orientation?: 'landscape' | 'portrait';
  /** Chỉ hiện tối đa N slide, còn lại ghi "… còn X slide nữa". */
  limit?: number;
  minWidth?: number;
}) {
  const w = minWidth ?? (orientation === 'portrait' ? 130 : 200);
  const shown = limit ? slides.slice(0, limit) : slides;
  return (
    <>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${w}px, 1fr))` }}
      >
        {shown.map((s, i) => (
          <figure key={i} className="min-w-0">
            {s.blank ? (
              <div
                className="w-full rounded-[10px] bg-black"
                style={{ aspectRatio: orientation === 'portrait' ? '9 / 16' : '16 / 9' }}
              />
            ) : (
              <SlideRenderer orientation={orientation} color={color} background={s.background} fontScale={s.fontScale} slide={s} />
            )}
            <figcaption className="mt-1 truncate text-center text-[10.5px] text-ink-2">
              {s.caption ?? i + 1}
            </figcaption>
          </figure>
        ))}
      </div>
      {limit && slides.length > limit && (
        <div className="mt-2 text-center text-[11px] text-ink-3">
          … còn {slides.length - limit} slide nữa
        </div>
      )}
    </>
  );
}
