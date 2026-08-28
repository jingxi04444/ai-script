import type { ExportCreateParams, ExportJob, ExportJobPage, ScriptQueueItem, ScriptQueueState } from '../types/generation';
import type { GenerateScriptParams } from '../types/script';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const now = new Date();
const isoFromNow = (days: number) => new Date(now.getTime() + days * 86400000).toISOString();
const taskTimestamp = (date = new Date()) => {
  const value = date.toISOString().replace(/[-:T.Z]/g, '');
  return value.slice(0, 14);
};
const taskName = (name: string, date = new Date()) => `${name} · ${taskTimestamp(date)}`;
const mockBriefNames: Record<string, string> = {
  b1: 'JRFH-2026',
  b2: 'A60MAX',
  b3: '分层便当盒',
};
const mockTemplateNames: Record<string, string> = {
  '01': '痛点解决型',
  '02': '功能讲解型',
  '03': '对比突出型',
  '04': '场景代入型',
  '05': '用户证言型',
  '06': '权威背书型',
  '07': '清单推荐型',
  '08': '教程步骤型',
  '09': '使用对比型',
  '10': '优惠促销型',
};

let concurrency = 2;
let queueItems: ScriptQueueState['items'] = [
  {
    id: 'queue-301', projectId: 'project-1', batchNo: 'B20260819001', scriptType: 'original',
    taskLabel: taskName('七夕香氛礼盒｜情绪口播版', now), status: 'running', createdAt: isoFromNow(0), startTime: isoFromNow(0),
  },
  {
    id: 'queue-302', projectId: 'project-1', batchNo: 'B20260819001', scriptType: 'viral',
    taskLabel: taskName('便携咖啡机｜办公室反转版', now), status: 'pending', createdAt: isoFromNow(0),
  },
  {
    id: 'queue-299', projectId: 'project-1', batchNo: 'B20260818003', scriptType: 'original',
    taskLabel: taskName('宠物饮水机｜真实体验版', new Date(now.getTime() - 86400000)), status: 'success', scriptId: 'script-3', finishTime: isoFromNow(-1),
  },
];

let exportJobs: ExportJob[] = [
  {
    id: 'export-501', fileName: '八月种草脚本合集.zip', exportType: 'script_batch', status: 'running',
    sourceCount: 18, progress: 68, createdAt: isoFromNow(0),
  },
  {
    id: 'export-500', fileName: '七夕香氛礼盒脚本.zip', exportType: 'script_batch', status: 'success',
    sourceCount: 8, progress: 100, fileSize: 286720, createdAt: isoFromNow(-1), finishTime: isoFromNow(-1),
    expireAt: isoFromNow(6), downloadUrl: 'data:text/plain;charset=utf-8,AI%20Script%20mock%20archive',
  },
  {
    id: 'export-499', fileName: '咖啡机达人脚本.zip', exportType: 'script_batch', status: 'failed',
    sourceCount: 12, progress: 44, errorMessage: '其中一条脚本内容读取失败，请重试', createdAt: isoFromNow(-2),
  },
];

const queueState = (): ScriptQueueState => {
  let pendingCount = 0;
  let runningCount = 0;
  for (const item of queueItems) {
    if (item.status === 'pending') pendingCount += 1;
    if (item.status === 'running') runningCount += 1;
  }
  return {
    items: queueItems,
    pendingCount,
    runningCount,
    activeCount: pendingCount + runningCount,
    concurrency,
    maxConcurrency: 4,
    parallelConfigurable: true,
  };
};

export const mockTaskCenterApi = {
  enqueueGeneration: async (params: GenerateScriptParams): Promise<ScriptQueueItem> => {
    await delay(90);
    const activeBatchNo = queueItems.find((item) => item.status === 'pending' || item.status === 'running')?.batchNo
      || `B${Date.now()}`;
    const briefName = params.briefId ? (mockBriefNames[params.briefId] || params.briefId) : '未选择 Brief';
    const scriptLabel = params.type === 'template'
      ? (mockTemplateNames[params.templateId || ''] || '模板脚本')
      : params.type === 'viral' ? '爆款复刻脚本' : 'AI 原创脚本';
    const item: ScriptQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      projectId: params.projectId,
      batchNo: activeBatchNo,
      scriptType: params.type,
      taskLabel: taskName(`${scriptLabel} · ${briefName}`),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    queueItems = [...queueItems, item];
    return item;
  },
  generationQueue: async () => {
    await delay(180);
    return queueState();
  },
  updateConcurrency: async (value: number) => {
    await delay(120);
    concurrency = value;
    return queueState();
  },
  cancelGeneration: async (id: string) => {
    await delay(120);
    queueItems = queueItems.map((item) => item.id === id ? { ...item, status: 'canceled' } : item);
  },
  exports: async (page = 1, pageSize = 30): Promise<ExportJobPage> => {
    await delay(180);
    const start = (page - 1) * pageSize;
    return { list: exportJobs.slice(start, start + pageSize), total: exportJobs.length, page, pageSize, pages: Math.ceil(exportJobs.length / pageSize) };
  },
  createExport: async (params: ExportCreateParams): Promise<ExportJob> => {
    await delay(180);
    const job: ExportJob = {
      id: `export-${Date.now()}`,
      projectId: params.projectId,
      exportType: params.exportType,
      fileName: params.fileName || '脚本批量下载.zip',
      status: 'pending',
      sourceCount: params.scriptIds?.length || 0,
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    exportJobs = [job, ...exportJobs];
    return job;
  },
  retryExport: async (id: string): Promise<ExportJob> => {
    await delay(150);
    exportJobs = exportJobs.map((job) => job.id === id ? { ...job, status: 'pending', progress: 0, errorMessage: undefined } : job);
    return exportJobs.find((job) => job.id === id) as ExportJob;
  },
  cancelExport: async (id: string) => {
    await delay(120);
    exportJobs = exportJobs.map((job) => job.id === id ? { ...job, status: 'canceled' } : job);
  },
};
