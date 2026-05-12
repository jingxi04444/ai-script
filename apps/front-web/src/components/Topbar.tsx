import { navigate } from '../app/router';
import { ThemeButton } from './ThemeButton';
import type { User } from '../types/auth';
import type { ThemeKey } from '../types/ui';

export function Topbar({ user, compact = false, theme, onThemeToggle, onLogout }: { user: User; compact?: boolean; theme?: ThemeKey; onThemeToggle?: () => void; onLogout?: () => void }) {
  return <header className={compact ? 'topbar compact' : 'topbar'}><div><strong>{user.tenantName}</strong><span>{user.role}</span></div><div className="topbar-actions">{theme && onThemeToggle && <ThemeButton theme={theme} onClick={onThemeToggle} />}<button onClick={onLogout || (() => navigate('/login'))}>{user.name} / 退出</button></div></header>;
}
