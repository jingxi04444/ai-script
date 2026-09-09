import json
from dataclasses import dataclass
from typing import Any


class GraphValidationError(ValueError):
    pass


@dataclass(frozen=True)
class WorkflowNode:
    id: str
    kind: str
    data: dict[str, Any]


class WorkflowGraph:
    def __init__(self, nodes: dict[str, WorkflowNode], upstream: dict[str, set[str]], downstream: dict[str, set[str]]):
        self.nodes = nodes
        self.upstream = upstream
        self.downstream = downstream

    @classmethod
    def from_json(cls, graph_json: str | dict[str, Any]) -> "WorkflowGraph":
        document = json.loads(graph_json) if isinstance(graph_json, str) else graph_json
        raw_nodes = document.get("nodes")
        raw_edges = document.get("edges")
        if not isinstance(raw_nodes, list) or not isinstance(raw_edges, list):
            raise GraphValidationError("workflow must contain nodes and edges arrays")

        nodes: dict[str, WorkflowNode] = {}
        for raw_node in raw_nodes:
            node_id = str(raw_node.get("id") or "").strip()
            data = raw_node.get("data") or {}
            kind = str(data.get("kind") or "").strip()
            if not node_id or not kind:
                raise GraphValidationError("every node requires id and data.kind")
            if node_id in nodes:
                raise GraphValidationError(f"duplicate node id: {node_id}")
            nodes[node_id] = WorkflowNode(node_id, kind, data)

        upstream = {node_id: set() for node_id in nodes}
        downstream = {node_id: set() for node_id in nodes}
        edge_keys: set[tuple[str, str]] = set()
        for raw_edge in raw_edges:
            source = str(raw_edge.get("source") or "")
            target = str(raw_edge.get("target") or "")
            if source not in nodes or target not in nodes:
                raise GraphValidationError(f"edge references missing node: {source} -> {target}")
            if source == target:
                raise GraphValidationError(f"self edge is not allowed: {source}")
            edge_key = (source, target)
            if edge_key in edge_keys:
                raise GraphValidationError(f"duplicate edge: {source} -> {target}")
            edge_keys.add(edge_key)
            upstream[target].add(source)
            downstream[source].add(target)

        graph = cls(nodes, upstream, downstream)
        graph.layers()
        return graph

    def layers(self) -> list[list[WorkflowNode]]:
        indegree = {node_id: len(parents) for node_id, parents in self.upstream.items()}
        ready = sorted(node_id for node_id, degree in indegree.items() if degree == 0)
        layers: list[list[WorkflowNode]] = []
        visited = 0
        while ready:
            current_ids = ready
            layers.append([self.nodes[node_id] for node_id in current_ids])
            visited += len(current_ids)
            next_ready: list[str] = []
            for node_id in current_ids:
                for target in sorted(self.downstream[node_id]):
                    indegree[target] -= 1
                    if indegree[target] == 0:
                        next_ready.append(target)
            ready = sorted(next_ready)
        if visited != len(self.nodes):
            raise GraphValidationError("workflow contains a cycle")
        return layers

    def inputs_for(self, node_id: str, outputs: dict[str, dict[str, Any]]) -> dict[str, Any]:
        return {
            "upstream": {
                parent_id: outputs[parent_id]
                for parent_id in sorted(self.upstream[node_id])
                if parent_id in outputs
            }
        }
