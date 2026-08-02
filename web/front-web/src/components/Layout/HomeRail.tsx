import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, message } from 'antd';
import { CheckOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { membershipApi } from '../../api/membership';
import { siteApi } from '../../api/site';
import { useAuthStore } from '../../stores/authStore';
import { applyTheme, getStoredThemeMode, type ThemeMode } from '../../utils/theme';
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
  membershipName: string;
  pointBalance: number;
};

let cachedMembershipSummary: MembershipSummary | null = null;
let membershipSummaryRequest: Promise<MembershipSummary> | null = null;

const loadMembershipSummary = () => {
  if (cachedMembershipSummary) return Promise.resolve(cachedMembershipSummary);
  if (!membershipSummaryRequest) {
    membershipSummaryRequest = Promise.all([membershipApi.current(), membershipApi.points()])
      .then(([membership, account]) => {
        cachedMembershipSummary = {
          membershipName: membership?.planName || '免费体验版',
          pointBalance: account?.availablePoints ?? 0,
        };
        return cachedMembershipSummary;
      })
      .finally(() => {
        membershipSummaryRequest = null;
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
  const [membershipName, setMembershipName] = useState(initialMembershipName || cachedMembershipSummary?.membershipName || '');
  const [pointBalance, setPointBalance] = useState<number | null>(initialPointBalance ?? cachedMembershipSummary?.pointBalance ?? null);
  const [homeLogoUrl, setHomeLogoUrl] = useState(() => siteApi.getCachedConfig()?.homeLogoUrl || '');
  const [homeNavItems, setHomeNavItems] = useState<HomeNavItem[]>(defaultHomeNavItems);
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (initialMembershipName !== undefined) setMembershipName(initialMembershipName);
    if (initialPointBalance !== undefined) setPointBalance(initialPointBalance);
    if (initialMembershipName !== undefined || initialPointBalance !== undefined) {
      if (initialMembershipName && initialPointBalance !== undefined) {
        cachedMembershipSummary = {
          membershipName: initialMembershipName,
          pointBalance: initialPointBalance,
        };
      }
      return;
    }

    loadMembershipSummary()
      .then((summary) => {
        setMembershipName(summary.membershipName);
        setPointBalance(summary.pointBalance);
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
    </>
  );
};

export default HomeRail;
