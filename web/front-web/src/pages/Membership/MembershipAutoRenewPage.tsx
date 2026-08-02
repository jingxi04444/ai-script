import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { message } from 'antd';
import HomeRail from '../../components/Layout/HomeRail';
import { membershipApi } from '../../api/membership';
import { paymentApi } from '../../api/payment';
import type { PaymentOrder, PaymentOrderListParams } from '../../types/payment';
import type { UserMembership } from '../../types/membership';
import './membership-page.css';
import './membership-auto-renew-page.css';

const paymentMethodLabel = (value?: string) => {
  if (value === 'wechat') return '微信';
  if (value === 'alipay') return '支付宝';
  return value || '—';
};

const MembershipAutoRenewPage = () => {
  const navigate = useNavigate();
  const [membershipName, setMembershipName] = useState('');
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [latestOrder, setLatestOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [current, orders] = await Promise.all([
        membershipApi.current(),
        paymentApi.orders({ page: 1, pageSize: 10, orderType: 'member' } satisfies PaymentOrderListParams).catch(() => null),
      ]);
      setMembership(current);
      setMembershipName(current?.planName || '免费体验版');
      setLatestOrder((orders?.list || []).find((order) => order.payMethod === 'wechat' || order.payMethod === 'alipay') || null);
    } catch {
      message.error('自动续费信息加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const autoRenewEnabled = membership?.autoRenew === true || membership?.autoRenew === 1;
  const signedMethod = paymentMethodLabel(latestOrder?.payMethod);
  const statusLabel = autoRenewEnabled ? '已开启' : '未开启';

  const cancelAutoRenew = async () => {
    try {
      const next = await membershipApi.cancelAutoRenew();
      setMembership(next);
      message.success('已关闭自动续费');
      navigate('/membership');
    } catch (error) {
      message.error((error as { message?: string })?.message || '关闭自动续费失败');
    }
  };

  return (
    <div className="membership-shell">
      <HomeRail activeLabel="会员中心" membershipName={membershipName} />

      <main className="membership-page membership-auto-renew-page">
        <header className="membership-topbar membership-auto-renew-topbar">
          <nav className="membership-tabs" aria-label="自动续费导航">
            <button type="button" onClick={() => navigate('/membership')}>返回会员中心</button>
            <button type="button" onClick={() => navigate('/membership/orders')}>查看订单记录</button>
            <button className="active" type="button">自动续费管理</button>
          </nav>
          <button className="membership-refresh" type="button" onClick={() => void load()}>
            <ReloadOutlined /> 刷新
          </button>
        </header>

        <section className="membership-auto-renew-hero">
          <div>
            <span className="membership-eyebrow">Auto renew</span>
            <h1>管理自动续费</h1>
            <p>查看当前自动续费状态、签约支付方式，并可关闭自动续费。</p>
          </div>
        </section>

        {loading ? <div className="membership-loading"><span>加载中...</span></div> : (
          <section className="membership-auto-renew-card">
            <div className="membership-auto-renew-status">
              <span className={`membership-auto-renew-state ${autoRenewEnabled ? 'is-on' : 'is-off'}`}>
                自动续费：{autoRenewEnabled ? '开' : '关'}
              </span>
              <h2>{membership?.planName || '当前会员'}</h2>
              <p>当前周期：{membership?.currentPeriodEnd || membership?.expireTime || '长期有效'}</p>
            </div>

            <div className="membership-auto-renew-meta">
              <article>
                <span>签约支付方式</span>
                <strong>{signedMethod}</strong>
              </article>
              <article>
                <span>当前状态</span>
                <strong>{statusLabel}</strong>
              </article>
              <article>
                <span>签约说明</span>
                <strong>委托代扣</strong>
              </article>
            </div>

            <div className="membership-auto-renew-actions">
              {autoRenewEnabled ? (
                <button type="button" className="membership-auto-renew-close" onClick={() => void cancelAutoRenew()}>
                  <CheckCircleOutlined /> 关闭自动续费
                </button>
              ) : (
                <button type="button" className="membership-auto-renew-close is-disabled" disabled>
                  自动续费未开启
                </button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default MembershipAutoRenewPage;
