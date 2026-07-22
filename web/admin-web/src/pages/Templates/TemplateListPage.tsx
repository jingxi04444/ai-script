import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { templateApi, type Template } from '../../api/template';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, Pagination, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import './template-list.css';

type TemplateForm = Partial<Template>;

type ParagraphStructureState = { columns: string[]; rows: string[][] };

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
  const validRows = normalizeRows(rows, safeColumns.length).filter((row) => row.some((cell) => cell.trim()));
  if (!validRows.length) return '';

  return [
    `| ${safeColumns.map(escapeMarkdownCell).join(' | ')} |`,
    `| ${safeColumns.map(() => '---').join(' | ')} |`,
    ...validRows.map((row) => `| ${row.map(escapeMarkdownCell).join(' | ')} |`),
  ].join('\n');
};

const emptyForm: TemplateForm = {
  name: '',
  category: '',
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
  status: 'active',
};

const TemplateListPage = () => {
  const { notify } = useAdminShell();
  const [keyword, setKeyword] = useState('');
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
      const data = await templateApi.getList({ page, pageSize, keyword: keyword || undefined });
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
  }, [page, pageSize]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sortOrder: total + 1 });
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

  const rows = useMemo(() => templates, [templates]);

  return (
    <div className="page-stack template-list">
      <div className="toolbar-group">
        <input className="toolbar-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索模板名称 / 分类" />
        <button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button>
        <button className="toolbar-btn primary" type="button" onClick={openCreate}><Plus size={16} />新增模板</button>
      </div>

      {rows.length ? (
        <>
        <div className="admin-table">
          <div className="table-head" style={{ gridTemplateColumns: '1.2fr 0.8fr 0.7fr 0.55fr 0.7fr 0.8fr' }}>
            <span>模板名称</span><span>分类</span><span>演员</span><span>排序序号</span><span>状态</span><span>操作</span>
          </div>
          {rows.map((template) => (
            <div className="table-row" style={{ gridTemplateColumns: '1.2fr 0.8fr 0.7fr 0.55fr 0.7fr 0.8fr' }} key={template.id}>
              <strong>{template.name || '-'}</strong>
              <span>{template.category || '-'}</span>
              <span>{template.actor || '-'}</span>
              <strong>{template.sortOrder ?? 0}</strong>
              <StatusBadge tone={template.status === 'disabled' ? 'gray' : 'green'}>{template.status || '-'}</StatusBadge>
              <div className="table-actions">
                <button className="table-btn" type="button" onClick={() => openEdit(template)}>编辑</button>
                <button className="table-btn danger" type="button" onClick={() => setDeleteId(template.id)}><Trash2 size={16} /></button>
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
          <label className="field"><span>分类</span><input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
          <label className="field"><span>演员</span><input value={form.actor || ''} onChange={(e) => setForm({ ...form, actor: e.target.value })} /></label>
          <label className="field"><span>人数</span><input value={form.people || ''} onChange={(e) => setForm({ ...form, people: e.target.value })} /></label>
          <label className="field"><span>难度</span><input value={form.popularity || ''} onChange={(e) => setForm({ ...form, popularity: e.target.value })} /></label>
          <label className="field"><span>标签</span><input value={form.difficulty || ''} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} /></label>
          <label className="field"><span>排序序号</span><input type="number" min="1" value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /><small>数字越小越靠前；相同序号按修改时间倒序。</small></label>
          <label className="field"><span>URL 链接</span><input value={form.referenceUrl || ''} onChange={(e) => setForm({ ...form, referenceUrl: e.target.value })} placeholder="https://" /></label>
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
          <span>前5秒钩子话术提炼</span>
          <textarea value={form.firstFiveSecondsHook || ''} onChange={(e) => setForm({ ...form, firstFiveSecondsHook: e.target.value })} placeholder="提炼开头 5 秒吸引注意的话术模式" />
        </label>
        <label className="field" style={{ marginTop: 14 }}>
          <span>结构模型公式</span>
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
