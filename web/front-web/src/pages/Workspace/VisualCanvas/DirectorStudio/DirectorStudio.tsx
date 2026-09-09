import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import {
  ArrowLeftOutlined, ArrowRightOutlined, CameraOutlined, CheckOutlined, CloseOutlined,
  CopyOutlined, DownloadOutlined, EyeInvisibleOutlined, EyeOutlined, FullscreenOutlined,
  LockOutlined, PlusOutlined, RedoOutlined, SaveOutlined, SettingOutlined,
  UndoOutlined, UnlockOutlined, UploadOutlined, UserOutlined, VideoCameraOutlined,
  AppstoreOutlined, LoadingOutlined, DragOutlined, RetweetOutlined, ExpandOutlined,
} from '@ant-design/icons';
import { fileApi } from '../../../../api/asset';
import { workflowApi } from '../../../../api/workflow';
import { useWorkflowStore } from '../../../../stores/workflowStore';
import { useAuthStore } from '../../../../stores/authStore';
import { createWorkflowNodeData, type WorkflowNode } from '../../../../types/workflow';
import DirectorViewport, { type DirectorViewportHandle } from './DirectorViewport';
import DirectorInspector from './DirectorInspector';
import DirectorTimeline from './DirectorTimeline';
import { useDirectorEditor } from './useDirectorEditor';
import {
  createDirectorCamera, createDirectorId, createDirectorObject, evaluateDirectorCamera,
  evaluateDirectorObject, normalizeDirectorScene,
  type DirectorCamera, type DirectorObject, type DirectorObjectKind, type DirectorScene,
} from './directorScene';
import './director-studio.css';

interface DirectorStudioProps { nodeId: string; onClose: () => void }
const OBJECT_LIBRARY: { kind: DirectorObjectKind; name: string; detail: string }[] = [
  { kind: 'product', name: '产品瓶', detail: '包装主体' },
  { kind: 'actor', name: '人物', detail: '姿势白模' },
  { kind: 'cylinder', name: '圆形展台', detail: '陈列道具' },
  { kind: 'box', name: '方块', detail: '空间搭建' },
  { kind: 'sphere', name: '球体', detail: '构图点缀' },
];
const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable);
const snapTime = (time: number) => Math.round(time * 24) / 24;
function upsertFrame<T extends { time: number }>(frames: T[], frame: T): T[] {
  return [...frames.filter(item => Math.abs(item.time - frame.time) >= 1 / 48), frame].sort((a, b) => a.time - b.time);
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('无法读取截图')); reader.readAsDataURL(blob);
  });
}

