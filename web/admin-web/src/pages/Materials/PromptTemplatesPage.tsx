import { useEffect, useMemo, useState } from 'react';
import { Edit2, FileText, Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { systemApi, type PromptTemplate } from '../../api/system';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, PageHeader, Pagination, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import { optionalNumberFromInput } from '../../utils/form';

type PromptForm = Partial<PromptTemplate>;

const emptyForm: PromptForm = {
  providerId: '',
  sceneCode: 'brief_detect',
  templateName: '',
  versionNo: 'v1',
  systemPrompt: '',
  userPrompt: '',
  responseSchema: '{"type":"object"}',
  status: 1,
};

interface PromptTemplatesPageProps {
  briefMode?: boolean;
  sceneCode?: string;
  pageTitle?: string;
  pageDescription?: string;
  embedded?: boolean;
  requireSystemPrompt?: boolean;
  systemPromptLabel?: string;
  userPromptLabel?: string;
  systemPromptPlaceholder?: string;
  userPromptPlaceholder?: string;
}

const PromptTemplatesPage = ({
  briefMode = false,
  sceneCode,
  pageTitle,
  pageDescription,
  embedded = false,
  requireSystemPrompt = false,
  systemPromptLabel = '系统提示词 systemPrompt',
  userPromptLabel = '用户提示词 userPrompt',
  systemPromptPlaceholder = '你是商业短视频产品 Brief 检测专家...',
  userPromptPlaceholder = '请检测以下 Brief，并输出 JSON：{{briefContent}}',
}: PromptTemplatesPageProps) => {
  const { notify } = useAdminShell();
  const fixedSceneCode = sceneCode || (briefMode ? 'brief_detect' : undefined);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [form, setForm] = useState<PromptForm>(emptyForm);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const load = async () => {
    setLoading(true);
    try {
      const data = await systemApi.getPromptTemplates({
        page,
        pageSize,
        sceneCode: fixedSceneCode,
      });
      setTemplates(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setTemplates([]);
      setTotal(0);
      notify('Prompt 模板加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [fixedSceneCode, page, pageSize]);

  const remove = async () => {
    if (!deleteId) return;
    try {
      await systemApi.deletePromptTemplate(deleteId);
      notify('Prompt 模板已删除');
      setDeleteId(null);
      load();
    } catch {
      notify('删除失败');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sceneCode: fixedSceneCode || emptyForm.sceneCode });
    setEditorOpen(true);
  };

  const openEdit = (item: PromptTemplate) => {
    setEditing(item);
    setForm({ ...emptyForm, ...item });
    setEditorOpen(true);
  };

  const save = async () => {
    if (!form.templateName?.trim() || !form.sceneCode?.trim() || !form.userPrompt?.trim() || (requireSystemPrompt && !form.systemPrompt?.trim())) {
      notify(requireSystemPrompt ? '请填写模板名称、场景编码、首次生成规则和润色规则' : '请填写模板名称、场景编码和用户提示词');
      return;
    }
    try {
      if (editing) {
        await systemApi.updatePromptTemplate(editing.id, form);
        notify('Prompt 模板已更新');
      } else {
        await systemApi.createPromptTemplate(form);
        notify('Prompt 模板已创建');
      }
      setEditorOpen(false);
      load();
    } catch {
      notify('保存失败');
    }
  };

  const rows = useMemo(() => templates, [templates]);

  return (
    <div className={`page-stack${embedded ? ' embedded-prompt-page' : ''}`}>
      {!embedded ? <PageHeader
        title={pageTitle || (briefMode ? 'Brief 检测提示词' : 'Prompt 模板')}
        description={pageDescription || (briefMode ? '只维护卖点 Brief 检测使用的系统提示词、用户提示词和返回结构。' : '单独管理系统 Prompt、场景编码和版本信息。')}
        actions={<div className="toolbar-group"><button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button><button className="toolbar-btn primary" type="button" onClick={openCreate}><Plus size={16} />{briefMode ? '新增检测提示词' : '新增 Prompt'}</button></div>}
      /> : (
        <div className="toolbar-group embedded-prompt-actions">
          <button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button>
          {!briefMode && <button className="toolbar-btn primary" type="button" onClick={openCreate}><Plus size={16} />新增 Prompt</button>}
        </div>
      )}

      {rows.length ? (
        <>
        <div className="admin-table">
          <div className="table-head" style={{ gridTemplateColumns: '1.2fr 0.9fr 0.8fr 0.7fr 0.7fr' }}>
            <span>模板名称</span><span>场景编码</span><span>版本</span><span>状态</span><span>操作</span>
          </div>
          {rows.map((item) => (
            <div className="table-row" style={{ gridTemplateColumns: '1.2fr 0.9fr 0.8fr 0.7fr 0.7fr' }} key={item.id}>
              <strong>{item.templateName || '-'}</strong>
              <span>{item.sceneCode || '-'}</span>
              <span>{item.versionNo || '-'}</span>
              <StatusBadge tone={item.status === 0 ? 'gray' : 'green'}>{item.status === 0 ? '禁用' : '启用'}</StatusBadge>
              <div className="table-actions">
                <button className="table-btn" type="button" onClick={() => openEdit(item)}><Edit2 size={16} />编辑</button>
                <button className="table-btn danger" type="button" onClick={() => setDeleteId(item.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
        </>
      ) : (
        <EmptyState title={loading ? '加载中...' : briefMode ? '暂无 Brief 检测提示词' : '暂无 Prompt 模板'} description={fixedSceneCode ? `新增后将用于 ${fixedSceneCode} 场景。` : '后端返回空时展示空态，不与其他模块混在一个页面。'} icon={<FileText size={22} />} />
      )}

      <Modal open={Boolean(deleteId)} title="删除 Prompt 模板" description="确认删除该模板？" onClose={() => setDeleteId(null)} footer={<><button className="modal-btn" type="button" onClick={() => setDeleteId(null)}>取消</button><button className="modal-btn danger" type="button" onClick={remove}>删除</button></>}>
        <EmptyState title="危险操作" description="删除后模板引用将失效。" icon={<Trash2 size={22} />} />
      </Modal>

      <Modal
        open={editorOpen}
        title={editing ? (briefMode ? '编辑 Brief 检测提示词' : '编辑 Prompt 模板') : (briefMode ? '新增 Brief 检测提示词' : '新增 Prompt 模板')}
        description={fixedSceneCode ? `这里的内容直接用于 ${fixedSceneCode} 场景，场景编码不可修改。` : '可在这里查看和修改系统提示词、用户提示词和响应 Schema。Brief 检测接口使用 sceneCode=brief_detect。'}
        onClose={() => setEditorOpen(false)}
        size="lg"
        footer={<><button className="modal-btn" type="button" onClick={() => setEditorOpen(false)}>取消</button><button className="modal-btn primary" type="button" onClick={save}><Save size={16} />保存</button></>}
      >
        <div className="field-grid">
          <label className="field"><span>模板名称</span><input value={form.templateName || ''} onChange={(e) => setForm({ ...form, templateName: e.target.value })} placeholder="例如：Brief检测与重构Prompt" /></label>
          <label className="field"><span>场景编码</span><input value={form.sceneCode || ''} readOnly={Boolean(fixedSceneCode)} onChange={(e) => setForm({ ...form, sceneCode: e.target.value })} placeholder="brief_detect" /></label>
          <label className="field"><span>版本</span><input value={form.versionNo || ''} onChange={(e) => setForm({ ...form, versionNo: e.target.value })} placeholder="v1" /></label>
          <label className="field"><span>状态</span><input type="number" value={form.status ?? ''} onChange={(e) => setForm({ ...form, status: optionalNumberFromInput(e.target.value) })} placeholder="1启用 / 0禁用" /></label>
          <label className="field"><span>Provider ID</span><input value={form.providerId || ''} onChange={(e) => setForm({ ...form, providerId: e.target.value })} placeholder="可选" /></label>
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>{systemPromptLabel}</span>
          <textarea value={form.systemPrompt || ''} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} placeholder={systemPromptPlaceholder} />
        </label>
        <label className="field" style={{ marginTop: 14 }}>
          <span>{userPromptLabel}</span>
          <textarea value={form.userPrompt || ''} onChange={(e) => setForm({ ...form, userPrompt: e.target.value })} placeholder={userPromptPlaceholder} />
        </label>
        <label className="field" style={{ marginTop: 14 }}>
          <span>响应 Schema responseSchema</span>
          <textarea value={form.responseSchema || ''} onChange={(e) => setForm({ ...form, responseSchema: e.target.value })} placeholder='{"type":"object"}' />
        </label>
      </Modal>
    </div>
  );
};

export default PromptTemplatesPage;
