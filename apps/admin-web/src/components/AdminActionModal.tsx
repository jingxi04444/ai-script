import { useEffect, useState, type FormEvent } from 'react';
import type { AdminModal } from '../types/ui';

export function AdminActionModal({ modal, onClose }: { modal: AdminModal; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFile(null);
    setLoading(false);
  }, [modal?.title]);

  if (!modal) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (modal.file && !file) return;
    setLoading(true);
    try {
      const payload = Object.fromEntries(new FormData(event.currentTarget));
      await modal.onConfirm(payload, file);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <form className="admin-modal-card" onSubmit={submit}>
        <div className="admin-modal-head">
          <div>
            <span>Mock Action</span>
            <h3>{modal.title}</h3>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <p>{modal.description}</p>
        {modal.fields?.map((field) => (
          <label className="admin-modal-field" key={field.name}>
            <span>{field.label}</span>
            <input name={field.name} type={field.type || 'text'} placeholder={field.placeholder} defaultValue={field.defaultValue} />
          </label>
        ))}
        {modal.file && (
          <label className="admin-file-picker">
            <input type="file" accept={modal.file.accept} onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <strong>{file ? file.name : modal.file.label}</strong>
            <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `支持格式：${modal.file.accept}`}</span>
          </label>
        )}
        <div className="admin-modal-actions">
          <button type="button" className="ghost-admin-button" onClick={onClose}>取消</button>
          <button disabled={loading || Boolean(modal.file && !file)}>{loading ? '处理中...' : modal.confirmText || '确认'}</button>
        </div>
      </form>
    </div>
  );
}
