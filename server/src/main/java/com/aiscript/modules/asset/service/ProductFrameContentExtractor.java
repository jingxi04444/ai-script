package com.aiscript.modules.asset.service;

import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.context.AnalysisContext;
import com.alibaba.excel.event.AnalysisEventListener;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.integration.ocr.OcrClient;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Component
public class ProductFrameContentExtractor {
    private static final int MAX_ROWS = 100;
    private static final int MAX_TEXT_LENGTH = 30000;
    private final OcrClient ocrClient;

    public ProductFrameContentExtractor(OcrClient ocrClient) {
        this.ocrClient = ocrClient;
    }

    public String extract(MultipartFile file) {
        String filename = file == null || file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        if (isTableFile(filename)) {
            return extractTableText(file);
        }
        if (isImageFile(file, filename)) {
            return ocrClient.recognize(file);
        }
        throw new BusinessException("产品画面仅支持 JPG、PNG、WEBP、BMP、TIF、XLS、XLSX 或 CSV 文件");
    }

    public boolean isTableFile(String filename) {
        if (!StringUtils.hasText(filename)) {
            return false;
        }
        String lowerName = filename.toLowerCase();
        return lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx") || lowerName.endsWith(".csv");
    }

    public boolean isImageFile(MultipartFile file, String filename) {
        if (file != null && StringUtils.hasText(file.getContentType())
            && file.getContentType().toLowerCase().startsWith("image/")) {
            return true;
        }
        if (!StringUtils.hasText(filename)) {
            return false;
        }
        String lowerName = filename.toLowerCase();
        return lowerName.endsWith(".jpg")
            || lowerName.endsWith(".jpeg")
            || lowerName.endsWith(".png")
            || lowerName.endsWith(".webp")
            || lowerName.endsWith(".bmp")
            || lowerName.endsWith(".tif")
            || lowerName.endsWith(".tiff");
    }

    private String extractTableText(MultipartFile file) {
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        try {
            String text = filename.endsWith(".csv") ? extractCsv(file) : extractExcel(file);
            if (!StringUtils.hasText(text)) {
                throw new BusinessException("上传的表格没有可读取内容");
            }
            return text;
        } catch (IOException ex) {
            throw new BusinessException("画面表格读取失败：" + ex.getMessage());
        } catch (RuntimeException ex) {
            if (ex instanceof BusinessException businessException) {
                throw businessException;
            }
            throw new BusinessException("画面表格解析失败，请确认文件格式正确");
        }
    }

    private String extractExcel(MultipartFile file) throws IOException {
        StringBuilder content = new StringBuilder();
        EasyExcel.read(file.getInputStream(), new AnalysisEventListener<Map<Integer, String>>() {
            private final List<String> headers = new ArrayList<>();
            private int rowCount;

            @Override
            public void invokeHeadMap(Map<Integer, String> headMap, AnalysisContext context) {
                headers.clear();
                new TreeMap<>(headMap).forEach((index, value) -> headers.add(cleanCell(value)));
                appendMarkdownRow(content, headers);
                appendSeparator(content, headers.size());
            }

            @Override
            public void invoke(Map<Integer, String> row, AnalysisContext context) {
                if (rowCount >= MAX_ROWS || content.length() >= MAX_TEXT_LENGTH) {
                    return;
                }
                int columnCount = Math.max(
                    headers.size(),
                    row.keySet().stream().mapToInt(Integer::intValue).max().orElse(-1) + 1
                );
                List<String> cells = new ArrayList<>(columnCount);
                for (int index = 0; index < columnCount; index++) {
                    cells.add(cleanCell(row.get(index)));
                }
                appendMarkdownRow(content, cells);
                rowCount++;
            }

            @Override
            public void doAfterAllAnalysed(AnalysisContext context) {
            }
        }).sheet().doRead();
        return trimExtractedText(content);
    }

    private String extractCsv(MultipartFile file) throws IOException {
        StringBuilder content = new StringBuilder();
        String csvText = decodeCsv(file.getBytes());
        try (BufferedReader reader = new BufferedReader(new StringReader(csvText))) {
            String headerLine = reader.readLine();
            if (!StringUtils.hasText(headerLine)) {
                return "";
            }
            String[] headers = splitCsvLine(headerLine.replace("\uFEFF", ""));
            appendMarkdownRow(content, cleanCsvCells(headers));
            appendSeparator(content, headers.length);
            String line;
            int rowCount = 0;
            while ((line = reader.readLine()) != null && rowCount < MAX_ROWS && content.length() < MAX_TEXT_LENGTH) {
                if (StringUtils.hasText(line)) {
                    appendMarkdownRow(content, cleanCsvCells(splitCsvLine(line)));
                    rowCount++;
                }
            }
        }
        return trimExtractedText(content);
    }

    private String decodeCsv(byte[] bytes) {
        try {
            return StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(bytes))
                .toString();
        } catch (CharacterCodingException ignored) {
            return new String(bytes, java.nio.charset.Charset.forName("GB18030"));
        }
    }

    private String[] splitCsvLine(String line) {
        return line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
    }

    private List<String> cleanCsvCells(String[] cells) {
        List<String> result = new ArrayList<>(cells.length);
        for (String cell : cells) {
            String value = cell == null ? "" : cell.trim();
            if (value.length() >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
                value = value.substring(1, value.length() - 1).replace("\"\"", "\"");
            }
            result.add(cleanCell(value));
        }
        return result;
    }

    private void appendMarkdownRow(StringBuilder content, List<String> cells) {
        content.append("| ").append(String.join(" | ", cells)).append(" |\n");
    }

    private void appendSeparator(StringBuilder content, int columnCount) {
        content.append("| ");
        for (int index = 0; index < columnCount; index++) {
            if (index > 0) {
                content.append(" | ");
            }
            content.append("---");
        }
        content.append(" |\n");
    }

    private String cleanCell(String value) {
        return value == null ? "" : value.trim().replace("|", "／").replace("\r", " ").replace("\n", " ");
    }

    private String trimExtractedText(StringBuilder content) {
        if (content.length() > MAX_TEXT_LENGTH) {
            return content.substring(0, MAX_TEXT_LENGTH);
        }
        return content.toString().trim();
    }
}
