package com.aiscript.modules.system.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.system.convert.ProviderConfigConvert;
import com.aiscript.modules.system.dto.ProviderConfigSaveDTO;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import com.aiscript.modules.system.mapper.SysApiProviderConfigMapper;
import com.aiscript.modules.system.service.ProviderConfigService;
import com.aiscript.modules.system.vo.ProviderConfigVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ProviderConfigServiceImpl implements ProviderConfigService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private final SysApiProviderConfigMapper providerConfigMapper;
    private final SecretCipherService secretCipherService;

    public ProviderConfigServiceImpl(SysApiProviderConfigMapper providerConfigMapper, SecretCipherService secretCipherService) {
        this.providerConfigMapper = providerConfigMapper;
        this.secretCipherService = secretCipherService;
    }

    @Override
    public PageResult<ProviderConfigVO> page(PageQuery query, String providerType) {
        LambdaQueryWrapper<SysApiProviderConfig> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(providerType)) {
            wrapper.eq(SysApiProviderConfig::getProviderType, providerType);
        }
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(SysApiProviderConfig::getProviderName, query.getKeyword());
        }
        wrapper.orderByAsc(SysApiProviderConfig::getPriority).orderByDesc(SysApiProviderConfig::getCreateTime);
        IPage<SysApiProviderConfig> page = providerConfigMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        List<ProviderConfigVO> list = page.getRecords().stream().map(ProviderConfigConvert::toVO).toList();
        return new PageResult<>(list, page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProviderConfigVO save(Integer id, ProviderConfigSaveDTO dto) {
        SysApiProviderConfig entity = id == null ? new SysApiProviderConfig() : providerConfigMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("Provider配置不存在");
        }
        if (id == null) {
            entity.setTenantId(TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId());
        }
        entity.setProviderType(dto.getProviderType());
        entity.setProviderName(dto.getProviderName());
        entity.setPlatform(dto.getPlatform());
        entity.setEndpointUrl(dto.getEndpointUrl());
        if (StringUtils.hasText(dto.getApiKey())) {
            entity.setApiKeyEncrypted(secretCipherService.encrypt(dto.getApiKey()));
        }
        entity.setPriority(dto.getPriority() == null ? 100 : dto.getPriority());
        entity.setTimeoutMs(dto.getTimeoutMs() == null ? 8000 : dto.getTimeoutMs());
        entity.setRetryCount(dto.getRetryCount() == null ? 2 : dto.getRetryCount());
        entity.setConfigJson(dto.getConfigJson());
        entity.setStatus(dto.getStatus() == null ? 1 : dto.getStatus());
        if (id == null) {
            providerConfigMapper.insert(entity);
        } else {
            providerConfigMapper.updateById(entity);
        }
        return ProviderConfigConvert.toVO(entity);
    }

    @Override
    public void delete(Integer id) {
        providerConfigMapper.deleteById(id);
    }

    @Override
    public SysApiProviderConfig firstEnabled(String providerType) {
        return providerConfigMapper.selectList(new LambdaQueryWrapper<SysApiProviderConfig>()
                .eq(SysApiProviderConfig::getProviderType, providerType)
                .eq(SysApiProviderConfig::getStatus, 1)
                .orderByAsc(SysApiProviderConfig::getPriority)
                .orderByDesc(SysApiProviderConfig::getUpdateTime)
                .orderByDesc(SysApiProviderConfig::getId)
                .last("limit 1"))
            .stream()
            .findFirst()
            .orElse(null);
    }
}
