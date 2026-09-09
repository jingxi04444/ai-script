import { CaretRightOutlined, PauseOutlined, StepBackwardOutlined, VideoCameraOutlined, UserOutlined } from '@ant-design/icons';
import type { DirectorScene } from './directorScene';

interface DirectorTimelineProps {
  scene: DirectorScene;
  selectedId: string | null;
  playhead: number;
  playing: boolean;
  onSelect: (id: string) => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onKeyframe: () => void;
  onRemoveKeyframe: () => void;
  onDuration: (duration: number) => void;
}

export default function DirectorTimeline({ scene, selectedId, playhead, playing, onSelect, onSeek, onTogglePlay, onKeyframe, onRemoveKeyframe, onDuration }: DirectorTimelineProps) {
  const tracks = [...scene.cameras.map(camera => ({ ...camera, isCamera: true, locked: false })), ...scene.objects.map(object => ({ ...object, isCamera: false }))];
  const selected = tracks.find(track => track.id === selectedId);
  const hasKeyframe = selected?.keyframes.some(frame => Math.abs(frame.time - playhead) < 1 / 48);
  return <section className="director-timeline" aria-label="导演台动画时间轴">
    <div className="director-timeline-toolbar">
      <div className="director-play-controls"><button aria-label="回到起点" title="回到起点" onClick={() => onSeek(0)}><StepBackwardOutlined /></button><button className="director-play-button" aria-label={playing ? '暂停预演' : '播放预演'} onClick={onTogglePlay}>{playing ? <PauseOutlined /> : <CaretRightOutlined />}</button><span className="director-timecode">{playhead.toFixed(2)} <small>/</small> {scene.duration.toFixed(2)} <small>s</small></span></div>
      <label className="director-duration">时长<input aria-label="预演时长" type="number" min={1} max={120} step={1} value={scene.duration} onChange={event => { const value = event.currentTarget.valueAsNumber; if (Number.isFinite(value)) onDuration(Math.max(1, Math.min(120, value))); }} />秒</label>
      <div className="director-keyframe-actions"><button disabled={!selected || selected.locked || playing} onClick={onKeyframe}>◇ 添加关键帧 <kbd>K</kbd></button><button disabled={!hasKeyframe || selected?.locked || playing} onClick={onRemoveKeyframe}>移除此帧</button><small>24 FPS · 预演</small></div>
    </div>
    <div className="director-timeline-ruler"><span>对象 / 动画轨</span><div><div className="director-ticks">{[0, 1, 2, 3, 4].map(part => <span key={part}>{(scene.duration * part / 4).toFixed(1)}s</span>)}</div><input aria-label="时间轴播放位置" type="range" min={0} max={scene.duration} step={1 / 24} value={playhead} onChange={event => onSeek(Number(event.target.value))} /></div></div>
    <div className="director-tracks">{tracks.map(track => <div className={`director-track${selectedId === track.id ? ' is-selected' : ''}`} key={track.id}>
      <button className="director-track-label" title={track.name} onClick={() => onSelect(track.id)}>{track.isCamera ? <VideoCameraOutlined /> : <UserOutlined />}<span>{track.name}</span></button>
      <div className="director-track-frames"><svg className="director-track-svg" viewBox={`0 0 ${scene.duration * 24} 24`} preserveAspectRatio="none" aria-hidden="true"><line x1={0} y1={12} x2={scene.duration * 24} y2={12} /><line className="director-playhead" x1={playhead * 24} y1={0} x2={playhead * 24} y2={24} /></svg><div className="director-frame-buttons">{track.keyframes.map(frame => <button key={frame.id} className="director-keyframe" style={{ left: `${frame.time / scene.duration * 100}%` }} aria-label={`${track.name} ${frame.time.toFixed(2)} 秒关键帧`} title={`${frame.time.toFixed(2)} 秒`} onClick={() => { onSelect(track.id); onSeek(frame.time); }}>◆</button>)}</div></div>
    </div>)}</div>
  </section>;
}
