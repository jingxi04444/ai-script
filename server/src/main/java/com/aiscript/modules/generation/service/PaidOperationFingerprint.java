package com.aiscript.modules.generation.service;

import com.aiscript.common.exception.BusinessException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.stereotype.Component;

/**
 * Produces stable SHA-256 request fingerprints. Object properties and map keys
 * are sorted before hashing, so logically identical DTOs do not depend on
 * reflection or map iteration order.
 */
@Component
public final class PaidOperationFingerprint {
    private final ObjectMapper canonicalMapper;

    public PaidOperationFingerprint(ObjectMapper objectMapper) {
        this.canonicalMapper = objectMapper.copy()
            .configure(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY, true)
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    public String sha256(Object value) {
        if (value == null) {
            throw new BusinessException("付费操作摘要参数不能为空");
        }
        try {
            return digest(canonicalMapper.writeValueAsBytes(value));
        } catch (JsonProcessingException exception) {
            throw new BusinessException("付费操作摘要参数序列化失败");
        }
    }

    /** Hashes the exact UTF-8 text. Use {@link #sha256(Object)} for DTOs. */
    public String sha256(String value) {
        if (value == null) {
            throw new BusinessException("付费操作摘要参数不能为空");
        }
        return digest(value.getBytes(StandardCharsets.UTF_8));
    }

    private String digest(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is not available", impossible);
        }
    }
}
