import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  EditOutlined,
  FileWordOutlined,
  FolderOpenOutlined,
  ImportOutlined,
  LeftOutlined,
  LinkOutlined,
  LoadingOutlined,
  PlusOutlined,
  PlusCircleOutlined,
  SaveOutlined,
  ShareAltOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import { briefApi } from '../../api/brief';
import BriefContentLayout from '../Brief/BriefContentLayout';
import RichTextField from '../../pages/Workspace/SellingPoints/RichTextField';
import type { Brief, BriefEditRequest, BriefSharePermission, BriefShareResult } from '../../types/brief';
import { formatDateTime } from '../../utils/format';
import './modal-dialogs.css';

interface BriefDialogProps {
  projectId: string | null;
  ensureProjectId: () => Promise<string>;
  initialBriefId?: string | null;
  onNewProductDraft?: () => void;
  onApplyBrief?: (brief: Brief) => void;
  onBack?: () => void;
  refreshKey?: number;
  onClose: () => void;
}

type BriefManagerView = 'folders' | 'detail';
type BriefSideTab = 'info' | 'collaboration';
type BriefRichFieldKey = 'audience' | 'features' | 'mainPoints' | 'secondaryPoints';
type BriefRichValues = Record<BriefRichFieldKey, string>;

const sharePermissionOptions: Array<{
  value: BriefSharePermission;
  label: string;
  description: string;
}> = [
  { value: 'read', label: '可阅读', description: '适合博主、兼职文案，仅查看和调用，不能修改。' },
  { value: 'edit', label: '可编辑', description: '适合内部协作，可修改 Brief 内容，不能管理权限。' },
  { value: 'manage', label: '可管理', description: '可编辑内容、调整分享权限并处理协作申请。' },
];

const getNextVersionLabel = (brief: Brief) => {
  const latest = brief.versions?.[0]?.label.match(/^v(\d+)(?:\.(\d+))?$/);
  return latest ? `v${Number(latest[1]) + 1}.0` : 'v1.0';
};

const escapeHtml = (value?: string) => (value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\n/g, '<br />');

const richValuesFromBrief = (brief: Brief): BriefRichValues => {
  let stored: Partial<BriefRichValues> = {};
  if (brief.richContent) {
    try {
      const parsed = JSON.parse(brief.richContent) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stored = parsed as Partial<BriefRichValues>;
    } catch {
      stored = {};
    }
  }
  return {
    audience: stored.audience || escapeHtml(brief.targetAudience),
    features: stored.features || escapeHtml(brief.targetScene),
    mainPoints: stored.mainPoints || escapeHtml(brief.primarySellingPoint),
    secondaryPoints: stored.secondaryPoints || escapeHtml(brief.otherRequirements),
  };
};

const briefFromVersionContent = (brief: Brief, versionContent?: string): Brief => {
  if (!versionContent) return brief;
  try {
    const snapshot = JSON.parse(versionContent) as Record<string, unknown>;
    const value = (key: string, fallback?: string) => (
      Object.prototype.hasOwnProperty.call(snapshot, key) ? String(snapshot[key] ?? '') : fallback
    );
    return {
      ...brief,
      name: value('briefName', brief.name) || brief.name,
      productName: value('productName', brief.productName),
      productModel: value('productModel', brief.productModel),
      price: value('price', brief.price),
      slogan: value('slogan', brief.slogan),
      primarySellingPoint: value('primarySellingPoint', brief.primarySellingPoint),
      targetAudience: value('targetAudience', brief.targetAudience),
      targetScene: value('targetScene', brief.targetScene),
      otherRequirements: value('otherRequirements', brief.otherRequirements),
      briefContent: value('briefContent', brief.briefContent),
      richContent: value('richContent', brief.richContent),
    };
  } catch {
    return { ...brief, briefContent: versionContent };
  }
};
const emptyBriefRichValues: BriefRichValues = {
  audience: '',
  features: '',
  mainPoints: '',
  secondaryPoints: '',
};

