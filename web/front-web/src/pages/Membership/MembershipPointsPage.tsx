import { useEffect, useMemo, useRef, useState } from 'react';
import { AlipayCircleOutlined, CheckCircleOutlined, QrcodeOutlined, ReloadOutlined } from '@ant-design/icons';
import { QRCode, message } from 'antd';
import HomeRail from '../../components/Layout/HomeRail';
import { membershipApi } from '../../api/membership';
import { paymentApi } from '../../api/payment';
import type { PointAccount, PointPackage, UserMembership } from '../../types/membership';
import type { PaymentOrder } from '../../types/payment';
import MembershipTopbar from './MembershipTopbar';
import './membership-page.css';
import './membership-points-page.css';

const isPaidOrder = (order: PaymentOrder | null) => {
  const status = (order?.status || '').toLowerCase();
  return ['paid', 'success', 'completed'].includes(status);
};

const submitFormHtml = (formHtml: string) => {
  const host = document.createElement('div');
  host.style.display = 'none';
  host.innerHTML = formHtml;
  const form = host.querySelector('form');
  if (!form) throw new Error('支付宝收银台表单缺失');
  document.body.appendChild(form);
  (form as HTMLFormElement).submit();
};

const MembershipPointsPage = () => {
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [account, setAccount] = useState<PointAccount | null>(null);
  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const pollingRef = useRef<number | null>(null);

  const selectedPackage = useMemo(
    () => packages.find((item) => item.id === selectedId) || packages[0],
    [packages, selectedId],
  );
  const qrContent = order?.qrContent || order?.payParams?.qrCode || order?.payParams?.payUrl || '';

  const clearPolling = () => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    pollingRef.current = null;
  };

  const load = async () => {
    setLoading(true);
    try {
      const [current, pointAccount, pointPackages] = await Promise.all([
        membershipApi.current(),
        membershipApi.points(),
        membershipApi.pointPackages(),
      ]);
      setMembership(current);
      setAccount(pointAccount);
      setPackages(pointPackages);
      setSelectedId((previous) => previous && pointPackages.some((item) => item.id === previous)
        ? previous
        : pointPackages[0]?.id || '');
    } catch (error) {
      message.error((error as { message?: string })?.message || '积分购买信息加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    return clearPolling;
  }, []);

  useEffect(() => {
    clearPolling();
    if (!order?.orderNo || isPaidOrder(order)) return undefined;
    pollingRef.current = window.setInterval(async () => {
      try {
        const next = await paymentApi.getOrder(order.orderNo);
        setOrder(next);
        if (isPaidOrder(next)) {
          clearPolling();
          message.success('积分包购买成功');
          void load();
        }
      } catch {
        // 轮询失败时保持页面安静，用户仍可手动刷新。
      }
    }, 2500);
    return clearPolling;
  }, [order?.orderNo]);

  const submit = async () => {
    if (!selectedPackage) {
      message.warning('请选择积分包');
      return;
    }
    setSubmitting(true);
    try {
      const next = await paymentApi.pointOrder({
        pointPackageId: selectedPackage.id,
        payMethod: 'alipay',
        idempotencyKey: crypto.randomUUID(),
      });
      setOrder(next);
      if (next.payParams?.formHtml) {
        message.success('订单已创建，正在跳转支付宝收银台');
        submitFormHtml(next.payParams.formHtml);
        return;
      }
      message.success(`积分包订单已创建：${next.orderNo}`);
    } catch (error) {
      message.error((error as { message?: string })?.message || '积分包下单失败');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshOrder = async () => {
    if (!order?.orderNo) return;
    try {
      const next = await paymentApi.queryProviderOrder(order.orderNo);
      setOrder(next);
      if (isPaidOrder(next)) {
        message.success('支付已完成，积分已经到账');
        await load();
      }
    } catch (error) {
      message.error((error as { message?: string })?.message || '支付状态刷新失败');
    }
  };

  return (
    <div className="membership-shell">
      <HomeRail
        activeLabel="会员中心"
        membershipName={membership?.planName || '未开通会员'}
        pointBalance={account?.availablePoints}
      />
      <main className="membership-page membership-points-page">
        <MembershipTopbar active="points" onRefresh={() => void load()} refreshing={loading} />

        <section className="membership-points-hero">
          <div>
            <span className="membership-eyebrow">积分中心</span>
            <h1>购买积分</h1>
            <p>积分包由平台统一配置，会员等级越高，同一积分包到账积分越多。</p>
          </div>
          <div className="membership-points-balance">
            <span>当前可用积分</span>
            <strong>{account?.availablePoints ?? '--'}</strong>
            <small>当前套餐：{membership?.planName || '未开通会员'}</small>
          </div>
        </section>

        <section className="membership-points-content">
          <div className="membership-point-package-panel">
            <div className="membership-points-section-head">
              <div><h2>选择积分包</h2><p>当前等级兑换比例：每10元可得 {packages[0]?.pointsPer10Yuan || 0} 积分。</p></div>
              <span>{packages.length} 个可售套餐</span>
            </div>
            {loading ? <div className="membership-loading"><span>加载中...</span></div> : packages.length ? (
              <div className="membership-point-package-grid">
                {packages.map((pointPackage) => (
                  <button
                    key={pointPackage.id}
                    className={selectedPackage?.id === pointPackage.id ? 'active' : ''}
                    type="button"
                    onClick={() => { setSelectedId(pointPackage.id); setOrder(null); }}
                  >
                    <span>{pointPackage.name}</span>
                    <strong>{pointPackage.points.toLocaleString()}<small> 积分</small></strong>
                    {pointPackage.basePoints && pointPackage.basePoints !== pointPackage.points
                      ? <small>基础 {pointPackage.basePoints.toLocaleString()} · 会员加成后到账</small>
                      : null}
                    <p>{pointPackage.description || '购买后即时到账'}</p>
                    <b>¥{Number(pointPackage.price).toFixed(2)}</b>
                  </button>
                ))}
              </div>
            ) : <div className="membership-empty">当前会员等级暂不支持购买积分，请先升级会员套餐。</div>}
          </div>

          <aside className="membership-point-checkout">
            <h2>{order ? '完成支付' : '订单确认'}</h2>
            {order ? (
              <>
                <div className={`membership-point-payment-state${isPaidOrder(order) ? ' is-paid' : ''}`}>
                  {isPaidOrder(order) ? <CheckCircleOutlined /> : <QrcodeOutlined />}
                  <strong>{isPaidOrder(order) ? '支付已完成' : '等待支付宝付款'}</strong>
                </div>
                {qrContent ? <div className="membership-point-qr"><QRCode value={qrContent} size={176} bordered={false} /></div> : null}
                <dl>
                  <div><dt>订单号</dt><dd>{order.orderNo}</dd></div>
                  <div><dt>订单状态</dt><dd>{order.status || 'pending'}</dd></div>
                </dl>
                <button className="membership-point-submit" type="button" onClick={() => void refreshOrder()}>
                  <ReloadOutlined /> 刷新支付状态
                </button>
              </>
            ) : (
              <>
                <div className="membership-point-payment-method"><AlipayCircleOutlined /><span>支付宝支付</span></div>
                <dl>
                  <div><dt>积分包</dt><dd>{selectedPackage?.name || '—'}</dd></div>
                  <div><dt>到账积分</dt><dd>{selectedPackage?.points.toLocaleString() || '—'}</dd></div>
                  <div><dt>应付金额</dt><dd>¥{Number(selectedPackage?.price || 0).toFixed(2)}</dd></div>
                </dl>
                <button className="membership-point-submit" type="button" disabled={!selectedPackage || submitting} onClick={() => void submit()}>
                  {submitting ? '创建订单中…' : '立即购买'}
                </button>
              </>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
};

export default MembershipPointsPage;
