package com.aiscript.modules.workflow.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class WorkflowServiceImplTest {
    private final WorkflowServiceImpl service = new WorkflowServiceImpl(null, new ObjectMapper());

    @Test
    void validatesProductVideoDagAndEstimatesOutput() {
        String graphJson = """
            {
              "nodes": [
                {"id":"product","data":{"kind":"product"}},
                {"id":"batch","data":{"kind":"batchMaterial","batchSize":100}},
                {"id":"video","data":{"kind":"video","batchSize":16}},
                {"id":"export","data":{"kind":"export","outputCount":15}}
              ],
              "edges": [
                {"source":"product","target":"batch"},
                {"source":"product","target":"video"},
                {"source":"batch","target":"export"},
                {"source":"video","target":"export"}
              ]
            }
            """;

        var result = service.validate(graphJson);

        assertTrue(result.isValid());
        assertEquals(4, result.getNodeCount());
        assertEquals(116, result.getEstimatedShotCount());
        assertEquals(15, result.getEstimatedVideoCount());
    }

    @Test
    void rejectsCircularWorkflow() {
        String graphJson = """
            {
              "nodes": [
                {"id":"a","data":{"kind":"prompt"}},
                {"id":"b","data":{"kind":"video"}}
              ],
              "edges": [
                {"source":"a","target":"b"},
                {"source":"b","target":"a"}
              ]
            }
            """;

        var result = service.validate(graphJson);

        assertFalse(result.isValid());
        assertTrue(result.getErrors().stream().anyMatch(error -> error.contains("环路")));
    }
}
