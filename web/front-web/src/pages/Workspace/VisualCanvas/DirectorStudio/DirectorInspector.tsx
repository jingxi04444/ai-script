import { CameraOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import type { DirectorCamera, DirectorObject, DirectorScene, DirectorVector3 } from './directorScene';

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
  return <aside className="director-inspector" aria-label="导演台属性">
    <header className="director-panel-heading"><span>{object ? '对象属性' : camera ? '摄影机' : '场景设置'}</span><small>{object ? 'OBJECT' : camera ? 'CAMERA' : 'STAGE'}</small></header>
    <div className="director-inspector-scroll">
      {object ? <>
        <label className="director-field">名称<input aria-label="对象名称" maxLength={100} disabled={object.locked} value={object.name} onChange={event => onObjectChange(object.id, { name: event.target.value })} /></label>
        {object.locked ? <p className="director-info"><LockOutlined /> 对象已锁定，解锁后可编辑。</p> : null}
        <VectorField label="位置 / m" value={object.position} disabled={object.locked} onChange={position => onObjectChange(object.id, { position })} />
        <VectorField label="旋转 / °" value={object.rotation} min={-360} max={360} disabled={object.locked} onChange={rotation => onObjectChange(object.id, { rotation })} />
        <VectorField label="缩放" value={object.scale} min={0.05} max={20} disabled={object.locked} onChange={scale => onObjectChange(object.id, { scale })} />
        <label className="director-color-field"><span>主体颜色</span><input aria-label="主体颜色" type="color" disabled={object.locked} value={object.color} onChange={event => onObjectChange(object.id, { color: event.target.value })} /><code>{object.color.toUpperCase()}</code></label>
        {object.kind === 'actor' ? <label className="director-field">角色姿势<select aria-label="角色姿势" disabled={object.locked} value={object.pose} onChange={event => onObjectChange(object.id, { pose: event.target.value as DirectorObject['pose'] })}><option value="neutral">自然站立</option><option value="wave">抬手展示</option><option value="walk">迈步姿态</option></select></label> : null}
        <p className="director-info">{object.keyframes.length ? '已启用关键帧。调整变换会在当前时间记录一帧。' : '拖动舞台中的坐标轴调整对象，也可以直接输入数值。'}</p>
        <button className="director-delete" disabled={object.locked} onClick={onDelete}><DeleteOutlined />删除对象</button>
      </> : camera ? <>
        <label className="director-field">机位名称<input aria-label="机位名称" maxLength={100} value={camera.name} onChange={event => onCameraChange(camera.id, { name: event.target.value })} /></label>
        <label className="director-field director-range-field">视野角度 <strong>{camera.fov.toFixed(0)}°</strong><input aria-label="视野角度" type="range" min={15} max={100} value={camera.fov} onChange={event => onCameraChange(camera.id, { fov: Number(event.target.value) })} /></label>
        <VectorField label="机位位置 / m" value={camera.position} onChange={position => onCameraChange(camera.id, { position })} />
        <VectorField label="看向目标 / m" value={camera.target} onChange={target => onCameraChange(camera.id, { target })} />
        <button className="director-wide-button" onClick={onCaptureView}><CameraOutlined />将导演视角设为此机位</button>
        <div className="director-inspector-section"><h3>构图预设</h3><div className="director-preset-grid"><button onClick={() => onCameraPreset('front')}>正面全景</button><button onClick={() => onCameraPreset('detail')}>产品特写</button><button onClick={() => onCameraPreset('overhead')}>高位俯拍</button><button onClick={() => onCameraPreset('push')}>缓慢推进 ↗</button></div></div>
        <p className="director-info">推进预设将替换此机位的动画，可撤销。导出画面始终使用当前活动机位。</p>
        <button className="director-delete" disabled={scene.cameras.length <= 1} onClick={onDelete}><DeleteOutlined />删除机位{scene.cameras.length <= 1 ? '（至少保留一个）' : ''}</button>
      </> : <>
        <p className="director-info">选择场景中的对象或机位，查看并调整它的属性。</p>
        <label className="director-color-field"><span>背景</span><input type="color" aria-label="背景颜色" value={scene.background} onChange={event => onSceneChange({ background: event.target.value })} /><code>{scene.background.toUpperCase()}</code></label>
        <label className="director-color-field"><span>地面</span><input type="color" aria-label="地面颜色" value={scene.floorColor} onChange={event => onSceneChange({ floorColor: event.target.value })} /><code>{scene.floorColor.toUpperCase()}</code></label>
        <label className="director-check"><input type="checkbox" checked={scene.grid} onChange={event => onSceneChange({ grid: event.target.checked })} />显示辅助地面网格</label>
        <p className="director-info">辅助网格、相机标记与操作轴不会出现在导出的构图图中。</p>
      </>}
      <div className="director-inspector-section"><h3>输出规格</h3><label className="director-field">画面比例<select aria-label="画面比例" value={scene.aspectRatio} onChange={event => onSceneChange({ aspectRatio: event.target.value as DirectorScene['aspectRatio'] })}><option value="16:9">16:9 · 横屏</option><option value="9:16">9:16 · 竖屏</option><option value="1:1">1:1 · 方形</option></select></label><div className="director-output-note"><span>构图参考图</span><b>PNG · 最长边 1600 px</b></div></div>
    </div>
  </aside>;
}
