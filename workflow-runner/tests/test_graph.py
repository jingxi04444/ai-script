import unittest

from app.engine.graph import GraphValidationError, WorkflowGraph


class WorkflowGraphTest(unittest.TestCase):
    def test_graph_builds_parallel_topological_layers(self):
        graph = WorkflowGraph.from_json({
            "nodes": [
                {"id": "product", "data": {"kind": "product"}},
                {"id": "scene", "data": {"kind": "scene"}},
                {"id": "image", "data": {"kind": "image"}},
                {"id": "video", "data": {"kind": "video"}},
            ],
            "edges": [
                {"source": "product", "target": "image"},
                {"source": "scene", "target": "image"},
                {"source": "image", "target": "video"},
            ],
        })

        self.assertEqual([[node.id for node in layer] for layer in graph.layers()], [
            ["product", "scene"],
            ["image"],
            ["video"],
        ])
        self.assertEqual(
            set(graph.inputs_for("image", {"product": {"asset": "p"}, "scene": {"asset": "s"}})["upstream"]),
            {"product", "scene"},
        )

    def test_graph_rejects_cycle(self):
        with self.assertRaisesRegex(GraphValidationError, "cycle"):
            WorkflowGraph.from_json({
                "nodes": [
                    {"id": "a", "data": {"kind": "text"}},
                    {"id": "b", "data": {"kind": "video"}},
                ],
                "edges": [
                    {"source": "a", "target": "b"},
                    {"source": "b", "target": "a"},
                ],
            })
