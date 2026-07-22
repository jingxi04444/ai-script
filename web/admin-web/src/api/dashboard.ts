import api from './index';

export interface DashboardSummary {
  userCount?: number;
  projectCount?: number;
  scriptCount?: number;
  videoCount?: number;
}

export const dashboardApi = {
  getSummary: (): Promise<DashboardSummary> => {
    return api.get('/dashboard/summary');
  },
};
