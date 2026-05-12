export type StepDefinition = {
  id: string;
  label: string;
  short: string;
};

export type SaveStepPayload = {
  projectId: string;
  step: string;
  data?: unknown;
};

export type SaveStepResult = {
  projectId: string;
  step: string;
  savedAt: string;
  data?: unknown;
};

export type ProjectStepState<T = unknown> = {
  projectId: string;
  step: string;
  status: string;
  data: T | null;
  savedAt: string;
};

export type UploadFilePayload = {
  type: string;
  fileName: string;
};

export type UploadFileResult = {
  id: string;
  type: string;
  fileName: string;
  status: string;
  uploadedAt: string;
};
