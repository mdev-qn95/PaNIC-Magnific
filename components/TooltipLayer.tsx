'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface TipState {
  text: string;
  x: number; // tâm ngang của phần tử
  top: number; // mép trên phần tử
  bottom: number; // mép dưới phần tử
  placement: 'top' | 'bottom';
}

/**
 * Tooltip dùng chung cho toàn app — render qua portal ở <body> với position:fixed
 * nên KHÔNG bị cắt bởi overflow của bảng/card (khác tooltip thuần CSS ::after).
 * Kích hoạt bằng thuộc tính data-tip="..." trên bất kỳ phần tử nào.
 */
export default function TooltipLayer() {
  const [tip, setTip] = useState<TipState | null>(null);

  useEffect(() => {
    let current: HTMLElement | null = null;

    const show = (el: HTMLElement) => {
      const text = el.getAttribute('data-tip');
      if (!text) return;
      const r = el.getBoundingClientRect();
      // Ưu tiên hiện dưới; nếu sát mép dưới màn hình thì lật lên trên
      const placement: 'top' | 'bottom' =
        r.bottom + 48 > window.innerHeight ? 'top' : 'bottom';
      setTip({ text, x: r.left + r.width / 2, top: r.top, bottom: r.bottom, placement });
    };
    const hide = () => {
      current = null;
      setTip(null);
    };

    const onOver = (e: Event) => {
      const el = (e.target as HTMLElement)?.closest?.('[data-tip]') as HTMLElement | null;
      if (!el) return;
      if (el === current) return;
      current = el;
      show(el);
    };
    const onOut = (e: Event) => {
      if (!current) return;
      // Rê sang phần tử con bên trong (vd icon) thì KHÔNG ẩn
      const related = (e as MouseEvent | FocusEvent).relatedTarget as Node | null;
      if (related && current.contains(related)) return;
      hide();
    };

    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    document.addEventListener('focusin', onOver);
    document.addEventListener('focusout', onOut);
    // Cuộn / đổi kích thước → ẩn để không lơ lửng sai chỗ
    document.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('focusin', onOver);
      document.removeEventListener('focusout', onOut);
      document.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  if (!tip) return null;

  const below = tip.placement === 'bottom';
  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: tip.x,
        top: below ? tip.bottom + 8 : tip.top - 8,
        transform: below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        maxWidth: 260,
        padding: '5px 9px',
        borderRadius: 6,
        background: 'var(--ink)',
        color: 'var(--surface)',
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAlign: 'center',
        whiteSpace: 'normal',
        width: 'max-content',
        pointerEvents: 'none',
        zIndex: 9999,
        boxShadow: '0 6px 16px -6px rgba(0,0,0,0.4)',
      }}
    >
      {tip.text}
      <span
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          [below ? 'bottom' : 'top']: '100%',
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          [below ? 'borderBottom' : 'borderTop']: '5px solid var(--ink)',
        } as React.CSSProperties}
      />
    </div>,
    document.body,
  );
}
