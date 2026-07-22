import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Toast } from '../common/AdminUI';

type AdminShellValue = {
  notify: (message: string) => void;
};

const AdminShellContext = createContext<AdminShellValue | null>(null);

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');

  const value = useMemo<AdminShellValue>(() => ({
    notify: (text: string) => {
      setMessage(text);
      window.clearTimeout((window as unknown as { __adminToastTimer?: number }).__adminToastTimer);
      (window as unknown as { __adminToastTimer?: number }).__adminToastTimer = window.setTimeout(() => setMessage(''), 2200);
    },
  }), []);

  return (
    <AdminShellContext.Provider value={value}>
      {children}
      <Toast message={message} visible={Boolean(message)} />
    </AdminShellContext.Provider>
  );
}

export function useAdminShell() {
  const context = useContext(AdminShellContext);
  if (!context) {
    throw new Error('useAdminShell must be used within AdminShellProvider');
  }
  return context;
}
