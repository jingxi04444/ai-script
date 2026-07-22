import { create } from 'zustand';
import { projectApi } from '../api';
import type { Project, ProjectListParams } from '../types/project';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  total: number;
  isLoading: boolean;
  filters: ProjectListParams;

  fetchProjects: (params?: ProjectListParams) => Promise<void>;
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
  filters: { page: 1, pageSize: 10 } as ProjectListParams,
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialProjectState,

  fetchProjects: async (params) => {
    set({ isLoading: true });
    try {
      const { list, total } = await projectApi.getList(params || get().filters);
      set({ projects: list, total, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
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
    set((state) => ({ projects: [project, ...state.projects] }));
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
