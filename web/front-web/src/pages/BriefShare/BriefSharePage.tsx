import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { briefApi } from '../../api/brief';
import type { Brief } from '../../types/brief';
import { useAuthStore } from '../../stores/authStore';
import './brief-share-page.css';

const parseJsonObject = (content?: string): Record<string, string> => {
  if (!content) return {};
  try {
    const parsed = JSON.parse(content) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
};

const briefFromVersionContent = (brief: Brief, versionContent?: string): Brief => {
  const snapshot = parseJsonObject(versionContent);
  if (!Object.keys(snapshot).length) return brief;
  const embeddedValues = parseJsonObject(snapshot.briefContent);
  return {
    ...brief,
    name: snapshot.productName || snapshot.briefName || brief.name,
    productName: snapshot.productName || snapshot.briefName || brief.productName,
    productModel: snapshot.productModel || brief.productModel,
    price: snapshot.price || embeddedValues.price || brief.price,
    slogan: snapshot.slogan || embeddedValues.slogan || brief.slogan,
    targetAudience: snapshot.targetAudience || embeddedValues.audience || brief.targetAudience,
    targetScene: snapshot.targetScene || embeddedValues.features || brief.targetScene,
    primarySellingPoint: snapshot.primarySellingPoint || embeddedValues.mainPoints || brief.primarySellingPoint,
    otherRequirements: snapshot.otherRequirements || embeddedValues.secondaryPoints || brief.otherRequirements,
    briefContent: snapshot.briefContent || brief.briefContent,
  };
};

const BriefSharePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [editValues, setEditValues] = useState<Partial<Brief>>({});
  const [requestMessage, setRequestMessage] = useState('');
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

  useEffect(() => {
    if (!brief) return;
    const selectedVersionId = searchParams.get('versionId');
    const selectedVersion = brief.versions?.find((version) => version.id === selectedVersionId) || brief.versions?.[0];
    const currentDisplayBrief = selectedVersion ? briefFromVersionContent(brief, selectedVersion.content) : brief;
    setEditValues({
      name: currentDisplayBrief.name,
      productName: currentDisplayBrief.productName,
      productModel: currentDisplayBrief.productModel,
      price: currentDisplayBrief.price,
      slogan: currentDisplayBrief.slogan,
      primarySellingPoint: currentDisplayBrief.primarySellingPoint,
      targetAudience: currentDisplayBrief.targetAudience,
      targetScene: currentDisplayBrief.targetScene,
      otherRequirements: currentDisplayBrief.otherRequirements,
    });
  }, [brief, searchParams]);

  const selectedVersion = useMemo(() => {
    if (!brief) return null;
    const selectedVersionId = searchParams.get('versionId');
    return brief.versions?.find((version) => version.id === selectedVersionId) || brief.versions?.[0] || null;
  }, [brief, searchParams]);

  const displayBrief = useMemo(() => {
    if (!brief) return null;
    return selectedVersion ? briefFromVersionContent(brief, selectedVersion.content) : brief;
  }, [brief, selectedVersion]);

  const goLogin = () => {
    const redirect = window.location.pathname + window.location.search;
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
  };

  if (loading) {
    return <main className="brief-share-page"><section className="brief-share-card">正在加载 Brief...</section></main>;
  }

  if (!brief || !displayBrief) {
    return <main className="brief-share-page"><section className="brief-share-card">分享链接不存在或已失效</section></main>;
  }

  const requestEdit = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      message.warning('请先登录后再申请编辑权限');
      goLogin();
      return;
    }
    try {
      await briefApi.requestEditByShareToken(token, requestMessage);
      message.success('编辑权限申请已提交，等待分享人审批');
    } catch {
      message.error('申请提交失败');
    }
  };

  const changeField = (field: keyof Brief, value: string) => {
    setEditValues((previous) => ({ ...previous, [field]: value }));
  };

  const saveBrief = async () => {
    if (!brief || !isAuthenticated) {
      message.warning('请先登录后再保存修改');
      goLogin();
      return;
    }
    setSaving(true);
    try {
      const updated = await briefApi.update(brief.id, editValues);
      setBrief(updated);
      message.success('已保存到同一份共享 Brief');
    } catch {
      message.error('保存失败，请确认分享人已同意你的编辑申请');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="brief-share-page">
      <section className="brief-share-card">
        <header>
          <span><LinkOutlined />共享 Brief</span>
          <h1>{displayBrief.name}</h1>
          <p>{displayBrief.productName || displayBrief.productModel || '产品 Brief'}{selectedVersion ? ` · ${selectedVersion.label}` : ''}</p>
        </header>

        <div className="brief-share-grid">
          <article>
            <strong>产品名称</strong>
            <p>{displayBrief.productName || '-'}</p>
          </article>
          <article>
            <strong>产品价格</strong>
            <p>{displayBrief.price || '-'}</p>
          </article>
          <article>
            <strong>产品 slogan</strong>
            <p>{displayBrief.slogan || '-'}</p>
          </article>
          <article>
            <strong>目标人群</strong>
            <p>{displayBrief.targetAudience || '-'}</p>
          </article>
          <article>
            <strong>产品特色卖点</strong>
            <p>{displayBrief.targetScene || '-'}</p>
          </article>
          <article>
            <strong>产品主要卖点</strong>
            <p>{displayBrief.primarySellingPoint || '-'}</p>
          </article>
          <article>
            <strong>产品次要卖点</strong>
            <p>{displayBrief.otherRequirements || '-'}</p>
          </article>
        </div>

        <section className="brief-share-edit">
          <strong>协作编辑</strong>
          <div className="brief-share-form-grid">
            <label>
              产品名称
              <input
                value={editValues.productName || ''}
                onChange={(event) => changeField('productName', event.target.value)}
              />
            </label>
            <label>
              产品价格
              <input
                value={editValues.price || ''}
                onChange={(event) => changeField('price', event.target.value)}
              />
            </label>
            <label>
              产品 slogan
              <input
                value={editValues.slogan || ''}
                onChange={(event) => changeField('slogan', event.target.value)}
              />
            </label>
          </div>
          <label>
            目标人群
            <textarea
              value={editValues.targetAudience || ''}
              onChange={(event) => changeField('targetAudience', event.target.value)}
            />
          </label>
          <label>
            产品特色卖点
            <textarea
              value={editValues.targetScene || ''}
              onChange={(event) => changeField('targetScene', event.target.value)}
            />
          </label>
          <label>
            产品主要卖点
            <textarea
              value={editValues.primarySellingPoint || ''}
              onChange={(event) => changeField('primarySellingPoint', event.target.value)}
            />
          </label>
          <label>
            产品次要卖点
            <textarea
              value={editValues.otherRequirements || ''}
              onChange={(event) => changeField('otherRequirements', event.target.value)}
            />
          </label>
          <button type="button" onClick={saveBrief} disabled={saving}>
            {saving ? '保存中...' : '保存修改'}
          </button>
        </section>

        <section className="brief-share-apply">
          <strong>需要一起编辑这份 Brief？</strong>
          <textarea
            value={requestMessage}
            onChange={(event) => setRequestMessage(event.target.value)}
            placeholder="给分享人留一句申请说明，例如：我是负责本条短视频的编导，需要补充分镜卖点。"
          />
          <button type="button" onClick={requestEdit}>申请编辑权限</button>
        </section>
      </section>
    </main>
  );
};

export default BriefSharePage;
