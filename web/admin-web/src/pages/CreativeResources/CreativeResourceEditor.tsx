import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Film, ImagePlus, Loader2, Plus, Save, ShieldAlert, Trash2, UploadCloud, X } from 'lucide-react';
import { creativeResourceApi, type CreativeResource, type CreativeResourceType } from '../../api/creativeResource';
import { uploadApi } from '../../api/upload';
import CreativeResourceCover from './CreativeResourceCover';
import CharacterResourceViews from './CharacterResourceViews';
import CharacterResourcePreview from './CharacterResourcePreview';
import { characterResourceViews, setCharacterResourceView, type CharacterViewLabel } from './characterReferenceSet';
import { createCreativeResourceForm, creativeMediaPreviewUrl, creativeResourceError, creativeResourceLimits, creativeResourcePayload, creativeTypeLabels, isCreativeMediaUrl, type CreativeResourceForm } from './creativeResourceForm';

interface CreativeResourceEditorProps {
  type: CreativeResourceType;
  resource?: CreativeResource;
  duplicate?: boolean;
  onClose: () => void;
  onSaved: (resource: CreativeResource) => void;
}

export default function CreativeResourceEditor({ type, resource, duplicate = false, onClose, onSaved }: CreativeResourceEditorProps) {
  const [form, setForm] = useState(() => createCreativeResourceForm(type, resource, duplicate));
  const initialForm = useRef(JSON.stringify(form));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [previewTab, setPreviewTab] = useState<'cover' | 'video'>('cover');
  const [showCharacterPreview, setShowCharacterPreview] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const closeRef = useRef(() => {});
  const editing = Boolean(resource && !duplicate);
  const locked = saving || Boolean(uploading);
  const characterViews = characterResourceViews(form.gallery);
  const galleryItems = form.type === 'character' ? characterViews.extras : form.gallery.map((item, index) => ({ ...item, index }));

  const close = () => {
    if (busy.current) return;
    if (JSON.stringify(form) !== initialForm.current && !window.confirm('还有未保存的更改，确定关闭编辑器吗？')) return;
    onClose();
  };
  closeRef.current = close;

  useEffect(() => {
    mounted.current = true;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0 && !element.closest('fieldset:disabled'));
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { mounted.current = false; document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); previousFocus?.focus(); };
  }, []);

  const patch = (next: Partial<CreativeResourceForm>) => {
    if (!busy.current) setForm(current => ({ ...current, ...next }));
  };
  const changeCharacterView = (label: CharacterViewLabel, url: string) => {
    if (busy.current) return;
    try { patch({ gallery: setCharacterResourceView(form.gallery, label, url) }); setError(''); }
    catch (cause) { setError(creativeResourceError(cause, '角色视图更新失败')); }
  };
  const upload = async (file: File | undefined, target: 'cover' | 'video' | number | CharacterViewLabel) => {
    if (!file || busy.current) return;
    if (typeof target === 'string' && target !== 'cover' && target !== 'video' && form.gallery.length >= 12 && characterViews.slots.find(slot => slot.label === target)?.index === -1) {
      setError('参考图片已达 12 张，请先移除一张额外参考再上传角色套图'); return;
    }
    const video = target === 'video';
    const supported = video ? ['video/mp4', 'video/webm', 'video/quicktime'] : ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
    if (!supported.includes(file.type)) { setError(video ? '请选择 MP4、WebM 或 MOV 视频' : '请选择 PNG、JPG、WebP 或 AVIF 图片'); return; }
    if (file.size > (video ? 100 : 10) * 1024 * 1024) { setError(video ? '视频请控制在 100 MB 以内' : '图片请控制在 10 MB 以内'); return; }
    busy.current = true; setUploading(String(target)); setError('');
    try {
      const result = await uploadApi.uploadFile(file, 'creative-resources');
      if (!mounted.current) return;
      if (!isCreativeMediaUrl(result.url)) throw new Error('上传未返回有效的媒体地址');
      setForm(current => target === 'cover' ? { ...current, coverUrl: result.url } : target === 'video'
        ? { ...current, previewVideoUrl: result.url }
        : { ...current, gallery: typeof target === 'string' ? setCharacterResourceView(current.gallery, target, result.url) : current.gallery.map((item, index) => index === target ? { ...item, url: result.url } : item) });
      if (video) setPreviewTab('video');
    } catch (cause) { if (mounted.current) setError(creativeResourceError(cause, '文件上传失败，请重试')); }
    finally { busy.current = false; if (mounted.current) setUploading(''); }
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current) return;
    let payload;
    try { payload = creativeResourcePayload(form); }
    catch (cause) { setError(creativeResourceError(cause, '请检查填写内容')); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      const saved = editing && resource ? await creativeResourceApi.update(resource.id, payload) : await creativeResourceApi.create(payload);
      if (mounted.current) onSaved(saved);
    } catch (cause) { if (mounted.current) setError(creativeResourceError(cause, '保存失败，请稍后重试')); }
    finally { busy.current = false; if (mounted.current) setSaving(false); }
  };

  return createPortal(<><div className="creative-editor-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div className={`creative-editor${form.type === 'character' ? ' is-character' : ''}`} ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="creative-editor-title" tabIndex={-1}>
      <header className="creative-editor-header"><div><span className="creative-eyebrow">CREATIVE RESOURCE <ChevronRight size={12} /> {creativeTypeLabels[form.type]}</span><h2 id="creative-editor-title">{editing ? '编辑资源' : duplicate ? '复制为新资源' : `新建${creativeTypeLabels[form.type]}资源`}</h2></div><button type="button" aria-label="关闭资源编辑器" disabled={locked} onClick={close}><X size={20} /></button></header>
      <form className="creative-editor-form" onSubmit={event => { void save(event); }}>
        <div className="creative-editor-body">
          {form.type === 'character' ? <fieldset className="creative-character-editor-overview" disabled={locked}><CharacterResourceViews gallery={form.gallery} name={form.name} editing disabled={locked} onChange={changeCharacterView} onUpload={(label, file) => { void upload(file, label); }} onPreview={() => setShowCharacterPreview(true)} /></fieldset> : null}
          <aside className="creative-editor-preview">
            <div className="creative-preview-tabs" role="group" aria-label="媒体预览"><button type="button" className={previewTab === 'cover' ? 'active' : ''} onClick={() => setPreviewTab('cover')}>封面预览</button><button type="button" className={previewTab === 'video' ? 'active' : ''} onClick={() => setPreviewTab('video')}>视频预览</button></div>
            {previewTab === 'video' ? <div className="creative-video-preview">{isCreativeMediaUrl(form.previewVideoUrl || '') ? <video key={form.previewVideoUrl} src={creativeMediaPreviewUrl(form.previewVideoUrl || '', import.meta.env.BASE_URL)} poster={isCreativeMediaUrl(form.coverUrl) ? creativeMediaPreviewUrl(form.coverUrl, import.meta.env.BASE_URL) : undefined} controls playsInline preload="metadata" /> : <span><Film size={30} /><small>添加视频后在此预览</small></span>}</div> : <CreativeResourceCover url={form.coverUrl} name={form.name || '资源封面'} />}
            <div className="creative-preview-caption"><span className={`creative-state is-${form.status}`}><i />{form.status === 'published' ? '待保存发布' : '草稿'}</span><h3>{form.name || '为这个资源起个名字'}</h3><p>{form.description || '描述资源的特点和适用的创作场景。'}</p></div>
            <div className="creative-review-note"><ShieldAlert size={18} /><div><strong>发布前，确认素材与授权</strong><p>AI 生成示例也需要人工审核。请如实记录来源、作者和授权范围，不代表已获得商用认证。</p></div></div>
            {resource?.updateTime ? <small className="creative-update-note">最近更新 {resource.updateTime.replace('T', ' ').slice(0, 19)}</small> : null}
          </aside>
          <fieldset className="creative-editor-fields" disabled={locked}>
            <section><div className="creative-form-section"><span>01</span><div><h3>基本信息</h3><p>识别资源，并决定它在资源库中的位置。</p></div></div>
              <div className="creative-form-grid"><label>资源名称 <em>*</em><input aria-label="资源名称" required maxLength={creativeResourceLimits.name} value={form.name} onChange={event => patch({ name: event.target.value })} placeholder={form.type === 'character' ? '例如：都市生活方式女主' : form.type === 'style' ? '例如：自然日光摄影' : '例如：产品环绕镜头'} /></label><label>资源类型<select aria-label="资源类型" value={form.type} onChange={event => patch({ type: event.target.value as CreativeResourceType })}><option value="character">角色</option><option value="style">风格</option><option value="effect">特效</option></select></label>
              <label>唯一编码 <em>*</em><input aria-label="资源编码" required disabled={editing} maxLength={creativeResourceLimits.code} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="1–80 位小写字母、数字，以单个连字符分隔；不能以连字符开头或结尾" value={form.code} onChange={event => patch({ code: event.target.value })} /><small>{editing ? '创建后不可更改；删除后也不可复用该编码。' : '最多 80 位小写字母、数字，以单个连字符分隔；全库唯一。'}</small></label><label>分类 <em>*</em><input aria-label="资源分类" required maxLength={creativeResourceLimits.category} value={form.category} onChange={event => patch({ category: event.target.value })} placeholder={form.type === 'character' ? '如：生活方式 / 专业讲解' : form.type === 'style' ? '如：摄影 / 电影感' : '如：运镜 / 视觉特效'} /><small>草稿也需填写分类，便于归档和筛选。</small></label></div>
              <label>简介<textarea aria-label="资源简介" rows={2} maxLength={creativeResourceLimits.description} value={form.description} onChange={event => patch({ description: event.target.value })} placeholder="描述资源特点、适用场景和使用注意事项" /></label>
              <label>标签<input aria-label="资源标签" value={form.tagsText} onChange={event => patch({ tagsText: event.target.value })} placeholder="自然、商业摄影、日常场景" /><small>最多 20 个，每个不超过 40 字；用逗号分隔，重复标签自动合并。</small></label>
            </section>

            <section><div className="creative-form-section"><span>02</span><div><h3>封面与展示素材</h3><p>{form.type === 'character' ? '封面只用于列表缩略图，不会自动替代上方的四张角色套图。' : form.type === 'effect' ? '添加效果预览视频，让镜头运动和变化更直观。' : '提供代表性样片，让光线、材质和色彩一目了然。'}</p></div></div>
              <div className="creative-media-field"><span>封面图片</span><div className="creative-media-input"><input aria-label="封面图片地址" maxLength={creativeResourceLimits.url} value={form.coverUrl} onChange={event => patch({ coverUrl: event.target.value })} placeholder="https://… 或 /creative-library/…" /><label className="creative-upload-button"><ImagePlus size={16} />上传<input aria-label="上传封面图片" type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={event => { void upload(event.target.files?.[0], 'cover'); event.target.value = ''; }} /></label></div></div>
              <div className="creative-media-field"><span>预览视频（可选）</span><div className="creative-media-input"><input aria-label="预览视频地址" maxLength={creativeResourceLimits.url} value={form.previewVideoUrl || ''} onChange={event => patch({ previewVideoUrl: event.target.value })} placeholder="填写 MP4 / WebM 地址" /><label className="creative-upload-button"><UploadCloud size={16} />上传<input aria-label="上传预览视频" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={event => { void upload(event.target.files?.[0], 'video'); event.target.value = ''; }} /></label></div><small>图片 ≤ 10 MB，视频 ≤ 100 MB；上传后需保存资源。链接最多 2048 字，不能包含账号密码。</small></div>
              <div className="creative-gallery-heading"><strong>{form.type === 'character' ? '额外参考（不计入四图套装）' : '更多参考画面'}</strong><button type="button" className="creative-inline-button" disabled={form.gallery.length >= 12} onClick={() => patch({ gallery: [...form.gallery, { label: '', url: '' }] })}><Plus size={14} />{form.type === 'character' ? '添加额外参考' : '添加视图'}</button></div>
              {galleryItems.length ? <div className="creative-gallery-editor">{galleryItems.map(item => <div className="creative-gallery-row" key={item.index}><CreativeResourceCover url={item.url} name={item.label || `参考视图 ${item.index + 1}`} emptyLabel="待添加参考" unavailableLabel="参考图暂不可用" /><div><input aria-label={`视图 ${item.index + 1} 名称`} maxLength={creativeResourceLimits.galleryLabel} value={item.label} onChange={event => patch({ gallery: form.gallery.map((value, itemIndex) => item.index === itemIndex ? { ...value, label: event.target.value } : value) })} placeholder="视图名称（可选），如：其他服装" /><input aria-label={`视图 ${item.index + 1} 地址`} maxLength={creativeResourceLimits.url} value={item.url} onChange={event => patch({ gallery: form.gallery.map((value, itemIndex) => item.index === itemIndex ? { ...value, url: event.target.value } : value) })} placeholder="图片 URL" /></div><label className="creative-gallery-upload" title="上传视图"><UploadCloud size={16} /><input aria-label={`上传视图 ${item.index + 1}`} type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={event => { void upload(event.target.files?.[0], item.index); event.target.value = ''; }} /></label><button type="button" aria-label={`删除视图 ${item.index + 1}`} onClick={() => patch({ gallery: form.gallery.filter((_, itemIndex) => item.index !== itemIndex) })}><Trash2 size={15} /></button></div>)}</div> : <div className="creative-gallery-empty">{form.type === 'character' ? '可选：旧混合设定板、其他服装等；与套图合计最多 12 张。' : '尚未添加参考视图 · 最多 12 张'}</div>}
            </section>

            <section><div className="creative-form-section"><span>03</span><div><h3>创作提示词</h3><p>{form.type === 'character' ? '定义外貌、服饰和稳定特征，供创作节点引用。' : form.type === 'style' ? '描述视觉风格、光线、色调与质感。' : '描述运动方向、速度、效果变化和画面约束。'}</p></div></div>
              <label>提示词<textarea aria-label="创作提示词" rows={5} maxLength={creativeResourceLimits.prompt} value={form.prompt} onChange={event => patch({ prompt: event.target.value })} placeholder="输入可复用的创作描述；发布时必填" /></label>
              <label>负面提示词（可选）<textarea aria-label="负面提示词" rows={2} maxLength={creativeResourceLimits.negativePrompt} value={form.negativePrompt || ''} onChange={event => patch({ negativePrompt: event.target.value })} placeholder="描述需要避免的效果或错误" /></label>
              <details className="creative-config-details"><summary>高级配置 · JSON 对象</summary><label><textarea aria-label="高级配置 JSON" className="creative-json-input" spellCheck={false} rows={7} value={form.configText} onChange={event => patch({ configText: event.target.value })} /><small>仅保存模板参数（≤ 16000 字节、末级值深度 ≤ 8）；每个对象或数组最多 100 项。不执行代码或加载 LoRA。</small></label></details>
            </section>

            <section><div className="creative-form-section"><span>04</span><div><h3>发布与来源</h3><p>这是平台公共资源目录，只有已发布内容对用户开放。</p></div></div>
              <div className="creative-form-grid"><label>发布状态<select aria-label="发布状态" value={form.status} onChange={event => patch({ status: event.target.value as CreativeResourceForm['status'] })}><option value="draft">草稿 · 用户不可见</option><option value="published">已发布 · 用户可见</option></select></label><label>排序值<input aria-label="排序值" type="number" step={1} min={-creativeResourceLimits.sortOrder} max={creativeResourceLimits.sortOrder} value={form.sortOrder} onChange={event => patch({ sortOrder: Number(event.target.value) })} /><small>-100000 到 100000，数值越小越靠前。</small></label></div>
              <label>作者 / 来源<input aria-label="作者或来源" maxLength={creativeResourceLimits.author} value={form.author} onChange={event => patch({ author: event.target.value })} placeholder="填写作者、素材来源或生成方式" /></label>
              <label>授权与审核说明<textarea aria-label="授权与审核说明" rows={3} maxLength={creativeResourceLimits.licenseNote} value={form.licenseNote} onChange={event => patch({ licenseNote: event.target.value })} placeholder="如：AI 生成示例，需审核后使用；请注明实际授权范围与限制。" /></label>
            </section>
          </fieldset>
        </div>
        <footer className="creative-editor-footer"><div aria-live="polite">{error ? <p className="creative-form-error" role="alert">{error}</p> : uploading ? <span><Loader2 size={16} className="creative-spin" />正在上传素材，请稍候…</span> : <span><Check size={15} />保存后同步到平台资源目录</span>}</div><button type="button" className="toolbar-btn" disabled={locked} onClick={close}>取消</button><button type="submit" className="toolbar-btn primary" disabled={locked}>{saving ? <Loader2 size={16} className="creative-spin" /> : <Save size={16} />}{saving ? '保存中…' : form.status === 'published' ? '保存并发布' : '保存草稿'}</button></footer>
      </form>
    </div>
  </div>{showCharacterPreview ? <CharacterResourcePreview name={form.name} gallery={form.gallery} onClose={() => setShowCharacterPreview(false)} /> : null}</>, document.body);
}
