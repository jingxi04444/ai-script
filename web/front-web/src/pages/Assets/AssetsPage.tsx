import { useEffect, useMemo, useState } from 'react';
import { message, Modal } from 'antd';
import { CaretRightFilled, CheckOutlined, DeleteOutlined, FileTextOutlined, FolderFilled, FormOutlined, LeftOutlined, MenuFoldOutlined, PictureOutlined, RightOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { assetApi } from '../../api/asset';
import { briefApi } from '../../api/brief';

import { scriptApi } from '../../api/script';
import HomeRail from '../../components/Layout/HomeRail';
import type { Asset } from '../../types/asset';
import type { BriefAssetItem, BriefAssetLibrary } from '../../types/brief';

import type { Script } from '../../types/script';
import { formatDateTime } from '../../utils/format';
import './assets-page.css';

type LibraryView = 'briefs' | 'scripts' | 'materials' | 'productFrames' | 'works';

interface AssetFolder {
  key: string;
  name: string;
  count: number | null;
}

const LIBRARY_LABELS: Record<LibraryView, string> = {
  briefs: 'Brief库',
  scripts: '脚本库',
  materials: '素材库',
  productFrames: '产品画面库',
  works: '我的作品',
};

const LIBRARY_ORDER: LibraryView[] = ['briefs', 'scripts', 'materials', 'productFrames', 'works'];

const AssetsPage = () => {
  const navigate = useNavigate();
  const [assetSearchParams] = useSearchParams();
  const [activeView, setActiveView] = useState<LibraryView>('briefs');
  const [expandedViews, setExpandedViews] = useState<Record<LibraryView, boolean>>({
    briefs: true,
    scripts: false,
    materials: false,
    productFrames: false,
    works: false,
  });
  const [selectedFolderKey, setSelectedFolderKey] = useState<string | null>(
    assetSearchParams.get('briefProjectId') ? 'mine-briefs' : null,
  );
  const [selectedBriefProjectId, setSelectedBriefProjectId] = useState<string | null>(
    assetSearchParams.get('briefProjectId'),
  );
  const [assets, setAssets] = useState<Asset[]>([]);
  const [briefLibrary, setBriefLibrary] = useState<BriefAssetLibrary | null>(null);
  const [briefsLoading, setBriefsLoading] = useState(true);
  const [briefLoadFailed, setBriefLoadFailed] = useState(false);
  const [isAssetBriefShareMode, setIsAssetBriefShareMode] = useState(false);
  const [isAssetBriefDeleteMode, setIsAssetBriefDeleteMode] = useState(false);
  const [selectedAssetBriefIds, setSelectedAssetBriefIds] = useState<string[]>([]);

  const [scripts, setScripts] = useState<Script[]>([]);
  const [viralScriptCount, setViralScriptCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    briefApi.assetLibrary()
      .then((library) => {
        if (!cancelled) setBriefLibrary(library);
      })
      .catch(() => {
        if (!cancelled) setBriefLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setBriefsLoading(false);
      });

    assetApi.list({ page: 1, pageSize: 200 })
      .then((page) => {
        if (!cancelled) setAssets(page.list || []);
      })
      .catch(() => {
        if (!cancelled) setAssets([]);
      });

    scriptApi.mineList()
      .then((list) => {
        if (!cancelled) setScripts(list);
      })
      .catch(() => {
        if (!cancelled) setScripts([]);
      });

    assetApi.viralAssets({ page: 1, pageSize: 1 })
      .then((page) => {
        if (!cancelled) setViralScriptCount(page.total || 0);
      })
      .catch(() => {
        if (!cancelled) setViralScriptCount(0);
      });

    return () => { cancelled = true; };
  }, []);

  const foldersByView = useMemo<Record<LibraryView, AssetFolder[]>>(() => {
    const countBy = (predicate: (asset: Asset) => boolean) => assets.filter(predicate).length;
    const works = assets.filter((asset) => asset.category === 'project' || asset.category === 'upload');
    return {
      briefs: [{ key: 'mine-briefs', name: '我的Brief', count: briefLibrary?.total ?? null }],
      scripts: [
        { key: 'mine-scripts', name: '我的脚本', count: scripts.length },
        { key: 'viral-scripts', name: '爆款脚本', count: viralScriptCount },
      ],
      materials: [
        { key: 'scene', name: '场景库', count: countBy((asset) =>
          asset.category !== 'product-frame-library' && (asset.category === 'scene' || asset.type === 'image')
        ) },
        { key: 'role', name: '角色库', count: countBy((asset) => asset.category === 'role') },
        { key: 'prop', name: '道具库', count: countBy((asset) => asset.category === 'prop') },
        { key: 'document', name: '文件库', count: countBy((asset) =>
          asset.category !== 'product-frame-library' && asset.type === 'document'
        ) },
        { key: 'pose', name: '姿势库', count: countBy((asset) => asset.category === 'pose') },
        { key: 'effect', name: '特效库', count: countBy((asset) => asset.category === 'effect' || asset.type === 'video') },
        { key: 'expression', name: '表情库', count: countBy((asset) => asset.category === 'expression') },
        { key: 'style', name: '风格库', count: countBy((asset) => asset.category === 'style') },
        { key: 'voice', name: '音色库', count: countBy((asset) => asset.category === 'voice') },
        { key: 'sound', name: '音效库', count: countBy((asset) => asset.type === 'audio') },
      ],
      productFrames: [
        {
          key: 'product-frames',
          name: '我的产品画面',
          count: countBy((asset) => asset.category === 'product-frame-library'),
        },
      ],
      works: [
        { key: 'image', name: '图片作品', count: works.filter((asset) => asset.type === 'image').length },
        { key: 'video', name: '视频作品', count: works.filter((asset) => asset.type === 'video').length },
        { key: 'audio', name: '音频作品', count: works.filter((asset) => asset.type === 'audio').length },
        { key: 'document', name: '文档作品', count: works.filter((asset) => asset.type === 'document').length },
      ],
    };
  }, [assets, briefLibrary?.total, scripts.length, viralScriptCount]);

  const folders = foldersByView[activeView];
  const selectedFolder = folders.find((folder) => folder.key === selectedFolderKey) || null;
  const visibleFolders = selectedFolder ? [selectedFolder] : folders;
  const briefProjectFolders = useMemo<AssetFolder[]>(
    () => (briefLibrary?.projects || []).map((project) => ({
      key: project.projectId,
      name: project.projectName,
      count: project.briefs.length,
    })),
    [briefLibrary],
  );
  const selectedBriefProject = briefProjectFolders.find((folder) => folder.key === selectedBriefProjectId) || null;
  const selectedBriefProjectData = briefLibrary?.projects.find(
    (project) => project.projectId === selectedBriefProjectId,
  );
  const visibleProjectBriefs = selectedBriefProjectData?.briefs || [];

  const handleLibraryClick = (view: LibraryView) => {
    setActiveView(view);
    setSelectedFolderKey(null);
    setSelectedBriefProjectId(null);
    setExpandedViews((current) => ({ ...current, [view]: !current[view] }));
  };

  const createAssetBriefSharePack = async () => {
    if (!selectedAssetBriefIds.length) return message.warning('请选择 Brief');
    try {
      const pack = await briefApi.createSharePack(selectedAssetBriefIds, 'read');
      await navigator.clipboard.writeText(new URL(pack.shareUrl, window.location.origin).toString());
      setSelectedAssetBriefIds([]); setIsAssetBriefShareMode(false);
      message.success('Brief 分享包链接已复制');
    } catch { message.error('创建分享包失败：只能分享自己可管理的 Brief'); }
  };

  const removeBriefsFromLibrary = (briefIds: string[]) => {
    const removedIds = new Set(briefIds);
    setBriefLibrary((current) => {
      if (!current) return current;
      const projects = current.projects
        .map((project) => ({ ...project, briefs: project.briefs.filter((brief) => !removedIds.has(brief.id)) }))
        .filter((project) => project.briefs.length > 0);
      const total = new Set(projects.flatMap((project) => project.briefs.map((brief) => brief.id))).size;
      return { ...current, projects, total };
    });
  };

  const deleteAssetBriefs = (briefs: BriefAssetItem[]) => {
    const ownedBriefs = briefs.filter((brief) => brief.ownedByCurrentUser === true);
    if (!ownedBriefs.length) return message.warning('请选择自己创建的 Brief');
    Modal.confirm({
      title: ownedBriefs.length === 1 ? '确认删除这份 Brief？' : `确认删除选中的 ${ownedBriefs.length} 份 Brief？`,
      content: '删除后会从所有项目和分享记录中移除；历史脚本仍保留生成时的 Brief 快照。',
      okText: ownedBriefs.length === 1 ? '确认删除' : '批量删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        await Promise.all(ownedBriefs.map((brief) => briefApi.delete(brief.id)));
        removeBriefsFromLibrary(ownedBriefs.map((brief) => brief.id));
        setSelectedAssetBriefIds([]);
        setIsAssetBriefDeleteMode(false);
        message.success(`已删除 ${ownedBriefs.length} 份 Brief`);
      },
    });
  };
  const openBrief = (brief: BriefAssetItem) => {
    const params = new URLSearchParams({
      projectId: brief.projectId,
      step: 'selling-points',
      briefId: brief.id,
      briefDialog: '1',
      briefOrigin: 'assets',
      assetProjectId: brief.projectId,
    });
    navigate(`/workspace?${params.toString()}`);
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

  const renderFolderContents = () => {
    if (selectedFolderKey === 'mine-briefs' && !selectedBriefProjectId) {
      if (briefsLoading) return <p className="assets-record-empty">正在加载 Brief 项目…</p>;
      if (briefLoadFailed) return <p className="assets-record-empty">Brief 项目加载失败，请刷新后重试</p>;
      return (
        <section className="assets-folder-grid" aria-label="Brief 项目文件夹">
          {briefProjectFolders.map((folder) => (
            <button className="assets-folder-card" type="button" key={folder.key} onClick={() => setSelectedBriefProjectId(folder.key)}>
              <span className="assets-folder-art" aria-hidden="true"><i /></span>
              <strong>{folder.name}</strong>
              <small>共 {folder.count ?? 0} 份 Brief</small>
            </button>
          ))}
          {!briefProjectFolders.length && <p className="assets-record-empty">暂无 Brief 项目</p>}
        </section>
      );
    }

    if (selectedFolderKey === 'mine-briefs') {
      if (briefsLoading) return <p className="assets-record-empty">正在加载当前项目 Brief…</p>;
      if (briefLoadFailed) return <p className="assets-record-empty">当前项目 Brief 加载失败，请刷新后重试</p>;
      return (
        <section className="assets-record-grid" aria-label={`${selectedBriefProject?.name || '当前项目'}的 Brief`}>
          {visibleProjectBriefs.map((brief) => {
            const selectionMode = isAssetBriefShareMode || isAssetBriefDeleteMode;
            const selected = selectedAssetBriefIds.includes(brief.id);
            return (
            <article className={`assets-record-card ${selectionMode && selected ? 'is-selected' : ''}`} key={brief.id} role="button" tabIndex={0} onClick={() => selectionMode ? setSelectedAssetBriefIds((current) => current.includes(brief.id) ? current.filter((id) => id !== brief.id) : [...current, brief.id]) : openBrief(brief)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectionMode ? setSelectedAssetBriefIds((current) => current.includes(brief.id) ? current.filter((id) => id !== brief.id) : [...current, brief.id]) : openBrief(brief); } }}>
              <span className="assets-record-icon"><FormOutlined /></span>
              <span className="assets-record-copy">
                <strong>{brief.productName || brief.name || '未命名 Brief'}</strong>
                <small>{brief.productModel || 'Brief'}</small>
                <em>更新于 {formatDateTime(brief.updatedAt)}</em>
              </span>
              {selectionMode ? <span className={`assets-brief-check ${selected ? 'is-checked' : ''}`}>{selected ? <CheckOutlined /> : null}</span> : brief.ownedByCurrentUser === true ? <button type="button" className="assets-brief-delete" aria-label={`删除 ${brief.productName || brief.name || 'Brief'}`} onClick={(event) => { event.stopPropagation(); deleteAssetBriefs([brief]); }}><DeleteOutlined /></button> : <RightOutlined />}
            </article>
            );
          })}
          {!visibleProjectBriefs.length && <p className="assets-record-empty">当前项目暂无 Brief</p>}
        </section>
      );
    }
    if (selectedFolderKey === 'mine-scripts') {
      return (
        <section className="assets-record-grid" aria-label="全部脚本">
          {scripts.map((script) => (
            <button className="assets-record-card" type="button" key={script.id} onClick={() => openScript(script)}>
              <span className="assets-record-icon"><FileTextOutlined /></span>
              <span className="assets-record-copy">
                <strong>{script.name || '未命名脚本'}</strong>
                <small>{script.type} · {script.status}</small>
                <em>更新于 {formatDateTime(script.updatedAt)}</em>
              </span>
              <RightOutlined />
            </button>
          ))}
          {!scripts.length && <p className="assets-record-empty">暂无脚本</p>}
        </section>
      );
    }
    if (activeView === 'materials' && selectedFolderKey === 'document') {
      const fileAssets = assets.filter((asset) =>
        asset.type === 'document' && asset.category !== 'product-frame-library'
      );
      return (
        <section className="assets-record-grid" aria-label="文件库">
          {fileAssets.map((asset) => (
            <article className="assets-record-card" key={asset.id}>
              <span className="assets-record-icon"><FileTextOutlined /></span>
              <span className="assets-record-copy">
                <strong>{asset.name}</strong>
                <small>{asset.mimeType || (asset.type === 'image' ? '图片文件' : '文档/表格')}</small>
                <em>{asset.category === 'product-frame-library' ? '原始文件 · 只读' : asset.status || '可用'}</em>
              </span>
            </article>
          ))}
          {!fileAssets.length && <p className="assets-record-empty">文件库暂无文件</p>}
        </section>
      );
    }
    if (activeView === 'productFrames' && selectedFolderKey === 'product-frames') {
      const productFrameAssets = assets.filter((asset) => asset.category === 'product-frame-library');
      return (
        <section className="assets-record-grid" aria-label="我的产品画面">
          {productFrameAssets.map((asset) => (
            <article className="assets-record-card" key={asset.id}>
              <span className="assets-record-icon">
                {asset.type === 'image' ? <PictureOutlined /> : <FileTextOutlined />}
              </span>
              <span className="assets-record-copy">
                <strong>{asset.name}</strong>
                <small>{asset.mimeType || (asset.type === 'image' ? '图片文件' : '表格文件')}</small>
                <em>原始文件 · 只读</em>
              </span>
            </article>
          ))}
          {!productFrameAssets.length && <p className="assets-record-empty">产品画面库暂无文件</p>}
        </section>
      );
    }

    return (
      <section className="assets-folder-grid" aria-label={`${LIBRARY_LABELS[activeView]}文件夹`}>
        {visibleFolders.map((folder) => (
          <button className="assets-folder-card" type="button" key={folder.key} onClick={() => setSelectedFolderKey(folder.key)}>
            <span className="assets-folder-art" aria-hidden="true">
              <i />
            </span>
            <strong>{folder.name}</strong>
            <small>共{folder.count === null ? '--' : folder.count}项</small>
          </button>
        ))}
      </section>
    );
  };

  return (
    <main className="prototype-home assets-library-shell">
      <HomeRail
        activeLabel="资产管理"
        onCreate={() => navigate('/workspace')}
        onHome={() => navigate('/home')}
        onProjects={() => navigate('/projects')}
        onAssets={() => undefined}
      />

      <section className="assets-library-layout">
        <aside className="assets-library-sidebar">
          <header>资产管理</header>
          <nav aria-label="资产分类">
            {LIBRARY_ORDER.map((view) => (
              <div className="assets-library-tree-group" key={view}>
                <button
                  className={`assets-library-parent-button${activeView === view ? ' active' : ''}${expandedViews[view] ? ' expanded' : ''}`}
                  type="button"
                  aria-expanded={expandedViews[view]}
                  onClick={() => handleLibraryClick(view)}
                >
                  <CaretRightFilled />
                  <FolderFilled />
                  <span>{LIBRARY_LABELS[view]}</span>
                </button>
                {expandedViews[view] && (
                  <div className="assets-library-subtree">
                    {foldersByView[view].map((folder) => (
                      <button
                        className={activeView === view && selectedFolderKey === folder.key ? 'active' : ''}
                        type="button"
                        key={folder.key}
                        onClick={() => {
                          setActiveView(view);
                          setSelectedFolderKey(folder.key);
                          setSelectedBriefProjectId(null);
                        }}
                      >
                        <FolderFilled />
                        <span>{folder.name}</span>
                        <small>{folder.count === null ? '--' : folder.count}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        <section className="assets-library-content">
          <header className="assets-library-topbar">
            <MenuFoldOutlined />
            <strong>资产管理</strong>
          </header>
          <div className="assets-library-body">
            <p className="assets-library-eyebrow">资产管理</p>
            {selectedBriefProject && (
              <button className="assets-library-back" type="button" onClick={() => setSelectedBriefProjectId(null)}>
                <LeftOutlined /> 返回项目文件夹
              </button>
            )}
            <div className="assets-brief-title-row">
              <h1>{selectedBriefProject?.name || selectedFolder?.name || LIBRARY_LABELS[activeView]}</h1>
              {selectedBriefProject ? <div className="assets-brief-share-tools">
                <button type="button" onClick={() => { setIsAssetBriefShareMode((current) => !current); setIsAssetBriefDeleteMode(false); setSelectedAssetBriefIds([]); }}><ShareAltOutlined />{isAssetBriefShareMode ? '取消选择' : '批量分享'}</button>
                <button type="button" className="danger" onClick={() => { setIsAssetBriefDeleteMode((current) => !current); setIsAssetBriefShareMode(false); setSelectedAssetBriefIds([]); }}><DeleteOutlined />{isAssetBriefDeleteMode ? '取消选择' : '批量删除'}</button>
                {(isAssetBriefShareMode || isAssetBriefDeleteMode) ? <>
                  <button type="button" onClick={() => { const selectable = isAssetBriefDeleteMode ? visibleProjectBriefs.filter((brief) => brief.ownedByCurrentUser === true) : visibleProjectBriefs; setSelectedAssetBriefIds(selectedAssetBriefIds.length === selectable.length ? [] : selectable.map((brief) => brief.id)); }}>全选</button>
                  {isAssetBriefShareMode ? <button type="button" onClick={createAssetBriefSharePack} disabled={!selectedAssetBriefIds.length}>共享 {selectedAssetBriefIds.length} 份 Brief</button> : null}
                  {isAssetBriefDeleteMode ? <button type="button" className="danger" onClick={() => deleteAssetBriefs(visibleProjectBriefs.filter((brief) => selectedAssetBriefIds.includes(brief.id)))} disabled={!selectedAssetBriefIds.length}>删除 {selectedAssetBriefIds.length} 份 Brief</button> : null}
                </> : null}
              </div> : null}
            </div>
            {renderFolderContents()}
          </div>
        </section>
      </section>
    </main>
  );
};

export default AssetsPage;
