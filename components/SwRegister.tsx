'use client';

import { useEffect } from 'react';

/** Đăng ký service worker — chỉ ở production (dev để HMR hoạt động bình thường). */
export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* không chặn app nếu SW fail */
    });
  }, []);
  return null;
}
