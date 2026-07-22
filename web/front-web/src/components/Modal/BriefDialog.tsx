import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckOutlined, CloseOutlined, FileAddOutlined, LinkOutlined, PlusCircleOutlined, SearchOutlined, ShareAltOutlined, TeamOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { briefApi } from '../../api/brief';
import type { Brief, BriefEditRequest } from '../../types/brief';
import { formatDateTime } from '../../utils/format';
import './modal-dialogs.css';

interface BriefDialogProps {
  projectId: string | null;
  ensureProjectId: () => Promise<string>;
  onNewProductDraft?: () => void;
  refreshKey?: number;
  onClose: () => void;
}

interface BriefVersion {
  id: string;
  label: string;
  updatedAt: string;
}

interface BriefItem {
  id: string;
  name: string;
  updatedAt: string;
  versions: BriefVersion[];
  productName?: string;
  productModel?: string;
  isShared?: number;
  shareEnabled?: number;
  shareToken?: string;
  shareUrl?: string;
}

const getNextVersionLabel = (versions: BriefVersion[]) => {
  const latest = versions[0]?.label.match(/^v(\d+)(?:\.(\d+))?$/);
  if (!latest) return 'v1.0';

  const major = Number(latest[1]);
  return `v${major + 1}.0`;
};

const toBriefItem = (brief: Brief): BriefItem => ({
  id: brief.id,
  name: brief.productName || brief.name || '未命名产品',
  updatedAt: brief.updatedAt,
  versions: (brief.versions || []).map((version) => ({
    id: version.id,
    label: version.label,
    updatedAt: version.createdAt,
  })),
  productName: brief.productName || brief.name,
  productModel: brief.productModel,
  isShared: brief.isShared,
  shareEnabled: brief.shareEnabled,
  shareToken: brief.shareToken,
  shareUrl: brief.shareUrl,
});

