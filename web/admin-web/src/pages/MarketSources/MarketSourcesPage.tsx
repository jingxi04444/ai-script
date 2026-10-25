import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpenText,
  CheckCircle2,
  Chrome,
  Clock3,
  Cookie,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  MessageSquareText,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { marketSourceApi, type MarketSourceConfig, type MarketSourceStatus } from '../../api/marketSource';
import { Modal, PageHeader, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import './market-sources-page.css';

type EditForm = {
  cookie: string;
  alertPhone: string;
  enabled: boolean;
  alertEnabled: boolean;
};

type CredentialGuide = {
  siteName: string;
  loginUrl: string;
  requestPattern: string;
  cookieKey: string;
  keyExplanation: string;
  expiryTip: string;
  steps: Array<{ title: string; detail: string }>;
};

const credentialGuides: Record<MarketSourceConfig['platform'], CredentialGuide> = {
  douyin: {
    siteName: '抖音',
    loginUrl: 'https://www.douyin.com/',
    requestPattern: '/aweme/v1/web/',
    cookieKey: 'UIFID',
    keyExplanation: '完整 Cookie 通常应包含 UIFID。缺失时请重新登录，再从请求头复制完整值。',
    expiryTip: '重新登录并重复以上步骤，替换完整 Cookie；不要只更新 UIFID 或其他局部字段。',
    steps: [
      {
        title: '登录抖音网页版',
        detail: '使用桌面版 Chrome 打开抖音并完成登录。未登录状态复制到的 Cookie 无法用于搜索。',
      },
      {
        title: '打开开发者工具',
        detail: '按 F12，切换到 Network（网络）面板，并选择 Fetch/XHR 过滤类型。',
      },
      {
        title: '触发一次真实请求',
        detail: '刷新首页，或在站内搜索任意品类，例如“油烟机”。',
      },
      {
        title: '复制完整 Cookie',
        detail: '找到包含 /aweme/v1/web/ 的请求，打开 Request Headers，点击 Raw（如有），复制 Cookie 的完整值。',
      },
      {
        title: '粘贴并检测',
        detail: '返回本页编辑配置，粘贴 Cookie 后保存，并点击“检测 Cookie”确认可用。',
      },
    ],
  },
  xiaohongshu: {
    siteName: '小红书',
    loginUrl: 'https://www.xiaohongshu.com/',
    requestPattern: '/api/sns/web/',
    cookieKey: 'web_session',
    keyExplanation: '完整 Cookie 必须包含服务端签发的 web_session；该值无法手写或伪造。',
    expiryTip: '重新登录并重复以上步骤，替换完整 Cookie；不要只更新 a1、web_id 等局部字段。',
    steps: [
      {
        title: '登录小红书网页版',
        detail: '使用桌面版 Chrome 打开小红书并完成登录。请使用当前正常登录的浏览器会话。',
      },
      {
        title: '打开开发者工具',
        detail: '按 F12，切换到 Network（网络）面板，并选择 Fetch/XHR 过滤类型。',
      },
      {
        title: '触发一次真实请求',
        detail: '刷新首页，或在站内搜索任意品类，例如“油烟机”。',
      },
      {
        title: '复制完整 Cookie',
        detail: '找到包含 /api/sns/web/ 的请求，打开 Request Headers，点击 Raw（如有），复制 Cookie 的完整值。',
      },
      {
        title: '粘贴并检测',
        detail: '返回本页编辑配置，粘贴 Cookie 后保存，并点击“检测 Cookie”确认可用。',
      },
    ],
  },
};

const statusMeta: Record<MarketSourceStatus, { label: string; tone: 'green' | 'orange' | 'red' | 'gray' }> = {
  valid: { label: 'Cookie 有效', tone: 'green' },
  invalid: { label: '疑似已过期', tone: 'red' },
  check_failed: { label: '校验异常', tone: 'orange' },
  unchecked: { label: '待检测', tone: 'gray' },
};

const formatTime = (value?: string) => {
  if (!value) return '尚未执行';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ').slice(0, 16);
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

const emptyForm = (source: MarketSourceConfig): EditForm => ({
  cookie: '',
  alertPhone: '',
  enabled: source.enabled,
  alertEnabled: source.alertEnabled,
});

const MarketSourcesPage = () => {
  const { notify } = useAdminShell();
  const [sources, setSources] = useState<MarketSourceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MarketSourceConfig | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [showCookie, setShowCookie] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [guidePlatform, setGuidePlatform] = useState<MarketSourceConfig['platform'] | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await marketSourceApi.list();
      setSources(Array.isArray(data) ? data : []);
    } catch {
      notify('市场采集配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openEditor = (source: MarketSourceConfig) => {
    setEditing(source);
    setForm(emptyForm(source));
    setShowCookie(false);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditing(null);
    setForm(null);
    setShowCookie(false);
  };

  const guide = guidePlatform ? credentialGuides[guidePlatform] : null;
  const guideSource = guidePlatform ? sources.find((item) => item.platform === guidePlatform) : undefined;

  const openGuideEditor = () => {
    if (!guideSource) return;
    setGuidePlatform(null);
    openEditor(guideSource);
  };

  const save = async () => {
    if (!editing || !form || saving) return;
    if (!editing.cookieConfigured && !form.cookie.trim()) {
      notify('首次配置必须填写 Cookie');
      return;
    }
    if (form.alertEnabled && !editing.alertPhoneConfigured && !form.alertPhone.trim()) {
      notify('开启失效提醒时必须填写手机号');
      return;
    }
    if (form.alertPhone.trim() && !/^1[3-9]\d{9}$/.test(form.alertPhone.trim())) {
      notify('提醒手机号格式不正确');
      return;
    }
    setSaving(true);
    try {
      const saved = await marketSourceApi.save(editing.platform, {
        cookie: form.cookie.trim() || undefined,
        alertPhone: form.alertPhone.trim() || undefined,
        enabled: form.enabled,
        alertEnabled: form.alertEnabled,
      });
      setSources((current) => current.map((item) => item.platform === saved.platform ? saved : item));
      notify(`${saved.platformName}采集配置已保存`);
      closeEditor();
    } catch (error) {
      notify((error as { message?: string })?.message || '市场采集配置保存失败');
    } finally {
      setSaving(false);
    }
  };

  const validate = async (source: MarketSourceConfig) => {
    if (checking) return;
    if (!source.cookieConfigured) {
      notify('请先配置 Cookie 再检测');
      return;
    }
    setChecking(source.platform);
    try {
      const updated = await marketSourceApi.validate(source.platform);
      setSources((current) => current.map((item) => item.platform === updated.platform ? updated : item));
      if (updated.cookieStatus === 'valid') {
        notify(`${updated.platformName} Cookie 检测有效`);
      } else {
        notify(`${updated.platformName} Cookie ${updated.cookieStatus === 'invalid' ? '疑似已过期' : '本次检测异常'}`);
      }
    } catch (error) {
      notify((error as { message?: string })?.message || 'Cookie 检测失败');
    } finally {
      setChecking(null);
    }
  };

  return (
    <div className="page-stack market-source-page">
      <PageHeader
        title="市场采集"
        description="在这里维护抖音、小红书 Cookie 与失效提醒手机号。点击平台卡片的“获取说明”查看浏览器抓取步骤。"
        actions={<button className="toolbar-btn" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} />刷新状态</button>}
      />

      <section className="market-source-overview">
        <div>
          <span className="market-source-overview-kicker">CREDENTIAL HEALTH</span>
          <strong>{sources.filter((item) => item.cookieStatus === 'valid').length}<small>/ {sources.length || 2}</small></strong>
          <p>采集源 Cookie 正常</p>
        </div>
        <div className="market-source-overview-rule">
          <ShieldCheck size={18} />
          <p>每 6 小时自动检测一次。连续 2 次失败才判定疑似过期，同一轮异常最多每 24 小时提醒一次。</p>
        </div>
      </section>

      <SectionCard
        title="平台凭据"
        description="后台修改后立即用于下一次市场采集；留空 Cookie 表示保留当前值。"
      >
        <div className="market-source-grid">
          {loading ? (
            <div className="market-source-loading">正在读取加密配置...</div>
          ) : sources.length === 0 ? (
            <div className="market-source-loading">
              <span>暂时没有读取到采集源配置</span>
              <button className="toolbar-btn" type="button" onClick={() => void load()}>重新加载</button>
            </div>
          ) : sources.map((source, index) => {
            const status = statusMeta[source.cookieStatus] || statusMeta.unchecked;
            const busy = checking === source.platform;
            return (
              <article className={`market-source-card status-${source.cookieStatus}`} key={source.platform}>
                <header>
                  <span className="market-source-index">0{index + 1}</span>
                  <div>
                    <p>{source.platform === 'douyin' ? 'DOUYIN / WEB' : 'XIAOHONGSHU / PC'}</p>
                    <h3>{source.platformName}</h3>
                  </div>
                  <StatusBadge tone={source.enabled ? status.tone : 'gray'}>
                    {source.enabled ? status.label : '采集已停用'}
                  </StatusBadge>
                </header>

                <div className="market-source-credential-state">
                  <div>
                    <Cookie size={18} />
                    <span>Cookie</span>
                    <strong>{source.cookieConfigured ? '已加密配置' : '未配置'}</strong>
                  </div>
                  <div>
                    <Smartphone size={18} />
                    <span>提醒手机号</span>
                    <strong>{source.alertPhoneConfigured ? source.maskedAlertPhone || '已配置' : '未配置'}</strong>
                  </div>
                  <div>
                    <MessageSquareText size={18} />
                    <span>短信提醒</span>
                    <strong>{source.alertEnabled ? '开启' : '关闭'}</strong>
                  </div>
                </div>

                <div className="market-source-timeline">
                  <div><Clock3 size={14} /><span>最近检测</span><strong>{formatTime(source.lastCheckedAt)}</strong></div>
                  <div><CheckCircle2 size={14} /><span>最近有效</span><strong>{formatTime(source.lastValidAt)}</strong></div>
                  <div><ShieldAlert size={14} /><span>最近提醒</span><strong>{formatTime(source.lastAlertAt)}</strong></div>
                </div>

                {source.lastErrorMessage ? (
                  <p className="market-source-error"><AlertTriangle size={14} />{source.lastErrorMessage}</p>
                ) : (
                  <p className="market-source-hint">
                    {source.cookieStatus === 'valid'
                      ? '采集链路正常，下一次刷新会直接使用该 Cookie。'
                      : '保存后建议立即检测一次，确认登录态仍可用。'}
                  </p>
                )}

                <footer>
                  <button className="toolbar-btn market-source-guide" type="button" onClick={() => setGuidePlatform(source.platform)}>
                    <BookOpenText size={15} />获取说明
                  </button>
                  <button className="toolbar-btn" type="button" onClick={() => openEditor(source)}>编辑配置</button>
                  <button className="toolbar-btn market-source-check" type="button" disabled={busy || !source.cookieConfigured} onClick={() => void validate(source)}>
                    <RefreshCw size={15} className={busy ? 'market-source-spin' : ''} />
                    {busy ? '检测中' : '检测 Cookie'}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <section className="market-source-security-note">
        <ShieldCheck size={20} />
        <div>
          <strong>配置安全</strong>
          <p>Cookie 与手机号使用后端 AES-GCM 加密保存。列表只显示掩码，Python Skill 通过内部令牌临时获取 Cookie，不会写入 Redis、任务结果或前端状态。</p>
        </div>
      </section>

      <Modal
        open={Boolean(editing && form)}
        title={editing ? `配置${editing.platformName}` : '配置采集源'}
        description="更新后立即生效。Cookie 输入框留空不会覆盖现有值。"
        onClose={closeEditor}
        size="md"
        footer={(
          <>
            <button className="modal-btn" type="button" onClick={closeEditor} disabled={saving}>取消</button>
            <button className="modal-btn primary" type="button" onClick={() => void save()} disabled={saving}>
              <Save size={16} />{saving ? '保存中' : '保存配置'}
            </button>
          </>
        )}
      >
        {editing && form ? (
          <div className="market-source-form">
            <label className="field market-source-cookie-field">
              <span>平台 Cookie</span>
              <div className="market-source-secret-input">
                <textarea
                  value={form.cookie}
                  onChange={(event) => setForm({ ...form, cookie: event.target.value })}
                  placeholder={editing.cookieConfigured ? '已配置，留空保持不变；粘贴新 Cookie 可替换' : '粘贴浏览器登录后的完整 Cookie'}
                  spellCheck={false}
                  autoComplete="off"
                  className={showCookie ? 'is-visible' : ''}
                />
                <button type="button" aria-label={showCookie ? '隐藏 Cookie' : '显示 Cookie'} onClick={() => setShowCookie((value) => !value)}>
                  {showCookie ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <small>
                {editing.platform === 'douyin' ? '完整 Cookie 通常需包含 UIFID。' : '完整 Cookie 必须包含 web_session。'}
                Cookie 只发送给 Python Skill 的内部采集进程，不写入任务参数和日志。
              </small>
            </label>

            <label className="field">
              <span>过期提醒手机号</span>
              <input
                value={form.alertPhone}
                onChange={(event) => setForm({ ...form, alertPhone: event.target.value.replace(/\D/g, '').slice(0, 11) })}
                placeholder={editing.alertPhoneConfigured ? `当前 ${editing.maskedAlertPhone || '已配置'}，留空保持不变` : '输入接收提醒的 11 位手机号'}
                inputMode="numeric"
                autoComplete="off"
              />
            </label>

            <div className="market-source-switches">
              <label>
                <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
                <span><strong>启用该采集源</strong><small>关闭后市场刷新不会请求该平台。</small></span>
              </label>
              <label>
                <input type="checkbox" checked={form.alertEnabled} onChange={(event) => setForm({ ...form, alertEnabled: event.target.checked })} />
                <span><strong>Cookie 失效短信提醒</strong><small>连续检测失败 2 次后发送，同一异常 24 小时内不重复。</small></span>
              </label>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(guide)}
        title={guide ? `如何获取${guide.siteName} Cookie` : '如何获取 Cookie'}
        description="Cookie 是平台登录态凭证，请从真实登录后的搜索请求中复制完整值。"
        onClose={() => setGuidePlatform(null)}
        size="lg"
        footer={(
          <>
            <button className="modal-btn" type="button" onClick={() => setGuidePlatform(null)}>稍后配置</button>
            <button className="modal-btn primary" type="button" onClick={openGuideEditor} disabled={!guideSource}>
              <Cookie size={16} />去配置 Cookie
            </button>
          </>
        )}
      >
        {guide ? (
          <div className="market-source-guide">
            <header className="market-source-guide-lead">
              <span className="market-source-guide-device"><Chrome size={23} /></span>
              <div>
                <span>DESKTOP CHROME / 约 1 分钟</span>
                <strong>登录态 + 完整 Cookie 才可用于采集</strong>
                <p>先登录平台账号，再从浏览器真实发出的搜索请求中复制 Cookie。</p>
              </div>
              <a href={guide.loginUrl} target="_blank" rel="noreferrer">
                打开{guide.siteName}<ExternalLink size={14} />
              </a>
            </header>

            <ol className="market-source-guide-steps">
              {guide.steps.map((step, index) => (
                <li key={step.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="market-source-guide-checks">
              <section className="market-source-guide-key">
                <KeyRound size={18} />
                <div>
                  <span>请求与关键字段</span>
                  <strong>
                    <code>{guide.requestPattern}</code>
                    <i>→</i>
                    <code>{guide.cookieKey}</code>
                  </strong>
                  <p>{guide.keyExplanation}</p>
                </div>
              </section>
              <section className="market-source-guide-warning">
                <ShieldAlert size={18} />
                <div>
                  <span>安全要求</span>
                  <strong>Cookie 等同登录凭证</strong>
                  <p>不要截图、转发或写入服务配置，只粘贴到本页加密输入框。建议使用独立采集账号。</p>
                </div>
              </section>
            </div>

            <p className="market-source-guide-expiry">
              <RefreshCw size={15} />
              <span><strong>Cookie 过期时：</strong>{guide.expiryTip}</span>
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default MarketSourcesPage;
