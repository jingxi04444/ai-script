import { Fragment, useEffect, useState } from 'react';
import {
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
  MoreOutlined,
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Dropdown, message, Modal, Select } from 'antd';
import { scriptApi } from '../../../api/script';
import { getScriptStatusLabel, normalizeScriptStatus, scriptStatusOptions } from '../../../types/script';
import type { Script } from '../../../types/script';
import type { ScriptType } from '../../../types/script';
import { formatDateTime } from '../../../utils/format';
import { extractScriptContentTitle, withScriptContentTitle } from '../../../utils/scriptContent';
import './storyboard-panel.css';

const scriptCategories = ['我的脚本', '以产品维度的脚本', '爆款复刻脚本', '平台模板库脚本', 'AI 原创脚本'];

const getCategoryTypeTones = (category: string) => {
  const map: Record<string, string[] | null> = {
    我的脚本: null,
    爆款复刻脚本: ['viral'],
    平台模板库脚本: ['template'],
    'AI 原创脚本': ['original'],
    以产品维度的脚本: null,
  };
  return map[category] ?? null;
};

interface StoryboardPanelProps {
  projectId: string | null;
  onPolishScript?: (scriptType: ScriptType, scriptId: string) => void;
}

const StoryboardPanel = ({ projectId, onPolishScript }: StoryboardPanelProps) => {
  const [activeCategory, setActiveCategory] = useState(scriptCategories[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [totalScripts, setTotalScripts] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [preview, setPreview] = useState<Script | null>(null);
  const [renamingScriptId, setRenamingScriptId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const categoryTypeTones = getCategoryTypeTones(activeCategory);
  const requestedType = typeFilter !== 'all'
    ? (!categoryTypeTones || categoryTypeTones.includes(typeFilter) ? typeFilter : '__none__')
    : categoryTypeTones?.join(',');

  useEffect(() => {
    if (!projectId) {
      setScripts([]);
      setTotalScripts(0);
      return;
    }
    let disposed = false;
    setScripts([]);
    const timer = window.setTimeout(() => {
      scriptApi.getPage({
        projectId,
        page: currentPage,
        pageSize,
        keyword: searchText.trim() || undefined,
        type: requestedType || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortBy: activeCategory === '以产品维度的脚本' ? 'product' : 'updated',
      }).then((result) => {
        if (disposed) return;
        setScripts(result.list || []);
        setTotalScripts(result.total || 0);
        if (result.pages && currentPage > result.pages) setCurrentPage(result.pages);
      }).catch(() => {
        if (!disposed) message.warning('脚本列表加载失败');
      });
    }, 250);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [activeCategory, currentPage, pageSize, projectId, refreshKey, requestedType, searchText, statusFilter]);

  useEffect(() => {
    const handleScriptChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ scriptId?: string; projectId?: string; status?: string }>).detail;
      if (!detail?.scriptId || detail.projectId !== projectId) return;
      setScripts((items) => {
        const exists = items.some((item) => item.id === detail.scriptId);
        if (statusFilter !== 'all' && detail.status !== statusFilter) {
          if (exists) setTotalScripts((total) => Math.max(0, total - 1));
          return items.filter((item) => item.id !== detail.scriptId);
        }
        return items.map((item) => item.id === detail.scriptId
          ? { ...item, status: normalizeScriptStatus(detail.status) }
          : item);
      });
      setRefreshKey((key) => key + 1);
    };
    window.addEventListener('scripts:changed', handleScriptChanged);
    return () => window.removeEventListener('scripts:changed', handleScriptChanged);
  }, [projectId, statusFilter]);

  const apiItems = scripts.map((script) => {
    const typeTone = script.type as string;
    return {
      id: script.id,
      name: script.name,
      type: typeTone === 'viral' ? '爆款复刻脚本' : typeTone === 'template' ? '平台模板脚本' : typeTone === 'product' || typeTone === 'product-dimension' ? '产品维度脚本' : 'AI原创脚本',
      typeTone,
      templateName: script.templateName,
      originalCategoryName: script.originalCategoryName,
      originalScenarioName: script.originalScenarioName,
      duration: script.duration,
      formatName: script.formatName,
      updatedAt: script.updatedAt,
      status: getScriptStatusLabel(script.status),
      statusTone: normalizeScriptStatus(script.status),
      content: script.content || script.name,
      briefId: script.briefId,
      productGroupKey: script.briefId || 'unlinked',
      productGroup: script.briefName || (script.briefId ? `Brief #${script.briefId}` : '未关联 Brief'),
    };
  });
  const allItems = apiItems;
  const totalPages = Math.max(1, Math.ceil(totalScripts / pageSize));
  const paginatedItems = allItems;

  const previewScript = async (id: string) => {
    const currentItem = allItems.find((script) => script.id === id);
    if (!/^\d+$/.test(id)) {
      if (!currentItem) return message.error('脚本不存在');
      setPreview({
        id: currentItem.id,
        name: currentItem.name,
        projectId: projectId || '',
        type: currentItem.typeTone as ScriptType,
        status: currentItem.statusTone as Script['status'],
        content: currentItem.content,
        templateName: currentItem.templateName,
        originalCategoryName: currentItem.originalCategoryName,
        originalScenarioName: currentItem.originalScenarioName,
        duration: currentItem.duration,
        formatName: currentItem.formatName,
        createdAt: currentItem.updatedAt,
        updatedAt: currentItem.updatedAt,
      });
      return;
    }
    try {
      const script = await scriptApi.getById(id);
      setPreview(script);
    } catch {
      message.error('脚本预览加载失败');
    }
  };

  const polishScript = async (id: string) => {
    const item = allItems.find((script) => script.id === id);
    if (!item) return message.error('脚本不存在');
    onPolishScript?.(item.typeTone as ScriptType, id);
  };

  const copyScript = async (id: string) => {
    try {
      const script = await scriptApi.getById(id);
      if (navigator.clipboard) await navigator.clipboard.writeText(withScriptContentTitle(script.content, script.name));
      message.success('脚本内容已复制');
    } catch {
      message.error('脚本内容加载失败');
    }
  };

  const deleteScript = (id: string, name: string) => {
    Modal.confirm({
      title: '将这篇脚本移入回收站？',
      content: `“${name}”会保留 7 天，脚本内容、历史版本和审核信息均可恢复。`,
      okText: '移入回收站',
      cancelText: '取消',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          await scriptApi.delete(id);
          if (preview?.id === id) setPreview(null);
          if (renamingScriptId === id) setRenamingScriptId(null);
          if (scripts.length === 1 && currentPage > 1) {
            setCurrentPage((page) => page - 1);
          } else {
            setRefreshKey((key) => key + 1);
          }
          message.success('脚本已移入回收站');
        } catch (error) {
          message.error(error instanceof Error ? error.message : '脚本删除失败');
          throw error;
        }
      },
    });
  };

  const scriptMoreMenu = (id: string, name: string) => ({
    items: [
      {
        key: 'delete',
        danger: true,
        icon: <DeleteOutlined />,
        label: '删除脚本',
      },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'delete') deleteScript(id, name);
    },
  });

  const startRenameScript = (id: string, name: string) => {
    setRenamingScriptId(id);
    setRenameDraft(name);
  };

  const saveRenamedScript = async (id: string, previousName: string) => {
    if (renamingScriptId !== id) return;
    const nextName = renameDraft.trim();
    if (!nextName) {
      message.warning('脚本名称不能为空');
      return;
    }
    setRenamingScriptId(null);
    if (nextName === previousName) return;
    try {
      const updated = await scriptApi.update(id, { name: nextName });
      setScripts((items) => items.map((item) => item.id === id ? { ...item, ...updated, name: nextName } : item));
      setPreview((item) => item?.id === id ? { ...item, ...updated, name: nextName } : item);
      message.success('脚本名称已修改');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '脚本名称修改失败');
    }
  };

  const previewText = preview?.content?.trim() || '';
  const previewContentTitle = extractScriptContentTitle(previewText, preview?.name || '未命名脚本');
  const previewTableLines = previewText.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('|') && line.endsWith('|'));
  const previewHasStoryboardTable = previewTableLines.length >= 3 && /镜头|画面|口播|字幕|运镜|时长/.test(previewTableLines[0]);
  const previewHeaders = previewHasStoryboardTable
    ? previewTableLines[0].split('|').slice(1, -1).map((cell) => cell.trim())
    : [];
  const previewRawRows = previewHasStoryboardTable
    ? previewTableLines.slice(2).map((line, index) => ({
      key: `${index}-${line}`,
      cells: line.split('|').slice(1, -1).map((cell) => cell.trim()),
    })).filter((row) => row.cells.length > 1)
    : [];
  const previewDurationIndex = previewHeaders.findIndex((header) => /时长/.test(header));
  const previewNoteIndex = previewHeaders.findIndex((header) => /备注/.test(header));
  const previewRows = previewRawRows.map((row) => {
    if (!row.cells.some((cell) => /总计|总时长|总时间/.test(cell))) return row;
    const cells = Array.from({ length: previewHeaders.length }, () => '');
    cells[0] = row.cells.find((cell) => /总计|总时长|总时间/.test(cell)) || '总计';
    if (previewDurationIndex >= 0) {
      cells[previewDurationIndex] = row.cells.find((cell) => /\d+(?:\.\d+)?\s*(?:s|秒)/i.test(cell)) || '';
    }
    if (previewNoteIndex >= 0) {
      cells[previewNoteIndex] = row.cells.find((cell) =>
        cell && !/总计|总时长|总时间/.test(cell) && !/\d+(?:\.\d+)?\s*(?:s|秒)/i.test(cell) && cell !== '-'
      ) || '-';
    }
    return { ...row, cells };
  });
  const previewSummaryRow = previewRows.find((row) => row.cells.some((cell) => /总计|总时长|总时间/.test(cell)));
  const previewDuration = previewDurationIndex >= 0
    ? previewSummaryRow
      ? Number.parseFloat(previewSummaryRow.cells[previewDurationIndex]) || 0
      : previewRows.reduce((total, row) => total + (Number.parseFloat(row.cells[previewDurationIndex]) || 0), 0)
    : 0;
  const previewDurationLabel = preview?.duration?.trim()
    || (previewDuration > 0 ? `${Number(previewDuration.toFixed(2))} 秒` : '');
  const previewLeadingSourceLabels = preview?.type === 'template'
    ? [preview.templateName]
    : preview?.type === 'original'
      ? [preview.originalCategoryName]
      : [];
  const previewTrailingSourceLabels = preview?.type === 'original'
    ? [preview.originalScenarioName]
      : [];
  const previewCellText = (value = '', isDuration = false) => {
    const normalized = value.replace(/<br\s*\/?>/gi, '\n').replace(/^\*\*(.*?)\*\*$/, '$1').trim() || '-';
    return isDuration ? normalized.replace(/\s*(?:s|秒)\s*$/i, '').trim() : normalized;
  };
  const previewColumnClass = (header: string) => {
    if (/画面|场景描述/.test(header)) return 'storyboard-column-visual';
    if (/镜号|镜头编号|^镜头$/.test(header)) return 'storyboard-column-shot';
    if (/景别/.test(header)) return 'storyboard-column-scene';
    if (/运镜/.test(header)) return 'storyboard-column-camera';
    if (/人物|动作/.test(header)) return 'storyboard-column-action';
    if (/台词|口播|文案/.test(header)) return 'storyboard-column-dialogue';
    if (/字幕|花字/.test(header)) return 'storyboard-column-subtitle';
    if (/音效|音乐/.test(header)) return 'storyboard-column-audio';
    if (/时长/.test(header)) return 'storyboard-column-duration';
    if (/卖点/.test(header)) return 'storyboard-column-selling-point';
    if (/备注/.test(header)) return 'storyboard-column-note';
    return '';
  };
  return (
    <section className="storyboard-polish-page">
      <nav className="storyboard-script-tabs" aria-label="脚本分类">
        {scriptCategories.map((item) => (
          <button
            key={item}
            className={item === activeCategory ? 'active' : ''}
            onClick={() => { setActiveCategory(item); setSearchText(''); setTypeFilter('all'); setStatusFilter('all'); setCurrentPage(1); }}
          >
            {item}
          </button>
        ))}
      </nav>

      <section className="storyboard-library-summary">
        <div>
          <h2>{activeCategory}</h2>
          <p>
            {activeCategory}共 {totalScripts} 篇，
            {activeCategory === '以产品维度的脚本' ? '按生成时关联的 Brief 分组，修改脚本名称不会改变归属。' : '按更新时间倒序展示。'}
          </p>
        </div>
        <div className="storyboard-summary-actions">
          <span>{totalScripts} 篇脚本</span>
        </div>
      </section>

      <section className="storyboard-filter-panel">
        <label className="storyboard-search">
          <SearchOutlined />
          <input value={searchText} onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }} placeholder="搜索脚本名称" />
        </label>
        <label className="storyboard-select">
          <span>脚本类型</span>
          <Select value={typeFilter} onChange={(value) => { setTypeFilter(value); setCurrentPage(1); }} options={[
            { value: 'all', label: '全部类型' },
            { value: 'viral', label: '爆款复刻脚本' },
            { value: 'template', label: '平台模板脚本' },
            { value: 'original', label: 'AI原创脚本' },
            { value: 'product', label: '产品维度脚本' },
            { value: 'product-dimension', label: '产品维度脚本（兼容）' },
          ]} />
        </label>
        <label className="storyboard-select">
          <span>状态</span>
          <Select value={statusFilter} onChange={(value) => { setStatusFilter(value); setCurrentPage(1); }} options={[
            { value: 'all', label: '全部状态' },
            ...scriptStatusOptions,
          ]} />
        </label>
        <button className="storyboard-reset-button" onClick={() => { setSearchText(''); setTypeFilter('all'); setStatusFilter('all'); setCurrentPage(1); }}><ReloadOutlined />重置</button>
      </section>

      <section className="storyboard-library-panel list">
        <div className={`storyboard-table-view ${activeCategory === '以产品维度的脚本' ? 'is-brief-grouped' : ''}`}>
            <div className="storyboard-table-head">
              <span>脚本名称</span>
              <span>脚本类型</span>
              <span>模板名字</span>
              <span>更新时间 <b>⌄</b></span>
              <span>状态</span>
              <span>操作</span>
            </div>
            {paginatedItems.length ? paginatedItems.map((item, index) => (
              <Fragment key={item.id}>
                {activeCategory === '以产品维度的脚本'
                  && (index === 0 || paginatedItems[index - 1].productGroupKey !== item.productGroupKey)
                  && (
                    <div className="storyboard-product-group">
                      <span>{item.productGroup}</span>
                    </div>
                  )}
                <article className="storyboard-table-row">
                {renamingScriptId === item.id ? (
                  <input
                    autoFocus
                    className="storyboard-script-name-input"
                    value={renameDraft}
                    maxLength={100}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onBlur={() => saveRenamedScript(item.id, item.name)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                      if (event.key === 'Escape') {
                        setRenamingScriptId(null);
                        setRenameDraft(item.name);
                      }
                    }}
                  />
                ) : (
                  <button type="button" className="storyboard-script-name-button" title="点击修改脚本名称" onClick={() => startRenameScript(item.id, item.name)}>
                    <FileTextOutlined /><span>{item.name}</span><EditOutlined />
                  </button>
                )}
                <em className={`script-type ${item.typeTone}`}>{item.type}</em>
                <span className={`storyboard-template-name ${item.templateName ? '' : 'is-empty'}`} title={item.templateName || '未记录'}>{item.templateName || '-'}</span>
                <time>{formatDateTime(item.updatedAt)}</time>
                <i className={`script-status ${item.statusTone}`}>{item.status}</i>
                <div className="storyboard-row-actions">
                  <button onClick={() => previewScript(item.id)}><EyeOutlined />预览</button>
                  <button onClick={() => polishScript(item.id)}><EditOutlined />继续润色</button>
                  <button onClick={() => copyScript(item.id)}><CopyOutlined />复制</button>
                  <Dropdown menu={scriptMoreMenu(item.id, item.name)} trigger={['click']} placement="bottomRight">
                    <button><MoreOutlined />更多</button>
                  </Dropdown>
                </div>
                </article>
              </Fragment>
            )) : (
              <div className="storyboard-empty-state">
                <FileTextOutlined />
                <strong>暂无脚本</strong>
                <span>当前项目还没有生成脚本，请先在脚本生成器中创建。</span>
              </div>
            )}
        </div>

        <footer className="storyboard-pagination">
          <span>共 {totalScripts} 条</span>
          <div>
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}><LeftOutlined /></button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i + 1} className={currentPage === i + 1 ? 'active' : ''} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
            ))}
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}><RightOutlined /></button>
            <Select<number>
              className="storyboard-page-size-select"
              aria-label="每页显示条数"
              value={pageSize}
              onChange={(value) => {
                setPageSize(value);
                setCurrentPage(1);
              }}
              options={[10, 20, 50].map((value) => ({ value, label: `${value} 条/页` }))}
            />
          </div>
        </footer>
      </section>

      <p className="storyboard-tip">小贴士：完善脚本内容并润色，可获得更高质量的分镜和视频效果</p>
      {preview && (
        <div className="script-output-backdrop storyboard-preview-backdrop" role="dialog" aria-modal="true" aria-labelledby="storyboard-preview-title">
          <section className="script-output-modal storyboard-preview-modal">
            <header className="script-output-head">
              <div className="script-output-heading">
                <div className="script-output-title-stack storyboard-preview-title-stack">
                  <div className="storyboard-preview-title-control">
                    {renamingScriptId === preview.id ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        maxLength={100}
                        aria-label="修改脚本名称"
                        onChange={(event) => setRenameDraft(event.target.value)}
                        onBlur={() => saveRenamedScript(preview.id, preview.name)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === 'Escape') {
                            setRenamingScriptId(null);
                            setRenameDraft(preview.name);
                          }
                        }}
                      />
                    ) : (
                      <>
                        <h2 id="storyboard-preview-title">{preview.name}</h2>
                        <button type="button" aria-label="修改脚本名称" onClick={() => startRenameScript(preview.id, preview.name)}><EditOutlined /></button>
                      </>
                    )}
                  </div>
                  <div className="script-output-meta">
                    {previewLeadingSourceLabels.filter(Boolean).map((label) => <em key={`leading-${label}`}>{label}</em>)}
                    {previewDurationLabel && <em>{previewDurationLabel}</em>}
                    <em>{preview.formatName || '分镜脚本表'}</em>
                    {previewTrailingSourceLabels.filter(Boolean).map((label) => <em key={`trailing-${label}`}>{label}</em>)}
                  </div>
                </div>
              </div>
              <button type="button" aria-label="关闭脚本预览" onClick={() => setPreview(null)}>×</button>
            </header>
            <article className="script-output-content storyboard-preview-content">
              <section className="polish-preview-panel storyboard-preview-panel">
                <header>
                  <div className="storyboard-preview-status-line">
                    <span>脚本预览</span>
                    <strong>{getScriptStatusLabel(preview.status)} · {formatDateTime(preview.updatedAt)}</strong>
                  </div>
                </header>
                <div className="polish-preview-scroll">
                  {previewRows.length ? (
                    <section className="script-output-block script-storyboard-block">
                      <div className="script-storyboard-table-wrap">
                        <table className={`script-storyboard-table storyboard-preview-table ${previewHeaders.length === 5 ? 'is-five-column' : ''}`}>
                          <caption className="script-storyboard-caption"><span>标题：</span>{previewContentTitle}</caption>
                          <colgroup>{previewHeaders.map((header) => <col key={header} className={previewColumnClass(header)} />)}</colgroup>
                          <thead><tr>{previewHeaders.map((header) => <th key={header} className={previewColumnClass(header)}>{/时长/.test(header) ? '时长(s)' : header}</th>)}</tr></thead>
                          <tbody>{previewRows.map((row) => (
                            <tr key={row.key}>{previewHeaders.map((header, index) => (
                              <td key={`${row.key}-${header}`} className={previewColumnClass(header)}><span className="storyboard-cell-content">{previewCellText(row.cells[index], /时长/.test(header))}</span></td>
                            ))}</tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </section>
                  ) : <div className="storyboard-preview-empty">当前脚本尚未生成可展示的分镜表格，请返回脚本生成器继续完善。</div>}
                </div>
              </section>
            </article>
          </section>
        </div>
      )}
    </section>
  );
};

export default StoryboardPanel;
