package com.aiscript.common.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

public final class UrlUtils {
    private static final Pattern HTTP_URL_PATTERN = Pattern.compile("https?://[^\\s，,。；;]+", Pattern.CASE_INSENSITIVE);

    private UrlUtils() {
    }

    public static String extractFirstUrl(String text) {
        if (!StringUtils.hasText(text)) {
            return "";
        }
        Matcher matcher = HTTP_URL_PATTERN.matcher(text);
        if (!matcher.find()) {
            return text.trim();
        }
        return trimTrailingPunctuation(matcher.group());
    }

    public static String extractFirstHttpUrl(String text) {
        if (!StringUtils.hasText(text)) {
            return "";
        }
        Matcher matcher = HTTP_URL_PATTERN.matcher(text);
        if (!matcher.find()) {
            return "";
        }
        return trimTrailingPunctuation(matcher.group());
    }

    private static String trimTrailingPunctuation(String value) {
        String result = value == null ? "" : value;
        while (result.endsWith(".") || result.endsWith(")") || result.endsWith("）")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }
}
