export type Toast = {
  tone: 'success' | 'info' | 'warning';
  message: string;
};

export type ThemeKey = 'green' | 'blue' | 'orange';

export type UploadModalState = {
  title: string;
  type: string;
  accept: string;
  hint: string;
} | null;
