import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, LockKeyhole, Plus, RefreshCcw, Save, Send, Trash2, UnlockKeyhole, XCircle } from 'lucide-react';
import { templateApi, type Template } from '../../api/template';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, Pagination } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import { optionalNumberFromInput } from '../../utils/form';
import './template-list.css';

type TemplateForm = Partial<Template>;

type ParagraphStructureState = { columns: string[]; rows: string[][] };

const templateCategories = ['全部', '产品介绍', '创意剧情', '活动福利', '测评', '教程'] as const;

const defaultParagraphColumns = ['段落原文', '核心概括', '功能定位'];

const createEmptyParagraphRow = (columnCount = defaultParagraphColumns.length): string[] => Array.from({ length: columnCount }, () => '');

const defaultParagraphState = (): ParagraphStructureState => ({ columns: [...defaultParagraphColumns], rows: [createEmptyParagraphRow()] });

const splitMarkdownRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, '|').replace(/<br\s*\/?\s*>/gi, '\n').trim());

const isSeparatorRow = (cells: string[]) => cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));

const escapeMarkdownCell = (value: string) => value.trim().replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');

const normalizeRows = (rows: string[][], columnCount: number) =>
  rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ''));

const parseParagraphStructure = (value?: string): ParagraphStructureState => {
  if (!value?.trim()) return defaultParagraphState();

  const tableRows = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map(splitMarkdownRow);

  if (tableRows.length) {
    const columns = tableRows[0].length ? tableRows[0] : [...defaultParagraphColumns];
    const dataRows = tableRows.slice(1).filter((cells) => !isSeparatorRow(cells));
    return { columns, rows: normalizeRows(dataRows.length ? dataRows : [createEmptyParagraphRow(columns.length)], columns.length) };
  }

  const rows = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((paragraphOriginal) => [paragraphOriginal, ...createEmptyParagraphRow(defaultParagraphColumns.length - 1)]);

  return { columns: [...defaultParagraphColumns], rows: rows.length ? rows : [createEmptyParagraphRow()] };
};

