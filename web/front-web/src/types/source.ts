export interface AnalysisDimension {
  key: string;
  title: string;
  content: string;
}

export interface SourceAnalysis {
  id: string;
  projectId: string;
  mode: string;
  sourceUrl: string;
  platform?: string;
  title?: string;
  authorName?: string;
  coverUrl?: string;
  videoUrl?: string;
  editableCopy?: string;
  structureSummary?: string;
  dimensions?: AnalysisDimension[];
  status?: string;
}
