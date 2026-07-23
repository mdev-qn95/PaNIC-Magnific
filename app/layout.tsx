import type { Metadata } from 'next';
import { Baloo_2, Be_Vietnam_Pro, Fraunces } from 'next/font/google';
import SwRegister from '@/components/SwRegister';
import TooltipLayer from '@/components/TooltipLayer';
import './globals.css';

// Self-host qua next/font để chạy offline (CLAUDE.md mục 2)
const bvp = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bvp',
  display: 'swap',
});
const baloo = Baloo_2({
  subsets: ['vietnamese', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-baloo',
  display: 'swap',
});
const fraunces = Fraunces({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PaNIC-Magnific — Phụng Vụ Slides',
  description: 'Ứng dụng trình chiếu thánh lễ cho giáo xứ',
  manifest: '/manifest.json',
};

// Đọc theme trước khi paint để không nháy (CLAUDE.md mục 6)
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem('magnific-theme')==='tl'?'tl':'dx'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      data-theme="dx"
      suppressHydrationWarning
      className={`${bvp.variable} ${baloo.variable} ${fraunces.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <SwRegister />
        {children}
        <TooltipLayer />
      </body>
    </html>
  );
}
