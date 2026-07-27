import { useEffect, useMemo, useState } from 'react';
import { CaretRightFilled, FileTextOutlined, FolderFilled, FormOutlined, MenuFoldOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { assetApi } from '../../api/asset';
import { briefApi } from '../../api/brief';
import { scriptApi } from '../../api/script';
import HomeRail from '../../components/Layout/HomeRail';
import type { Asset } from '../../types/asset';
import type { Brief } from '../../types/brief';
import type { Script } from '../../types/script';
import { formatDateTime } from '../../utils/format';
import './assets-page.css';

type LibraryView = 'briefs' | 'scripts' | 'materials' | 'works';

interface AssetFolder {
  key: string;
  name: string;
  count: number | null;
}

const LIBRARY_LABELS: Record<LibraryView, string> = {
  briefs: 'Brief库',
  scripts: '脚本库',
  materials: '素材库',
  works: '我的作品',
};

const LIBRARY_ORDER: LibraryView[] = ['briefs', 'scripts', 'materials', 'works'];

const AssetsPage = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<LibraryView>('briefs');
  const [expandedViews, setExpandedViews] = useState<Record<LibraryView, boolean>>({
    briefs: true,
    scripts: false,
    materials: false,
    works: false,
  });
  const [selectedFolderKey, setSelectedFolderKey] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [viralScriptCount, setViralScriptCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      assetApi.list({ page: 1, pageSize: 200 }),
      briefApi.mineList(),
      scriptApi.mineList(),
      assetApi.viralAssets({ page: 1, pageSize: 1 }),
    ]).then(([assetResult, briefResult, scriptResult, viralResult]) => {
      if (cancelled) return;
      setAssets(assetResult.status === 'fulfilled' ? assetResult.value.list || [] : []);
      setBriefs(briefResult.status === 'fulfilled' ? briefResult.value : []);
      setScripts(scriptResult.status === 'fulfilled' ? scriptResult.value : []);
      setViralScriptCount(viralResult.status === 'fulfilled' ? viralResult.value.total || 0 : 0);
    });
    return () => { cancelled = true; };
  }, []);

  const foldersByView = useMemo<Record<LibraryView, AssetFolder[]>>(() => {
    const countBy = (predicate: (asset: Asset) => boolean) => assets.filter(predicate).length;
    const works = assets.filter((asset) => asset.category === 'project' || asset.category === 'upload');
    return {
      briefs: [{ key: 'mine-briefs', name: '我的Brief', count: briefs.length }],
      scripts: [
        { key: 'mine-scripts', name: '我的脚本', count: scripts.length },
        { key: 'viral-scripts', name: '爆款脚本', count: viralScriptCount },
      ],
      materials: [
        { key: 'scene', name: '场景库', count: countBy((asset) => asset.category === 'scene' || asset.type === 'image') },
        { key: 'role', name: '角色库', count: countBy((asset) => asset.category === 'role') },
        { key: 'prop', name: '道具库', count: countBy((asset) => asset.category === 'prop') },
        { key: 'document', name: '文件库', count: countBy((asset) => asset.type === 'document') },
        { key: 'pose', name: '姿势库', count: countBy((asset) => asset.category === 'pose') },
        { key: 'effect', name: '特效库', count: countBy((asset) => asset.category === 'effect' || asset.type === 'video') },
        { key: 'expression', name: '表情库', count: countBy((asset) => asset.category === 'expression') },
        { key: 'style', name: '风格库', count: countBy((asset) => asset.category === 'style') },
        { key: 'voice', name: '音色库', count: countBy((asset) => asset.category === 'voice') },
        { key: 'sound', name: '音效库', count: countBy((asset) => asset.type === 'audio') },
      ],
      works: [
        { key: 'image', name: '图片作品', count: works.filter((asset) => asset.type === 'image').length },
        { key: 'video', name: '视频作品', count: works.filter((asset) => asset.type === 'video').length },
        { key: 'audio', name: '音频作品', count: works.filter((asset) => asset.type === 'audio').length },
        { key: 'document', name: '文档作品', count: works.filter((asset) => asset.type === 'document').length },
      ],
    };
  }, [assets, briefs.length, scripts.length, viralScriptCount]);

  const folders = foldersByView[activeView];
  const selectedFolder = folders.find((folder) => folder.key === selectedFolderKey) || null;
  const visibleFolders = selectedFolder ? [selectedFolder] : folders;

  const handleLibraryClick = (view: LibraryView) => {
    setActiveView(view);
    setSelectedFolderKey(null);
    setExpandedViews((current) => ({ ...current, [view]: !current[view] }));
  };

  const openBrief = (brief: Brief) => {
    const params = new URLSearchParams({
      step: 'selling-points',
      briefId: brief.id,
      briefDialog: '1',
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
    if (selectedFolderKey === 'mine-briefs') {
      return (
        <section className="assets-record-grid" aria-label="全部 Brief">
          {briefs.map((brief) => (
            <button className="assets-record-card" type="button" key={brief.id} onClick={() => openBrief(brief)}>
              <span className="assets-record-icon"><FormOutlined /></span>
              <span className="assets-record-copy">
                <strong>{brief.productName || brief.name || '未命名 Brief'}</strong>
                <small>{brief.productModel || 'Brief'}</small>
                <em>更新于 {formatDateTime(brief.updatedAt)}</em>
              </span>
              <RightOutlined />
            </button>
          ))}
          {!briefs.length && <p className="assets-record-empty">暂无 Brief</p>}
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
            <h1>{selectedFolder?.name || LIBRARY_LABELS[activeView]}</h1>
            {renderFolderContents()}
          </div>
        </section>
      </section>
    </main>
  );
};

export default AssetsPage;
