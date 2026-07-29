package com.aiscript.integration.ocr;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Component
public class TesseractOcrClient implements OcrClient {
    private static final String SAFE_LANGUAGE_PATTERN = "[A-Za-z0-9_+.-]+";

    private final OcrProperties properties;

    public TesseractOcrClient(OcrProperties properties) {
        this.properties = properties;
    }

    @Override
    public String recognize(MultipartFile file) {
        if (!properties.isEnabled() || file == null || file.isEmpty()) {
            return null;
        }
        if (!StringUtils.hasText(properties.getCommand())) {
            log.warn("OCR 已开启，但未配置 Tesseract 命令");
            return null;
        }
        String language = StringUtils.hasText(properties.getLanguage())
            ? properties.getLanguage().trim()
            : "chi_sim+eng";
        if (!language.matches(SAFE_LANGUAGE_PATTERN)) {
            log.warn("OCR 语言配置不合法：{}", language);
            return null;
        }

        Path workDirectory = null;
        Process process = null;
        try {
            workDirectory = Files.createTempDirectory("ai-script-ocr-");
            Path inputPath = workDirectory.resolve("input" + resolveSuffix(file.getOriginalFilename()));
            Path outputBase = workDirectory.resolve("result");
            Path errorPath = workDirectory.resolve("tesseract-error.log");
            file.transferTo(inputPath);

            ProcessBuilder processBuilder = new ProcessBuilder(
                properties.getCommand(),
                inputPath.toString(),
                outputBase.toString(),
                "-l",
                language,
                "--psm",
                String.valueOf(Math.max(0, properties.getPageSegmentationMode()))
            );
            processBuilder.redirectError(errorPath.toFile());
            process = processBuilder.start();

            long timeoutSeconds = Math.max(1, properties.getTimeoutSeconds());
            if (!process.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                log.warn("Tesseract OCR 超时，文件：{}", file.getOriginalFilename());
                return null;
            }
            if (process.exitValue() != 0) {
                log.warn(
                    "Tesseract OCR 执行失败，exitCode={}，文件={}，错误={}",
                    process.exitValue(),
                    file.getOriginalFilename(),
                    readTextIfExists(errorPath, 2000)
                );
                return null;
            }

            String text = readTextIfExists(Path.of(outputBase + ".txt"), properties.getMaxTextLength());
            return StringUtils.hasText(text) ? text.trim() : null;
        } catch (IOException ex) {
            log.warn("Tesseract OCR 不可用或读取失败，文件={}，原因={}", file.getOriginalFilename(), ex.getMessage());
            return null;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("Tesseract OCR 被中断，文件={}", file.getOriginalFilename());
            return null;
        } finally {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
            deleteWorkDirectory(workDirectory);
        }
    }

    private String resolveSuffix(String filename) {
        if (!StringUtils.hasText(filename) || !filename.contains(".")) {
            return ".img";
        }
        String suffix = filename.substring(filename.lastIndexOf(".")).toLowerCase();
        return suffix.length() <= 10 && suffix.matches("\\.[a-z0-9]+") ? suffix : ".img";
    }

    private String readTextIfExists(Path path, int maxLength) throws IOException {
        if (!Files.exists(path)) {
            return "";
        }
        String content = Files.readString(path, StandardCharsets.UTF_8);
        int safeMaxLength = Math.max(1, maxLength);
        return content.length() > safeMaxLength ? content.substring(0, safeMaxLength) : content;
    }

    private void deleteWorkDirectory(Path workDirectory) {
        if (workDirectory == null || !Files.exists(workDirectory)) {
            return;
        }
        try (var paths = Files.walk(workDirectory)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ex) {
                    log.debug("OCR 临时文件清理失败：{}", path, ex);
                }
            });
        } catch (IOException ex) {
            log.debug("OCR 临时目录清理失败：{}", workDirectory, ex);
        }
    }
}
