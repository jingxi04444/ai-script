import { useEffect, useRef, useState } from 'react';
import CanvasIcon from '../CanvasIcon';
import { DIRECTOR_ACTOR_PRESETS, DIRECTOR_CAMERA_PRESETS, DIRECTOR_RATIOS, DIRECTOR_TOOLS, getDirectorCameraPresetIndex, type DirectorTool } from './directorLibraryConfig';
import type { DirectorCamera, DirectorObject, DirectorObjectKind, DirectorScene, DirectorVector3 } from './directorScene';
import './director-library.css';

interface DirectorLibraryProps {
  scene: DirectorScene;
  selectedId: string | null;
  collapsed: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  saveState: string;
  images: { id: string; name: string; url: string }[];
  onClose: () => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onSelect: (id: string | null) => void;
  onPreview: (id: string) => void;
  onObjectChange: (id: string, patch: Partial<DirectorObject>) => void;
  onCameraChange: (id: string, patch: Partial<DirectorCamera>) => void;
  onDuplicateItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onSceneChange: (patch: Partial<DirectorScene>) => void;
  onAddActor: (name: string, scale: DirectorVector3) => void;
  onAddCrowd: () => void;
  onAddObject: (kind: DirectorObjectKind) => void;
  onAddCamera: (index: number) => void;
  onUploadPanorama: (file?: File) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onImport: (file?: File) => void;
  onExport: () => void;
}

