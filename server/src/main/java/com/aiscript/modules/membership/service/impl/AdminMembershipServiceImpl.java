package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.membership.dto.AdminMembershipPlanCreateDTO;
import com.aiscript.modules.membership.dto.AdminMembershipPlanUpdateDTO;
import com.aiscript.modules.membership.dto.AdminMembershipSkuCreateDTO;
import com.aiscript.modules.membership.dto.AdminMembershipSkuUpdateDTO;
import com.aiscript.modules.membership.dto.AdminPlanBenefitCreateDTO;
import com.aiscript.modules.membership.dto.AdminPlanBenefitUpdateDTO;
import com.aiscript.modules.membership.dto.AdminPointAdjustDTO;
import com.aiscript.modules.membership.dto.AdminPointPackageCreateDTO;
import com.aiscript.modules.membership.dto.AdminPointPackageUpdateDTO;
import com.aiscript.modules.membership.dto.AdminPointCostItemDTO;
import com.aiscript.modules.membership.dto.AdminPointCostsUpdateDTO;
import com.aiscript.modules.membership.entity.AiMembershipBenefitDefinition;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.entity.AiMembershipPlanBenefit;
import com.aiscript.modules.membership.entity.AiMembershipPlanSku;
import com.aiscript.modules.membership.entity.AiPointPackage;
import com.aiscript.modules.membership.mapper.AiMembershipBenefitDefinitionMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanBenefitMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.mapper.AiPointPackageMapper;
import com.aiscript.modules.membership.mapper.AiUserSubscriptionMapper;
import com.aiscript.modules.membership.service.AdminMembershipService;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipPointService;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.vo.AdminSubscriptionVO;
import com.aiscript.modules.membership.vo.MembershipPlanVO;
import com.aiscript.modules.membership.vo.PointTransactionVO;
import com.aiscript.modules.membership.vo.PointPackageVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;

@Service
public class AdminMembershipServiceImpl implements AdminMembershipService {
    private static final Integer DEFAULT_TENANT_ID = 1;

    private final MembershipService membershipService;
    private final MembershipEntitlementService entitlementService;
    private final MembershipPointService pointService;
    private final AiMembershipPlanMapper planMapper;
    private final AiMembershipPlanSkuMapper skuMapper;
    private final AiMembershipBenefitDefinitionMapper benefitDefinitionMapper;
    private final AiMembershipPlanBenefitMapper planBenefitMapper;
    private final AiPointPackageMapper pointPackageMapper;
    private final AiUserSubscriptionMapper subscriptionMapper;

    public AdminMembershipServiceImpl(
        MembershipService membershipService,
        MembershipEntitlementService entitlementService,
        MembershipPointService pointService,
        AiMembershipPlanMapper planMapper,
        AiMembershipPlanSkuMapper skuMapper,
        AiMembershipBenefitDefinitionMapper benefitDefinitionMapper,
        AiMembershipPlanBenefitMapper planBenefitMapper,
        AiPointPackageMapper pointPackageMapper,
        AiUserSubscriptionMapper subscriptionMapper
    ) {
        this.membershipService = membershipService;
        this.entitlementService = entitlementService;
        this.pointService = pointService;
        this.planMapper = planMapper;
        this.skuMapper = skuMapper;
        this.benefitDefinitionMapper = benefitDefinitionMapper;
        this.planBenefitMapper = planBenefitMapper;
        this.pointPackageMapper = pointPackageMapper;
        this.subscriptionMapper = subscriptionMapper;
    }

