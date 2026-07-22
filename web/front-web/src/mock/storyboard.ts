import type { Storyboard, Shot } from '../types/storyboard';
import { createSuccessResponse, unwrapApiResponse } from '../types/api';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockShots: Shot[] = [
  { id: 'shot-1', number: 1, type: '近景', scene: '办公室深夜，人物拿出饭盒', line: '加班到现在，饭还是热的。', duration: '3s', risk: 'low' },
  { id: 'shot-2', number: 2, type: '特写', scene: '饭盒分仓与温控面板', line: '20 分钟慢热，不串味。', duration: '4s', risk: 'low' },
  { id: 'shot-3', number: 3, type: '中景', scene: '同事围观试吃', line: '这一口像刚出锅。', duration: '4s', risk: 'medium' },
];

const mockStoryboard: Storyboard = {
  id: 'storyboard-1',
  scriptId: 'script-1',
  shots: mockShots,
  createdAt: '2026-05-30',
  updatedAt: '2026-05-30',
};

export const mockStoryboardApi = {
  getByScriptId: async (_scriptId: string) => {
    await delay(300);
    return unwrapApiResponse(createSuccessResponse({ ...mockStoryboard, scriptId: _scriptId }));
  },

  getById: async (_id: string) => {
    await delay(200);
    return unwrapApiResponse(createSuccessResponse(mockStoryboard));
  },

  update: async (_id: string, data: Partial<Storyboard>) => {
    await delay(300);
    return unwrapApiResponse(createSuccessResponse({ ...mockStoryboard, ...data, updatedAt: new Date().toISOString() }));
  },

  export: async (_id: string) => {
    await delay(500);
    return new Blob(['mock export data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  },
};
