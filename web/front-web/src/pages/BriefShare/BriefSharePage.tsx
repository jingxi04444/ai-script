import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { CloseOutlined, EditOutlined, LinkOutlined, SaveOutlined } from '@ant-design/icons';
import { briefApi } from '../../api/brief';
import BriefContentLayout from '../../components/Brief/BriefContentLayout';
import RichTextField from '../Workspace/SellingPoints/RichTextField';
import type { Brief } from '../../types/brief';
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    briefApi.getByShareToken(token)
      .then(setBrief)
      .catch(() => message.error('分享链接不存在或已失效'))
      .finally(() => setLoading(false));
  }, [token]);

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
    setSaving(true);
    try {
      const updated = await briefApi.updateByShareToken(token, {
        ...editValues,
        name: editValues.productName || editValues.name || brief.name,
        richContent: JSON.stringify(editRichValues),
        forceNewVersion: true,
      });
      setBrief(updated);
      setIsEditing(false);
      if (searchParams.has('versionId')) navigate(window.location.pathname, { replace: true });
      message.success('修改已保存到同一份 Brief');
    } catch {
      message.error('保存失败，请确认当前链接具有编辑权限');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="brief-share-page"><section className="brief-share-status">正在加载 Brief...</section></main>;
  }

  if (!brief || !displayBrief) {
    return <main className="brief-share-page"><section className="brief-share-status">分享链接不存在或已失效</section></main>;
  }

  return (
    <main className="brief-share-page">
      <section className={`brief-share-shell ${isEditing ? 'is-editing' : ''}`}>
        <header className="brief-share-topbar">
          <div>
            <span><LinkOutlined />分享的 Brief</span>
            {isEditing ? (
              <input
                aria-label="产品名称"
                value={String(editValues.productName || '')}
                onChange={(event) => setEditValues((current) => ({
                  ...current,
                  productName: event.target.value,
                }))}
              />
            ) : <h1>{displayBrief.name}</h1>}
            <p>{isEditing ? editValues.slogan || '产品 Brief' : displayBrief.slogan || '产品 Brief'}{selectedVersion ? ` · ${selectedVersion.label}` : ''}</p>
          </div>
          <div className="brief-share-actions">
            <em>{permissionLabel}</em>
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

        <footer>{permissionLabel}链接 · 登录后会自动加入“我的 Brief”并持续同步最新内容</footer>
      </section>
    </main>
  );
};

export default BriefSharePage;
