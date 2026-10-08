import type { WorkflowNodeData } from '../../../types/workflow';
import CanvasIcon from './CanvasIcon';
import { useEditorPopover } from './useEditorPopover';

interface NodeAdvancedSettingsProps {
  data: WorkflowNodeData;
  onChange: (patch: Partial<WorkflowNodeData>) => void;
}

export default function NodeAdvancedSettings({ data, onChange }: NodeAdvancedSettingsProps) {
  const { open, setOpen, ref, menuStyle } = useEditorPopover();
  const audio = data.kind === 'music' || data.kind === 'voice';
  const sliders = [
    { label: '语速', value: Number.parseFloat(data.speed || '1'), min: 0.5, max: 2, step: 0.05, patch: (value: number) => ({ speed: `${value}x` }) },
    { label: '声调', value: data.pitch ?? 0, min: -12, max: 12, step: 1, patch: (pitch: number) => ({ pitch }) },
    { label: '音量', value: data.volume ?? 1, min: 0, max: 2, step: 0.1, patch: (volume: number) => ({ volume }) },
  ];
  return <div className="workflow-advanced-control" ref={ref}>
    <button type="button" className="workflow-toolbar-icon" aria-label="高级设置" title="高级设置" aria-expanded={open} onClick={() => setOpen(value => !value)}><CanvasIcon name="SettingOutlined" /></button>
    {open ? <div className="workflow-advanced-menu" style={menuStyle} role="dialog" aria-label="高级设置">
      <header>{audio ? '音频设置' : '生成设置'}</header>
      {audio ? <>
        {data.kind === 'voice' ? <label className="workflow-setting-field">音色<select aria-label="音色" value={data.voice || '年轻女声·清透'} onChange={event => onChange({ voice: event.target.value })}><option>年轻女声·清透</option><option>专业女声·高级</option><option>年轻男声·活力</option></select></label> : <label className="workflow-setting-field">音乐风格<select aria-label="音乐风格" value={data.musicStyle || '轻快广告'} onChange={event => onChange({ musicStyle: event.target.value })}><option>轻快广告</option><option>电影氛围</option><option>电子节奏</option><option>舒缓钢琴</option></select></label>}
        {sliders.map(item => <label key={item.label} className="workflow-setting-slider"><span>{item.label}</span><input aria-label={item.label} type="range" min={item.min} max={item.max} step={item.step} value={item.value} onChange={event => onChange(item.patch(Number(event.target.value)))} /><output>{item.value.toFixed(item.step === 1 ? 0 : 2)}</output></label>)}
      </> : <>
        <label className="workflow-setting-field">随机种子<input aria-label="随机种子" type="number" min={0} max={2147483647} placeholder="随机" value={data.seed ?? ''} onChange={event => onChange({ seed: Number.isFinite(event.target.valueAsNumber) ? Math.min(2147483647, Math.max(0, event.target.valueAsNumber)) : undefined })} /></label>
        <label className="workflow-setting-field">避免内容<input aria-label="避免内容" placeholder="例如：模糊、变形" value={data.negativePrompt || ''} onChange={event => onChange({ negativePrompt: event.target.value })} /></label>
      </>}
      <p>参数保存在节点中，实际支持项以所选模型适配器为准。</p>
      <button type="button" className="workflow-settings-done" onClick={() => setOpen(false)}>完成</button>
    </div> : null}
  </div>;
}
