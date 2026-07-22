import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, FileText, FolderKanban, RefreshCcw, Users, Video } from 'lucide-react';
import { dashboardApi, type DashboardSummary } from '../../api/dashboard';
import { EmptyState, PageHeader, SectionCard, StatCard } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';

const DashboardPage = () => {
  const { notify } = useAdminShell();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getSummary();
      setSummary(data);
    } catch {
      setSummary(null);
      notify('仪表盘数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = [
    { icon: <Users size={22} />, label: '总用户数', value: String(summary?.userCount ?? 0), note: '来自 /api/admin/dashboard/summary' },
    { icon: <FolderKanban size={22} />, label: '总项目数', value: String(summary?.projectCount ?? 0), note: '当前项目规模' },
    { icon: <FileText size={22} />, label: '总脚本数', value: String(summary?.scriptCount ?? 0), note: '脚本产出量' },
    { icon: <Video size={22} />, label: '总视频数', value: String(summary?.videoCount ?? 0), note: '视频生成量' },
  ];

  const trend = [68, 72, 55, 84, 66, 92, 78];

  return (
    <div className="page-stack">
      <PageHeader
        title="运营仪表盘"
        description="从用户、项目、脚本和视频四个维度快速查看后台健康度。"
        actions={
          <button className="toolbar-btn" onClick={load} type="button" disabled={loading}>
            <RefreshCcw size={16} />
            刷新数据
          </button>
        }
      />

      <div className="stat-grid">
        {stats.map((item) => (
          <StatCard key={item.label} icon={item.icon} label={item.label} value={item.value} note={item.note} />
        ))}
      </div>

      <div className="page-grid">
        <SectionCard
          title="趋势预览"
          description="当前仅展示趋势占位，后续可接入更完整的运营图表。"
          action={<span className="status-badge blue">最近 7 天</span>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', alignItems: 'end', gap: 12, height: 230, marginTop: 8 }}>
            {trend.map((height, index) => (
              <button
                key={index}
                type="button"
                className="toolbar-btn"
                style={{ height: `${height}%`, minHeight: 32, padding: 0, borderRadius: 12, background: 'linear-gradient(180deg, #9dff96, #2ea44f 62%, rgba(46, 164, 79, 0.18))' }}
                onClick={() => notify(`查看第 ${index + 1} 天数据`)}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="运营提示" description="根据当前后端返回数据快速提醒管理员。">
          <EmptyState
            title="暂无更多运营明细"
            description="已接入 summary 基础指标，更多趋势、转化和收入图表可在后端补充后继续接入。"
            icon={<Activity size={22} />}
            action={
              <button className="toolbar-btn primary" type="button" onClick={() => notify('已查看运营提示')}>
                <ArrowUpRight size={16} />
                查看说明
              </button>
            }
          />
        </SectionCard>
      </div>
    </div>
  );
};

export default DashboardPage;
