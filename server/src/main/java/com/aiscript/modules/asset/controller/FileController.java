package com.aiscript.modules.asset.controller;

import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.context.AnalysisContext;
import com.alibaba.excel.event.AnalysisEventListener;
import com.aiscript.common.api.R;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.modules.asset.vo.FileUploadVO;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
public class FileController {
    private final StorageClient storageClient;

    public FileController(StorageClient storageClient) {
        this.storageClient = storageClient;
    }

    @PostMapping("/upload")
    public R<FileUploadVO> upload(@RequestParam("file") MultipartFile file, @RequestParam(required = false, defaultValue = "common") String folder) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String extractedText = isTableFile(originalFilename) ? extractTableText(file) : null;
        String suffix = "";
        if (StringUtils.hasText(originalFilename) && originalFilename.contains(".")) {
            suffix = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String objectKey = folder + "/" + LocalDate.now() + "/" + UUID.randomUUID().toString().replace("-", "") + suffix;
        objectKey = storageClient.putObject(objectKey, file.getInputStream(), file.getSize(), file.getContentType());
        FileUploadVO vo = new FileUploadVO();
        vo.setObjectKey(objectKey);
        vo.setUrl(storageClient.presignedUrl(objectKey));
        vo.setFileName(originalFilename);
        vo.setContentType(file.getContentType());
        vo.setSize(file.getSize());
        vo.setExtractedText(extractedText);
        return R.ok(vo);
    }

    private boolean isTableFile(String filename) {
        if (!StringUtils.hasText(filename)) {
            return false;
        }
        String lowerName = filename.toLowerCase();
        return lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx") || lowerName.endsWith(".csv");
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
                if (rowCount >= 100 || content.length() >= 30000) {
                    return;
                }
                int columnCount = Math.max(headers.size(), row.keySet().stream().mapToInt(Integer::intValue).max().orElse(-1) + 1);
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
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (!StringUtils.hasText(headerLine)) {
                return "";
            }
            String[] headers = splitCsvLine(headerLine.replace("\uFEFF", ""));
            appendMarkdownRow(content, cleanCsvCells(headers));
            appendSeparator(content, headers.length);
            String line;
            int rowCount = 0;
            while ((line = reader.readLine()) != null && rowCount < 100 && content.length() < 30000) {
                if (StringUtils.hasText(line)) {
                    appendMarkdownRow(content, cleanCsvCells(splitCsvLine(line)));
                    rowCount++;
                }
            }
        }
        return trimExtractedText(content);
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
        content.append("| ");
        content.append(String.join(" | ", cells));
        content.append(" |\n");
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
        if (value == null) {
            return "";
        }
        return value.trim().replace("|", "／").replace("\r", " ").replace("\n", " ");
    }

    private String trimExtractedText(StringBuilder content) {
        if (content.length() > 30000) {
            return content.substring(0, 30000);
        }
        return content.toString().trim();
    }
}
