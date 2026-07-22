import { useNavigate, useLocation } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';

interface HomeRailProps {
  activeLabel: string;
  onCreate?: () => void;
  onHome?: () => void;
  onProjects?: () => void;
  onMember?: () => void;
  onRecharge?: () => void;
}

const homeNavItems = [
  { icon: 'home', label: '首页' },
  { icon: 'clapper', label: '制作大片' },
  { icon: 'folder', label: '我的项目' },
  { icon: 'assets', label: '资产管理' },
];

const HomeRail = ({ activeLabel, onCreate, onHome, onProjects, onMember, onRecharge }: HomeRailProps) => {
  const navigate = useNavigate();

  const handleNavClick = (label: string) => {
    if (label === '制作大片') {
      onCreate?.();
      navigate('/workspace');
    } else if (label === '首页') {
      onHome?.();
      navigate('/home');
    } else if (label === '我的项目') {
      onProjects?.();
      navigate('/projects');
    }
  };

  return (
    <aside className="home-rail">
      <div className="nano-mark" aria-label="Nano">
        <span /><span /><span /><span /><span /><span /><i /><i />
      </div>
      <nav aria-label="首页导航">
        {homeNavItems.map((item) => (
          <button
            key={item.label}
            className={item.label === activeLabel ? 'active' : ''}
            onClick={() => handleNavClick(item.label)}
          >
            <span className={`rail-icon ${item.icon}`} />
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>
      <div className="rail-member">
        <button className="rail-balance-button" onClick={onRecharge}>余额 0</button>
        <button onClick={onMember}>开通会员</button>
        <div className="rail-avatar">🐣</div>
      </div>
    </aside>
  );
};

export default HomeRail;
