import { useState } from 'react';
import { CheckCircleOutlined, WechatOutlined, AlipayCircleOutlined, WalletOutlined } from '@ant-design/icons';

interface MemberPaymentDialogProps {
  onClose: () => void;
  onRecharge: () => void;
}

const MemberPaymentDialog = ({ onClose, onRecharge }: MemberPaymentDialogProps) => {
  const [plan, setPlan] = useState('pro-year');
  const [payMethod, setPayMethod] = useState('wechat');
  const plans = [
    { id: 'pro-month', name: '月度会员', price: '39', desc: '适合短期项目冲刺' },
    { id: 'pro-quarter', name: '季度会员', price: '99', desc: '适合稳定投放团队' },
    { id: 'pro-year', name: '年度会员', price: '299', desc: '推荐，解锁全年权益' },
  ];
  const selectedPlan = plans.find((item) => item.id === plan) || plans[2];

  return (
    <div className="modal-backdrop commerce-backdrop" role="dialog" aria-modal="true" aria-labelledby="member-title">
      <section className="modal-card commerce-modal member-pay-modal">
        <header className="modal-head">
          <div><span>Membership</span><h2 id="member-title">开通会员</h2></div>
          <button aria-label="关闭" onClick={onClose}>✕</button>
        </header>
        <div className="member-plan-grid">
          {plans.map((item) => (
            <button key={item.id} className={item.id === plan ? 'member-plan active' : 'member-plan'} onClick={() => setPlan(item.id)}>
              <strong>{item.name}</strong>
              <b>¥{item.price}</b>
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
            <button className={payMethod === 'wechat' ? 'active wechat-pay' : 'wechat-pay'} onClick={() => setPayMethod('wechat')}><WechatOutlined />微信支付</button>
            <button className={payMethod === 'alipay' ? 'active alipay-pay' : 'alipay-pay'} onClick={() => setPayMethod('alipay')}><AlipayCircleOutlined />支付宝</button>
            <button className={payMethod === 'balance' ? 'active balance-pay' : 'balance-pay'} onClick={() => setPayMethod('balance')}><WalletOutlined />余额支付</button>
          </div>
        </section>
        <footer className="commerce-actions">
          <button onClick={onRecharge}>先充值余额</button>
          <button className="primary" onClick={onClose}>立即支付 ¥{selectedPlan.price}</button>
        </footer>
      </section>
    </div>
  );
};

export default MemberPaymentDialog;
