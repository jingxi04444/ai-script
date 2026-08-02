import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { BellOutlined, CheckCircleOutlined, ExperimentOutlined, FileDoneOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons';
import { analyticsApi } from '../../../api/analytics';
import { complianceApi } from '../../../api/compliance';
import { generationApi } from '../../../api/generation';
import { notificationApi } from '../../../api/notification';
import { paymentApi } from '../../../api/payment';
import type { AbTest, AnalyticsMetric, MonitorLink } from '../../../types/analytics';
import type { ComplianceCheckResult } from '../../../types/compliance';
import type { ExportJob } from '../../../types/generation';
import type { Notification } from '../../../types/notification';
import type { Quota } from '../../../types/payment';
import './delivery-panel.css';

interface DeliveryPanelProps {
  projectId: string | null;
  ensureProjectId: () => Promise<string>;
}

const DeliveryPanel = ({ projectId, ensureProjectId }: DeliveryPanelProps) => {
  const [checkText, setCheckText] = useState('');
  const [checkResult, setCheckResult] = useState<ComplianceCheckResult | null>(null);
  const [originalityResult, setOriginalityResult] = useState<ComplianceCheckResult | null>(null);
  const [exports, setExports] = useState<ExportJob[]>([]);
  const [links, setLinks] = useState<MonitorLink[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [abTests, setAbTests] = useState<AbTest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [monitorUrl, setMonitorUrl] = useState('');
  const [abTestName, setAbTestName] = useState('');
  const [exportName, setExportName] = useState('final-video.mp4');

  const totalPlays = useMemo(() => metrics.reduce((sum, item) => sum + (item.plays || 0), 0), [metrics]);

  const loadDelivery = useCallback(async () => {
    try {
      const [exportPage, linkPage, metricPage, testPage, notificationPage, quotaList] = await Promise.all([
        generationApi.exports({ projectId: projectId || undefined, page: 1, pageSize: 8 }),
        analyticsApi.monitorLinks({ projectId: projectId || undefined, page: 1, pageSize: 8 }),
        analyticsApi.metrics({ projectId: projectId || undefined, page: 1, pageSize: 8 }),
        analyticsApi.abTests({ projectId: projectId || undefined, page: 1, pageSize: 8 }),
        notificationApi.list({ page: 1, pageSize: 8 }),
        paymentApi.quotas().catch(() => []),
      ]);
      setExports(exportPage.list || []);
      setLinks(linkPage.list || []);
      setMetrics(metricPage.list || []);
      setAbTests(testPage.list || []);
      setNotifications(notificationPage.list || []);
      setQuotas(quotaList);
    } catch {
      message.error('预览与投放数据加载失败');
    }
  }, [projectId]);

  useEffect(() => {
    loadDelivery();
  }, [loadDelivery]);

  const runCompliance = async () => {
    if (!checkText.trim()) return message.warning('请输入需要检测的文案');
    try {
      const result = await complianceApi.check({ content: checkText });
      setCheckResult(result);
      message.success('合规检测完成');
    } catch {
      message.error('合规检测失败');
    }
  };

  const runOriginality = async () => {
    if (!checkText.trim()) return message.warning('请输入需要检测的文案');
    try {
      const result = await complianceApi.originality({ content: checkText });
      setOriginalityResult(result);
      message.success('原创度检测完成');
    } catch {
      message.error('原创度检测失败');
    }
  };

  const createExport = async () => {
    const currentProjectId = await ensureProjectId();
    try {
      await generationApi.createExport({
        projectId: currentProjectId,
        exportType: 'video',
        resolution: '1080x1920',
        fileName: exportName || 'final-video.mp4',
      });
      message.success('导出任务已创建');
      loadDelivery();
    } catch {
      message.error('导出任务创建失败');
    }
  };

  const createMonitorLink = async () => {
    if (!monitorUrl.trim()) return message.warning('请输入监测链接');
    const currentProjectId = await ensureProjectId();
    try {
      await analyticsApi.createMonitorLink({
        projectId: currentProjectId,
        linkType: 'campaign',
        variantName: '默认投放',
        url: monitorUrl,
        status: 1,
      });
      setMonitorUrl('');
      message.success('监测链接已保存');
      loadDelivery();
    } catch {
      message.error('监测链接保存失败');
    }
  };

  const createAbTest = async () => {
    if (!abTestName.trim()) return message.warning('请输入实验名称');
    const currentProjectId = await ensureProjectId();
    try {
      await analyticsApi.createAbTest({ projectId: currentProjectId, testName: abTestName, status: 'draft' });
      setAbTestName('');
      message.success('A/B 实验已创建');
      loadDelivery();
    } catch {
      message.error('A/B 实验创建失败');
    }
  };

  const markRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      message.success('通知已标记已读');
      loadDelivery();
    } catch {
      message.error('通知状态更新失败');
    }
  };

  return (
    <section className="delivery-panel">
      <header className="workspace-panel-head">
        <div>
          <h2>视频预览与投放</h2>
          <p>完成合规原创度检查、导出、投放监测和通知处理。</p>
        </div>
        <button onClick={loadDelivery}><ReloadOutlined />刷新</button>
      </header>

      <div className="delivery-grid">
        <section className="delivery-card compliance-card">
          <h3>合规 / 原创度检测</h3>
          <textarea value={checkText} onChange={(event) => setCheckText(event.target.value)} placeholder="粘贴脚本文案、口播文案或预览字幕" />
          <div className="inline-actions">
            <button onClick={runCompliance}><CheckCircleOutlined />合规检测</button>
            <button onClick={runOriginality}><ExperimentOutlined />原创度检测</button>
          </div>
          <div className="check-results">
            <article>
              <strong>风险词</strong>
              <span>{checkResult ? `${checkResult.riskCount} 个` : '未检测'}</span>
            </article>
            <article>
              <strong>相似度</strong>
              <span>{originalityResult?.similarityPercent || '未检测'}</span>
            </article>
          </div>
        </section>

        <section className="delivery-card">
          <h3>成片导出</h3>
          <input value={exportName} onChange={(event) => setExportName(event.target.value)} placeholder="导出文件名" />
          <button onClick={createExport}><FileDoneOutlined />创建导出任务</button>
          <div className="simple-list">
            {exports.map((item) => (
              <article key={item.id}>
                <strong>{item.fileName || item.exportType || '导出任务'}</strong>
                <span>{item.status || 'created'}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="delivery-card">
          <h3>投放监测</h3>
          <input value={monitorUrl} onChange={(event) => setMonitorUrl(event.target.value)} placeholder="投放链接或落地页 URL" />
          <button onClick={createMonitorLink}><LinkOutlined />保存监测链接</button>
          <div className="metric-row">
            <strong>{totalPlays}</strong>
            <span>累计播放</span>
          </div>
          <div className="simple-list">
            {links.map((item) => (
              <article key={item.id}>
                <strong>{item.variantName || item.linkType || '监测链接'}</strong>
                <span>{item.status === 1 ? '启用' : '停用'}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="delivery-card">
          <h3>A/B 实验</h3>
          <input value={abTestName} onChange={(event) => setAbTestName(event.target.value)} placeholder="实验名称" />
          <button onClick={createAbTest}><ExperimentOutlined />创建实验</button>
          <div className="simple-list">
            {abTests.map((item) => (
              <article key={item.id}>
                <strong>{item.testName || '未命名实验'}</strong>
                <span>{item.status || 'draft'}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="delivery-card">
          <h3>配额</h3>
          <div className="simple-list">
            {quotas.map((item) => (
              <article key={item.id}>
                <strong>{item.quotaType}</strong>
                <span>{item.remainingCount}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="delivery-card">
          <h3>系统通知</h3>
          <div className="simple-list notification-list">
            {notifications.map((item) => (
              <article key={item.id}>
                <strong><BellOutlined />{item.title}</strong>
                <button disabled={item.status === 1} onClick={() => markRead(item.id)}>
                  {item.status === 1 ? '已读' : '标记已读'}
                </button>
              </article>
            ))}
            {!notifications.length && <p className="empty-hint">暂无通知</p>}
          </div>
        </section>
      </div>
    </section>
  );
};

export default DeliveryPanel;
