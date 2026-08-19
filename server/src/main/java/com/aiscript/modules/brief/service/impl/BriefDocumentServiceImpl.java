package com.aiscript.modules.brief.service.impl;

import com.aiscript.common.util.JsonUtils;
import com.aiscript.modules.brief.service.BriefDocumentService;
import com.aiscript.modules.brief.vo.BriefVO;
import com.aiscript.modules.brief.vo.BriefVersionVO;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.apache.poi.xwpf.usermodel.BreakType;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.TableRowAlign;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFStyle;
import org.apache.poi.xwpf.usermodel.XWPFStyles;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTColor;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTFonts;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTJcTable;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTOnOff;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPPrGeneral;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageMar;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageSz;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTRPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTSpacing;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTStyle;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblCellMar;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblGrid;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblGridCol;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblLayoutType;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblWidth;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTcPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTVerticalJc;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STJcTable;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STLineSpacingRule;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STStyleType;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STTblLayoutType;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STTblWidth;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STVerticalJc;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

@Service
public class BriefDocumentServiceImpl implements BriefDocumentService {
    private static final Pattern BLOCK_END = Pattern.compile("(?i)</\\s*(p|div|h[1-6]|li|ul|ol|table|tr)\\s*>");
    private static final Pattern BREAK = Pattern.compile("(?i)<\\s*br\\s*/?\\s*>");
    private static final Pattern TAG = Pattern.compile("<[^>]+>");
    private static final Pattern EXTRA_BLANK_LINES = Pattern.compile("\\n{3,}");

