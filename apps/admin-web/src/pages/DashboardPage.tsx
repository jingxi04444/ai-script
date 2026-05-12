import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { MetricCard } from '../components/MetricCard';
import { Panel } from '../components/Panel';
import { dashboardApi } from '../services/dashboardApi';
import type { DashboardData } from '../types/admin';

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    dashboardApi.getDashboard().then((result) => setData(result));
  }, []);

  return <section className="page-stack"><div className="metric-grid">{(data?.metrics || []).map((metric) => <MetricCard key={metric.label} {...metric} />)}</div><Panel title="异步任务队列"><DataTable columns={['队列', '运行中', '失败', '成功率']} rows={(data?.queues || []).map((item) => [item.name, item.running, item.failed, item.successRate])} /></Panel></section>;
}
