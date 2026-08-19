package com.aiscript.modules.brief.controller;

import com.aiscript.common.api.R;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.modules.brief.dto.BriefEditRequestDTO;
import com.aiscript.modules.brief.dto.BriefSaveDTO;
import com.aiscript.modules.brief.dto.BriefShareDTO;
import com.aiscript.modules.brief.dto.BriefSharePackCreateDTO;
import com.aiscript.modules.brief.dto.BriefSharePackLinkDTO;
import com.aiscript.modules.brief.service.BriefDocumentService;
import com.aiscript.modules.brief.service.BriefService;
import com.aiscript.modules.brief.vo.BriefEditRequestVO;
import com.aiscript.modules.brief.vo.BriefAssetLibraryVO;
import com.aiscript.modules.brief.vo.BriefShareVO;
import com.aiscript.modules.brief.vo.BriefSharePackVO;
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
    private final BriefDocumentService briefDocumentService;
    private final SysImportTemplateConfigMapper importTemplateMapper;
    private final StorageClient storageClient;
    private final HttpClient httpClient;

    public BriefController(
        BriefService briefService,
        BriefDocumentService briefDocumentService,
        SysImportTemplateConfigMapper importTemplateMapper,
        StorageClient storageClient
    ) {
        this.briefService = briefService;
        this.briefDocumentService = briefDocumentService;
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

    @GetMapping("/mine/assets")
    public R<BriefAssetLibraryVO> assetLibrary() {
        return R.ok(briefService.assetLibrary());
    }

    @GetMapping("/share-pack/{token}")
    public R<BriefSharePackVO> getSharePack(@PathVariable String token) {
        return R.ok(briefService.getSharePackByToken(token));
    }

    @PostMapping("/share-pack/{token}/link")
    public R<List<BriefVO>> linkSharePack(@PathVariable String token, @RequestBody BriefSharePackLinkDTO payload) {
        return R.ok(briefService.linkSharePackToProject(token, payload));
    }
    @PostMapping("/share-pack/{token}/unlink")
    public R<Void> unlinkSharePack(@PathVariable String token, @RequestBody BriefSharePackLinkDTO payload) {
        briefService.unlinkSharePackFromProject(token, payload);
        return R.ok();
    }

    @GetMapping("/share-pack/{token}/linked")
    public R<List<String>> sharePackLinkedBriefIds(@PathVariable String token, @RequestParam Integer projectId) {
        return R.ok(briefService.sharePackLinkedBriefIds(token, projectId));
    }
    @GetMapping("/share-pack/{token}/briefs/{briefId}")
    public R<BriefVO> getSharePackBrief(@PathVariable String token, @PathVariable Integer briefId) {
        return R.ok(briefService.getSharePackBrief(token, briefId));
    }
    @GetMapping("/share/{token}")
    public R<BriefVO> getByShareToken(@PathVariable String token) {
        return R.ok(briefService.getByShareToken(token));
    }

    @PutMapping("/share/{token}")
    public R<BriefVO> updateByShareToken(
        @PathVariable String token,
        @RequestParam Integer projectId,
        @RequestBody BriefSaveDTO payload
    ) {
        return R.ok(briefService.updateByShareToken(token, projectId, payload));
    }

    @GetMapping("/{id}")
    public R<BriefVO> getById(@PathVariable Integer id) {
        return R.ok(briefService.getById(id));
    }

    @GetMapping("/{id}/export-docx")
    public ResponseEntity<byte[]> exportDocx(
        @PathVariable Integer id,
        @RequestParam(required = false) String versionId
    ) {
        BriefVO brief = briefService.getById(id);
        byte[] document = briefDocumentService.createDocx(brief, versionId);
        String title = StringUtils.hasText(brief.getProductName()) ? brief.getProductName() : brief.getName();
        String fileName = safeFileName(title) + "-Brief.docx";
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(fileName))
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
            .contentLength(document.length)
            .body(document);
    }

    @PostMapping
    public R<BriefVO> create(@RequestBody BriefSaveDTO payload) {
        return R.ok(briefService.create(payload));
    }

    @PutMapping("/{id}")
    public R<BriefVO> update(@PathVariable Integer id, @RequestBody BriefSaveDTO payload) {
        return R.ok(briefService.update(id, payload));
    }

    @PostMapping("/share-packs")
    public R<BriefSharePackVO> createSharePack(@RequestBody BriefSharePackCreateDTO payload) {
        return R.ok(briefService.createSharePack(payload));
    }
    @PostMapping("/{id}/share")
    public R<BriefShareVO> enableShare(@PathVariable Integer id, @RequestBody(required = false) BriefShareDTO payload) {
        return R.ok(briefService.enableShare(id, payload == null ? null : payload.getPermission()));
    }

    @GetMapping("/{id}/share-links")
    public R<List<BriefShareVO>> shareLinks(@PathVariable Integer id) {
        return R.ok(briefService.shareLinks(id));
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

    @PostMapping("/{id}/link")
    public R<BriefVO> linkToProject(@PathVariable Integer id, @RequestParam Integer projectId) {
        return R.ok(briefService.linkToProject(id, projectId));
    }

    @DeleteMapping("/{id}/link")
    public R<Void> unlinkFromProject(@PathVariable Integer id, @RequestParam Integer projectId) {
        briefService.unlinkFromProject(id, projectId);
        return R.ok();
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
        String asciiFallback = fileName.replaceAll("[^\\x20-\\x7E]", "_").replace("\"", "");
        return "attachment; filename=\"" + asciiFallback + "\"; filename*=UTF-8''" + encoded;
    }

    private String safeFileName(String value) {
        if (!StringUtils.hasText(value)) return "产品";
        String safe = value.replaceAll("[\\\\/:*?\"<>|\\r\\n]+", "-").trim();
        return StringUtils.hasText(safe) ? safe : "产品";
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
