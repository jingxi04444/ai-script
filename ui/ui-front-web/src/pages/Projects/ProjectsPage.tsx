import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleOutlined, PlusOutlined, SearchOutlined, DownOutlined, ReloadOutlined, UnorderedListOutlined, AppstoreOutlined, FolderOutlined, FileTextOutlined, VideoCameraOutlined, LeftOutlined, MoreOutlined, EyeOutlined, EditOutlined, CopyOutlined } from '@ant-design/icons';
import HomeRail from '../../components/Layout/HomeRail';
import MemberPaymentDialog from '../../components/Modal/MemberPaymentDialog';
import RechargeDialog from '../../components/Modal/RechargeDialog';

interface ProjectsPageProps {
  onHome?: () => void;
  onCreate?: () => void;
  onMember?: () => void;
  onRecharge?: () => void;
  onLogout?: () => void;
}

const myProjectItems = [
  { id: 'project-a', name: '加热饭盒-抖音推广', category: '智能家居', updatedAt: '2025-05-19 14:30', status: '进行中', statusTone: 'active', brief: 3, scripts: 6, videos: 4, thumbTone: 'lunchbox' },
  { id: 'project-b', name: '宠物饮水机-618投放', category: '宠物用品', updatedAt: '2025-05-18 10:22', status: '已发布', statusTone: 'published', brief: 2, scripts: 5, videos: 3, thumbTone: 'pet' },
  { id: 'project-c', name: '护眼台灯-种草视频', category: '家居用品', updatedAt: '2025-05-17 16:45', status: '进行中', statusTone: 'active', brief: 2, scripts: 4, videos: 2, thumbTone: 'lamp' },
  { id: 'project-d', name: '母婴消毒柜-平台模板', category: '母婴家电', updatedAt: '2025-05-16 11:08', status: '审核中', statusTone: 'review', brief: 3, scripts: 6, videos: 4, thumbTone: 'sterilizer' },
  { id: 'project-e', name: '便携榨汁杯-小红书种草', category: '厨房电器', updatedAt: '2025-05-15 09:30', status: '未开始', statusTone: 'idle', brief: 1, scripts: 2, videos: 0, thumbTone: 'juicer' },
  { id: 'project-f', name: '筋膜枪-运动恢复系列', category: '运动健康', updatedAt: '2025-05-14 18:20', status: '进行中', statusTone: 'active', brief: 2, scripts: 3, videos: 1, thumbTone: 'massage' },
  { id: 'project-g', name: '露营灯-户外场景视频', category: '户外装备', updatedAt: '2025-05-13 21:05', status: '已发布', statusTone: 'published', brief: 2, scripts: 4, videos: 3, thumbTone: 'lantern' },
  { id: 'project-h', name: '智能垃圾桶-家庭系列', category: '生活用品', updatedAt: '2025-05-12 15:40', status: '未开始', statusTone: 'idle', brief: 1, scripts: 2, videos: 0, thumbTone: 'bin' },
];

function MyProjectStatus({ label, tone }: { label: string; tone: string }) {
  return <span className={`my-project-status ${tone}`}><i />{label}</span>;
}

function MyProjectThumb({ tone }: { tone: string }) {
  return <span className={`my-project-thumb ${tone}`} aria-hidden="true"><i /><b /><em /></span>;
}

const ProjectsPage = ({ onHome, onCreate, onMember, onRecharge, onLogout }: ProjectsPageProps) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [commerceDialog, setCommerceDialog] = useState<'member' | 'recharge' | null>(null);

  return (
    <main className="home-app-shell my-projects-shell">
      <HomeRail
        activeLabel="我的项目"
        onCreate={onCreate}
        onHome={onHome}
        onMember={() => setCommerceDialog('member')}
        onRecharge={() => setCommerceDialog('recharge')}
      />

      <section className="my-projects-page">
        <header className="my-projects-hero">
          <div>
            <button className="back-home-button" onClick={onHome}><LeftOutlined />首页</button>
            <h1>我的项目</h1>
          </div>
          <div className="my-projects-hero-actions">
            <span className="my-projects-loaded"><CheckCircleOutlined />全部项目已加载（8）</span>
            <button className="my-projects-create-button" onClick={() => navigate('/workspace')}>
              <PlusOutlined />新建项目
            </button>
          </div>
        </header>

        <section className="my-projects-toolbar" aria-label="项目筛选">
          <label className="my-projects-search"><SearchOutlined /><input placeholder="搜索项目名称" /></label>
          <button className="my-projects-filter-button">全部状态<DownOutlined /></button>
          <button className="my-projects-filter-button">全部类型<DownOutlined /></button>
          <button className="my-projects-filter-button compact">更新时间<DownOutlined /></button>
          <button className="my-projects-refresh" aria-label="刷新项目"><ReloadOutlined /></button>
        </section>

        <section className="my-projects-viewbar" aria-label="视图切换">
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><UnorderedListOutlined />列表</button>
          <button className={viewMode === 'card' ? 'active' : ''} onClick={() => setViewMode('card')}><AppstoreOutlined />卡片</button>
        </section>

        <section className="my-projects-content">
          <section className="my-project-table">
            <div className="my-project-table-head">
              <span>项目名称</span>
              <span>更新时间 <b>↕</b></span>
              <span>状态</span>
              <span>Brief</span>
              <span>脚本</span>
              <span>AI视频</span>
              <span>操作</span>
            </div>
            <div className="my-project-table-body">
              {myProjectItems.map((item) => (
                <article className="my-project-table-row" key={item.id}>
                  <div className="my-project-table-name">
                    <MyProjectThumb tone={item.thumbTone} />
                    <div><strong>{item.name}</strong><small>{item.category}</small></div>
                  </div>
                  <time>{item.updatedAt}</time>
                  <MyProjectStatus label={item.status} tone={item.statusTone} />
                  <span>{item.brief}</span>
                  <span>{item.scripts}</span>
                  <span>{item.videos}</span>
                  <div className="my-project-table-actions">
                    <button>查看</button>
                    <button onClick={() => navigate('/workspace')}>继续编辑</button>
                    <button aria-label="更多操作"><MoreOutlined /></button>
                  </div>
                </article>
              ))}
            </div>
            <footer className="my-project-pagination">
              <span>共 8 条</span>
              <div>
                <button>10条/页 <DownOutlined /></button>
                <button>1</button>
                <button>2</button>
                <label>前往 <input value="1" readOnly /> 页</label>
              </div>
            </footer>
          </section>
        </section>
      </section>

      {commerceDialog === 'member' && (
        <MemberPaymentDialog
          onClose={() => setCommerceDialog(null)}
          onRecharge={() => setCommerceDialog('recharge')}
        />
      )}
      {commerceDialog === 'recharge' && (
        <RechargeDialog onClose={() => setCommerceDialog(null)} />
      )}
    </main>
  );
};

export default ProjectsPage;
