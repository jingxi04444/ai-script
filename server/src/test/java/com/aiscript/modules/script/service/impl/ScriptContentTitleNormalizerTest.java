package com.aiscript.modules.script.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ScriptContentTitleNormalizerTest {
    private static final String TABLE = "| 台词 | 画面 | 时长 |\n| --- | --- | --- |\n| 开场 | 门锁亮起 | 1.7 |";

    @Test
    void canonicalizesExplicitMarkdownTitleAndKeepsTable() {
        String result = ScriptContentTitleNormalizer.ensureTitle(
            "```markdown\n**标题：懒人狂喜！鹿客AI智能锁来啦**\n\n" + TABLE + "\n```",
            "兜底标题"
        );

        assertTrue(result.startsWith("标题：懒人狂喜！鹿客AI智能锁来啦\n\n"));
        assertTrue(result.endsWith(TABLE));
    }

    @Test
    void addsSafeFallbackWhenModelOmitsTitle() {
        assertEquals("标题：鹿客智能锁短视频创意\n\n" + TABLE,
            ScriptContentTitleNormalizer.ensureTitle(TABLE, "鹿客智能锁短视频创意"));
    }

    @Test
    void replacesPromptPlaceholderInsteadOfDisplayingIt() {
        assertEquals("标题：鹿客智能锁短视频创意\n\n" + TABLE,
            ScriptContentTitleNormalizer.ensureTitle(
                "标题：<10-30字创意标题>\n\n" + TABLE,
                "鹿客智能锁短视频创意"
            ));
    }

    @Test
    void forceTitleKeepsSourceTitleDuringOrdinaryPolish() {
        String candidate = "标题：模型擅自改题\n\n" + TABLE;

        assertEquals("标题：原稿标题\n\n" + TABLE,
            ScriptContentTitleNormalizer.forceTitle(candidate, "原稿标题"));
    }

    @Test
    void acceptsMarkdownHeadingAsGeneratedTitle() {
        assertEquals("懒人开门不用找钥匙", ScriptContentTitleNormalizer.extractTitle("# 懒人开门不用找钥匙\n\n" + TABLE));
    }
}
