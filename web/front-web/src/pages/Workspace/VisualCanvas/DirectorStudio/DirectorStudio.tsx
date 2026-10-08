import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { message } from 'antd';
import CanvasIcon from '../CanvasIcon';
import { fileApi } from '../../../../api/asset';
import { workflowApi } from '../../../../api/workflow';
import { config } from '../../../../config';
import { useWorkflowStore } from '../../../../stores/workflowStore';
import { useAuthStore } from '../../../../stores/authStore';
import { createWorkflowNodeData, type WorkflowNode } from '../../../../types/workflow';
import DirectorViewport, { type DirectorViewportHandle } from './DirectorViewport';
import DirectorInspector from './DirectorInspector';
import DirectorTimeline from './DirectorTimeline';
import DirectorLibrary from './DirectorLibrary';
import DirectorSceneComposer from './DirectorSceneComposer';
import { DIRECTOR_CAMERA_PRESETS } from './directorLibraryConfig';
import { planDirectorLayout } from './directorLayout';
import { applyDirectorAiLayout, directorLayoutRequest } from './directorAiLayout';
import { useDirectorEditor } from './useDirectorEditor';
import {
  createDirectorCamera, createDirectorId, createDirectorObject, evaluateDirectorCamera,
  evaluateDirectorObject, normalizeDirectorScene,
  type DirectorCamera, type DirectorObject, type DirectorObjectKind, type DirectorScene,
} from './directorScene';
import './director-studio.css';
import { useEditorPopover } from '../useEditorPopover';

