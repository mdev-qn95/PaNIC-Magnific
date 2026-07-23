export type ThemeId = 'dx' | 'tl';

export const THEME_KEY = 'magnific-theme';

export const THEMES: { id: ThemeId; label: string; emoji: string; desc: string }[] = [
  { id: 'dx', label: 'Đồng Xanh', emoji: '🌿', desc: 'Xanh phụng vụ, tươi sáng, thân thiện' },
  { id: 'tl', label: 'Tĩnh Lặng', emoji: '🏺', desc: 'Trung tính ấm, đất nung, tối giản' },
];

export function currentTheme(): ThemeId {
  try {
    if (localStorage.getItem(THEME_KEY) === 'tl') return 'tl';
  } catch {
    /* SSR / private mode */
  }
  return 'dx';
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode: theme vẫn đổi trong phiên */
  }
}
