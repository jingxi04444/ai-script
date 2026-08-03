import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import HomeRail from '../../components/Layout/HomeRail';
import { paymentApi } from '../../api/payment';
import type { PaymentOrder } from '../../types/payment';
import './payment-result-page.css';

type ResultState = 'checking' | 'paid' | 'pending' | 'failed';

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const orderNo = searchParams.get('out_trade_no') || '';
  const [state, setState] = useState<ResultState>('checking');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!orderNo) {
      setState('failed');
      setReason('支付宝未返回平台订单号');
      return;
    }
    let cancelled = false;
    const query = async () => {
      try {
        const next = await paymentApi.queryProviderOrder(orderNo);
        if (cancelled) return;
        setOrder(next);
        const status = (next.status || '').toLowerCase();
        setState(['paid', 'success', 'completed'].includes(status) ? 'paid' : 'pending');
      } catch (error) {
        if (cancelled) return;
        setState('failed');
        setReason((error as { message?: string })?.message || '支付结果查询失败');
      }
    };
    void query();
    return () => { cancelled = true; };
  }, [orderNo]);

  const icon = state === 'paid'
    ? <CheckCircleOutlined />
    : state === 'failed'
      ? <CloseCircleOutlined />
      : <ClockCircleOutlined />;
  const title = state === 'checking'
    ? '正在确认支付结果'
    : state === 'paid'
      ? '支付成功'
      : state === 'pending'
        ? '付款结果确认中'
        : '暂时无法确认支付结果';

  return (
    <div className="payment-result-shell">
      <HomeRail activeLabel="会员中心" />
      <main className="payment-result-page">
        <section className={`payment-result-card is-${state}`}>
          <div className="payment-result-icon">{icon}</div>
          <h1>{title}</h1>
          <p>{state === 'paid'
            ? '支付宝付款已确认，购买内容已经生效。'
            : state === 'pending'
              ? '支付宝通知可能稍有延迟，可前往订单记录刷新状态。'
              : reason || '正在向支付宝查询订单状态，请稍候。'}</p>
          {orderNo ? <div className="payment-result-order">订单号：{order?.orderNo || orderNo}</div> : null}
          <div className="payment-result-actions">
            <Link to="/membership/orders">查看订单记录</Link>
            <Link to="/membership">返回会员中心</Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PaymentResultPage;