interface DirectorStudioProps { nodeId: string; onClose: () => void }
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
  const [selectedId, setSelectedId] = useState<string | null>(scene.objects.find(object => object.kind === 'actor')?.id || scene.activeCameraId);
  const [view, setView] = useState<'director' | 'camera'>('director');
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<'save' | 'capture' | 'layout' | null>(null);
  const [saveState, setSaveState] = useState('正在保存本地草稿');
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(() => window.matchMedia('(max-width: 720px)').matches);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const movementMenu = useEditorPopover();
  const captureMenu = useEditorPopover();
  const viewportRef = useRef<DirectorViewportHandle>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
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
  const nodes = useWorkflowStore(state => state.nodes);
  const canvasImages = nodes.filter(node => node.id !== nodeId && ['image', 'result', 'character', 'style', 'scene', 'product'].includes(node.data.kind) && (node.data.outputUrl || node.data.assetUrl)).map(node => ({ id: node.id, name: node.data.title, url: (node.data.outputUrl || node.data.assetUrl)! }));

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const adaptPanels = () => setLibraryCollapsed(media.matches);
    adaptPanels();
    media.addEventListener('change', adaptPanels);
    return () => media.removeEventListener('change', adaptPanels);
  }, []);

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
  const previewCamera = (id: string) => {
    if (operationRef.current || !sceneRef.current.cameras.some(camera => camera.id === id)) return;
    select(id);
    setPlaying(false);
    setView('camera');
  };
  const patchScene = (patch: Partial<DirectorScene>) => { if (!operationRef.current) change(current => ({ ...current, ...patch })); };
  const patchObject = useCallback((id: string, patch: Partial<DirectorObject>) => {
    if (operationRef.current) return;
    setPlaying(false);
    change(current => ({ ...current, objects: current.objects.map(object => {
      if (object.id !== id || (object.locked && patch.locked !== false && patch.visible === undefined)) return object;
      const transformed = Boolean(patch.position || patch.rotation || patch.scale || patch.pose || 'joints' in patch);
      if (!object.keyframes.length || !transformed) return { ...object, ...patch };
      if (object.keyframes.length >= 240 && !object.keyframes.some(frame => Math.abs(frame.time - snapTime(playhead)) < 1 / 48)) {
        message.warning('单轨最多 240 个关键帧，请先删除不需要的帧'); return object;
      }
      const evaluated = { ...evaluateDirectorObject(object, playhead), ...patch };
      const keyframe = { id: createDirectorId('key'), time: snapTime(playhead), position: evaluated.position, rotation: evaluated.rotation, scale: evaluated.scale, ...(object.kind === 'actor' ? { pose: evaluated.pose, joints: evaluated.joints } : {}) };
      return { ...object, keyframes: upsertFrame(object.keyframes, keyframe) };
    }) }));
  }, [change, playhead]);
  const patchCamera = useCallback((id: string, patch: Partial<DirectorCamera>) => {
    if (operationRef.current) return;
    setPlaying(false);
    change(current => ({ ...current, cameras: current.cameras.map(camera => {
      if (camera.id !== id || (camera.locked && patch.locked !== false && patch.visible === undefined)) return camera;
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
  const addActor = (name: string, scale: DirectorObject['scale']) => {
    if (operationRef.current) return;
    if (scene.objects.length >= 100) { message.warning('每个场景最多 100 个对象'); return; }
    const actor = { ...createDirectorObject('actor'), name: `${name} ${scene.objects.filter(item => item.kind === 'actor').length + 1}`, scale: [...scale] as DirectorObject['scale'] };
    actor.position[0] = (scene.objects.length % 4) * 0.7;
    change(current => ({ ...current, objects: [...current.objects, actor] })); setSelectedId(actor.id); setPlaying(false);
  };
  const addCrowd = () => {
    if (operationRef.current) return;
    if (scene.objects.length + 9 > 100) { message.warning('空间不足，3×3 群众需要 9 个对象位置'); return; }
    const crowdOffset = scene.objects.length ? 4 + Math.floor(scene.objects.length / 9) * 4 : 0;
    const actors = Array.from({ length: 9 }, (_, index) => ({ ...createDirectorObject('actor', scene.objects.filter(item => item.kind === 'actor').length + index + 1), position: [crowdOffset + (index % 3 - 1) * 1.2, 0, (Math.floor(index / 3) - 1) * 1.2] as DirectorObject['position'] }));
    change(current => ({ ...current, objects: [...current.objects, ...actors] })); setSelectedId(actors[0].id); setPlaying(false);
  };
  const addCamera = (index = 0) => {
    if (operationRef.current) return;
    if (scene.cameras.length >= 16) { message.warning('每个场景最多 16 个机位'); return; }
    const preset = DIRECTOR_CAMERA_PRESETS[index] || DIRECTOR_CAMERA_PRESETS[0];
    const camera = { ...createDirectorCamera(scene.cameras.length + 1), ...(preset.values || viewportRef.current?.getViewCamera()), name: `机位${scene.cameras.length + 1} · ${preset.name}` };
    change(current => ({ ...current, cameras: [...current.cameras, camera], activeCameraId: camera.id }));
    setSelectedId(camera.id);
    setPlaying(false);
    // Creating a shot is also a preview action; leave the free director camera
    // untouched so returning to the editor restores the user's working view.
    setView('camera');
  };
  const removeItem = (id: string) => {
    if (operationRef.current) return;
    const object = sceneRef.current.objects.find(item => item.id === id);
    const camera = sceneRef.current.cameras.find(item => item.id === id);
    if (object && !object.locked) {
      change(current => ({ ...current, objects: current.objects.filter(item => item.id !== id) }));
      if (selectedId === id) setSelectedId(null);
    } else if (camera && !camera.locked && sceneRef.current.cameras.length > 1) {
      change(current => { const cameras = current.cameras.filter(item => item.id !== id); return { ...current, cameras, activeCameraId: current.activeCameraId === id ? cameras[0].id : current.activeCameraId }; });
      if (selectedId === id) setSelectedId(null);
    }
  };
  const removeSelected = () => { if (selectedId) removeItem(selectedId); };
  const duplicateItem = (id: string) => {
    if (operationRef.current) return;
    const sourceObject = sceneRef.current.objects.find(item => item.id === id);
    const sourceCamera = sceneRef.current.cameras.find(item => item.id === id);
    if (sourceObject && sceneRef.current.objects.length < 100) {
      const object = { ...sourceObject, id: createDirectorId('object'), name: `${sourceObject.name} 副本`, position: [sourceObject.position[0] + 0.8, sourceObject.position[1], sourceObject.position[2]] as DirectorObject['position'], locked: false, keyframes: [] };
      change(current => ({ ...current, objects: [...current.objects, object] })); setSelectedId(object.id);
    } else if (sourceCamera && sceneRef.current.cameras.length < 16) {
      const camera = { ...sourceCamera, id: createDirectorId('camera'), name: `${sourceCamera.name} 副本`, position: [sourceCamera.position[0] + 0.8, sourceCamera.position[1], sourceCamera.position[2]] as DirectorCamera['position'], locked: false, visible: true, keyframes: [] };
      change(current => ({ ...current, cameras: [...current.cameras, camera], activeCameraId: camera.id })); setSelectedId(camera.id);
    }
  };
  const duplicate = () => { if (selectedId) duplicateItem(selectedId); };

  const addKeyframe = () => {
    if (operationRef.current) return;
    if (selectedObject && !selectedObject.locked && evaluatedObject) {
      if (selectedObject.keyframes.length >= 240) { message.warning('单轨最多 240 个关键帧'); return; }
      const frame = { id: createDirectorId('key'), time: snapTime(playhead), position: evaluatedObject.position, rotation: evaluatedObject.rotation, scale: evaluatedObject.scale, ...(selectedObject.kind === 'actor' ? { pose: evaluatedObject.pose, joints: evaluatedObject.joints } : {}) };
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
    if (config.useMock || !useAuthStore.getState().isAuthenticated || !current.projectKey || current.projectKey === 'draft' || current.projectKey.startsWith('director-demo')) {
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
      const demo = config.useMock || !useAuthStore.getState().isAuthenticated || projectKey.current?.startsWith('director-demo');
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
        message.success(demo ? '构图图已加入演示画布；正式生成前请在真实服务中重新导出' : '构图图已上传并连回画布，可以作为画布参考素材');
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
  const uploadPanorama = async (file?: File) => {
    if (!file || operationRef.current) return;
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10_000_000) throw new Error('请选择 10 MB 以内的 PNG、JPEG 或 WebP 图片');
      const bitmap = await createImageBitmap(file);
      let blob: Blob | null;
      try {
        const factor = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * factor)); canvas.height = Math.max(1, Math.round(bitmap.height * factor));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('浏览器无法处理图片');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      } finally { bitmap.close(); }
      if (!blob || blob.size > 700_000) throw new Error('图片压缩后仍过大，请使用更小的全景图');
      const url = await blobToDataUrl(blob);
      if (!mountedRef.current || operationRef.current) return;
      patchScene({ panoramaUrl: url }); message.success('全景背景已应用，可撤销或移除');
    } catch (error) { message.error(error instanceof Error ? error.message : '图片读取失败'); }
  };

  const applyLayoutPrompt = async (prompt: string) => {
    if (operationRef.current) throw new Error('导演台正在处理上一项操作');
    if (config.useMock) {
      const result = planDirectorLayout(sceneRef.current, prompt, selectedId);
      if (result.changed) { setPlaying(false); change(() => result.scene); }
      return { changed: result.changed, summary: `本地预览：${result.summary}` };
    }
    if (!useAuthStore.getState().isAuthenticated || !projectKey.current || projectKey.current === 'draft') {
      throw new Error('请先登录并保存项目，才能调用真实 AI 布局');
    }
    operationRef.current = true; setBusy('layout');
    try {
      const projectId = projectKey.current;
      const request = directorLayoutRequest(sceneRef.current, prompt);
      const graphJson = JSON.stringify({ nodes: [{ id: createDirectorId('layout-ai'), data: {
        kind: 'text', title: '导演台 AI 布局', systemPrompt: request.systemPrompt, prompt: request.prompt,
      } }], edges: [] });
      const run = await workflowApi.startRun(projectId, {
        mode: useWorkflowStore.getState().mode, graphJson,
        idempotencyKey: `director-layout-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 1500));
        const latest = await workflowApi.getRun(projectId, run.id);
        if (latest.status === 'failed' || latest.status === 'canceled') throw new Error(latest.errorMessage || '导演台 AI 布局失败');
        if (latest.status !== 'success') continue;
        const output = latest.nodes[0]?.outputJson ? JSON.parse(latest.nodes[0].outputJson) as { text?: string } : {};
        if (!output.text) throw new Error('AI 没有返回布局方案');
        if (!mountedRef.current || useWorkflowStore.getState().projectKey !== projectId) throw new Error('项目已切换，布局方案未应用');
        const result = applyDirectorAiLayout(sceneRef.current, output.text);
        if (result.changed) { setPlaying(false); change(() => result.scene); }
        return { changed: result.changed, summary: result.summary };
      }
      throw new Error('布局任务仍在运行，请稍后重试；任务记录已保存在项目中');
    } finally { operationRef.current = false; if (mountedRef.current) setBusy(null); }
  };

  return <div className={`director-studio${timelineOpen ? ' has-timeline' : ''}${libraryCollapsed ? ' is-library-collapsed' : ''}${inspectorOpen ? ' is-inspector-open' : ''}`} ref={dialogRef} role="dialog" aria-modal="true" aria-label="3D 导演台" tabIndex={-1}
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
    <div className="director-workbench" aria-busy={Boolean(busy)}>
      <DirectorLibrary scene={scene} selectedId={selectedId} collapsed={libraryCollapsed} busy={Boolean(busy)} canUndo={Boolean(past.length)} canRedo={Boolean(future.length)} saveState={saveState} images={canvasImages}
        onDuplicateItem={duplicateItem} onDeleteItem={removeItem} onCameraChange={patchCamera}
        onClose={close} onCollapsedChange={setLibraryCollapsed} onSelect={select} onPreview={previewCamera} onObjectChange={patchObject} onSceneChange={patchScene}
        onAddActor={addActor} onAddCrowd={addCrowd} onAddObject={addObject} onAddCamera={addCamera} onUploadPanorama={file => { void uploadPanorama(file); }}
        onUndo={() => { setPlaying(false); undo(); }} onRedo={() => { setPlaying(false); redo(); }} onSave={() => { void save(); }} onImport={file => { void importScene(file); }} onExport={() => download(new Blob([JSON.stringify(sceneRef.current, null, 2)], { type: 'application/json' }), 'director-scene.json')} />

      <main className="director-stage">
        <div className="director-stage-toolbar"><div className="director-view-switch" role="group" aria-label="切换视角"><button aria-pressed={view === 'director'} disabled={Boolean(busy)} className={view === 'director' ? 'is-active' : ''} onClick={() => setView('director')}>导演视角</button><button aria-pressed={view === 'camera'} disabled={Boolean(busy)} className={view === 'camera' ? 'is-active' : ''} onClick={() => previewCamera(scene.activeCameraId)}>机位视角</button></div><div className="director-stage-options">{view === 'director' ? <button aria-label="重置导演视角" title="重置导演视角" onClick={() => viewportRef.current?.resetView()}>重置视角</button> : null}{scene.cameras.length > 1 && <select aria-label="活动机位" disabled={Boolean(busy)} value={scene.activeCameraId} onChange={event => previewCamera(event.target.value)}>{scene.cameras.map(camera => <option key={camera.id} value={camera.id}>{camera.name}</option>)}</select>}</div></div>
        <div className="director-stage-viewport" style={{ '--director-scene-bg': scene.background } as CSSProperties}><DirectorViewport ref={viewportRef} scene={scene} selectedId={selectedId} view={view} transformMode={transformMode} playhead={playhead} onSelect={select} onObjectChange={patchObject} onCameraChange={patchCamera} />
          <div className="director-stage-badge" role="status" aria-live="polite">{view === 'camera' ? activeCamera.name : scene.name}<small>{scene.aspectRatio}</small></div>
          <div className="director-bottom-bar">
            <div className="director-transform-tools" role="group" aria-label="3D 编辑工具">
              <div className="director-action-menu" ref={movementMenu.ref}><button title="移动、旋转与缩放" aria-label="变换工具菜单" aria-haspopup="listbox" aria-expanded={movementMenu.open} onClick={() => movementMenu.setOpen(value => !value)}><CanvasIcon name={transformMode === 'translate' ? 'DragOutlined' : transformMode === 'rotate' ? 'RetweetOutlined' : 'ExpandOutlined'} /></button>{movementMenu.open ? <div className="director-action-popover" role="listbox" aria-label="变换工具" style={movementMenu.menuStyle}>{([{ value: 'translate', label: '移动', icon: 'DragOutlined' }, { value: 'rotate', label: '旋转', icon: 'RetweetOutlined' }, { value: 'scale', label: '缩放', icon: 'ExpandOutlined' }] as const).map(item => <button role="option" aria-selected={transformMode === item.value} key={item.value} onClick={() => { setTransformMode(item.value); movementMenu.setOpen(false); }}><CanvasIcon name={item.icon} />{item.label}{transformMode === item.value ? <CanvasIcon name="CheckOutlined" /> : null}</button>)}<button aria-label="复制对象" disabled={!selectedObject} onClick={() => { duplicate(); movementMenu.setOpen(false); }}><CanvasIcon name="CopyOutlined" />复制对象</button></div> : null}</div>
              <div className="director-action-menu" ref={captureMenu.ref}><button aria-label="截图菜单" title="截图" aria-haspopup="listbox" aria-expanded={captureMenu.open} disabled={Boolean(busy)} onClick={() => captureMenu.setOpen(value => !value)}><CanvasIcon name="CameraOutlined" /></button>{captureMenu.open ? <div className="director-action-popover" role="listbox" aria-label="截图方式" style={captureMenu.menuStyle}><button aria-label="截图到画布" onClick={() => { captureMenu.setOpen(false); void capture(true); }}><CanvasIcon name="CameraOutlined" />截图到画布</button><button aria-label="下载当前机位 PNG" onClick={() => { captureMenu.setOpen(false); void capture(false); }}><CanvasIcon name="DownloadOutlined" />下载 PNG</button></div> : null}</div>
              <button aria-label="切换动画时间轴" title="动画时间轴" aria-pressed={timelineOpen} onClick={() => { setTimelineOpen(value => !value); setPlaying(false); }}><CanvasIcon name="HistoryOutlined" /></button>
            </div>
            <DirectorSceneComposer disabled={Boolean(busy)} onApply={applyLayoutPrompt} />
          </div>
        </div>
        <footer className="director-stage-footer"><span>拖动旋转视角 · 右键平移 · 滚轮缩放</span><span>{scene.objects.length} 对象 <i />{scene.cameras.length} 机位</span></footer>
      </main>

      <DirectorInspector scene={scene} object={evaluatedObject} camera={evaluatedCamera} onSceneChange={patchScene} onObjectChange={patchObject} onCameraChange={patchCamera} onDelete={removeSelected} onCaptureView={() => { if (selectedCamera && viewportRef.current) patchCamera(selectedCamera.id, viewportRef.current.getViewCamera()); }} onCameraPreset={cameraPreset} />
    </div>
    {timelineOpen ? <DirectorTimeline scene={scene} selectedId={selectedId} playhead={playhead} playing={playing} onSelect={select} onSeek={time => { setPlaying(false); setPlayhead(time); }} onTogglePlay={() => setPlaying(current => !current)} onKeyframe={addKeyframe} onRemoveKeyframe={removeKeyframe} onDuration={duration => {
      if ([...scene.objects, ...scene.cameras].some(item => item.keyframes.some(frame => frame.time > duration))) { message.warning('新时长短于已有关键帧，请先移除超出时长的关键帧'); return; }
      patchScene({ duration }); setPlayhead(current => Math.min(current, duration));
    }} /> : null}
    {busy ? <div className="director-busy-shield" aria-label="正在处理，请稍候" /> : null}
    <button className="director-mobile-close" aria-label="关闭导演台" onClick={close}><CanvasIcon name="CloseOutlined" /></button>
    <button className="director-mobile-properties" aria-label={inspectorOpen ? '关闭属性面板' : '打开属性面板'} aria-expanded={inspectorOpen} onClick={() => setInspectorOpen(value => !value)}><CanvasIcon name={inspectorOpen ? 'CloseOutlined' : 'SettingOutlined'} /></button>
  </div>;
}
