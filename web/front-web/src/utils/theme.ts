export type ThemeMode = 'light' | 'dark';

const THEME_MODE_KEY = 'ai-script-theme-mode';
const LEGACY_THEME_ACCENT_KEY = 'ai-script-theme-accent';
const DEFAULT_THEME_ACCENT = '#62e670';

export const getStoredThemeMode = (): ThemeMode => {
  const stored = localStorage.getItem(THEME_MODE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
};

export const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  root.dataset.colorMode = mode;
  root.style.setProperty('--theme-accent', DEFAULT_THEME_ACCENT);
  root.style.setProperty('--theme-accent-rgb', '98, 230, 112');
  root.style.setProperty('--gold', DEFAULT_THEME_ACCENT);
  localStorage.setItem(THEME_MODE_KEY, mode);
  localStorage.removeItem(LEGACY_THEME_ACCENT_KEY);
};

export const initializeStoredTheme = () => {
  const mode = getStoredThemeMode();
  applyTheme(mode);
  return { mode };
};