const BriefDialog = ({ projectId, ensureProjectId, onNewProductDraft, refreshKey, onClose }: BriefDialogProps) => {
  const [briefs, setBriefs] = useState<BriefItem[]>([]);
  const [sharedBriefs, setSharedBriefs] = useState<BriefItem[]>([]);
  const [selectedBrief, setSelectedBrief] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sharedSearchTerm, setSharedSearchTerm] = useState('');
  const [editRequests, setEditRequests] = useState<BriefEditRequest[]>([]);

  const loadProjectBriefs = useCallback(() => {
    if (!projectId) return;
    briefApi.getList(projectId).then((list) => {
      const next = list.map(toBriefItem);
      setBriefs(next);
      if (next[0]) {
        setSelectedBrief(next[0].id);
        setSelectedVersion(next[0].versions[0]?.id || '');
      }
    }).catch(() => message.warning('Brief 列表加载失败'));
  }, [projectId]);

  const loadSharedBriefs = useCallback((keyword = '') => {
    briefApi.sharedList(keyword).then((list) => {
      setSharedBriefs(list.map(toBriefItem));
    }).catch(() => message.warning('共享 Brief 库加载失败'));
  }, []);

  const loadEditRequests = useCallback((briefId: string) => {
    briefApi.editRequests(briefId)
      .then(setEditRequests)
      .catch(() => setEditRequests([]));
  }, []);

  useEffect(() => {
    loadProjectBriefs();
    loadSharedBriefs();
  }, [loadProjectBriefs, loadSharedBriefs, refreshKey]);

  const currentBrief = useMemo(
    () => briefs.find((brief) => brief.id === selectedBrief) || briefs[0] || null,
    [briefs, selectedBrief],
  );

  const currentVersion = useMemo(
    () => currentBrief?.versions.find((version) => version.id === selectedVersion) || currentBrief?.versions[0] || null,
    [currentBrief, selectedVersion],
  );

  useEffect(() => {
    if (currentBrief?.id) {
      loadEditRequests(currentBrief.id);
    } else {
      setEditRequests([]);
    }
  }, [currentBrief?.id, loadEditRequests]);

  const visibleBriefs = useMemo(
    () => briefs.filter((brief) => brief.name.toLowerCase().includes(searchTerm.trim().toLowerCase())),
    [briefs, searchTerm],
  );

  const visibleSharedBriefs = useMemo(() => {
    const keyword = sharedSearchTerm.trim().toLowerCase();
    return sharedBriefs.filter((brief) => !keyword || [brief.name, brief.productName, brief.productModel]
      .some((value) => (value || '').toLowerCase().includes(keyword)));
  }, [sharedBriefs, sharedSearchTerm]);

  const selectedSharedBriefCount = visibleSharedBriefs.length;
  const compactBriefs = visibleBriefs.slice(0, 6);
  const hasMoreBriefs = visibleBriefs.length > compactBriefs.length;
  const compactRequests = editRequests.slice(0, 2);
  const hasMoreRequests = editRequests.length > compactRequests.length;
  const compactSharedBriefs = visibleSharedBriefs.slice(0, 3);
  const hasMoreSharedBriefs = visibleSharedBriefs.length > compactSharedBriefs.length;

  const handleSelectBrief = (brief: BriefItem) => {
    setSelectedBrief(brief.id);
    setSelectedVersion(brief.versions[0]?.id || '');
    loadEditRequests(brief.id);
  };

  const handleSearchSharedBriefs = () => {
    loadSharedBriefs(sharedSearchTerm.trim());
  };

  const handleAddBrief = async () => {
    onNewProductDraft?.();
    message.success('已清空卖点表单，请填写新产品信息');
    onClose();
  };

  const handleUseSharedBrief = async (brief: BriefItem) => {
    try {
      const currentProjectId = await ensureProjectId();
      const saved = await briefApi.copyToProject(brief.id, currentProjectId);
      const newBrief = toBriefItem(saved);
      setBriefs((prev) => [newBrief, ...prev.filter((item) => item.id !== newBrief.id)]);
      setSelectedBrief(newBrief.id);
      setSelectedVersion(newBrief.versions[0]?.id || '');
      loadEditRequests(newBrief.id);
      message.success('已导入到当前项目');
    } catch {
      message.error('导入失败');
    }
  };

  const handleAddVersion = () => {
    if (!currentBrief) return;

    const createdAt = new Date();
    const timestamp = formatDateTime(createdAt);
    const nextVersion = {
      id: `version-${createdAt.getTime()}`,
      label: getNextVersionLabel(currentBrief.versions),
      updatedAt: timestamp,
    };

    briefApi.update(currentBrief.id, {
      name: currentBrief.name,
      productName: currentBrief.productName || currentBrief.name,
      projectId: projectId || undefined,
      briefContent: `新增版本 ${nextVersion.label}`,
      forceNewVersion: true,
    }).then((saved) => {
      const nextBrief = toBriefItem(saved);
      setBriefs((prev) => prev.map((brief) => (brief.id === nextBrief.id ? nextBrief : brief)));
      setSelectedVersion(nextBrief.versions[0]?.id || nextVersion.id);
      message.success(`已新增版本 ${nextVersion.label}`);
    }).catch(() => message.error('新增版本失败'));
  };

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleShareBrief = async () => {
    if (!currentBrief?.id) return message.warning('请先新增或选择 Brief');
    try {
      const result = await briefApi.enableShare(currentBrief.id);
      const shareUrl = new URL(result.shareUrl, window.location.origin);
      if (selectedVersion) shareUrl.searchParams.set('versionId', selectedVersion);
      await copyToClipboard(shareUrl.toString());
      setBriefs((prev) => prev.map((brief) => brief.id === currentBrief.id ? {
        ...brief,
        shareEnabled: 1,
        shareUrl: result.shareUrl,
      } : brief));
      message.success('分享链接已复制');
    } catch {
      message.error('分享链接生成失败');
    }
  };

  const handleToggleShared = async () => {
    if (!currentBrief?.id) return message.warning('请先新增或选择 Brief');
    try {
      const enabled = currentBrief.isShared === 1 ? 0 : 1;
      const saved = await briefApi.update(currentBrief.id, { isShared: enabled });
      const nextBrief = toBriefItem(saved);
      setBriefs((prev) => prev.map((brief) => brief.id === nextBrief.id ? nextBrief : brief));
      loadSharedBriefs(sharedSearchTerm);
      message.success(enabled ? '已加入共享 Brief 库' : '已移出共享 Brief 库');
    } catch {
      message.error('共享状态更新失败');
    }
  };

  const handleCopySharedLink = async (brief: BriefItem) => {
    try {
      const sharePath = brief.shareUrl || (brief.shareEnabled === 1 && brief.shareToken ? `/brief-share/${brief.shareToken}` : '');
      if (!sharePath) {
        message.warning('这份 Brief 还没有开启协作链接，请让分享人复制分享链接');
        return;
      }
      const shareUrl = new URL(sharePath, window.location.origin).toString();
      await copyToClipboard(shareUrl);
      message.success('协作链接已复制');
    } catch {
      message.error('复制协作链接失败');
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await briefApi.approveEditRequest(requestId);
      if (currentBrief) loadEditRequests(currentBrief.id);
      message.success('已同意编辑申请');
    } catch {
      message.error('审批失败');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await briefApi.rejectEditRequest(requestId);
      if (currentBrief) loadEditRequests(currentBrief.id);
      message.success('已拒绝编辑申请');
    } catch {
      message.error('审批失败');
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="brief-title">
      <section className="modal-card brief-modal">
        <header className="modal-head">
          <div className="brief-modal-head-copy">
            <span>Brief 管理</span>
            <h2 id="brief-title">先选产品，再选版本，然后共享或协作</h2>
            <p>左侧选择或新建产品，右侧快速处理版本、共享、编辑申请和共享库。</p>
          </div>
          <button type="button" aria-label="关闭" className="modal-close-button" onClick={onClose}>
            <CloseOutlined />
          </button>
        </header>

        <div className="brief-manager-shell">
          <aside className="manager-panel brief-picker-panel">
            <div className="panel-title panel-title-stacked compact-title">
              <div>
                <strong>产品列表</strong>
                <small>先选一个产品，再去右边处理版本和协作</small>
              </div>
            </div>
            <label className="search-box brief-search-box">
              <span>搜索当前项目产品</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="按产品名称搜索，例如：JRFH-2026"
              />
            </label>
            <button type="button" className="secondary-action brief-add-button brief-add-compact" onClick={handleAddBrief}>
              <FileAddOutlined />新建产品
            </button>
            <div className="brief-list brief-picker-list">
              {compactBriefs.length > 0 ? (
                compactBriefs.map((brief) => (
                  <button
                    type="button"
                    key={brief.id}
                    className={brief.id === selectedBrief ? 'brief-row active' : 'brief-row'}
                    onClick={() => handleSelectBrief(brief)}
                  >
                    <span className="brief-row-name">{brief.name}</span>
                    {brief.id === selectedBrief ? <CheckOutlined /> : <span className="brief-row-dot" />}
                  </button>
                ))
              ) : (
                <div className="empty-brief-state">当前项目还没有产品。先点「新建产品」，或者用下面的共享库导入。</div>
              )}
              {hasMoreBriefs ? <div className="brief-more-note">还有 {visibleBriefs.length - compactBriefs.length} 条，请继续搜索。</div> : null}
            </div>
          </aside>

          <section className="manager-panel brief-detail-panel">
            <div className="brief-detail-stack">
              <section className="brief-detail-card brief-selected-card brief-summary-card">
                <div className="panel-title panel-title-stacked">
                  <div>
                    <strong>当前产品</strong>
                    <small>确认你现在操作的是哪个产品</small>
                  </div>
                  <span className={currentBrief?.isShared === 1 ? 'status-pill shared' : 'status-pill'}>{currentBrief?.isShared === 1 ? '已共享' : '未共享'}</span>
                </div>
                {currentBrief ? (
                  <div className="brief-summary-grid">
                    <div>
                      <label>产品名称</label>
                      <strong>{currentBrief.name}</strong>
                    </div>
                    <div>
                      <label>更新时间</label>
                      <strong>{formatDateTime(currentBrief.updatedAt)}</strong>
                    </div>
                    <div>
                      <label>当前版本</label>
                      <strong>{currentVersion?.label || '暂无版本'}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="empty-brief-state">还没选中任何产品，左侧先点一条，右侧才会显示版本和协作操作。</div>
                )}
              </section>

              <section className="brief-detail-card brief-version-card">
                <div className="panel-title panel-title-inline">
                  <div>
                    <strong>版本</strong>
                    <small>选一个版本，或直接新增</small>
                  </div>
                  <button type="button" className="secondary-action brief-version-button" onClick={handleAddVersion} disabled={!currentBrief}>
                    <PlusCircleOutlined />新增版本
                  </button>
                </div>
                {currentBrief ? (
                  <label className="brief-version-select-wrap">
                    <span>选择版本</span>
                    <select value={selectedVersion} onChange={(event) => setSelectedVersion(event.target.value)}>
                      {currentBrief.versions.length ? currentBrief.versions.map((version) => (
                        <option key={version.id} value={version.id}>{version.label} · {formatDateTime(version.updatedAt)}</option>
                      )) : <option value="">暂无版本</option>}
                    </select>
                  </label>
                ) : <div className="empty-brief-state">选择 Brief 后，这里会出现版本列表。</div>}
              </section>

              <section className="brief-detail-card collaboration-card">
                <div className="panel-title panel-title-inline">
                  <div>
                    <strong>共享 / 协作</strong>
                    <small>设为共享后会生成协作链接</small>
                  </div>
                  <button type="button" className="secondary-action brief-version-button" onClick={handleToggleShared} disabled={!currentBrief}>
                    <TeamOutlined />{currentBrief?.isShared === 1 ? '取消共享' : '设为共享'}
                  </button>
                </div>
                <div className="brief-share-note brief-share-callout">
                  <LinkOutlined />
                  <span>{currentBrief?.shareEnabled === 1 ? '已开启协作链接。点击“复制分享链接”可发给同事或博主。' : '开启后会生成协作分享链接，别人才能通过链接查看或申请编辑。'}</span>
                </div>
                <div className="brief-action-row">
                  <button type="button" className="secondary-action brief-copy-button" onClick={handleShareBrief} disabled={!currentBrief}>
                    <ShareAltOutlined />复制分享链接
                  </button>
                </div>
              </section>

              <section className="brief-detail-card request-panel">
                <div className="panel-title panel-title-inline compact">
                  <div>
                    <strong>编辑申请</strong>
                    <small>谁在申请编辑，一眼就能看到</small>
                  </div>
                  <span className="status-pill">{editRequests.length} 条</span>
                </div>
                <div className="brief-edit-requests compact-list">
                  {compactRequests.length ? compactRequests.map((request) => (
                    <article key={request.id} className="brief-request-card">
                      <div className="brief-request-main">
                        <strong>用户 {request.requesterId}</strong>
                        <small>{request.requestMessage || '申请编辑这份 Brief'}</small>
                        <em className={request.status === 'pending' ? 'pending' : request.status}>{request.status}</em>
                      </div>
                      {request.status === 'pending' && (
                        <p>
                          <button type="button" onClick={() => handleApproveRequest(request.id)}>同意</button>
                          <button type="button" onClick={() => handleRejectRequest(request.id)}>拒绝</button>
                        </p>
                      )}
                    </article>
                  )) : <div className="empty-brief-state compact-empty">暂无编辑申请。</div>}
                  {hasMoreRequests ? <div className="brief-more-note">还有 {editRequests.length - compactRequests.length} 条，请打开共享库继续查看。</div> : null}
                </div>
              </section>

              <section className="brief-detail-card shared-library-card">
                <div className="panel-title panel-title-inline">
                  <div>
                    <strong>共享产品库</strong>
                    <small>搜索后可直接使用到当前项目</small>
                  </div>
                  <span className="status-pill">{selectedSharedBriefCount} 条结果</span>
                </div>
                <div className="shared-library-search-row">
                  <label className="search-box brief-search-box shared-library-search-box">
                    <span>搜索共享产品</span>
                    <input
                      value={sharedSearchTerm}
                      onChange={(event) => setSharedSearchTerm(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleSearchSharedBriefs();
                      }}
                      placeholder="输入产品名称 / 型号"
                    />
                  </label>
                  <button type="button" className="secondary-action shared-library-search-button" onClick={handleSearchSharedBriefs}>
                    <SearchOutlined />搜索
                  </button>
                </div>
                <div className="brief-list shared-brief-list">
                  {compactSharedBriefs.length > 0 ? (
                    compactSharedBriefs.map((brief) => (
                      <article key={brief.id} className="shared-brief-row">
                        <div className="shared-brief-main">
                          <strong>{brief.name}</strong>
                        </div>
                        <div className="shared-brief-actions">
                          <button type="button" onClick={() => handleUseSharedBrief(brief)}>使用到当前项目</button>
                          <button type="button" className="ghost" onClick={() => handleCopySharedLink(brief)}>
                            <LinkOutlined />协作链接
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-brief-state">暂无共享产品。把当前产品设为共享后，其他账号就能在这里搜索并使用。</div>
                  )}
                  {hasMoreSharedBriefs ? <div className="brief-more-note">还有 {visibleSharedBriefs.length - compactSharedBriefs.length} 条，请继续搜索。</div> : null}
                </div>
              </section>
            </div>

            <footer className="modal-actions brief-modal-actions">
              <button type="button" onClick={onClose}>取消</button>
              <button type="button" className="primary" onClick={onClose}>使用当前 Brief</button>
            </footer>
          </section>
        </div>
      </section>
    </div>
  );
};

export default BriefDialog;
