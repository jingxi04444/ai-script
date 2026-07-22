import { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { ClockCircleOutlined, ReloadOutlined, SearchOutlined, WalletOutlined } from '@ant-design/icons';
import HomeRail from '../../components/Layout/HomeRail';
import { paymentApi } from '../../api/payment';
import type { PaymentOrder } from '../../types/payment';
import { formatDateTime } from '../../utils/format';
import './payment-orders-page.css';

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待支付', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已支付', value: 'paid' },
  { label: '失败', value: 'failed' },
  { label: '已关闭', value: 'closed' },
];

const pendingStatuses = new Set(['pending', 'created', 'processing', 'waiting']);
const pageSizeOptions = [10, 20, 50];

const statusMeta = (order: PaymentOrder) => {
  const status = (order.status || '').toLowerCase();
  if (status === 'paid' || status === 'success' || status === 'completed') return { tone: 'success', label: '已完成' };
  if (status === 'failed' || status === 'cancelled' || status === 'canceled') return { tone: 'danger', label: '已失败' };
  if (pendingStatuses.has(status)) return { tone: 'warning', label: '待处理' };
  return { tone: 'muted', label: order.status || '未知' };
};

const paymentMethodLabel = (value?: string) => {
  if (!value) return '—';
  if (value === 'wechat') return '微信';
  if (value === 'alipay') return '支付宝';
  if (value === 'balance') return '余额';
  return value;
};

const orderTypeLabel = (value?: string) => {
  if (!value) return '—';
  if (value === 'recharge') return '充值';
  if (value === 'member') return '会员';
  return value;
};

const PaymentOrdersPage = () => {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [syncingOrderNo, setSyncingOrderNo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await paymentApi.orders({
        page,
        pageSize,
        keyword: keyword || undefined,
        status: status || undefined,
      });
      setOrders(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setOrders([]);
      setTotal(0);
      message.error('订单加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, keyword, status]);

  const applySearch = () => {
    setPage(1);
    setKeyword(keywordInput.trim());
  };

  const refresh = () => {
    load();
  };

  const syncProvider = async (orderNo: string) => {
    setSyncingOrderNo(orderNo);
    try {
      const nextOrder = await paymentApi.queryProviderOrder(orderNo);
      setOrders((current) => current.map((item) => (item.orderNo === orderNo ? nextOrder : item)));
      message.success('已同步支付状态');
    } catch {
      message.error('同步失败');
    } finally {
      setSyncingOrderNo('');
    }
  };

  const summary = useMemo(() => {
    const pending = orders.filter((order) => pendingStatuses.has((order.status || '').toLowerCase())).length;
    const paid = orders.filter((order) => ['paid', 'success', 'completed'].includes((order.status || '').toLowerCase())).length;
    const failed = orders.filter((order) => ['failed', 'cancelled', 'canceled'].includes((order.status || '').toLowerCase())).length;
    return { pending, paid, failed };
  }, [orders]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="prototype-home payment-orders-shell">
      <HomeRail activeLabel="" />

      <section className="payment-orders-page">
        <header className="payment-orders-hero">
          <div>
            <h1>订单中心</h1>
            <p>查看充值与会员订单，支持筛选、刷新和状态同步。</p>
          </div>
          <button className="payment-orders-refresh" type="button" onClick={refresh}><ReloadOutlined />刷新</button>
        </header>

        <section className="payment-orders-summary" aria-label="订单概览">
          <span><WalletOutlined /> 共 {total} 条</span>
          <span><ClockCircleOutlined /> 待处理 {summary.pending}</span>
          <span><ClockCircleOutlined /> 已完成 {summary.paid}</span>
          <span><ClockCircleOutlined /> 失败 {summary.failed}</span>
        </section>

        <section className="payment-orders-toolbar" aria-label="订单筛选">
          <label className="payment-orders-search">
            <SearchOutlined />
            <input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="订单号 / 标题"
              onKeyDown={(event) => event.key === 'Enter' && applySearch()}
            />
          </label>

          <div className="payment-orders-select">状态：
            <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
              {statusOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <button className="payment-orders-filter" type="button" onClick={applySearch}>筛选</button>
        </section>

        <section className="payment-orders-panel">
          {orders.length ? (
            <div className="payment-order-list">
              {orders.map((order) => {
                const meta = statusMeta(order);
                const isPending = pendingStatuses.has((order.status || '').toLowerCase());

                return (
                  <article className="payment-order-item" key={order.id}>
                    <div className="payment-order-main">
                      <div className="payment-order-head">
                        <strong title={order.orderNo}>{order.orderNo}</strong>
                        <span className={`payment-order-badge ${meta.tone}`}>{meta.label}</span>
                      </div>
                      <h3 className="payment-order-title" title={order.subject}>{order.subject || '—'}</h3>
                      <div className="payment-order-meta">
                        <span>{orderTypeLabel(order.orderType)}</span>
                        <span>{paymentMethodLabel(order.payMethod)}</span>
                        <span>¥{Number(order.paidAmount ?? order.amount ?? 0).toFixed(2)}</span>
                        <span>{formatDateTime(order.createdAt || order.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="payment-order-side">
                      <small>{order.userId ? `用户 ${order.userId}` : '当前用户'}</small>
                      {isPending ? (
                        <button className="payment-order-action" type="button" onClick={() => syncProvider(order.orderNo)} disabled={syncingOrderNo === order.orderNo}>
                          {syncingOrderNo === order.orderNo ? '同步中...' : '同步状态'}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="payment-orders-empty">
              <div className={loading ? 'spin' : ''} aria-hidden="true">{loading ? '↻' : '·'}</div>
              <strong>{loading ? '加载中…' : '暂无订单'}</strong>
              <p>没有符合条件的记录。</p>
            </div>
          )}
        </section>

        <footer className="payment-orders-footer">
          <span>第 {page} 页，共 {pages} 页</span>
          <div>
            <label className="payment-orders-page-size">
              <span>每页</span>
              <select value={pageSize} onChange={(event) => { setPage(1); setPageSize(Number(event.target.value)); }}>
                {pageSizeOptions.map((size) => <option key={size} value={size}>{size} 条</option>)}
              </select>
            </label>
            <button type="button" className="payment-orders-page-btn" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>上一页</button>
            <button type="button" className="payment-orders-page-btn" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>下一页</button>
          </div>
        </footer>
      </section>
    </main>
  );
};

export default PaymentOrdersPage;
