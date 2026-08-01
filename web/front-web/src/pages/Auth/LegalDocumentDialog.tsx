import { useEffect, useState } from 'react';
import { FileProtectOutlined } from '@ant-design/icons';
import { Modal, Spin } from 'antd';
import { siteApi } from '../../api/site';

export type LegalDocumentType = 'userAgreement' | 'privacyPolicy';

interface LegalDocumentDialogProps {
  type: LegalDocumentType | null;
  onClose: () => void;
}

interface LegalDocument {
  title: string;
  version: string;
  effectiveAt: string;
  content: string;
  enabled: boolean;
}

const fallbackDocuments: Record<LegalDocumentType, LegalDocument> = {
  userAgreement: { title: '用户协议', version: '', effectiveAt: '', content: '', enabled: false },
  privacyPolicy: { title: '隐私政策', version: '', effectiveAt: '', content: '', enabled: false },
};

const LegalDocumentDialog = ({ type, onClose }: LegalDocumentDialogProps) => {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!type) return;
    let cancelled = false;
    setLoading(true);
    siteApi.getConfig({ force: true }).then((config) => {
      const value = type === 'userAgreement' ? config.userAgreementConfig : config.privacyPolicyConfig;
      let next = fallbackDocuments[type];
      if (value) {
        try {
          next = { ...next, ...(JSON.parse(value) as Partial<LegalDocument>) };
        } catch {
          next = fallbackDocuments[type];
        }
      }
      if (!cancelled) setDocument(next);
    }).catch(() => {
      if (!cancelled) setDocument(fallbackDocuments[type]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [type]);

  return (
    <Modal open={Boolean(type)} onCancel={onClose} footer={null} centered width={720} className="auth-legal-modal" destroyOnClose>
      <div className="auth-legal-content">
        {loading ? <div className="auth-legal-loading"><Spin /><span>正在加载协议内容…</span></div> : (
          <>
            <header><FileProtectOutlined /><div><h3>{document?.title || '协议内容'}</h3>{document?.enabled ? <p>{document.version ? `版本 ${document.version}` : ''}{document.effectiveAt ? ` · 生效时间 ${document.effectiveAt.replace('T', ' ')}` : ''}</p> : null}</div></header>
            <article>{document?.enabled && document.content.trim() ? document.content : '该协议暂未发布，请联系平台管理员。'}</article>
          </>
        )}
      </div>
    </Modal>
  );
};

export default LegalDocumentDialog;
