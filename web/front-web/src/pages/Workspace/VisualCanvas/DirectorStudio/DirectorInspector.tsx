import { useState } from 'react';
import CanvasIcon from '../CanvasIcon';
import { DIRECTOR_JOINTS, DIRECTOR_POSES, directorPoseJoints, type DirectorCamera, type DirectorObject, type DirectorScene, type DirectorVector3 } from './directorScene';

interface DirectorInspectorProps {
  scene: DirectorScene;
  object?: DirectorObject;
  camera?: DirectorCamera;
  onSceneChange: (patch: Partial<DirectorScene>) => void;
  onObjectChange: (id: string, patch: Partial<DirectorObject>) => void;
  onCameraChange: (id: string, patch: Partial<DirectorCamera>) => void;
  onDelete: () => void;
  onCaptureView: () => void;
  onCameraPreset: (preset: 'front' | 'detail' | 'overhead' | 'push') => void;
}

interface VectorFieldProps {
  label: string;
  value: DirectorVector3;
  disabled?: boolean;
  min?: number;
  max?: number;
  onChange: (value: DirectorVector3) => void;
}

function VectorField({ label, value, disabled, min = -100, max = 100, onChange }: VectorFieldProps) {
  return <fieldset className="director-vector" disabled={disabled}>
    <legend>{label}</legend>
    <div>{value.map((number, axis) => <label key={axis}>
      <span>{['X', 'Y', 'Z'][axis]}</span>
      <input aria-label={`${label} ${['X', 'Y', 'Z'][axis]}`} type="number" min={min} max={max} step="0.1" value={Number(number.toFixed(2))}
        onChange={event => {
          if (!Number.isFinite(event.currentTarget.valueAsNumber)) return;
          const next: DirectorVector3 = [...value];
          next[axis] = Math.min(max, Math.max(min, event.currentTarget.valueAsNumber));
          onChange(next);
        }} />
    </label>)}</div>
  </fieldset>;
}

