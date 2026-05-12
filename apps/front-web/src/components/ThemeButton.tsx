import { themes } from '../app/theme';
import type { ThemeKey } from '../types/ui';

export function ThemeButton({ theme, onClick }: { theme: ThemeKey; onClick: () => void }) {
  return <button className="theme-toggle" onClick={onClick}>主题：{themes.find((item) => item.key === theme)?.label}</button>;
}