export default function DirectorStudio({ nodeId, onClose }: DirectorStudioProps) {
  const [initial] = useState(() => useWorkflowStore.getState().nodes.find(node => node.id === nodeId)?.data.directorScene);
  const { scene, past, future, revision, change, undo, redo } = useDirectorEditor(initial);
  const [selectedId, setSelectedId] = useState<string | null>(scene.activeCameraId);
  const [view, setView] = useState<'director' | 'camera'>('director');
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<'save' | 'capture' | null>(null);
  const [saveState, setSaveState] = useState('正在保存本地草稿');
  const [libraryOpen, setLibraryOpen] = useState(true);
  const viewportRef = useRef<DirectorViewportHandle>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const sceneRef = useRef(scene);
  const onCloseRef = useRef(onClose);
  const mountedRef = useRef(true);
  const operationRef = useRef(false);
  const projectKey = useRef(useWorkflowStore.getState().projectKey);
  sceneRef.current = scene;
  onCloseRef.current = onClose;

  const selectedObject = scene.objects.find(object => object.id === selectedId);
  const selectedCamera = scene.cameras.find(camera => camera.id === selectedId);
  const activeCamera = scene.cameras.find(camera => camera.id === scene.activeCameraId) || scene.cameras[0];
  const evaluatedObject = selectedObject ? evaluateDirectorObject(selectedObject, playhead) : undefined;
  const evaluatedCamera = selectedCamera ? evaluateDirectorCamera(selectedCamera, playhead) : undefined;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    mountedRef.current = true;
    return () => { mountedRef.current = false; document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);

  // Keep workflow JSON in sync immediately; persist to disk on a short debounce.
  useEffect(() => {
    const store = useWorkflowStore.getState();
    if (store.projectKey !== projectKey.current) return;
    store.updateNodeData(nodeId, {
      directorScene: scene, aspectRatio: scene.aspectRatio,
      description: `${scene.objects.length} 个对象 · ${scene.cameras.length} 个机位 · ${scene.duration} 秒预演`,
      ...(revision > 0 ? { outputUrl: undefined, assetUrl: undefined, status: 'idle' as const } : {}),
    });
    setSaveState('正在保存本地草稿');
    const timeout = window.setTimeout(() => {
      try { useWorkflowStore.getState().persist(); setSaveState('草稿已保存到本机'); }
      catch { setSaveState('本地存储已满，请导出工程'); }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [nodeId, revision, scene]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, 0.1); previous = now;
      setPlayhead(current => (current + elapsed) % sceneRef.current.duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const select = useCallback((id: string | null) => {
    if (operationRef.current) return;
    setSelectedId(id);
    if (id && sceneRef.current.cameras.some(camera => camera.id === id)) {
      change(current => current.activeCameraId === id ? current : { ...current, activeCameraId: id });
    }
  }, [change]);
  const patchScene = (patch: Partial<DirectorScene>) => { if (!operationRef.current) change(current => ({ ...current, ...patch })); };
  const patchObject = useCallback((id: string, patch: Partial<DirectorObject>) => {
    if (operationRef.current) return;
    setPlaying(false);
    change(current => ({ ...current, objects: current.objects.map(object => {
      if (object.id !== id || (object.locked && patch.locked !== false && patch.visible === undefined)) return object;
      const transformed = Boolean(patch.position || patch.rotation || patch.scale);
      if (!object.keyframes.length || !transformed) return { ...object, ...patch };
      if (object.keyframes.length >= 240 && !object.keyframes.some(frame => Math.abs(frame.time - snapTime(playhead)) < 1 / 48)) {
        message.warning('单轨最多 240 个关键帧，请先删除不需要的帧'); return object;
      }
      const evaluated = { ...evaluateDirectorObject(object, playhead), ...patch };
      const keyframe = { id: createDirectorId('key'), time: snapTime(playhead), position: evaluated.position, rotation: evaluated.rotation, scale: evaluated.scale };
      return { ...object, keyframes: upsertFrame(object.keyframes, keyframe) };
    }) }));
  }, [change, playhead]);
  const patchCamera = useCallback((id: string, patch: Partial<DirectorCamera>) => {
    if (operationRef.current) return;
    setPlaying(false);
    change(current => ({ ...current, cameras: current.cameras.map(camera => {
      if (camera.id !== id) return camera;
      if (!camera.keyframes.length || !(patch.position || patch.target || patch.fov !== undefined)) return { ...camera, ...patch };
      if (camera.keyframes.length >= 240 && !camera.keyframes.some(frame => Math.abs(frame.time - snapTime(playhead)) < 1 / 48)) {
        message.warning('单轨最多 240 个关键帧，请先删除不需要的帧'); return camera;
      }
      const evaluated = { ...evaluateDirectorCamera(camera, playhead), ...patch };
      const keyframe = { id: createDirectorId('key'), time: snapTime(playhead), position: evaluated.position, target: evaluated.target, fov: evaluated.fov };
      return { ...camera, keyframes: upsertFrame(camera.keyframes, keyframe) };
    }) }));
  }, [change, playhead]);

  const addObject = (kind: DirectorObjectKind) => {
    if (operationRef.current) return;
    if (scene.objects.length >= 100) { message.warning('每个场景最多 100 个对象'); return; }
    const object = createDirectorObject(kind, scene.objects.filter(item => item.kind === kind).length + 1);
    object.position[0] = (scene.objects.length % 4) * 0.7 - 0.7;
    change(current => ({ ...current, objects: [...current.objects, object] })); setSelectedId(object.id); setPlaying(false);
  };
  const addCamera = () => {
    if (operationRef.current) return;
    if (scene.cameras.length >= 16) { message.warning('每个场景最多 16 个机位'); return; }
    const camera = { ...createDirectorCamera(scene.cameras.length + 1), ...viewportRef.current?.getViewCamera() };
    change(current => ({ ...current, cameras: [...current.cameras, camera], activeCameraId: camera.id })); setSelectedId(camera.id);
  };
  const removeSelected = () => {
    if (operationRef.current) return;
    if (selectedObject && !selectedObject.locked) {
      change(current => ({ ...current, objects: current.objects.filter(object => object.id !== selectedId) })); setSelectedId(null);
    } else if (selectedCamera && scene.cameras.length > 1) {
      change(current => { const cameras = current.cameras.filter(camera => camera.id !== selectedId); return { ...current, cameras, activeCameraId: current.activeCameraId === selectedId ? cameras[0].id : current.activeCameraId }; }); setSelectedId(null);
    }
  };
  const duplicate = () => {
    if (operationRef.current) return;
    if (!selectedObject || scene.objects.length >= 100) return;
    const object = { ...selectedObject, id: createDirectorId('object'), name: `${selectedObject.name} 副本`, position: [selectedObject.position[0] + 0.8, selectedObject.position[1], selectedObject.position[2]] as DirectorObject['position'], locked: false, keyframes: [] };
    change(current => ({ ...current, objects: [...current.objects, object] })); setSelectedId(object.id);
  };

  const addKeyframe = () => {
    if (operationRef.current) return;
    if (selectedObject && !selectedObject.locked && evaluatedObject) {
      if (selectedObject.keyframes.length >= 240) { message.warning('单轨最多 240 个关键帧'); return; }
      const frame = { id: createDirectorId('key'), time: snapTime(playhead), position: evaluatedObject.position, rotation: evaluatedObject.rotation, scale: evaluatedObject.scale };
      const frames = !selectedObject.keyframes.length && playhead > 0 ? [{ ...frame, id: createDirectorId('key'), time: 0, position: selectedObject.position, rotation: selectedObject.rotation, scale: selectedObject.scale }] : selectedObject.keyframes;
      patchObject(selectedObject.id, { keyframes: upsertFrame(frames, frame) });
    } else if (selectedCamera && evaluatedCamera) {
      if (selectedCamera.keyframes.length >= 240) { message.warning('单轨最多 240 个关键帧'); return; }
      const frame = { id: createDirectorId('key'), time: snapTime(playhead), position: evaluatedCamera.position, target: evaluatedCamera.target, fov: evaluatedCamera.fov };
      const frames = !selectedCamera.keyframes.length && playhead > 0 ? [{ ...frame, id: createDirectorId('key'), time: 0, position: selectedCamera.position, target: selectedCamera.target, fov: selectedCamera.fov }] : selectedCamera.keyframes;
      patchCamera(selectedCamera.id, { keyframes: upsertFrame(frames, frame) });
    }
  };
  const removeKeyframe = () => {
    if (selectedObject) patchObject(selectedObject.id, { keyframes: selectedObject.keyframes.filter(frame => Math.abs(frame.time - playhead) >= 1 / 48) });
    if (selectedCamera) patchCamera(selectedCamera.id, { keyframes: selectedCamera.keyframes.filter(frame => Math.abs(frame.time - playhead) >= 1 / 48) });
  };
  const cameraPreset = (preset: 'front' | 'detail' | 'overhead' | 'push') => {
    if (operationRef.current) return;
    if (!selectedCamera) return;
    const values: Pick<DirectorCamera, 'position' | 'target' | 'fov'> = preset === 'overhead'
      ? { position: [0.01, 7, 0.01], target: [0, 0.5, 0], fov: 40 }
      : preset === 'detail' ? { position: [0.8, 1.7, 3.2], target: [0, 1.1, 0], fov: 30 }
        : { position: [0, 2.2, 6], target: [0, 1, 0], fov: 40 };
    change(current => ({ ...current, cameras: current.cameras.map(camera => camera.id !== selectedCamera.id ? camera : {
      ...camera, ...values, keyframes: preset === 'push' ? [
        { id: createDirectorId('key'), time: 0, ...values },
        { id: createDirectorId('key'), time: scene.duration, position: [0, 1.65, 3.2], target: [0, 1.1, 0], fov: 40 },
      ] : [],
    }) })); setPlayhead(0); setPlaying(false); setView('camera');
  };

  const persistLocal = () => {
    try { useWorkflowStore.getState().persist(); return true; }
    catch { message.error('本地存储空间不足，请先导出工程 JSON 备份'); return false; }
  };
  const close = () => { if (operationRef.current || !persistLocal()) return; onCloseRef.current(); };
  const saveProject = async () => {
    const current = useWorkflowStore.getState();
    if (current.projectKey !== projectKey.current) throw new Error('当前项目已切换，请在原项目重新打开导演台');
    if (!useAuthStore.getState().isAuthenticated || !current.projectKey || current.projectKey === 'draft' || current.projectKey.startsWith('director-demo')) {
      return false;
    }
    await workflowApi.save(current.projectKey, { name: '产品视频生产工作流', mode: current.mode, graphJson: JSON.stringify({ nodes: current.nodes.map(node => ({ ...node, selected: false })), edges: current.edges.map(edge => ({ ...edge, selected: false })) }) });
    if (mountedRef.current) setSaveState('已同步到项目');
    return true;
  };
  const save = async () => {
    if (operationRef.current) return;
    operationRef.current = true; setBusy('save');
    try {
      const local = persistLocal(); const cloud = await saveProject();
      if (cloud || local) { setSaveState(cloud ? '已同步到项目' : '草稿已保存到本机'); message.success(cloud ? '导演台与画布已保存到项目' : '导演台草稿已保存到当前浏览器'); }
      else setSaveState('保存失败，请导出工程');
    }
    catch { message.warning('云端保存失败，场景仍保留在当前画布，请稍后重试或导出工程'); }
    finally { operationRef.current = false; if (mountedRef.current) setBusy(null); }
  };
  const capture = async (toCanvas: boolean) => {
    if (operationRef.current) return;
    operationRef.current = true; setBusy('capture'); setPlaying(false);
    try {
      const capturedScene = sceneRef.current;
      const capturedTime = playhead;
      if (!viewportRef.current) throw new Error('3D 舞台尚未就绪');
      const blob = await viewportRef.current.capture();
      const name = `${scene.name.replace(/[\\/:*?"<>|]/g, '-')}-${activeCamera.name.replace(/[\\/:*?"<>|]/g, '-')}.png`;
      if (!toCanvas) { download(blob, name); return; }
      const demo = !useAuthStore.getState().isAuthenticated || projectKey.current?.startsWith('director-demo');
      let url: string;
      if (demo) {
        if (blob.size > 600_000) throw new Error('本地截图过大，请下载 PNG，登录后再上传至画布');
        url = await blobToDataUrl(blob);
      } else {
        const result = await fileApi.upload(new File([blob], name, { type: 'image/png' }), 'director');
        url = result.url;
        if (!url) throw new Error('上传未返回图片地址');
      }
      const current = useWorkflowStore.getState();
      const source = current.nodes.find(node => node.id === nodeId);
      if (!source || current.projectKey !== projectKey.current || !mountedRef.current) throw new Error('画布已切换，未写入截图');
      const resultId = createDirectorId('director-frame');
      const resultNode: WorkflowNode = { id: resultId, type: 'workflow', selected: true, position: { x: source.position.x + 370, y: source.position.y + current.edges.filter(edge => edge.source === nodeId).length * 50 }, data: { ...createWorkflowNodeData('result'), title: `${capturedScene.name} · ${activeCamera.name}`, description: `${capturedScene.aspectRatio} · ${capturedTime.toFixed(2)}s · 3D 构图参考`, assetUrl: url, outputUrl: url, aspectRatio: capturedScene.aspectRatio, status: 'success', progress: 100, resourceMeta: demo ? '本地演示截图，真实工作流执行前请登录后重新导出' : '导演台构图参考图' } };
      current.checkpoint();
      useWorkflowStore.setState(state => ({
        nodes: [...state.nodes.map(node => ({ ...node, selected: false, data: node.id === nodeId ? { ...node.data, directorScene: capturedScene, assetUrl: url, outputUrl: url, status: 'success' as const, progress: 100 } : node.data })), resultNode],
        edges: [...state.edges, { id: createDirectorId('director-edge'), source: nodeId, target: resultId, sourceHandle: 'right', targetHandle: 'left', type: 'smoothstep', animated: true }],
      }));
      const local = persistLocal();
      let cloud = false;
      try { cloud = await saveProject(); } catch { message.warning('截图已加入画布，云端同步失败，可稍后点击保存'); }
      if (local || cloud) {
        message.success(demo ? '构图图已加入本地画布；登录后重新导出可用于真实生成' : '构图图已上传并连回画布，可以作为画布参考素材');
        onCloseRef.current();
      } else { setSaveState('截图在内存中，请保存或下载 PNG'); }
    } catch (error) { message.error(error instanceof Error ? error.message : '导出失败，请重试'); }
    finally { operationRef.current = false; if (mountedRef.current) setBusy(null); }
  };
  const importScene = async (file?: File) => {
    if (!file || operationRef.current) return;
    try {
      if (file.size > 1_000_000) throw new Error('工程文件不能超过 1 MB');
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || parsed.version !== 1 || !('objects' in parsed) || !Array.isArray(parsed.objects)) throw new Error('请选择导演台导出的 v1 工程 JSON');
      if (operationRef.current || !mountedRef.current) return;
      const next = normalizeDirectorScene(parsed);
      change(() => next); setSelectedId(next.activeCameraId); setPlayhead(0); setPlaying(false);
      message.success('工程已导入，可撤销恢复之前场景');
    } catch (error) { message.error(error instanceof Error ? error.message : '无法读取工程'); }
  };

  return <div className="director-studio" ref={dialogRef} role="dialog" aria-modal="true" aria-label="3D 导演台" tabIndex={-1}
    onKeyDown={event => {
      event.stopPropagation();
      if (operationRef.current) { event.preventDefault(); return; }
      if (event.key === 'Tab') {
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type=hidden]), select:not(:disabled), [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
        if (event.shiftKey && (document.activeElement === controls[0] || document.activeElement === dialogRef.current)) { event.preventDefault(); controls[controls.length - 1]?.focus(); }
        else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0]?.focus(); }
      }
      if (isTyping(event.target) || operationRef.current) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); setPlaying(false); if (event.shiftKey) redo(); else undo(); }
      else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelected(); }
      else if (event.key.toLowerCase() === 'k' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); addKeyframe(); }
      else if (event.code === 'Space' && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); setPlaying(current => !current); }
    }}>
    <header className="director-header">
      <div className="director-brand"><button aria-label="返回画布" title="返回画布" disabled={Boolean(busy)} onClick={close}><ArrowLeftOutlined /></button><span className="director-brand-icon"><VideoCameraOutlined /></span><div><strong>导演台</strong><small>3D PREVIS STUDIO</small></div><span className="director-header-divider" /><input aria-label="场景名称" maxLength={100} disabled={Boolean(busy)} value={scene.name} onChange={event => patchScene({ name: event.target.value })} /></div>
      <div className="director-header-actions"><span className="director-save-status"><CheckOutlined />{saveState}</span><button aria-label="撤销导演台操作" title="撤销 ⌘Z" disabled={!past.length || Boolean(busy)} onClick={() => { setPlaying(false); undo(); }}><UndoOutlined /></button><button aria-label="重做导演台操作" title="重做 ⌘⇧Z" disabled={!future.length || Boolean(busy)} onClick={() => { setPlaying(false); redo(); }}><RedoOutlined /></button><button className="director-save-button" disabled={Boolean(busy)} onClick={() => { void save(); }}>{busy === 'save' ? <LoadingOutlined /> : <SaveOutlined />}保存项目</button><button className="director-primary" disabled={Boolean(busy)} onClick={() => { void capture(true); }}>{busy === 'capture' ? <LoadingOutlined /> : <CameraOutlined />}截图到画布<ArrowRightOutlined /></button></div>
    </header>

    <div className="director-workbench" aria-busy={Boolean(busy)}>
      <aside className="director-library" aria-label="导演台场景资源">
        <header className="director-panel-heading"><span>场景</span><button aria-label="场景设置" title="场景设置" onClick={() => setSelectedId(null)}><SettingOutlined /></button></header>
        <div className="director-library-tools"><button className={libraryOpen ? 'is-active' : ''} onClick={() => setLibraryOpen(current => !current)}><PlusOutlined />添加对象</button><button onClick={addCamera}><VideoCameraOutlined />机位</button></div>
        {libraryOpen ? <div className="director-object-library">{OBJECT_LIBRARY.map(item => <button key={item.kind} onClick={() => addObject(item.kind)} aria-label={`添加${item.name}`}><span className={`director-object-shape is-${item.kind}`}>{item.kind === 'actor' ? <UserOutlined /> : item.kind === 'product' ? <span /> : null}</span><strong>{item.name}</strong><small>{item.detail}</small></button>)}</div> : null}
        <div className="director-tree-heading">场景对象 <span>{scene.objects.length + scene.cameras.length}</span></div>
        <div className="director-object-tree">{scene.cameras.map(camera => <div className={`director-tree-item${selectedId === camera.id ? ' is-selected' : ''}`} key={camera.id}><button className="director-tree-select" onClick={() => select(camera.id)}><VideoCameraOutlined /><span>{camera.name}</span></button><button className={scene.activeCameraId === camera.id ? 'director-active-camera' : ''} aria-label={`预览${camera.name}`} title={`预览${camera.name}`} onClick={() => { select(camera.id); setView('camera'); }}><EyeOutlined /></button></div>)}<div className="director-tree-separator" />{scene.objects.map(object => <div className={`director-tree-item${selectedId === object.id ? ' is-selected' : ''}${!object.visible ? ' is-hidden' : ''}`} key={object.id}><button className="director-tree-select" onClick={() => setSelectedId(object.id)}>{object.kind === 'actor' ? <UserOutlined /> : <AppstoreOutlined />}<span>{object.name}</span></button><button aria-label={`${object.visible ? '隐藏' : '显示'}${object.name}`} onClick={() => patchObject(object.id, { visible: !object.visible })}>{object.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}</button><button aria-label={`${object.locked ? '解锁' : '锁定'}${object.name}`} onClick={() => patchObject(object.id, { locked: !object.locked })}>{object.locked ? <LockOutlined /> : <UnlockOutlined />}</button></div>)}</div>
        <div className="director-library-footer"><p>白模构图 → AI 画面</p><span>先确认空间、站位与镜头，再生成最终素材。</span><div><button onClick={() => importRef.current?.click()}><UploadOutlined />导入工程</button><button onClick={() => download(new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' }), 'director-scene.json')}><DownloadOutlined />导出工程</button></div><input ref={importRef} type="file" accept=".json,application/json" hidden onChange={event => { void importScene(event.target.files?.[0]); event.target.value = ''; }} /></div>
      </aside>

      <main className="director-stage">
        <div className="director-stage-toolbar"><div className="director-view-switch" role="group" aria-label="切换视角"><button className={view === 'director' ? 'is-active' : ''} onClick={() => setView('director')}>导演视角</button><button className={view === 'camera' ? 'is-active' : ''} onClick={() => setView('camera')}>机位视角</button></div><div className="director-stage-options"><select aria-label="活动机位" value={scene.activeCameraId} onChange={event => select(event.target.value)}>{scene.cameras.map(camera => <option key={camera.id} value={camera.id}>{camera.name}</option>)}</select><button aria-label="重置导演视角" title="重置导演视角" onClick={() => { setView('director'); viewportRef.current?.resetView(); }}><FullscreenOutlined /></button></div></div>
        <div className="director-stage-viewport"><DirectorViewport ref={viewportRef} scene={scene} selectedId={selectedId} view={view} transformMode={transformMode} playhead={playhead} onSelect={select} onObjectChange={patchObject} onCameraChange={patchCamera} />
          <div className="director-stage-badge"><span />{view === 'director' ? '自由布景' : activeCamera.name}<small>{scene.aspectRatio}</small></div>
          <div className="director-transform-tools" role="group" aria-label="3D 编辑工具"><button className={transformMode === 'translate' ? 'is-active' : ''} title="移动" aria-label="移动工具" onClick={() => setTransformMode('translate')}><DragOutlined /><span>移动</span></button><button className={transformMode === 'rotate' ? 'is-active' : ''} title="旋转" aria-label="旋转工具" onClick={() => setTransformMode('rotate')}><RetweetOutlined /><span>旋转</span></button><button className={transformMode === 'scale' ? 'is-active' : ''} title="缩放" aria-label="缩放工具" onClick={() => setTransformMode('scale')}><ExpandOutlined /><span>缩放</span></button><i /><button aria-label="复制对象" title="复制对象" disabled={!selectedObject} onClick={duplicate}><CopyOutlined /></button><button aria-label="下载当前机位 PNG" title="下载当前机位 PNG" disabled={Boolean(busy)} onClick={() => { void capture(false); }}><CameraOutlined /></button></div>
        </div>
        <footer className="director-stage-footer"><span>拖动旋转视角 · 右键平移 · 滚轮缩放</span><span>{scene.objects.length} 对象 <i />{scene.cameras.length} 机位</span></footer>
      </main>

      <DirectorInspector scene={scene} object={evaluatedObject} camera={evaluatedCamera} onSceneChange={patchScene} onObjectChange={patchObject} onCameraChange={patchCamera} onDelete={removeSelected} onCaptureView={() => { if (selectedCamera && viewportRef.current) patchCamera(selectedCamera.id, viewportRef.current.getViewCamera()); }} onCameraPreset={cameraPreset} />
    </div>
    <DirectorTimeline scene={scene} selectedId={selectedId} playhead={playhead} playing={playing} onSelect={select} onSeek={time => { setPlaying(false); setPlayhead(time); }} onTogglePlay={() => setPlaying(current => !current)} onKeyframe={addKeyframe} onRemoveKeyframe={removeKeyframe} onDuration={duration => {
      if ([...scene.objects, ...scene.cameras].some(item => item.keyframes.some(frame => frame.time > duration))) { message.warning('新时长短于已有关键帧，请先移除超出时长的关键帧'); return; }
      patchScene({ duration }); setPlayhead(current => Math.min(current, duration));
    }} />
    {busy ? <div className="director-busy-shield" aria-label="正在处理，请稍候" /> : null}
    <button className="director-mobile-close" aria-label="关闭导演台" onClick={close}><CloseOutlined /></button>
  </div>;
}
