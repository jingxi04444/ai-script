package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.membership.dto.AdminMembershipPlanUpdateDTO;
import com.aiscript.modules.membership.dto.AdminMembershipSkuUpdateDTO;
import com.aiscript.modules.membership.dto.AdminPlanBenefitUpdateDTO;
import com.aiscript.modules.membership.dto.AdminPointAdjustDTO;
import com.aiscript.modules.membership.entity.AiMembershipBenefitDefinition;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.entity.AiMembershipPlanBenefit;
import com.aiscript.modules.membership.entity.AiMembershipPlanSku;
import com.aiscript.modules.membership.mapper.AiMembershipBenefitDefinitionMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanBenefitMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.mapper.AiUserSubscriptionMapper;
import com.aiscript.modules.membership.service.AdminMembershipService;
import com.aiscript.modules.membership.service.MembershipPointService;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.vo.AdminSubscriptionVO;
import com.aiscript.modules.membership.vo.MembershipPlanVO;
import com.aiscript.modules.membership.vo.PointTransactionVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AdminMembershipServiceImpl implements AdminMembershipService {
    private static final Integer DEFAULT_TENANT_ID = 1;

    private final MembershipService membershipService;
    private final MembershipPointService pointService;
    private final AiMembershipPlanMapper planMapper;
    private final AiMembershipPlanSkuMapper skuMapper;
    private final AiMembershipBenefitDefinitionMapper benefitDefinitionMapper;
    private final AiMembershipPlanBenefitMapper planBenefitMapper;
    private final AiUserSubscriptionMapper subscriptionMapper;

    public AdminMembershipServiceImpl(
        MembershipService membershipService,
        MembershipPointService pointService,
        AiMembershipPlanMapper planMapper,
        AiMembershipPlanSkuMapper skuMapper,
        AiMembershipBenefitDefinitionMapper benefitDefinitionMapper,
        AiMembershipPlanBenefitMapper planBenefitMapper,
        AiUserSubscriptionMapper subscriptionMapper
    ) {
        this.membershipService = membershipService;
        this.pointService = pointService;
        this.planMapper = planMapper;
        this.skuMapper = skuMapper;
        this.benefitDefinitionMapper = benefitDefinitionMapper;
        this.planBenefitMapper = planBenefitMapper;
        this.subscriptionMapper = subscriptionMapper;
    }

    @Override
    public List<MembershipPlanVO> plans() {
        return membershipService.adminPlans();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MembershipPlanVO updatePlan(Long id, AdminMembershipPlanUpdateDTO dto) {
        AiMembershipPlan plan = planMapper.selectById(Math.toIntExact(id));
        if (plan == null) {
            throw new BusinessException("会员套餐不存在");
        }
        plan.setPlanName(dto.getName().trim());
        plan.setDescription(dto.getDescription());
        plan.setPrice(dto.getPrice());
        plan.setPeriodDays(dto.getPeriodDays());
        plan.setDisplayOrder(dto.getDisplayOrder());
        plan.setStatus(dto.getStatus());
        planMapper.updateById(plan);
        return planById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MembershipPlanVO updateSku(Long id, AdminMembershipSkuUpdateDTO dto) {
        AiMembershipPlanSku sku = skuMapper.selectById(id);
        if (sku == null) {
            throw new BusinessException("会员 SKU 不存在");
        }
        sku.setSkuName(dto.getName().trim());
        sku.setBillingMode(dto.getBillingMode());
        sku.setPeriodUnit(dto.getPeriodUnit());
        sku.setPeriodCount(dto.getPeriodCount());
        sku.setPrice(dto.getPrice());
        sku.setOriginalPrice(dto.getOriginalPrice());
        sku.setRefundDays(dto.getRefundDays());
        sku.setDisplayOrder(dto.getDisplayOrder());
        sku.setStatus(dto.getStatus());
        skuMapper.updateById(sku);
        return planById(sku.getPlanId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MembershipPlanVO updatePlanBenefit(Long planId, String benefitCode, AdminPlanBenefitUpdateDTO dto) {
        AiMembershipBenefitDefinition definition = benefitDefinitionMapper.selectOne(
            new LambdaQueryWrapper<AiMembershipBenefitDefinition>()
                .eq(AiMembershipBenefitDefinition::getBenefitCode, benefitCode)
                .last("LIMIT 1")
        );
        if (definition == null) {
            throw new BusinessException("会员权益定义不存在");
        }
        AiMembershipPlanBenefit binding = planBenefitMapper.selectOne(
            new LambdaQueryWrapper<AiMembershipPlanBenefit>()
                .eq(AiMembershipPlanBenefit::getPlanId, planId)
                .eq(AiMembershipPlanBenefit::getBenefitId, definition.getId())
                .last("LIMIT 1")
        );
        if (binding == null) {
            throw new BusinessException("套餐未配置该权益");
        }
        binding.setBenefitValue(dto.getValue().trim());
        binding.setEnabled(Boolean.FALSE.equals(dto.getEnabled()) ? 0 : 1);
        planBenefitMapper.updateById(binding);
        return planById(planId);
    }

    @Override
    public PageResult<AdminSubscriptionVO> subscriptions(PageQuery query, String status) {
        long page = query.getPage();
        long pageSize = query.getPageSize();
        long total = subscriptionMapper.countAdminPage(query.getKeyword(), status);
        List<AdminSubscriptionVO> list = total == 0
            ? List.of()
            : subscriptionMapper.selectAdminPage(query.getKeyword(), status, (page - 1) * pageSize, pageSize);
        long pages = total == 0 ? 0 : (total + pageSize - 1) / pageSize;
        return new PageResult<>(list, total, page, pageSize, pages);
    }

    @Override
    public PointTransactionVO adjustPoints(AdminPointAdjustDTO dto, Integer operatorId) {
        if (dto.getChangePoints() == 0) {
            throw new BusinessException("积分调整数量不能为 0");
        }
        Integer userId;
        try {
            userId = Integer.valueOf(dto.getUserId());
        } catch (NumberFormatException exception) {
            throw new BusinessException("用户 ID 格式不正确");
        }
        String requestNo = "admin_point:" + operatorId + ":" + UUID.randomUUID().toString().replace("-", "");
        String remark = StringUtils.hasText(dto.getRemark()) ? dto.getRemark() : "后台人工调整积分";
        if (dto.getChangePoints() > 0) {
            return pointService.grantPoints(
                DEFAULT_TENANT_ID, userId, dto.getChangePoints(), "admin_adjust", requestNo,
                "admin_membership", operatorId == null ? null : operatorId.longValue(), null, remark
            );
        }
        return pointService.consumePoints(
            DEFAULT_TENANT_ID, userId, Math.abs(dto.getChangePoints()), requestNo,
            "admin_membership", operatorId == null ? null : operatorId.longValue(), remark
        );
    }

    private MembershipPlanVO planById(Long id) {
        return membershipService.adminPlans().stream()
            .filter(item -> id.toString().equals(item.getId()))
            .findFirst()
            .orElseThrow(() -> new BusinessException("会员套餐不存在"));
    }
}
