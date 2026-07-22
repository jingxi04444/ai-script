export type ShotType = '近景' | '特写' | '中景' | '远景' | '全景';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Shot {
  id: string;
  number: number;
  type: ShotType;
  scene: string;
  line: string;
  duration: string;
  risk: RiskLevel;
}

export interface Storyboard {
  id: string;
  scriptId: string;
  shots: Shot[];
  createdAt: string;
  updatedAt: string;
}
