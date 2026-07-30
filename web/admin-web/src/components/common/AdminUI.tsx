import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export type BadgeTone = 'green' | 'blue' | 'orange' | 'purple' | 'gray' | 'red';

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function StatusBadge({ children, tone = 'gray' }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel-card">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {description ? <p className="panel-subtitle">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h2>{title}</h2>
        {description ? <p className="panel-subtitle">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {note ? <em>{note}</em> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon ?? '—'}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnBackdrop?: boolean;
}) {
  if (!open) return null;

  const widthClass = size === 'full' ? 'modal-card modal-full' : size === 'lg' ? 'modal-card modal-lg' : size === 'sm' ? 'modal-card modal-sm' : 'modal-card';

  return (
    <div className="modal-backdrop" onClick={closeOnBackdrop ? onClose : undefined} role="presentation">
      <div className={widthClass} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="dialog-close" type="button" aria-label="关闭弹窗" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Toast({ message, visible }: { message: string; visible: boolean }) {
  return <div className={`toast ${visible ? 'show' : ''}`}>{message}</div>;
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="pagination-bar">
      <span>共 {total} 条，当前 {start}-{end}</span>
      <div>
        {onPageSizeChange ? (
          <label className="pagination-size">
            <span>每页</span>
            <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size} 条</option>
              ))}
            </select>
          </label>
        ) : null}
        <button className="table-btn" type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>上一页</button>
        <strong>{page} / {pages}</strong>
        <button className="table-btn" type="button" disabled={page >= pages} onClick={() => onChange(page + 1)}>下一页</button>
      </div>
    </div>
  );
}
