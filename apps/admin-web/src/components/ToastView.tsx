import type { Toast } from '../types/ui';

export function ToastView({ toast }: { toast: Toast }) {
  return <div className={`toast ${toast.tone}`}>{toast.message}</div>;
}
