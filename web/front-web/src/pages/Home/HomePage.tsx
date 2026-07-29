import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppstoreOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { siteApi, type HomeBanner } from '../../api/site';
import HomeRail from '../../components/Layout/HomeRail';
import MemberPaymentDialog from '../../components/Modal/MemberPaymentDialog';
import RechargeDialog from '../../components/Modal/RechargeDialog';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import './home-page.css';

type QuickAction = {
  key: 'create' | 'brief' | 'generator' | 'viral' | 'template';
  label: string;
  description: string;
  step: 'selling-points' | 'script-generator';
  mode?: 'viral' | 'template' | 'original';
  icon: 'create' | 'brief' | 'generator' | 'viral' | 'template';
  iconUrl?: string;
};

const defaultQuickActions: QuickAction[] = [
  { key: 'create', label: '开始创作', description: '电商全链路从产品brief优化到成片输出', step: 'selling-points', icon: 'create' },
  { key: 'brief', label: '产品brief', description: '优化卖点并检测分数', step: 'selling-points', icon: 'brief' },
  { key: 'generator', label: '脚本生成器', description: '精准高质量的生成脚本', step: 'script-generator', icon: 'generator' },
  { key: 'viral', label: '爆款链接脚本复刻', description: '输入参考链接，即可获得高质量脚本', step: 'script-generator', mode: 'viral', icon: 'viral' },
  { key: 'template', label: '脚本模板库', description: '内置大量优质脚本，一键即可出脚本', step: 'script-generator', mode: 'template', icon: 'template' },
];

const quickActionIcons = {
  create: <PlusOutlined />,
  brief: <EditOutlined />,
  generator: <ThunderboltOutlined />,
  viral: <LinkOutlined />,
  template: <AppstoreOutlined />,
};

interface HomeWork {
  key: string;
  label: string;
  tone: string;
  category: string;
  imageUrl?: string;
  linkUrl?: string;
}

const defaultHotWorks: HomeWork[] = [
  { key: 'work-home', label: '智能家居生活焕新', tone: 'period', category: '家居家电' },
  { key: 'work-chair', label: '按摩椅舒适体验', tone: 'cat', category: '家居家电' },
  { key: 'work-headset', label: '耳机沉浸式种草', tone: 'sport', category: '电商种草视频' },
  { key: 'work-unboxing', label: '新品好物开箱推荐', tone: 'horse', category: '电商种草视频' },
  { key: 'work-drink', label: '饮品主图视觉广告', tone: 'energy', category: '主图广告' },
  { key: 'work-brand', label: '品牌年度形象片', tone: 'period', category: 'TVC 宣传片' },
];