    @Override
    public List<MembershipPlanVO> plans() {
        return membershipService.adminPlans();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MembershipPlanVO createPlan(AdminMembershipPlanCreateDTO dto) {
        String code = dto.getCode().trim();
        if (planMapper.selectOne(new LambdaQueryWrapper<AiMembershipPlan>()
            .eq(AiMembershipPlan::getPlanCode, code).last("LIMIT 1")) != null) {
            throw new BusinessException("会员套餐编码已存在");
        }
        AiMembershipPlan plan = new AiMembershipPlan();
        plan.setPlanCode(code);
        plan.setPlanName(dto.getName().trim());
        plan.setPlanLevel(dto.getLevel());
        plan.setIsFree(Boolean.TRUE.equals(dto.getFree()) ? 1 : 0);
        plan.setPeriodDays(dto.getPeriodDays());
        plan.setPrice(dto.getPrice());
        plan.setBenefitsJson("{}");
        plan.setDescription(dto.getDescription());
        plan.setDisplayOrder(dto.getDisplayOrder() == null ? 0 : dto.getDisplayOrder());
        plan.setStatus(dto.getStatus());
        planMapper.insert(plan);
        attachDefaultPointCosts(plan);
        attachDefaultWelcomePoints(plan);
        clearPlanEntitlementCaches(plan.getId().longValue());
        return planById(plan.getId().longValue());
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
        clearPlanEntitlementCaches(id);
        return planById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MembershipPlanVO createSku(Long planId, AdminMembershipSkuCreateDTO dto) {
        AiMembershipPlan plan = planMapper.selectById(Math.toIntExact(planId));
        if (plan == null) {
            throw new BusinessException("会员套餐不存在");
        }
        String code = dto.getCode().trim();
        if (skuMapper.selectOne(new LambdaQueryWrapper<AiMembershipPlanSku>()
            .eq(AiMembershipPlanSku::getSkuCode, code).last("LIMIT 1")) != null) {
            throw new BusinessException("会员 SKU 编码已存在");
        }
        AiMembershipPlanSku sku = new AiMembershipPlanSku();
        sku.setPlanId(planId);
        sku.setSkuCode(code);
        sku.setSkuName(dto.getName().trim());
        sku.setBillingMode("one_time");
        sku.setPeriodUnit(dto.getPeriodUnit().trim());
        sku.setPeriodCount(dto.getPeriodCount());
        sku.setPrice(dto.getPrice());
        sku.setOriginalPrice(dto.getOriginalPrice());
        sku.setRefundDays(dto.getRefundDays() == null ? 0 : dto.getRefundDays());
        sku.setDisplayOrder(dto.getDisplayOrder() == null ? 0 : dto.getDisplayOrder());
        sku.setStatus(dto.getStatus());
        skuMapper.insert(sku);
        clearPlanEntitlementCaches(planId);
        return planById(planId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MembershipPlanVO updateSku(Long id, AdminMembershipSkuUpdateDTO dto) {
        AiMembershipPlanSku sku = skuMapper.selectById(id);
        if (sku == null) {
            throw new BusinessException("会员 SKU 不存在");
        }
        sku.setSkuName(dto.getName().trim());
        sku.setBillingMode("one_time");
        sku.setPeriodUnit(dto.getPeriodUnit());
        sku.setPeriodCount(dto.getPeriodCount());
        sku.setPrice(dto.getPrice());
        sku.setOriginalPrice(dto.getOriginalPrice());
        sku.setRefundDays(dto.getRefundDays());
        sku.setDisplayOrder(dto.getDisplayOrder());
        sku.setStatus(dto.getStatus());
        skuMapper.updateById(sku);
        clearPlanEntitlementCaches(sku.getPlanId());
        return planById(sku.getPlanId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MembershipPlanVO createPlanBenefit(Long planId, AdminPlanBenefitCreateDTO dto) {
        AiMembershipPlan plan = planMapper.selectById(Math.toIntExact(planId));
        if (plan == null) {
            throw new BusinessException("会员套餐不存在");
        }
        AiMembershipBenefitDefinition definition = benefitDefinitionMapper.selectOne(
            new LambdaQueryWrapper<AiMembershipBenefitDefinition>()
                .eq(AiMembershipBenefitDefinition::getBenefitCode, dto.getCode().trim())
                .last("LIMIT 1")
        );
        if (definition == null) {
            throw new BusinessException("会员权益定义不存在");
        }
        AiMembershipPlanBenefit existing = planBenefitMapper.selectOne(
            new LambdaQueryWrapper<AiMembershipPlanBenefit>()
                .eq(AiMembershipPlanBenefit::getPlanId, planId)
                .eq(AiMembershipPlanBenefit::getBenefitId, definition.getId())
                .last("LIMIT 1")
        );
        if (existing != null) {
            throw new BusinessException("套餐已配置该权益");
        }
        String benefitValue = validateBenefitValue(definition, dto.getValue());
        AiMembershipPlanBenefit binding = new AiMembershipPlanBenefit();
        binding.setPlanId(planId);
        binding.setBenefitId(definition.getId());
        binding.setBenefitValue(benefitValue);
        binding.setEnabled(Boolean.FALSE.equals(dto.getEnabled()) ? 0 : 1);
        planBenefitMapper.insert(binding);
        clearPlanEntitlementCaches(planId);
        return planById(planId);
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
        binding.setBenefitValue(validateBenefitValue(definition, dto.getValue()));
        binding.setEnabled(Boolean.FALSE.equals(dto.getEnabled()) ? 0 : 1);
        planBenefitMapper.updateById(binding);
        clearPlanEntitlementCaches(planId);
        return planById(planId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<MembershipPlanVO> updatePointCosts(AdminPointCostsUpdateDTO dto) {
        for (AdminPointCostItemDTO item : dto.getItems()) {
            AiMembershipPlan plan = planMapper.selectById(Math.toIntExact(item.getPlanId()));
            if (plan == null) {
                throw new BusinessException("会员套餐不存在");
            }
            AiMembershipBenefitDefinition definition = benefitDefinitionMapper.selectOne(
                new LambdaQueryWrapper<AiMembershipBenefitDefinition>()
                    .eq(AiMembershipBenefitDefinition::getBenefitCode, item.getBenefitCode().trim())
                    .last("LIMIT 1")
            );
            if (definition == null || !definition.getBenefitCode().endsWith("_POINT_COST")) {
                throw new BusinessException("水滴消耗权益不存在：" + item.getBenefitCode());
            }
            AiMembershipPlanBenefit binding = planBenefitMapper.selectOne(
                new LambdaQueryWrapper<AiMembershipPlanBenefit>()
                    .eq(AiMembershipPlanBenefit::getPlanId, item.getPlanId())
                    .eq(AiMembershipPlanBenefit::getBenefitId, definition.getId())
                    .last("LIMIT 1")
            );
            if (binding == null) {
                binding = new AiMembershipPlanBenefit();
                binding.setPlanId(item.getPlanId());
                binding.setBenefitId(definition.getId());
                binding.setBenefitValue(String.valueOf(item.getValue()));
                binding.setEnabled(1);
                planBenefitMapper.insert(binding);
            } else {
                binding.setBenefitValue(String.valueOf(item.getValue()));
                binding.setEnabled(1);
                planBenefitMapper.updateById(binding);
            }
        }
        clearPlanEntitlementCachesAfterCommit(
            dto.getItems().stream().map(AdminPointCostItemDTO::getPlanId).collect(java.util.stream.Collectors.toSet())
        );
        return membershipService.adminPlans();
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
            throw new BusinessException("水滴调整数量不能为 0");
        }
        Integer userId;
        try {
            userId = Integer.valueOf(dto.getUserId());
        } catch (NumberFormatException exception) {
            throw new BusinessException("用户 ID 格式不正确");
        }
        String requestNo = "admin_point:" + operatorId + ":" + UUID.randomUUID().toString().replace("-", "");
        String remark = StringUtils.hasText(dto.getRemark()) ? dto.getRemark() : "后台人工调整水滴";
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

    @Override
    public List<PointPackageVO> pointPackages() {
        return pointPackageMapper.selectList(new LambdaQueryWrapper<AiPointPackage>()
            .orderByAsc(AiPointPackage::getDisplayOrder)
            .orderByAsc(AiPointPackage::getId)
        ).stream().map(this::toPointPackageVO).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PointPackageVO createPointPackage(AdminPointPackageCreateDTO dto) {
        String code = dto.getCode().trim();
        if (pointPackageMapper.selectOne(new LambdaQueryWrapper<AiPointPackage>()
            .eq(AiPointPackage::getPackageCode, code)
            .last("LIMIT 1")) != null) {
            throw new BusinessException("水滴包编码已存在");
        }
        AiPointPackage pointPackage = new AiPointPackage();
        pointPackage.setPackageCode(code);
        applyPointPackage(pointPackage, dto.getName(), dto.getPrice(), dto.getPoints(), dto.getDescription(), dto.getDisplayOrder(), dto.getStatus());
        pointPackageMapper.insert(pointPackage);
        return toPointPackageVO(pointPackage);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PointPackageVO updatePointPackage(Long id, AdminPointPackageUpdateDTO dto) {
        AiPointPackage pointPackage = pointPackageMapper.selectById(id);
        if (pointPackage == null) {
            throw new BusinessException("水滴包不存在");
        }
        applyPointPackage(pointPackage, dto.getName(), dto.getPrice(), dto.getPoints(), dto.getDescription(), dto.getDisplayOrder(), dto.getStatus());
        pointPackageMapper.updateById(pointPackage);
        return toPointPackageVO(pointPackage);
    }

    private void applyPointPackage(
        AiPointPackage pointPackage,
        String name,
        java.math.BigDecimal price,
        Long points,
        String description,
        Integer displayOrder,
        Integer status
    ) {
        pointPackage.setPackageName(name.trim());
        pointPackage.setPrice(price);
        pointPackage.setPoints(points);
        pointPackage.setDescription(description);
        pointPackage.setDisplayOrder(displayOrder == null ? 0 : displayOrder);
        pointPackage.setStatus(status);
    }

    private PointPackageVO toPointPackageVO(AiPointPackage pointPackage) {
        PointPackageVO vo = new PointPackageVO();
        vo.setId(String.valueOf(pointPackage.getId()));
        vo.setCode(pointPackage.getPackageCode());
        vo.setName(pointPackage.getPackageName());
        vo.setPrice(pointPackage.getPrice());
        vo.setPoints(pointPackage.getPoints());
        vo.setDescription(pointPackage.getDescription());
        vo.setDisplayOrder(pointPackage.getDisplayOrder());
        vo.setStatus(pointPackage.getStatus());
        return vo;
    }

    private MembershipPlanVO planById(Long id) {
        return membershipService.adminPlans().stream()
            .filter(item -> id.toString().equals(item.getId()))
            .findFirst()
            .orElseThrow(() -> new BusinessException("会员套餐不存在"));
    }

    private void attachDefaultPointCosts(AiMembershipPlan plan) {
        List<AiMembershipBenefitDefinition> definitions = benefitDefinitionMapper.selectList(
            new LambdaQueryWrapper<AiMembershipBenefitDefinition>()
                .eq(AiMembershipBenefitDefinition::getEnabled, 1)
        ).stream().filter(definition -> definition.getBenefitCode().endsWith("_POINT_COST")).toList();
        for (AiMembershipBenefitDefinition definition : definitions) {
            AiMembershipPlanBenefit binding = new AiMembershipPlanBenefit();
            binding.setPlanId(plan.getId().longValue());
            binding.setBenefitId(definition.getId());
            binding.setBenefitValue(defaultPointCost(definition.getBenefitCode()));
            binding.setEnabled(1);
            planBenefitMapper.insert(binding);
        }
    }

    private String defaultPointCost(String benefitCode) {
        return switch (benefitCode) {
            case "BRIEF_DETECT_POINT_COST", "VIRAL_SIMPLE_POINT_COST" -> "40";
            case "VIRAL_DEEP_POINT_COST" -> "80";
            case "SCRIPT_GENERATE_POINT_COST" -> "50";
            case "SCRIPT_POLISH_POINT_COST" -> "20";
            default -> "50";
        };
    }

    private void attachDefaultWelcomePoints(AiMembershipPlan plan) {
        if (plan.getIsFree() == null || plan.getIsFree() != 1) {
            return;
        }
        AiMembershipBenefitDefinition definition = benefitDefinitionMapper.selectOne(
            new LambdaQueryWrapper<AiMembershipBenefitDefinition>()
                .eq(AiMembershipBenefitDefinition::getBenefitCode, "NEW_USER_WELCOME_POINT")
                .eq(AiMembershipBenefitDefinition::getEnabled, 1)
                .last("LIMIT 1")
        );
        if (definition == null) {
            return;
        }
        AiMembershipPlanBenefit binding = new AiMembershipPlanBenefit();
        binding.setPlanId(plan.getId().longValue());
        binding.setBenefitId(definition.getId());
        binding.setBenefitValue("200");
        binding.setEnabled(1);
        planBenefitMapper.insert(binding);
    }

    private String validateBenefitValue(AiMembershipBenefitDefinition definition, String value) {
        String normalized = value == null ? "" : value.trim();
        if (!isWaterDropIntegerBenefit(definition.getBenefitCode())) {
            return normalized;
        }
        if (!normalized.matches("\\d+")) {
            throw new BusinessException("NEW_USER_WELCOME_POINT".equals(definition.getBenefitCode())
                ? "新用户初始水滴必须是非负整数"
                : "水滴消耗必须是非负整数");
        }
        try {
            long parsed = Long.parseLong(normalized);
            if (parsed > 1_000_000L) {
                throw new BusinessException("水滴数值不能超过1,000,000");
            }
        } catch (NumberFormatException exception) {
            throw new BusinessException("水滴数值过大");
        }
        return normalized;
    }

    private boolean isWaterDropIntegerBenefit(String benefitCode) {
        return benefitCode != null && (benefitCode.endsWith("_POINT_COST")
            || "NEW_USER_WELCOME_POINT".equals(benefitCode));
    }

    private void clearPlanEntitlementCaches(Long planId) {
        if (planId == null) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    doClearPlanEntitlementCaches(planId);
                }
            });
            return;
        }
        doClearPlanEntitlementCaches(planId);
    }

    private void doClearPlanEntitlementCaches(Long planId) {
        subscriptionMapper.selectList(new LambdaQueryWrapper<com.aiscript.modules.membership.entity.AiUserSubscription>()
            .eq(com.aiscript.modules.membership.entity.AiUserSubscription::getPlanId, planId)
            .in(com.aiscript.modules.membership.entity.AiUserSubscription::getStatus, "active", "canceling", "past_due")
        ).forEach(subscription -> entitlementService.clearEntitlementCache(
            subscription.getTenantId() == null ? null : Math.toIntExact(subscription.getTenantId()),
            Math.toIntExact(subscription.getUserId())
        ));
    }

    private void clearPlanEntitlementCachesAfterCommit(Set<Long> planIds) {
        Runnable clearCaches = () -> planIds.forEach(this::doClearPlanEntitlementCaches);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            clearCaches.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                clearCaches.run();
            }
        });
    }
}
