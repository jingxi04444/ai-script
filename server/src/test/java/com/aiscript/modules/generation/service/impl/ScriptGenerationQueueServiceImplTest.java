package com.aiscript.modules.generation.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class ScriptGenerationQueueServiceImplTest {

    private static final LocalDateTime TASK_TIME = LocalDateTime.of(2026, 8, 28, 0, 15, 32);

    @Test
    void appendsTimestampToTaskName() {
        assertEquals(
            "纠正型带货2 · 九号半盔-四季通用 · 20260828001532",
            ScriptGenerationQueueServiceImpl.ensureTaskTimestamp(
                "纠正型带货2 · 九号半盔-四季通用",
                TASK_TIME
            )
        );
    }

    @Test
    void preservesExistingTimestamp() {
        String name = "模板脚本 · 20260828001532";
        assertEquals(name, ScriptGenerationQueueServiceImpl.ensureTaskTimestamp(name, TASK_TIME.plusMinutes(1)));
    }

    @Test
    void keepsTimestampWhenLongTaskNameIsTruncated() {
        String result = ScriptGenerationQueueServiceImpl.ensureTaskTimestamp("超长任务名称".repeat(30), TASK_TIME);
        assertTrue(result.length() <= 120);
        assertTrue(result.endsWith(" · 20260828001532"));
    }
}
