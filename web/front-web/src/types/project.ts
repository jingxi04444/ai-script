export type ProjectStatus = 'active' | 'published' | 'review' | 'idle';

export interface Project {
  id: string;
  userId?: string;
  name: string;
  avatarUrl?: string;
  announcement?: string;
  category?: string;
  status: ProjectStatus;
  briefCount: number;
  scriptCount: number;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

export interface ProjectStep {
  id: string;
  projectId: string;
  stepCode: string;
  stepName: string;
  status: string;
  draftData?: string;
  completeTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectStepSaveParams {
  stepCode: string;
  stepName: string;
  status?: string;
  draftData?: string;
}

export interface ProjectCollaborationLink {
  id: string;
  status: 'active' | 'revoked' | 'expired' | string;
  expiresAt?: string;
  usedCount: number;
  maxUses?: number;
}

export interface ProjectCollaborator {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  joinedAt?: string;
}

export interface ProjectCollaborationOverview {
  links: ProjectCollaborationLink[];
  members: ProjectCollaborator[];
}
