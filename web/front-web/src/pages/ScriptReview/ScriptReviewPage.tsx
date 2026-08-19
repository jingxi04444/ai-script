import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircleOutlined, CloseCircleOutlined, CommentOutlined, DeleteOutlined, EditOutlined, HistoryOutlined, LeftOutlined, LoadingOutlined, MoreOutlined, RightOutlined } from '@ant-design/icons';
import { Dropdown, message, Select } from 'antd';
import { useParams } from 'react-router-dom';
import { scriptApi } from '../../api/script';
import { useAuthStore } from '../../stores/authStore';
import { normalizeScriptStatus, scriptStatusOptions } from '../../types/script';
import type { ScriptReviewContext, ScriptStatus } from '../../types/script';
import { extractScriptContentTitle, withoutScriptContentTitle } from '../../utils/scriptContent';
import './script-review-page.css';

interface ReviewTableData {
  title: string;
  headers: string[];
  rows: string[][];
}

const TITLE_ROW_INDEX = -1;
const TITLE_COLUMN_INDEX = -1;
const TITLE_COLUMN_KEY = 'title';

const isTitleCommentTarget = (rowIndex?: number, columnKey?: string) => (
  rowIndex === TITLE_ROW_INDEX && columnKey === TITLE_COLUMN_KEY
);

const selectedColumnKey = (selection: { rowIndex: number; columnIndex: number }) => (
  selection.rowIndex === TITLE_ROW_INDEX ? TITLE_COLUMN_KEY : String(selection.columnIndex)
);

const splitMarkdownRow = (line: string) => line
  .replace(/^\|/, '')
  .replace(/\|$/, '')
  .split('|')
  .map((cell) => cell.trim());

const normalizeRows = (rows: string[][]) => {
  const width = Math.max(1, ...rows.map((row) => row.length));
  return rows.map((row) => [...row, ...Array(Math.max(0, width - row.length)).fill('')]);
};

const parseReviewTable = (content?: string, fallbackTitle = ''): ReviewTableData => {
  const lines = withoutScriptContentTitle(content).split('\n').map((line) => line.trim()).filter(Boolean);
  const title = extractScriptContentTitle(content, fallbackTitle);
  const tableLines = lines.filter((line) => line.startsWith('|') && line.endsWith('|'));
  if (tableLines.length >= 2) {
    const headers = splitMarkdownRow(tableLines[0]);
    const secondRow = splitMarkdownRow(tableLines[1]);
    const hasDivider = secondRow.length > 0 && secondRow.every((cell) => /^:?-{3,}:?$/.test(cell));
    return { title, headers, rows: normalizeRows(tableLines.slice(hasDivider ? 2 : 1).map(splitMarkdownRow)) };
  }

  return {
    title,
    headers: [],
    rows: normalizeRows(lines.map((line) => line.split(/\t|\s*\|\s*/).filter(Boolean))),
  };
};

const reviewStatusOptions = scriptStatusOptions.map((option) => ({
  ...option,
  label: option.value === 'approved' ? '审核通过' : option.value === 'changes_requested' ? '需要修改' : option.label,
  disabled: option.value !== 'approved' && option.value !== 'changes_requested',
}));

const reviewColumnClass = (header = '') => {
  if (/镜号|镜头编号|^镜头$/.test(header)) return 'review-column-shot';
  if (/景别/.test(header)) return 'review-column-scene';
  if (/运镜/.test(header)) return 'review-column-camera';
  if (/画面|场景描述/.test(header)) return 'review-column-visual';
  if (/台词|旁白|口播|文案/.test(header)) return 'review-column-dialogue';
  if (/时长/.test(header)) return 'review-column-duration';
  if (/卖点/.test(header)) return 'review-column-selling-point';
  if (/备注/.test(header)) return 'review-column-note';
  return '';
};

const reviewCellText = (value: string, header = '') => {
  const normalized = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/^\*\*(.*?)\*\*$/, '$1')
    .trim() || '-';
  return /时长/.test(header) ? normalized.replace(/\s*(?:s|秒)\s*$/i, '').trim() : normalized;
};

