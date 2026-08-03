import { Component, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { BellOutlined, CheckCircleOutlined, InboxOutlined, ReloadOutlined } from '@ant-design/icons';
import { Empty, Pagination, Spin, message } from 'antd';
import HomeRail from '../../components/Layout/HomeRail';
import { notificationApi } from '../../api/notification';
import type { Notification } from '../../types/notification';
import { formatDateTime } from '../../utils/format';
import './notifications-page.css';

type MessageFilter = 'all' | 'unread';

class NotificationsErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('消息页面渲染失败', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="notifications-shell">
          <main className="notifications-page notifications-page-fallback">
            <div className="notifications-error" role="alert">
              <InboxOutlined />
              <div><strong>消息页面加载失败</strong><span>请刷新页面后重试。</span></div>
              <button type="button" onClick={() => window.location.reload()}><ReloadOutlined /> 刷新页面</button>
            </div>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}

const NotificationsContent = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<MessageFilter>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const pageSize = 12;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await notificationApi.list({
        page,
        pageSize,
        status: filter === 'unread' ? '0' : undefined,
      });
      setItems(Array.isArray(result?.list) ? result.list : []);
      setTotal(Number(result?.total) || 0);
    } catch {
      setItems([]);
      setTotal(0);
      setLoadError('消息服务暂时不可用，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (item: Notification) => {
    if (item.status === 1) return;
    try {
      await notificationApi.markRead(item.id);
      setItems((current) => current.map((candidate) => (
        candidate.id === item.id ? { ...candidate, status: 1, readTime: new Date().toISOString() } : candidate
      )));
      window.dispatchEvent(new Event('notifications:changed'));
      if (filter === 'unread') await load();
    } catch (error) {
      message.error((error as { message?: string })?.message || '消息状态更新失败');
    }
  };

  const markAllRead = async () => {
    const unreadItems = items.filter((item) => item.status !== 1);
    if (!unreadItems.length) return;
    try {
      await Promise.all(unreadItems.map((item) => notificationApi.markRead(item.id)));
      window.dispatchEvent(new Event('notifications:changed'));
      message.success('当前页消息已全部标记为已读');
      await load();
    } catch (error) {
      message.error((error as { message?: string })?.message || '批量标记失败');
    }
  };

  return (
    <div className="notifications-shell">
      <HomeRail activeLabel="消息中心" />
      <main className="notifications-page">
        <header className="notifications-header">
          <div>
            <span><BellOutlined /> Message center</span>
            <h1>消息中心</h1>
            <p>会员到期提醒和平台通知都会保存在这里。</p>
          </div>
          <div className="notifications-actions">
            <button type="button" onClick={() => void markAllRead()}><CheckCircleOutlined /> 当前页全部已读</button>
            <button type="button" onClick={() => void load()}><ReloadOutlined /> 刷新</button>
          </div>
        </header>

        <section className="notifications-panel">
          <nav className="notifications-filters" aria-label="消息筛选">
            <button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => { setFilter('all'); setPage(1); }}>全部消息</button>
            <button className={filter === 'unread' ? 'active' : ''} type="button" onClick={() => { setFilter('unread'); setPage(1); }}>未读消息</button>
          </nav>

          {loadError ? (
            <div className="notifications-error" role="alert">
              <InboxOutlined />
              <div><strong>消息暂时无法加载</strong><span>{loadError}</span></div>
              <button type="button" onClick={() => void load()}><ReloadOutlined /> 重新加载</button>
            </div>
          ) : loading ? (
            <div className="notifications-loading"><Spin size="large" /></div>
          ) : items.length ? (
            <div className="notifications-list">
              {items.map((item) => (
                <article
                  key={item.id}
                  className={item.status === 1 ? 'is-read' : 'is-unread'}
                  onClick={() => void markRead(item)}
                >
                  <div className="notifications-icon"><BellOutlined /></div>
                  <div className="notifications-content">
                    <div>
                      <strong>{item.title}</strong>
                      {item.status === 1 ? <span>已读</span> : <span className="is-new">未读</span>}
                    </div>
                    <p>{item.content || '暂无详细内容'}</p>
                    <time>{formatDateTime(item.createTime)}</time>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty image={<InboxOutlined />} description={filter === 'unread' ? '暂无未读消息' : '暂无平台消息'} />
          )}

          {total > pageSize ? (
            <Pagination current={page} pageSize={pageSize} total={total} showSizeChanger={false} onChange={setPage} />
          ) : null}
        </section>
      </main>
    </div>
  );
};

const NotificationsPage = () => (
  <NotificationsErrorBoundary>
    <NotificationsContent />
  </NotificationsErrorBoundary>
);

export default NotificationsPage;
