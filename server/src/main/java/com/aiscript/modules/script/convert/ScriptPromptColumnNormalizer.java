package com.aiscript.modules.script.convert;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.util.StringUtils;

/** Adds an executable prompt to storyboard tables returned by older templates and scripts. */
public final class ScriptPromptColumnNormalizer {
    private ScriptPromptColumnNormalizer() {
    }

    public static String ensurePromptColumn(String content, String productName) {
        if (!StringUtils.hasText(content)) return content;
        String[] lines = content.split("\\R", -1);
        for (int index = 0; index + 2 < lines.length; index++) {
            List<String> headers = cells(lines[index]);
            if (headers.isEmpty() || !isSeparator(cells(lines[index + 1]), headers.size())) continue;
            int visualIndex = findHeader(headers, "画面", "场景描述", "画面内容");
            if (visualIndex < 0 || findHeader(headers, "提示词", "AI提示词") >= 0) continue;
            int cameraIndex = findHeader(headers, "运镜", "镜头运动", "镜头调度");
            int sceneIndex = findHeader(headers, "场景", "地点");
            lines[index] = insert(lines[index], visualIndex + 1, "提示词");
            lines[index + 1] = insert(lines[index + 1], visualIndex + 1, "---");
            for (int row = index + 2; row < lines.length; row++) {
                List<String> values = cells(lines[row]);
                if (values.isEmpty()) break;
                if (values.size() != headers.size()) continue;
                String visual = values.get(visualIndex).trim();
                String prompt = visual.matches(".*(?:总计|总时长|总时间).*") || !StringUtils.hasText(visual)
                    ? "-" : executablePrompt(visual, value(values, cameraIndex), value(values, sceneIndex), productName);
                lines[row] = insert(lines[row], visualIndex + 1, prompt);
            }
            index++;
        }
        return String.join("\n", lines);
    }

    private static String executablePrompt(String visual, String camera, String scene, String productName) {
        String subject = StringUtils.hasText(productName) ? productName.trim() : "产品主体";
        String location = StringUtils.hasText(scene) ? "场景：" + scene.trim() + "；" : "";
        String movement = StringUtils.hasText(camera) && !"-".equals(camera.trim()) ? camera.trim() : "固定机位，平稳拍摄";
        return ("主体锁定：" + subject + "的外观、颜色、结构、包装文字及 Logo 与参考素材一致；"
            + "人物锁定：若出现人物，保持身份、服饰与前后镜头一致；"
            + location + "画面动作：" + visual.trim() + "；"
            + "运镜：" + movement + "；"
            + "约束：不改变产品型号，不生成多余文字、水印或变形。")
            .replace("|", "\\|").replaceAll("\\s+", " ");
    }

    private static String value(List<String> cells, int index) {
        return index < 0 || index >= cells.size() ? "" : cells.get(index);
    }

    private static int findHeader(List<String> headers, String... names) {
        for (int index = 0; index < headers.size(); index++) {
            String header = headers.get(index).replaceAll("[\\s*]", "");
            for (String name : names) if (header.contains(name)) return index;
        }
        return -1;
    }

    private static List<String> cells(String line) {
        String trimmed = line.trim();
        if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return List.of();
        return Arrays.stream(trimmed.substring(1, trimmed.length() - 1).split("(?<!\\\\)\\|", -1))
            .map(String::trim).toList();
    }

    private static boolean isSeparator(List<String> cells, int width) {
        return cells.size() == width && cells.stream().allMatch(cell -> cell.matches(":?-{3,}:?"));
    }

    private static String insert(String line, int position, String value) {
        List<String> values = new ArrayList<>(cells(line));
        values.add(Math.min(position, values.size()), value);
        return "| " + String.join(" | ", values) + " |";
    }
}
