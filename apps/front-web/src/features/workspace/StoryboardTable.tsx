import type { StoryboardRow } from '../../types/script';

export function StoryboardTable({ rows }: { rows: StoryboardRow[] }) {
  const visibleRows = rows.length ? rows : [{ shot: '待生成', type: '-', scene: '点击生成脚本后展示分镜表', line: '-', duration: '-', point: '-', risk: '-' }];
  return <div className="table-wrap"><table><thead><tr><th>镜号</th><th>景别</th><th>画面描述</th><th>台词</th><th>时长</th><th>卖点</th><th>风险</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.shot}><td>{row.shot}</td><td>{row.type}</td><td>{row.scene}</td><td>{row.line}</td><td>{row.duration}</td><td>{row.point}</td><td>{row.risk}</td></tr>)}</tbody></table></div>;
}
