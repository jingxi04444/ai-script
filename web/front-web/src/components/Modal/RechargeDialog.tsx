import { useEffect, useRef, useState } from 'react';
import {
  AlipayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import { membershipApi } from '../../api/membership';
import { paymentApi } from '../../api/payment';
import type { PaymentOrder } from '../../types/payment';
import { formatDateTime } from '../../utils/format';
import './modal-dialogs.css';

interface RechargeDialogProps {
  onClose: () => void;
  initialPointBalance?: number;
  initialPointsPerTen?: number;
}

const RechargeDialog = ({ onClose, initialPointBalance, initialPointsPerTen }: RechargeDialogProps) => {
  const [amount, setAmount] = useState('50');
  const [pointBalance, setPointBalance] = useState<number | null>(initialPointBalance ?? null);
  const [pointsPerTen, setPointsPerTen] = useState(initialPointsPerTen ?? 0);
  const [payMethod, setPayMethod] = useState('wechat');
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const amounts = ['10', '50', '100', '300'];
  const pointsForAmount = (value: string | number) => Math.round((Number(value) / 10) * pointsPerTen);
  const previewPointsPerTen = pointsPerTen > 0 ? pointsPerTen : 500;
  const previewPointsForAmount = (value: string | number) => Math.round((Number(value) / 10) * previewPointsPerTen);

  const methodLabel = payMethod === 'alipay' ? '支付宝' : '微信支付';

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
    message.success('积分包购买成功');
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
    const value = Number(amount);
    if (!value || value <= 0 || value % 10 !== 0) {
      message.warning('请选择有效的积分包');
      return;
    }
    if (pointsPerTen <= 0) {
      message.warning('当前套餐暂不支持购买积分包，请先订阅会员');
      return;
    }
    setSubmitting(true);
    try {
      const order = await paymentApi.pointOrder({ amount: value, payMethod, idempotencyKey: crypto.randomUUID() });
      completedRef.current = false;
      if (handleOrderState(order)) {
        return;
      }
      setOrder(order);
      message.success(`积分包订单已创建：${order.orderNo}`);
    } catch (error) {
      const errorMessage = (error as { message?: string })?.message;
      message.error(errorMessage || '积分包下单失败');
    } finally {
      if (!completedRef.current) setSubmitting(false);
    }
  };


  useEffect(() => {
    if (initialPointBalance !== undefined && initialPointsPerTen !== undefined) return;
    Promise.all([membershipApi.current(), membershipApi.plans(), membershipApi.points()])
      .then(([membership, plans, account]) => {
        setPointBalance(account.availablePoints);
        const currentPlan = plans.find((plan) => plan.id === membership.planId);
        const rateBenefit = currentPlan?.benefits?.find((benefit) => benefit.code === 'POINTS_PER_10_YUAN' && benefit.enabled);
        setPointsPerTen(Math.max(0, Number(rateBenefit?.value || 0)));
      })
      .catch(() => {
        setPointBalance(null);
        setPointsPerTen(0);
      });
  }, [initialPointBalance, initialPointsPerTen]);

  useEffect(() => {
    if (!order?.orderNo || isFinished) return undefined;

    clearPolling();
    pollingRef.current = window.setInterval(async () => {
      try {
        const nextOrder = await syncOrder(order.orderNo);
        handleOrderState(nextOrder);
      } catch {
        // 保持静默，避免轮询过程频繁打扰
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
    <div className="modal-backdrop commerce-backdrop" role="dialog" aria-modal="true" aria-labelledby="point-pack-title">
      <section className="modal-card commerce-modal recharge-modal point-pack-dialog">
        <header className="modal-head">
          <div>
            <span>Points</span>
            <h2 id="point-pack-title">购买积分包</h2>
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
                <h3>请完成支付后等待系统自动确认</h3>
                <p>订单创建后不会自动跳转，建议直接使用微信/支付宝扫码完成支付。</p>
              </div>
              <div className="payment-status-meta">
                <span>订单号</span>
                <strong>{order.orderNo}</strong>
              </div>
            </section>

            <section className="payment-summary-grid">
              <article className="payment-summary-item">
                <span>积分包金额</span>
                <strong>¥{Number(order.amount || amount || 0).toFixed(2)}</strong>
              </article>
              <article className="payment-summary-item">
                <span>支付方式</span>
                <strong>{methodLabel}</strong>
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
                <span>支付机构</span>
                <strong>{order.provider || '—'}</strong>
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
                  <span>支持复制后打开支付应用</span>
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
              <button onClick={handleClose}>关闭</button>
              <button className="primary" onClick={refreshProviderStatus} disabled={refreshing}>
                <ReloadOutlined />{refreshing ? '刷新中...' : '我已支付，刷新状态'}
              </button>
            </footer>
          </div>
        ) : (
          <>
            <div className="balance-card">
              <span>当前积分</span>
              <strong>{pointBalance ?? '--'}</strong>
              <p>购买后积分直接进入账户，可用于 Brief 检测、爆款解析等积分消费功能。</p>
            </div>

            <section className="recharge-amount-grid" aria-label="积分包列表">
              {amounts.map((item) => (
                <button
                  key={item}
                  className={item === amount ? 'active' : ''}
                  onClick={() => setAmount(item)}
                  disabled={pointsPerTen <= 0}
                >
                  <strong>¥{item}</strong>
                  <small>{`${previewPointsForAmount(item)} 积分`}</small>
                </button>
              ))}
            </section>
            <p className={`point-pack-rate${pointsPerTen > 0 ? '' : ' is-disabled'}`}>
              {pointsPerTen > 0
                ? `当前套餐购买比例：每 10 元 = ${pointsPerTen} 积分，本次预计到账 ${pointsForAmount(amount)} 积分。`
                : `免费体验版暂不支持购买；订阅轻量版后每 10 元可得 ${previewPointsPerTen} 积分，本次积分包为 ${previewPointsForAmount(amount)} 积分。`}
            </p>

            <section className="payment-method-panel">
              <h3>支付方式</h3>
              <div>
                <button className={payMethod === 'wechat' ? 'active wechat-pay' : 'wechat-pay'} onClick={() => setPayMethod('wechat')}>
                  <WechatOutlined />微信支付
                </button>
                <button className={payMethod === 'alipay' ? 'active alipay-pay' : 'alipay-pay'} onClick={() => setPayMethod('alipay')}>
                  <AlipayCircleOutlined />支付宝
                </button>
              </div>
            </section>

            <footer className="commerce-actions">
              <button onClick={handleClose}>取消</button>
              <button className="primary" disabled={submitting || pointsPerTen <= 0} onClick={submit}>{submitting ? '下单中...' : `购买积分包 ¥${amount || '0'}`}</button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
};

export default RechargeDialog;
