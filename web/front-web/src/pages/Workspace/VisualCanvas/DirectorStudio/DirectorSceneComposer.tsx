import { useEffect, useRef, useState, type FormEvent } from 'react';
import CanvasIcon from '../CanvasIcon';
import './director-scene-composer.css';

interface DirectorSceneComposerProps {
  disabled?: boolean;
  onApply: (prompt: string) => Promise<{ changed: boolean; summary: string }> | { changed: boolean; summary: string };
}

export default function DirectorSceneComposer({ disabled = false, onApply }: DirectorSceneComposerProps) {
  const [prompt, setPrompt] = useState('');
  const [reference, setReference] = useState<{ name: string; url: string } | null>(null);
  const [feedback, setFeedback] = useState('');
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (reference) URL.revokeObjectURL(reference.url); }, [reference]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim() || disabled || pending) return;
    setPending(true);
    try {
      const result = await onApply(prompt);
      setFeedback(result.summary);
      if (result.changed) setPrompt('');
      inputRef.current?.focus();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '布局生成失败，请稍后重试');
    } finally { setPending(false); }
  };

  const addReference = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8_000_000) {
      setFeedback('请选择 8 MB 以内的 PNG、JPG 或 WebP 图片。');
      return;
    }
    setReference({ name: file.name, url: URL.createObjectURL(file) });
    setFeedback('参考图已添加为本地预览；当前布局指令不会识别图片内容。');
    inputRef.current?.focus();
  };

  return <div className="director-composer-wrap">
    {feedback ? <div className="director-composer-feedback" role="status">{feedback}<button type="button" aria-label="关闭提示" onClick={() => setFeedback('')}><CanvasIcon name="CloseOutlined" /></button></div> : null}
    <form className="director-scene-composer" onSubmit={submit} aria-label="场景布局指令">
      <button className="director-composer-add" type="button" aria-label="添加参考图" title="添加参考图（本地预览，暂不参与布局识别）" onClick={() => fileRef.current?.click()}><CanvasIcon name="PlusOutlined" /></button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => { addReference(event.target.files?.[0]); event.target.value = ''; }} />
      {reference ? <div className="director-composer-reference" title={`${reference.name} · 暂不参与布局识别`}><img src={reference.url} alt="已添加的场景参考图" /><button type="button" aria-label="移除参考图" onClick={() => setReference(null)}><CanvasIcon name="CloseOutlined" /></button></div> : null}
      <textarea ref={inputRef} className={prompt.length > 18 || prompt.includes('\n') ? 'is-three-lines' : prompt.length > 10 ? 'is-two-lines' : ''} aria-label="描述想要搭建的场景" placeholder="描述想要搭建的场景" maxLength={400} rows={1} value={prompt} disabled={disabled || pending}
        onChange={event => { setPrompt(event.target.value); if (feedback) setFeedback(''); }}
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
      <button className="director-composer-send" type="submit" aria-label="发送布局描述" title="按描述调整场景" disabled={disabled || pending || !prompt.trim()}><CanvasIcon name="ArrowUpOutlined" /></button>
    </form>
  </div>;
}
