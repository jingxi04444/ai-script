package com.aiscript.common.util;

import java.util.concurrent.ThreadLocalRandom;

public final class IdUtils {
    private IdUtils() {
    }

    public static String nextId() {
        int suffix = ThreadLocalRandom.current().nextInt(1000, 10000);
        return System.currentTimeMillis() + String.valueOf(suffix);
    }
}
