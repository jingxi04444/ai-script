package com.aiscript.modules.compliance.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.compliance.convert.ComplianceConvert;
import com.aiscript.modules.compliance.dto.ComplianceCheckDTO;
import com.aiscript.modules.compliance.dto.ComplianceWordSaveDTO;
import com.aiscript.modules.compliance.entity.AiComplianceCheck;
import com.aiscript.modules.compliance.entity.AiComplianceWord;
import com.aiscript.modules.compliance.entity.AiOriginalityCheck;
import com.aiscript.modules.compliance.mapper.AiComplianceCheckMapper;
import com.aiscript.modules.compliance.mapper.AiComplianceWordMapper;
import com.aiscript.modules.compliance.mapper.AiOriginalityCheckMapper;
import com.aiscript.modules.compliance.service.ComplianceService;
import com.aiscript.modules.compliance.vo.ComplianceCheckVO;
import com.aiscript.modules.compliance.vo.ComplianceRiskVO;
import com.aiscript.modules.compliance.vo.ComplianceWordVO;
import com.aiscript.modules.compliance.vo.OriginalityMatchVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ComplianceServiceImpl implements ComplianceService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private final AiComplianceWordMapper wordMapper;
    private final AiComplianceCheckMapper checkMapper;
    private final AiOriginalityCheckMapper originalityCheckMapper;

    public ComplianceServiceImpl(
        AiComplianceWordMapper wordMapper,
        AiComplianceCheckMapper checkMapper,
        AiOriginalityCheckMapper originalityCheckMapper
    ) {
        this.wordMapper = wordMapper;
        this.checkMapper = checkMapper;
        this.originalityCheckMapper = originalityCheckMapper;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ComplianceCheckVO check(ComplianceCheckDTO dto) {
        if (!StringUtils.hasText(dto.getScriptVersionId()) || !StringUtils.hasText(dto.getContent())) {
            throw new BusinessException("脚本版本ID和检测内容不能为空");
        }
        List<AiComplianceWord> words = wordMapper.selectList(new LambdaQueryWrapper<AiComplianceWord>()
            .eq(AiComplianceWord::getStatus, 1));
        List<ComplianceRiskVO> risks = new ArrayList<>();
        for (AiComplianceWord word : words) {
            if (StringUtils.hasText(word.getWordText()) && dto.getContent().contains(word.getWordText())) {
                ComplianceRiskVO risk = new ComplianceRiskVO();
                risk.setWord(word.getWordText());
                risk.setCategory(word.getCategory());
                risk.setRiskLevel(word.getRiskLevel());
                risk.setSuggestion(word.getSuggestion() == null ? "" : word.getSuggestion());
                risks.add(risk);
            }
        }
        AiComplianceCheck check = new AiComplianceCheck();
        check.setTenantId(currentTenantId());
        check.setScriptVersionId(Integer.valueOf(dto.getScriptVersionId()));
        check.setStatus("completed");
        check.setRiskCount(risks.size());
        check.setResultJson(JsonUtils.toJson(Map.of("risks", risks)));
        check.setCheckTime(LocalDateTime.now());
        checkMapper.insert(check);

        ComplianceCheckVO vo = new ComplianceCheckVO();
        vo.setId(String.valueOf(check.getId()));
        vo.setScriptVersionId(dto.getScriptVersionId());
        vo.setRiskCount(risks.size());
        vo.setRisks(risks);
        vo.setSuggestion(risks.isEmpty() ? "未发现命中词库的风险词" : "建议按风险词替换建议修改后再次检测");
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ComplianceCheckVO originality(ComplianceCheckDTO dto) {
        if (!StringUtils.hasText(dto.getScriptVersionId()) || !StringUtils.hasText(dto.getContent())) {
            throw new BusinessException("脚本版本ID和检测内容不能为空");
        }
        List<OriginalityMatchVO> matchedSources = findMatchedSources(dto);
        BigDecimal maxSimilarity = matchedSources.stream()
            .map(item -> new BigDecimal(item.getSimilarityPercent()))
            .max(BigDecimal::compareTo)
            .orElse(BigDecimal.ZERO);

        AiOriginalityCheck check = new AiOriginalityCheck();
        check.setTenantId(currentTenantId());
        check.setScriptVersionId(Integer.valueOf(dto.getScriptVersionId()));
        check.setSimilarityPercent(maxSimilarity);
        check.setMatchedSources(JsonUtils.toJson(matchedSources));
        check.setSuggestion(originalitySuggestion(maxSimilarity));
        check.setCheckTime(LocalDateTime.now());
        originalityCheckMapper.insert(check);

        ComplianceCheckVO vo = new ComplianceCheckVO();
        vo.setId(String.valueOf(check.getId()));
        vo.setScriptVersionId(dto.getScriptVersionId());
        vo.setRiskCount(matchedSources.size());
        vo.setRisks(List.of());
        vo.setSimilarityPercent(maxSimilarity.toPlainString());
        vo.setMatchedSources(matchedSources);
        vo.setSuggestion(check.getSuggestion());
        return vo;
    }

    @Override
    public PageResult<ComplianceWordVO> wordPage(PageQuery query) {
        LambdaQueryWrapper<AiComplianceWord> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(AiComplianceWord::getWordText, query.getKeyword());
        }
        wrapper.orderByDesc(AiComplianceWord::getCreateTime);
        IPage<AiComplianceWord> page = wordMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        List<ComplianceWordVO> list = page.getRecords().stream().map(ComplianceConvert::toWordVO).toList();
        return new PageResult<>(list, page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ComplianceWordVO saveWord(Integer id, ComplianceWordSaveDTO dto) {
        AiComplianceWord word = id == null ? new AiComplianceWord() : wordMapper.selectById(id);
        if (word == null) {
            throw new BusinessException("合规词不存在");
        }
        if (id == null) {
            word.setTenantId(currentTenantId());
            word.setStatus(1);
        }
        word.setWordText(dto.getWordText());
        word.setCategory(dto.getCategory());
        word.setRiskLevel(StringUtils.hasText(dto.getRiskLevel()) ? dto.getRiskLevel() : "medium");
        word.setSuggestion(dto.getSuggestion());
        if (id == null) {
            wordMapper.insert(word);
        } else {
            wordMapper.updateById(word);
        }
        return ComplianceConvert.toWordVO(word);
    }

    @Override
    public void deleteWord(Integer id) {
        wordMapper.deleteById(id);
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }

    private List<OriginalityMatchVO> findMatchedSources(ComplianceCheckDTO dto) {
        String content = normalize(dto.getContent());
        Integer currentVersionId = Integer.valueOf(dto.getScriptVersionId());
        List<OriginalityMatchVO> matches = new ArrayList<>();

        originalityCheckMapper.selectOriginalityCandidates(currentTenantId(), currentVersionId)
            .forEach(candidate -> addMatch(
                matches,
                content,
                candidate.getSourceType(),
                String.valueOf(candidate.getSourceId()),
                candidate.getTitle(),
                candidate.getContent()
            ));

        return matches.stream()
            .filter(item -> new BigDecimal(item.getSimilarityPercent()).compareTo(new BigDecimal("20")) >= 0)
            .sorted((left, right) -> new BigDecimal(right.getSimilarityPercent())
                .compareTo(new BigDecimal(left.getSimilarityPercent())))
            .limit(5)
            .toList();
    }

    private void addMatch(List<OriginalityMatchVO> matches, String content, String type, String id, String title, String candidateText) {
        BigDecimal similarity = similarity(content, normalize(candidateText));
        if (similarity.compareTo(BigDecimal.ZERO) > 0) {
            OriginalityMatchVO match = new OriginalityMatchVO();
            match.setSourceType(type);
            match.setSourceId(id);
            match.setTitle(title == null ? "" : title);
            match.setSimilarityPercent(similarity.toPlainString());
            matches.add(match);
        }
    }

    private String originalitySuggestion(BigDecimal similarity) {
        if (similarity.compareTo(new BigDecimal("70")) >= 0) {
            return "相似度较高，建议重写结构、表达和案例后再次检测";
        }
        if (similarity.compareTo(new BigDecimal("40")) >= 0) {
            return "存在一定相似内容，建议调整关键表述和镜头结构";
        }
        return "未发现明显高相似来源";
    }

    private BigDecimal similarity(String left, String right) {
        if (!StringUtils.hasText(left) || !StringUtils.hasText(right)) {
            return BigDecimal.ZERO;
        }
        Set<String> leftTokens = tokens(left);
        Set<String> rightTokens = tokens(right);
        if (leftTokens.isEmpty() || rightTokens.isEmpty()) {
            return BigDecimal.ZERO;
        }
        Set<String> intersection = new HashSet<>(leftTokens);
        intersection.retainAll(rightTokens);
        Set<String> union = new HashSet<>(leftTokens);
        union.addAll(rightTokens);
        return BigDecimal.valueOf(intersection.size() * 100.0 / union.size()).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private Set<String> tokens(String value) {
        Set<String> tokens = new HashSet<>();
        String text = normalize(value);
        if (text.length() <= 2) {
            if (!text.isBlank()) {
                tokens.add(text);
            }
            return tokens;
        }
        for (int i = 0; i < text.length() - 1; i++) {
            tokens.add(text.substring(i, i + 2));
        }
        return tokens;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        Map<String, Object> json = JsonUtils.toMap(value);
        if (!json.isEmpty() && json.get("content") != null) {
            return normalize(String.valueOf(json.get("content")));
        }
        return value.replaceAll("\\s+", "").toLowerCase();
    }
}