const ScriptReviewPage = () => {
  const { token = '' } = useParams();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [context, setContext] = useState<ScriptReviewContext>();
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [target, setTarget] = useState<{ rowIndex?: number; columnKey?: string; parentId?: string }>();
  const [editingCommentId, setEditingCommentId] = useState<string>();
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; columnIndex: number; content: string }>();
  const [cellCommentMode, setCellCommentMode] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [versionSelectOpen, setVersionSelectOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [compareVersionId, setCompareVersionId] = useState<string>();
  const [decisionSaving, setDecisionSaving] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const tableData = useMemo(() => parseReviewTable(
    selectedVersionId
      ? context?.versions.find((item) => item.id === selectedVersionId)?.content || context?.script.content
      : context?.script.content,
    context?.script.name,
  ), [context, selectedVersionId]);
  const compareTableData = useMemo(() => parseReviewTable(
    compareVersionId ? context?.versions.find((item) => item.id === compareVersionId)?.content : undefined,
    context?.script.name,
  ), [compareVersionId, context]);
  const { title, headers, rows } = tableData;
  const compareTitle = compareTableData.title;
  const compareRows = compareTableData.rows;
  const changedCellCount = useMemo(() => {
    if (!compareVersionId || compareVersionId === selectedVersionId) return 0;
    const changedTitleCount = title !== compareTitle ? 1 : 0;
    return changedTitleCount + rows.reduce((total, row, rowIndex) => total + row.reduce(
      (rowTotal, cell, columnIndex) => rowTotal + (cell !== (compareRows[rowIndex]?.[columnIndex] || '') ? 1 : 0),
      0,
    ), 0);
  }, [compareRows, compareTitle, compareVersionId, rows, selectedVersionId, title]);
  const versionLabels = useMemo(() => new Map(
    (context?.versions || []).map((version) => [version.id, `V${version.versionNo}`]),
  ), [context?.versions]);
  const titleComments = context?.comments.filter((item) => isTitleCommentTarget(item.rowIndex, item.columnKey)) || [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await scriptApi.getReviewContext(token);
      setContext(data);
      setSelectedVersionId(
        data.versions.find((item) => item.current)?.id
        || data.versions[data.versions.length - 1]?.id,
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '评审链接加载失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const submitComment = async () => {
    if (!comment.trim()) return;
    if (!editingCommentId && !target?.parentId && (target?.rowIndex == null || target?.columnKey == null)) {
      message.warning('请先点击需要评论的标题或单元格');
      return;
    }
    try {
      if (editingCommentId) {
        const saved = await scriptApi.updateReviewComment(editingCommentId, comment.trim());
        setContext((current) => current ? { ...current, comments: current.comments.map((item) => item.id === saved.id ? saved : item) } : current);
      } else {
        const saved = await scriptApi.addReviewComment(token, {
          content: comment.trim(), parentId: target?.parentId, versionId: selectedVersionId, rowIndex: target?.rowIndex, columnKey: target?.columnKey,
        });
        setContext((current) => current ? { ...current, comments: [...current.comments, saved] } : current);
      }
      setComment('');
      if (editingCommentId || target?.parentId) setTarget(undefined);
      setEditingCommentId(undefined);
      message.success('批注已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批注保存失败');
    }
  };

  const deleteComment = async (id: string) => {
    try {
      await scriptApi.deleteReviewComment(id);
      setContext((current) => current ? { ...current, comments: current.comments.filter((item) => item.id !== id && item.parentId !== id) } : current);
      message.success('批注已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批注删除失败');
    }
  };

  const openSelectedCellComment = () => {
    setCellCommentMode(true);
    setEditingCommentId(undefined);
    setSideCollapsed(false);
    if (!selectedCell) {
      setTarget(undefined);
      message.info('评论模式已开启，请点击需要评论的标题或单元格');
      return;
    }
    setTarget({ rowIndex: selectedCell.rowIndex, columnKey: selectedColumnKey(selectedCell) });
    setComment('');
    window.setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const closeCellComment = () => {
    setCellCommentMode(false);
    setTarget(undefined);
    setEditingCommentId(undefined);
    setComment('');
  };

  const selectReviewCell = (rowIndex: number, columnIndex: number, content: string) => {
    setSelectedCell({ rowIndex, columnIndex, content });
    const firstComment = context?.comments.find((item) => item.rowIndex === rowIndex && item.columnKey === String(columnIndex));
    if (firstComment) {
      setSideCollapsed(false);
      window.setTimeout(() => document.getElementById(`review-comment-${firstComment.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
    }
    if (!cellCommentMode) return;
    setTarget({ rowIndex, columnKey: String(columnIndex) });
    setEditingCommentId(undefined);
    setComment('');
    setSideCollapsed(false);
    window.setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const selectReviewTitle = () => {
    setSelectedCell({ rowIndex: TITLE_ROW_INDEX, columnIndex: TITLE_COLUMN_INDEX, content: title });
    const firstComment = titleComments[0];
    if (firstComment) {
      setSideCollapsed(false);
      window.setTimeout(() => document.getElementById(`review-comment-${firstComment.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
    }
    if (!cellCommentMode) return;
    setTarget({ rowIndex: TITLE_ROW_INDEX, columnKey: TITLE_COLUMN_KEY });
    setEditingCommentId(undefined);
    setComment('');
    setSideCollapsed(false);
    window.setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const changeSelectedVersion = (versionId: string) => {
    setVersionSelectOpen(false);
    setSelectedVersionId(versionId);
    if (compareVersionId === versionId) setCompareVersionId(undefined);
    setSelectedCell(undefined);
    setTarget(undefined);
    setEditingCommentId(undefined);
    setCellCommentMode(false);
  };

  const locateComment = (rowIndex?: number, columnKey?: string) => {
    if (rowIndex == null || columnKey == null) return;
    if (isTitleCommentTarget(rowIndex, columnKey)) {
      setSelectedCell({ rowIndex: TITLE_ROW_INDEX, columnIndex: TITLE_COLUMN_INDEX, content: title });
      document.getElementById('script-review-title-target')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const columnIndex = Number(columnKey);
    setSelectedCell({ rowIndex, columnIndex, content: rows[rowIndex]?.[columnIndex] || '' });
    document.getElementById(`review-cell-${rowIndex}-${columnIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  };

  const submitDecision = async (decision: 'approved' | 'changes_requested', includeDraftOpinion = false) => {
    if (decisionSaving) return;
    setDecisionSaving(true);
    try {
      await scriptApi.submitReviewDecision(token, {
        decision,
        versionId: selectedVersionId,
        opinion: includeDraftOpinion ? comment.trim() || undefined : undefined,
      });
      const refreshed = await scriptApi.getReviewContext(token);
      setContext(refreshed);
      setComment('');
      setTarget(undefined);
      setEditingCommentId(undefined);
      message.success(decision === 'approved' ? '已提交通过意见' : '已提交修改意见');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审核意见提交失败');
    } finally {
      setDecisionSaving(false);
    }
  };

  const changeReviewStatus = (status: ScriptStatus) => {
    if (status !== 'approved' && status !== 'changes_requested') return;
    void submitDecision(status);
  };

  if (loading) return <div className="script-review-state"><LoadingOutlined spin /> 正在加载评审脚本…</div>;
  if (!context) return <div className="script-review-state">评审链接不存在或已失效</div>;

  return (
    <main className="script-review-page">
      <header className="script-review-header">
        <div className="script-review-header-spacer" aria-hidden="true" />
        <div className="script-review-heading">
          <div className="script-review-title-row">
            <h1>{context.script.name}</h1>
            <Select<ScriptStatus>
              className={`script-review-status-select is-${normalizeScriptStatus(context.script.status)}`}
              aria-label="标记脚本审核状态"
              value={normalizeScriptStatus(context.script.status)}
              options={reviewStatusOptions}
              loading={decisionSaving}
              disabled={decisionSaving || !context.access.canSubmitReview}
              onChange={changeReviewStatus}
            />
          </div>
          <div className="script-review-meta">
            {context.script.duration && <em>{context.script.duration}</em>}
            <em>{context.script.formatName || '分镜脚本表'}</em>
          </div>
        </div>
        <div className="script-review-version">
          <button
            type="button"
            className="script-review-version-trigger"
            aria-expanded={versionSelectOpen}
            aria-label="打开可查看的脚本版本"
            onClick={() => setVersionSelectOpen((open) => !open)}
          >
            <HistoryOutlined />
            <span>查看版本</span>
          </button>
          <Select
            open={versionSelectOpen}
            value={selectedVersionId}
            aria-label="选择要查看的脚本版本"
            onDropdownVisibleChange={setVersionSelectOpen}
            onChange={changeSelectedVersion}
            options={context.versions.map((v) => ({ value: v.id, label: `V${v.versionNo} ${v.current ? '· 当前版本' : ''}` }))}
          />
          <span>对比</span>
          <Select allowClear value={compareVersionId} placeholder="选择对比版本" onChange={setCompareVersionId} options={context.versions.filter((v) => v.id !== selectedVersionId).map((v) => ({ value: v.id, label: `V${v.versionNo}` }))} />
          {compareVersionId && <em>{changedCellCount ? `${changedCellCount} 处变更` : '内容一致'}</em>}
        </div>
      </header>
      <section className={`script-review-workbench ${sideCollapsed ? 'is-side-collapsed' : ''}`}>
        <article className="script-review-table-panel">
          <div className="script-review-table-tools">
            <div><span>脚本预览</span><strong>{cellCommentMode ? '评论模式：点击标题或单元格后在右侧输入意见；可点击“退出评论”结束' : '点击“评论”，再选择需要批注的标题或单元格'}</strong></div>
            <button
              type="button"
              className={cellCommentMode ? 'active' : ''}
              aria-pressed={cellCommentMode}
              onClick={cellCommentMode ? closeCellComment : openSelectedCellComment}
            ><CommentOutlined />{cellCommentMode ? '退出评论' : '评论'}</button>
          </div>
          <div className="script-review-table-scroll">
            <table aria-label="脚本评审内容">
              <caption
                id="script-review-title-target"
                className={`script-review-table-caption ${compareVersionId && compareVersionId !== selectedVersionId && title !== compareTitle ? 'is-version-changed' : ''} ${selectedCell?.rowIndex === TITLE_ROW_INDEX ? 'is-comment-selected' : ''}`}
              >
                <span>标题：</span>
                <button type="button" className="script-review-title-select" onClick={selectReviewTitle}>{title}</button>
                {titleComments.length > 0 && <em className="script-review-title-comment" title={`${titleComments.length} 条标题评论`} aria-label={`${titleComments.length} 条标题评论`} />}
              </caption>
              {headers.length > 0 && (
                <colgroup>{headers.map((header, index) => <col key={`${header}-${index}`} className={reviewColumnClass(header)} />)}</colgroup>
              )}
              {headers.length > 0 && (
                <thead><tr>{headers.map((header, index) => (
                  <th key={`${header}-${index}`} className={reviewColumnClass(header)}>{/时长/.test(header) ? '时长(s)' : header}</th>
                ))}</tr></thead>
              )}
              <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, columnIndex) => {
                const header = headers[columnIndex] || '';
                const previousCell = compareRows[rowIndex]?.[columnIndex] || '';
                const changed = Boolean(compareVersionId && compareVersionId !== selectedVersionId && cell !== previousCell);
                const cellComments = context.comments.filter((item) =>
                  item.rowIndex === rowIndex
                  && item.columnKey === String(columnIndex),
                );
                return <td
                  key={columnIndex}
                  id={`review-cell-${rowIndex}-${columnIndex}`}
                  className={`${reviewColumnClass(header)} ${changed ? 'is-version-changed' : ''} ${selectedCell?.rowIndex === rowIndex && selectedCell?.columnIndex === columnIndex ? 'is-comment-selected' : ''}`}
                  title={changed ? `对比版本：${previousCell || '（空）'}` : undefined}
                  tabIndex={0}
                  onClick={() => selectReviewCell(rowIndex, columnIndex, cell)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectReviewCell(rowIndex, columnIndex, cell);
                    }
                  }}
                ><span>{reviewCellText(cell, header)}</span>{cellComments.length > 0 && <em className="script-review-cell-comment" title={`${cellComments.length} 条评论`} aria-label={`${cellComments.length} 条评论`} />}</td>;
              })}</tr>)}</tbody>
            </table>
          </div>
        </article>
        {!sideCollapsed && <aside className="script-review-side-panel">
          <header><div className="script-review-side-heading"><CommentOutlined /><strong>评论</strong><small>仅可评论与审核，无法修改脚本</small></div><button type="button" title="收起侧边栏" onClick={() => setSideCollapsed(true)}><RightOutlined /></button></header>
          <div className="script-review-comments">
            {context.comments.map((item) => {
              const location = item.rowIndex == null
                ? '整篇意见'
                : isTitleCommentTarget(item.rowIndex, item.columnKey)
                  ? '标题'
                  : `第 ${item.rowIndex + 1} 行${item.columnKey == null ? '' : ` · ${headers[Number(item.columnKey)] || `第 ${Number(item.columnKey) + 1} 列`}`}`;
              const authorName = item.username?.trim() || '未知用户';
              const canEdit = item.mine || item.userId === currentUserId;
              const canDelete = item.deletable || canEdit;
              const menuItems = [
                { key: 'reply', icon: <CommentOutlined />, label: '回复' },
                ...(canEdit ? [
                  { key: 'edit', icon: <EditOutlined />, label: '编辑' },
                ] : []),
                ...(canDelete ? [
                  { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
                ] : []),
              ];
              return (
                <article id={`review-comment-${item.id}`} key={item.id} className={`${item.parentId ? 'is-reply' : ''} ${selectedCell && selectedCell.rowIndex === item.rowIndex && selectedColumnKey(selectedCell) === item.columnKey ? 'is-active' : ''}`} onClick={() => locateComment(item.rowIndex, item.columnKey)}>
                  <header className="script-review-comment-head">
                    <span className="script-review-comment-avatar">{item.userAvatar ? <img src={item.userAvatar} alt="" /> : authorName.slice(0, 1).toUpperCase()}</span>
                    <div className="script-review-comment-meta">
                      <div><strong>{authorName}</strong><time>{item.createdAt?.replace('T', ' ').replace(/\.\d+$/, '')}</time></div>
                      <small>{item.versionId ? `${versionLabels.get(item.versionId) || '历史版本'} · ${location}` : location}</small>
                    </div>
                    <Dropdown
                      trigger={['click']}
                      placement="bottomRight"
                      menu={{
                        items: menuItems,
                        onClick: ({ key, domEvent }) => {
                          domEvent.stopPropagation();
                          if (key === 'reply') {
                            setTarget({ parentId: item.id });
                            setEditingCommentId(undefined);
                            setComment('');
                            setCellCommentMode(false);
                            window.setTimeout(() => commentInputRef.current?.focus(), 0);
                          }
                          if (key === 'edit') {
                            setEditingCommentId(item.id);
                            setTarget(undefined);
                            setComment(item.content);
                            setCellCommentMode(false);
                            window.setTimeout(() => commentInputRef.current?.focus(), 0);
                          }
                          if (key === 'delete') void deleteComment(item.id);
                        },
                      }}
                    >
                      <button type="button" className="script-review-comment-more" aria-label="评论操作" onClick={(event) => event.stopPropagation()}><MoreOutlined /></button>
                    </Dropdown>
                  </header>
                  <p>{item.content}</p>
                </article>
              );
            })}
            {!context.comments.length && <p className="script-review-empty">暂无批注</p>}
          </div>
          <div className="script-review-editor">
            {editingCommentId && <span>正在编辑自己的批注</span>}
            {target?.parentId && <span>正在回复批注 <button onClick={() => setTarget(undefined)}>取消</button></span>}
            {target && !target.parentId && <span className="script-review-editor-target">正在批注：{isTitleCommentTarget(target.rowIndex, target.columnKey) ? '标题' : `第 ${(target.rowIndex ?? 0) + 1} 行 · ${headers[Number(target.columnKey ?? 0)] || `第 ${Number(target.columnKey ?? 0) + 1} 列`}`} <button onClick={() => { setTarget(undefined); setSelectedCell(undefined); }}>取消定位</button></span>}
            {cellCommentMode && !target && !editingCommentId && <span className="script-review-editor-hint">请点击左侧标题或表格中的一个单元格</span>}
            <textarea ref={commentInputRef} value={comment} disabled={!editingCommentId && !target} onChange={(event) => setComment(event.target.value)} placeholder={target ? `输入${isTitleCommentTarget(target.rowIndex, target.columnKey) ? '标题' : '该单元格'}的修改意见` : '请先选择需要评论的标题或单元格'} />
            <button className="primary" type="button" disabled={!comment.trim() || (!editingCommentId && !target)} onClick={submitComment}>发送评论</button>
            <div><button type="button" disabled={decisionSaving} onClick={() => submitDecision('changes_requested', true)}><CloseCircleOutlined />需要修改</button><button type="button" disabled={decisionSaving} onClick={() => submitDecision('approved', true)}><CheckCircleOutlined />审核通过</button></div>
          </div>
        </aside>}
        {sideCollapsed && <button type="button" className="script-review-side-expand" title="展开评论" aria-label="展开评论" onClick={() => setSideCollapsed(false)}><LeftOutlined /></button>}
      </section>
    </main>
  );
};

export default ScriptReviewPage;
