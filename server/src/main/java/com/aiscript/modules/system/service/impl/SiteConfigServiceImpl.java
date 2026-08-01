package com.aiscript.modules.system.service.impl;

import com.aiscript.modules.system.dto.SiteConfigSaveDTO;
import com.aiscript.modules.system.entity.SysSiteConfig;
import com.aiscript.modules.system.mapper.SysSiteConfigMapper;
import com.aiscript.modules.system.service.ConfigDictionaryService;
import com.aiscript.modules.system.service.SiteConfigService;
import com.aiscript.modules.system.vo.PublicSiteConfigVO;
import com.aiscript.modules.system.vo.SiteConfigVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SiteConfigServiceImpl implements SiteConfigService {
    private static final String DEFAULT_CONFIG_CODE = "default";
    private static final String HOME_LOGO_URL = "site.home.logo.url";
    private static final String HOME_LOGO_KEY = "site.home.logo.key";
    private static final String VIRAL_SIMPLE_EXAMPLE = "content.viral.simple-analysis-example";
    private static final String VIRAL_DEEP_EXAMPLE = "content.viral.deep-analysis-example";
    private static final String ORIGINAL_SCENARIO_PROMPTS = "content.original.scenario-prompts";
    private static final String HOME_VISUAL_CONFIG = "visual.home.config";
    private static final String SCRIPT_VISUAL_CONFIG = "visual.script-generator.config";
    private static final String USER_AGREEMENT_CONFIG = "legal.user-agreement.config";
    private static final String PRIVACY_POLICY_CONFIG = "legal.privacy-policy.config";
    private static final List<String> SITE_CONFIG_KEYS = List.of(
        HOME_LOGO_URL,
        HOME_LOGO_KEY,
        VIRAL_SIMPLE_EXAMPLE,
        VIRAL_DEEP_EXAMPLE,
        ORIGINAL_SCENARIO_PROMPTS,
        HOME_VISUAL_CONFIG,
        SCRIPT_VISUAL_CONFIG,
        USER_AGREEMENT_CONFIG,
        PRIVACY_POLICY_CONFIG
    );

    private final SysSiteConfigMapper siteConfigMapper;
    private final ConfigDictionaryService configDictionaryService;

    public SiteConfigServiceImpl(
        SysSiteConfigMapper siteConfigMapper,
        ConfigDictionaryService configDictionaryService
    ) {
        this.siteConfigMapper = siteConfigMapper;
        this.configDictionaryService = configDictionaryService;
    }

    @Override
    public SiteConfigVO getConfig() {
        SysSiteConfig config = getDefaultConfig();
        return toVO(config);
    }

    @Override
    public PublicSiteConfigVO getPublicConfig() {
        SysSiteConfig config = getDefaultConfig();
        Map<String, String> values = configDictionaryService.getValues(SITE_CONFIG_KEYS);
        PublicSiteConfigVO vo = new PublicSiteConfigVO();
        vo.homeLogoUrl = valueOrLegacy(values, HOME_LOGO_URL, config == null ? null : config.getFrontHomeLogoUrl());
        vo.homeLogoKey = valueOrLegacy(values, HOME_LOGO_KEY, config == null ? null : config.getFrontHomeLogoKey());
        vo.viralSimpleAnalysisExample = valueOrLegacy(values, VIRAL_SIMPLE_EXAMPLE, config == null ? null : config.getFrontViralSimpleAnalysisExample());
        vo.viralDeepAnalysisExample = valueOrLegacy(values, VIRAL_DEEP_EXAMPLE, config == null ? null : config.getFrontViralDeepAnalysisExample());
        vo.originalScenarioPrompts = valueOrLegacy(values, ORIGINAL_SCENARIO_PROMPTS, config == null ? null : config.getFrontOriginalScenarioPrompts());
        vo.homeVisualConfig = valueOrLegacy(values, HOME_VISUAL_CONFIG, config == null ? null : config.getFrontHomeVisualConfig());
        vo.scriptVisualConfig = valueOrLegacy(values, SCRIPT_VISUAL_CONFIG, config == null ? null : config.getFrontScriptVisualConfig());
        vo.userAgreementConfig = values.get(USER_AGREEMENT_CONFIG);
        vo.privacyPolicyConfig = values.get(PRIVACY_POLICY_CONFIG);
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SiteConfigVO save(SiteConfigSaveDTO dto) {
        if (dto == null) {
            dto = new SiteConfigSaveDTO();
        }
        SysSiteConfig config = getDefaultConfig();
        if (config == null) {
            config = new SysSiteConfig();
            config.setConfigCode(DEFAULT_CONFIG_CODE);
            config.setStatus(1);
            applyLegacyPatch(config, dto);
            siteConfigMapper.insert(config);
        } else {
            applyLegacyPatch(config, dto);
            siteConfigMapper.updateById(config);
        }
        saveDictionaryPatch(dto);
        return toVO(config);
    }

    private SysSiteConfig getDefaultConfig() {
        return siteConfigMapper.selectOne(new LambdaQueryWrapper<SysSiteConfig>()
            .eq(SysSiteConfig::getConfigCode, DEFAULT_CONFIG_CODE)
            .last("LIMIT 1"));
    }

    private SiteConfigVO toVO(SysSiteConfig config) {
        SiteConfigVO vo = new SiteConfigVO();
        Map<String, String> values = configDictionaryService.getValues(SITE_CONFIG_KEYS);
        if (config != null) {
            vo.id = String.valueOf(config.getId());
            vo.status = config.getStatus();
            vo.createdAt = config.getCreateTime() == null ? null : config.getCreateTime().toString();
            vo.updatedAt = config.getUpdateTime() == null ? null : config.getUpdateTime().toString();
        }
        vo.homeLogoUrl = valueOrLegacy(values, HOME_LOGO_URL, config == null ? null : config.getFrontHomeLogoUrl());
        vo.homeLogoKey = valueOrLegacy(values, HOME_LOGO_KEY, config == null ? null : config.getFrontHomeLogoKey());
        vo.viralSimpleAnalysisExample = valueOrLegacy(values, VIRAL_SIMPLE_EXAMPLE, config == null ? null : config.getFrontViralSimpleAnalysisExample());
        vo.viralDeepAnalysisExample = valueOrLegacy(values, VIRAL_DEEP_EXAMPLE, config == null ? null : config.getFrontViralDeepAnalysisExample());
        vo.originalScenarioPrompts = valueOrLegacy(values, ORIGINAL_SCENARIO_PROMPTS, config == null ? null : config.getFrontOriginalScenarioPrompts());
        vo.homeVisualConfig = valueOrLegacy(values, HOME_VISUAL_CONFIG, config == null ? null : config.getFrontHomeVisualConfig());
        vo.scriptVisualConfig = valueOrLegacy(values, SCRIPT_VISUAL_CONFIG, config == null ? null : config.getFrontScriptVisualConfig());
        vo.userAgreementConfig = values.get(USER_AGREEMENT_CONFIG);
        vo.privacyPolicyConfig = values.get(PRIVACY_POLICY_CONFIG);
        return vo;
    }

    private String valueOrLegacy(Map<String, String> values, String key, String legacyValue) {
        return values.containsKey(key) ? values.get(key) : legacyValue;
    }

    private void applyLegacyPatch(SysSiteConfig config, SiteConfigSaveDTO dto) {
        if (dto.homeLogoUrl != null) config.setFrontHomeLogoUrl(dto.homeLogoUrl);
        if (dto.homeLogoKey != null) config.setFrontHomeLogoKey(dto.homeLogoKey);
        if (dto.viralSimpleAnalysisExample != null) config.setFrontViralSimpleAnalysisExample(dto.viralSimpleAnalysisExample);
        if (dto.viralDeepAnalysisExample != null) config.setFrontViralDeepAnalysisExample(dto.viralDeepAnalysisExample);
        if (dto.originalScenarioPrompts != null) config.setFrontOriginalScenarioPrompts(dto.originalScenarioPrompts);
        if (dto.homeVisualConfig != null) config.setFrontHomeVisualConfig(dto.homeVisualConfig);
        if (dto.scriptVisualConfig != null) config.setFrontScriptVisualConfig(dto.scriptVisualConfig);
    }

    private void saveDictionaryPatch(SiteConfigSaveDTO dto) {
        putIfPresent(HOME_LOGO_URL, dto.homeLogoUrl, "string", "首页品牌图标 URL", "page-visual");
        putIfPresent(HOME_LOGO_KEY, dto.homeLogoKey, "string", "首页品牌图标存储 Key", "page-visual");
        putIfPresent(VIRAL_SIMPLE_EXAMPLE, dto.viralSimpleAnalysisExample, "text", "简易文案解析案例", "script-generator");
        putIfPresent(VIRAL_DEEP_EXAMPLE, dto.viralDeepAnalysisExample, "text", "深度拉片解析案例", "script-generator");
        putIfPresent(ORIGINAL_SCENARIO_PROMPTS, dto.originalScenarioPrompts, "json", "AI智能脚本分类提示词", "script-generator");
        putIfPresent(HOME_VISUAL_CONFIG, dto.homeVisualConfig, "json", "主页视觉配置", "page-visual");
        putIfPresent(SCRIPT_VISUAL_CONFIG, dto.scriptVisualConfig, "json", "脚本生成器视觉配置", "page-visual");
        putIfPresent(USER_AGREEMENT_CONFIG, dto.userAgreementConfig, "json", "用户协议", "legal");
        putIfPresent(PRIVACY_POLICY_CONFIG, dto.privacyPolicyConfig, "json", "隐私政策", "legal");
    }

    private void putIfPresent(String key, String value, String type, String name, String groupCode) {
        if (value != null) {
            configDictionaryService.putValue(key, value, type, name, groupCode);
        }
    }

}
