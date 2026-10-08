import type { WorkflowEdge, WorkflowNode } from '../types/workflow';

const GAP_X = 100;
const GAP_Y = 72;
const ORIGIN = 80;

const dimensions = (node: WorkflowNode) => ({
  width: node.measured?.width || node.width || 340,
  height: node.measured?.height || node.height || 300,
});

/** Lay out dependencies left-to-right, and loose resources in a compact grid.
 * Strongly connected components keep cycles together without losing any edges.
 * Only positions change; measured sizes include the title outside each card.
 */
export function arrangeWorkflowNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const visible = nodes.filter(node => !node.hidden);
  if (!visible.length) return nodes;
  const byId = new Map(visible.map(node => [node.id, node]));
  const outgoing = new Map(visible.map(node => [node.id, new Set<string>()]));
  const linked = new Set<string>();
  for (const edge of edges) {
    if (edge.source === edge.target || !byId.has(edge.source) || !byId.has(edge.target)) continue;
    outgoing.get(edge.source)!.add(edge.target);
    linked.add(edge.source);
    linked.add(edge.target);
  }

  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let index = 0;
  const visit = (id: string) => {
    indices.set(id, index);
    lowLinks.set(id, index++);
    stack.push(id);
    onStack.add(id);
    for (const target of outgoing.get(id)!) {
      if (!indices.has(target)) {
        visit(target);
        lowLinks.set(id, Math.min(lowLinks.get(id)!, lowLinks.get(target)!));
      } else if (onStack.has(target)) {
        lowLinks.set(id, Math.min(lowLinks.get(id)!, indices.get(target)!));
      }
    }
    if (lowLinks.get(id) !== indices.get(id)) return;
    const component: string[] = [];
    let member: string;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
    } while (member !== id);
    components.push(component);
  };
  for (const id of linked) if (!indices.has(id)) visit(id);

  const componentOf = new Map<string, number>();
  components.forEach((members, i) => members.forEach(id => componentOf.set(id, i)));
  const parents = components.map(() => new Set<number>());
  for (const id of linked) {
    for (const target of outgoing.get(id)!) {
      const sourceGroup = componentOf.get(id)!;
      const targetGroup = componentOf.get(target)!;
      if (sourceGroup !== targetGroup) parents[targetGroup].add(sourceGroup);
    }
  }
  const ranks = new Map<number, number>();
  const rank = (group: number): number => {
    if (ranks.has(group)) return ranks.get(group)!;
    let result = 0;
    for (const parent of parents[group]) result = Math.max(result, rank(parent) + 1);
    ranks.set(group, result);
    return result;
  };
  const columns = new Map<number, WorkflowNode[]>();
  for (const node of visible) {
    if (!linked.has(node.id)) continue;
    const column = rank(componentOf.get(node.id)!);
    columns.set(column, [...(columns.get(column) || []), node]);
  }
  const positions = new Map<string, { x: number; y: number }>();
  let x = ORIGIN;
  let bottom = ORIGIN;
  for (const [, column] of [...columns].sort(([a], [b]) => a - b)) {
    let y = ORIGIN;
    let width = 0;
    for (const node of column) {
      positions.set(node.id, { x, y });
      const size = dimensions(node);
      width = Math.max(width, size.width);
      bottom = Math.max(bottom, y + size.height);
      y += size.height + GAP_Y;
    }
    x += width + GAP_X;
  }

  const loose = visible.filter(node => !linked.has(node.id));
  const count = Math.min(3, Math.ceil(Math.sqrt(loose.length)));
  const widths = Array.from({ length: count }, () => 0);
  loose.forEach((node, i) => { widths[i % count] = Math.max(widths[i % count], dimensions(node).width); });
  let y = linked.size ? bottom + GAP_Y * 2 : ORIGIN;
  for (let start = 0; start < loose.length; start += count) {
    x = ORIGIN;
    let height = 0;
    for (let column = 0; column < count && start + column < loose.length; column++) {
      const node = loose[start + column];
      positions.set(node.id, { x, y });
      height = Math.max(height, dimensions(node).height);
      x += widths[column] + GAP_X;
    }
    y += height + GAP_Y;
  }
  return nodes.map(node => positions.has(node.id) ? { ...node, position: positions.get(node.id)! } : node);
}