const serializeParagraphStructure = ({ columns, rows }: ParagraphStructureState) => {
  const safeColumns = columns.length ? columns.map((column, index) => column.trim() || `自定义列${index + 1}`) : ['段落原文'];
  const serializedRows = normalizeRows(rows.length ? rows : [createEmptyParagraphRow(safeColumns.length)], safeColumns.length);

  return [
    `| ${safeColumns.map(escapeMarkdownCell).join(' | ')} |`,
    `| ${safeColumns.map(() => '---').join(' | ')} |`,
    ...serializedRows.map((row) => `| ${row.map(escapeMarkdownCell).join(' | ')} |`),
  ].join('\n');
};

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
  scriptTemplateLibrary: '',
  referenceUrl: '',
  referenceDesc: '',
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
  const [activeCategory, setActiveCategory] = useState<(typeof templateCategories)[number]>('产品介绍');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [paragraphStructure, setParagraphStructure] = useState<ParagraphStructureState>(defaultParagraphState);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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
    setParagraphStructure(defaultParagraphState());
    setEditorOpen(true);
  };

  const openEdit = (template: Template) => {
    setEditing(template);
    setForm(template);
    setParagraphStructure(parseParagraphStructure(template.paragraphStructure));
    setEditorOpen(true);
  };

  const updateParagraphColumn = (index: number, value: string) => {
    setParagraphStructure((current) => ({ ...current, columns: current.columns.map((column, columnIndex) => (columnIndex === index ? value : column)) }));
  };

  const addParagraphColumn = () => {
    setParagraphStructure((current) => ({
      columns: [...current.columns, `自定义列${current.columns.length + 1}`],
      rows: current.rows.map((row) => [...row, '']),
    }));
  };

  const removeParagraphColumn = (index: number) => {
    setParagraphStructure((current) => {
      if (current.columns.length <= 1) return current;
      return {
        columns: current.columns.filter((_, columnIndex) => columnIndex !== index),
        rows: current.rows.map((row) => row.filter((_, columnIndex) => columnIndex !== index)),
      };
    });
  };

  const updateParagraphCell = (rowIndex: number, columnIndex: number, value: string) => {
    setParagraphStructure((current) => ({
      ...current,
      rows: current.rows.map((row, currentRowIndex) => (currentRowIndex === rowIndex ? row.map((cell, currentColumnIndex) => (currentColumnIndex === columnIndex ? value : cell)) : row)),
    }));
  };

  const addParagraphRow = () => setParagraphStructure((current) => ({ ...current, rows: [...current.rows, createEmptyParagraphRow(current.columns.length)] }));

  const removeParagraphRow = (index: number) => {
    setParagraphStructure((current) => ({ ...current, rows: current.rows.length <= 1 ? [createEmptyParagraphRow(current.columns.length)] : current.rows.filter((_, rowIndex) => rowIndex !== index) }));
  };

  const save = async () => {
    if (!form.name?.trim()) {
      notify('请填写模板名称');
      return;
    }
    const payload = { ...form, paragraphStructure: serializeParagraphStructure(paragraphStructure) };
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
            {category}
          </button>
        ))}
      </div>

      {rows.length ? (
        <>
        <div className="admin-table">
          <div className="table-head template-table-grid">
            <span>序号</span><span>模板来源</span><span>模板名称</span><span>参考链接</span><span>人数</span><span>标签</span><span>审核状态</span><span>上下架</span><span>使用权限</span><span>操作</span>
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
              {template.referenceUrl ? (
                <a className="template-reference-link" href={template.referenceUrl} target="_blank" rel="noreferrer">查看链接</a>
              ) : <span>-</span>}
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
        size="full"
        footer={<><button className="modal-btn" type="button" onClick={() => setEditorOpen(false)}>取消</button><button className="modal-btn primary" type="button" onClick={save}><Save size={16} />保存</button></>}
      >
        <div className="field-grid">
          <label className="field"><span>模板名称</span><input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field"><span>分类</span><select value={form.category || '产品介绍'} onChange={(e) => setForm({ ...form, category: e.target.value })}>{templateCategories.filter((category) => category !== '全部').map((category) => <option value={category} key={category}>{category}</option>)}</select></label>
          <label className="field"><span>模板来源</span><input value={form.templateSource || ''} onChange={(e) => setForm({ ...form, templateSource: e.target.value })} placeholder="例如：平台模板、用户上传、飞书" /></label>
          <label className="field"><span>演员</span><input value={form.actor || ''} onChange={(e) => setForm({ ...form, actor: e.target.value })} /></label>
          <label className="field"><span>人数</span><input value={form.people || ''} onChange={(e) => setForm({ ...form, people: e.target.value })} /></label>
          <label className="field"><span>难度</span><input value={form.popularity || ''} onChange={(e) => setForm({ ...form, popularity: e.target.value })} /></label>
          <label className="field"><span>标签</span><input value={form.difficulty || ''} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} /></label>
          <label className="field"><span>排序序号</span><input type="number" min="1" value={form.sortOrder ?? ''} onChange={(e) => setForm({ ...form, sortOrder: optionalNumberFromInput(e.target.value) })} /><small>数字越小越靠前；相同序号按修改时间倒序。</small></label>
          <label className="field"><span>URL 链接</span><input value={form.referenceUrl || ''} onChange={(e) => setForm({ ...form, referenceUrl: e.target.value })} placeholder="https://" /></label>
          <label className="field template-lock-field">
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
        <label className="field" style={{ marginTop: 14 }}>
          <span>URL 内容描述</span>
          <textarea value={form.referenceDesc || ''} onChange={(e) => setForm({ ...form, referenceDesc: e.target.value })} placeholder="说明参考链接内容、使用场景或参考要点" />
        </label>
        <div className="field paragraph-structure-editor" style={{ marginTop: 14 }}>
          <div className="paragraph-structure-header">
            <span>段落结构拆解</span>
            <div className="paragraph-structure-actions">
              <button className="table-btn" type="button" onClick={addParagraphColumn}><Plus size={15} />新增一列</button>
              <button className="table-btn" type="button" onClick={addParagraphRow}><Plus size={15} />新增一行</button>
            </div>
          </div>
          <div className="paragraph-structure-table">
            <div className="paragraph-structure-row paragraph-structure-head" style={{ gridTemplateColumns: `repeat(${paragraphStructure.columns.length}, minmax(220px, 1fr)) 76px` }}>
              {paragraphStructure.columns.map((column, columnIndex) => (
                <div className="paragraph-structure-column-head" key={columnIndex}>
                  <input value={column} onChange={(e) => updateParagraphColumn(columnIndex, e.target.value)} placeholder={`自定义列${columnIndex + 1}`} />
                  <button className="table-btn danger" type="button" onClick={() => removeParagraphColumn(columnIndex)} disabled={paragraphStructure.columns.length <= 1}><Trash2 size={14} /></button>
                </div>
              ))}
              <span className="paragraph-structure-operation-head">操作</span>
            </div>
            {paragraphStructure.rows.map((row, index) => (
              <div className="paragraph-structure-row" style={{ gridTemplateColumns: `repeat(${paragraphStructure.columns.length}, minmax(220px, 1fr)) 76px` }} key={index}>
                {paragraphStructure.columns.map((column, columnIndex) => (
                  <textarea key={columnIndex} value={row[columnIndex] || ''} onChange={(e) => updateParagraphCell(index, columnIndex, e.target.value)} placeholder={column || `自定义列${columnIndex + 1}`} />
                ))}
                <button className="table-btn danger paragraph-structure-row-action" type="button" onClick={() => removeParagraphRow(index)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>情绪转折点</span>
          <textarea value={form.emotionTurningPoints || ''} onChange={(e) => setForm({ ...form, emotionTurningPoints: e.target.value })} placeholder="提炼情绪从痛点、共鸣、信任到行动的变化" />
        </label>
        <label className="field" style={{ marginTop: 14 }}>
          <span>前5秒钩子</span>
          <textarea value={form.firstFiveSecondsHook || ''} onChange={(e) => setForm({ ...form, firstFiveSecondsHook: e.target.value })} placeholder="提炼开头 5 秒吸引注意的话术模式" />
        </label>
        <label className="field" style={{ marginTop: 14 }}>
          <span>模型公式</span>
          <textarea value={form.structureFormula || ''} onChange={(e) => setForm({ ...form, structureFormula: e.target.value })} placeholder="例如：痛点开场 -> 场景放大 -> 产品解决 -> 效果展示 -> 行动引导" />
        </label>
        <label className="field" style={{ marginTop: 14 }}>
          <span>脚本模版库</span>
          <textarea value={form.scriptTemplateLibrary || ''} onChange={(e) => setForm({ ...form, scriptTemplateLibrary: e.target.value })} placeholder="总结上面四个字段，告诉大模型如何按模板规范写脚本语句" />
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
