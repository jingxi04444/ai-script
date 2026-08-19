package com.aiscript.modules.generation.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PaidOperationFingerprintTest {
    private final PaidOperationFingerprint fingerprint = new PaidOperationFingerprint(
        new ObjectMapper()
    );

    @Test
    void objectFingerprintShouldIgnoreMapInsertionOrder() {
        Map<String, Object> first = new LinkedHashMap<>();
        first.put("projectId", 7);
        first.put("prompt", "生成脚本");
        Map<String, Object> second = new LinkedHashMap<>();
        second.put("prompt", "生成脚本");
        second.put("projectId", 7);

        assertThat(fingerprint.sha256(first)).isEqualTo(fingerprint.sha256(second));
    }

    @Test
    void stringFingerprintShouldUseStandardSha256Hex() {
        assertThat(fingerprint.sha256("abc"))
            .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
