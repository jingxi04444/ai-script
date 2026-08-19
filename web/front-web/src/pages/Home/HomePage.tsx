import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppstoreOutlined,
  CloseOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
  ShareAltOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import { fileApi } from '../../api/asset';
import { siteApi, type HomeBanner } from '../../api/site';
import HomeRail from '../../components/Layout/HomeRail';
import { config } from '../../config';
import { useProjectStore } from '../../stores/projectStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import CreateProjectDialog, { type CreateProjectValues } from '../Projects/CreateProjectDialog';
import { projectAvatarToDataUrl } from '../Projects/projectAvatar';
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
  videoUrl?: string;
  coverUrl?: string;
  frameTime?: number;
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
  const createProject = useProjectStore((state) => state.createProject);
  const resetWorkspace = useWorkspaceStore((state) => state.reset);
  const setProject = useWorkspaceStore((state) => state.setProject);
  const setActiveStep = useWorkspaceStore((state) => state.setActiveStep);
  const setScriptMode = useWorkspaceStore((state) => state.setScriptMode);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const [quickActions, setQuickActions] = useState<QuickAction[]>(defaultQuickActions);
  const [hotWorks, setHotWorks] = useState<HomeWork[]>(defaultHotWorks);
  const [worksLoaded, setWorksLoaded] = useState(false);
  const [worksTitle, setWorksTitle] = useState('作品');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [previewWork, setPreviewWork] = useState<HomeWork | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
            videoUrl: work.videoUrl,
            coverUrl: work.coverUrl,
            frameTime: work.frameTime,
            linkUrl: work.linkUrl,
          })));
        }
      } catch {
        setQuickActions(defaultQuickActions);
        setHotWorks(defaultHotWorks);
      }
    }).catch(() => undefined).finally(() => setWorksLoaded(true));
  }, []);

  useEffect(() => {
    if (!worksLoaded) return;
    const sharedWorkKey = new URLSearchParams(window.location.search).get('work');
    if (!sharedWorkKey) return;
    const sharedWork = hotWorks.find((work) => work.key === sharedWorkKey && work.videoUrl);
    if (sharedWork) setPreviewWork(sharedWork);
  }, [hotWorks, worksLoaded]);

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

  const handleCreate = () => {
    setCreateDialogOpen(true);
  };

  const confirmCreateProject = async ({ avatarFile, name, announcement }: CreateProjectValues) => {
    try {
      const avatarUrl = avatarFile
        ? config.useMock
          ? await projectAvatarToDataUrl(avatarFile)
          : (await fileApi.upload(avatarFile, 'project-avatar')).url
        : undefined;
      const created = await createProject({
        name,
        announcement,
        avatarUrl,
        category: '产品介绍',
        status: 'active',
      });
      resetWorkspace();
      setProject({ id: created.id, title: created.name });
      message.success('项目创建成功');
      navigate(`/workspace?projectId=${created.id}&step=selling-points`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '项目创建失败，请稍后重试');
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.key === 'create') {
      handleCreate();
      return;
    }
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

  const handleWorkClick = (work: HomeWork) => {
    if (work.videoUrl) {
      setPreviewWork(work);
      return;
    }
    openWork(work);
  };

  const handleSharePreviewWork = async () => {
    if (!previewWork) return;
    // Generate an internal work deep link, never expose the raw video file URL.
    const shareUrlObject = new URL('/home', window.location.origin);
    shareUrlObject.searchParams.set('work', previewWork.key);
    const shareUrl = shareUrlObject.toString();
    const shareData = { title: previewWork.label, text: previewWork.label, url: shareUrl };
    const isTouchDevice = navigator.maxTouchPoints > 0 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    try {
      if (navigator.share && isTouchDevice) {
        await navigator.share(shareData);
        message.success('\u4f5c\u54c1\u5df2\u5206\u4eab');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('textarea');
        input.value = shareUrl;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(input);
        if (!copied) throw new Error('copy failed');
      }
      message.success('\u4f5c\u54c1\u5206\u4eab\u94fe\u63a5\u5df2\u590d\u5236');
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return message.info('\u5df2\u53d6\u6d88\u5206\u4eab');
      message.error('\u5206\u4eab\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u6d4f\u89c8\u5668\u526a\u8d34\u677f\u6743\u9650');
    }
  };
  const workCategories = ['全部', ...Array.from(new Set(hotWorks.map((work) => work.category).filter(Boolean)))];
  const visibleWorks = activeCategory === '全部' ? hotWorks : hotWorks.filter((work) => work.category === activeCategory);

  return (
    <main className="prototype-home">
      <HomeRail
        activeLabel="首页"
        onCreate={handleCreate}
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
              <button className={`hot-card ${work.tone}`} key={work.key} onClick={() => handleWorkClick(work)}>
                <div className={`hot-thumb ${work.coverUrl || work.imageUrl || work.videoUrl ? 'has-image' : ''}`}>
                  {work.coverUrl || work.imageUrl
                    ? <img src={work.coverUrl || work.imageUrl} alt={`${work.label}封面`} />
                    : work.videoUrl
                      ? <video
                        src={work.videoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        controlsList="nodownload noremoteplayback"
                        disablePictureInPicture
                        draggable={false}
                        aria-label={`${work.label}视频封面`}
                        onContextMenu={(event) => event.preventDefault()}
                        onDragStart={(event) => event.preventDefault()}
                        onLoadedMetadata={(event) => {
                          const duration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
                          event.currentTarget.currentTime = Math.min(work.frameTime ?? Math.min(1, duration / 4), duration || 0);
                        }}
                      />
                      : null}
                </div>
                <strong>{work.label}</strong>
              </button>
            ))}
          </div>
        </section>
      </section>

      {previewWork?.videoUrl && (
        <div className="work-video-modal-backdrop" role="presentation" onClick={() => setPreviewWork(null)}>
          <section
            className="work-video-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`播放${previewWork.label}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <strong>{previewWork.label}</strong>
              <div className="work-video-modal-actions">
                <button className="work-video-modal-share" type="button" onClick={handleSharePreviewWork}>
                  <ShareAltOutlined />{'\u5206\u4eab'}
                </button>
                <button type="button" aria-label="关闭视频播放弹窗" onClick={() => setPreviewWork(null)}>
                  <CloseOutlined />
                </button>
              </div>
            </header>
            <video
              src={previewWork.videoUrl}
              poster={previewWork.coverUrl || previewWork.imageUrl}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              draggable={false}
              autoPlay
              playsInline
              onContextMenu={(event) => event.preventDefault()}
              onDragStart={(event) => event.preventDefault()}
            />
          </section>
        </div>
      )}
      {createDialogOpen && (
        <CreateProjectDialog
          onClose={() => setCreateDialogOpen(false)}
          onConfirm={confirmCreateProject}
        />
      )}
    </main>
  );
};

export default HomePage;
