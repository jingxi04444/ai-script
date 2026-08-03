import { useCallback, useEffect, useState } from 'react';
import { message, Modal, Upload } from 'antd';
import { DeleteOutlined, FileTextOutlined, FormOutlined, PlusOutlined, ReloadOutlined, RightOutlined, ShareAltOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { assetApi, fileApi } from '../../../api/asset';
import { briefApi } from '../../../api/brief';
import { scriptApi } from '../../../api/script';
import type { Asset, SellingPointAsset, ViralAsset } from '../../../types/asset';
import type { Brief, BriefSharePermission } from '../../../types/brief';
import type { Script } from '../../../types/script';
import { formatDateTime } from '../../../utils/format';
import './assets-panel.css';

interface AssetsPanelProps {
  projectId: string | null;
  ensureProjectId: () => Promise<string>;
}

const AssetsPanel = ({ projectId, ensureProjectId }: AssetsPanelProps) => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sellingPoints, setSellingPoints] = useState<SellingPointAsset[]>([]);
  const [viralAssets, setViralAssets] = useState<ViralAsset[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('image');
  const [sellingPointName, setSellingPointName] = useState('');
  const [sellingPointText, setSellingPointText] = useState('');
  const [viralName, setViralName] = useState('');
  const [viralUrl, setViralUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBriefShareMode, setIsBriefShareMode] = useState(false);
  const [selectedBriefIds, setSelectedBriefIds] = useState<string[]>([]);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const [assetPage, pointPage, viralPage, briefList, scriptList] = await Promise.all([
        assetApi.list({ projectId: projectId || undefined, page: 1, pageSize: 20 }),
        assetApi.sellingPoints({ page: 1, pageSize: 8 }),
        assetApi.viralAssets({ page: 1, pageSize: 8 }),
        briefApi.mineList(),
        scriptApi.mineList(),
      ]);
      setAssets(assetPage.list || []);
      setSellingPoints(pointPage.list || []);
      setViralAssets(viralPage.list || []);
      setBriefs(briefList || []);
      setScripts(scriptList || []);
    } catch {
      message.error('资产数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const createAsset = async () => {
    if (!assetName.trim()) return message.warning('请输入素材名称');
    const currentProjectId = await ensureProjectId();
    try {
      await assetApi.create({
        projectId: currentProjectId,
        name: assetName.trim(),
        type: assetCategory,
        category: 'project',
      });
      setAssetName('');
      message.success('素材已保存');
      loadAssets();
    } catch {
      message.error('素材保存失败');
    }
  };

  const createSellingPoint = async () => {
    if (!sellingPointName.trim()) return message.warning('请输入卖点资产名称');
    try {
      await assetApi.createSellingPoint({
        name: sellingPointName.trim(),
        mainPoint: sellingPointText,
        tagText: sellingPointText,
      });
      setSellingPointName('');
      setSellingPointText('');
      message.success('卖点资产已保存');
      loadAssets();
    } catch {
      message.error('卖点资产保存失败');
    }
  };

  const createViralAsset = async () => {
    if (!viralName.trim()) return message.warning('请输入爆款资产名称');
    try {
      await assetApi.createViral({
        name: viralName.trim(),
        kind: 'script',
        platform: 'short-video',
        sourceUrl: viralUrl,
      });
      setViralName('');
      setViralUrl('');
      message.success('爆款资产已保存');
      loadAssets();
    } catch {
      message.error('爆款资产保存失败');
    }
  };

  const removeAsset = async (id: string) => {
    try {
      await assetApi.delete(id);
      message.success('素材已删除');
      loadAssets();
    } catch {
      message.error('删除失败');
    }
  };

  const toggleBriefSelection = (briefId: string) => {
    setSelectedBriefIds((current) => current.includes(briefId) ? current.filter((id) => id !== briefId) : [...current, briefId]);
  };

  const shareSelectedBriefs = async () => {
    const selected = briefs.filter((brief) => selectedBriefIds.includes(brief.id) && (brief.accessPermission || 'manage') === 'manage');
    if (!selected.length) return message.warning('请选择可管理的 Brief');
    try {
      const pack = await briefApi.createSharePack(selected.map((brief) => brief.id), 'read' as BriefSharePermission);
      await navigator.clipboard.writeText(new URL(pack.shareUrl, window.location.origin).toString());
      setSelectedBriefIds([]);
      setIsBriefShareMode(false);
      message.success('Brief 分享包链接已复制');
    } catch {
      message.error('创建 Brief 分享包失败');
    }
  };
  const openBrief = (briefId: string) => {
    const params = new URLSearchParams({
      step: 'selling-points',
      briefId,
      briefDialog: '1',
    });
    if (projectId) params.set('projectId', projectId);
    navigate(`/workspace?${params.toString()}`);
  };

  const removeBrief = (brief: Brief) => {
    Modal.confirm({
      title: '确认删除这份 Brief？',
      content: `“${brief.productName || brief.name || '未命名 Brief'}”会从所有项目中移除，历史脚本仍保留生成时的 Brief 快照。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        await briefApi.delete(brief.id);
        setBriefs((current) => current.filter((item) => item.id !== brief.id));
        setSelectedBriefIds((current) => current.filter((id) => id !== brief.id));
        message.success('Brief 已删除');
      },
    });
  };

  const openScript = (script: Script) => {
    const params = new URLSearchParams({
      projectId: script.projectId,
      step: 'script-generator',
      scriptMode: script.type,
      editScriptId: script.id,
    });
    navigate(`/workspace?${params.toString()}`);
  };

  return (
    <section className="assets-panel">
      <header className="workspace-panel-head">
        <div>
          <h2>资产管理</h2>
          <p>统一查看并调用账号下全部 Brief、脚本及其他创作资产。</p>
        </div>
        <button onClick={loadAssets} disabled={loading}><ReloadOutlined />刷新</button>
      </header>

      <div className="assets-grid">
        <section className="asset-block asset-library-block">
          <div className="asset-block-title">
            <h3><FormOutlined />Brief 资产库</h3>
            <span>{briefs.length} 份</span>
            <button type="button" className="asset-brief-share" onClick={() => { setIsBriefShareMode((current) => !current); setSelectedBriefIds([]); }}><ShareAltOutlined />{isBriefShareMode ? '取消' : '创建分享包'}</button>
          </div>
          <p className="asset-block-description">包含我创建和别人共享给我的 Brief，内容更新会同步显示。</p>
          {isBriefShareMode ? <div className="asset-brief-share-bar"><button type="button" onClick={() => setSelectedBriefIds(selectedBriefIds.length === briefs.length ? [] : briefs.map((brief) => brief.id))}>全选</button><button type="button" onClick={shareSelectedBriefs} disabled={!selectedBriefIds.length}>共享 {selectedBriefIds.length} 份 Brief</button></div> : null}          <div className="asset-library-list">
            {briefs.map((brief) => (
              <div className={`asset-library-link-row ${isBriefShareMode && selectedBriefIds.includes(brief.id) ? 'is-selected' : ''}`} key={brief.id}>
              <button className="asset-library-link" type="button" onClick={() => isBriefShareMode ? toggleBriefSelection(brief.id) : openBrief(brief.id)}>
                <span className="asset-library-icon"><FormOutlined /></span>
                <span className="asset-library-content">
                  <strong>{brief.productName || brief.name || '未命名 Brief'}</strong>
                  <small>{brief.productModel || `更新于 ${formatDateTime(brief.updatedAt)}`}</small>
                </span>
                <RightOutlined />
              </button>
              {!isBriefShareMode && brief.ownedByCurrentUser === true ? <button className="asset-library-delete" type="button" aria-label={`删除 ${brief.productName || brief.name || 'Brief'}`} onClick={() => removeBrief(brief)}><DeleteOutlined /></button> : null}
              </div>
            ))}
            {!briefs.length && <p className="empty-hint">暂无 Brief</p>}
          </div>
        </section>

        <section className="asset-block asset-library-block">
          <div className="asset-block-title">
            <h3><FileTextOutlined />脚本资产库</h3>
            <span>{scripts.length} 篇</span>
          </div>
          <p className="asset-block-description">汇总账号下全部脚本，点击即可打开预览并继续处理。</p>
          <div className="asset-library-list">
            {scripts.map((script) => (
              <button className="asset-library-link" type="button" key={script.id} onClick={() => openScript(script)}>
                <span className="asset-library-icon"><FileTextOutlined /></span>
                <span className="asset-library-content">
                  <strong>{script.name || '未命名脚本'}</strong>
                  <small>{script.type} · {formatDateTime(script.updatedAt)}</small>
                </span>
                <RightOutlined />
              </button>
            ))}
            {!scripts.length && <p className="empty-hint">暂无脚本</p>}
          </div>
        </section>

        <section className="asset-block asset-upload-block">
          <h3>项目素材</h3>
          <div className="asset-form-row">
            <input value={assetName} onChange={(event) => setAssetName(event.target.value)} placeholder="素材名称" />
            <select value={assetCategory} onChange={(event) => setAssetCategory(event.target.value)}>
              <option value="image">图片</option>
              <option value="video">视频</option>
              <option value="audio">音频</option>
              <option value="document">文档</option>
            </select>
            <button onClick={createAsset}><PlusOutlined />新增</button>
          </div>
          <Upload
            showUploadList={false}
            customRequest={async ({ file, onSuccess, onError }) => {
              try {
                const currentProjectId = await ensureProjectId();
                const uploadedFile = file as File;
                const result = await fileApi.upload(uploadedFile, 'assets');
                await assetApi.create({
                  projectId: currentProjectId,
                  name: result.fileName || uploadedFile.name,
                  type: uploadedFile.type?.startsWith('video') ? 'video' : uploadedFile.type?.startsWith('audio') ? 'audio' : 'image',
                  category: 'upload',
                  storageKey: result.objectKey,
                  previewUrl: result.url,
                  mimeType: result.contentType,
                  fileSizeBytes: result.size,
                });
                message.success('文件已上传并入库');
                loadAssets();
                onSuccess?.(result);
              } catch (error) {
                message.error('上传失败');
                onError?.(error as Error);
              }
            }}
          >
            <button className="asset-upload-button"><UploadOutlined />上传素材文件</button>
          </Upload>
          <div className="asset-list">
            {assets.map((asset) => (
              <article key={asset.id}>
                <span>{asset.type}</span>
                <strong>{asset.name}</strong>
                <small>{asset.status || 'ready'}</small>
                {asset.category === 'product-frame-library'
                  ? <small>原始文件 · 只读</small>
                  : <button aria-label="删除素材" onClick={() => removeAsset(asset.id)}><DeleteOutlined /></button>}
              </article>
            ))}
            {!assets.length && <p className="empty-hint">暂无项目素材</p>}
          </div>
        </section>

        <section className="asset-block">
          <h3>卖点资产库</h3>
          <input value={sellingPointName} onChange={(event) => setSellingPointName(event.target.value)} placeholder="资产名称" />
          <textarea value={sellingPointText} onChange={(event) => setSellingPointText(event.target.value)} placeholder="核心卖点或标签" />
          <button onClick={createSellingPoint}><PlusOutlined />保存卖点资产</button>
          <div className="compact-list">
            {sellingPoints.map((item) => (
              <article key={item.id}>
                <strong>{item.name}</strong>
                <span>{item.mainPoint || item.tagText || '未填写卖点'}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="asset-block">
          <h3>爆款脚本资产库</h3>
          <input value={viralName} onChange={(event) => setViralName(event.target.value)} placeholder="爆款资产名称" />
          <input value={viralUrl} onChange={(event) => setViralUrl(event.target.value)} placeholder="来源链接" />
          <button onClick={createViralAsset}><PlusOutlined />保存爆款资产</button>
          <div className="compact-list">
            {viralAssets.map((item) => (
              <article key={item.id}>
                <strong>{item.name}</strong>
                <span>{item.platform || item.kind || 'short-video'}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};

export default AssetsPanel;
