export type Toast = {
  message: string;
  tone: 'success' | 'warning' | 'info';
};

export type AdminModal = {
  title: string;
  description: string;
  confirmText?: string;
  fields?: Array<{ name: string; label: string; placeholder?: string; type?: string; defaultValue?: string }>;
  file?: { label: string; accept: string };
  onConfirm: (payload: Record<string, FormDataEntryValue>, file: File | null) => Promise<void> | void;
} | null;
