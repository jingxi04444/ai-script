import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Modal, Input } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import HomeRail from '../../components/Layout/HomeRail';
import { membershipApi } from '../../api/membership';
import { paymentApi } from '../../api/payment';
import type { PaymentOrder, RefundOrder } from '../../types/payment';
import { formatDateTime } from '../../utils/format';
import './membership-page.css';
import './membership-orders-page.css';

const { TextArea } = Input;

const paymentMethodLabel = (value?: string) => {
  if (!value) return '—';
  if (value === 'wechat') return '微信';
  if (value === 'alipay') return '支付宝';
  return value;
};

const orderStatusLabel = (value?: string) => {
  const status = (value || '').toLowerCase();
  if (['paid', 'success', 'completed'].includes(status)) return '已完成';
  if (['processing', 'pending', 'created', 'waiting'].includes(status)) return '处理中';
  if (['failed', 'cancelled', 'canceled'].includes(status)) return '失败';
  if (status === 'refunded') return '已退款';
  return value || '未知';
};

const refundStatusLabel = (value?: string) => {
  const status = (value || '').toLowerCase();
  if (status === 'pending') return '待审核';
  if (status === 'processing') return '退款中';
  if (status === 'completed') return '已退款';
  if (status === 'rejected') return '已拒绝';
  if (status === 'failed') return '失败';
  return value || '未知';
};

const isRefundableOrder = (order: PaymentOrder) => {
  const status = (order.status || '').toLowerCase();
  return order.orderType === 'member' && ['paid', 'success', 'completed'].includes(status);
};

const formatRefundReason = (reason?: string) => reason || '—';

