import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, ExternalLink, Film, LockKeyhole, Plus, RefreshCcw, Save, Send, Trash2, UnlockKeyhole, UploadCloud, XCircle } from 'lucide-react';
import { templateApi, type Template } from '../../api/template';
import { uploadApi } from '../../api/upload';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, Pagination } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import { optionalNumberFromInput } from '../../utils/form';
import EditableMatrixEditor from './EditableMatrixEditor';
import {
  createEmptyMatrix,
  formulaChecklistColumns,
  paragraphStructureColumns,
  parseEditableMatrix,
  serializeEditableMatrix,
} from './editableMatrix';
import './template-list.css';

type TemplateForm = Partial<Template>;

const templateCategories = ['全部', '最新热点', '产品介绍', '创意剧情', '活动福利', '选购攻略'] as const;

const emptyForm: TemplateForm = {
  name: '',
  category: '产品介绍',
  templateSource: '平台模板',
  actor: '',
  people: '',
  popularity: '',
  difficulty: '',
  paragraphStructure: '',
  emotionTurningPoints: '',
  firstFiveSecondsHook: '',
  structureFormula: '',
  formulaExecutionChecklist: '',
  scriptTemplateLibrary: '',
  referenceUrl: '',
  referenceDesc: '',
  previewVideoUrl: '',
  fullVideoUrl: '',
  sortOrder: 0,
  auditStatus: 'draft',
  publishStatus: 'offline',
  locked: false,
};

const auditStatusLabels: Record<NonNullable<Template['auditStatus']>, string> = {
  draft: '草稿',
  running: '运行中',
  approved: '审核通过',
  rejected: '审核失败',
};

