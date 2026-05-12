import { useEffect, useState } from 'react';
import { navigate } from '../app/router';
import { ToastView } from '../components/ToastView';
import { Topbar } from '../components/Topbar';
import { assetApi } from '../services/assetApi';
import { workflowApi } from '../services/workflowApi';
import type { User } from '../types/auth';
import type { LibraryAsset, LibraryAssetDetail, LibraryType } from '../types/asset';
import type { ThemeKey, Toast } from '../types/ui';

type UploadState = {
  library: LibraryType;
  title: string;
  accept: string;
  hint: string;
} | null;

const libraryConfig: Record<LibraryType, { title: string; subtitle: string; uploadType: string; accept: string; hint: string; tag: string }> = {
  'selling-point': {
    title: '我的卖点资产库',
    subtitle: '沉淀产品 Brief、卖点模板、行业卖点包，供步骤 2 一键复用。',
    uploadType: 'selling-point-script-asset',
    accept: '.xlsx,.xls,.csv,.doc,.docx,.pdf,.txt',
    hint: '请选择产品卖点脚本、Brief 模板或卖点资产文件。',
    tag: '产品卖点脚本',
  },
  'viral-script': {
    title: '爆款链接脚本资产库',
    subtitle: '沉淀爆款链接解析脚本、结构公式、拉片报告，供步骤 3 复用。',
    uploadType: 'viral-link-script-asset',
    accept: '.txt,.doc,.docx,.pdf,.xlsx,.csv',
    hint: '请选择爆款链接脚本、结构公式或拉片报告文件。',
    tag: '爆款链接脚本',
  },
};

export function AssetLibraryPage({ user, showToast, toast, theme, onThemeToggle, onLogout }: { user: User; showToast: (message: string, tone?: Toast['tone']) => void; toast: Toast | null; theme: ThemeKey; onThemeToggle: () => void; onLogout: () => void }) {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [activeLibrary, setActiveLibrary] = useState<LibraryType>('selling-point');
  const [uploadModal, setUploadModal] = useState<UploadState>(null);
  const [detail, setDetail] = useState<LibraryAssetDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assetApi.getLibraryAssets()
      .then((data) => setAssets(data))
      .finally(() => setLoading(false));
  }, []);

  const openUpload = (library: LibraryType) => {
    const config = libraryConfig[library];
    setUploadModal({ library, title: config.title, accept: config.accept, hint: config.hint });
  };

  const completeUpload = async (file: File | null) => {
    if (!file || !uploadModal) {
      showToast('请选择脚本文件后再上传。', 'warning');
      return;
    }

    const config = libraryConfig[uploadModal.library];
    const result = await workflowApi.uploadFile({ type: config.uploadType, fileName: file.name });
    setAssets((current) => [{ id: result.id, library: uploadModal.library, name: result.fileName, tag: config.tag, status: '已入库', updatedAt: result.uploadedAt, count: 0 }, ...current]);
    setActiveLibrary(uploadModal.library);
    setUploadModal(null);
    showToast(`${result.fileName} 已上传到 ${config.title}。`);
  };

  const openDetail = async (asset: LibraryAsset) => {
    const data = await assetApi.getLibraryAssetDetail(asset.library, asset.id);
    setDetail(data);
  };

  const activeAssets = assets.filter((asset) => asset.library === activeLibrary);

  return (
    <main className="asset-library-page front-shell">
      {toast && <ToastView toast={toast} />}
      <Topbar user={user} theme={theme} onThemeToggle={onThemeToggle} onLogout={onLogout} />
      <section className="asset-library-hero panel">
        <div>
          <span className="eyebrow">Asset Library</span>
          <h1>我的资产库</h1>
          <p>统一管理可复用脚本资产，上传后可在产品卖点和爆款链接流程中快速调用。</p>
        </div>
        <div className="asset-library-actions">
          <button className="secondary-button" onClick={() => navigate('/projects')}>返回首页</button>
          <button className="primary-button" onClick={() => openUpload(activeLibrary)}>上传当前资产</button>
        </div>
      </section>

      <section className="asset-library-tabs">
        {(Object.keys(libraryConfig) as LibraryType[]).map((library) => {
          const config = libraryConfig[library];
          const count = assets.filter((asset) => asset.library === library).length;
          return <button className={activeLibrary === library ? 'active' : ''} key={library} onClick={() => setActiveLibrary(library)}><strong>{config.title}</strong><span>{count} 个脚本资产</span></button>;
        })}
      </section>

      <section className="asset-list-panel panel">
        <div className="asset-list-head">
          <div>
            <span className="eyebrow">Current Library</span>
            <h2>{libraryConfig[activeLibrary].title}</h2>
            <p>{libraryConfig[activeLibrary].subtitle}</p>
          </div>
          <button className="secondary-button" onClick={() => openUpload(activeLibrary)}>上传{libraryConfig[activeLibrary].tag}</button>
        </div>
        <div className="asset-list">
          <div className="asset-list-row asset-list-title">
            <span>脚本名称</span>
            <span>资产类型</span>
            <span>更新时间</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          {loading ? <div className="home-empty">正在读取资产库...</div> : null}
          {!loading && activeAssets.length === 0 ? <div className="home-empty">当前资产库暂无数据，请上传脚本资产。</div> : null}
          {activeAssets.map((asset) => <article className="asset-list-row" key={asset.id}>
            <strong>{asset.name}</strong>
            <span>{asset.count ? `${asset.tag} / ${asset.count} 条` : asset.tag}</span>
            <span>{asset.updatedAt}</span>
            <b>{asset.status}</b>
            <div className="asset-list-actions"><button onClick={() => openDetail(asset)}>查看详情</button><button onClick={() => showToast(`${asset.name} 已选择，可在对应流程中复用。`)}>选择复用</button></div>
          </article>)}
        </div>
      </section>

      <AssetUploadModal modal={uploadModal} onClose={() => setUploadModal(null)} onSubmit={completeUpload} />
      <LibraryAssetDetailModal detail={detail} onClose={() => setDetail(null)} />
    </main>
  );
}

function AssetUploadModal({ modal, onClose, onSubmit }: { modal: UploadState; onClose: () => void; onSubmit: (file: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setFile(null);
  }, [modal?.title]);

  if (!modal) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <span className="eyebrow">Upload Script</span>
            <h3>{modal.title}</h3>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <p>{modal.hint}</p>
        <label className="file-picker">
          <input type="file" accept={modal.accept} onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <strong>{file ? file.name : '点击选择脚本文件'}</strong>
          <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `支持格式：${modal.accept}`}</span>
        </label>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>取消</button>
          <button className="primary-button" onClick={() => onSubmit(file)}>确认上传</button>
        </div>
      </div>
    </div>
  );
}

function LibraryAssetDetailModal({ detail, onClose }: { detail: LibraryAssetDetail | null; onClose: () => void }) {
  if (!detail) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card detail-modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">Asset Detail</span>
            <h3>{detail.name}</h3>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="detail-meta"><span>{detail.library === 'selling-point' ? '卖点资产' : '爆款资产'}</span><span>{detail.tag}</span><span>{detail.status}</span><span>{detail.updatedAt}</span></div>
        {detail.summary ? <section className="detail-section"><h4>摘要</h4><p>{detail.summary}</p></section> : null}
        <div className="detail-list">{detail.sections.map((section) => <article key={section.title}><strong>{section.title}</strong><span>{section.content}</span></article>)}</div>
        <div className="modal-actions"><button className="primary-button" onClick={onClose}>关闭</button></div>
      </div>
    </div>
  );
}
