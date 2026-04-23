import { Bell, User, LogOut, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  title: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({ title, isDark, onToggleTheme }: HeaderProps) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 dark:text-gray-100">{title}</h2>

        <div className="flex items-center gap-4">
          <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <button
            onClick={onToggleTheme}
            aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300 dark:text-gray-300" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300 dark:text-gray-300" />
            )}
          </button>

          <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer">
            <User className="w-5 h-5 text-gray-600 dark:text-gray-300 dark:text-gray-300" />
            <span className="text-sm text-gray-700 dark:text-gray-200 dark:text-gray-200">admin@system.com</span>
          </div>

          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-300 dark:text-gray-300" />
          </button>
        </div>
      </div>
    </header>
  );
}
