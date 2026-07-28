import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { message, Select } from 'antd';
import {
  CloseOutlined,
  EditOutlined,
  FolderAddOutlined,
  LinkOutlined,
  RollbackOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { briefApi } from '../../api/brief';
import { projectApi } from '../../api/project';
import BriefContentLayout from '../../components/Brief/BriefContentLayout';
import RichTextField from '../Workspace/SellingPoints/RichTextField';
import type { Brief } from '../../types/brief';
import type { Project } from '../../types/project';
import { useAuthStore } from '../../stores/authStore';
import './brief-share-page.css';

type BriefRichFieldKey = 'audience' | 'features' | 'mainPoints' | 'secondaryPoints';
type BriefRichValues = Record<BriefRichFieldKey, string>;

const emptyRichValues: BriefRichValues = {
  audience: '',
  features: '',
  mainPoints: '',
  secondaryPoints: '',
};

const parseJsonObject = (content?: string): Record<string, string> => {
  if (!content) return {};
  try {
    const parsed = JSON.parse(content) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
};

const escapeHtml = (value?: string) => (value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\n/g, '<br />');

const richValuesFromBrief = (brief: Brief): BriefRichValues => {
  const stored = parseJsonObject(brief.richContent);
  return {
    audience: stored.audience || escapeHtml(brief.targetAudience),
    features: stored.features || escapeHtml(brief.targetScene),
    mainPoints: stored.mainPoints || escapeHtml(brief.primarySellingPoint),
    secondaryPoints: stored.secondaryPoints || escapeHtml(brief.otherRequirements),
  };
};

const briefFromVersionContent = (brief: Brief, versionContent?: string): Brief => {
  const snapshot = parseJsonObject(versionContent);
  if (!Object.keys(snapshot).length) return brief;
  const embeddedValues = parseJsonObject(snapshot.briefContent);
  return {
    ...brief,
    name: snapshot.productName || snapshot.briefName || brief.name,
    productName: snapshot.productName || snapshot.briefName || brief.productName,
    price: snapshot.price || embeddedValues.price || brief.price,
    slogan: snapshot.slogan || embeddedValues.slogan || brief.slogan,
    targetAudience: snapshot.targetAudience || embeddedValues.audience || brief.targetAudience,
    targetScene: snapshot.targetScene || embeddedValues.features || brief.targetScene,
    primarySellingPoint: snapshot.primarySellingPoint || embeddedValues.mainPoints || brief.primarySellingPoint,
    otherRequirements: snapshot.otherRequirements || embeddedValues.secondaryPoints || brief.otherRequirements,
    briefContent: snapshot.briefContent || brief.briefContent,
    richContent: snapshot.richContent || brief.richContent,
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};
const BriefSharePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [editValues, setEditValues] = useState<Partial<Brief>>({});
  const [editRichValues, setEditRichValues] = useState<BriefRichValues>(emptyRichValues);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [linkingProject, setLinkingProject] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    briefApi.getByShareToken(token)
      .then(setBrief)
      .catch((error) => {
        const errorMessage = getErrorMessage(error, '分享链接不存在或已失效');
        setLoadError(errorMessage);
        message.error(errorMessage);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) {
      setProjects([]);
      setSelectedProjectId(undefined);
      return;
    }
    let cancelled = false;
    setProjectsLoading(true);
    projectApi.getList({ page: 1, pageSize: 1000 })
      .then((result) => {
        if (cancelled) return;
        setProjects(result.list);
        const projectIdFromUrl = searchParams.get('projectId');
        setSelectedProjectId((current) => {
          const candidate = projectIdFromUrl || current;
          return candidate && result.list.some((project) => project.id === candidate) ? candidate : undefined;
        });
      })
      .catch(() => {
        if (!cancelled) message.error('项目列表加载失败');
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated, searchParams]);

  const selectedVersion = useMemo(() => {
    if (!brief) return null;
    const selectedVersionId = searchParams.get('versionId');
    return brief.versions?.find((version) => version.id === selectedVersionId) || brief.versions?.[0] || null;
  }, [brief, searchParams]);

  const displayBrief = useMemo(() => {
    if (!brief) return null;
    return selectedVersion ? briefFromVersionContent(brief, selectedVersion.content) : brief;
  }, [brief, selectedVersion]);

  const accessPermission = brief?.accessPermission || brief?.sharePermission || 'read';
  const canEdit = accessPermission === 'edit' || accessPermission === 'manage';
  const permissionLabel = accessPermission === 'manage' ? '可管理' : accessPermission === 'edit' ? '可编辑' : '可阅读';

  const goLogin = () => {
    const redirect = window.location.pathname + window.location.search;
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
  };

  const startEditing = () => {
    if (!displayBrief || !canEdit) return;
    if (!isAuthenticated) {
      message.warning('请先登录后再编辑');
      goLogin();
      return;
    }
    setEditValues({
      name: displayBrief.name,
      productName: displayBrief.productName || displayBrief.name,
      price: displayBrief.price,
      slogan: displayBrief.slogan,
      primarySellingPoint: displayBrief.primarySellingPoint,
      targetAudience: displayBrief.targetAudience,
      targetScene: displayBrief.targetScene,
      otherRequirements: displayBrief.otherRequirements,
    });
    setEditRichValues(richValuesFromBrief(displayBrief));
    setIsEditing(true);
  };

  const updateRichField = (key: BriefRichFieldKey, html: string, plainText: string) => {
    const fieldByKey: Record<BriefRichFieldKey, keyof Brief> = {
      audience: 'targetAudience',
      features: 'targetScene',
      mainPoints: 'primarySellingPoint',
      secondaryPoints: 'otherRequirements',
    };
    setEditRichValues((current) => ({ ...current, [key]: html }));
    setEditValues((current) => ({ ...current, [fieldByKey[key]]: plainText }));
  };

  const saveBrief = async () => {
    if (!token || !brief || !canEdit) return;
    if (!isAuthenticated) {
      message.warning('请先登录后再保存修改');
      goLogin();
      return;
    }
    if (!selectedProjectId) {
      message.warning('请先选择要关联的项目，项目 ID 不能为空');
      return;
    }
    setSaving(true);
    try {
      await briefApi.linkToProject(brief.id, selectedProjectId);
      const updated = await briefApi.updateByShareToken(token, selectedProjectId, {
        ...editValues,
        name: editValues.productName || editValues.name || brief.name,
        richContent: JSON.stringify(editRichValues),
        forceNewVersion: true,
      });
      setBrief(updated);
      setIsEditing(false);
      if (searchParams.has('versionId')) navigate(window.location.pathname, { replace: true });
      message.success('修改已保存到同一份 Brief');
    } catch (error) {
      message.error(getErrorMessage(error, '保存失败，请确认项目关联和编辑权限'));
    } finally {
      setSaving(false);
    }
  };

  const linkBriefToProject = async (projectId: string) => {
    if (!isAuthenticated) {
      message.warning('请先登录后再加入项目');
      goLogin();
      return;
    }
    if (!brief || !projectId) {
      message.warning('请选择要加入的项目');
      return;
    }
    const previousProjectId = selectedProjectId;
    setSelectedProjectId(projectId);
    setLinkingProject(true);
    try {
      await briefApi.linkToProject(brief.id, projectId);
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('projectId', projectId);
      navigate(`${window.location.pathname}?${nextSearchParams.toString()}`, { replace: true });
      message.success('已关联到项目，后续将持续同步同一份 Brief');
    } catch (error) {
      setSelectedProjectId(previousProjectId);
      message.error(getErrorMessage(error, '加入项目失败，请确认分享链接和项目权限'));
    } finally {
      setLinkingProject(false);
    }
  };

  const unlinkBriefFromProject = async () => {
    if (!brief || !selectedProjectId) return;
    setLinkingProject(true);
    try {
      await briefApi.unlinkFromProject(brief.id, selectedProjectId);
      setSelectedProjectId(undefined);
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('projectId');
      const nextQuery = nextSearchParams.toString();
      navigate(`${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`, { replace: true });
      message.success('已撤回关联，该 Brief 不再填充到刚才选择的项目');
    } catch (error) {
      message.error(getErrorMessage(error, '撤回关联失败，请稍后重试'));
    } finally {
      setLinkingProject(false);
    }
  };
  if (loading) {
    return <main className="brief-share-page"><section className="brief-share-status">正在加载 Brief...</section></main>;
  }

  if (!brief || !displayBrief) {
    return <main className="brief-share-page"><section className="brief-share-status">{loadError || '分享链接不存在或已失效'}</section></main>;
  }

  return (
    <main className="brief-share-page">
      <section className={`brief-share-shell ${isEditing ? 'is-editing' : ''}`}>
        <header className="brief-share-topbar">
          <div className="brief-share-heading-meta">
            <span><LinkOutlined />分享的 Brief</span>
          </div>
          <div className="brief-share-centered-title">
            {isEditing ? (
              <input
                aria-label="产品名称"
                value={String(editValues.productName || '')}
                onChange={(event) => setEditValues((current) => ({
                  ...current,
                  productName: event.target.value,
                }))}
              />
            ) : (
              <h3 className="brief-share-main-title">
                {displayBrief.productName || displayBrief.name}
                {selectedVersion ? ` ${selectedVersion.label}` : ''}
              </h3>
            )}
            {isEditing && selectedVersion ? <strong>{selectedVersion.label}</strong> : null}
          </div>
          <div className="brief-share-actions">
            <em>{permissionLabel}</em>
            <div className="brief-share-project-picker">
              <FolderAddOutlined />
              <Select
                showSearch
                loading={projectsLoading || linkingProject}
                value={selectedProjectId}
                placeholder="选择项目并关联"
                optionFilterProp="label"
                options={projects.map((project) => ({ value: project.id, label: project.name }))}
                onChange={(projectId) => { void linkBriefToProject(projectId); }}
                onDropdownVisibleChange={(open) => {
                  if (open && !isAuthenticated) {
                    message.warning('请先登录后再加入项目');
                    goLogin();
                  }
                }}
                notFoundContent={projectsLoading ? '正在加载…' : '暂无可用项目，请先创建项目'}
              />
            </div>
            {selectedProjectId ? (
              <button type="button" onClick={() => { void unlinkBriefFromProject(); }} disabled={linkingProject}>
                <RollbackOutlined />撤回关联
              </button>
            ) : null}
            {canEdit ? (
              isEditing ? (
                <>
                  <button type="button" className="primary" onClick={saveBrief} disabled={saving}>
                    <SaveOutlined />{saving ? '保存中...' : '保存修改'}
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} disabled={saving}>
                    <CloseOutlined />取消
                  </button>
                </>
              ) : (
                <button type="button" className="primary" onClick={startEditing}>
                  <EditOutlined />编辑
                </button>
              )
            ) : null}
          </div>
        </header>

        {isEditing && canEdit ? (
          <div className="brief-share-editor">
            <section className="brief-share-editor-overview">
              <div className="brief-share-plain-fields">
                <label>
                  <span>产品价格</span>
                  <input
                    value={String(editValues.price || '')}
                    onChange={(event) => setEditValues((current) => ({ ...current, price: event.target.value }))}
                  />
                </label>
                <label>
                  <span>产品 slogan</span>
                  <input
                    value={String(editValues.slogan || '')}
                    onChange={(event) => setEditValues((current) => ({ ...current, slogan: event.target.value }))}
                  />
                </label>
              </div>
              <RichTextField
                className="brief-share-rich-field brief-share-audience"
                label="目标人群"
                value={editRichValues.audience}
                placeholder="请输入目标人群"
                maxLength={500}
                onChange={(html, plainText) => updateRichField('audience', html, plainText)}
              />
            </section>
            <section className="brief-share-editor-grid">
              <RichTextField
                className="brief-share-rich-field"
                label="产品特色卖点"
                value={editRichValues.features}
                placeholder="请输入产品特色卖点"
                maxLength={10000}
                onChange={(html, plainText) => updateRichField('features', html, plainText)}
              />
              <RichTextField
                className="brief-share-rich-field"
                label="产品主要卖点"
                value={editRichValues.mainPoints}
                placeholder="请输入产品主要卖点"
                maxLength={10000}
                onChange={(html, plainText) => updateRichField('mainPoints', html, plainText)}
              />
              <RichTextField
                className="brief-share-rich-field"
                label="产品次要卖点"
                value={editRichValues.secondaryPoints}
                placeholder="请输入产品次要卖点"
                maxLength={10000}
                onChange={(html, plainText) => updateRichField('secondaryPoints', html, plainText)}
              />
            </section>
          </div>
        ) : (
          <BriefContentLayout brief={displayBrief} className="brief-share-content-layout" />
        )}

        <footer>{permissionLabel}链接 · 关联到项目后会持续同步源 Brief 的最新内容</footer>
      </section>

    </main>
  );
};

export default BriefSharePage;