    @Override
    public byte[] createDocx(BriefVO brief, String versionId) {
        BriefDocumentData data = resolveData(brief, versionId);
        try (XWPFDocument document = new XWPFDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            configurePage(document);
            configureStyles(document);
            configureProperties(document, data);

            addTitle(document, data.title());
            addMetadata(document, data);

            addHeading(document, "AI 可读摘要", "Heading1");
            addSummary(document, data.fields());

            addHeading(document, "结构化 Brief", "Heading1");
            addFieldTable(document, data.fields());

            document.write(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("生成 Brief DOCX 失败", ex);
        }
    }

    private BriefDocumentData resolveData(BriefVO brief, String versionId) {
        BriefVersionVO selectedVersion = selectVersion(brief, versionId);
        Map<String, Object> snapshot = selectedVersion == null ? Map.of() : JsonUtils.toMap(selectedVersion.getContent());

        String name = value(snapshot, "briefName", brief.getName());
        String productName = value(snapshot, "productName", brief.getProductName());
        String productModel = value(snapshot, "productModel", brief.getProductModel());
        String price = value(snapshot, "price", brief.getPrice());
        String slogan = value(snapshot, "slogan", brief.getSlogan());
        String targetAudience = value(snapshot, "targetAudience", brief.getTargetAudience());
        String targetScene = value(snapshot, "targetScene", brief.getTargetScene());
        String primarySellingPoint = value(snapshot, "primarySellingPoint", brief.getPrimarySellingPoint());
        String otherRequirements = value(snapshot, "otherRequirements", brief.getOtherRequirements());
        String briefContent = value(snapshot, "briefContent", brief.getBriefContent());
        String richContent = value(snapshot, "richContent", brief.getRichContent());
        Map<String, Object> richValues = JsonUtils.toMap(richContent);

        LinkedHashMap<String, String> fields = new LinkedHashMap<>();
        fields.put("产品名称", plainText(firstNonBlank(productName, name)));
        fields.put("产品型号", plainText(productModel));
        fields.put("产品价格", plainText(price));
        fields.put("产品 Slogan", plainText(slogan));
        fields.put("目标人群", plainText(value(richValues, "audience", targetAudience)));
        fields.put("产品特色卖点", plainText(value(richValues, "features", targetScene)));
        fields.put("产品主要卖点", plainText(value(richValues, "mainPoints", primarySellingPoint)));
        fields.put("产品次要卖点", plainText(value(richValues, "secondaryPoints", otherRequirements)));
        fields.put("Brief 补充内容", plainText(briefContent));

        String title = firstNonBlank(productName, name, "产品 Brief");
        return new BriefDocumentData(
            plainText(title),
            selectedVersion == null ? "当前版本" : firstNonBlank(selectedVersion.getLabel(), "当前版本"),
            selectedVersion == null ? brief.getUpdatedAt() : selectedVersion.getCreatedAt(),
            fields
        );
    }

    private BriefVersionVO selectVersion(BriefVO brief, String versionId) {
        List<BriefVersionVO> versions = brief.getVersions();
        if (versions == null || versions.isEmpty()) return null;
        if (StringUtils.hasText(versionId)) {
            return versions.stream()
                .filter(version -> versionId.equals(version.getId()))
                .findFirst()
                .orElse(versions.get(0));
        }
        return versions.get(0);
    }

    private String value(Map<String, Object> values, String key, String fallback) {
        if (!values.containsKey(key)) return fallback;
        Object value = values.get(key);
        return value == null ? "" : String.valueOf(value);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) return value;
        }
        return "";
    }

    private String plainText(String source) {
        if (!StringUtils.hasText(source)) return "未填写";
        String text = BREAK.matcher(source).replaceAll("\n");
        text = BLOCK_END.matcher(text).replaceAll("\n");
        text = TAG.matcher(text).replaceAll("");
        text = HtmlUtils.htmlUnescape(text).replace('\u00a0', ' ');
        List<String> lines = new ArrayList<>();
        for (String line : text.replace("\r\n", "\n").replace('\r', '\n').split("\n")) {
            String normalized = line.trim().replaceAll("[ \\t]+", " ");
            if (!normalized.isEmpty()) lines.add(normalized);
        }
        String result = EXTRA_BLANK_LINES.matcher(String.join("\n", lines)).replaceAll("\n\n").trim();
        return result.isEmpty() ? "未填写" : result;
    }

    private void configurePage(XWPFDocument document) {
        CTPageSz pageSize = document.getDocument().getBody().addNewSectPr().addNewPgSz();
        pageSize.setW(BigInteger.valueOf(12240));
        pageSize.setH(BigInteger.valueOf(15840));
        CTPageMar margins = document.getDocument().getBody().getSectPr().addNewPgMar();
        margins.setTop(BigInteger.valueOf(1440));
        margins.setRight(BigInteger.valueOf(1440));
        margins.setBottom(BigInteger.valueOf(1440));
        margins.setLeft(BigInteger.valueOf(1440));
        margins.setHeader(BigInteger.valueOf(708));
        margins.setFooter(BigInteger.valueOf(708));
    }

    private void configureStyles(XWPFDocument document) {
        XWPFStyles styles = document.createStyles();
        styles.addStyle(paragraphStyle("Normal", "Normal", 22, "000000", 0, 120, 264, false));
        styles.addStyle(paragraphStyle("BriefTitle", "Brief Title", 44, "0B2545", 0, 160, 264, true));
        styles.addStyle(paragraphStyle("Heading1", "Heading 1", 32, "2E74B5", 320, 160, 264, true));
        styles.addStyle(paragraphStyle("Heading2", "Heading 2", 26, "2E74B5", 240, 120, 264, true));
    }

    private XWPFStyle paragraphStyle(
        String id,
        String name,
        int halfPoints,
        String color,
        int before,
        int after,
        int line,
        boolean bold
    ) {
        CTStyle style = CTStyle.Factory.newInstance();
        style.setStyleId(id);
        style.setType(STStyleType.PARAGRAPH);
        style.addNewName().setVal(name);
        if ("Normal".equals(id)) style.addNewQFormat();

        CTPPrGeneral paragraphProperties = style.addNewPPr();
        CTSpacing spacing = paragraphProperties.addNewSpacing();
        spacing.setBefore(BigInteger.valueOf(before));
        spacing.setAfter(BigInteger.valueOf(after));
        spacing.setLine(BigInteger.valueOf(line));
        spacing.setLineRule(STLineSpacingRule.AUTO);

        CTRPr runProperties = style.addNewRPr();
        CTFonts fonts = runProperties.addNewRFonts();
        fonts.setAscii("Calibri");
        fonts.setHAnsi("Calibri");
        // Word and LibreOffice both apply system fallback when STHeiti is unavailable.
        // Declaring a real CJK family prevents converters from selecting a Latin-only font.
        fonts.setEastAsia("STHeiti");
        runProperties.addNewSz().setVal(BigInteger.valueOf(halfPoints));
        runProperties.addNewSzCs().setVal(BigInteger.valueOf(halfPoints));
        CTColor textColor = runProperties.addNewColor();
        textColor.setVal(color);
        if (bold) {
            CTOnOff isBold = runProperties.addNewB();
            isBold.setVal(true);
        }
        return new XWPFStyle(style);
    }

    private void configureProperties(XWPFDocument document, BriefDocumentData data) {
        document.getProperties().getCoreProperties().setTitle(data.title() + " Brief");
        document.getProperties().getCoreProperties().setSubjectProperty("AI 可读取的结构化产品 Brief");
        document.getProperties().getCoreProperties().setCreator("AI Script");
        document.getProperties().getCoreProperties().setKeywords("Brief,产品,卖点,AI,LLM");
    }

    private void addTitle(XWPFDocument document, String title) {
        XWPFParagraph paragraph = document.createParagraph();
        paragraph.setStyle("BriefTitle");
        paragraph.setAlignment(ParagraphAlignment.LEFT);
        addText(paragraph, title + " Brief", true);
    }

    private void addMetadata(XWPFDocument document, BriefDocumentData data) {
        XWPFParagraph paragraph = document.createParagraph();
        paragraph.setStyle("Normal");
        XWPFRun run = addText(paragraph, "版本：" + data.versionLabel() + "    更新时间：" + firstNonBlank(data.updatedAt(), "未知"), false);
        run.setColor("555555");
        run.setFontSize(10);
    }

    private void addHeading(XWPFDocument document, String text, String style) {
        XWPFParagraph paragraph = document.createParagraph();
        paragraph.setStyle(style);
        addText(paragraph, text, true);
    }

    private void addSummary(XWPFDocument document, LinkedHashMap<String, String> fields) {
        fields.forEach((label, value) -> {
            XWPFParagraph paragraph = document.createParagraph();
            paragraph.setStyle("Normal");
            XWPFRun labelRun = addText(paragraph, label + "：", true);
            labelRun.setBold(true);
            addText(paragraph, value, false);
        });
    }

    private void addFieldTable(XWPFDocument document, LinkedHashMap<String, String> fields) {
        XWPFTable table = document.createTable(fields.size(), 2);
        configureTable(table);
        int index = 0;
        for (Map.Entry<String, String> field : fields.entrySet()) {
            XWPFTableRow row = table.getRow(index++);
            configureCell(row.getCell(0), 2700, true, field.getKey());
            configureCell(row.getCell(1), 6660, false, field.getValue());
        }
    }

    private void configureTable(XWPFTable table) {
        CTTblPr properties = table.getCTTbl().getTblPr();
        CTTblWidth width = properties.isSetTblW() ? properties.getTblW() : properties.addNewTblW();
        width.setType(STTblWidth.DXA);
        width.setW(BigInteger.valueOf(9360));
        CTTblWidth indent = properties.addNewTblInd();
        indent.setType(STTblWidth.DXA);
        indent.setW(BigInteger.valueOf(120));
        CTTblLayoutType layout = properties.addNewTblLayout();
        layout.setType(STTblLayoutType.FIXED);
        CTJcTable alignment = properties.isSetJc() ? properties.getJc() : properties.addNewJc();
        alignment.setVal(STJcTable.LEFT);
        table.setTableAlignment(TableRowAlign.LEFT);

        CTTblGrid grid = table.getCTTbl().getTblGrid() == null
            ? table.getCTTbl().addNewTblGrid()
            : table.getCTTbl().getTblGrid();
        while (grid.sizeOfGridColArray() > 0) grid.removeGridCol(0);
        CTTblGridCol labelColumn = grid.addNewGridCol();
        labelColumn.setW(BigInteger.valueOf(2700));
        CTTblGridCol valueColumn = grid.addNewGridCol();
        valueColumn.setW(BigInteger.valueOf(6660));

        CTTblCellMar margins = properties.addNewTblCellMar();
        setTableWidth(margins.addNewTop(), 80);
        setTableWidth(margins.addNewBottom(), 80);
        setTableWidth(margins.addNewLeft(), 120);
        setTableWidth(margins.addNewRight(), 120);
    }

    private void configureCell(XWPFTableCell cell, int width, boolean label, String text) {
        CTTcPr properties = cell.getCTTc().isSetTcPr() ? cell.getCTTc().getTcPr() : cell.getCTTc().addNewTcPr();
        CTTblWidth cellWidth = properties.isSetTcW() ? properties.getTcW() : properties.addNewTcW();
        setTableWidth(cellWidth, width);
        CTVerticalJc vertical = properties.isSetVAlign() ? properties.getVAlign() : properties.addNewVAlign();
        vertical.setVal(STVerticalJc.TOP);
        if (label) properties.addNewShd().setFill("F2F4F7");

        XWPFParagraph paragraph = cell.getParagraphs().get(0);
        paragraph.setStyle("Normal");
        addText(paragraph, text, label);
    }

    private void setTableWidth(CTTblWidth width, int dxa) {
        width.setType(STTblWidth.DXA);
        width.setW(BigInteger.valueOf(dxa));
    }

    private XWPFRun addText(XWPFParagraph paragraph, String text, boolean bold) {
        XWPFRun run = paragraph.createRun();
        run.setBold(bold);
        // Run-level font declarations avoid LibreOffice dropping CJK glyphs when a run
        // also has direct formatting such as bold or color.
        run.setFontFamily("Calibri", XWPFRun.FontCharRange.ascii);
        run.setFontFamily("Calibri", XWPFRun.FontCharRange.hAnsi);
        run.setFontFamily("STHeiti", XWPFRun.FontCharRange.eastAsia);
        String[] lines = text.split("\\n", -1);
        for (int i = 0; i < lines.length; i++) {
            if (i > 0) run.addBreak(BreakType.TEXT_WRAPPING);
            run.setText(lines[i]);
        }
        return run;
    }

    private record BriefDocumentData(
        String title,
        String versionLabel,
        String updatedAt,
        LinkedHashMap<String, String> fields
    ) {
    }
}
