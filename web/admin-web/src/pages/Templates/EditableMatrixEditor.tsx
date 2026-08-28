import type { Dispatch, SetStateAction } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { createEmptyMatrixRow, type EditableMatrixState } from './editableMatrix';

interface EditableMatrixEditorProps {
  label: string;
  state: EditableMatrixState;
  setState: Dispatch<SetStateAction<EditableMatrixState>>;
}

const reorder = <T,>(items: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

const EditableMatrixEditor = ({ label, state, setState }: EditableMatrixEditorProps) => {
  const updateColumn = (index: number, value: string) => {
    setState((current) => ({
      ...current,
      columns: current.columns.map((column, columnIndex) => (columnIndex === index ? value : column)),
    }));
  };

  const addColumn = () => {
    setState((current) => ({
      columns: [...current.columns, `自定义列${current.columns.length + 1}`],
      rows: current.rows.map((row) => [...row, '']),
    }));
  };

  const removeColumn = (index: number) => {
    setState((current) => {
      if (current.columns.length <= 1) return current;
      return {
        columns: current.columns.filter((_, columnIndex) => columnIndex !== index),
        rows: current.rows.map((row) => row.filter((_, columnIndex) => columnIndex !== index)),
      };
    });
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    setState((current) => ({
      columns: reorder(current.columns, index, index + direction),
      rows: current.rows.map((row) => reorder(row, index, index + direction)),
    }));
  };

  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    setState((current) => ({
      ...current,
      rows: current.rows.map((row, currentRowIndex) => (
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) => (currentColumnIndex === columnIndex ? value : cell))
          : row
      )),
    }));
  };

  const addRow = () => {
    setState((current) => ({
      ...current,
      rows: [...current.rows, createEmptyMatrixRow(current.columns.length)],
    }));
  };

  const removeRow = (index: number) => {
    setState((current) => ({
      ...current,
      rows: current.rows.length <= 1
        ? [createEmptyMatrixRow(current.columns.length)]
        : current.rows.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setState((current) => ({
      ...current,
      rows: reorder(current.rows, index, index + direction),
    }));
  };

  const gridTemplateColumns = `repeat(${state.columns.length}, minmax(220px, 1fr)) 132px`;

  return (
    <div className="field editable-matrix-editor">
      <div className="editable-matrix-header">
        <span>{label}</span>
        <div className="editable-matrix-actions">
          <button className="table-btn" type="button" onClick={addColumn}><Plus size={15} />新增一列</button>
          <button className="table-btn" type="button" onClick={addRow}><Plus size={15} />新增一行</button>
        </div>
      </div>
      <div className="editable-matrix-table">
        <div className="editable-matrix-row editable-matrix-head" style={{ gridTemplateColumns }}>
          {state.columns.map((column, columnIndex) => (
            <div className="editable-matrix-column-head" key={columnIndex}>
              <input
                value={column}
                onChange={(event) => updateColumn(columnIndex, event.target.value)}
                placeholder={`自定义列${columnIndex + 1}`}
              />
              <div className="editable-matrix-direction-actions">
                <button type="button" onClick={() => moveColumn(columnIndex, -1)} disabled={columnIndex === 0} title="左移此列" aria-label={`左移第 ${columnIndex + 1} 列`}><ArrowLeft size={14} /></button>
                <button type="button" onClick={() => moveColumn(columnIndex, 1)} disabled={columnIndex === state.columns.length - 1} title="右移此列" aria-label={`右移第 ${columnIndex + 1} 列`}><ArrowRight size={14} /></button>
                <button className="danger" type="button" onClick={() => removeColumn(columnIndex)} disabled={state.columns.length <= 1} title="删除此列" aria-label={`删除第 ${columnIndex + 1} 列`}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <span className="editable-matrix-operation-head">行操作</span>
        </div>
        {state.rows.map((row, rowIndex) => (
          <div className="editable-matrix-row" style={{ gridTemplateColumns }} key={rowIndex}>
            {state.columns.map((column, columnIndex) => (
              <textarea
                key={columnIndex}
                value={row[columnIndex] || ''}
                onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                placeholder={column || `自定义列${columnIndex + 1}`}
              />
            ))}
            <div className="editable-matrix-row-actions">
              <button type="button" onClick={() => moveRow(rowIndex, -1)} disabled={rowIndex === 0} title="上移此行" aria-label={`上移第 ${rowIndex + 1} 行`}><ArrowUp size={15} /></button>
              <button type="button" onClick={() => moveRow(rowIndex, 1)} disabled={rowIndex === state.rows.length - 1} title="下移此行" aria-label={`下移第 ${rowIndex + 1} 行`}><ArrowDown size={15} /></button>
              <button className="danger" type="button" onClick={() => removeRow(rowIndex)} title="删除此行" aria-label={`删除第 ${rowIndex + 1} 行`}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditableMatrixEditor;
