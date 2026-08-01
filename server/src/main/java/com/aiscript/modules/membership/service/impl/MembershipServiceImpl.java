package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.entity.AiMembershipBenefitCycle;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.entity.AiMembershipPlanSku;
import com.aiscript.modules.membership.entity.AiSubscriptionChangeRecord;
import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.mapper.AiMembershipBenefitCycleMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.mapper.AiSubscriptionChangeRecordMapper;
import com.aiscript.modules.membership.mapper.AiUserSubscriptionMapper;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.vo.MembershipBenefitVO;
import com.aiscript.modules.membership.vo.MembershipPlanCatalogRow;
import com.aiscript.modules.membership.vo.MembershipPlanSkuVO;
import com.aiscript.modules.membership.vo.MembershipPlanVO;
import com.aiscript.modules.membership.vo.UserMembershipVO;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MembershipServiceImpl implements MembershipService {
    private static final LocalDateTime FREE_SUBSCRIPTION_END = LocalDateTime.of(9999, 12, 31, 23, 59, 59);

    private final AiMembershipPlanMapper planMapper;
    private final AiMembershipPlanSkuMapper skuMapper;
    private final AiUserSubscriptionMapper subscriptionMapper;
    private final AiSubscriptionChangeRecordMapper changeMapper;
    private final AiMembershipBenefitCycleMapper cycleMapper;
    private final ObjectMapper objectMapper;

    public MembershipServiceImpl(
        AiMembershipPlanMapper planMapper,
        AiMembershipPlanSkuMapper skuMapper,
        AiUserSubscriptionMapper subscriptionMapper,
        AiSubscriptionChangeRecordMapper changeMapper,
        AiMembershipBenefitCycleMapper cycleMapper,
        ObjectMapper objectMapper
    ) {
        this.planMapper = planMapper;
        this.skuMapper = skuMapper;
        this.subscriptionMapper = subscriptionMapper;
        this.changeMapper = changeMapper;
        this.cycleMapper = cycleMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<MembershipPlanVO> plans() {
        return planMapper.selectPlanCatalog(false).stream().map(this::toPlanVO).toList();
    }

    @Override
    public List<MembershipPlanVO> adminPlans() {
        return planMapper.selectPlanCatalog(true).stream().map(this::toPlanVO).toList();
    }
    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserMembershipVO currentMembership() {
        LoginUser loginUser = currentLoginUser();
        AiUserSubscription subscription = ensureActiveSubscription(loginUser.getTenantId(), loginUser.getUserId());
        AiMembershipBenefitCycle cycle = ensureCurrentCycle(subscription, LocalDateTime.now());
        AiMembershipPlan plan = planMapper.selectById(subscription.getPlanId());
        return toMembershipVO(subscription, cycle, plan);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void ensureFreeSubscription(Integer tenantId, Integer userId) {
        if (userId == null) {
            throw new BusinessException("用户ID不能为空");
        }
        ensureActiveSubscription(tenantId, userId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AiUserSubscription ensureActiveSubscription(Integer tenantId, Integer userId) {
        LocalDateTime now = LocalDateTime.now();
        AiUserSubscription existing = findActiveSubscription(userId.longValue());
        if (existing != null && existing.getCurrentPeriodEnd() != null
            && existing.getCurrentPeriodEnd().isAfter(now)) {
            ensureCurrentCycle(existing, now);
            return existing;
        }
        if (existing != null && existing.getPendingPlanId() != null
            && existing.getPendingSkuId() != null
            && (existing.getPendingEffectiveTime() == null
                || !existing.getPendingEffectiveTime().isAfter(now))) {
            applyScheduledChange(existing, now);
            ensureCurrentCycle(existing, now);
            return existing;
        }
        if (existing != null) {
            existing.setStatus("expired");
            existing.setAutoRenew(0);
            existing.setNextRenewTime(null);
            subscriptionMapper.updateById(existing);
            subscriptionMapper.update(null, new LambdaUpdateWrapper<AiUserSubscription>()
                .eq(AiUserSubscription::getId, existing.getId())
                .set(AiUserSubscription::getNextRenewTime, null));
        }

        AiMembershipPlan freePlan = planMapper.selectOne(new LambdaQueryWrapper<AiMembershipPlan>()
            .eq(AiMembershipPlan::getPlanCode, "free")
            .eq(AiMembershipPlan::getStatus, 1)
            .last("LIMIT 1"));
        if (freePlan == null) {
            throw new BusinessException("免费会员套餐未配置");
        }
        AiMembershipPlanSku freeSku = skuMapper.selectOne(new LambdaQueryWrapper<AiMembershipPlanSku>()
            .eq(AiMembershipPlanSku::getPlanId, freePlan.getId())
            .eq(AiMembershipPlanSku::getSkuCode, "free_default")
            .eq(AiMembershipPlanSku::getStatus, 1)
            .last("LIMIT 1"));

        AiUserSubscription subscription = new AiUserSubscription();
        subscription.setTenantId(tenantId == null ? null : tenantId.longValue());
        subscription.setUserId(userId.longValue());
        subscription.setPlanId(freePlan.getId().longValue());
        subscription.setSkuId(freeSku == null ? null : freeSku.getId());
        subscription.setStatus("active");
        subscription.setAutoRenew(0);
        subscription.setStartTime(now);
        subscription.setCurrentPeriodStart(now);
        subscription.setCurrentPeriodEnd(FREE_SUBSCRIPTION_END);
        subscription.setBenefitAnchorTime(now);
        subscription.setCancelAtPeriodEnd(0);
        subscription.setPlanSnapshotJson(planSnapshot(freePlan.getId().longValue()));
        subscription.setVersion(0);
        try {
            subscriptionMapper.insert(subscription);
        } catch (DuplicateKeyException duplicate) {
            subscription = findActiveSubscription(userId.longValue());
            if (subscription == null) {
                throw duplicate;
            }
        }
        ensureCurrentCycle(subscription, now);
        return subscription;
    }

    private AiUserSubscription findActiveSubscription(Long userId) {
        return subscriptionMapper.selectOne(new LambdaQueryWrapper<AiUserSubscription>()
            .eq(AiUserSubscription::getUserId, userId)
            .in(AiUserSubscription::getStatus, "active", "canceling", "past_due")
            .orderByDesc(AiUserSubscription::getId)
            .last("LIMIT 1"));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AiMembershipBenefitCycle ensureCurrentBenefitCycle(AiUserSubscription subscription) {
        return ensureCurrentCycle(subscription, LocalDateTime.now());
    }

    private AiMembershipBenefitCycle ensureCurrentCycle(AiUserSubscription subscription, LocalDateTime now) {
        LocalDateTime anchor = subscription.getBenefitAnchorTime() == null
            ? subscription.getStartTime()
            : subscription.getBenefitAnchorTime();
        long monthOffset = Math.max(0, ChronoUnit.MONTHS.between(
            anchor.toLocalDate().withDayOfMonth(1),
            now.toLocalDate().withDayOfMonth(1)
        ));
        LocalDateTime cycleStart = anchor.plusMonths(monthOffset);
        if (cycleStart.isAfter(now)) {
            monthOffset = Math.max(0, monthOffset - 1);
            cycleStart = anchor.plusMonths(monthOffset);
        }
        while (!cycleStart.plusMonths(1).isAfter(now)) {
            monthOffset++;
            cycleStart = anchor.plusMonths(monthOffset);
        }
        LocalDateTime cycleEnd = cycleStart.plusMonths(1);
        if (subscription.getCurrentPeriodEnd() != null && cycleEnd.isAfter(subscription.getCurrentPeriodEnd())) {
            cycleEnd = subscription.getCurrentPeriodEnd();
        }

        AiMembershipBenefitCycle cycle = cycleMapper.selectOne(new LambdaQueryWrapper<AiMembershipBenefitCycle>()
            .eq(AiMembershipBenefitCycle::getSubscriptionId, subscription.getId())
            .eq(AiMembershipBenefitCycle::getCycleStart, cycleStart)
            .last("LIMIT 1"));
        if (cycle != null) {
            return cycle;
        }
        cycle = new AiMembershipBenefitCycle();
        cycle.setTenantId(subscription.getTenantId());
        cycle.setSubscriptionId(subscription.getId());
        cycle.setUserId(subscription.getUserId());
        cycle.setPlanId(subscription.getPlanId());
        cycle.setCycleNo(Math.toIntExact(monthOffset + 1));
        cycle.setCycleStart(cycleStart);
        cycle.setCycleEnd(cycleEnd);
        cycle.setStatus("active");
        cycle.setBenefitSnapshotJson(planSnapshot(subscription.getPlanId()));
        try {
            cycleMapper.insert(cycle);
            return cycle;
        } catch (DuplicateKeyException duplicate) {
            AiMembershipBenefitCycle concurrent = cycleMapper.selectOne(
                new LambdaQueryWrapper<AiMembershipBenefitCycle>()
                    .eq(AiMembershipBenefitCycle::getSubscriptionId, subscription.getId())
                    .eq(AiMembershipBenefitCycle::getCycleStart, cycleStart)
                    .last("LIMIT 1")
            );
            if (concurrent == null) {
                throw duplicate;
            }
            return concurrent;
        }
    }

    private void applyScheduledChange(AiUserSubscription subscription, LocalDateTime now) {
        AiMembershipPlan targetPlan = planMapper.selectById(subscription.getPendingPlanId());
        AiMembershipPlanSku targetSku = skuMapper.selectById(subscription.getPendingSkuId());
        if (targetPlan == null || targetPlan.getStatus() == null || targetPlan.getStatus() != 1
            || targetSku == null || targetSku.getStatus() == null || targetSku.getStatus() != 1) {
            throw new BusinessException("待生效的降级套餐或SKU已下架，请先处理订阅变更");
        }
        subscription.setPlanId(targetPlan.getId().longValue());
        subscription.setSkuId(targetSku.getId());
        subscription.setStatus("active");
        subscription.setAutoRenew("auto_renew".equalsIgnoreCase(targetSku.getBillingMode()) ? 1 : 0);
        subscription.setCurrentPeriodStart(now);
        subscription.setCurrentPeriodEnd(
            targetPlan.getIsFree() != null && targetPlan.getIsFree() == 1
                ? FREE_SUBSCRIPTION_END
                : addSkuPeriod(now, targetSku)
        );
        subscription.setBenefitAnchorTime(now);
        subscription.setNextRenewTime(
            subscription.getAutoRenew() == 1 ? subscription.getCurrentPeriodEnd() : null
        );
        subscription.setCancelAtPeriodEnd(0);
        subscription.setCancelTime(null);
        subscription.setPlanSnapshotJson(planSnapshot(targetPlan.getId().longValue()));
        subscriptionMapper.updateById(subscription);
        subscriptionMapper.update(null, new LambdaUpdateWrapper<AiUserSubscription>()
            .eq(AiUserSubscription::getId, subscription.getId())
            .set(AiUserSubscription::getNextRenewTime, subscription.getNextRenewTime())
            .set(AiUserSubscription::getCancelTime, null)
            .set(AiUserSubscription::getPendingPlanId, null)
            .set(AiUserSubscription::getPendingSkuId, null)
            .set(AiUserSubscription::getPendingEffectiveTime, null));
        changeMapper.update(null, new LambdaUpdateWrapper<AiSubscriptionChangeRecord>()
            .eq(AiSubscriptionChangeRecord::getSubscriptionId, subscription.getId())
            .eq(AiSubscriptionChangeRecord::getChangeType, "downgrade")
            .eq(AiSubscriptionChangeRecord::getStatus, "pending")
            .set(AiSubscriptionChangeRecord::getStatus, "effective")
            .set(AiSubscriptionChangeRecord::getEffectiveTime, now));
        subscription.setPendingPlanId(null);
        subscription.setPendingSkuId(null);
        subscription.setPendingEffectiveTime(null);
    }

    private LocalDateTime addSkuPeriod(LocalDateTime start, AiMembershipPlanSku sku) {
        int count = sku.getPeriodCount() == null || sku.getPeriodCount() <= 0 ? 1 : sku.getPeriodCount();
        if ("day".equals(sku.getPeriodUnit())) {
            return start.plusDays(count);
        }
        if ("quarter".equals(sku.getPeriodUnit())) {
            return start.plusMonths(3L * count);
        }
        if ("year".equals(sku.getPeriodUnit())) {
            return start.plusYears(count);
        }
        return start.plusMonths(count);
    }
    private String planSnapshot(Long planId) {
        MembershipPlanVO plan = planMapper.selectPlanCatalog(false).stream()
            .filter(item -> planId.equals(item.getId()))
            .findFirst()
            .map(this::toPlanVO)
            .orElseThrow(() -> new BusinessException("会员套餐不存在或已下架"));
        try {
            return objectMapper.writeValueAsString(plan);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("会员套餐快照生成失败");
        }
    }

    private MembershipPlanVO toPlanVO(MembershipPlanCatalogRow row) {
        MembershipPlanVO vo = new MembershipPlanVO();
        vo.setId(String.valueOf(row.getId()));
        vo.setCode(row.getCode());
        vo.setName(row.getName());
        vo.setLevel(row.getLevel());
        vo.setFree(row.getFree());
        vo.setDescription(row.getDescription());
        vo.setDisplayOrder(row.getDisplayOrder());
        vo.setStatus(row.getStatus());
        vo.setPrice(row.getPrice());
        vo.setPeriodDays(row.getPeriodDays());

        List<MembershipPlanSkuVO> skus = parseList(row.getSkusJson(), MembershipPlanSkuVO.class);
        skus.sort(Comparator.comparing(
            MembershipPlanSkuVO::getDisplayOrder,
            Comparator.nullsLast(Integer::compareTo)
        ));
        vo.setSkus(skus);

        List<MembershipBenefitVO> benefits = parseList(row.getBenefitsJson(), MembershipBenefitVO.class);
        benefits.sort(Comparator.comparing(
            MembershipBenefitVO::getDisplayOrder,
            Comparator.nullsLast(Integer::compareTo)
        ));
        vo.setBenefits(benefits);
        return vo;
    }

    private <T> List<T> parseList(String json, Class<T> itemType) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(
                json,
                objectMapper.getTypeFactory().constructCollectionType(List.class, itemType)
            );
        } catch (JsonProcessingException exception) {
            throw new BusinessException("会员套餐配置解析失败");
        }
    }

    private UserMembershipVO toMembershipVO(
        AiUserSubscription subscription,
        AiMembershipBenefitCycle cycle,
        AiMembershipPlan plan
    ) {
        UserMembershipVO vo = new UserMembershipVO();
        vo.setId(String.valueOf(subscription.getId()));
        vo.setUserId(String.valueOf(subscription.getUserId()));
        vo.setPlanId(String.valueOf(subscription.getPlanId()));
        vo.setSkuId(subscription.getSkuId() == null ? null : String.valueOf(subscription.getSkuId()));
        vo.setPlanCode(plan == null ? null : plan.getPlanCode());
        vo.setPlanName(plan == null ? null : plan.getPlanName());
        vo.setStatus(subscription.getStatus());
        vo.setAutoRenew(subscription.getAutoRenew() != null && subscription.getAutoRenew() == 1);
        vo.setCancelAtPeriodEnd(subscription.getCancelAtPeriodEnd() != null && subscription.getCancelAtPeriodEnd() == 1);
        vo.setStartTime(format(subscription.getStartTime()));
        vo.setCurrentPeriodStart(format(subscription.getCurrentPeriodStart()));
        vo.setCurrentPeriodEnd(format(subscription.getCurrentPeriodEnd()));
        vo.setExpireTime(format(subscription.getCurrentPeriodEnd()));
        vo.setBenefitCycleStart(cycle == null ? null : format(cycle.getCycleStart()));
        vo.setBenefitCycleEnd(cycle == null ? null : format(cycle.getCycleEnd()));
        vo.setPendingPlanId(subscription.getPendingPlanId() == null ? null : String.valueOf(subscription.getPendingPlanId()));
        vo.setPendingSkuId(subscription.getPendingSkuId() == null ? null : String.valueOf(subscription.getPendingSkuId()));
        vo.setPendingEffectiveTime(format(subscription.getPendingEffectiveTime()));
        return vo;
    }

    private String format(LocalDateTime time) {
        return time == null ? null : time.toString();
    }

    private LoginUser currentLoginUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser;
        }
        throw new BusinessException(ResultCode.UNAUTHORIZED, "未登录");
    }
}
