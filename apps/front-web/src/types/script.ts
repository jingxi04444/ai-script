export type StoryboardRow = {
  id?: number;
  shot: string;
  type: string;
  scene: string;
  line: string;
  duration: string;
  point: string;
  risk: string;
};

export type ComplianceResult = {
  similarity: string;
  riskCount: number;
  suggestion: string;
};

export type DownloadResult = {
  fileName: string;
  url: string;
};

export type ShareScriptResult = {
  title: string;
  url: string;
  scope: string;
};

export type SharedScript = {
  title: string;
  status: string;
  scenes: StoryboardRow[];
};