export default function DirectorLibrary(props: DirectorLibraryProps) {
  const { scene } = props;
  const [panel, setPanel] = useState<Exclude<DirectorTool, 'recognition'>>('scene');
  const [search, setSearch] = useState('');
  const [geometryOpen, setGeometryOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const cameraChoice = getDirectorCameraPresetIndex(scene.cameras.find(camera => camera.id === scene.activeCameraId));
  const [overlay, setOverlay] = useState<'recognition' | 'help' | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayTrigger = useRef<HTMLElement | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const title = DIRECTOR_TOOLS.find(tool => tool.key === panel)?.label;

  useEffect(() => {
    if (!overlay) return;
    overlayRef.current?.focus();
    return () => overlayTrigger.current?.focus();
  }, [overlay]);
  useEffect(() => {
    if (!contextMenu) return;
    contextMenuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const dismiss = (event: PointerEvent) => { if (!contextMenuRef.current?.contains(event.target as Node)) setContextMenu(null); };
    const dismissOnScroll = () => setContextMenu(null);
    const dismissOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setContextMenu(null); }
    };
    document.addEventListener('pointerdown', dismiss, true);
    document.addEventListener('keydown', dismissOnKey, true);
    window.addEventListener('resize', dismissOnScroll);
    window.addEventListener('scroll', dismissOnScroll, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss, true);
      document.removeEventListener('keydown', dismissOnKey, true);
      window.removeEventListener('resize', dismissOnScroll);
      window.removeEventListener('scroll', dismissOnScroll, true);
    };
  }, [contextMenu]);
  const openContextMenu = (id: string, x: number, y: number) => {
    if (props.busy) return;
    props.onSelect(id);
    setContextMenu({ id, x: Math.max(8, Math.min(x, window.innerWidth - 174)), y: Math.max(8, Math.min(y, window.innerHeight - 198)) });
  };
  const menuCamera = scene.cameras.find(camera => camera.id === contextMenu?.id);
  const menuObject = scene.objects.find(object => object.id === contextMenu?.id);
  const menuItem = menuCamera ?? menuObject;
  const menuAction = (action: () => void) => { action(); setContextMenu(null); };
  const openOverlay = (type: 'recognition' | 'help') => {
    overlayTrigger.current = document.activeElement as HTMLElement | null;
    setOverlay(type);
  };
  const navigate = (tool: DirectorTool) => {
    if (tool === 'recognition') { openOverlay('recognition'); return; }
    setPanel(tool);
    props.onCollapsedChange(false);
  };

  return <>
    <section className="director-left-panel">
      <header className="director-left-heading">
        <button aria-label="返回画布" title="返回画布" disabled={props.busy} onClick={props.onClose}><CanvasIcon name="CloseOutlined" /></button>
        <strong>3D导演台</strong>
        <button aria-label={props.collapsed ? '展开场景面板' : '收起场景面板'} title="切换场景面板" onClick={() => props.onCollapsedChange(!props.collapsed)}><CanvasIcon name="Assets" /></button>
      </header>
      <nav className="director-tool-rail" aria-label="导演台工具">
        {DIRECTOR_TOOLS.map(tool => <button key={tool.key} aria-label={tool.label} aria-pressed={tool.key === 'recognition' ? overlay === 'recognition' : !props.collapsed && panel === tool.key} onClick={() => navigate(tool.key)}>
          <CanvasIcon name={tool.icon} /><span className="director-tool-tooltip">{tool.label}</span>
        </button>)}
        <button className="director-help-tool" aria-label="帮助" aria-haspopup="dialog" onClick={() => openOverlay('help')}><CanvasIcon name="QuestionCircleOutlined" /><span className="director-tool-tooltip">帮助</span></button>
      </nav>
      <aside className="director-library" aria-label="导演台场景资源">
        <header className="director-panel-heading"><span>{title}</span></header>
        <div className="director-library-content">
          {panel === 'scene' ? <>
            <label className="director-scene-search"><input aria-label="搜索场景对象" placeholder="请输入搜索内容" value={search} onChange={event => setSearch(event.target.value)} /><CanvasIcon name="Search" /></label>
            <div className="director-object-tree">
              {scene.cameras.filter(camera => camera.name.includes(search)).map(camera => <div className={`director-tree-item${props.selectedId === camera.id ? ' is-selected' : ''}${!camera.visible ? ' is-hidden' : ''}`} key={camera.id} onContextMenu={event => { event.preventDefault(); openContextMenu(camera.id, event.clientX, event.clientY); }}>
                <button className="director-tree-select" title={`预览${camera.name}，右键查看更多操作`} onClick={() => props.onPreview(camera.id)} onKeyDown={event => { if (event.key === 'F10' && event.shiftKey) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); openContextMenu(camera.id, rect.left + 12, rect.bottom); } }}><CanvasIcon name="VideoCameraOutlined" /><span>{camera.name}</span></button>
                <button aria-label={`预览${camera.name}`} title={`预览${camera.name}`} onClick={() => props.onPreview(camera.id)}><CanvasIcon name="Visibility" /></button>
              </div>)}
              {scene.objects.filter(object => object.name.includes(search)).map(object => <div className={`director-tree-item${props.selectedId === object.id ? ' is-selected' : ''}${!object.visible ? ' is-hidden' : ''}`} key={object.id} onContextMenu={event => { event.preventDefault(); openContextMenu(object.id, event.clientX, event.clientY); }}>
                <button className="director-tree-select" title={`${object.name}，右键查看更多操作`} onClick={() => props.onSelect(object.id)} onKeyDown={event => { if (event.key === 'F10' && event.shiftKey) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); openContextMenu(object.id, rect.left + 12, rect.bottom); } }}><CanvasIcon name={object.kind === 'actor' ? 'DirectorActor' : 'Cube'} /><span>{object.name}</span></button>
                <button aria-label={`${object.visible ? '隐藏' : '显示'}${object.name}`} onClick={() => props.onObjectChange(object.id, { visible: !object.visible })}><CanvasIcon name={object.visible ? 'Visibility' : 'EyeInvisibleOutlined'} /></button>
                <button aria-label={`${object.locked ? '解锁' : '锁定'}${object.name}`} onClick={() => props.onObjectChange(object.id, { locked: !object.locked })}><CanvasIcon name={object.locked ? 'LockOutlined' : 'UnlockOutlined'} /></button>
              </div>)}
              {!scene.cameras.some(camera => camera.name.includes(search)) && !scene.objects.some(object => object.name.includes(search)) ? <p className="director-library-hint">没有匹配的场景对象</p> : null}
            </div>
          </> : null}
          {panel === 'actors' ? <div className="director-list-menu">
            <button disabled title="尚未接入 GLB / FBX 模型导入"><CanvasIcon name="UploadOutlined" />本地上传<small>未接入</small></button>
            {DIRECTOR_ACTOR_PRESETS.map(preset => <button key={preset.name} onClick={() => props.onAddActor(preset.name, preset.scale)}><CanvasIcon name="DirectorActor" />{preset.name}</button>)}
            <button disabled title="二头身角色资产尚未接入"><CanvasIcon name="DirectorActor" />二头身<small>未接入</small></button>
            <button onClick={props.onAddCrowd}><CanvasIcon name="DirectorActor" />群众 (3x3)</button>
            <button aria-expanded={geometryOpen} onClick={() => setGeometryOpen(value => !value)}><CanvasIcon name="Cube" />几何模型<CanvasIcon name={geometryOpen ? 'DownOutlined' : 'RightOutlined'} /></button>
            {geometryOpen ? <div className="director-geometry-submenu">{([{ kind: 'box', name: '方块', icon: 'Cube' }, { kind: 'sphere', name: '球体', icon: 'Sphere' }, { kind: 'cylinder', name: '圆形展台', icon: 'Cylinder' }, { kind: 'product', name: '产品瓶', icon: 'ProductOutlined' }] as const).map(item => <button key={item.kind} onClick={() => props.onAddObject(item.kind)}><CanvasIcon name={item.icon} />{item.name}</button>)}</div> : null}
            <p className="director-library-hint">角色为可调姿势的基础白模比例预设。</p>
          </div> : null}
          {panel === 'cameras' ? <div className="director-tile-menu">{DIRECTOR_CAMERA_PRESETS.map((preset, index) => <button key={preset.name} aria-pressed={cameraChoice === index} disabled={props.busy} title={`新增并预览${preset.name}机位`} onClick={() => props.onAddCamera(index)}><CanvasIcon name="CameraOutlined" /><span>{preset.name}</span></button>)}</div> : null}
          {panel === 'panorama' ? <div className="director-list-menu">
            <button onClick={() => imageInput.current?.click()}><CanvasIcon name="UploadOutlined" />本地上传</button>
            <button aria-expanded={imagePickerOpen} onClick={() => setImagePickerOpen(value => !value)}><CanvasIcon name="HistoryOutlined" />历史记录</button>
            <button disabled title="全景图 AI 生成尚未接入"><CanvasIcon name="RobotOutlined" />AI生成<small>未接入</small></button>
            {imagePickerOpen ? <div className="director-panorama-picker"><p className="director-library-hint">从当前画布已导入或生成的图片选择</p>{props.images.length ? props.images.map(image => <button key={image.id} disabled={image.url.length > 1_000_000} title={image.url.length > 1_000_000 ? '图片过大，请使用本地上传自动压缩' : image.name} onClick={() => props.onSceneChange({ panoramaUrl: image.url })}><img src={image.url} alt="" /><span>{image.name}</span></button>) : <p className="director-library-hint">暂无图片，请先上传。</p>}</div> : null}
            {scene.panoramaUrl ? <div className="director-panorama-preview"><img src={scene.panoramaUrl} alt="已应用的全景背景" /><button onClick={() => props.onSceneChange({ panoramaUrl: undefined })}><CanvasIcon name="CloseOutlined" />移除背景</button></div> : null}
            <p className="director-library-hint">建议使用 2:1 等距柱状全景图。普通图片环绕显示时会变形。</p>
          </div> : null}
          {panel === 'ratio' ? <div className="director-tile-menu">{DIRECTOR_RATIOS.map(ratio => <button key={ratio.value} aria-pressed={scene.aspectRatio === ratio.value} onClick={() => props.onSceneChange({ aspectRatio: ratio.value })}><span className={`director-ratio-glyph ${ratio.className}`} aria-hidden="true" /><span>{ratio.label}</span></button>)}</div> : null}
        </div>
        {panel === 'scene' ? <div className="director-library-status" role="status"><CanvasIcon name="CheckOutlined" />{props.saveState}</div> : null}
      </aside>
    </section>
    {contextMenu && menuItem ? <div className="director-context-menu" ref={contextMenuRef} role="menu" aria-label={`${menuItem.name}操作`} style={{ left: contextMenu.x, top: contextMenu.y }} onContextMenu={event => event.preventDefault()}>
      <button role="menuitem" disabled title="单个对象暂不支持编组"><CanvasIcon name="LayoutOutlined" />打组</button>
      <button role="menuitem" onClick={() => menuAction(() => menuCamera ? props.onCameraChange(menuItem.id, { visible: !menuItem.visible }) : props.onObjectChange(menuItem.id, { visible: !menuItem.visible }))}><CanvasIcon name={menuItem.visible ? 'EyeInvisibleOutlined' : 'Visibility'} />{menuItem.visible ? '隐藏' : '显示'}</button>
      <button role="menuitem" onClick={() => menuAction(() => menuCamera ? props.onCameraChange(menuItem.id, { locked: !menuItem.locked }) : props.onObjectChange(menuItem.id, { locked: !menuItem.locked }))}><CanvasIcon name={menuItem.locked ? 'UnlockOutlined' : 'LockOutlined'} />{menuItem.locked ? '解锁' : '锁定'}</button>
      <button role="menuitem" disabled={menuCamera ? scene.cameras.length >= 16 : scene.objects.length >= 100} onClick={() => menuAction(() => props.onDuplicateItem(menuItem.id))}><CanvasIcon name="CopyOutlined" />创建副本</button>
      <button role="menuitem" className="is-danger" disabled={menuItem.locked || Boolean(menuCamera && scene.cameras.length <= 1)} title={menuCamera && scene.cameras.length <= 1 ? '至少保留一个机位' : menuItem.locked ? '请先解锁' : undefined} onClick={() => menuAction(() => props.onDeleteItem(menuItem.id))}><CanvasIcon name="DeleteOutlined" />删除</button>
    </div> : null}
    <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => { props.onUploadPanorama(event.target.files?.[0]); event.target.value = ''; }} />
    <input ref={projectInput} type="file" accept=".json,application/json" hidden onChange={event => { props.onImport(event.target.files?.[0]); event.target.value = ''; }} />
    {overlay ? <div className="director-library-overlay" onClick={event => { if (event.target === event.currentTarget) setOverlay(null); }}>
      <div className="director-library-dialog" ref={overlayRef} role="dialog" aria-modal="true" aria-label={overlay === 'help' ? '导演台帮助' : 'AI 识图导入'} tabIndex={-1} onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); setOverlay(null); }
        if (event.key === 'Tab') {
          const controls = Array.from(overlayRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || []);
          const last = controls[controls.length - 1];
          if (event.shiftKey && (document.activeElement === controls[0] || document.activeElement === overlayRef.current)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); controls[0]?.focus(); }
        }
      }}>
        <header><span>{overlay === 'help' ? '导演台帮助' : 'AI 识图导入'}</span><button aria-label="关闭弹窗" onClick={() => setOverlay(null)}><CanvasIcon name="CloseOutlined" /></button></header>
        {overlay === 'recognition' ? <div className="director-library-dialog-body"><CanvasIcon name="DirectorImage" /><h3>AI 站位识别尚未接入</h3><p>这项功能需要视觉模型识别人物、空间和机位，再将站位参考导入 3D 场景。当前不会提交任务，也不会消耗积分。</p><button onClick={() => { setOverlay(null); navigate('panorama'); }}>先添加全景背景</button></div> : <div className="director-library-dialog-body">
          <p>左键拖动旋转视角，右键平移，滚轮缩放。选中对象后可以移动、旋转、缩放，并在右侧调节姿势。动画时间轴和截图在舞台底部。</p>
          <p>添加机位预设、点击场景中的机位名称或切换活动机位，会直接预览该机位画面。点击顶部“导演视角”返回编辑，原编辑视角保持不变。</p>
          <p>底部可以输入布局指令，例如“产品放中央，角色站右侧，机位俯拍”，按回车预览调整，Shift + 回车换行。当前使用本地规则调整对象与机位；添加的参考图只在本机预览，尚不参与视觉识别。</p>
          <dl><dt>撤销 / 重做</dt><dd>⌘ / Ctrl + Z · ⇧ + ⌘ / Ctrl + Z</dd><dt>删除选中对象</dt><dd>Delete / Backspace</dd><dt>添加关键帧</dt><dd>K</dd></dl>
          <h3>工程操作</h3><label className="director-field">场景名称<input aria-label="场景名称" maxLength={100} value={scene.name} onChange={event => props.onSceneChange({ name: event.target.value })} /></label><div className="director-project-actions">
            <button disabled={!props.canUndo || props.busy} onClick={props.onUndo}><CanvasIcon name="UndoOutlined" />撤销</button>
            <button disabled={!props.canRedo || props.busy} onClick={props.onRedo}><CanvasIcon name="RedoOutlined" />重做</button>
            <button disabled={props.busy} onClick={props.onSave}><CanvasIcon name="SaveOutlined" />保存项目</button>
            <button onClick={() => projectInput.current?.click()}><CanvasIcon name="UploadOutlined" />导入工程</button>
            <button onClick={props.onExport}><CanvasIcon name="DownloadOutlined" />导出工程</button>
          </div><p role="status">{props.saveState}</p>
        </div>}
      </div>
    </div> : null}
  </>;
}
