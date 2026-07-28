import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, message } from 'antd';
import { CheckOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { paymentApi } from '../../api/payment';
import { siteApi } from '../../api/site';
import { useAuthStore } from '../../stores/authStore';
import { applyTheme, getStoredThemeMode, type ThemeMode } from '../../utils/theme';
import MemberPaymentDialog from '../Modal/MemberPaymentDialog';
import RechargeDialog from '../Modal/RechargeDialog';
import ProfileDialog from '../Modal/ProfileDialog';
import './home-rail.css';

interface HomeRailProps {
  activeLabel: string;
  onCreate?: () => void;
  onHome?: () => void;
  onProjects?: () => void;
  onAssets?: () => void;
  onMember?: () => void;
  onRecharge?: () => void;
}

const homeNavItems = [
  { icon: 'home', label: '首页' },
  { icon: 'clapper', label: '创作大厅' },
  { icon: 'expert', label: '专家市场' },
  { icon: 'folder', label: '我的项目' },
  { icon: 'assets', label: '资产管理' },
];

const HomeRail = ({ activeLabel, onCreate, onHome, onProjects, onAssets, onMember, onRecharge }: HomeRailProps) => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [balance, setBalance] = useState<number | null>(null);
  const [homeLogoUrl, setHomeLogoUrl] = useState(() => siteApi.getCachedConfig()?.homeLogoUrl || '');
  const [profileOpen, setProfileOpen] = useState(false);
  const [fallbackCommerceDialog, setFallbackCommerceDialog] = useState<'member' | 'recharge' | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    paymentApi.wallet()
      .then((wallet) => setBalance(wallet.balance || 0))
      .catch(() => setBalance(null));
  }, []);

  useEffect(() => {
    siteApi.getConfig()
      .then((config) => setHomeLogoUrl(config.homeLogoUrl || ''))
      .catch(() => setHomeLogoUrl(''));
  }, []);

  const handleNavClick = (label: string) => {
    if (label === '创作大厅') {
      if (onCreate) {
        onCreate();
        return;
      }
      navigate('/workspace');
    } else if (label === '专家市场') {
      message.info('专家市场即将开放');
    } else if (label === '首页') {
      onHome?.();
      navigate('/home');
    } else if (label === '我的项目') {
      onProjects?.();
      navigate('/projects');
    } else if (label === '资产管理') {
      if (onAssets) {
        onAssets();
      } else {
        navigate('/assets');
      }
    }
  };

  const profileMenuItems: MenuProps['items'] = [
    {
      key: 'appearance',
      icon: themeMode === 'light' ? <SunOutlined /> : <MoonOutlined />,
      label: '\u663e\u793a\u6a21\u5f0f',
      children: [
        {
          key: 'theme-light',
          icon: <SunOutlined />,
          label: <span className="rail-theme-option"><span>{'\u6d45\u8272\u6a21\u5f0f'}</span>{themeMode === 'light' ? <CheckOutlined /> : null}</span>,
        },
        {
          key: 'theme-dark',
          icon: <MoonOutlined />,
          label: <span className="rail-theme-option"><span>{'\u6df1\u8272\u6a21\u5f0f'}</span>{themeMode === 'dark' ? <CheckOutlined /> : null}</span>,
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'info',
      label: '我的信息',
    },
    {
      type: 'divider',
    },
    {
      key: 'orders',
      label: '我的订单',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      danger: true,
      label: '\u9000\u51fa',
    },
  ];

  const handleProfileMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'theme-light' || key === 'theme-dark') {
      setThemeMode(key === 'theme-light' ? 'light' : 'dark');
      return;
    }
    if (key === 'info') {
      setProfileOpen(true);
      return;
    }
    if (key === 'orders') {
      navigate('/payment/orders');
      return;
    }
    if (key === 'logout') {
      void logout().finally(() => navigate('/login', { replace: true }));
    }
  };

  const openMembership = () => {
    if (onMember) onMember();
    else setFallbackCommerceDialog('member');
  };

  return (
    <>
    <aside className="home-rail">
      {homeLogoUrl ? (
        <img className="nano-mark home-logo-image" src={homeLogoUrl} alt="首页图标" />
      ) : (
        <div className="nano-mark" aria-label="Nano">
          <span /><span /><span /><span /><span /><span /><i /><i />
        </div>
      )}
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
        <button className="rail-membership-card" type="button" onClick={openMembership}>
          <span>✦ {balance === null ? '--' : balance.toFixed(0)}</span>
          <strong>高级会员</strong>
        </button>
        <button className="rail-avatar rail-profile-trigger" type="button" aria-label="打开个人信息" onClick={() => setProfileOpen(true)}>🐣</button>
        <button className="rail-bottom-icon rail-bottom-bell" type="button" aria-label="消息" onClick={() => message.info('暂无新消息')}><span /></button>
        <button className="rail-bottom-icon rail-bottom-cli" type="button" aria-label="更新日志" onClick={() => message.info('当前已是最新版本')}>CLI</button>
        <Dropdown
          menu={{ items: profileMenuItems, onClick: handleProfileMenuClick }}
          trigger={['click']}
          placement="bottomLeft"
          autoAdjustOverflow={false}
          overlayClassName="rail-profile-dropdown"
        >
          <button className="rail-bottom-icon rail-bottom-menu" type="button" aria-label="更多菜单" aria-haspopup="menu"><span /></button>
        </Dropdown>
      </div>
    </aside>
    {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
    {fallbackCommerceDialog === 'member' && (
      <MemberPaymentDialog onClose={() => setFallbackCommerceDialog(null)} onRecharge={() => { if (onRecharge) onRecharge(); else setFallbackCommerceDialog('recharge'); }} />
    )}
    {fallbackCommerceDialog === 'recharge' && <RechargeDialog onClose={() => setFallbackCommerceDialog(null)} />}
    </>
  );
};

export default HomeRail;
