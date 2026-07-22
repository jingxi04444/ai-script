package com.aiscript.common.util;

public final class MaskUtils {
    private MaskUtils() {
    }

    public static String maskSecret(String value) {
        if (value == null || value.length() <= 8) {
            return "******";
        }
        return value.substring(0, 4) + "******" + value.substring(value.length() - 4);
    }
}
