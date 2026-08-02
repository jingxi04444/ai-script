import { useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCcw, Search, ShieldAlert } from 'lucide-react';
import { paymentApi, type PaymentOrder } from '../../api/payment';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, PageHeader, Pagination, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import './payment-orders-page.css';

type DraftFilters = {
  keyword: string;
  status: string;
  payMethod: string;
  orderType: string;
  userId: string;
};

const emptyFilters: DraftFilters = {
  keyword: '',
  status: '',
  payMethod: '',
  orderType: '',
  userId: '',
};

const statusLabel = (value?: string) => {
  if (!value) return '—';
  const lower = value.toLowerCase();
  if (['paid', 'success', 'completed'].includes(lower)) return '已完成';
  if (['failed', 'cancelled', 'canceled'].includes(lower)) return '已失败';
  if (['pending', 'created', 'processing', 'waiting'].includes(lower)) return '待处理';
  return value;
};

const statusTone = (value?: string) => {
  const lower = (value || '').toLowerCase();
  if (['paid', 'success', 'completed'].includes(lower)) return 'green' as const;
  if (['failed', 'cancelled', 'canceled'].includes(lower)) return 'red' as const;
  if (['pending', 'created', 'processing', 'waiting'].includes(lower)) return 'orange' as const;
  return 'gray' as const;
};

const providerTone = (value?: string) => {
  const lower = (value || '').toLowerCase();
  if (['paid', 'success', 'completed'].includes(lower)) return 'green' as const;
  if (['failed', 'error'].includes(lower)) return 'red' as const;
  if (['pending', 'processing', 'waiting'].includes(lower)) return 'orange' as const;
  return 'gray' as const;
};

const methodLabel = (value?: string) => {
  if (!value) return '—';
  if (value === 'wechat') return '微信';
  if (value === 'alipay') return '支付宝';
  return value;
};

const typeLabel = (value?: string) => {
  if (!value) return '—';
  if (value === 'recharge') return '充值';
  if (value === 'member') return '会员';
  return value;
};

