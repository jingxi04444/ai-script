import { useEffect, useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { Panel } from '../components/Panel';
import { analyticsApi } from '../services/analyticsApi';
import type { AnalyticsData } from '../types/admin';

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    analyticsApi.getAnalytics().then((result) => setData(result));
  }, []);

  return <section className="page-stack"><div className="metric-grid"><MetricCard label="播放量" value={data?.plays || '-'} delta="近 7 天" /><MetricCard label="互动率" value={data?.interactionRate || '-'} delta="高于均值" /><MetricCard label="订单数" value={data?.orders || '-'} delta="模拟数据" /><MetricCard label="ROI" value={data?.roi || '-'} delta="后续接平台" /></div><Panel title="A/B 测试报告"><p>当前 MVP 暂不实现真实投放数据，页面先保留报表结构。</p></Panel></section>;
}
