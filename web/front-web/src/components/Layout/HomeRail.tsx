import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, message } from 'antd';
import { BellOutlined, CheckOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { membershipApi } from '../../api/membership';
import { siteApi } from '../../api/site';
import { notificationApi } from '../../api/notification';
import { useAuthStore } from '../../stores/authStore';
import { applyTheme, getStoredThemeMode, type ThemeMode } from '../../utils/theme';
import { TOKEN_KEY } from '../../utils/storage';
import ProfileDialog from '../Modal/ProfileDialog';
import './home-rail.css';

interface HomeRailProps {
  activeLabel: string;
  membershipName?: string;
  pointBalance?: number;
  onCreate?: () => void;
  onHome?: () => void;
  onProjects?: () => void;
  onAssets?: () => void;
  onMember?: () => void;
  onRecharge?: () => void;
}

type HomeNavKey = 'home' | 'create' | 'expert' | 'projects' | 'assets';

interface HomeNavItem {
  key: HomeNavKey;
  icon: string;
  label: string;
  iconUrl?: string;
}

type MembershipSummary = {
  token: string;
  membershipName: string;
  pointBalance: number;
};

let cachedMembershipSummary: MembershipSummary | null = null;
let membershipSummaryRequest: Promise<MembershipSummary> | null = null;
let membershipSummaryRequestToken = '';

const loadMembershipSummary = () => {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  if (cachedMembershipSummary?.token === token) return Promise.resolve(cachedMembershipSummary);
  if (!membershipSummaryRequest || membershipSummaryRequestToken !== token) {
    membershipSummaryRequestToken = token;
    membershipSummaryRequest = Promise.all([membershipApi.current(), membershipApi.points()])
      .then(([membership, account]) => {
        cachedMembershipSummary = {
          token,
          membershipName: membership?.planName || '未开通会员',
          pointBalance: account?.availablePoints ?? 0,
        };
        return cachedMembershipSummary;
      })
      .finally(() => {
        if (membershipSummaryRequestToken === token) {
          membershipSummaryRequest = null;
          membershipSummaryRequestToken = '';
        }
      });
  }
  return membershipSummaryRequest;
};
const defaultHomeNavItems: HomeNavItem[] = [
  { key: 'home', icon: 'home', label: '首页' },
  { key: 'create', icon: 'clapper', label: '创作大厅' },
  { key: 'expert', icon: 'expert', label: '专家市场' },
  { key: 'projects', icon: 'folder', label: '我的项目' },
  { key: 'assets', icon: 'assets', label: '资产管理' },
];

const HomeRail = ({
  activeLabel,
  membershipName: initialMembershipName,
  pointBalance: initialPointBalance,
  onCreate,
  onHome,
  onProjects,
  onAssets,
  onMember,
}: HomeRailProps) => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const currentToken = localStorage.getItem(TOKEN_KEY) || '';
  const matchingCachedSummary = cachedMembershipSummary?.token === currentToken ? cachedMembershipSummary : null;
  const [membershipName, setMembershipName] = useState(initialMembershipName || matchingCachedSummary?.membershipName || '');
  const [pointBalance, setPointBalance] = useState<number | null>(initialPointBalance ?? matchingCachedSummary?.pointBalance ?? null);
  const [homeLogoUrl, setHomeLogoUrl] = useState(() => siteApi.getCachedConfig()?.homeLogoUrl || '');
  const [homeNavItems, setHomeNavItems] = useState<HomeNavItem[]>(defaultHomeNavItems);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (initialMembershipName !== undefined) setMembershipName(initialMembershipName);
    if (initialPointBalance !== undefined) setPointBalance(initialPointBalance);
    const hasMembershipName = Boolean(initialMembershipName);
    const hasPointBalance = initialPointBalance !== undefined;
    if (hasMembershipName && hasPointBalance) {
      cachedMembershipSummary = {
        token: localStorage.getItem(TOKEN_KEY) || '',
        membershipName: initialMembershipName || '免费体验版',
        pointBalance: initialPointBalance,
      };
      return;
    }

    loadMembershipSummary()
      .then((summary) => {
        if (!hasMembershipName) setMembershipName(summary.membershipName);
        if (!hasPointBalance) setPointBalance(summary.pointBalance);
      })
      .catch(() => {
        setMembershipName('免费体验版');
        setPointBalance(null);
      });
  }, [initialMembershipName, initialPointBalance]);

  useEffect(() => {
    let active = true;

    const loadVisualConfig = (force = false) => {
      siteApi.getConfig({ force })
        .then((config) => {
          if (!active) return;
        setHomeLogoUrl(config.homeLogoUrl || '');
        if (!config.homeVisualConfig?.trim()) {
          setHomeNavItems(defaultHomeNavItems);
          return;
        }
        try {
          const parsed = JSON.parse(config.homeVisualConfig) as { navItems?: Array<Partial<HomeNavItem> & { key?: string }> };
          const configuredItems = new Map((parsed.navItems || []).map((item) => [item.key, item]));
          setHomeNavItems(defaultHomeNavItems.map((item) => ({
            ...item,
            ...configuredItems.get(item.key),
            key: item.key,
            icon: item.icon,
          })));
        } catch {
          setHomeNavItems(defaultHomeNavItems);
        }
      })
      .catch(() => {
        if (!active) return;
        setHomeLogoUrl('');
        setHomeNavItems(defaultHomeNavItems);
      });
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') loadVisualConfig(true);
    };

    loadVisualConfig();
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      active = false;
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadUnread = () => {
      notificationApi.list({ page: 1, pageSize: 1, status: '0' })
        .then((result) => {
          if (active) setUnreadNotifications(result.total || 0);
        })
        .catch(() => {
          if (active) setUnreadNotifications(0);
        });
    };
    loadUnread();
    window.addEventListener('notifications:changed', loadUnread);
    return () => {
      active = false;
      window.removeEventListener('notifications:changed', loadUnread);
    };
  }, []);

  const handleNavClick = (key: HomeNavKey) => {
    if (key === 'create') {
      if (onCreate) {
        onCreate();
        return;
      }
      navigate('/workspace');
    } else if (key === 'expert') {
      message.info('专家市场即将开放');
    } else if (key === 'home') {
      onHome?.();
      navigate('/home');
    } else if (key === 'projects') {
      onProjects?.();
      navigate('/projects');
    } else if (key === 'assets') {
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
      key: 'notifications',
      icon: <BellOutlined />,
      label: unreadNotifications > 0 ? `消息中心（${unreadNotifications}）` : '消息中心',
    },
    {
      type: 'divider',
    },
    {
      key: 'orders',
      label: '积分消耗记录',
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
    if (key === 'notifications') {
      navigate('/notifications');
      return;
    }
    if (key === 'logout') {
      void logout().finally(() => navigate('/login', { replace: true }));
    }
  };

  const openMembership = () => {
    if (onMember) {
      onMember();
      return;
    }
    navigate('/membership');
  };

  return (
    <>
    <aside className="home-rail home-rail-stable">
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
            key={item.key}
            className={item.label === activeLabel || defaultHomeNavItems.find((candidate) => candidate.key === item.key)?.label === activeLabel ? 'active' : ''}
            onClick={() => handleNavClick(item.key)}
          >
            {item.iconUrl
              ? <img className="rail-icon rail-custom-icon" src={item.iconUrl} alt="" />
              : <span className={`rail-icon ${item.icon}`} />}
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>
      <div className="rail-member">
        <button className={`rail-membership-card${activeLabel === '会员中心' ? ' active' : ''}`} type="button" onClick={openMembership}>
          <span>✦ {pointBalance === null ? '--' : Math.floor(pointBalance)}积分</span>
          <strong>{membershipName || '免费体验版'}</strong>
        </button>
        <button className="rail-avatar rail-profile-trigger" type="button" aria-label="打开个人信息" onClick={() => setProfileOpen(true)}>🐣</button>
        <button
          className={`rail-bottom-icon rail-bottom-bell${activeLabel === '消息中心' ? ' active' : ''}`}
          type="button"
          aria-label={unreadNotifications > 0 ? `${unreadNotifications} 条未读消息` : '消息中心'}
          onClick={() => navigate('/notifications')}
        >
          <span />
          {unreadNotifications > 0 ? <em>{unreadNotifications > 99 ? '99+' : unreadNotifications}</em> : null}
        </button>
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
    </>
  );
};

export default HomeRail;
