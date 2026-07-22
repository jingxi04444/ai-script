package com.aiscript.common.util;

import java.time.LocalDateTime;

public final class DateTimeUtils {
    private DateTimeUtils() {
    }

    public static LocalDateTime now() {
        return LocalDateTime.now();
    }
}