const buildStructuredBriefHtml = (brief: Brief) => {
  const sections = [
    ['核心卖点', brief.primarySellingPoint],
    ['目标人群', brief.targetAudience],
    ['使用场景', brief.targetScene],
    ['其他要求', brief.otherRequirements],
  ].filter(([, value]) => Boolean(value?.trim()));
  if (!sections.length) return '<p>暂无完整 Brief 内容</p>';
  return sections.map(([label, value]) => `<h3>${label}</h3><p>${escapeHtml(value)}</p>`).join('');
};

const sanitizeBriefHtml = (html: string) => {
  if (typeof document === 'undefined') return html;
  const template = document.createElement('template');
  template.innerHTML = html;
  const allowedTags = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'SPAN', 'FONT', 'H2', 'H3', 'UL', 'OL', 'LI']);
  template.content.querySelectorAll('*').forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(document.createTextNode(element.textContent || ''));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      const isFontAttribute = element.tagName === 'FONT' && ['color', 'size'].includes(attribute.name);
      const isSafeStyle = attribute.name === 'style'
        && /^(?:\s*(?:color|font-size|font-weight)\s*:\s*[^;]+;?\s*)+$/i.test(attribute.value);
      if (!isFontAttribute && !isSafeStyle) element.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
};

const getRichBriefContent = (brief: Brief, versionContent?: string) => {
  const content = brief.briefContent || versionContent || '';
  if (!content.trim()) return buildStructuredBriefHtml(brief);
  try {
    JSON.parse(content);
    return buildStructuredBriefHtml(brief);
  } catch {
    const html = /<\/?[a-z][\s\S]*>/i.test(content)
      ? content
      : `<p>${escapeHtml(content)}</p>`;
    return sanitizeBriefHtml(html);
  }
};

