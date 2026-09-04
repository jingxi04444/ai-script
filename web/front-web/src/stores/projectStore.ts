import { create } from 'zustand';
import { projectApi } from '../api';
import type { Project, ProjectListParams } from '../types/project';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  filters: ProjectListParams;

  fetchProjects: (params?: ProjectListParams) => Promise<void>;
  fetchMoreProjects: () => Promise<void>;
  fetchProjectById: (id: string) => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setFilters: (filters: ProjectListParams) => void;
  setCurrentProject: (project: Project | null) => void;
  reset: () => void;
}

const initialProjectState = {
  projects: [] as Project[],
  currentProject: null as Project | null,
  total: 0,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  currentPage: 1,
  filters: { page: 1, pageSize: 20 } as ProjectListParams,
};

let projectListRequestVersion = 0;

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialProjectState,

  fetchProjects: async (params) => {
    const requestVersion = ++projectListRequestVersion;
    const filters = { ...get().filters, ...params, page: 1, pageSize: params?.pageSize || get().filters.pageSize || 20 };
    set({ isLoading: true, isLoadingMore: false, filters });
    try {
      const result = await projectApi.getList(filters);
      if (requestVersion !== projectListRequestVersion) return;
      const currentPage = result.page || 1;
      const pages = result.pages ?? Math.ceil(result.total / (result.pageSize || filters.pageSize || 20));
      set({ projects: result.list, total: result.total, currentPage, hasMore: currentPage < pages, isLoading: false });
    } catch (error) {
      if (requestVersion === projectListRequestVersion) set({ isLoading: false });
      throw error;
    }
  },

  fetchMoreProjects: async () => {
    const state = get();
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;
    const requestVersion = projectListRequestVersion;
    const nextPage = state.currentPage + 1;
    set({ isLoadingMore: true });
    try {
      const result = await projectApi.getList({ ...state.filters, page: nextPage });
      if (requestVersion !== projectListRequestVersion) return;
      const page = result.page || nextPage;
      const pages = result.pages ?? Math.ceil(result.total / (result.pageSize || state.filters.pageSize || 20));
      set((current) => {
        const existingIds = new Set(current.projects.map((project) => project.id));
        const additions = result.list.filter((project) => !existingIds.has(project.id));
        return {
          projects: [...current.projects, ...additions],
          total: result.total,
          currentPage: page,
          hasMore: page < pages,
          isLoadingMore: false,
        };
      });
    } catch (error) {
      if (requestVersion === projectListRequestVersion) set({ isLoadingMore: false });
      throw error;
    }
  },

  fetchProjectById: async (id) => {
    set({ isLoading: true });
    try {
      const project = await projectApi.getById(id);
      set({ currentProject: project, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createProject: async (data) => {
    const project = await projectApi.create(data);
    set((state) => ({ projects: [project, ...state.projects], total: state.total + 1 }));
    return project;
  },

  updateProject: async (id, data) => {
    const updated = await projectApi.update(id, data);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
      currentProject: state.currentProject?.id === id ? updated : state.currentProject,
    }));
  },

  deleteProject: async (id) => {
    await projectApi.delete(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      total: Math.max(0, state.total - 1),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  setFilters: (filters) => {
    set({ filters });
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },
  reset: () => set(initialProjectState),
}));
