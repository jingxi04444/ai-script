import type { Project } from '../types/project';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockProjects: Project[] = [
  { id: 'project-1', name: '加热饭盒-抖音推广', category: '智能家居', status: 'active', briefCount: 3, scriptCount: 6, videoCount: 4, createdAt: '2025-05-19', updatedAt: '2025-05-19 14:30' },
  { id: 'project-2', name: '宠物饮水机-618投放', category: '宠物用品', status: 'published', briefCount: 2, scriptCount: 5, videoCount: 3, createdAt: '2025-05-18', updatedAt: '2025-05-18 10:22' },
  { id: 'project-3', name: '护眼台灯-种草视频', category: '家居用品', status: 'active', briefCount: 2, scriptCount: 4, videoCount: 2, createdAt: '2025-05-17', updatedAt: '2025-05-17 16:45' },
  { id: 'project-4', name: '母婴消毒柜-平台模板', category: '母婴家电', status: 'active', briefCount: 3, scriptCount: 6, videoCount: 4, createdAt: '2025-05-16', updatedAt: '2025-05-16 11:08' },
  { id: 'project-5', name: '便携榨汁杯-小红书种草', category: '厨房电器', status: 'idle', briefCount: 1, scriptCount: 2, videoCount: 0, createdAt: '2025-05-15', updatedAt: '2025-05-15 09:30' },
  { id: 'project-6', name: '筋膜枪-运动恢复系列', category: '运动健康', status: 'active', briefCount: 2, scriptCount: 3, videoCount: 1, createdAt: '2025-05-14', updatedAt: '2025-05-14 18:20' },
  { id: 'project-7', name: '露营灯-户外场景视频', category: '户外装备', status: 'published', briefCount: 2, scriptCount: 4, videoCount: 3, createdAt: '2025-05-13', updatedAt: '2025-05-13 21:05' },
  { id: 'project-8', name: '智能垃圾桶-家庭系列', category: '生活用品', status: 'idle', briefCount: 1, scriptCount: 2, videoCount: 0, createdAt: '2025-05-12', updatedAt: '2025-05-12 15:40' },
];

export const mockProjectApi = {
  getList: async (_params?: any) => {
    await delay(300);
    return { list: mockProjects, total: mockProjects.length };
  },

  getById: async (id: string) => {
    await delay(200);
    const project = mockProjects.find((p) => p.id === id);
    if (!project) throw new Error('Project not found');
    return project;
  },

  create: async (data: Partial<Project>) => {
    await delay(300);
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: data.name || '未命名项目',
      avatarUrl: data.avatarUrl,
      announcement: data.announcement,
      category: data.category,
      status: 'active',
      briefCount: 0,
      scriptCount: 0,
      videoCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockProjects.unshift(newProject);
    return newProject;
  },

  update: async (id: string, data: Partial<Project>) => {
    await delay(300);
    const project = mockProjects.find((p) => p.id === id);
    if (!project) throw new Error('Project not found');
    return { ...project, ...data, updatedAt: new Date().toISOString() };
  },

  delete: async (_id: string) => {
    await delay(300);
  },
};