const BriefDialog = ({
  projectId,
  initialBriefId,
  onNewProductDraft,
  onApplyBrief,
  onBack,
  refreshKey,
  onClose,
}: BriefDialogProps) => {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [isBriefListLoading, setIsBriefListLoading] = useState(true);
  const [selectedBriefId, setSelectedBriefId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<BriefManagerView>(initialBriefId ? 'detail' : 'folders');
  const [sideTab, setSideTab] = useState<BriefSideTab>('info');
  const [editRequests, setEditRequests] = useState<BriefEditRequest[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<Brief>>({});
  const [editRichValues, setEditRichValues] = useState<BriefRichValues>(emptyBriefRichValues);
  const [saving, setSaving] = useState(false);
  const [shareLinks, setShareLinks] = useState<Partial<Record<BriefSharePermission, BriefShareResult>>>({});
  const [selectedSharePermission, setSelectedSharePermission] = useState<BriefSharePermission>('read');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsBriefListLoading(true);
    setBriefs([]);
    setSelectedBriefId('');
    setSelectedVersionId('');

    if (!initialBriefId && !projectId) {
      setIsBriefListLoading(false);
      return () => { cancelled = true; };
    }

    const request = initialBriefId
      ? briefApi.getById(initialBriefId).then((brief) => [brief])
      : briefApi.getList(projectId as string);

    request.then((list) => {
      if (cancelled) return;
      setBriefs(list);
      const target = initialBriefId
        ? list.find((brief) => brief.id === initialBriefId)
        : list[0];
      setSelectedBriefId(target?.id || '');
      setSelectedVersionId(target?.versions?.[0]?.id || '');
    }).catch(() => {
      if (!cancelled) {
        message.warning(initialBriefId ? 'Brief 详情加载失败' : 'Brief 列表加载失败');
      }
    }).finally(() => {
      if (!cancelled) setIsBriefListLoading(false);
    });

    return () => { cancelled = true; };
  }, [initialBriefId, projectId, refreshKey]);

  useEffect(() => {
    if (initialBriefId) setView('detail');
  }, [initialBriefId]);

  const currentBrief = useMemo(
    () => briefs.find((brief) => brief.id === selectedBriefId) || null,
    [briefs, selectedBriefId],
  );

  const currentVersion = useMemo(
    () => currentBrief?.versions?.find((version) => version.id === selectedVersionId)
      || currentBrief?.versions?.[0]
      || null,
    [currentBrief, selectedVersionId],
  );
  const displayBrief = useMemo(
    () => currentBrief ? briefFromVersionContent(currentBrief, currentVersion?.content) : null,
    [currentBrief, currentVersion],
  );
  const currentAccessPermission = currentBrief?.accessPermission || 'manage';
  const canEditCurrentBrief = currentAccessPermission === 'edit' || currentAccessPermission === 'manage';
  const canManageCurrentBrief = currentAccessPermission === 'manage';

  const visibleBriefs = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return briefs.filter((brief) => !keyword || [
      brief.name,
      brief.productName,
      brief.productModel,
    ].some((value) => (value || '').toLowerCase().includes(keyword)));
  }, [briefs, searchTerm]);

  const loadEditRequests = useCallback((briefId: string) => {
    briefApi.editRequests(briefId).then(setEditRequests).catch(() => setEditRequests([]));
  }, []);

  useEffect(() => {
    if (currentBrief?.id) loadEditRequests(currentBrief.id);
    else setEditRequests([]);
  }, [currentBrief?.id, loadEditRequests]);

  const loadShareLinks = useCallback((briefId: string) => {
    briefApi.shareLinks(briefId).then((links) => {
      setShareLinks(links.reduce<Partial<Record<BriefSharePermission, BriefShareResult>>>((result, link) => {
        result[link.permission] = link;
        return result;
      }, {}));
    }).catch(() => setShareLinks({}));
  }, []);

  useEffect(() => {
    if (currentBrief?.id && canManageCurrentBrief) loadShareLinks(currentBrief.id);
    else setShareLinks({});
  }, [currentBrief?.id, canManageCurrentBrief, loadShareLinks]);

  const openBrief = (brief: Brief) => {
    setSelectedBriefId(brief.id);
    setSelectedVersionId(brief.versions?.[0]?.id || '');
    setSideTab('info');
    setSelectedSharePermission('read');
    setIsEditing(false);
    setView('detail');
  };

  const selectVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    setIsEditing(false);
  };

  const handleAddBrief = () => {
    onNewProductDraft?.();
    message.success('已进入新建 Brief，请填写产品信息');
    onClose();
  };

  const handleApplyBrief = () => {
    if (!displayBrief) return;
    onApplyBrief?.(displayBrief);
    message.success('Brief 内容已重新填充到当前项目');
    onClose();
  };

  const copyToClipboard = async (text: string) => {
    if (!navigator.clipboard) throw new Error('当前浏览器不支持复制');
    await navigator.clipboard.writeText(text);
  };

  const buildShareUrl = (result: BriefShareResult) => {
    return new URL(result.shareUrl, window.location.origin).toString();
  };

  const handleShareBrief = async (permission: BriefSharePermission) => {
    if (!currentBrief) return;
    setSelectedSharePermission(permission);
    setSharing(true);
    try {
      const result = shareLinks[permission] || await briefApi.enableShare(currentBrief.id, permission);
      await copyToClipboard(buildShareUrl(result));
      setShareLinks((current) => ({ ...current, [permission]: result }));
      setBriefs((current) => current.map((brief) => brief.id === currentBrief.id ? {
        ...brief,
        shareEnabled: 1,
      } : brief));
      message.success(`${sharePermissionOptions.find((option) => option.value === permission)?.label || ''}链接已复制`);
    } catch {
      message.error('分享链接生成失败');
    } finally {
      setSharing(false);
    }
  };

  const openSharePanel = () => {
    setSideTab('collaboration');
  };

  const handleAddVersion = async () => {
    if (!currentBrief) return;
    const nextLabel = getNextVersionLabel(currentBrief);
    try {
      const saved = await briefApi.update(currentBrief.id, {
        name: currentBrief.name,
        productName: currentBrief.productName || currentBrief.name,
        projectId: projectId || currentBrief.projectId,
        briefContent: currentBrief.briefContent || '',
        forceNewVersion: true,
      });
      setBriefs((current) => current.map((brief) => brief.id === saved.id ? saved : brief));
      setSelectedVersionId(saved.versions?.[0]?.id || '');
      message.success(`已新增版本 ${nextLabel}`);
    } catch {
      message.error('新增版本失败');
    }
  };

  const startEditing = () => {
    if (!displayBrief) return;
    setEditDraft({
      name: displayBrief.name,
      productName: displayBrief.productName,
      productModel: displayBrief.productModel,
      price: displayBrief.price,
      slogan: displayBrief.slogan,
      primarySellingPoint: displayBrief.primarySellingPoint,
      targetAudience: displayBrief.targetAudience,
      targetScene: displayBrief.targetScene,
      otherRequirements: displayBrief.otherRequirements,
      briefContent: displayBrief.briefContent,
    });
    setEditRichValues(richValuesFromBrief(displayBrief));
    setIsEditing(true);
  };

  const updateEditRichField = (key: BriefRichFieldKey, html: string, plainText: string) => {
    const briefFieldByRichKey: Record<BriefRichFieldKey, keyof Brief> = {
      audience: 'targetAudience',
      features: 'targetScene',
      mainPoints: 'primarySellingPoint',
      secondaryPoints: 'otherRequirements',
    };
    setEditRichValues((current) => ({ ...current, [key]: html }));
    setEditDraft((current) => ({ ...current, [briefFieldByRichKey[key]]: plainText }));
  };

  const saveEditing = async () => {
    if (!currentBrief) return;
    const nextLabel = getNextVersionLabel(currentBrief);
    setSaving(true);
    try {
      const saved = await briefApi.update(currentBrief.id, {
        ...editDraft,
        richContent: JSON.stringify(editRichValues),
        name: editDraft.productName || editDraft.name || currentBrief.name,
        projectId: currentBrief.projectId,
        forceNewVersion: true,
      });
      setBriefs((current) => current.map((brief) => brief.id === saved.id ? saved : brief));
      setSelectedVersionId(saved.versions?.[0]?.id || '');
      setIsEditing(false);
      message.success(`Brief 已保存并新增版本 ${nextLabel}`);
    } catch {
      message.error('Brief 保存失败，请确认是否有编辑权限');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!displayBrief) return;
    const rows = [
      ['产品名称', displayBrief.productName || displayBrief.name],
      ['产品型号', displayBrief.productModel],
      ['价格', displayBrief.price],
      ['Slogan', displayBrief.slogan],
      ['核心卖点', displayBrief.primarySellingPoint],
      ['目标人群', displayBrief.targetAudience],
      ['使用场景', displayBrief.targetScene],
      ['其他要求', displayBrief.otherRequirements],
    ];
    const richBriefHtml = getRichBriefContent(displayBrief, currentVersion?.content);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:"Microsoft YaHei",sans-serif;padding:36px;color:#222}h1{font-size:24px}h2{margin-top:28px;font-size:18px}
      table{width:100%;border-collapse:collapse;margin-top:24px}td{border:1px solid #bbb;padding:10px;vertical-align:top}
      td:first-child{width:120px;font-weight:700;background:#f3f3f3}
    </style></head><body><h1>${escapeHtml(displayBrief.productName || displayBrief.name)}</h1>
      <p>${escapeHtml(currentVersion?.label || '')} · ${escapeHtml(formatDateTime(displayBrief.updatedAt))}</p>
      <table>${rows.map(([label, value]) => `<tr><td>${label}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</table>
      <h2>完整 Brief</h2><div>${richBriefHtml}</div>
    </body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${displayBrief.productName || displayBrief.name || 'Brief'}.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    message.success('Brief Word 文档已下载');
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
    <div className="modal-backdrop brief-studio-backdrop" role="dialog" aria-modal="true" aria-labelledby="brief-title">
      <section className={`modal-card brief-studio-modal ${view === 'detail' ? 'is-detail' : 'is-folders'}`}>
        {view === 'folders' ? (
          <>
            <header className="brief-folder-head">
              <div>
                <span>Brief 管理</span>
                <h2 id="brief-title">当前项目 Brief 文档</h2>
              </div>
              <div className="brief-folder-head-actions">
                <button type="button" className="brief-folder-create" onClick={handleAddBrief}>
                  <PlusOutlined />
                  <span>新建 Brief</span>
                </button>
                <button type="button" aria-label="关闭" className="brief-folder-close" onClick={onClose}><CloseOutlined /></button>
              </div>
            </header>

            <div className="brief-folder-toolbar">
              <label>
                <FileWordOutlined />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="搜索 Brief 文档名称或产品型号" />
              </label>
              <span>{isBriefListLoading ? '正在加载当前项目 Brief…' : `共 ${visibleBriefs.length} 份文档`}</span>
            </div>

            <div className="brief-folder-grid">
              {isBriefListLoading ? (
                <div className="brief-folder-empty brief-folder-loading">
                  <LoadingOutlined spin />
                  <strong>正在加载当前项目 Brief</strong>
                  <span>请稍候，不会显示其他项目的文档。</span>
                </div>
              ) : visibleBriefs.map((brief) => (
                <button type="button" className="brief-folder-card" key={brief.id} onClick={() => openBrief(brief)}>
                  <span className="brief-folder-shape"><FolderOpenOutlined /></span>
                  <span className="brief-folder-copy">
                    <strong>{brief.productName || brief.name || '未命名 Brief'}</strong>
                    <small>{brief.productModel || 'Word Brief 文档'}</small>
                    <em>{brief.versions?.[0]?.label || 'v1.0'} · {formatDateTime(brief.versions?.[0]?.createdAt || brief.updatedAt)}</em>
                  </span>
                  {brief.shareEnabled === 1 ? <span className="brief-folder-shared"><TeamOutlined />已分享</span> : null}
                </button>
              ))}
              {!isBriefListLoading && !visibleBriefs.length ? (
                <div className="brief-folder-empty">
                  <FileWordOutlined />
                  <strong>还没有 Brief 文档</strong>
                  <span>{projectId ? '当前项目还没有 Brief，可新建或导入。' : '请先创建或打开一个项目。'}</span>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <header className="brief-studio-topbar">
              <div className="brief-studio-title">
                <button type="button" aria-label={onBack ? '返回资产管理' : '返回 Brief 文件夹'} onClick={() => onBack ? onBack() : setView('folders')}><LeftOutlined /></button>
                <FileWordOutlined />
                <div>
                  <h2 id="brief-title">{displayBrief?.productName || displayBrief?.name || 'Brief'}</h2>
                  <span>Brief 文档</span>
                </div>
                <select value={selectedVersionId} onChange={(event) => selectVersion(event.target.value)}>
                  {currentBrief?.versions?.length ? currentBrief.versions.map((version) => (
                    <option key={version.id} value={version.id}>{version.label}</option>
                  )) : <option value="">v1.0</option>}
                </select>
              </div>
              <div className="brief-studio-actions">
                <button type="button" className="brief-apply-action" onClick={handleApplyBrief}><ImportOutlined />填充到项目</button>
                {canManageCurrentBrief ? (
                  <button type="button" className={sideTab === 'collaboration' ? 'active' : ''} onClick={openSharePanel}><ShareAltOutlined />分享</button>
                ) : null}
                <button type="button" onClick={handleDownload}><DownloadOutlined />下载</button>
                {canEditCurrentBrief ? (
                  <button type="button" className={isEditing ? 'active' : ''} onClick={isEditing ? saveEditing : startEditing} disabled={saving}>
                    {isEditing ? <SaveOutlined /> : <EditOutlined />}{saving ? '保存中' : isEditing ? '保存' : '编辑'}
                  </button>
                ) : null}
                <button type="button" aria-label="关闭" className="brief-studio-close" onClick={onClose}><CloseOutlined /></button>
              </div>
            </header>

            <div className="brief-studio-body">
              <main className="brief-document-stage">
                <article className={`brief-document-sheet ${isEditing ? 'is-editing' : ''}`}>
                  <header>
                    <span>PRODUCT BRIEF</span>
                    {isEditing ? (
                      <input
                        className="brief-document-title-input"
                        aria-label="产品名称"
                        value={String(editDraft.productName || '')}
                        placeholder="请输入产品名称"
                        onChange={(event) => setEditDraft((current) => ({
                          ...current,
                          productName: event.target.value,
                        }))}
                      />
                    ) : (
                      <h1>{displayBrief?.productName || displayBrief?.name || '未命名 Brief'}</h1>
                    )}
                    <p>{isEditing ? editDraft.slogan || '产品 Brief 信息' : displayBrief?.slogan || '产品 Brief 信息'}</p>
                  </header>

                  {isBriefListLoading ? (
                    <div className="brief-folder-empty">
                      <LoadingOutlined spin />
                      <strong>正在加载 Brief 详情</strong>
                      <span>正在读取内容和版本记录，请稍候。</span>
                    </div>
                  ) : displayBrief ? (
                    isEditing ? (
                      <div className="brief-selling-edit-layout">
                        <section className="brief-selling-edit-overview">
                          <div className="brief-selling-edit-small-fields">
                            <label className="brief-selling-edit-plain-field">
                              <span>产品价格</span>
                              <input
                                value={String(editDraft.price || '')}
                                onChange={(event) => setEditDraft((current) => ({
                                  ...current,
                                  price: event.target.value,
                                }))}
                              />
                            </label>
                            <label className="brief-selling-edit-plain-field">
                              <span>产品 slogan</span>
                              <input
                                value={String(editDraft.slogan || '')}
                                onChange={(event) => setEditDraft((current) => ({
                                  ...current,
                                  slogan: event.target.value,
                                }))}
                              />
                            </label>
                          </div>
                          <RichTextField
                            className="brief-selling-edit-rich brief-selling-edit-audience"
                            label="目标人群"
                            value={editRichValues.audience}
                            placeholder="请输入目标人群"
                            maxLength={500}
                            onChange={(html, plainText) => updateEditRichField('audience', html, plainText)}
                          />
                        </section>

                        <section className="brief-selling-edit-grid">
                          <RichTextField
                            className="brief-selling-edit-rich"
                            label="产品特色卖点"
                            value={editRichValues.features}
                            placeholder="请输入产品特色卖点"
                            maxLength={10000}
                            onChange={(html, plainText) => updateEditRichField('features', html, plainText)}
                          />
                          <RichTextField
                            className="brief-selling-edit-rich"
                            label="产品主要卖点"
                            value={editRichValues.mainPoints}
                            placeholder="请输入产品主要卖点"
                            maxLength={10000}
                            onChange={(html, plainText) => updateEditRichField('mainPoints', html, plainText)}
                          />
                          <RichTextField
                            className="brief-selling-edit-rich"
                            label="产品次要卖点"
                            value={editRichValues.secondaryPoints}
                            placeholder="请输入产品次要卖点"
                            maxLength={10000}
                            onChange={(html, plainText) => updateEditRichField('secondaryPoints', html, plainText)}
                          />
                        </section>
                      </div>
                    ) : (
                      <BriefContentLayout brief={displayBrief} className="brief-document-content-layout" />
                    )
                  ) : <div className="brief-folder-empty">Brief 不存在或已被删除。</div>}
                </article>
              </main>

              <aside className="brief-studio-sidebar">
                <div className="brief-side-tabs">
                  <button type="button" className={sideTab === 'info' ? 'active' : ''} onClick={() => setSideTab('info')}>文件信息</button>
                  {canManageCurrentBrief ? (
                    <button type="button" className={sideTab === 'collaboration' ? 'active' : ''} onClick={() => setSideTab('collaboration')}>
                      分享{editRequests.length ? ` ${editRequests.length}` : ''}
                    </button>
                  ) : null}
                </div>

                {sideTab === 'info' ? (
                  <div className="brief-side-content">
                    <section className="brief-side-section">
                      <h3>文档信息</h3>
                      <dl>
                        <div><dt>文件名</dt><dd>{displayBrief?.productName || displayBrief?.name}</dd></div>
                        <div><dt>当前版本</dt><dd>{currentVersion?.label || 'v1.0'}</dd></div>
                        <div><dt>更新时间</dt><dd>{formatDateTime(currentVersion?.createdAt || currentBrief?.updatedAt)}</dd></div>
                        <div>
                          <dt>分享状态</dt>
                          <dd className={currentBrief?.shareEnabled === 1 ? 'shared' : ''}>
                            {currentBrief?.shareEnabled === 1 ? `已分享 · ${Object.keys(shareLinks).length} 条权限链接` : '仅自己可见'}
                          </dd>
                        </div>
                      </dl>
                    </section>
                    <section className="brief-side-section">
                      <div className="brief-side-section-head">
                        <h3>版本记录</h3>
                        {canEditCurrentBrief ? <button type="button" onClick={handleAddVersion}><PlusCircleOutlined />新增</button> : null}
                      </div>
                      <div className="brief-side-version-list">
                        {currentBrief?.versions?.map((version) => (
                          <button
                            type="button"
                            className={version.id === selectedVersionId ? 'active' : ''}
                            key={version.id}
                            onClick={() => selectVersion(version.id)}
                          >
                            <span>{version.label}</span>
                            <small>{formatDateTime(version.createdAt)}</small>
                            {version.id === selectedVersionId ? <CheckOutlined /> : null}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="brief-side-content">
                    <section className="brief-side-section brief-share-settings">
                      <div>
                        <h3>分享权限</h3>
                        <span>{Object.keys(shareLinks).length ? `已生成 ${Object.keys(shareLinks).length} 条链接` : '按权限分别生成'}</span>
                      </div>
                      <p className="brief-side-hint">
                        <LinkOutlined />
                        对方登录并打开链接后，这份 Brief 会自动出现在对方的“我的 Brief”，后续始终同步最新内容。
                      </p>
                      <div className="brief-share-permissions" role="radiogroup" aria-label="分享权限链接">
                        {sharePermissionOptions.map((option) => (
                          <article
                            className={selectedSharePermission === option.value ? 'active' : ''}
                            key={option.value}
                            role="radio"
                            aria-checked={selectedSharePermission === option.value}
                            tabIndex={0}
                            onClick={() => setSelectedSharePermission(option.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedSharePermission(option.value);
                              }
                            }}
                          >
                            <div>
                              <span><i />{option.label}</span>
                              <small>{option.description}</small>
                              {shareLinks[option.value] ? <code>{buildShareUrl(shareLinks[option.value]!)}</code> : null}
                            </div>
                            <button type="button" onClick={() => handleShareBrief(option.value)} disabled={sharing}>
                              <ShareAltOutlined />{shareLinks[option.value] ? '复制链接' : '生成链接'}
                            </button>
                          </article>
                        ))}
                      </div>
                    </section>
                    <section className="brief-side-section brief-side-requests">
                      <h3>编辑申请</h3>
                      {editRequests.length ? editRequests.map((request) => (
                        <article key={request.id}>
                          <strong>用户 {request.requesterId}</strong>
                          <p>{request.requestMessage || '申请编辑这份 Brief'}</p>
                          <span>{request.status}</span>
                          {request.status === 'pending' ? (
                            <div>
                              <button type="button" onClick={() => handleApproveRequest(request.id)}>同意</button>
                              <button type="button" onClick={() => handleRejectRequest(request.id)}>拒绝</button>
                            </div>
                          ) : null}
                        </article>
                      )) : <p className="brief-side-empty">暂无编辑申请</p>}
                    </section>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default BriefDialog;
