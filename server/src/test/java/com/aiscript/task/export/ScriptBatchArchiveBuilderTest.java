package com.aiscript.task.export;

import static org.assertj.core.api.Assertions.assertThat;

import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.Test;

class ScriptBatchArchiveBuilderTest {
    private final ScriptBatchArchiveBuilder builder = new ScriptBatchArchiveBuilder();

    @Test
    void buildsReadableZipAndMakesDuplicateNamesUnique() throws Exception {
        AiStoryboardScript first = script(11, "夏日/饮品", "第一条脚本内容");
        AiStoryboardScript second = script(12, "夏日/饮品", "第二条脚本内容");

        byte[] archive = builder.build(List.of(first, second));
        Map<String, String> entries = unzip(archive);

        assertThat(entries).containsOnlyKeys("夏日-饮品.txt", "夏日-饮品-2.txt");
        assertThat(entries.get("夏日-饮品.txt")).contains("脚本标题：夏日/饮品", "第一条脚本内容");
        assertThat(entries.get("夏日-饮品-2.txt")).contains("脚本ID：12", "第二条脚本内容");
    }

    private AiStoryboardScript script(int id, String name, String content) {
        AiStoryboardScript script = new AiStoryboardScript();
        script.setId(id);
        script.setScriptName(name);
        script.setScriptType("original");
        script.setContentText(content);
        return script;
    }

    private Map<String, String> unzip(byte[] archive) throws Exception {
        Map<String, String> result = new LinkedHashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(archive), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                result.put(entry.getName(), new String(zip.readAllBytes(), StandardCharsets.UTF_8));
            }
        }
        return result;
    }
}
