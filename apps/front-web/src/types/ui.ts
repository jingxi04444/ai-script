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
  templateCode?: string;
} | null;

export type ImportTemplateConfig = {
  code: string;
  name: string;
  description: string;
  fileName: string;
  fileType: 'csv' | 'xlsx' | 'xls';
  columns: string[];
  sampleRows: string[][];
  instructions: string;
  status: 'active' | 'inactive';
  updatedAt: string;
};

export type ParsedImportTemplateResult = {
  templateCode: string;
  fileName: string;
  rowCount: number;
  rows: Record<string, unknown>[];
  fields: {
    productName: string;
    primarySellingPoint: string;
    auxiliarySellingPoint: string;
    targetGroups: string;
    suitableScene: string;
    specialSellingPoint: string;
    otherRequirements: string;
  };
};
