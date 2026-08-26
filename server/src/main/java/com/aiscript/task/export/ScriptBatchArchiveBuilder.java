package com.aiscript.task.export;

import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class ScriptBatchArchiveBuilder {
    public byte[] build(List<AiStoryboardScript> scripts) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(output, StandardCharsets.UTF_8)) {
                Map<String, Integer> duplicateNames = new HashMap<>();
                for (AiStoryboardScript script : scripts) {
                    String baseName = safeName(script.getScriptName(), "脚本-" + script.getId());
                    int duplicateIndex = duplicateNames.merge(baseName, 1, Integer::sum);
                    String entryName = duplicateIndex == 1
                        ? baseName + ".txt"
                        : baseName + "-" + duplicateIndex + ".txt";
                    zip.putNextEntry(new ZipEntry(entryName));
                    zip.write(scriptText(script).getBytes(StandardCharsets.UTF_8));
                    zip.closeEntry();
                }
            }
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("脚本压缩包生成失败", exception);
        }
    }

    private String scriptText(AiStoryboardScript script) {
        StringBuilder text = new StringBuilder();
        text.append("脚本标题：").append(safeText(script.getScriptName(), "未命名脚本")).append('\n');
        text.append("脚本类型：").append(safeText(script.getScriptType(), "未分类")).append('\n');
        text.append("脚本ID：").append(script.getId()).append("\n\n");
        text.append(safeText(script.getContentText(), "暂无脚本内容"));
        text.append('\n');
        return text.toString();
    }

    private String safeName(String value, String fallback) {
        String normalized = safeText(value, fallback)
            .replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-")
            .replaceAll("\\s+", " ")
            .trim();
        if (normalized.length() > 80) normalized = normalized.substring(0, 80).trim();
        return StringUtils.hasText(normalized) ? normalized : fallback;
    }

    private String safeText(String value, String fallback) {
        return StringUtils.hasText(value) ? value.trim() : fallback;
    }
}
