import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Popover, message } from 'antd';
import { CheckOutlined, CopyOutlined, DownOutlined, GlobalOutlined, LoadingOutlined } from '@ant-design/icons';
import { scriptApi } from '../../api/script';
import type { ScriptShareLink } from '../../types/script';
import './script-share-panel.css';

type ShareScope = 'off' | 'online';

const SCOPE_OPTIONS: Array<{ value: ShareScope; label: string }> = [
  { value: 'off', label: '未开启' },
  { value: 'online', label: '互联网获得链接的人' },
];

interface ScriptSharePanelProps {
  scriptId?: string;
  children: ReactElement;
}

/**
 * 脚本链接分享面板：只有「未开启」和「互联网获得链接的人（可评论）」两种状态，链接不设有效期。
 */
export default function ScriptSharePanel({ scriptId, children }: ScriptSharePanelProps) {
  const [open, setOpen] = useState(false);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [link, setLink] = useState<ScriptShareLink | null>(null);

  const load = useCallback(async () => {
    if (!scriptId) return;
    setLoading(true);
    try {
      setLink(await scriptApi.getShareLink(scriptId));
    } catch {
      // 请求层已统一提示错误
    } finally {
      setLoading(false);
    }
  }, [scriptId]);

  useEffect(() => {
    if (!open) {
      setScopeMenuOpen(false);
      return;
    }
    void load();
  }, [open, load]);

  const scope: ShareScope = link?.enabled ? 'online' : 'off';
  const shareUrl = link?.enabled && link.path ? new URL(link.path, window.location.origin).toString() : '';
  const busy = loading || saving;

  const changeScope = async (next: ShareScope) => {
    setScopeMenuOpen(false);
    if (!scriptId || next === scope) return;
    setSaving(true);
    try {
      setLink(await scriptApi.updateShareLink(scriptId, next === 'online'));
      message.success(next === 'online' ? '已开启链接分享' : '已关闭链接分享');
    } catch {
      // 请求层已统一提示错误
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      message.success('链接已复制');
    } catch {
      message.error('复制失败，请手动选中链接复制');
    }
  };

  const content = (
    <div className="script-share-panel">
      <header className="script-share-head">
        <strong>分享脚本</strong>
        {busy && <LoadingOutlined spin />}
      </header>
      <div className="script-share-body">
        <h4>链接分享</h4>
        <div className="script-share-scope">
          <span className={`script-share-scope-icon ${scope === 'online' ? 'is-on' : ''}`} aria-hidden="true">
            <GlobalOutlined />
          </span>
          <button
            type="button"
            className="script-share-scope-trigger"
            disabled={!scriptId || busy}
            aria-haspopup="listbox"
            aria-expanded={scopeMenuOpen}
            onClick={() => setScopeMenuOpen((value) => !value)}
          >
            <span>{scope === 'online' ? '互联网获得链接的人' : '未开启'}</span>
            <DownOutlined />
          </button>
          {scope === 'online' && <span className="script-share-permission">可评论</span>}
        </div>
        {scopeMenuOpen && (
          <div className="script-share-scope-menu" role="listbox" aria-label="分享范围">
            <p>分享范围</p>
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === scope}
                onClick={() => void changeScope(option.value)}
              >
                <span>{option.label}</span>
                {option.value === scope && <CheckOutlined />}
              </button>
            ))}
          </div>
        )}
        {scope === 'online' && (
          <div className="script-share-link">
            <input
              readOnly
              value={shareUrl}
              aria-label="脚本分享链接"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" onClick={() => void copyLink()}><CopyOutlined />复制链接</button>
          </div>
        )}
        <p className="script-share-hint">
          {scope === 'online'
            ? <>获得链接的人需先登录，登录后可查看脚本、添加批注并提交审核意见；<b>链接长期有效</b>，关闭分享后立即失效。</>
            : '开启后，互联网上获得链接的人登录后即可查看脚本、添加批注并提交审核意见。'}
        </p>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      overlayClassName="script-share-popover"
      content={content}
    >
      {children}
    </Popover>
  );
}
