import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export type MembershipTopbarTab = 'plans' | 'orders' | 'points';

interface MembershipTopbarProps {
  active: MembershipTopbarTab;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const MembershipTopbar = ({ active, onRefresh, refreshing = false }: MembershipTopbarProps) => {
  const navigate = useNavigate();

  return (
    <header className="membership-topbar">
      <nav className="membership-tabs" aria-label="会员中心导航">
        <button className={active === 'plans' ? 'active' : ''} type="button" onClick={() => navigate('/membership')}>会员套餐</button>
        <button className={active === 'orders' ? 'active' : ''} type="button" onClick={() => navigate('/membership/orders')}>订单记录</button>
        <button className={active === 'points' ? 'active' : ''} type="button" onClick={() => navigate('/membership/points')}>购买积分</button>
      </nav>
      {onRefresh ? (
        <button className="membership-refresh" type="button" onClick={onRefresh} disabled={refreshing}>
          <ReloadOutlined /> {refreshing ? '刷新中' : '刷新'}
        </button>
      ) : null}
    </header>
  );
};

export default MembershipTopbar;
