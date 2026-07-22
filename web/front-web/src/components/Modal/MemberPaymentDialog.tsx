import { useEffect, useRef, useState } from 'react';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  WechatOutlined,
  AlipayCircleOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import { membershipApi } from '../../api/membership';
import { paymentApi } from '../../api/payment';
import type { MembershipPlan } from '../../types/membership';
import type { PaymentOrder } from '../../types/payment';
import { formatDateTime } from '../../utils/format';
import './modal-dialogs.css';

interface MemberPaymentDialogProps {
  onClose: () => void;
  onRecharge: () => void;
}

const MemberPaymentDialog = ({ onClose, onRecharge }: MemberPaymentDialogProps) => {
  const [plan, setPlan] = useState('pro-year');
  const [payMethod, setPayMethod] = useState('wechat');
  const [plans, setPlans] = useState<Array<MembershipPlan & { desc?: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    membershipApi.plans().then((list) => {
      const next = list.map((item) => ({
        ...item,
        desc: item.periodDays >= 365 ? '推荐，解锁全年权益' : item.periodDays >= 90 ? '适合稳定投放团队' : '适合短期项目冲刺',
      }));
      setPlans(next);
      if (next[0]) setPlan(next[next.length - 1]?.id || next[0].id);
    }).catch(() => {
      setPlans([
        { id: '1', code: 'pro_month', name: '月度会员', price: 39, periodDays: 30, desc: '适合短期项目冲刺' },
        { id: '2', code: 'pro_quarter', name: '季度会员', price: 99, periodDays: 90, desc: '适合稳定投放团队' },
        { id: '3', code: 'pro_year', name: '年度会员', price: 299, periodDays: 365, desc: '推荐，解锁全年权益' },
      ]);
    });
  }, []);

  const selectedPlan = plans.find((item) => item.id === plan) || plans[plans.length - 1];
  const isBalancePay = payMethod === 'balance';
  const orderStatus = (order?.status || '').toLowerCase();
  const fulfillStatus = (order?.fulfillStatus || '').toLowerCase();
  const isPaid = orderStatus === 'paid' || orderStatus === 'success' || orderStatus === 'completed';
  const isFulfilled = fulfillStatus === 'success' || fulfillStatus === 'succeeded' || fulfillStatus === 'completed';
  const isFinished = isPaid && (!order?.fulfillStatus || isFulfilled);

  const clearPolling = () => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const syncOrder = async (orderNo: string, forceProvider = false) => {
    const nextOrder = forceProvider
      ? await paymentApi.queryProviderOrder(orderNo)
      : await paymentApi.getOrder(orderNo);

    setOrder(nextOrder);
    return nextOrder;
  };

  const finishSuccess = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearPolling();
    message.success('会员开通成功');
    onClose();
  };

  const handleOrderState = (nextOrder: PaymentOrder) => {
    setOrder(nextOrder);
    const nextFulfillStatus = (nextOrder.fulfillStatus || '').toLowerCase();
    if ((nextOrder.status || '').toLowerCase() === 'paid' && (!nextOrder.fulfillStatus || nextFulfillStatus === 'success' || nextFulfillStatus === 'succeeded' || nextFulfillStatus === 'completed')) {
      finishSuccess();
      return true;
    }
    return false;
  };

  const refreshProviderStatus = async () => {
    if (!order?.orderNo) return;
    setRefreshing(true);
    try {
      const nextOrder = await syncOrder(order.orderNo, true);
      handleOrderState(nextOrder);
    } catch {
      message.error('刷新支付状态失败');
    } finally {
      if (!completedRef.current) setRefreshing(false);
    }
  };

  const submit = async () => {
    if (!selectedPlan) {
      message.warning('请选择会员套餐');
      return;
    }
    setSubmitting(true);
    try {
      const nextOrder = await paymentApi.memberOrder({ planId: selectedPlan.id, payMethod });
      completedRef.current = false;

      if (isBalancePay) {
        if ((nextOrder.status || '').toLowerCase() === 'paid') {
          finishSuccess();
          return;
        }
        message.error(nextOrder.status ? `余额支付状态异常：${nextOrder.status}` : '余额支付失败');
        return;
      }

      if (handleOrderState(nextOrder)) {
        return;
      }

      setOrder(nextOrder);
      message.success(`会员订单已创建：${nextOrder.orderNo}`);
    } catch (error) {
      const errorMessage = (error as { message?: string })?.message;
      message.error(errorMessage || '会员下单失败');
    } finally {
      if (!completedRef.current) setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!order?.orderNo || isFinished) return undefined;

    clearPolling();
    pollingRef.current = window.setInterval(async () => {
      try {
        const nextOrder = await syncOrder(order.orderNo);
        handleOrderState(nextOrder);
      } catch {
        // 静默轮询，避免干扰支付等待体验
      }
    }, 2500);

    return () => {
      clearPolling();
    };
  }, [order?.orderNo, isFinished]);

  useEffect(() => () => {
    clearPolling();
  }, []);

  const handleClose = () => {
    clearPolling();
    completedRef.current = false;
    setOrder(null);
    onClose();
  };

  const copyQrContent = async () => {
    const qrContent = order?.qrContent || order?.payParams?.qrCode || order?.payParams?.payUrl;
    if (!qrContent) return;
    try {
      await navigator.clipboard.writeText(qrContent);
      message.success('二维码内容已复制');
    } catch {
      message.error('复制失败，请手动选择文本');
    }
  };

  const qrContent = order?.qrContent || order?.payParams?.qrCode || order?.payParams?.payUrl || '';

  return (
    <div className="modal-backdrop commerce-backdrop" role="dialog" aria-modal="true" aria-labelledby="member-title">
      <section className="modal-card commerce-modal member-pay-modal">
        <header className="modal-head">
          <div>
            <span>Membership</span>
            <h2 id="member-title">开通会员</h2>
          </div>
          <button aria-label="关闭" onClick={handleClose}>×</button>
        </header>

        {order ? (
          <div className="payment-pending-shell">
            <section className="payment-status-banner">
              <div>
                <span className={`payment-status-badge ${isFinished ? 'is-success' : 'is-pending'}`}>
                  {isFinished ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                  {isFinished ? '支付已完成' : '等待支付'}
                </span>
                <h3>会员订单已创建，请完成支付后等待开通</h3>
                <p>二维码支付不会自动跳转，请扫码完成后回到此处确认状态。</p>
              </div>
              <div className="payment-status-meta">
                <span>订单号</span>
                <strong>{order.orderNo}</strong>
              </div>
            </section>

            <section className="payment-summary-grid">
              <article className="payment-summary-item">
                <span>会员套餐</span>
                <strong>{selectedPlan?.name || order.subject || '—'}</strong>
              </article>
              <article className="payment-summary-item">
                <span>订单金额</span>
                <strong>¥{Number(order.amount || selectedPlan?.price || 0).toFixed(2)}</strong>
              </article>
              <article className="payment-summary-item">
                <span>支付方式</span>
                <strong>{payMethod === 'alipay' ? '支付宝' : '微信支付'}</strong>
              </article>
              <article className="payment-summary-item">
                <span>订单状态</span>
                <strong>{order.status || 'pending'}</strong>
              </article>
              <article className="payment-summary-item">
                <span>履约状态</span>
                <strong>{order.fulfillStatus || 'waiting'}</strong>
              </article>
              <article className="payment-summary-item">
                <span>过期时间</span>
                <strong>{formatDateTime(order.expireTime)}</strong>
              </article>
            </section>

            <section className="payment-qr-card">
              <div className="payment-qr-inner">
                <div className="payment-qr-head">
                  <strong><QrcodeOutlined />二维码内容</strong>
                  <span>复制后可直接打开支付应用</span>
                </div>
                <div className={`payment-qr-code ${qrContent ? 'has-value' : 'is-empty'}`}>
                  {qrContent || '等待支付内容返回…'}
                </div>
                <div className="payment-qr-actions">
                  <button className="payment-copy-button" onClick={copyQrContent} disabled={!qrContent}>
                    <CopyOutlined />复制内容
                  </button>
                  <button className="payment-refresh-button" onClick={refreshProviderStatus} disabled={refreshing}>
                    <ReloadOutlined />{refreshing ? '刷新中...' : '我已支付，刷新状态'}
                  </button>
                </div>
              </div>
            </section>

            <footer className="commerce-actions payment-action-row">
              <button onClick={onRecharge}>先充值余额</button>
              <button className="primary" onClick={refreshProviderStatus} disabled={refreshing}>
                <ReloadOutlined />{refreshing ? '刷新中...' : '我已支付，刷新状态'}
              </button>
            </footer>
          </div>
        ) : (
          <>
            <div className="member-plan-grid">
              {plans.map((item) => (
                <button
                  key={item.id}
                  className={item.id === plan ? 'member-plan active' : 'member-plan'}
                  onClick={() => setPlan(item.id)}
                >
                  <strong>{item.name}</strong>
                  <b>¥{Number(item.price).toFixed(0)}</b>
                  <span>{item.desc}</span>
                </button>
              ))}
            </div>

            <section className="member-benefits">
              <h3>会员权益</h3>
              <div>
                <span><CheckCircleOutlined />更多脚本生成额度</span>
                <span><CheckCircleOutlined />高清视频导出</span>
                <span><CheckCircleOutlined />项目云端保存</span>
                <span><CheckCircleOutlined />优先生成队列</span>
              </div>
            </section>

            <section className="payment-method-panel">
              <h3>支付方式</h3>
              <div>
                <button
                  className={payMethod === 'wechat' ? 'active wechat-pay' : 'wechat-pay'}
                  onClick={() => setPayMethod('wechat')}
                >
                  <WechatOutlined />微信支付
                </button>
                <button
                  className={payMethod === 'alipay' ? 'active alipay-pay' : 'alipay-pay'}
                  onClick={() => setPayMethod('alipay')}
                >
                  <AlipayCircleOutlined />支付宝
                </button>
                <button
                  className={payMethod === 'balance' ? 'active balance-pay' : 'balance-pay'}
                  onClick={() => setPayMethod('balance')}
                >
                  <WalletOutlined />余额支付
                </button>
              </div>
            </section>

            <footer className="commerce-actions">
              <button onClick={onRecharge}>先充值余额</button>
              <button className="primary" disabled={submitting || !selectedPlan} onClick={submit}>
                {submitting ? '下单中...' : isBalancePay ? '余额支付' : `立即支付 ¥${selectedPlan ? Number(selectedPlan.price).toFixed(0) : '0'}`}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
};

export default MemberPaymentDialog;
