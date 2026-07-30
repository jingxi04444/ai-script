package com.aiscript.framework.storage;

import com.aiscript.common.exception.BusinessException;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class MinioStorageClient implements StorageClient {
    private final StorageProperties storageProperties;
    private final AliyunOssProperties aliyunOssProperties;
    private final HttpClient httpClient;

    public MinioStorageClient(StorageProperties storageProperties, AliyunOssProperties aliyunOssProperties) {
        this.storageProperties = storageProperties;
        this.aliyunOssProperties = aliyunOssProperties;
        this.httpClient = HttpClient.newHttpClient();
    }

    @Override
    public String putObject(String objectKey, InputStream inputStream, long size, String contentType) {
        if (useLocalStorage()) {
            return putLocalObject(objectKey, inputStream);
        }
        if (useAliyunOss()) {
            String effectiveObjectKey = effectiveObjectKey(objectKey);
            putAliyunOssObject(effectiveObjectKey, inputStream, size, contentType);
            return effectiveObjectKey;
        }
        try {
            MinioClient minioClient = MinioClient.builder()
                .endpoint(storageProperties.getEndpoint())
                .credentials(storageProperties.getAccessKey(), storageProperties.getSecretKey())
                .build();
            minioClient.putObject(PutObjectArgs.builder()
                .bucket(storageProperties.getBucket())
                .object(objectKey)
                .stream(inputStream, size, -1)
                .contentType(contentType)
                .build());
            return objectKey;
        } catch (Exception ex) {
            throw new BusinessException("文件上传失败：" + ex.getMessage());
        }
    }

    @Override
    public String presignedUrl(String objectKey) {
        if (useLocalStorage()) {
            String baseUrl = StringUtils.hasText(storageProperties.getPublicBaseUrl())
                ? trimEnd(storageProperties.getPublicBaseUrl(), "/")
                : "/uploads";
            return baseUrl + "/" + objectKey;
        }
        if (useAliyunOss()) {
            String baseUrl = StringUtils.hasText(effectivePublicBaseUrl())
                ? effectivePublicBaseUrl()
                : normalizeEndpoint(effectiveEndpoint());
            return aliyunOssObjectUrl(baseUrl, effectiveObjectKey(objectKey));
        }
        try {
            MinioClient minioClient = MinioClient.builder()
                .endpoint(storageProperties.getEndpoint())
                .credentials(storageProperties.getAccessKey(), storageProperties.getSecretKey())
                .build();
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(storageProperties.getBucket())
                .object(objectKey)
                .expiry(3600)
                .build());
        } catch (Exception ex) {
            return trimEnd(storageProperties.getEndpoint(), "/") + "/" + storageProperties.getBucket() + "/" + objectKey;
        }
    }

    private String putLocalObject(String objectKey, InputStream inputStream) {
        try {
            String normalizedObjectKey = normalizeObjectKey(objectKey);
            Path root = Path.of(storageProperties.getLocalPath()).toAbsolutePath().normalize();
            Path target = root.resolve(normalizedObjectKey).normalize();
            if (!target.startsWith(root)) {
                throw new BusinessException("文件路径非法");
            }
            Files.createDirectories(target.getParent());
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            return normalizedObjectKey;
        } catch (Exception ex) {
            if (ex instanceof BusinessException businessException) {
                throw businessException;
            }
            throw new BusinessException("本地文件上传失败：" + ex.getMessage());
        }
    }

    private String normalizeObjectKey(String objectKey) {
        if (!StringUtils.hasText(objectKey)) {
            throw new BusinessException("文件路径不能为空");
        }
        String normalized = objectKey.replace('\\', '/');
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        if (normalized.contains("../") || normalized.equals("..") || normalized.startsWith("..")) {
            throw new BusinessException("文件路径非法");
        }
        return normalized;
    }

    private void putAliyunOssObject(String objectKey, InputStream inputStream, long size, String contentType) {
        String endpoint = trimEnd(normalizeEndpoint(effectiveEndpoint()), "/");
        String resourcePath = "/" + effectiveBucket() + "/" + objectKey;
        String date = DateTimeFormatter.RFC_1123_DATE_TIME.format(ZonedDateTime.now(ZoneOffset.UTC));
        String effectiveContentType = StringUtils.hasText(contentType) ? contentType : "application/octet-stream";
        String authorization = aliyunOssAuthorization("PUT", resourcePath, date, effectiveContentType);
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(aliyunOssObjectUrl(endpoint, objectKey)))
            .timeout(Duration.ofSeconds(300))
            .header("Date", date)
            .header("Content-Type", effectiveContentType)
            .header("Authorization", authorization)
            .PUT(HttpRequest.BodyPublishers.ofInputStream(() -> inputStream))
            .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BusinessException("阿里云OSS上传失败：" + response.statusCode() + " " + response.body());
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("阿里云OSS上传被中断");
        } catch (Exception ex) {
            if (ex instanceof BusinessException businessException) {
                throw businessException;
            }
            throw new BusinessException("阿里云OSS上传失败：" + ex.getMessage());
        }
    }

    private String aliyunOssAuthorization(String method, String resourcePath, String date, String contentType) {
        String stringToSign = method + "\n\n" + contentType + "\n" + date + "\n" + resourcePath;
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(effectiveSecretKey().getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
            String signature = java.util.Base64.getEncoder().encodeToString(mac.doFinal(stringToSign.getBytes(StandardCharsets.UTF_8)));
            return "OSS " + effectiveAccessKey() + ":" + signature;
        } catch (Exception ex) {
            throw new BusinessException("阿里云OSS签名失败");
        }
    }

    private String trimEnd(String value, String suffix) {
        if (value == null) {
            return "";
        }
        while (value.endsWith(suffix)) {
            value = value.substring(0, value.length() - suffix.length());
        }
        return value;
    }

    private String normalizeEndpoint(String endpoint) {
        if (!StringUtils.hasText(endpoint)) {
            throw new BusinessException("OSS endpoint 未配置");
        }
        String normalized = endpoint.trim();
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "https://" + normalized;
        }
        return normalized;
    }

    private String aliyunOssObjectUrl(String endpointOrBaseUrl, String objectKey) {
        String baseUrl = trimEnd(normalizeEndpoint(endpointOrBaseUrl), "/");
        if (isBucketEndpoint(baseUrl)) {
            return baseUrl + "/" + objectKey;
        }
        return aliyunBucketEndpoint(baseUrl) + "/" + objectKey;
    }

    private boolean isBucketEndpoint(String endpoint) {
        if (!StringUtils.hasText(effectiveBucket())) {
            throw new BusinessException("OSS bucket 未配置");
        }
        try {
            String host = URI.create(endpoint).getHost();
            return host != null && (host.equals(effectiveBucket()) || host.startsWith(effectiveBucket() + "."));
        } catch (Exception ex) {
            return endpoint.contains(effectiveBucket() + ".");
        }
    }

    private String aliyunBucketEndpoint(String endpoint) {
        try {
            URI uri = URI.create(endpoint);
            String host = uri.getHost();
            if (!StringUtils.hasText(host)) {
                throw new BusinessException("OSS endpoint 格式错误");
            }
            int port = uri.getPort();
            String portPart = port > 0 ? ":" + port : "";
            return uri.getScheme() + "://" + effectiveBucket() + "." + host + portPart;
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException("OSS endpoint 格式错误：" + endpoint);
        }
    }

    private boolean useAliyunOss() {
        return "aliyun-oss".equalsIgnoreCase(storageProperties.getProvider()) || StringUtils.hasText(aliyunOssProperties.getBucketName());
    }

    private boolean useLocalStorage() {
        return "local".equalsIgnoreCase(storageProperties.getProvider());
    }

    private String effectiveEndpoint() {
        return StringUtils.hasText(aliyunOssProperties.getEndpoint()) ? aliyunOssProperties.getEndpoint() : storageProperties.getEndpoint();
    }

    private String effectiveBucket() {
        return StringUtils.hasText(aliyunOssProperties.getBucketName()) ? aliyunOssProperties.getBucketName() : storageProperties.getBucket();
    }

    private String effectiveAccessKey() {
        return StringUtils.hasText(aliyunOssProperties.getAccessKeyId()) ? aliyunOssProperties.getAccessKeyId() : storageProperties.getAccessKey();
    }

    private String effectiveSecretKey() {
        return StringUtils.hasText(aliyunOssProperties.getAccessKeySecret()) ? aliyunOssProperties.getAccessKeySecret() : storageProperties.getSecretKey();
    }

    private String effectivePublicBaseUrl() {
        return StringUtils.hasText(aliyunOssProperties.getCustomDomain()) ? aliyunOssProperties.getCustomDomain() : storageProperties.getPublicBaseUrl();
    }

    private String effectiveObjectKey(String objectKey) {
        String prefix = aliyunOssProperties.getDirPrefix();
        if (!StringUtils.hasText(prefix)) {
            return objectKey;
        }
        String normalizedPrefix = prefix.startsWith("/") ? prefix.substring(1) : prefix;
        if (!normalizedPrefix.endsWith("/")) {
            normalizedPrefix += "/";
        }
        return objectKey.startsWith(normalizedPrefix) ? objectKey : normalizedPrefix + objectKey;
    }
}
