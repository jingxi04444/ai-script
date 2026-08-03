package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.membership.dto.AdminTemplateCustomRequestUpdateDTO;
import com.aiscript.modules.membership.dto.TemplateCustomRequestCreateDTO;
import com.aiscript.modules.membership.entity.AiTemplateCustomRequest;
import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.mapper.AiTemplateCustomRequestMapper;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.service.TemplateCustomRequestService;
import com.aiscript.modules.membership.vo.TemplateCustomRequestVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TemplateCustomRequestServiceImpl implements TemplateCustomRequestService {
    private final AiTemplateCustomRequestMapper requestMapper;
    private final MembershipService membershipService;
    private final MembershipEntitlementService entitlementService;

    public TemplateCustomRequestServiceImpl(
        AiTemplateCustomRequestMapper requestMapper,
        MembershipService membershipService,
        MembershipEntitlementService entitlementService
    ) {
        this.requestMapper = requestMapper;
        this.membershipService = membershipService;
        this.entitlementService = entitlementService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public TemplateCustomRequestVO create(
        Integer tenantId,
        Integer userId,
        TemplateCustomRequestCreateDTO dto
    ) {
        entitlementService.requireFeature(tenantId, userId, "EXCLUSIVE_TEMPLATE_REQUEST");
        Long active = requestMapper.selectCount(new LambdaQueryWrapper<AiTemplateCustomRequest>()
            .eq(AiTemplateCustomRequest::getTenantId, tenantId)
            .eq(AiTemplateCustomRequest::getUserId, userId)
            .in(AiTemplateCustomRequest::getStatus, "pending", "processing"));
        if (active != null && active > 0) {
            throw new BusinessException(ResultCode.CONFLICT, "已有定制模板工单正在处理中，请勿重复提交");
        }
        AiUserSubscription subscription = membershipService.ensureActiveSubscription(tenantId, userId);
        AiTemplateCustomRequest request = new AiTemplateCustomRequest();
        request.setTenantId(tenantId);
        request.setUserId(userId);
        request.setPlanId(subscription.getPlanId());
        request.setTitle(dto.getTitle().trim());
        request.setRequirements(dto.getRequirements().trim());
        request.setContact(dto.getContact() == null ? null : dto.getContact().trim());
        request.setStatus("pending");
        requestMapper.insert(request);
        return toVO(request);
    }

    @Override
    public PageResult<TemplateCustomRequestVO> mine(
        Integer tenantId,
        Integer userId,
        PageQuery query
    ) {
        IPage<AiTemplateCustomRequest> page = requestMapper.selectPage(
            new Page<>(query.getPage(), query.getPageSize()),
            new LambdaQueryWrapper<AiTemplateCustomRequest>()
                .eq(AiTemplateCustomRequest::getTenantId, tenantId)
                .eq(AiTemplateCustomRequest::getUserId, userId)
                .orderByDesc(AiTemplateCustomRequest::getCreateTime)
        );
        return toPage(page);
    }

    @Override
    public PageResult<TemplateCustomRequestVO> adminPage(PageQuery query, String status) {
        LambdaQueryWrapper<AiTemplateCustomRequest> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(status != null && !status.isBlank(), AiTemplateCustomRequest::getStatus, status)
            .and(query.getKeyword() != null && !query.getKeyword().isBlank(), nested -> nested
                .like(AiTemplateCustomRequest::getTitle, query.getKeyword())
                .or().like(AiTemplateCustomRequest::getRequirements, query.getKeyword())
                .or().like(AiTemplateCustomRequest::getContact, query.getKeyword()))
            .orderByDesc(AiTemplateCustomRequest::getCreateTime);
        return toPage(requestMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public TemplateCustomRequestVO update(
        Long id,
        AdminTemplateCustomRequestUpdateDTO dto,
        Integer operatorId
    ) {
        AiTemplateCustomRequest request = requestMapper.selectById(id);
        if (request == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "定制模板工单不存在");
        }
        request.setStatus(dto.getStatus());
        request.setAdminRemark(dto.getAdminRemark());
        request.setHandledBy(operatorId);
        request.setHandledTime(LocalDateTime.now());
        requestMapper.updateById(request);
        return toVO(request);
    }

    private PageResult<TemplateCustomRequestVO> toPage(IPage<AiTemplateCustomRequest> page) {
        return new PageResult<>(page.getRecords().stream().map(this::toVO).toList(),
            page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    private TemplateCustomRequestVO toVO(AiTemplateCustomRequest request) {
        TemplateCustomRequestVO vo = new TemplateCustomRequestVO();
        vo.setId(String.valueOf(request.getId()));
        vo.setUserId(String.valueOf(request.getUserId()));
        vo.setPlanId(String.valueOf(request.getPlanId()));
        vo.setTitle(request.getTitle());
        vo.setRequirements(request.getRequirements());
        vo.setContact(request.getContact());
        vo.setStatus(request.getStatus());
        vo.setAdminRemark(request.getAdminRemark());
        vo.setHandledBy(request.getHandledBy() == null ? null : String.valueOf(request.getHandledBy()));
        vo.setHandledTime(request.getHandledTime() == null ? null : request.getHandledTime().toString());
        vo.setCreatedAt(request.getCreateTime() == null ? null : request.getCreateTime().toString());
        vo.setUpdatedAt(request.getUpdateTime() == null ? null : request.getUpdateTime().toString());
        return vo;
    }
}
