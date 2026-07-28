package com.aiscript.framework.secret;

import com.aiscript.common.exception.BusinessException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
@Slf4j
@Service
public class SecretCipherService {
    private static final String PREFIX = "ENC(";
    private static final String SUFFIX = ")";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;
    private final SecretProperties secretProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public SecretCipherService(SecretProperties secretProperties) {
        this.secretProperties = secretProperties;
    }

    public String encrypt(String plaintext) {
        if (!StringUtils.hasText(plaintext)) {
            return plaintext;
        }
        if (plaintext.startsWith(PREFIX) && plaintext.endsWith(SUFFIX)) {
            return plaintext;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec(), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + encrypted.length);
            buffer.put(iv);
            buffer.put(encrypted);
            return PREFIX + Base64.getEncoder().encodeToString(buffer.array()) + SUFFIX;
        } catch (Exception ex) {
            throw new BusinessException("密钥加密失败");
        }
    }

    public String decrypt(String ciphertext) {
        if (!StringUtils.hasText(ciphertext)) {
            return ciphertext;
        }
        if (!ciphertext.startsWith(PREFIX) || !ciphertext.endsWith(SUFFIX)) {
            return ciphertext;
        }
        try {
            String payload = ciphertext.substring(PREFIX.length(), ciphertext.length() - SUFFIX.length());
            byte[] allBytes = Base64.getDecoder().decode(payload);
            ByteBuffer buffer = ByteBuffer.wrap(allBytes);
            byte[] iv = new byte[IV_LENGTH];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec(), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            log.info("密钥解密失败");
            throw new BusinessException("密钥解密失败");
        }
    }

    private SecretKeySpec keySpec() throws Exception {
        String key = secretProperties.getCipherKey();
        if (!StringUtils.hasText(key)) {
            throw new BusinessException("未配置 app.secret.cipher-key");
        }
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(digest, "AES");
    }
}
