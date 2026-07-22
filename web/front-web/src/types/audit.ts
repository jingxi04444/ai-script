export interface AuditTask {
  id: string;
  projectId?: string;
  scriptId?: string;
  currentVersionId?: string;
  status?: string;
  stage?: string;
  assigneeId?: string;
  riskSummary?: string;
}

export interface AuditSubmitParams {
  scriptId: string;
  riskSummary?: string;
}
