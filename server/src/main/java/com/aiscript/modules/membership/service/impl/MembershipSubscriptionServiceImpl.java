package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.entity.AiMembershipPlanSku;
import com.aiscript.modules.membership.entity.AiSubscriptionChangeRecord;
import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.mapper.AiSubscriptionChangeRecordMapper;
import com.aiscript.modules.membership.mapper.AiUserSubscriptionMapper;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.service.MembershipSubscriptionService;
import com.aiscript.modules.membership.vo.MembershipChangeQuoteVO;
import com.aiscript.modules.payment.entity.AiPaymentOrder;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MembershipSubscriptionServiceImpl implements MembershipSubscriptionService {
    private final AiMembershipPlanMapper planMapper;
    private final AiMembershipPlanSkuMapper skuMapper;
    private final AiUserSubscriptionMapper subscriptionMapper;
    private final AiSubscriptionChangeRecordMapper changeMapper;
    private final MembershipService membershipService;

    public MembershipSubscriptionServiceImpl(
        AiMembershipPlanMapper planMapper,
        AiMembershipPlanSkuMapper skuMapper,
        AiUserSubscriptionMapper subscriptionMapper,
        AiSubscriptionChangeRecordMapper changeMapper,
        MembershipService membershipService
    ) {
        this.planMapper = planMapper;
        this.skuMapper = skuMapper;
        this.subscriptionMapper = subscriptionMapper;
        this.changeMapper = changeMapper;
        this.membershipService = membershipService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MembershipChangeQuoteVO quote(Integer tenantId, Integer userId, Long skuId) {
        Target target = requireTarget(skuId);
        AiUserSubscription current = membershipService.ensureActiveSubscription(tenantId, userId);
        AiMembershipPlan currentPlan = planMapper.selectById(current.getPlanId());
        AiMembershipPlanSku currentSku = current.getSkuId() == null ? null : skuMapper.selectById(current.getSkuId());
        return buildQuote(current, currentPlan, currentSku, target.plan(), target.sku(), LocalDateTime.now());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AiUserSubscription fulfillPaidOrder(AiPaymentOrder order) {
        if (order == null || order.getUserId() == null || order.getSkuId() == null) {
            throw new BusinessException("会员订单缺少用户或SKU信息");
        }
        AiSubscriptionChangeRecord existing = findChangeByOrder(order.getOrderNo());
        if (existing != null && "effective".equals(existing.getStatus())) {
            return requireActiveSubscription(order.getTenantId(), order.getUserId());
        }

        membershipService.ensureActiveSubscription(order.getTenantId(), order.getUserId());
        AiUserSubscription subscription = subscriptionMapper.selectActiveByUserForUpdate(order.getUserId().longValue());
        if (subscription == null) {
            throw new BusinessException("用户有效订阅不存在");
        }
        existing = findChangeByOrder(order.getOrderNo());
        if (existing != null && "effective".equals(existing.getStatus())) {
            order.setSubscriptionId(subscription.getId());
            return subscription;
        }
        Target target = requireTarget(order.getSkuId());
        AiMembershipPlan currentPlan = planMapper.selectById(subscription.getPlanId());
        AiMembershipPlanSku currentSku = subscription.getSkuId() == null
            ? null
            : skuMapper.selectById(subscription.getSkuId());
        MembershipChangeQuoteVO quote = buildQuote(
            subscription, currentPlan, currentSku, target.plan(), target.sku(), LocalDateTime.now()
        );
        if ("downgrade".equals(quote.getChangeType())) {
            throw new BusinessException(ResultCode.CONFLICT, "降级无需支付，请使用到期降级接口");
        }
        if (order.getAmount() == null || order.getAmount().compareTo(quote.getPayableAmount()) != 0) {
            throw new BusinessException(ResultCode.CONFLICT, "会员订单金额与当前价格不一致");
        }

        LocalDateTime now = LocalDateTime.now();
        Long beforePlanId = subscription.getPlanId();
        Long beforeSkuId = subscription.getSkuId();
        if ("renewal".equals(quote.getChangeType())) {
            LocalDateTime base = subscription.getCurrentPeriodEnd() != null
                && subscription.getCurrentPeriodEnd().isAfter(now)
                ? subscription.getCurrentPeriodEnd()
                : now;
            subscription.setCurrentPeriodEnd(addPeriod(base, target.sku()));
        } else {
            subscription.setStartTime(now);
            subscription.setCurrentPeriodStart(now);
            subscription.setCurrentPeriodEnd(addPeriod(now, target.sku()));
            subscription.setBenefitAnchorTime(now);
        }
        subscription.setPlanId(target.plan().getId().longValue());
        subscription.setSkuId(target.sku().getId());
        subscription.setStatus("active");
        subscription.setAutoRenew(isAutoRenew(target.sku()) ? 1 : 0);
        subscription.setNextRenewTime(isAutoRenew(target.sku()) ? subscription.getCurrentPeriodEnd() : null);
        subscription.setCancelAtPeriodEnd(0);
        subscription.setCancelTime(null);
        subscription.setPendingPlanId(null);
        subscription.setPendingSkuId(null);
        subscription.setPendingEffectiveTime(null);
        subscription.setProvider(order.getProvider());
        subscription.setPlanSnapshotJson(order.getProductSnapshotJson());
        subscription.setSourceOrderNo(order.getOrderNo());
        subscriptionMapper.updateById(subscription);
        clearNullableChangeFields(subscription);

        order.setSubscriptionId(subscription.getId());
        recordChange(
            subscription,
            quote.getChangeType(),
            beforePlanId,
            beforeSkuId,
            target.plan().getId().longValue(),
            target.sku().getId(),
            quote,
            "effective",
            order.getOrderNo(),
            "renewal".equals(quote.getChangeType()) ? subscription.getCurrentPeriodStart() : now
        );
        return subscription;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AiUserSubscription scheduleDowngrade(Integer tenantId, Integer userId, Long skuId) {
        Target target = requireTarget(skuId);
        membershipService.ensureActiveSubscription(tenantId, userId);
        AiUserSubscription subscription = subscriptionMapper.selectActiveByUserForUpdate(userId.longValue());
        AiMembershipPlan currentPlan = planMapper.selectById(subscription.getPlanId());
        MembershipChangeQuoteVO quote = buildQuote(
            subscription,
            currentPlan,
            subscription.getSkuId() == null ? null : skuMapper.selectById(subscription.getSkuId()),
            target.plan(),
            target.sku(),
            LocalDateTime.now()
        );
        if (!"downgrade".equals(quote.getChangeType())) {
            throw new BusinessException("目标套餐不是降级套餐");
        }
        revokePendingRecords(subscription.getId());
        subscription.setPendingPlanId(target.plan().getId().longValue());
        subscription.setPendingSkuId(target.sku().getId());
        subscription.setPendingEffectiveTime(subscription.getCurrentPeriodEnd());
        subscriptionMapper.updateById(subscription);
        recordChange(
            subscription, "downgrade", subscription.getPlanId(), subscription.getSkuId(),
            target.plan().getId().longValue(), target.sku().getId(), quote,
            "pending", null, subscription.getCurrentPeriodEnd()
        );
        return subscription;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AiUserSubscription revokeScheduledDowngrade(Integer tenantId, Integer userId) {
        membershipService.ensureActiveSubscription(tenantId, userId);
        AiUserSubscription subscription = subscriptionMapper.selectActiveByUserForUpdate(userId.longValue());
        if (subscription == null || subscription.getPendingPlanId() == null) {
            throw new BusinessException("没有待生效的降级计划");
        }
        revokePendingRecords(subscription.getId());
        clearPendingChange(subscription);
        recordSimpleChange(subscription, "revoke_downgrade", "effective", LocalDateTime.now());
        return subscription;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AiUserSubscription cancelAtPeriodEnd(Integer tenantId, Integer userId) {
        membershipService.ensureActiveSubscription(tenantId, userId);
        AiUserSubscription subscription = subscriptionMapper.selectActiveByUserForUpdate(userId.longValue());
        if (subscription == null) {
            throw new BusinessException("用户有效订阅不存在");
        }
        subscription.setAutoRenew(0);
        subscription.setNextRenewTime(null);
        subscription.setCancelAtPeriodEnd(1);
        subscription.setCancelTime(LocalDateTime.now());
        subscription.setStatus("canceling");
        subscriptionMapper.updateById(subscription);
        subscriptionMapper.update(null, new LambdaUpdateWrapper<AiUserSubscription>()
            .eq(AiUserSubscription::getId, subscription.getId())
            .set(AiUserSubscription::getNextRenewTime, null));
        recordSimpleChange(subscription, "cancel", "effective", subscription.getCurrentPeriodEnd());
        return subscription;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void revokeByRefund(AiPaymentOrder order) {
        if (order == null || order.getUserId() == null) {
            return;
        }
        AiUserSubscription subscription = subscriptionMapper.selectActiveByUserForUpdate(
            order.getUserId().longValue()
        );
        if (subscription == null) {
            return;
        }
        boolean sameSubscription = order.getSubscriptionId() != null
            && order.getSubscriptionId().equals(subscription.getId());
        boolean sameSourceOrder = order.getOrderNo() != null
            && order.getOrderNo().equals(subscription.getSourceOrderNo());
        if (!sameSubscription && !sameSourceOrder) {
            return;
        }
        subscription.setStatus("revoked");
        subscription.setAutoRenew(0);
        subscription.setNextRenewTime(null);
        subscription.setCancelAtPeriodEnd(0);
        subscription.setCancelTime(LocalDateTime.now());
        subscription.setCurrentPeriodEnd(LocalDateTime.now());
        subscriptionMapper.updateById(subscription);
        subscriptionMapper.update(null, new LambdaUpdateWrapper<AiUserSubscription>()
            .eq(AiUserSubscription::getId, subscription.getId())
            .set(AiUserSubscription::getNextRenewTime, null)
            .set(AiUserSubscription::getPendingPlanId, null)
            .set(AiUserSubscription::getPendingSkuId, null)
            .set(AiUserSubscription::getPendingEffectiveTime, null));
        recordSimpleChange(subscription, "refund_revoke", "effective", LocalDateTime.now());
        membershipService.ensureFreeSubscription(order.getTenantId(), order.getUserId());
    }
    private MembershipChangeQuoteVO buildQuote(
        AiUserSubscription subscription,
        AiMembershipPlan currentPlan,
        AiMembershipPlanSku currentSku,
        AiMembershipPlan targetPlan,
        AiMembershipPlanSku targetSku,
        LocalDateTime now
    ) {
        int currentLevel = currentPlan == null || currentPlan.getPlanLevel() == null ? 0 : currentPlan.getPlanLevel();
        int targetLevel = targetPlan.getPlanLevel() == null ? 0 : targetPlan.getPlanLevel();
        String changeType;
        String effectiveType;
        LocalDateTime effectiveTime;
        BigDecimal credit = BigDecimal.ZERO;
        BigDecimal original = money(targetSku.getPrice());
        BigDecimal payable = original;

        if (targetLevel < currentLevel) {
            changeType = "downgrade";
            effectiveType = "next_period";
            effectiveTime = subscription.getCurrentPeriodEnd();
            payable = BigDecimal.ZERO;
        } else if (currentPlan == null || currentPlan.getIsFree() != null && currentPlan.getIsFree() == 1) {
            changeType = "first_purchase";
            effectiveType = "immediate";
            effectiveTime = now;
        } else if (targetPlan.getId().longValue() == subscription.getPlanId()
            && targetSku.getId().equals(subscription.getSkuId())) {
            changeType = "renewal";
            effectiveType = "next_period";
            effectiveTime = subscription.getCurrentPeriodEnd();
        } else if (targetLevel > currentLevel) {
            changeType = "upgrade";
            effectiveType = "immediate";
            effectiveTime = now;
            credit = calculateUnusedCredit(subscription, currentSku, now);
            payable = original.subtract(credit).max(new BigDecimal("0.01"));
        } else {
            changeType = "renewal";
            effectiveType = "next_period";
            effectiveTime = subscription.getCurrentPeriodEnd();
        }

        MembershipChangeQuoteVO quote = new MembershipChangeQuoteVO();
        quote.setChangeType(changeType);
        quote.setEffectiveType(effectiveType);
        quote.setSubscriptionId(String.valueOf(subscription.getId()));
        quote.setCurrentPlanId(String.valueOf(subscription.getPlanId()));
        quote.setCurrentSkuId(subscription.getSkuId() == null ? null : String.valueOf(subscription.getSkuId()));
        quote.setTargetPlanId(String.valueOf(targetPlan.getId()));
        quote.setTargetSkuId(String.valueOf(targetSku.getId()));
        quote.setOriginalAmount(original);
        quote.setCreditAmount(credit);
        quote.setPayableAmount(payable.setScale(2, RoundingMode.HALF_UP));
        quote.setEffectiveTime(effectiveTime == null ? null : effectiveTime.toString());
        return quote;
    }

    private BigDecimal calculateUnusedCredit(
        AiUserSubscription subscription,
        AiMembershipPlanSku currentSku,
        LocalDateTime now
    ) {
        if (currentSku == null || subscription.getCurrentPeriodStart() == null
            || subscription.getCurrentPeriodEnd() == null
            || !subscription.getCurrentPeriodEnd().isAfter(now)) {
            return BigDecimal.ZERO;
        }
        long totalSeconds = Math.max(1, Duration.between(
            subscription.getCurrentPeriodStart(), subscription.getCurrentPeriodEnd()
        ).getSeconds());
        long remainingSeconds = Math.max(0, Duration.between(now, subscription.getCurrentPeriodEnd()).getSeconds());
        return money(currentSku.getPrice())
            .multiply(BigDecimal.valueOf(remainingSeconds))
            .divide(BigDecimal.valueOf(totalSeconds), 2, RoundingMode.DOWN);
    }

    private Target requireTarget(Long skuId) {
        if (skuId == null) {
            throw new BusinessException("会员SKU不能为空");
        }
        AiMembershipPlanSku sku = skuMapper.selectById(skuId);
        if (sku == null || sku.getStatus() == null || sku.getStatus() != 1) {
            throw new BusinessException("会员SKU不存在或已下架");
        }
        AiMembershipPlan plan = planMapper.selectById(sku.getPlanId());
        if (plan == null || plan.getStatus() == null || plan.getStatus() != 1) {
            throw new BusinessException("会员套餐不存在或已下架");
        }
        return new Target(plan, sku);
    }

    private AiUserSubscription requireActiveSubscription(Integer tenantId, Integer userId) {
        membershipService.ensureActiveSubscription(tenantId, userId);
        AiUserSubscription subscription = subscriptionMapper.selectOne(new LambdaQueryWrapper<AiUserSubscription>()
            .eq(AiUserSubscription::getUserId, userId.longValue())
            .in(AiUserSubscription::getStatus, "active", "canceling", "past_due")
            .orderByDesc(AiUserSubscription::getId)
            .last("LIMIT 1"));
        if (subscription == null) {
            throw new BusinessException("用户有效订阅不存在");
        }
        return subscription;
    }

    private LocalDateTime addPeriod(LocalDateTime start, AiMembershipPlanSku sku) {
        int count = sku.getPeriodCount() == null || sku.getPeriodCount() <= 0 ? 1 : sku.getPeriodCount();
        String unit = sku.getPeriodUnit();
        if ("day".equals(unit)) {
            return start.plusDays(count);
        }
        if ("quarter".equals(unit)) {
            return start.plusMonths(3L * count);
        }
        if ("year".equals(unit)) {
            return start.plusYears(count);
        }
        return start.plusMonths(count);
    }

    private boolean isAutoRenew(AiMembershipPlanSku sku) {
        return "auto_renew".equalsIgnoreCase(sku.getBillingMode());
    }

    private BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private AiSubscriptionChangeRecord findChangeByOrder(String orderNo) {
        if (orderNo == null) {
            return null;
        }
        return changeMapper.selectOne(new LambdaQueryWrapper<AiSubscriptionChangeRecord>()
            .eq(AiSubscriptionChangeRecord::getSourceOrderNo, orderNo)
            .last("LIMIT 1"));
    }

    private void recordChange(
        AiUserSubscription subscription,
        String type,
        Long beforePlanId,
        Long beforeSkuId,
        Long afterPlanId,
        Long afterSkuId,
        MembershipChangeQuoteVO quote,
        String status,
        String sourceOrderNo,
        LocalDateTime effectiveTime
    ) {
        AiSubscriptionChangeRecord record = new AiSubscriptionChangeRecord();
        record.setTenantId(subscription.getTenantId());
        record.setSubscriptionId(subscription.getId());
        record.setUserId(subscription.getUserId());
        record.setChangeType(type);
        record.setBeforePlanId(beforePlanId);
        record.setBeforeSkuId(beforeSkuId);
        record.setAfterPlanId(afterPlanId);
        record.setAfterSkuId(afterSkuId);
        record.setOriginalAmount(quote.getOriginalAmount());
        record.setCreditAmount(quote.getCreditAmount());
        record.setPayableAmount(quote.getPayableAmount());
        record.setEffectiveType(quote.getEffectiveType());
        record.setEffectiveTime(effectiveTime);
        record.setSourceOrderNo(sourceOrderNo);
        record.setStatus(status);
        changeMapper.insert(record);
    }

    private void recordSimpleChange(
        AiUserSubscription subscription,
        String type,
        String status,
        LocalDateTime effectiveTime
    ) {
        MembershipChangeQuoteVO quote = new MembershipChangeQuoteVO();
        quote.setOriginalAmount(BigDecimal.ZERO);
        quote.setCreditAmount(BigDecimal.ZERO);
        quote.setPayableAmount(BigDecimal.ZERO);
        quote.setEffectiveType("next_period");
        recordChange(
            subscription, type, subscription.getPlanId(), subscription.getSkuId(),
            subscription.getPlanId(), subscription.getSkuId(), quote,
            status, null, effectiveTime
        );
    }

    private void revokePendingRecords(Long subscriptionId) {
        changeMapper.update(null, new LambdaUpdateWrapper<AiSubscriptionChangeRecord>()
            .eq(AiSubscriptionChangeRecord::getSubscriptionId, subscriptionId)
            .eq(AiSubscriptionChangeRecord::getChangeType, "downgrade")
            .eq(AiSubscriptionChangeRecord::getStatus, "pending")
            .set(AiSubscriptionChangeRecord::getStatus, "revoked"));
    }

    private void clearPendingChange(AiUserSubscription subscription) {
        subscriptionMapper.update(null, new LambdaUpdateWrapper<AiUserSubscription>()
            .eq(AiUserSubscription::getId, subscription.getId())
            .set(AiUserSubscription::getPendingPlanId, null)
            .set(AiUserSubscription::getPendingSkuId, null)
            .set(AiUserSubscription::getPendingEffectiveTime, null));
        subscription.setPendingPlanId(null);
        subscription.setPendingSkuId(null);
        subscription.setPendingEffectiveTime(null);
    }

    private void clearNullableChangeFields(AiUserSubscription subscription) {
        subscriptionMapper.update(null, new LambdaUpdateWrapper<AiUserSubscription>()
            .eq(AiUserSubscription::getId, subscription.getId())
            .set(AiUserSubscription::getNextRenewTime, subscription.getNextRenewTime())
            .set(AiUserSubscription::getCancelTime, null)
            .set(AiUserSubscription::getPendingPlanId, null)
            .set(AiUserSubscription::getPendingSkuId, null)
            .set(AiUserSubscription::getPendingEffectiveTime, null));
    }

    private record Target(AiMembershipPlan plan, AiMembershipPlanSku sku) {
    }
}