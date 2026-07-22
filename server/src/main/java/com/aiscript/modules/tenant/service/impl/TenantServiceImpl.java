package com.aiscript.modules.tenant.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.tenant.dto.TenantSaveDTO;
import com.aiscript.modules.tenant.entity.SysTenant;
import com.aiscript.modules.tenant.mapper.SysTenantMapper;
import com.aiscript.modules.tenant.service.TenantService;
import com.aiscript.modules.tenant.vo.TenantVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class TenantServiceImpl implements TenantService {
    private final SysTenantMapper tenantMapper;

    public TenantServiceImpl(SysTenantMapper tenantMapper) {
        this.tenantMapper = tenantMapper;
    }

    @Override
    public PageResult<TenantVO> page(PageQuery query, Integer status) {
        LambdaQueryWrapper<SysTenant> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(SysTenant::getTenantName, query.getKeyword()).or().like(SysTenant::getTenantCode, query.getKeyword());
        }
        if (status != null) {
            wrapper.eq(SysTenant::getStatus, status);
        }
        wrapper.orderByDesc(SysTenant::getUpdateTime);
        IPage<SysTenant> page = tenantMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    public TenantVO getById(Integer id) {
        SysTenant tenant = tenantMapper.selectById(id);
        if (tenant == null) {
            throw new BusinessException("租户不存在");
        }
        return toVO(tenant);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public TenantVO save(Integer id, TenantSaveDTO dto) {
        SysTenant tenant = id == null ? new SysTenant() : tenantMapper.selectById(id);
        if (tenant == null) {
            throw new BusinessException("租户不存在");
        }
        tenant.setTenantName(dto.tenantName);
        tenant.setTenantCode(dto.tenantCode);
        tenant.setContactName(dto.contactName);
        tenant.setContactPhone(dto.contactPhone);
        tenant.setContactEmail(dto.contactEmail);
        tenant.setDomain(dto.domain);
        tenant.setLogoUrl(dto.logoUrl);
        tenant.setThemeKey(StringUtils.hasText(dto.themeKey) ? dto.themeKey : "default");
        tenant.setStatus(dto.status == null ? 1 : dto.status);
        tenant.setPlanCode(StringUtils.hasText(dto.planCode) ? dto.planCode : "standard");
        tenant.setStorageQuotaBytes(dto.storageQuotaBytes == null ? 0L : dto.storageQuotaBytes);
        if (id == null) {
            tenantMapper.insert(tenant);
        } else {
            tenantMapper.updateById(tenant);
        }
        return toVO(tenant);
    }

    @Override
    public void delete(Integer id) {
        tenantMapper.deleteById(id);
    }

    private TenantVO toVO(SysTenant tenant) {
        TenantVO vo = new TenantVO();
        vo.id = String.valueOf(tenant.getId());
        vo.tenantName = tenant.getTenantName();
        vo.tenantCode = tenant.getTenantCode();
        vo.contactName = tenant.getContactName();
        vo.contactPhone = tenant.getContactPhone();
        vo.contactEmail = tenant.getContactEmail();
        vo.domain = tenant.getDomain();
        vo.logoUrl = tenant.getLogoUrl();
        vo.themeKey = tenant.getThemeKey();
        vo.status = tenant.getStatus();
        vo.planCode = tenant.getPlanCode();
        vo.storageQuotaBytes = tenant.getStorageQuotaBytes();
        vo.createdAt = tenant.getCreateTime() == null ? null : tenant.getCreateTime().toString();
        vo.updatedAt = tenant.getUpdateTime() == null ? null : tenant.getUpdateTime().toString();
        return vo;
    }
}
