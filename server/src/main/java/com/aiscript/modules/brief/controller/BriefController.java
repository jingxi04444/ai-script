package com.aiscript.modules.brief.controller;

import com.aiscript.common.api.R;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.modules.brief.dto.BriefEditRequestDTO;
import com.aiscript.modules.brief.dto.BriefSaveDTO;
import com.aiscript.modules.brief.service.BriefService;
import com.aiscript.modules.brief.vo.BriefEditRequestVO;
import com.aiscript.modules.brief.vo.BriefShareVO;
import com.aiscript.modules.brief.vo.BriefVO;
import com.aiscript.modules.system.entity.SysImportTemplateConfig;
import com.aiscript.modules.system.mapper.SysImportTemplateConfigMapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/briefs")
public class BriefController {
    private final BriefService briefService;
    private final SysImportTemplateConfigMapper importTemplateMapper;
    private final StorageClient storageClient;
    private final HttpClient httpClient;

    public BriefController(BriefService briefService, SysImportTemplateConfigMapper importTemplateMapper, StorageClient storageClient) {
        this.briefService = briefService;
        this.importTemplateMapper = importTemplateMapper;
        this.storageClient = storageClient;
        this.httpClient = HttpClient.newHttpClient();
    }

    @GetMapping
    public R<List<BriefVO>> list(@RequestParam Integer projectId) {
        return R.ok(briefService.list(projectId));
    }

    @GetMapping("/shared")
    public R<List<BriefVO>> sharedList(@RequestParam(required = false) String keyword) {
        return R.ok(briefService.sharedList(keyword));
    }

    @GetMapping("/mine")
    public R<List<BriefVO>> mineList(@RequestParam(required = false) String keyword) {
        return R.ok(briefService.mineList(keyword));
    }

    @GetMapping("/share/{token}")
    public R<BriefVO> getByShareToken(@PathVariable String token) {
        return R.ok(briefService.getByShareToken(token));
    }

    @GetMapping("/{id}")
    public R<BriefVO> getById(@PathVariable Integer id) {
        return R.ok(briefService.getById(id));
    }

    @PostMapping
    public R<BriefVO> create(@RequestBody BriefSaveDTO payload) {
        return R.ok(briefService.create(payload));
    }

    @PutMapping("/{id}")
    public R<BriefVO> update(@PathVariable Integer id, @RequestBody BriefSaveDTO payload) {
        return R.ok(briefService.update(id, payload));
    }

    @PostMapping("/{id}/share")
    public R<BriefShareVO> enableShare(@PathVariable Integer id) {
        return R.ok(briefService.enableShare(id));
    }

    @PostMapping("/share/{token}/edit-requests")
    public R<BriefEditRequestVO> requestEdit(@PathVariable String token, @RequestBody(required = false) BriefEditRequestDTO payload) {
        return R.ok(briefService.requestEditByShareToken(token, payload));
    }

    @GetMapping("/{id}/edit-requests")
    public R<List<BriefEditRequestVO>> editRequests(@PathVariable Integer id) {
        return R.ok(briefService.editRequests(id));
    }

    @PostMapping("/edit-requests/{requestId}/approve")
    public R<BriefEditRequestVO> approveEditRequest(@PathVariable Integer requestId) {
        return R.ok(briefService.approveEditRequest(requestId));
    }

    @PostMapping("/edit-requests/{requestId}/reject")
    public R<BriefEditRequestVO> rejectEditRequest(@PathVariable Integer requestId) {
        return R.ok(briefService.rejectEditRequest(requestId));
    }

    @PostMapping("/{id}/copy")
    public R<BriefVO> copyToProject(@PathVariable Integer id, @RequestParam Integer projectId) {
        return R.ok(briefService.copyToProject(id, projectId));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Integer id) {
        briefService.delete(id);
        return R.ok();
    }

    @PostMapping("/import")
    public R<List<BriefVO>> importBrief(@RequestParam Integer projectId, MultipartFile file) {
        return R.ok(briefService.importBrief(projectId, file));
    }

    @GetMapping("/import-template")
    public ResponseEntity<?> importTemplate() {
        SysImportTemplateConfig template = importTemplateMapper.selectOne(new QueryWrapper<SysImportTemplateConfig>()
            .eq("template_type", "selling_point")
            .eq("status", 1)
            .isNotNull("template_file_key")
            .ne("template_file_key", "")
            .orderByDesc("update_time")
            .last("limit 1"));
        if (template != null && StringUtils.hasText(template.templateFileKey)) {
            String fileName = StringUtils.hasText(template.downloadFileName) ? template.downloadFileName : "selling-point-template.xlsx";
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(fileName))
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(downloadTemplateFile(template.templateFileKey));
        }
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition("selling-point-template.xlsx"))
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(createSellingPointTemplateWorkbook());
    }

    private String contentDisposition(String fileName) {
        String encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");
        return "attachment; filename=\"" + fileName.replace("\"", "") + "\"; filename*=UTF-8''" + encoded;
    }

    private byte[] createSellingPointTemplateWorkbook() {
        String[] headers = {"产品名称", "产品型号", "产品价格", "产品Slogan", "目标人群", "产品特色卖点", "产品主要卖点", "产品次要卖点", "使用场景"};
        String[] sample = {"样例产品A60MAX", "A60MAX", "11900元", "万元级专业拉伸按摩椅", "久坐办公族;运动健身人群", "行业首款双拉伸按摩椅", "真4D灵犀机芯;柔性黄金导轨", "加热;蓝牙音箱;零重力", "客厅追剧;运动后恢复;父母养生"};
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("卖点导入模板");
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            Row headerRow = sheet.createRow(0);
            Row sampleRow = sheet.createRow(1);
            for (int i = 0; i < headers.length; i++) {
                Cell headerCell = headerRow.createCell(i);
                headerCell.setCellValue(headers[i]);
                headerCell.setCellStyle(headerStyle);
                sampleRow.createCell(i).setCellValue(sample[i]);
                sheet.setColumnWidth(i, Math.min(Math.max(headers[i].length(), sample[i].length()) * 512, 12000));
            }
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("生成导入模板失败", ex);
        }
    }

    private byte[] downloadTemplateFile(String objectKey) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(storageClient.presignedUrl(objectKey)))
                .timeout(Duration.ofSeconds(60))
                .GET()
                .build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("下载模板文件失败：" + response.statusCode());
            }
            return response.body();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("下载模板文件被中断", ex);
        } catch (Exception ex) {
            throw new IllegalStateException("下载模板文件失败：" + ex.getMessage(), ex);
        }
    }
}
