import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import HomeRail from '../../components/Layout/HomeRail';
import MemberPaymentDialog from '../../components/Modal/MemberPaymentDialog';
import RechargeDialog from '../../components/Modal/RechargeDialog';
import ProjectsPage from '../Projects/ProjectsPage';

const quickActions = ['开始创作', 'Seedance2.0', '生图', '角色三视图', '剧本分集'];
const hotWorks = [
  { title: '【古装真人】霍去病', tone: 'period' },
  { title: '【剧情真人】大胖猫', tone: 'cat' },
  { title: '【耳机广告】酷运动，静...', tone: 'sport' },
  { title: '【产品广告】你那什么马', tone: 'horse' },
  { title: '【饮品广告】激活你的内...', tone: 'energy' },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [commerceDialog, setCommerceDialog] = useState<'member' | 'recharge' | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const { logout } = useAuthStore();

  return (
    <>
      {showProjects ? (
        <ProjectsPage
          onHome={() => setShowProjects(false)}
          onCreate={() => navigate('/workspace')}
          onMember={() => setCommerceDialog('member')}
          onRecharge={() => setCommerceDialog('recharge')}
          onLogout={logout}
        />
      ) : (
        <main className="home-app-shell">
          <HomeRail
            activeLabel="首页"
            onCreate={() => navigate('/workspace')}
            onProjects={() => setShowProjects(true)}
            onMember={() => setCommerceDialog('member')}
            onRecharge={() => setCommerceDialog('recharge')}
          />
          <section className="home-stage">
            <div className="hero-carousel" aria-label="活动轮播">
              <article className="hero-card side seedance" onClick={() => navigate('/workspace')}>
                <div><h2>Seedance 2.0 上线</h2><p>解锁真人生成 丝滑无需排队</p></div>
              </article>
              <article className="hero-card center" onClick={() => navigate('/workspace')}>
                <div className="hero-nano-cover" />
              </article>
              <article className="hero-card side image-model" onClick={() => navigate('/workspace')}>
                <div><h2>纳米 Image 2.0 超清图片模型上线</h2><p>画质提升 精准编辑 超强思考 文字渲染</p></div>
              </article>
            </div>

            <div className="quick-actions">
              {quickActions.map((action, index) => (
                <button key={action} className={index === 0 ? 'primary' : ''} onClick={() => navigate('/workspace')}>
                  {index === 0 && <span className="quick-action-plus">+</span>}
                  <b>{action}</b>
                </button>
              ))}
            </div>

            <section className="hot-section">
              <header className="hot-header">
                <h2>爆款作品</h2>
                <div className="hot-tabs">
                  <button className="active">全部</button>
                  <button>剧情片</button>
                  <button>广告片</button>
                  <button>宣传片</button>
                </div>
              </header>
              <div className="hot-row">
                {hotWorks.map((work) => (
                  <button className={`hot-card ${work.tone}`} key={work.title} onClick={() => navigate('/workspace')}>
                    <div className="hot-thumb"><span /></div>
                    <strong>{work.title}</strong>
                  </button>
                ))}
              </div>
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
      )}
    </>
  );
};

export default HomePage;
