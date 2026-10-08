package com.aiscript.modules.script.convert;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ScriptPromptColumnNormalizerTest {
    @Test
    void addsExecutablePromptWithoutChangingOtherColumns() {
        String source = "标题：新品\n\n| 镜头 | 画面内容 | 运镜 | 时长 |\n| --- | --- | --- | --- |\n| 1 | 产品放在台面 | 缓慢推近 | 3s |";
        String result = ScriptPromptColumnNormalizer.ensurePromptColumn(source, "A 型号");
        assertTrue(result.contains("| 镜头 | 画面内容 | 提示词 | 运镜 | 时长 |"));
        assertTrue(result.contains("主体锁定：A 型号"));
        assertTrue(result.contains("运镜：缓慢推近"));
        assertTrue(result.contains("| 缓慢推近 | 3s |"));
        assertEquals(result, ScriptPromptColumnNormalizer.ensurePromptColumn(result, "A 型号"));
    }

    @Test
    void ignoresProseAndExistingPromptColumn() {
        assertEquals("这是一篇口播稿", ScriptPromptColumnNormalizer.ensurePromptColumn("这是一篇口播稿", "产品"));
        String source = "| 画面 | 提示词 |\n| --- | --- |\n| 产品 | 已有指令 |";
        assertEquals(source, ScriptPromptColumnNormalizer.ensurePromptColumn(source, "产品"));
    }
}