const TemplateListPage = () => {
  const { notify } = useAdminShell();
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState<(typeof templateCategories)[number]>('全部');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [paragraphStructure, setParagraphStructure] = useState(() => createEmptyMatrix(paragraphStructureColumns));
  const [formulaExecutionChecklist, setFormulaExecutionChecklist] = useState(() => createEmptyMatrix(formulaChecklistColumns));
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [uploadingVideo, setUploadingVideo] = useState<'preview' | 'full' | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await templateApi.getList({
        page,
        pageSize,
        keyword: keyword || undefined,
        category: activeCategory === '全部' ? undefined : activeCategory,
      });
      setTemplates(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setTemplates([]);
      setTotal(0);
      notify('模板列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, activeCategory]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      category: activeCategory === '全部' ? '产品介绍' : activeCategory,
      sortOrder: total + 1,
    });
    setParagraphStructure(createEmptyMatrix(paragraphStructureColumns));
    setFormulaExecutionChecklist(createEmptyMatrix(formulaChecklistColumns));
    setEditorOpen(true);
  };

  const openEdit = (template: Template) => {
    setEditing(template);
    setForm({
      ...template,
      category: template.category === '测评' || template.category === '教程' ? '选购攻略' : template.category,
    });
    setParagraphStructure(parseEditableMatrix(template.paragraphStructure, paragraphStructureColumns));
    setFormulaExecutionChecklist(parseEditableMatrix(template.formulaExecutionChecklist, formulaChecklistColumns));
    setEditorOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) {
      notify('请填写模板名称');
      return;
    }
    const payload = {
      ...form,
      paragraphStructure: serializeEditableMatrix(paragraphStructure),
      formulaExecutionChecklist: formulaExecutionChecklist.rows.some((row) => row.some((cell) => cell.trim()))
        ? serializeEditableMatrix(formulaExecutionChecklist)
        : '',
    };
    try {
      if (editing) {
        await templateApi.update(editing.id, payload);
        notify('模板已更新');
      } else {
        await templateApi.create(payload);
        notify('模板已创建');
      }
      setEditorOpen(false);
      load();
    } catch {
      notify('保存失败');
    }
  };

  const uploadTemplateVideo = async (kind: 'preview' | 'full', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      notify('请选择视频文件');
      return;
    }
    if (file.size > 300 * 1024 * 1024) {
      notify('视频不能超过 300MB');
      return;
    }
    setUploadingVideo(kind);
    try {
      const result = await uploadApi.uploadFile(file, 'script-template-video');
      setForm((current) => ({
        ...current,
        [kind === 'preview' ? 'previewVideoUrl' : 'fullVideoUrl']: result.url,
      }));
      notify(kind === 'preview' ? '5 秒预览视频上传成功' : '完整视频上传成功');
    } catch {
      notify('视频上传失败');
    } finally {
      setUploadingVideo(null);
    }
  };

  const renderVideoField = (
    kind: 'preview' | 'full',
    label: string,
    description: string,
  ) => {
    const field = kind === 'preview' ? 'previewVideoUrl' : 'fullVideoUrl';
    const value = form[field] || '';
    return (
      <section className="template-video-field">
        <div className="template-video-field-header">
          <span>{label}</span>
          <small>{description}</small>
        </div>
        <div className="template-video-control">
          <div className="template-video-preview">
            {value ? <video src={value} muted controls preload="metadata" /> : <Film size={24} />}
          </div>
          <div className="template-video-inputs">
            <input
              value={value}
              onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
              placeholder="上传视频后自动填写，也可粘贴 https:// 视频地址"
            />
            <div className="template-video-actions">
              <label className={`toolbar-btn upload-btn${uploadingVideo === kind ? ' disabled' : ''}`}>
                <UploadCloud size={15} />{uploadingVideo === kind ? '上传中…' : '上传视频'}
                <input
                  type="file"
                  hidden
                  accept="video/*"
                  disabled={uploadingVideo !== null}
                  onChange={(event) => {
                    void uploadTemplateVideo(kind, event.target.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
              {value ? <button className="table-btn danger" type="button" onClick={() => setForm((current) => ({ ...current, [field]: '' }))}><Trash2 size={14} />移除</button> : null}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      await templateApi.delete(deleteId);
      notify('模板已删除');
      setDeleteId(null);
      load();
    } catch {
      notify('删除失败');
    }
  };

  const updateState = async (
    template: Template,
    patch: Pick<Partial<Template>, 'auditStatus' | 'publishStatus' | 'locked'>,
    successMessage: string,
  ) => {
    try {
      const updated = await templateApi.updateState(template.id, patch);
      setTemplates((current) => current.map((item) => item.id === updated.id ? updated : item));
      notify(successMessage);
    } catch {
      notify('模板状态更新失败');
    }
  };

  const rows = useMemo(() => templates, [templates]);

  return (
    <div className="page-stack template-list">
      <div className="toolbar-group">
        <input
          className="toolbar-input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            setPage(1);
            if (page === 1) load();
          }}
          placeholder="搜索模板名称 / 来源 / 标签"
        />
        <button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button>
        <button className="toolbar-btn primary" type="button" onClick={openCreate}><Plus size={16} />新增模板</button>
      </div>

      <div className="template-category-tabs" role="tablist" aria-label="脚本模板分类">
        {templateCategories.map((category) => (
          <button
            className={`template-category-tab${activeCategory === category ? ' active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeCategory === category}
            key={category}
            onClick={() => {
              setActiveCategory(category);
              setPage(1);
            }}
          >
            {category === '最新热点' ? <>🔥 {category}</> : category}
          </button>
        ))}
      </div>

      {rows.length ? (
        <>
        <div className="admin-table">
          <div className="table-head template-table-grid">
            <span>序号</span><span>模板来源</span><span>模板名称</span><span>视频素材</span><span>人数</span><span>标签</span><span>审核状态</span><span>上下架</span><span>使用权限</span><span>操作</span>
          </div>
          {rows.map((template, index) => (
            <div className="table-row template-table-grid" key={template.id}>
              <span>{(page - 1) * pageSize + index + 1}</span>
              <span className="template-source-cell" title={template.templateSource || '平台模板'}>
                {template.templateSource || '平台模板'}
              </span>
              <strong className="template-name-cell" title={template.name || '-'}>
                {template.name || '-'}
              </strong>
              <div className="template-video-links">
                {template.previewVideoUrl ? <a className="template-reference-link" href={template.previewVideoUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} />5秒预览</a> : null}
                {template.fullVideoUrl ? <a className="template-reference-link is-private" href={template.fullVideoUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} />完整视频</a> : null}
                {!template.previewVideoUrl && !template.fullVideoUrl ? <span>-</span> : null}
              </div>
              <span>{template.people || '-'}</span>
              <span className="template-tag">{template.difficulty || '-'}</span>
              <span className={`template-status-badge audit-${template.auditStatus || 'draft'}`}>
                {auditStatusLabels[template.auditStatus || 'draft']}
              </span>
              <span className={`template-status-badge publish-${template.publishStatus || 'offline'}`}>
                {template.publishStatus === 'online' ? '已上架' : '已下架'}
              </span>
              <span className={`template-status-badge ${template.locked ? 'is-locked' : 'is-unlocked'}`}>
                {template.locked ? <><LockKeyhole size={13} />已加锁</> : <><UnlockKeyhole size={13} />可使用</>}
              </span>
              <div className="table-actions template-row-actions">
                {template.auditStatus === 'running' ? (
                  <>
                    <button className="table-btn success" type="button" onClick={() => updateState(template, { auditStatus: 'approved' }, '模板审核已通过')}><CheckCircle size={14} />通过</button>
                    <button className="table-btn danger" type="button" onClick={() => updateState(template, { auditStatus: 'rejected' }, '模板已标记为审核失败')}><XCircle size={14} />驳回</button>
                  </>
                ) : template.auditStatus !== 'approved' ? (
                  <button className="table-btn" type="button" onClick={() => updateState(template, { auditStatus: 'running' }, '模板已提交审核')}><Send size={14} />提交审核</button>
                ) : (
                  <button
                    className={`table-btn ${template.publishStatus === 'online' ? 'warning' : 'success'}`}
                    type="button"
                    onClick={() => updateState(
                      template,
                      { publishStatus: template.publishStatus === 'online' ? 'offline' : 'online' },
                      template.publishStatus === 'online' ? '模板已下架' : '模板已上架',
                    )}
                  >
                    {template.publishStatus === 'online' ? '下架' : '上架'}
                  </button>
                )}
                <button
                  className="table-btn"
                  type="button"
                  onClick={() => updateState(template, { locked: !template.locked }, template.locked ? '模板已解锁' : '模板已加锁')}
                >
                  {template.locked ? <UnlockKeyhole size={14} /> : <LockKeyhole size={14} />}
                  {template.locked ? '解锁' : '加锁'}
                </button>
                <button className="table-btn" type="button" onClick={() => openEdit(template)}>编辑</button>
                <button className="table-btn danger" type="button" onClick={() => setDeleteId(template.id)}><Trash2 size={15} />删除</button>
              </div>
            </div>
          ))}
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
        </>
      ) : (
        <EmptyState title={loading ? '加载中...' : '暂无模板'} description="后端没有数据时展示空态，不使用 mock 冒充。" icon={<Save size={22} />} />
      )}

      <Modal
        open={editorOpen}
        title={editing ? '编辑模板' : '新增模板'}
        description="填写模板基础信息后保存。"
        onClose={() => setEditorOpen(false)}
        closeOnBackdrop={false}
        size="full"
        footer={<><button className="modal-btn" type="button" onClick={() => setEditorOpen(false)}>取消</button><button className="modal-btn primary" type="button" onClick={save}><Save size={16} />保存</button></>}
      >
        <div className="field-grid template-editor-basic-grid">
          <label className="field"><span>模板名称</span><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field"><span>分类</span><select value={form.category || '产品介绍'} onChange={(e) => setForm({ ...form, category: e.target.value })}>{templateCategories.filter((category) => category !== '全部').map((category) => <option value={category} key={category}>{category}</option>)}</select></label>
          <label className="field"><span>模板来源</span><input value={form.templateSource || ''} onChange={(e) => setForm({ ...form, templateSource: e.target.value })} placeholder="例如：平台模板、用户上传、飞书" /></label>
          <label className="field"><span>演员</span><input value={form.actor || ''} onChange={(e) => setForm({ ...form, actor: e.target.value })} /></label>
          <label className="field"><span>人数</span><input value={form.people || ''} onChange={(e) => setForm({ ...form, people: e.target.value })} /></label>
          <label className="field"><span>难度</span><input value={form.popularity || ''} onChange={(e) => setForm({ ...form, popularity: e.target.value })} /></label>
          <label className="field"><span>标签</span><input value={form.difficulty || ''} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} /></label>
          <label className="field"><span>排序序号</span><input type="number" min="1" value={form.sortOrder ?? ''} onChange={(e) => setForm({ ...form, sortOrder: optionalNumberFromInput(e.target.value) })} /><small>数字越小越靠前；相同序号按修改时间倒序。</small></label>
          <label className="field template-editor-wide-field"><span>原始来源链接（仅后台可见）</span><input value={form.referenceUrl || ''} onChange={(e) => setForm({ ...form, referenceUrl: e.target.value })} placeholder="https://" /><small>只供后台核对来源，用户端接口不会返回此链接。</small></label>
          <label className="field template-lock-field template-editor-wide-field">
            <span>前台使用权限</span>
            <button
              className={`template-lock-toggle${form.locked ? ' active' : ''}`}
              type="button"
              role="switch"
              aria-checked={Boolean(form.locked)}
              onClick={() => setForm({ ...form, locked: !form.locked })}
            >
              {form.locked ? <LockKeyhole size={16} /> : <UnlockKeyhole size={16} />}
              {form.locked ? '已加锁，前台不可使用' : '未加锁，前台可使用'}
            </button>
            <small>加锁模板仍在前台显示，但用户不能选择；后续可接入会员等级解锁。</small>
          </label>
        </div>
        <div className="template-video-fields">
          {renderVideoField('preview', '5 秒预览视频', '前台模板说明只播放这段视频，不展示原链接或完整视频。')}
          {renderVideoField('full', '完整参考视频（仅后台）', '供后台查看和生成逻辑参考，用户端不会收到该地址。')}
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>来源内容描述（前台可见）</span>
          <textarea value={form.referenceDesc || ''} onChange={(e) => setForm({ ...form, referenceDesc: e.target.value })} placeholder="说明参考内容、使用场景或参考要点，前台模板说明会展示" />
        </label>
        <div className="template-matrix-section">
          <EditableMatrixEditor label="段落结构拆解" state={paragraphStructure} setState={setParagraphStructure} />
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>情绪转折点</span>
          <textarea value={form.emotionTurningPoints || ''} onChange={(e) => setForm({ ...form, emotionTurningPoints: e.target.value })} placeholder="提炼情绪从痛点、共鸣、信任到行动的变化" />
        </label>
        <label className="field" style={{ marginTop: 14 }}>
          <span>钩子提炼</span>
          <textarea value={form.firstFiveSecondsHook || ''} onChange={(e) => setForm({ ...form, firstFiveSecondsHook: e.target.value })} placeholder="提炼开头 5 秒吸引注意的话术模式" />
        </label>
        <label className="field" style={{ marginTop: 14 }}>
          <span>模型公式</span>
          <textarea value={form.structureFormula || ''} onChange={(e) => setForm({ ...form, structureFormula: e.target.value })} placeholder="例如：痛点开场 -> 场景放大 -> 产品解决 -> 效果展示 -> 行动引导" />
        </label>
        <div className="template-matrix-section">
          <EditableMatrixEditor label="公式执行清单" state={formulaExecutionChecklist} setState={setFormulaExecutionChecklist} />
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>脚本模版库</span>
          <textarea value={form.scriptTemplateLibrary || ''} onChange={(e) => setForm({ ...form, scriptTemplateLibrary: e.target.value })} placeholder="总结以上结构、钩子和公式清单，告诉大模型如何按模板规范写脚本语句" />
        </label>
      </Modal>

      <Modal
        open={Boolean(deleteId)}
        title="删除模板"
        description="确认删除该模板？"
        onClose={() => setDeleteId(null)}
        footer={<><button className="modal-btn" type="button" onClick={() => setDeleteId(null)}>取消</button><button className="modal-btn danger" type="button" onClick={remove}>删除</button></>}
      >
        <EmptyState title="危险操作" description="删除模板前请确认没有被项目引用。" icon={<Trash2 size={22} />} />
      </Modal>
    </div>
  );
};

export default TemplateListPage;
