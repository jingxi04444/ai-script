package com.aiscript.modules.script.service.impl;

import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.springframework.util.StringUtils;

/** Keeps the creative script title versioned together with the script body. */
public final class ScriptContentTitleNormalizer {
    private static final Pattern EXPLICIT_TITLE = Pattern.compile(
        "^(?:#{1,6}\\s*)?(?:\\*\\*|__)?\\s*(?:脚本)?标题\\s*[:：]\\s*(.*?)(?:\\*\\*|__)?\\s*$",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern HEADING_TITLE = Pattern.compile("^#{1,6}\\s+(.+?)\\s*$");
    private static final int MAX_TITLE_CODE_POINTS = 60;

    private ScriptContentTitleNormalizer() {
    }

    public static String ensureTitle(String content, String fallbackTitle) {
        String normalizedContent = stripOuterCodeFence(content);
        TitleLine titleLine = findTitleLine(normalizedContent);
        String title = titleLine == null ? "" : cleanTitle(titleLine.title());
        if (!StringUtils.hasText(title)) {
            title = cleanTitle(fallbackTitle);
        }
        return forceTitle(normalizedContent, title);
    }

    public static String forceTitle(String content, String title) {
        String normalizedContent = stripOuterCodeFence(content);
        String normalizedTitle = cleanTitle(title);
        if (!StringUtils.hasText(normalizedTitle)) {
            normalizedTitle = "短视频创意脚本";
        }

        String[] lines = normalizedContent.split("\\R", -1);
        TitleLine existingTitle = findTitleLine(lines);
        String body = IntStream.range(0, lines.length)
            .filter(index -> existingTitle == null || index != existingTitle.index())
            .mapToObj(index -> lines[index])
            .collect(Collectors.joining("\n"))
            .trim();
        return "标题：" + normalizedTitle + (StringUtils.hasText(body) ? "\n\n" + body : "");
    }

    public static String extractTitle(String content) {
        TitleLine titleLine = findTitleLine(stripOuterCodeFence(content));
        return titleLine == null ? "" : cleanTitle(titleLine.title());
    }

    private static TitleLine findTitleLine(String content) {
        return findTitleLine(content.split("\\R", -1));
    }

    private static TitleLine findTitleLine(String[] lines) {
        int firstTableLine = -1;
        for (int index = 0; index < lines.length; index++) {
            if (lines[index].trim().startsWith("|")) {
                firstTableLine = index;
                break;
            }
        }
        int searchLimit = firstTableLine >= 0 ? firstTableLine : Math.min(lines.length, 6);
        for (int index = 0; index < searchLimit; index++) {
            String line = lines[index].trim();
            if (!StringUtils.hasText(line) || line.startsWith("```")) {
                continue;
            }
            Matcher explicitMatcher = EXPLICIT_TITLE.matcher(line);
            if (explicitMatcher.matches()) {
                return new TitleLine(index, explicitMatcher.group(1));
            }
            Matcher headingMatcher = HEADING_TITLE.matcher(line);
            if (headingMatcher.matches()) {
                return new TitleLine(index, headingMatcher.group(1));
            }
        }
        return null;
    }

    private static String stripOuterCodeFence(String content) {
        String normalized = content == null ? "" : content.trim();
        String[] lines = normalized.split("\\R", -1);
        if (lines.length >= 2 && lines[0].trim().startsWith("```") && "```".equals(lines[lines.length - 1].trim())) {
            return String.join("\n", Arrays.copyOfRange(lines, 1, lines.length - 1)).trim();
        }
        return normalized;
    }

    private static String cleanTitle(String title) {
        if (!StringUtils.hasText(title)) {
            return "";
        }
        String normalized = title.trim()
            .replaceFirst("^(?:\\*\\*|__)", "")
            .replaceFirst("(?:\\*\\*|__)$", "")
            .replaceAll("^[《“\\\"']+|[》”\\\"']+$", "")
            .replace('|', ' ')
            .replaceAll("\\s+", " ")
            .trim();
        if (normalized.matches("(?i)^[<＜\\[【]?(?:(?:10\\s*[-—至]\\s*30)\\s*字)?(?:的)?(?:实际|创意)?标题(?:内容)?[>＞\\]】]?$|^x{2,}$|^待(?:填写|生成|定)$")) {
            return "";
        }
        int codePointCount = normalized.codePointCount(0, normalized.length());
        if (codePointCount <= MAX_TITLE_CODE_POINTS) {
            return normalized;
        }
        int endIndex = normalized.offsetByCodePoints(0, MAX_TITLE_CODE_POINTS - 1);
        return normalized.substring(0, endIndex).trim() + "…";
    }

    private record TitleLine(int index, String title) {
    }
}
