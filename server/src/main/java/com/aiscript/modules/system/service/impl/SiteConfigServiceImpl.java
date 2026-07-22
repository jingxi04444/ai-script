package com.aiscript.modules.system.service.impl;

import com.aiscript.modules.system.dto.SiteConfigSaveDTO;
import com.aiscript.modules.system.entity.SysSiteConfig;
import com.aiscript.modules.system.mapper.SysSiteConfigMapper;
import com.aiscript.modules.system.service.SiteConfigService;
import com.aiscript.modules.system.vo.PublicSiteConfigVO;
import com.aiscript.modules.system.vo.SiteConfigVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SiteConfigServiceImpl implements SiteConfigService {
    private static final String DEFAULT_CONFIG_CODE = "default";

    private final SysSiteConfigMapper siteConfigMapper;

    public SiteConfigServiceImpl(SysSiteConfigMapper siteConfigMapper) {
        this.siteConfigMapper = siteConfigMapper;
    }

    @Override
    public SiteConfigVO getConfig() {
        SysSiteConfig config = getDefaultConfig();
        return toVO(config);
    }

    @Override
    public PublicSiteConfigVO getPublicConfig() {
        SysSiteConfig config = getDefaultConfig();
        PublicSiteConfigVO vo = new PublicSiteConfigVO();
        if (config == null) {
            return vo;
        }
        vo.homeLogoUrl = config.getFrontHomeLogoUrl();
        vo.homeLogoKey = config.getFrontHomeLogoKey();
        vo.viralSimpleAnalysisExample = config.getFrontViralSimpleAnalysisExample();
        vo.viralDeepAnalysisExample = config.getFrontViralDeepAnalysisExample();
        vo.originalScenarioPrompts = config.getFrontOriginalScenarioPrompts();
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
            config.setFrontHomeLogoUrl(dto.homeLogoUrl);
            config.setFrontHomeLogoKey(dto.homeLogoKey);
            config.setFrontViralSimpleAnalysisExample(dto.viralSimpleAnalysisExample);
            config.setFrontViralDeepAnalysisExample(dto.viralDeepAnalysisExample);
            config.setFrontOriginalScenarioPrompts(dto.originalScenarioPrompts);
            siteConfigMapper.insert(config);
        } else {
            config.setFrontHomeLogoUrl(dto.homeLogoUrl);
            config.setFrontHomeLogoKey(dto.homeLogoKey);
            config.setFrontViralSimpleAnalysisExample(dto.viralSimpleAnalysisExample);
            config.setFrontViralDeepAnalysisExample(dto.viralDeepAnalysisExample);
            config.setFrontOriginalScenarioPrompts(dto.originalScenarioPrompts);
            siteConfigMapper.updateById(config);
        }
        return toVO(config);
    }

    private SysSiteConfig getDefaultConfig() {
        return siteConfigMapper.selectOne(new LambdaQueryWrapper<SysSiteConfig>()
            .eq(SysSiteConfig::getConfigCode, DEFAULT_CONFIG_CODE)
            .last("LIMIT 1"));
    }

    private SiteConfigVO toVO(SysSiteConfig config) {
        SiteConfigVO vo = new SiteConfigVO();
        if (config == null) {
            return vo;
        }
        vo.id = String.valueOf(config.getId());
        vo.homeLogoUrl = config.getFrontHomeLogoUrl();
        vo.homeLogoKey = config.getFrontHomeLogoKey();
        vo.viralSimpleAnalysisExample = config.getFrontViralSimpleAnalysisExample();
        vo.viralDeepAnalysisExample = config.getFrontViralDeepAnalysisExample();
        vo.originalScenarioPrompts = config.getFrontOriginalScenarioPrompts();
        vo.status = config.getStatus();
        vo.createdAt = config.getCreateTime() == null ? null : config.getCreateTime().toString();
        vo.updatedAt = config.getUpdateTime() == null ? null : config.getUpdateTime().toString();
        return vo;
    }

}