const PaymentOrdersPage = () => {
  const { notify } = useAdminShell();
  const [draft, setDraft] = useState<DraftFilters>(emptyFilters);
  const [filters, setFilters] = useState<DraftFilters>(emptyFilters);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<PaymentOrder | null>(null);
  const [syncingOrderNo, setSyncingOrderNo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await paymentApi.getList({
        page,
        pageSize,
        keyword: filters.keyword || undefined,
        status: filters.status || undefined,
        payMethod: filters.payMethod || undefined,
        orderType: filters.orderType || undefined,
        userId: filters.userId || undefined,
      });
      setOrders(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setOrders([]);
      setTotal(0);
      notify('支付订单加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, filters]);

  const applyFilters = () => {
    setPage(1);
    setFilters({ ...draft });
  };

  const resetFilters = () => {
    setDraft({ ...emptyFilters });
    setFilters({ ...emptyFilters });
    setPage(1);
  };

  const refresh = () => {
    load();
  };

  const openDetail = (order: PaymentOrder) => {
    setActiveOrder(order);
    setDetailOpen(true);
  };

  const syncProvider = async (orderNo: string) => {
    setSyncingOrderNo(orderNo);
    try {
      const nextOrder = await paymentApi.queryProviderOrder(orderNo);
      setOrders((current) => current.map((item) => (item.orderNo === orderNo ? nextOrder : item)));
      setActiveOrder((current) => (current?.orderNo === orderNo ? nextOrder : current));
      notify('已同步支付状态');
    } catch {
      notify('同步失败');
    } finally {
      setSyncingOrderNo('');
    }
  };

  const rows = useMemo(() => orders, [orders]);
  const paymentInfo = activeOrder
    ? (activeOrder.qrContent || activeOrder.providerTradeNo
      ? JSON.stringify({ qrContent: activeOrder.qrContent || '', providerTradeNo: activeOrder.providerTradeNo || '' }, null, 2)
      : '—')
    : '—';

  return (
    <div className="page-stack payment-orders-page">
      <PageHeader
        title="支付订单"
        description="查看全部支付订单，支持多条件筛选、详情查看和手动同步。"
        actions={<button className="toolbar-btn" type="button" onClick={refresh}><RefreshCcw size={16} />刷新</button>}
      />

      <SectionCard
        title="筛选条件"
        description="按关键词、状态、支付方式、类型和用户筛选。"
        action={
          <div className="toolbar-group">
            <button className="toolbar-btn" type="button" onClick={resetFilters}>重置</button>
            <button className="toolbar-btn primary" type="button" onClick={applyFilters}><Search size={16} />筛选</button>
          </div>
        }
      >
        <div className="payment-filter-grid">
          <label className="field"><span>关键词</span><input value={draft.keyword} onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))} placeholder="订单号 / 标题 / 交易号" /></label>
          <label className="field"><span>状态</span>
            <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
              <option value="">全部</option>
              <option value="pending">待支付</option>
              <option value="processing">处理中</option>
              <option value="paid">已支付</option>
              <option value="failed">失败</option>
              <option value="closed">已关闭</option>
            </select>
          </label>
          <label className="field"><span>支付方式</span>
            <select value={draft.payMethod} onChange={(event) => setDraft((current) => ({ ...current, payMethod: event.target.value }))}>
              <option value="">全部</option>
              <option value="wechat">微信</option>
              <option value="alipay">支付宝</option>
            </select>
          </label>
          <label className="field"><span>订单类型</span><input value={draft.orderType} onChange={(event) => setDraft((current) => ({ ...current, orderType: event.target.value }))} placeholder="recharge / member" /></label>
          <label className="field"><span>User ID</span><input value={draft.userId} onChange={(event) => setDraft((current) => ({ ...current, userId: event.target.value }))} placeholder="输入用户 ID" /></label>
        </div>
      </SectionCard>

      <SectionCard title="订单列表" description="点击详情可查看完整字段和履约信息。">
        {rows.length ? (
          <>
            <div className="admin-table payments-table">
              <div className="table-head" style={{ gridTemplateColumns: '1.15fr 0.7fr 0.75fr 0.8fr 0.8fr 0.8fr 0.9fr 0.9fr 1fr' }}>
                <span>订单号</span><span>用户</span><span>类型</span><span>金额</span><span>方式</span><span>状态</span><span>机构状态</span><span>创建时间</span><span>操作</span>
              </div>
              {rows.map((order) => (
                <div className="table-row" style={{ gridTemplateColumns: '1.15fr 0.7fr 0.75fr 0.8fr 0.8fr 0.8fr 0.9fr 0.9fr 1fr' }} key={order.id}>
                  <strong title={order.orderNo}>{order.orderNo}</strong>
                  <span>{order.userId || '—'}</span>
                  <span>{typeLabel(order.orderType)}</span>
                  <span>¥{Number(order.paidAmount ?? order.amount ?? 0).toFixed(2)}</span>
                  <span>{methodLabel(order.payMethod)}</span>
                  <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
                  <StatusBadge tone={providerTone(order.providerStatus)}>{order.providerStatus || '—'}</StatusBadge>
                  <span>{order.createdAt || order.updatedAt || '—'}</span>
                  <div className="table-actions">
                    <button className="table-btn" type="button" onClick={() => openDetail(order)}><Eye size={16} />详情</button>
                    {['pending', 'created', 'processing', 'waiting'].includes((order.status || '').toLowerCase()) ? (
                      <button className="table-btn" type="button" onClick={() => syncProvider(order.orderNo)} disabled={syncingOrderNo === order.orderNo}>
                        {syncingOrderNo === order.orderNo ? '同步中...' : '查状态'}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onChange={setPage}
              onPageSizeChange={(size) => { setPage(1); setPageSize(size); }}
            />
          </>
        ) : (
          <EmptyState title={loading ? '加载中...' : '暂无支付订单'} description="没有符合条件的支付记录。" icon={<ShieldAlert size={22} />} />
        )}
      </SectionCard>

      <Modal
        open={detailOpen}
        title="订单详情"
        description={activeOrder?.orderNo ? `订单号：${activeOrder.orderNo}` : '查看完整支付订单信息'}
        onClose={() => {
          setDetailOpen(false);
          setActiveOrder(null);
        }}
        size="lg"
        footer={
          <>
            <button className="modal-btn" type="button" onClick={() => { setDetailOpen(false); setActiveOrder(null); }}>关闭</button>
            {activeOrder && ['pending', 'created', 'processing', 'waiting'].includes((activeOrder.status || '').toLowerCase()) ? (
              <button className="modal-btn primary" type="button" onClick={() => syncProvider(activeOrder.orderNo)} disabled={syncingOrderNo === activeOrder.orderNo}>
                {syncingOrderNo === activeOrder.orderNo ? '同步中...' : '同步支付状态'}
              </button>
            ) : null}
          </>
        }
      >
        {activeOrder ? (
          <div className="payment-detail-stack">
            <div className="payment-detail-grid">
              <article><span>订单号</span><strong>{activeOrder.orderNo}</strong></article>
              <article><span>用户 ID</span><strong>{activeOrder.userId || '—'}</strong></article>
              <article><span>订单类型</span><strong>{typeLabel(activeOrder.orderType)}</strong></article>
              <article><span>支付方式</span><strong>{methodLabel(activeOrder.payMethod)}</strong></article>
              <article><span>订单金额</span><strong>¥{Number(activeOrder.amount || 0).toFixed(2)}</strong></article>
              <article><span>实付金额</span><strong>¥{Number(activeOrder.paidAmount ?? activeOrder.amount ?? 0).toFixed(2)}</strong></article>
              <article><span>订单状态</span><strong>{statusLabel(activeOrder.status)}</strong></article>
              <article><span>机构状态</span><strong>{activeOrder.providerStatus || '—'}</strong></article>
              <article><span>支付机构</span><strong>{activeOrder.provider || '—'}</strong></article>
              <article><span>支付时间</span><strong>{activeOrder.payTime || '—'}</strong></article>
              <article><span>过期时间</span><strong>{activeOrder.expireTime || '—'}</strong></article>
              <article><span>同步时间</span><strong>{activeOrder.lastQueryTime || '—'}</strong></article>
            </div>

            <div className="payment-detail-blocks">
              <section>
                <span>订单标题</span>
                <p>{activeOrder.subject || '—'}</p>
              </section>
              <section>
                <span>履约状态</span>
                <p>{activeOrder.fulfillStatus || '—'}</p>
              </section>
              <section>
                <span>履约错误</span>
                <p>{activeOrder.fulfillError || '—'}</p>
              </section>
              <section>
                <span>支付信息</span>
                <pre>{paymentInfo}</pre>
              </section>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default PaymentOrdersPage;
