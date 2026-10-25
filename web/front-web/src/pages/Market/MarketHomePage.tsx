import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightOutlined,
  BarChartOutlined,
  CompassOutlined,
  FireFilled,
  LinkOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { marketFunctionApi } from '../../api/marketFunction';
import HomeRail from '../../components/Layout/HomeRail';
import type { MarketFunction } from '../../types/marketFunction';
import './market-home-page.css';

const featureIcons: Record<string, React.ReactNode> = {
  flame: <FireFilled />,
  search: <SearchOutlined />,
  sparkles: <StarOutlined />,
  chart: <BarChartOutlined />,
  video: <PlayCircleOutlined />,
  link: <LinkOutlined />,
  bolt: <ThunderboltOutlined />,
};

const MarketHomePage = () => {
  const navigate = useNavigate();
  const [features, setFeatures] = useState<MarketFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    marketFunctionApi.listPublished(controller.signal)
      .then((items) => {
        setFeatures(items);
        setLoadFailed(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFeatures([]);
        setLoadFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const openFeature = (feature: MarketFunction) => {
    if (feature.featureType === 'external') {
      window.open(feature.route, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(feature.route);
  };

  const categories = Array.from(new Set(features.map((item) => item.category).filter(Boolean)));

  return (
    <main className="market-home-page">
      <HomeRail activeLabel="市场" />
      <section className="market-home-stage">
        <header className="market-home-hero">
          <div>
            <p className="market-home-eyebrow">AI SCRIPT / MARKET</p>
            <h1>市场</h1>
            <p>选择一个已上架能力，进入对应的创作与增长工作台。</p>
          </div>
          <div className="market-home-orbit" aria-hidden="true">
            <span><CompassOutlined /></span>
            <i />
            <i />
          </div>
        </header>

        <section className="market-home-summary">
          <div><span>已上架能力</span><strong>{features.length.toString().padStart(2, '0')}</strong></div>
          <div><span>能力分类</span><strong>{categories.length.toString().padStart(2, '0')}</strong></div>
          <p>后台可控制上架状态、介绍文案、入口和展示顺序。用户只会看到当前已上架的功能。</p>
        </section>

        <section className="market-home-catalog" aria-live="polite">
          <header>
            <div>
              <p>AVAILABLE CAPABILITIES</p>
              <h2>全部功能</h2>
            </div>
            <span>点击卡片进入详情</span>
          </header>

          {loading ? (
            <div className="market-home-state">正在加载市场功能...</div>
          ) : loadFailed ? (
            <div className="market-home-state">
              <strong>市场功能加载失败</strong>
              <span>请确认后台服务已启动后刷新页面。</span>
            </div>
          ) : features.length === 0 ? (
            <div className="market-home-state">
              <strong>市场暂未上架功能</strong>
              <span>管理员在后台功能管理中上架后，这里会自动展示。</span>
            </div>
          ) : (
            <div className={`market-feature-grid count-${Math.min(features.length, 4)}`}>
              {features.map((feature, index) => (
                <button
                  className={`market-feature-card ${index === 0 ? 'featured' : ''}`}
                  key={feature.id}
                  type="button"
                  onClick={() => openFeature(feature)}
                >
                  <div className="market-feature-art">
                    {feature.coverUrl
                      ? <img src={feature.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      : <span className="market-feature-symbol">{featureIcons[feature.icon] || <StarOutlined />}</span>}
                    <span className="market-feature-number">{String(index + 1).padStart(2, '0')}</span>
                    {feature.badge && <span className="market-feature-badge">{feature.badge}</span>}
                  </div>
                  <div className="market-feature-copy">
                    <p>{feature.category || '创作能力'}</p>
                    <h3>{feature.title}</h3>
                    <span>{feature.summary}</span>
                    <div className="market-feature-tags">
                      {feature.tags.slice(0, 3).map((tag) => <i key={tag}>#{tag}</i>)}
                    </div>
                  </div>
                  <div className="market-feature-action">
                    <span>进入功能</span>
                    <ArrowRightOutlined />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
};

export default MarketHomePage;
