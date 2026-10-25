import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import {
  ArrowLeftOutlined,
  CloseOutlined,
  CopyOutlined,
  EyeOutlined,
  HeartFilled,
  HeartOutlined,
  LikeFilled,
  LinkOutlined,
  MessageOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShareAltOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { marketViralApi } from '../../api/marketViral';
import HomeRail from '../../components/Layout/HomeRail';
import { config } from '../../config';
import type { MarketViralPlatform, MarketViralVideo } from '../../types/marketViral';
import { formatDateTime } from '../../utils/format';
import './market-viral-page.css';

type PlatformFilter = 'all' | MarketViralPlatform;
type ResultView = 'all' | 'favorites';

const platformName = (platform: MarketViralPlatform) => platform === 'douyin' ? '抖音' : '小红书';

const formatDuration = (seconds?: number | null) => (
  seconds && seconds > 0 ? `${seconds} 秒` : '时长未知'
);

const formatCount = (value?: number) => {
  const count = value || 0;
  if (count >= 100_000_000) return `${(count / 100_000_000).toFixed(count >= 1_000_000_000 ? 0 : 1)}亿`;
  if (count >= 10_000) return `${(count / 10_000).toFixed(count >= 100_000 ? 0 : 1)}万`;
  return String(count);
};

const requestNo = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `market-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const MarketViralPage = () => {
  const navigate = useNavigate();
  const aliveRef = useRef(true);
  const pollTimerRef = useRef<number>();
  const [category, setCategory] = useState('油烟机');
  const [categoryInput, setCategoryInput] = useState('油烟机');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [resultView, setResultView] = useState<ResultView>('all');
  const [keyword, setKeyword] = useState('');
  const [videos, setVideos] = useState<MarketViralVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<MarketViralVideo | null>(null);
  const [favoritingId, setFavoritingId] = useState<string | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadFailed(false);
      marketViralApi.list({
        page: 1,
        pageSize: 50,
        category,
        platform: platformFilter === 'all' ? undefined : platformFilter,
        keyword: keyword.trim() || undefined,
        favoriteOnly: resultView === 'favorites',
      }, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setVideos(Array.isArray(result.list) ? result.list : []);
          setTotal(result.total || 0);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setVideos([]);
          setTotal(0);
          setLoadFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 160);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [category, keyword, platformFilter, reloadVersion, resultView]);

  const pollRefresh = (taskId: string, targetCategory: string, attempt = 0) => {
    if (!aliveRef.current) return;
    marketViralApi.task(taskId)
      .then(async (task) => {
        if (!aliveRef.current) return;
        setRefreshProgress(task.progress ?? Math.min(92, 12 + attempt * 4));
        if (task.status === 'success') {
          if (config.useMock) await marketViralApi.simulateMockRefresh(targetCategory);
          let resultSummary = '';
          try {
            const result = JSON.parse(task.result || '{}') as { stored?: number; filtered?: number };
            if (Number.isFinite(result.stored)) resultSummary += `，更新 ${result.stored} 条`;
            if (Number.isFinite(result.filtered) && result.filtered) {
              resultSummary += `，过滤 ${result.filtered} 条`;
            }
          } catch {
            // Refresh state is diagnostic only; a successful task still reloads results.
          }
          setCategory(targetCategory);
          setRefreshing(false);
          setRefreshProgress(100);
          message.success(`「${targetCategory}」爆款已抓取${resultSummary}`);
          setReloadVersion((value) => value + 1);
          return;
        }
        if (task.status === 'failed' || task.status === 'canceled') {
          setRefreshing(false);
          setRefreshProgress(0);
          message.error(task.errorMessage || '爆款抓取失败，请检查市场采集配置');
          return;
        }
        if (attempt >= 120) {
          setRefreshing(false);
          setRefreshProgress(0);
          message.warning('抓取仍在后台运行，请稍后刷新查看');
          return;
        }
        pollTimerRef.current = window.setTimeout(
          () => pollRefresh(taskId, targetCategory, attempt + 1),
          1500,
        );
      })
      .catch(() => {
        if (!aliveRef.current) return;
        setRefreshing(false);
        setRefreshProgress(0);
        message.error('无法查询抓取任务');
      });
  };

  const startRefresh = async () => {
    const targetCategory = categoryInput.trim();
    if (!targetCategory) {
      message.warning('请输入目标品类');
      return;
    }
    if (refreshing) return;
    setRefreshing(true);
    setRefreshProgress(4);
    try {
      const task = await marketViralApi.refresh({
        category: targetCategory,
        platforms: platformFilter === 'all' ? ['douyin', 'xiaohongshu'] : [platformFilter],
        requestNo: requestNo(),
      });
      setRefreshProgress(8);
      pollRefresh(task.taskId, targetCategory);
    } catch (error) {
      setRefreshing(false);
      setRefreshProgress(0);
      message.error(error instanceof Error ? error.message : '创建抓取任务失败');
    }
  };

  const copyLink = async (video: MarketViralVideo) => {
    try {
      await navigator.clipboard.writeText(video.sourceUrl);
      message.success('原视频链接已复制');
    } catch {
      message.error('复制失败，请检查浏览器剪贴板权限');
    }
  };

  const startReplication = (video: MarketViralVideo) => {
    const params = new URLSearchParams({
      step: 'script-generator',
      scriptMode: 'viral',
      sourceUrl: video.sourceUrl,
    });
    navigate(`/workspace?${params.toString()}`);
  };

  const toggleFavorite = async (video: MarketViralVideo) => {
    if (favoritingId) return;
    setFavoritingId(video.id);
    try {
      const result = await marketViralApi.favorite(video.id);
      setVideos((current) => {
        const next = current.map((item) => (
          item.id === video.id ? { ...item, favorited: result.favorited } : item
        ));
        return resultView === 'favorites' && !result.favorited
          ? next.filter((item) => item.id !== video.id)
          : next;
      });
      setSelectedVideo((current) => (
        current?.id === video.id ? { ...current, favorited: result.favorited } : current
      ));
      if (resultView === 'favorites' && !result.favorited) {
        setTotal((current) => Math.max(0, current - 1));
      }
      message.success(result.favorited ? '已收藏爆款链接' : '已取消收藏');
    } catch {
      message.error('收藏操作失败，请稍后重试');
    } finally {
      setFavoritingId(null);
    }
  };

  const latestSeenAt = videos.reduce<string | undefined>((latest, video) => {
    if (!video.lastSeenAt) return latest;
    if (!latest) return video.lastSeenAt;
    return new Date(video.lastSeenAt).getTime() > new Date(latest).getTime() ? video.lastSeenAt : latest;
  }, undefined);

  return (
    <main className="market-viral-page">
      <HomeRail activeLabel="市场" />
      <section className="market-viral-stage">
        <button className="market-viral-back" type="button" onClick={() => navigate('/market')}>
          <ArrowLeftOutlined />返回市场
        </button>

        <header className="market-viral-hero">
          <div>
            <p className="market-viral-eyebrow">MARKET / CATEGORY HITS</p>
            <h1>品类爆款链接</h1>
            <p className="market-viral-intro">
              输入品类、选择平台后抓取。展示单品测评视频，按点赞数从高到低排列。
            </p>
          </div>
          <div className="market-viral-hero-stat">
            <span>{resultView === 'favorites' ? '我的收藏' : '当前结果'}</span>
            <strong>{total}</strong>
            <small>{latestSeenAt ? `同步于 ${formatDateTime(latestSeenAt)}` : '等待首次抓取'}</small>
          </div>
        </header>

        <section className="market-viral-searchbar" aria-label="抓取品类爆款">
          <label>
            <span>目标品类</span>
            <input
              value={categoryInput}
              maxLength={40}
              onChange={(event) => setCategoryInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void startRefresh();
              }}
              placeholder="例如：油烟机"
            />
          </label>
          <div className="market-viral-platform-select" role="group" aria-label="选择平台">
            <button type="button" className={platformFilter === 'all' ? 'active' : ''} onClick={() => setPlatformFilter('all')}>全部平台</button>
            <button type="button" className={platformFilter === 'douyin' ? 'active' : ''} onClick={() => setPlatformFilter('douyin')}>抖音</button>
            <button type="button" className={platformFilter === 'xiaohongshu' ? 'active' : ''} onClick={() => setPlatformFilter('xiaohongshu')}>小红书</button>
          </div>
          <button className="market-viral-fetch" type="button" disabled={refreshing} onClick={() => void startRefresh()}>
            <ReloadOutlined spin={refreshing} />
            {refreshing ? '正在抓取' : '抓取爆款'}
          </button>
          {refreshing && <progress value={refreshProgress} max={100} aria-label="抓取进度" />}
        </section>

        <div className="market-viral-rules">
          <span>单品测评</span>
          <span>点赞降序</span>
          <p>已自动过滤多品横测、排行榜、合集与跨品类推荐</p>
        </div>

        <section className="market-viral-results" aria-live="polite">
          <header>
            <div className="market-viral-result-tabs">
              <button type="button" className={resultView === 'all' ? 'active' : ''} onClick={() => setResultView('all')}>全部结果</button>
              <button type="button" className={resultView === 'favorites' ? 'active' : ''} onClick={() => setResultView('favorites')}>
                <HeartFilled />我的收藏
              </button>
            </div>
            <label className="market-viral-result-search">
              <SearchOutlined />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题、作者或标签" />
            </label>
          </header>

          {loading ? (
            <div className="market-viral-state">正在加载爆款列表...</div>
          ) : loadFailed ? (
            <div className="market-viral-state">
              <strong>爆款列表加载失败</strong>
              <button type="button" onClick={() => setReloadVersion((value) => value + 1)}>重新加载</button>
            </div>
          ) : videos.length === 0 ? (
            <div className="market-viral-state">
              <strong>{resultView === 'favorites' ? '还没有收藏爆款链接' : `还没有「${category}」的可用链接`}</strong>
              <p>{resultView === 'favorites' ? '在全部结果中点击收藏，链接会出现在这里。' : '确认品类和平台后，点击“抓取爆款”开始采集。'}</p>
              {resultView === 'all' && <button type="button" onClick={() => void startRefresh()} disabled={refreshing}>立即抓取</button>}
            </div>
          ) : (
            <div className="market-viral-list">
              <div className="market-viral-list-head">
                <span>排名</span><span>封面</span><span>内容</span><span>数据</span><span>操作</span>
              </div>
              {videos.map((video, index) => (
                <article className="market-viral-item" key={video.id}>
                  <div className={`market-viral-rank${index < 3 ? ' top' : ''}`}>
                    <strong>{String(index + 1).padStart(2, '0')}</strong>
                  </div>
                  <button
                    type="button"
                    className={`market-viral-cover ${video.platform}`}
                    onClick={() => setSelectedVideo(video)}
                    aria-label={`查看${video.title}详情`}
                  >
                    {video.coverUrl && (
                      <img
                        src={video.coverUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(event) => { event.currentTarget.hidden = true; }}
                      />
                    )}
                    <span>{platformName(video.platform)}</span>
                    <small>{formatDuration(video.durationSeconds)}</small>
                  </button>
                  <button type="button" className="market-viral-copy" onClick={() => setSelectedVideo(video)}>
                    <p>
                      <strong className={`market-viral-platform-tag ${video.platform}`}>{platformName(video.platform)}</strong>
                      <span>{video.authorName || '未知作者'}</span>
                      {video.publishedAt && <><i />{formatDateTime(video.publishedAt)}</>}
                    </p>
                    <h3>{video.title}</h3>
                    <div>
                      {(video.tags || '').split(',').filter(Boolean).slice(0, 3).map((tag) => <em key={tag}>#{tag}</em>)}
                    </div>
                  </button>
                  <div className="market-viral-metrics">
                    <div className="likes"><LikeFilled /><strong>{formatCount(video.likeCount)}</strong></div>
                    <div><MessageOutlined /><span>{formatCount(video.commentCount)}</span></div>
                    <div><StarOutlined /><span>{formatCount(video.collectCount)}</span></div>
                    <div><ShareAltOutlined /><span>{formatCount(video.shareCount)}</span></div>
                  </div>
                  <div className="market-viral-actions">
                    <button
                      type="button"
                      className={video.favorited ? 'active' : ''}
                      disabled={favoritingId === video.id}
                      onClick={() => void toggleFavorite(video)}
                      title={video.favorited ? '取消收藏' : '收藏爆款链接'}
                    >
                      {video.favorited ? <HeartFilled /> : <HeartOutlined />}
                      {video.favorited ? '已收藏' : '收藏'}
                    </button>
                    <button type="button" onClick={() => setSelectedVideo(video)}><EyeOutlined />查看详情</button>
                    <button type="button" onClick={() => startReplication(video)}><LinkOutlined />带入复刻</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {selectedVideo && (
        <div className="market-viral-detail-backdrop" role="presentation" onClick={() => setSelectedVideo(null)}>
          <section className="market-viral-detail" role="dialog" aria-modal="true" aria-label="爆款链接详情" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <div className="market-viral-detail-meta">
                  <strong className={`market-viral-platform-tag ${selectedVideo.platform}`}>{platformName(selectedVideo.platform)}</strong>
                  <span>{formatDuration(selectedVideo.durationSeconds)}</span>
                </div>
                <h2>{selectedVideo.title}</h2>
              </div>
              <button type="button" aria-label="关闭详情" onClick={() => setSelectedVideo(null)}><CloseOutlined /></button>
            </header>
            <div className="market-viral-detail-body">
              <div className={`market-viral-detail-cover ${selectedVideo.platform}`}>
                {selectedVideo.coverUrl && <img src={selectedVideo.coverUrl} alt="" referrerPolicy="no-referrer" />}
              </div>
              <div className="market-viral-detail-copy">
                <p>{selectedVideo.authorName || '未知作者'} · {formatDateTime(selectedVideo.publishedAt)}</p>
                <div className="market-viral-detail-stats">
                  <span><LikeFilled />{formatCount(selectedVideo.likeCount)} 点赞</span>
                  <span><MessageOutlined />{formatCount(selectedVideo.commentCount)} 评论</span>
                  <span><StarOutlined />{formatCount(selectedVideo.collectCount)} 收藏</span>
                  <span><ShareAltOutlined />{formatCount(selectedVideo.shareCount)} 分享</span>
                </div>
                <div className="market-viral-detail-tags">
                  {(selectedVideo.tags || '').split(',').filter(Boolean).map((tag) => <span key={tag}>#{tag}</span>)}
                </div>
                <a href={selectedVideo.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <LinkOutlined />打开原视频链接
                </a>
              </div>
            </div>
            <footer>
              <button type="button" className={selectedVideo.favorited ? 'active' : ''} onClick={() => void toggleFavorite(selectedVideo)}>
                {selectedVideo.favorited ? <HeartFilled /> : <HeartOutlined />}
                {selectedVideo.favorited ? '取消收藏' : '收藏'}
              </button>
              <button type="button" onClick={() => void copyLink(selectedVideo)}><CopyOutlined />复制链接</button>
              <button type="button" className="primary" onClick={() => startReplication(selectedVideo)}><LinkOutlined />带入复刻</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
};

export default MarketViralPage;
