export interface EditableMatrixState {
  columns: string[];
  rows: string[][];
}

export const paragraphStructureColumns = ['段落原文', '核心概括', '功能定位'];
export const formulaChecklistColumns = ['步骤', '执行内容', '通用格式', '说明'];

export const createEmptyMatrixRow = (columnCount: number): string[] => (
  Array.from({ length: columnCount }, () => '')
);

export const createEmptyMatrix = (columns: string[]): EditableMatrixState => ({
  columns: [...columns],
  rows: [createEmptyMatrixRow(columns.length)],
});

const splitMarkdownRow = (line: string) => line
  .trim()
  .replace(/^\|/, '')
  .replace(/\|$/, '')
  .split(/(?<!\\)\|/)
  .map((cell) => cell.replace(/\\\|/g, '|').replace(/<br\s*\/?\s*>/gi, '\n').trim());

const isSeparatorRow = (cells: string[]) => (
  cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
);

const escapeMarkdownCell = (value: string) => (
  value.trim().replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
);

const normalizeRows = (rows: string[][], columnCount: number) => (
  rows.map((row) => Array.from({ length: columnCount }, (_, index) => row[index] ?? ''))
);

export const parseEditableMatrix = (value: string | undefined, defaultColumns: string[]): EditableMatrixState => {
  if (!value?.trim()) return createEmptyMatrix(defaultColumns);

  const tableRows = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map(splitMarkdownRow);

  if (tableRows.length) {
    const columns = tableRows[0].length ? tableRows[0] : [...defaultColumns];
    const dataRows = tableRows.slice(1).filter((cells) => !isSeparatorRow(cells));
    return {
      columns,
      rows: normalizeRows(
        dataRows.length ? dataRows : [createEmptyMatrixRow(columns.length)],
        columns.length,
      ),
    };
  }

  const rows = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((firstCell) => [firstCell, ...createEmptyMatrixRow(defaultColumns.length - 1)]);

  return {
    columns: [...defaultColumns],
    rows: rows.length ? rows : [createEmptyMatrixRow(defaultColumns.length)],
  };
};

export const serializeEditableMatrix = ({ columns, rows }: EditableMatrixState) => {
  const safeColumns = columns.length
    ? columns.map((column, index) => column.trim() || `自定义列${index + 1}`)
    : ['自定义列1'];
  const serializedRows = normalizeRows(
    rows.length ? rows : [createEmptyMatrixRow(safeColumns.length)],
    safeColumns.length,
  );

  return [
    `| ${safeColumns.map(escapeMarkdownCell).join(' | ')} |`,
    `| ${safeColumns.map(() => '---').join(' | ')} |`,
    ...serializedRows.map((row) => `| ${row.map(escapeMarkdownCell).join(' | ')} |`),
  ].join('\n');
};
