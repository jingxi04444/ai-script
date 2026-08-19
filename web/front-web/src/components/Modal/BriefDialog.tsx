import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  FileWordOutlined,
  FolderOpenOutlined,
  ImportOutlined,
  LeftOutlined,
  LinkOutlined,
  LoadingOutlined,
  MoreOutlined,
  PlusOutlined,
  PlusCircleOutlined,
  SaveOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { Dropdown, message, Modal } from 'antd';
import type { MenuProps } from 'antd';
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
  const [shareLinksBriefId, setShareLinksBriefId] = useState('');
  const [selectedSharePermission, setSelectedSharePermission] = useState<BriefSharePermission>('read');
  const [sharing, setSharing] = useState(false);
  const [isBatchShareMode, setIsBatchShareMode] = useState(false);
  const [isBatchDeleteMode, setIsBatchDeleteMode] = useState(false);
  const [selectedBatchBriefIds, setSelectedBatchBriefIds] = useState<string[]>([]);
  const [batchSharePermission, setBatchSharePermission] = useState<BriefSharePermission>('read');
  const selectedBriefIdRef = useRef('');
  const editRequestsRequestRef = useRef(0);
  const shareLinksRequestRef = useRef(0);

  useEffect(() => {
    selectedBriefIdRef.current = selectedBriefId;
  }, [selectedBriefId]);

  useEffect(() => {
    let cancelled = false;
    setIsBriefListLoading(true);
    setBriefs([]);
    setSelectedBriefId('');
    setSelectedVersionId('');
    setEditRequests([]);
    setShareLinks({});
    setShareLinksBriefId('');
    editRequestsRequestRef.current += 1;
    shareLinksRequestRef.current += 1;
    setSelectedBatchBriefIds([]);
    setIsBatchShareMode(false);
    setIsBatchDeleteMode(false);

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
    const requestId = ++editRequestsRequestRef.current;
    setEditRequests([]);
    briefApi.editRequests(briefId).then((requests) => {
      if (editRequestsRequestRef.current === requestId && selectedBriefIdRef.current === briefId) {
        setEditRequests(requests);
      }
    }).catch(() => {
      if (editRequestsRequestRef.current === requestId && selectedBriefIdRef.current === briefId) {
        setEditRequests([]);
      }
    });
  }, []);

  useEffect(() => {
    if (currentBrief?.id) loadEditRequests(currentBrief.id);
    else {
      editRequestsRequestRef.current += 1;
      setEditRequests([]);
    }
  }, [currentBrief?.id, loadEditRequests]);

  const loadShareLinks = useCallback((briefId: string) => {
    const requestId = ++shareLinksRequestRef.current;
    setShareLinks({});
    setShareLinksBriefId('');
    briefApi.shareLinks(briefId).then((links) => {
      if (shareLinksRequestRef.current !== requestId || selectedBriefIdRef.current !== briefId) return;
      setShareLinks(links.reduce<Partial<Record<BriefSharePermission, BriefShareResult>>>((result, link) => {
        result[link.permission] = link;
        return result;
      }, {}));
      setShareLinksBriefId(briefId);
    }).catch(() => {
      if (shareLinksRequestRef.current === requestId && selectedBriefIdRef.current === briefId) {
        setShareLinks({});
        setShareLinksBriefId(briefId);
      }
    });
  }, []);

  useEffect(() => {
    if (currentBrief?.id && canManageCurrentBrief) loadShareLinks(currentBrief.id);
    else {
      shareLinksRequestRef.current += 1;
      setShareLinks({});
      setShareLinksBriefId('');
    }
  }, [currentBrief?.id, canManageCurrentBrief, loadShareLinks]);

  const openBrief = (brief: Brief, targetSideTab: BriefSideTab = 'info') => {
    editRequestsRequestRef.current += 1;
    shareLinksRequestRef.current += 1;
    setEditRequests([]);
    setShareLinks({});
    setShareLinksBriefId('');
    setSelectedBriefId(brief.id);
    setSelectedVersionId(brief.versions?.[0]?.id || '');
    setSideTab(targetSideTab);
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
    const briefId = currentBrief.id;
    setSelectedSharePermission(permission);
    setSharing(true);
    try {
      const existingLink = shareLinksBriefId === briefId ? shareLinks[permission] : undefined;
      const result = existingLink || await briefApi.enableShare(briefId, permission);
      await copyToClipboard(buildShareUrl(result));
      if (selectedBriefIdRef.current === briefId) {
        setShareLinks((current) => ({ ...current, [permission]: result }));
        setShareLinksBriefId(briefId);
      }
      setBriefs((current) => current.map((brief) => brief.id === briefId ? {
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

  const toggleBatchBrief = (briefId: string) => {
    setSelectedBatchBriefIds((current) => current.includes(briefId)
      ? current.filter((id) => id !== briefId)
      : [...current, briefId]);
  };

  const handleBatchShare = async () => {
    const selectedBriefs = briefs.filter((brief) => selectedBatchBriefIds.includes(brief.id));
    const manageableBriefs = selectedBriefs.filter((brief) => (brief.accessPermission || 'manage') === 'manage');
    if (!manageableBriefs.length) {
      message.warning('\u8bf7\u5148\u9009\u62e9\u81ea\u5df1\u53ef\u7ba1\u7406\u7684 Brief');
      return;
    }
    setSharing(true);
    try {
      const sharePack = await briefApi.createSharePack(manageableBriefs.map((brief) => brief.id), batchSharePermission);
      await copyToClipboard(new URL(sharePack.shareUrl, window.location.origin).toString());
      const sharedIds = new Set(manageableBriefs.map((brief) => brief.id));
      setBriefs((current) => current.map((brief) => sharedIds.has(brief.id) ? { ...brief, shareEnabled: 1 } : brief));
      setSelectedBatchBriefIds([]);
      setIsBatchShareMode(false);
      message.success(`\u5df2\u751f\u6210 Brief \u5206\u4eab\u5305\u94fe\u63a5\u5e76\u590d\u5236`);
    } catch {
      message.error('\u6279\u91cf\u5206\u4eab\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
    } finally {
      setSharing(false);
    }
  };

  const handleBatchDelete = (targetBriefs = briefs.filter((brief) => selectedBatchBriefIds.includes(brief.id))) => {
    const ownedBriefs = targetBriefs.filter((brief) => brief.ownedByCurrentUser === true);
    if (!ownedBriefs.length) {
      message.warning('请选择自己创建的 Brief');
      return;
    }
    Modal.confirm({
      title: ownedBriefs.length === 1 ? '将这份 Brief 移入回收站？' : `将选中的 ${ownedBriefs.length} 份 Brief 移入回收站？`,
      content: 'Brief 会保留 7 天，版本、卖点和协作信息都可恢复；历史脚本仍保留生成时的 Brief 快照。',
      okText: ownedBriefs.length === 1 ? '移入回收站' : '批量移入回收站',
      cancelText: '取消',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        const deletedIds = new Set(ownedBriefs.map((brief) => brief.id));
        await Promise.all(ownedBriefs.map((brief) => briefApi.delete(brief.id)));
        setBriefs((current) => current.filter((brief) => !deletedIds.has(brief.id)));
        setSelectedBatchBriefIds([]);
        setIsBatchDeleteMode(false);
        if (currentBrief && deletedIds.has(currentBrief.id)) {
          setSelectedBriefId('');
          setView('folders');
        }
        message.success(`已将 ${ownedBriefs.length} 份 Brief 移入回收站`);
      },
    });
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

  const handleDownloadBrief = async (brief: Brief, version = brief.versions?.[0]) => {
    const downloadableBrief = briefFromVersionContent(brief, version?.content);
    try {
      const blob = await briefApi.downloadDocx(brief.id, version?.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const title = downloadableBrief.productName || downloadableBrief.name || '产品';
      const safeTitle = title.replace(/[\\/:*?"<>|\r\n]+/g, '-').trim() || '产品';
      link.href = url;
      link.download = `${safeTitle}-Brief.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      message.success('AI 通用 DOCX 已下载，可直接上传到大模型');
    } catch {
      message.error('Brief 文档下载失败，请稍后重试');
    }
  };

  const handleDownload = () => {
    if (!currentBrief) return;
    void handleDownloadBrief(currentBrief, currentVersion || undefined);
  };

  const getBriefCardMenuItems = (brief: Brief): MenuProps['items'] => [
    ...((brief.accessPermission || 'manage') === 'manage' ? [{
      key: 'share',
      icon: <ShareAltOutlined />,
      label: '分享',
    }] : []),
    {
      key: 'download',
      icon: <DownloadOutlined />,
      label: '下载 AI 通用 DOCX',
    },
    ...(brief.ownedByCurrentUser === true ? [
      { type: 'divider' as const },
      {
        key: 'delete',
        danger: true,
        icon: <DeleteOutlined />,
        label: '删除',
      },
    ] : []),
  ];

  const handleBriefCardMenuClick = (brief: Brief, key: string) => {
    if (key === 'share') {
      openBrief(brief, 'collaboration');
      return;
    }
    if (key === 'download') {
      void handleDownloadBrief(brief);
      return;
    }
    if (key === 'delete') handleBatchDelete([brief]);
  };

  const handleDeleteBrief = () => {
    if (!currentBrief || currentBrief.ownedByCurrentUser !== true) return;
    Modal.confirm({
      title: '将这份 Brief 移入回收站？',
      content: '该 Brief 会保留 7 天，版本、卖点和协作信息都可以恢复；已经生成的脚本仍保留首次生成时的 Brief 快照。',
      okText: '移入回收站',
      cancelText: '取消',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        await briefApi.delete(currentBrief.id);
        setBriefs((current) => current.filter((brief) => brief.id !== currentBrief.id));
        setSelectedBriefId('');
        setView('folders');
        message.success('Brief 已移入回收站');
      },
    });
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
                <button
                  type="button"
                  className={`brief-folder-batch ${isBatchShareMode ? 'active' : ''}`}
                  onClick={() => {
                    setIsBatchShareMode((current) => !current);
                    setIsBatchDeleteMode(false);
                    setSelectedBatchBriefIds([]);
                  }}
                >
                  <ShareAltOutlined />{'\u6279\u91cf\u5206\u4eab'}
                </button>
                <button
                  type="button"
                  className={`brief-folder-batch brief-folder-batch-delete ${isBatchDeleteMode ? 'active' : ''}`}
                  onClick={() => {
                    setIsBatchDeleteMode((current) => !current);
                    setIsBatchShareMode(false);
                    setSelectedBatchBriefIds([]);
                  }}
                >
                  <DeleteOutlined />批量删除
                </button>
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
              {(isBatchShareMode || isBatchDeleteMode) ? (
                <div className="brief-batch-share-actions">
                  <button type="button" onClick={() => setSelectedBatchBriefIds(
                    selectedBatchBriefIds.length === (isBatchDeleteMode ? visibleBriefs.filter((brief) => brief.ownedByCurrentUser === true) : visibleBriefs).length
                      ? []
                      : (isBatchDeleteMode ? visibleBriefs.filter((brief) => brief.ownedByCurrentUser === true) : visibleBriefs).map((brief) => brief.id),
                  )}>
                    {selectedBatchBriefIds.length === (isBatchDeleteMode ? visibleBriefs.filter((brief) => brief.ownedByCurrentUser === true) : visibleBriefs).length ? '\u53d6\u6d88\u5168\u9009' : '\u5168\u9009'}
                  </button>
                  {isBatchShareMode ? <select value={batchSharePermission} onChange={(event) => setBatchSharePermission(event.target.value as BriefSharePermission)}>
                    {sharePermissionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select> : null}
                  {isBatchShareMode ? <button type="button" className="primary" onClick={handleBatchShare} disabled={sharing || !selectedBatchBriefIds.length}>
                    <ShareAltOutlined />{'\u5171\u4eab'} {selectedBatchBriefIds.length || ''} {'\u4efd Brief'}
                  </button> : null}
                  {isBatchDeleteMode ? <button type="button" className="danger" onClick={() => handleBatchDelete()} disabled={!selectedBatchBriefIds.length}>
                    <DeleteOutlined />删除 {selectedBatchBriefIds.length || ''} 份 Brief
                  </button> : null}
                </div>
              ) : null}
              <span>{isBriefListLoading ? '正在加载当前项目 Brief…' : `共 ${visibleBriefs.length} 份文档`}</span>
            </div>

            <div className="brief-folder-grid">
              {isBriefListLoading ? (
                <div className="brief-folder-empty brief-folder-loading">
                  <LoadingOutlined spin />
                  <strong>正在加载当前项目 Brief</strong>
                  <span>请稍候，不会显示其他项目的文档。</span>
                </div>
              ) : visibleBriefs.map((brief) => {
                const selectionMode = isBatchShareMode || isBatchDeleteMode;
                const selected = selectedBatchBriefIds.includes(brief.id);
                return (
                <article className={`brief-folder-card ${selectionMode && selected ? 'is-selected' : ''}`} key={brief.id}>
                  <button
                    type="button"
                    className="brief-folder-card-main"
                    onClick={() => selectionMode ? toggleBatchBrief(brief.id) : openBrief(brief)}
                    aria-pressed={selectionMode ? selected : undefined}
                  >
                    <span className="brief-folder-shape"><FolderOpenOutlined /></span>
                    <span className="brief-folder-copy">
                      <strong>{brief.productName || brief.name || '未命名 Brief'}</strong>
                      <small>{brief.productModel || 'Word Brief 文档'}</small>
                      <em>{brief.versions?.[0]?.label || 'v1.0'} · {formatDateTime(brief.versions?.[0]?.createdAt || brief.updatedAt)}</em>
                    </span>
                    {selectionMode ? <span className={`brief-folder-check ${selected ? 'is-checked' : ''}`}>{selected ? <CheckOutlined /> : null}</span> : null}
                  </button>
                  {!selectionMode ? (
                    <Dropdown
                      trigger={['click']}
                      placement="bottomRight"
                      overlayClassName="brief-folder-more-dropdown"
                      menu={{
                        items: getBriefCardMenuItems(brief),
                        onClick: ({ key, domEvent }) => {
                          domEvent.stopPropagation();
                          handleBriefCardMenuClick(brief, key);
                        },
                      }}
                    >
                      <button
                        type="button"
                        className="brief-folder-more"
                        aria-label={`更多操作：${brief.productName || brief.name || 'Brief'}`}
                        aria-haspopup="menu"
                      >
                        <MoreOutlined />
                      </button>
                    </Dropdown>
                  ) : null}
                </article>
                );
              })}
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
                <button type="button" onClick={handleDownload}><DownloadOutlined />下载 AI 通用 DOCX</button>
                {currentBrief?.ownedByCurrentUser === true ? <button type="button" className="brief-delete-action" onClick={handleDeleteBrief}><DeleteOutlined />删除</button> : null}
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
