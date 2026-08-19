import { useEffect, useState } from 'react';
import { Eye, RefreshCcw, Save, ScrollText, X } from 'lucide-react';
import { systemApi } from '../../api/system';
import { PageHeader, SectionCard } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import './legal-documents-page.css';

interface LegalDocumentDraft {
  title: string;
  version: string;
  effectiveAt: string;
  content: string;
  enabled: boolean;
}

type LegalDocumentType = 'userAgreementConfig' | 'privacyPolicyConfig' | 'membershipServiceAgreementConfig';

const emptyDocuments: Record<LegalDocumentType, LegalDocumentDraft> = {
  userAgreementConfig: { title: '用户协议', version: '1.0', effectiveAt: '', content: '', enabled: false },
  privacyPolicyConfig: { title: '隐私政策', version: '1.0', effectiveAt: '', content: '', enabled: false },
  membershipServiceAgreementConfig: { title: '会员服务协议', version: '1.0', effectiveAt: '', content: '', enabled: false },
};

const parseDocument = (value: string | undefined, fallback: LegalDocumentDraft): LegalDocumentDraft => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as Partial<LegalDocumentDraft>;
    return {
      title: parsed.title || fallback.title,
      version: parsed.version || fallback.version,
      effectiveAt: parsed.effectiveAt || '',
      content: parsed.content || '',
      enabled: Boolean(parsed.enabled),
    };
  } catch {
    return fallback;
  }
};

const LegalDocumentsPage = () => {
  const { notify } = useAdminShell();
  const [documents, setDocuments] = useState(emptyDocuments);
  const [loading, setLoading] = useState(false);
  const [savingType, setSavingType] = useState<LegalDocumentType | null>(null);
  const [previewType, setPreviewType] = useState<LegalDocumentType | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const config = await systemApi.getSiteConfig();
      setDocuments({
        userAgreementConfig: parseDocument(config.userAgreementConfig, emptyDocuments.userAgreementConfig),
        privacyPolicyConfig: parseDocument(config.privacyPolicyConfig, emptyDocuments.privacyPolicyConfig),
        membershipServiceAgreementConfig: parseDocument(config.membershipServiceAgreementConfig, emptyDocuments.membershipServiceAgreementConfig),
      });
    } catch {
      notify('协议配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateDocument = (type: LegalDocumentType, patch: Partial<LegalDocumentDraft>) => {
    setDocuments((current) => ({ ...current, [type]: { ...current[type], ...patch } }));
  };

  const save = async (type: LegalDocumentType) => {
    const document = documents[type];
    if (!document.title.trim() || !document.version.trim()) return notify('标题和版本号不能为空');
    if (document.enabled && !document.content.trim()) return notify('发布前请填写协议正文');
    setSavingType(type);
    try {
      await systemApi.updateSiteConfig({ [type]: JSON.stringify(document) });
      notify(`${document.title}已保存`);
    } catch {
      notify('协议保存失败');
    } finally {
      setSavingType(null);
    }
  };

  const previewDocument = previewType ? documents[previewType] : null;

  return (
    <div className="page-stack legal-documents-page">
      <PageHeader
        title="协议管理"
        description="统一维护用户协议、隐私政策和会员服务协议。保存后，已发布内容会立即在前台生效。"
        actions={<button className="toolbar-btn" type="button" onClick={() => void load()}><RefreshCcw size={16} />{loading ? '加载中' : '刷新'}</button>}
      />

      <div className="legal-document-grid">
        {(Object.keys(documents) as LegalDocumentType[]).map((type) => {
          const document = documents[type];
          return (
            <SectionCard
              key={type}
              title={document.title}
              description={type === 'userAgreementConfig'
                ? '约定用户使用平台时的权利、义务及服务规则。'
                : type === 'privacyPolicyConfig'
                  ? '说明个人信息的收集、使用、存储与保护方式。'
                  : '约定会员套餐购买、权益、生效、续费与退款规则。'}
              action={<span className={`status-badge ${document.enabled ? 'green' : ''}`}>{document.enabled ? '已发布' : '未发布'}</span>}
            >
              <div className="legal-document-form">
                <div className="legal-document-meta-grid">
                  <label className="form-field"><span>协议标题</span><input value={document.title} onChange={(event) => updateDocument(type, { title: event.target.value })} /></label>
                  <label className="form-field"><span>版本号</span><input value={document.version} onChange={(event) => updateDocument(type, { version: event.target.value })} placeholder="例如 1.0" /></label>
                </div>
                <label className="form-field"><span>生效时间</span><input type="datetime-local" value={document.effectiveAt} onChange={(event) => updateDocument(type, { effectiveAt: event.target.value })} /></label>
                <label className="form-field legal-document-content"><span>协议正文</span><textarea value={document.content} onChange={(event) => updateDocument(type, { content: event.target.value })} placeholder="请输入经法务审核后的正式协议内容，支持自然段和换行。" /></label>
                <label className="legal-publish-switch"><input type="checkbox" checked={document.enabled} onChange={(event) => updateDocument(type, { enabled: event.target.checked })} /><span><strong>发布到用户端</strong><small>关闭后用户端会显示“协议暂未发布”</small></span></label>
                <div className="legal-document-actions">
                  <button className="toolbar-btn" type="button" onClick={() => setPreviewType(type)}><Eye size={16} />预览</button>
                  <button className="toolbar-btn primary" type="button" disabled={savingType === type} onClick={() => void save(type)}><Save size={16} />{savingType === type ? '保存中' : '保存协议'}</button>
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>

      {previewDocument ? (
        <div className="legal-preview-backdrop" role="presentation" onMouseDown={() => setPreviewType(null)}>
          <section className="legal-preview-dialog" role="dialog" aria-modal="true" aria-label={`${previewDocument.title}预览`} onMouseDown={(event) => event.stopPropagation()}>
            <header><span><ScrollText size={18} />协议预览</span><button type="button" aria-label="关闭预览" onClick={() => setPreviewType(null)}><X size={18} /></button></header>
            <div className="legal-preview-heading"><h2>{previewDocument.title}</h2><p>版本 {previewDocument.version}{previewDocument.effectiveAt ? ` · ${previewDocument.effectiveAt.replace('T', ' ')}` : ''}</p></div>
            <article>{previewDocument.content || '暂未填写协议正文。'}</article>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default LegalDocumentsPage;