export default function DirectorInspector({ scene, object, camera, onSceneChange, onObjectChange, onCameraChange, onDelete, onCaptureView, onCameraPreset }: DirectorInspectorProps) {
  const [tab, setTab] = useState<'properties' | 'pose'>('properties');
  const poseTab = object?.kind === 'actor' && tab === 'pose';
  return <aside className="director-inspector" aria-label="导演台属性">
    <header className="director-panel-heading"><span>{object ? object.kind === 'actor' ? '角色' : '对象' : camera ? '机位' : '场景'}</span></header>
    <div className="director-inspector-tabs" role="tablist" aria-label="属性分类"><button role="tab" aria-selected={!poseTab} onClick={() => setTab('properties')}>属性</button>{object?.kind === 'actor' ? <button role="tab" aria-selected={poseTab} onClick={() => setTab('pose')}>姿势</button> : null}</div>
    <div className="director-inspector-scroll">
      {poseTab && object ? <><h3 className="director-section-title">姿势预设</h3><div className="director-pose-grid">{DIRECTOR_POSES.map(pose => <button key={pose.value} disabled={object.locked} aria-pressed={object.pose === pose.value} onClick={() => onObjectChange(object.id, { pose: pose.value, joints: undefined })}>{pose.label}</button>)}</div>
        <section className="director-joint-settings"><header><h3>姿势调节</h3><button disabled={object.locked} aria-label="重置当前姿势关节" title="重置关节调整" onClick={() => onObjectChange(object.id, { joints: undefined })}><CanvasIcon name="UndoOutlined" /></button></header>
          {DIRECTOR_JOINTS.map(joint => { const angles = directorPoseJoints(object.pose, object.joints)[joint.key]; return <fieldset key={joint.key} disabled={object.locked}><legend>{joint.label}</legend>{angles.map((angle, axis) => <label key={axis}><span>{joint.axes[axis]}</span><input aria-label={`${joint.label}${joint.axes[axis]}`} type="range" min={-180} max={180} step={1} value={angle} onChange={event => { const next: DirectorVector3 = [...angles]; next[axis] = Number(event.target.value); onObjectChange(object.id, { joints: { ...object.joints, [joint.key]: next } }); }} /><input aria-label={`${joint.label}${joint.axes[axis]}角度`} type="number" min={-180} max={180} step={1} value={Number(angle.toFixed(1))} onChange={event => { if (!Number.isFinite(event.target.valueAsNumber)) return; const next: DirectorVector3 = [...angles]; next[axis] = Math.min(180, Math.max(-180, event.target.valueAsNumber)); onObjectChange(object.id, { joints: { ...object.joints, [joint.key]: next } }); }} /></label>)}</fieldset>; })}
        </section><p className="director-info">构图人偶支持关节旋转；不是绑定真实人物的动作捕捉模型。</p></> : object ? <>
        <label className="director-field">名称<input aria-label="对象名称" maxLength={100} disabled={object.locked} value={object.name} onChange={event => onObjectChange(object.id, { name: event.target.value })} /></label>
        {object.locked ? <p className="director-info"><CanvasIcon name="LockOutlined" /> 对象已锁定，解锁后可编辑。</p> : null}
        <VectorField label="位置 / m" value={object.position} disabled={object.locked} onChange={position => onObjectChange(object.id, { position })} />
        <VectorField label="旋转 / °" value={object.rotation} min={-360} max={360} disabled={object.locked} onChange={rotation => onObjectChange(object.id, { rotation })} />
        <VectorField label="缩放" value={object.scale} min={0.05} max={20} disabled={object.locked} onChange={scale => onObjectChange(object.id, { scale })} />
        <label className="director-field director-range-field">统一缩放 <strong>{object.scale[0].toFixed(1)}</strong><input aria-label="统一缩放" type="range" min={0.1} max={5} step={0.1} disabled={object.locked} value={object.scale[0]} onChange={event => { const value = Number(event.target.value); onObjectChange(object.id, { scale: [value, value, value] }); }} /></label>
        <label className="director-color-field"><span>主体颜色</span><input aria-label="主体颜色" type="color" disabled={object.locked} value={object.color} onChange={event => onObjectChange(object.id, { color: event.target.value })} /><code>{object.color.toUpperCase()}</code></label>
        <p className="director-info">{object.keyframes.length ? '已启用关键帧。调整变换会在当前时间记录一帧。' : '拖动舞台中的坐标轴调整对象，也可以直接输入数值。'}</p>
        <button className="director-delete" disabled={object.locked} onClick={onDelete}><CanvasIcon name="DeleteOutlined" />删除对象</button>
      </> : camera ? <>
        <label className="director-field">机位名称<input aria-label="机位名称" maxLength={100} disabled={camera.locked} value={camera.name} onChange={event => onCameraChange(camera.id, { name: event.target.value })} /></label>
        {camera.locked ? <p className="director-info"><CanvasIcon name="LockOutlined" /> 机位已锁定，解锁后可编辑。</p> : null}
        <label className="director-field director-range-field">视野角度 <strong>{camera.fov.toFixed(0)}°</strong><input aria-label="视野角度" type="range" min={15} max={100} disabled={camera.locked} value={camera.fov} onChange={event => onCameraChange(camera.id, { fov: Number(event.target.value) })} /></label>
        <VectorField label="机位位置 / m" value={camera.position} disabled={camera.locked} onChange={position => onCameraChange(camera.id, { position })} />
        <VectorField label="看向目标 / m" value={camera.target} disabled={camera.locked} onChange={target => onCameraChange(camera.id, { target })} />
        <button className="director-wide-button" disabled={camera.locked} onClick={onCaptureView}><CanvasIcon name="CameraOutlined" />将导演视角设为此机位</button>
        <div className="director-inspector-section"><h3>构图预设</h3><div className="director-preset-grid"><button disabled={camera.locked} onClick={() => onCameraPreset('front')}>正面全景</button><button disabled={camera.locked} onClick={() => onCameraPreset('detail')}>产品特写</button><button disabled={camera.locked} onClick={() => onCameraPreset('overhead')}>高位俯拍</button><button disabled={camera.locked} onClick={() => onCameraPreset('push')}>缓慢推进 ↗</button></div></div>
        <p className="director-info">推进预设将替换此机位的动画，可撤销。导出画面始终使用当前活动机位。</p>
        <button className="director-delete" disabled={camera.locked || scene.cameras.length <= 1} onClick={onDelete}><CanvasIcon name="DeleteOutlined" />删除机位{scene.cameras.length <= 1 ? '（至少保留一个）' : ''}</button>
      </> : <>
        <p className="director-info">选择场景中的对象或机位，查看并调整它的属性。</p>
        <label className="director-color-field"><span>背景</span><input type="color" aria-label="背景颜色" value={scene.background} onChange={event => onSceneChange({ background: event.target.value })} /><code>{scene.background.toUpperCase()}</code></label>
        <label className="director-color-field"><span>地面</span><input type="color" aria-label="地面颜色" value={scene.floorColor} onChange={event => onSceneChange({ floorColor: event.target.value })} /><code>{scene.floorColor.toUpperCase()}</code></label>
        <label className="director-check"><input type="checkbox" checked={scene.grid} onChange={event => onSceneChange({ grid: event.target.checked })} />显示辅助地面网格</label>
        <label className="director-field director-scene-note-field">构图备注<textarea aria-label="构图备注" placeholder="记录构图、镜头和角色说明" maxLength={2000} rows={3} value={scene.notes || ''} onChange={event => onSceneChange({ notes: event.target.value })} /></label>
        <p className="director-info">辅助网格、相机标记与操作轴不会出现在导出的构图图中。</p>
      </>}
      {!poseTab ? <div className="director-inspector-section"><h3>输出规格</h3><label className="director-field">画面比例<select aria-label="画面比例" value={scene.aspectRatio} onChange={event => onSceneChange({ aspectRatio: event.target.value as DirectorScene['aspectRatio'] })}><option value="auto">自适应</option><option value="21:9">21:9 · 超宽</option><option value="16:9">16:9 · 横屏</option><option value="4:3">4:3 · 横屏</option><option value="1:1">1:1 · 方形</option><option value="3:4">3:4 · 竖屏</option><option value="9:16">9:16 · 竖屏</option></select></label><div className="director-output-note"><span>构图参考图</span><b>PNG · 最长边 1600 px</b></div></div> : null}
    </div>
  </aside>;
}