const MembershipOrdersPage = () => {
  const navigate = useNavigate();
  const [membershipName, setMembershipName] = useState('');
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [refundOrders, setRefundOrders] = useState<RefundOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundModalOrder, setRefundModalOrder] = useState<PaymentOrder | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [membership, orderResult, refundResult] = await Promise.all([
        membershipApi.current().catch(() => null),
        paymentApi.orders({ page: 1, pageSize: 12, orderType: 'member' }).catch(() => null),
        paymentApi.refunds({ page: 1, pageSize: 12 }).catch(() => null),
      ]);
      setMembershipName(membership?.planName || '免费体验版');
      setOrders((orderResult?.list || []).filter((item) => item.orderType === 'member' || /会员/.test(item.subject || '')));
      setRefundOrders(refundResult?.list || []);
    } catch {
      message.error('订单记录加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openRefundDialog = (paymentOrder: PaymentOrder) => {
    setRefundModalOrder(paymentOrder);
    setRefundReason('');
  };

  const submitRefund = async () => {
    if (!refundModalOrder) return;
    setSubmittingRefund(true);
    try {
      const next = await paymentApi.requestRefund({ orderNo: refundModalOrder.orderNo, reason: refundReason.trim() || undefined });
      message.success(`退款申请已提交：${next.refundNo}`);
      setRefundModalOrder(null);
      setRefundReason('');
      await load();
    } catch (error) {
      message.error((error as { message?: string })?.message || '退款申请提交失败');
    } finally {
      setSubmittingRefund(false);
    }
  };

  return (
    <div className="membership-shell">
      <HomeRail activeLabel="会员中心" membershipName={membershipName} />

      <main className="membership-page membership-orders-page">
        <header className="membership-topbar membership-orders-topbar">
          <nav className="membership-tabs" aria-label="会员订单导航">
            <button type="button" onClick={() => navigate('/membership')}>返回会员中心</button>
            <button className="active" type="button">订单记录</button>
            <button type="button" onClick={() => navigate('/membership/auto-renew')}>自动续费管理</button>
          </nav>
          <button className="membership-refresh" type="button" onClick={() => void load()}>
            <ReloadOutlined /> 刷新
          </button>
        </header>

        <section className="membership-orders-hero">
          <div>
            <span className="membership-eyebrow">Membership orders</span>
            <h1>会员订单与退款记录</h1>
            <p>查看会员订单状态、申请退款以及退款处理进度。</p>
          </div>
        </section>

        {loading ? <div className="membership-loading"><span>加载中...</span></div> : (
          <section className="membership-orders-grid">
            <article className="membership-refund-panel">
              <div className="membership-section-head">
                <div>
                  <span className="membership-eyebrow">Orders</span>
                  <h2>会员订单列表</h2>
                </div>
              </div>
              {orders.length ? (
                <div className="membership-order-cards">
                  {orders.map((paymentOrder) => {
                    const refundable = isRefundableOrder(paymentOrder);
                    const refunded = (paymentOrder.status || '').toLowerCase() === 'refunded';
                    return (
                      <article className="membership-order-card" key={paymentOrder.id}>
                        <div className="membership-order-card-head">
                          <div>
                            <strong>{paymentOrder.subject || '会员订单'}</strong>
                            <small>{paymentOrder.orderNo}</small>
                          </div>
                          <span className={`membership-status-badge ${refunded ? 'is-recommended' : refundable ? 'is-subscribed' : ''}`}>
                            {orderStatusLabel(paymentOrder.status)}
                          </span>
                        </div>
                        <div className="membership-order-card-meta">
                          <span>¥{Number(paymentOrder.paidAmount ?? paymentOrder.amount ?? 0).toFixed(2)}</span>
                          <span>{paymentMethodLabel(paymentOrder.payMethod)}</span>
                          <span>{formatDateTime(paymentOrder.payTime || paymentOrder.createdAt)}</span>
                        </div>
                        <div className="membership-order-card-actions">
                          <button
                            type="button"
                            className="membership-order-action"
                            disabled={!refundable}
                            onClick={() => openRefundDialog(paymentOrder)}
                          >
                            {refunded ? '已退款' : refundable ? '申请退款' : '不可退款'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="membership-refund-empty">暂无可展示的会员订单。</div>
              )}
            </article>

            <article className="membership-refund-panel">
              <div className="membership-section-head">
                <div>
                  <span className="membership-eyebrow">Refunds</span>
                  <h2>退款申请记录</h2>
                </div>
              </div>

              {refundOrders.length ? (
                <div className="membership-refund-list">
                  {refundOrders.map((item) => (
                    <article className="membership-refund-item" key={item.id}>
                      <div className="membership-refund-item-head">
                        <div>
                          <strong>{item.refundNo}</strong>
                          <small>订单 {item.paymentOrderNo}</small>
                        </div>
                        <span className="membership-refund-status">{refundStatusLabel(item.status)}</span>
                      </div>
                      <dl>
                        <div><dt>金额</dt><dd>¥{Number(item.refundAmount || 0).toFixed(2)}</dd></div>
                        <div><dt>原因</dt><dd>{formatRefundReason(item.refundReason)}</dd></div>
                        <div><dt>申请时间</dt><dd>{formatDateTime(item.requestedTime)}</dd></div>
                        <div><dt>处理时间</dt><dd>{formatDateTime(item.completedTime || item.reviewTime)}</dd></div>
                      </dl>
                      {item.failureReason ? <p className="membership-refund-warning">{item.failureReason}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="membership-refund-empty">暂无退款记录。</div>
              )}
            </article>
          </section>
        )}

        <Modal
          open={Boolean(refundModalOrder)}
          title="申请会员退款"
          okText="提交申请"
          cancelText="取消"
          confirmLoading={submittingRefund}
          onOk={() => void submitRefund()}
          onCancel={() => {
            setRefundModalOrder(null);
            setRefundReason('');
          }}
          centered
        >
          <div className="membership-refund-modal">
            <p>订单：<strong>{refundModalOrder?.orderNo}</strong></p>
            <p>金额：<strong>¥{Number(refundModalOrder?.paidAmount ?? refundModalOrder?.amount ?? 0).toFixed(2)}</strong></p>
            <label>
              退款原因
              <TextArea
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                rows={4}
                maxLength={500}
                placeholder="请填写退款原因，方便客服和财务处理"
              />
            </label>
          </div>
        </Modal>
      </main>
    </div>
  );
};

export default MembershipOrdersPage;
