package com.aiscript.framework.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class MinioStorageClientTest {
    @Test
    void ossDateUsesStrictTwoDigitRfc1123Day() {
        assertEquals(
            "Mon, 03 Aug 2026 04:53:41 GMT",
            MinioStorageClient.formatOssHttpDate(Instant.parse("2026-08-03T04:53:41Z"))
        );
    }
}
