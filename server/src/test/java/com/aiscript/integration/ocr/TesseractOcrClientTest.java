package com.aiscript.integration.ocr;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledOnOs;
import org.junit.jupiter.api.condition.OS;
import org.springframework.mock.web.MockMultipartFile;

class TesseractOcrClientTest {
    @Test
    void disabledOcrDoesNotInvokeExternalCommand() {
        OcrProperties properties = new OcrProperties();
        properties.setEnabled(false);
        properties.setCommand("/command/that/does/not/exist");
        TesseractOcrClient client = new TesseractOcrClient(properties);

        String text = client.recognize(new MockMultipartFile(
            "file",
            "product.png",
            "image/png",
            new byte[] {1, 2, 3}
        ));

        assertThat(text).isNull();
    }

    @Test
    @DisabledOnOs(OS.WINDOWS)
    void returnsTextProducedByConfiguredOcrCommand() throws Exception {
        Path fakeTesseract = Files.createTempFile("fake-tesseract-", ".sh");
        Files.writeString(
            fakeTesseract,
            "#!/bin/sh\nprintf '识别出的产品文字\\n' > \"$2.txt\"\n",
            StandardCharsets.UTF_8
        );
        Files.setPosixFilePermissions(fakeTesseract, Set.of(
            PosixFilePermission.OWNER_READ,
            PosixFilePermission.OWNER_WRITE,
            PosixFilePermission.OWNER_EXECUTE
        ));

        try {
            OcrProperties properties = new OcrProperties();
            properties.setCommand(fakeTesseract.toString());
            properties.setLanguage("chi_sim+eng");
            TesseractOcrClient client = new TesseractOcrClient(properties);

            String text = client.recognize(new MockMultipartFile(
                "file",
                "product.png",
                "image/png",
                new byte[] {1, 2, 3}
            ));

            assertThat(text).isEqualTo("识别出的产品文字");
        } finally {
            Files.deleteIfExists(fakeTesseract);
        }
    }
}
