import { GiftOutlined, LeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './membership-exchange-page.css';

const MembershipExchangePage = () => {
  const navigate = useNavigate();

  return (
    <main className="membership-exchange-page">
      <header className="membership-exchange-header">
        <button type="button" onClick={() => navigate('/membership')}>
          <LeftOutlined /> 返回会员中心
        </button>
        <nav aria-label="会员中心导航">
          <button type="button" onClick={() => navigate('/membership/points')}>购买水滴</button>
          <button type="button" onClick={() => navigate('/membership/orders')}>订阅管理</button>
          <button className="active" type="button">会员兑换</button>
        </nav>
      </header>

      <section className="membership-exchange-development" aria-labelledby="membership-exchange-title">
        <span className="membership-exchange-icon" aria-hidden="true"><GiftOutlined /></span>
        <span className="membership-exchange-eyebrow">MEMBER REDEMPTION</span>
        <h1 id="membership-exchange-title">正在开发中</h1>
        <p>会员权益兑换功能正在建设中，开放后可在这里兑换会员专属权益。</p>
        <button type="button" onClick={() => navigate('/membership')}>返回会员套餐</button>
      </section>
    </main>
  );
};

export default MembershipExchangePage;
