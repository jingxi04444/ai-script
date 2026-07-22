import { useState } from 'react';
import { WechatOutlined, AlipayCircleOutlined } from '@ant-design/icons';

interface RechargeDialogProps {
  onClose: () => void;
}

const RechargeDialog = ({ onClose }: RechargeDialogProps) => {
  const [amount, setAmount] = useState('100');
  const amounts = ['50', '100', '300', '500'];

  return (
    <div className="modal-backdrop commerce-backdrop" role="dialog" aria-modal="true" aria-labelledby="recharge-title">
      <section className="modal-card commerce-modal recharge-modal">
        <header className="modal-head">
          <div><span>Balance</span><h2 id="recharge-title">充值中心</h2></div>
          <button aria-label="关闭" onClick={onClose}>✕</button>
        </header>
        <div className="balance-card">
          <span>当前余额</span>
          <strong>¥0.00</strong>
          <p>充值后可用于会员、生成额度和视频导出。</p>
        </div>
        <section className="recharge-amount-grid">
          {amounts.map((item) => (
            <button key={item} className={item === amount ? 'active' : ''} onClick={() => setAmount(item)}>¥{item}</button>
          ))}
        </section>
        <label className="custom-amount-field">
          <span>自定义金额</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <section className="payment-method-panel">
          <h3>支付方式</h3>
          <div>
            <button className="active wechat-pay"><WechatOutlined />微信支付</button>
            <button className="alipay-pay"><AlipayCircleOutlined />支付宝</button>
          </div>
        </section>
        <footer className="commerce-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={onClose}>确认充值 ¥{amount || '0'}</button>
        </footer>
      </section>
    </div>
  );
};

export default RechargeDialog;
