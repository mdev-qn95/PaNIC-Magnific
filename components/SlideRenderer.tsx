'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { LiturgicalColor } from '@/lib/liturgical-calendar';

export interface SlideContent {
  title?: string;
  lines?: string[];
  isChorus?: boolean;
  /** Nhãn tag góc trên phải (như "ĐK"): "Đáp ca", "Tung hô Tin Mừng"… */
  badge?: string;
}

export interface SlideBackground {
  url: string;
  /** Điểm crop 0..1 — giữ điểm quan trọng trong khung ở cả 2 hướng. */
  focalX: number;
  focalY: number;
}

interface SlideRendererProps {
  slide: SlideContent;
  orientation: 'landscape' | 'portrait';
  /** Màu phụng vụ của lễ — dải signature cạnh trái. */
  color?: LiturgicalColor;
  /** Ảnh nền: overlay đen ~40% + chữ trắng — đọc được từ cuối nhà thờ (mục 6). */
  background?: SlideBackground | null;
  /** Lấp đầy container cha (cửa sổ tivi) — bỏ viền, bo góc, tỉ lệ cố định. */
  fullscreen?: boolean;
  /**
   * Hệ số cỡ chữ do người dùng chọn cho mục (mục 5) — nhân vào cỡ mặc định.
   * Auto-fit vẫn chạy đè lên trên: nếu vẫn tràn thì thu nhỏ tiếp. Mặc định 1.
   */
  fontScale?: number;
  className?: string;
}

/**
 * Pure component render một slide (CLAUDE.md mục 7, 12).
 * - Cỡ chữ theo container query (cqw) → dùng được từ thumbnail tới fullscreen.
 * - Auto-fit: nếu chữ tràn khung, giảm 5%/nấc, tối đa 4 nấc (mục 8).
 */
export default function SlideRenderer({
  slide,
  orientation,
  color = 'xanh',
  background = null,
  fullscreen = false,
  fontScale = 1,
  className = '',
}: SlideRendererProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [shrinkStep, setShrinkStep] = useState(0);

  useLayoutEffect(() => {
    setShrinkStep(0);
  }, [slide, orientation, fontScale]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    if (shrinkStep < 4 && el.scrollHeight > el.clientHeight + 1) {
      setShrinkStep((s) => s + 1);
    }
  }, [shrinkStep, slide, orientation, fontScale]);

  // Cỡ do người dùng chọn (fontScale) × auto-fit (thu nhỏ khi tràn)
  const scale = fontScale * Math.pow(0.95, shrinkStep);
  const isPortrait = orientation === 'portrait';
  const titleSize = (isPortrait ? 9 : 7) * scale;
  const lineSize = (isPortrait ? 7 : 5.2) * scale;

  const frame: CSSProperties = fullscreen
    ? {
        width: '100%',
        height: '100%',
        background: 'var(--slide-bg)',
        containerType: 'size',
      }
    : {
        aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
        background: 'var(--slide-bg)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        containerType: 'size',
      };

  const hasBg = Boolean(background);

  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={frame}>
      {background && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={background.url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: `${background.focalX * 100}% ${background.focalY * 100}%`,
            }}
          />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.4)' }} />
        </>
      )}
      <div
        className="absolute bottom-0 left-0 top-0"
        style={{ width: 'var(--slide-strip)', background: `var(--lit-${color})`, zIndex: 2 }}
      />
      {(slide.badge || slide.isChorus) && (
        <span
          className="absolute font-extrabold text-white"
          style={{
            top: '3.5%',
            right: '3%',
            background: 'var(--dk-badge)',
            fontSize: '3.4cqw',
            borderRadius: '0.9cqw',
            padding: '0.4cqw 1.4cqw',
            zIndex: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {slide.badge ?? 'ĐK'}
        </span>
      )}
      <div
        ref={textRef}
        className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-center"
        style={{ padding: '6% 8%' }}
      >
        {slide.title && (
          <div
            style={{
              fontFamily: 'var(--f-display)',
              fontWeight: 600,
              color: hasBg ? '#fff' : 'var(--slide-title)',
              textShadow: hasBg ? '0 1px 6px rgba(0,0,0,.55)' : undefined,
              fontSize: `${titleSize}cqw`,
              lineHeight: 1.25,
              marginBottom: slide.lines?.length ? '2.5%' : 0,
            }}
          >
            {slide.title}
          </div>
        )}
        {slide.lines?.map((line, i) => (
          <div
            key={i}
            style={{
              fontWeight: 600,
              lineHeight: 1.55,
              fontSize: `${lineSize}cqw`,
              // Đặt màu đậm rõ (như tiêu đề poster) — không kế thừa màu sáng của
              // trang Presenter (--pres-ink) vốn dành cho nền tối, gây chữ mờ trên slide sáng
              color: hasBg ? '#fff' : 'var(--slide-title)',
              textShadow: hasBg ? '0 1px 5px rgba(0,0,0,.5)' : undefined,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