const HomePage = () => {
  const navigate = useNavigate();
  const resetWorkspace = useWorkspaceStore((state) => state.reset);
  const setActiveStep = useWorkspaceStore((state) => state.setActiveStep);
  const setScriptMode = useWorkspaceStore((state) => state.setScriptMode);
  const [commerceDialog, setCommerceDialog] = useState<'member' | 'recharge' | null>(null);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const [quickActions, setQuickActions] = useState<QuickAction[]>(defaultQuickActions);
  const [hotWorks, setHotWorks] = useState<HomeWork[]>(defaultHotWorks);
  const [worksTitle, setWorksTitle] = useState('作品');
  const [activeCategory, setActiveCategory] = useState('全部');

  useEffect(() => {
    let active = true;
    setBannerLoading(true);
    setBannerLoadFailed(false);
    siteApi.getHomeBanners()
      .then((items) => {
        if (!active) return;
        setBanners(Array.isArray(items) ? items : []);
        setActiveBanner(0);
      })
      .catch(() => {
        if (!active) return;
        setBanners([]);
        setBannerLoadFailed(true);
      })
      .finally(() => {
        if (active) setBannerLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    siteApi.getConfig().then((config) => {
      if (!config.homeVisualConfig?.trim()) return;
      try {
        const parsed = JSON.parse(config.homeVisualConfig) as {
          quickActions?: Array<{ key: string; label?: string; description?: string; iconUrl?: string }>;
          worksTitle?: string;
          works?: Array<Partial<HomeWork> & { key?: string }>;
        };
        const configuredActions = new Map((parsed.quickActions || []).map((item) => [item.key, item]));
        setQuickActions(defaultQuickActions.map((item) => ({ ...item, ...configuredActions.get(item.key), key: item.key, step: item.step, mode: item.mode, icon: item.icon })));
        if (parsed.worksTitle?.trim()) setWorksTitle(parsed.worksTitle);
        if (Array.isArray(parsed.works) && parsed.works.length) {
          setHotWorks(parsed.works.map((work, index) => ({
            key: work.key || `work-${index}`,
            label: work.label || `作品 ${index + 1}`,
            category: work.category || '其他',
            tone: work.tone || defaultHotWorks[index % defaultHotWorks.length].tone,
            imageUrl: work.imageUrl,
            linkUrl: work.linkUrl,
          })));
        }
      } catch {
        setQuickActions(defaultQuickActions);
        setHotWorks(defaultHotWorks);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const handleOpen = () => {
    resetWorkspace();
    navigate('/workspace');
  };

  const handleQuickAction = (action: QuickAction) => {
    resetWorkspace();
    setActiveStep(action.step);
    if (action.mode) setScriptMode(action.mode);
    const params = new URLSearchParams();
    params.set('step', action.step);
    if (action.mode) params.set('scriptMode', action.mode);
    navigate(`/workspace?${params.toString()}`);
  };

  const moveBanner = (offset: number) => {
    if (banners.length <= 1) return;
    setActiveBanner((current) => (current + offset + banners.length) % banners.length);
  };

  const openBanner = (banner: HomeBanner) => {
    if (!banner.linkUrl) return handleOpen();
    if (banner.linkUrl.startsWith('/')) navigate(banner.linkUrl);
    else window.open(banner.linkUrl, '_blank', 'noopener,noreferrer');
  };

  const openWork = (work: HomeWork) => {
    if (!work.linkUrl) return handleOpen();
    if (work.linkUrl.startsWith('/')) navigate(work.linkUrl);
    else window.open(work.linkUrl, '_blank', 'noopener,noreferrer');
  };

  const workCategories = ['全部', ...Array.from(new Set(hotWorks.map((work) => work.category).filter(Boolean)))];
  const visibleWorks = activeCategory === '全部' ? hotWorks : hotWorks.filter((work) => work.category === activeCategory);

  return (
    <main className="prototype-home">
      <HomeRail
        activeLabel="首页"
        onCreate={handleOpen}
        onMember={() => setCommerceDialog('member')}
        onRecharge={() => setCommerceDialog('recharge')}
      />

      <section className="home-stage">
        <div
          className={`hero-carousel banner-count-${banners.length}`}
          aria-label="活动轮播"
          style={banners.length > 3 ? { gridTemplateColumns: `repeat(${banners.length}, minmax(0, 1fr))` } : undefined}
        >
          {banners.length > 1 && <button className="carousel-arrow left" aria-label="上一张" onClick={() => moveBanner(-1)}>‹</button>}
          {bannerLoading && <div className="hero-carousel-state">轮播内容加载中...</div>}
          {!bannerLoading && banners.length === 0 && (
            <div className="hero-carousel-state">{bannerLoadFailed ? '轮播内容加载失败' : '暂无轮播内容'}</div>
          )}
          {banners.map((banner, index) => {
            const isCenter = index === activeBanner;
            const fallbackTone = index % 3 === 0 ? 'seedance' : index % 3 === 2 ? 'image-model' : '';
            return (
              <article
                className={`hero-card ${isCenter ? 'center' : 'side'} ${fallbackTone} ${banner.imageUrl ? 'has-image' : ''}`}
                key={banner.id ?? `${banner.title}-${index}`}
                onClick={() => openBanner(banner)}
              >
                {banner.imageUrl && <img src={banner.imageUrl} alt="" />}
                <div><h2>{banner.title}</h2><p>{banner.subtitle}</p></div>
              </article>
            );
          })}
          {banners.length > 1 && <button className="carousel-arrow right" aria-label="下一张" onClick={() => moveBanner(1)}>›</button>}
        </div>

        <div className="carousel-dots" aria-label={`共 ${banners.length} 张轮播图`}>
          {banners.map((banner, index) => <span key={`${banner.id ?? banner.title}-${index}-dot`} className={index === activeBanner ? 'active' : ''} />)}
        </div>

        <div className="quick-actions">
          {quickActions.map((action, index) => (
            <button key={action.key} className={index === 0 ? 'primary' : ''} onClick={() => handleQuickAction(action)}>
              <span className="quick-action-icon" aria-hidden="true">
                {action.iconUrl ? <img src={action.iconUrl} alt="" /> : quickActionIcons[action.icon]}
              </span>
              <span className="quick-action-copy">
                <b>{action.label}</b>
                <small>{action.description}</small>
              </span>
            </button>
          ))}
        </div>

        <section className="hot-section">
          <header className="hot-header">
            <h2>{worksTitle}</h2>
            <div className="hot-tabs">
              {workCategories.map((category) => (
                <button key={category} className={category === activeCategory ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>
              ))}
            </div>
          </header>
          <div className="hot-row">
            {visibleWorks.map((work) => (
              <button className={`hot-card ${work.tone}`} key={work.key} onClick={() => openWork(work)}>
                <div className={`hot-thumb ${work.imageUrl ? 'has-image' : ''}`}>
                  {work.imageUrl ? <img src={work.imageUrl} alt="" /> : <span />}
                </div>
                <strong>{work.label}</strong>
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
  );
};

export default HomePage;
