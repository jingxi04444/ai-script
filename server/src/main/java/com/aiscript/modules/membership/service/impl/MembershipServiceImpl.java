package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.entity.AiMembershipBenefitCycle;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.entity.AiMembershipPlanSku;
import com.aiscript.modules.membership.entity.AiPointPackage;
import com.aiscript.modules.membership.entity.AiSubscriptionChangeRecord;
import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.mapper.AiMembershipBenefitCycleMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanBenefitMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.mapper.AiPointPackageMapper;
import com.aiscript.modules.membership.mapper.AiSubscriptionChangeRecordMapper;
import com.aiscript.modules.membership.mapper.AiUserSubscriptionMapper;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.vo.MembershipBenefitVO;
import com.aiscript.modules.membership.vo.MembershipPlanCatalogRow;
import com.aiscript.modules.membership.vo.MembershipPlanSkuVO;
import com.aiscript.modules.membership.vo.MembershipPlanVO;
import com.aiscript.modules.membership.vo.PointPackageVO;
import com.aiscript.modules.membership.vo.UserMembershipVO;
import com.aiscript.modules.payment.service.PaymentService;
import com.aiscript.modules.notification.service.NotificationService;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MembershipServiceImpl implements MembershipService {
    private final AiMembershipPlanMapper planMapper;
    private final AiMembershipPlanBenefitMapper planBenefitMapper;
    private final AiMembershipPlanSkuMapper skuMapper;
    private final AiPointPackageMapper pointPackageMapper;
    private final AiUserSubscriptionMapper subscriptionMapper;
    private final AiSubscriptionChangeRecordMapper changeMapper;
    private final AiMembershipBenefitCycleMapper cycleMapper;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<PaymentService> paymentServiceProvider;
    private final StringRedisTemplate redisTemplate;
    private final NotificationService notificationService;

    public MembershipServiceImpl(
        AiMembershipPlanMapper planMapper,
        AiMembershipPlanBenefitMapper planBenefitMapper,
        AiMembershipPlanSkuMapper skuMapper,
        AiPointPackageMapper pointPackageMapper,
        AiUserSubscriptionMapper subscriptionMapper,
        AiSubscriptionChangeRecordMapper changeMapper,
        AiMembershipBenefitCycleMapper cycleMapper,
        ObjectMapper objectMapper,
        ObjectProvider<PaymentService> paymentServiceProvider,
        StringRedisTemplate redisTemplate,
        NotificationService notificationService
    ) {
        this.planMapper = planMapper;
        this.planBenefitMapper = planBenefitMapper;
        this.skuMapper = skuMapper;
        this.pointPackageMapper = pointPackageMapper;
        this.subscriptionMapper = subscriptionMapper;
        this.changeMapper = changeMapper;
        this.cycleMapper = cycleMapper;
        this.objectMapper = objectMapper;
        this.paymentServiceProvider = paymentServiceProvider;
        this.redisTemplate = redisTemplate;
        this.notificationService = notificationService;
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
    public List<PointPackageVO> pointPackages() {
        LoginUser user = currentLoginUser();
        long pointsPer10Yuan = resolvePointsPer10Yuan(user);
        if (pointsPer10Yuan <= 0) {
            return List.of();
        }
        return pointPackageMapper.selectList(new LambdaQueryWrapper<AiPointPackage>()
            .eq(AiPointPackage::getStatus, 1)
            .orderByAsc(AiPointPackage::getDisplayOrder)
            .orderByAsc(AiPointPackage::getId)
        ).stream().map(item -> toPointPackageVO(item, pointsPer10Yuan)).toList();
    }
    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserMembershipVO currentMembership() {
        LoginUser loginUser = currentLoginUser();
        LocalDateTime now = LocalDateTime.now();
        AiUserSubscription active = findActiveSubscription(loginUser.getUserId().longValue());
        if (active == null) {
            return null;
        }
        if (active.getCurrentPeriodEnd() == null || !active.getCurrentPeriodEnd().isAfter(now)) {
            active.setStatus("expired");
            active.setAutoRenew(0);
            active.setNextRenewTime(null);
            subscriptionMapper.updateById(active);
            clearEntitlementCache(active);
            return null;
        }
        AiMembershipBenefitCycle cycle = ensureCurrentCycle(active, now);
        AiMembershipPlan plan = planMapper.selectById(active.getPlanId());
        return toMembershipVO(active, cycle, plan);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserMembershipVO activateFreeTrial(Long skuId) {
        LoginUser loginUser = currentLoginUser();
        AiUserSubscription active = findActiveSubscription(loginUser.getUserId().longValue());
        LocalDateTime now = LocalDateTime.now();
        if (active != null && active.getCurrentPeriodEnd() != null && active.getCurrentPeriodEnd().isAfter(now)) {
            AiMembershipPlan activePlan = planMapper.selectById(active.getPlanId());
            if (activePlan == null || activePlan.getIsFree() == null || activePlan.getIsFree() != 1) {
                throw new BusinessException("当前已有生效中的会员套餐，无需开通免费体验");
            }
            return toMembershipVO(active, ensureCurrentCycle(active, now), activePlan);
        }
        if (active != null) {
            active.setStatus("expired");
            active.setAutoRenew(0);
            active.setNextRenewTime(null);
            subscriptionMapper.updateById(active);
            clearEntitlementCache(active);
        }
        AiUserSubscription latest = findLatestSubscription(loginUser.getUserId().longValue());
        if (isExpiredFreeTrial(latest, now)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "免费体验已到期，每个账号只能开通一次");
        }
        AiMembershipPlanSku freeSku = skuMapper.selectById(skuId);
        if (freeSku == null || freeSku.getStatus() == null || freeSku.getStatus() != 1) {
            throw new BusinessException("免费套餐订阅方案不存在或已下架");
        }
        AiMembershipPlan plan = planMapper.selectById(freeSku.getPlanId());
        if (plan == null || plan.getStatus() == null || plan.getStatus() != 1
            || plan.getIsFree() == null || plan.getIsFree() != 1) {
            throw new BusinessException("所选订阅方案不是可用的免费套餐");
        }
        AiUserSubscription subscription = createFreeSubscription(
            loginUser.getTenantId(), loginUser.getUserId(), now, plan, freeSku
        );
        return toMembershipVO(subscription, ensureCurrentCycle(subscription, now), plan);
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
            clearEntitlementCache(existing);
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
            clearEntitlementCache(existing);
        }

        AiUserSubscription latest = findLatestSubscription(userId.longValue());
        if (isExpiredFreeTrial(latest, now)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "免费体验已到期，请购买会员套餐");
        }

        AiMembershipPlan freePlan = planMapper.selectOne(new LambdaQueryWrapper<AiMembershipPlan>()
            .eq(AiMembershipPlan::getIsFree, 1)
            .eq(AiMembershipPlan::getStatus, 1)
            .orderByAsc(AiMembershipPlan::getDisplayOrder)
            .orderByAsc(AiMembershipPlan::getId)
            .last("LIMIT 1"));
        if (freePlan == null) {
            throw new BusinessException("免费会员套餐未配置");
        }
        AiMembershipPlanSku freeSku = skuMapper.selectOne(new LambdaQueryWrapper<AiMembershipPlanSku>()
            .eq(AiMembershipPlanSku::getPlanId, freePlan.getId())
            .eq(AiMembershipPlanSku::getStatus, 1)
            .orderByAsc(AiMembershipPlanSku::getDisplayOrder)
            .orderByAsc(AiMembershipPlanSku::getId)
            .last("LIMIT 1"));
        if (freeSku == null) {
            throw new BusinessException("免费会员套餐没有配置可用的订阅方案");
        }
        return createFreeSubscription(tenantId, userId, now, freePlan, freeSku);
    }

    private AiUserSubscription createFreeSubscription(
        Integer tenantId,
        Integer userId,
        LocalDateTime now,
        AiMembershipPlan freePlan,
        AiMembershipPlanSku freeSku
    ) {
        AiUserSubscription subscription = new AiUserSubscription();
        subscription.setTenantId(tenantId == null ? null : tenantId.longValue());
        subscription.setUserId(userId.longValue());
        subscription.setPlanId(freePlan.getId().longValue());
        subscription.setSkuId(freeSku.getId());
        subscription.setStatus("active");
        subscription.setAutoRenew(0);
        subscription.setStartTime(now);
        subscription.setCurrentPeriodStart(now);
        subscription.setCurrentPeriodEnd(addSkuPeriod(now, freeSku));
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

    private AiUserSubscription findLatestSubscription(Long userId) {
        return subscriptionMapper.selectOne(new LambdaQueryWrapper<AiUserSubscription>()
            .eq(AiUserSubscription::getUserId, userId)
            .orderByDesc(AiUserSubscription::getId)
            .last("LIMIT 1"));
    }

    private boolean isExpiredFreeTrial(AiUserSubscription subscription, LocalDateTime now) {
        if (subscription == null || subscription.getCurrentPeriodEnd() == null
            || subscription.getCurrentPeriodEnd().isAfter(now)) {
            return false;
        }
        AiMembershipPlan plan = planMapper.selectById(subscription.getPlanId());
        return plan != null && plan.getIsFree() != null && plan.getIsFree() == 1;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AiMembershipBenefitCycle ensureCurrentBenefitCycle(AiUserSubscription subscription) {
        return ensureCurrentCycle(subscription, LocalDateTime.now());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int processDueSubscriptionLifecycle() {
        LocalDateTime now = LocalDateTime.now();
        List<AiUserSubscription> due = subscriptionMapper.selectList(new LambdaQueryWrapper<AiUserSubscription>()
            .in(AiUserSubscription::getStatus, "active", "canceling", "past_due")
            .and(wrapper -> wrapper
                .le(AiUserSubscription::getPendingEffectiveTime, now)
                .or().le(AiUserSubscription::getCurrentPeriodEnd, now)
                .or().le(AiUserSubscription::getNextRenewTime, now))
            .last("LIMIT 200"));
        int processed = 0;
        for (AiUserSubscription subscription : due) {
            AiUserSubscription locked = subscriptionMapper.selectActiveByUserForUpdate(subscription.getUserId());
            if (locked == null || !subscription.getId().equals(locked.getId())) {
                continue;
            }
            boolean changed = false;
            if (locked.getPendingPlanId() != null && locked.getPendingSkuId() != null
                && (locked.getPendingEffectiveTime() == null || !locked.getPendingEffectiveTime().isAfter(now))) {
                applyScheduledChange(locked, now);
                ensureCurrentCycle(locked, now);
                clearEntitlementCache(locked);
                changed = true;
            } else if ("past_due".equals(locked.getStatus()) && locked.getGraceEndTime() != null
                && !locked.getGraceEndTime().isAfter(now)) {
                locked.setStatus("expired");
                locked.setAutoRenew(0);
                locked.setNextRenewTime(null);
                locked.setCancelAtPeriodEnd(0);
                subscriptionMapper.updateById(locked);
                createFreeSubscriptionIfAbsent(
                    locked.getTenantId() == null ? null : Math.toIntExact(locked.getTenantId()),
                    Math.toIntExact(locked.getUserId()), now
                );
                clearEntitlementCache(locked);
                changed = true;
            } else if (locked.getAutoRenew() != null && locked.getAutoRenew() == 1
                && locked.getNextRenewTime() != null && !locked.getNextRenewTime().isAfter(now)) {
                String idempotencyKey = "subscription_renewal:" + locked.getId() + ":" + locked.getNextRenewTime();
                try {
                    paymentServiceProvider.getObject().renewMembershipSubscription(
                        locked.getTenantId() == null ? null : Math.toIntExact(locked.getTenantId()),
                        Math.toIntExact(locked.getUserId()), locked.getId(), locked.getSkuId(),
                        locked.getNextRenewTime(), idempotencyKey
                    );
                } catch (BusinessException exception) {
                    LocalDateTime graceEnd = (locked.getCurrentPeriodEnd() == null ? now : locked.getCurrentPeriodEnd()).plusHours(72);
                    LocalDateTime retryAt = now.plusHours(1);
                    subscriptionMapper.update(null, new LambdaUpdateWrapper<AiUserSubscription>()
                        .eq(AiUserSubscription::getId, locked.getId())
                        .set(AiUserSubscription::getStatus, "past_due")
                        .set(AiUserSubscription::getNextRenewTime, retryAt.isBefore(graceEnd) ? retryAt : null)
                        .set(AiUserSubscription::getGraceEndTime, graceEnd));
                    clearEntitlementCache(locked);
                }
                changed = true;
            } else if (!"past_due".equals(locked.getStatus())
                && locked.getCurrentPeriodEnd() != null && !locked.getCurrentPeriodEnd().isAfter(now)) {
                locked.setStatus("expired");
                locked.setAutoRenew(0);
                locked.setNextRenewTime(null);
                subscriptionMapper.updateById(locked);
                subscriptionMapper.update(null, new LambdaUpdateWrapper<AiUserSubscription>()
                    .eq(AiUserSubscription::getId, locked.getId())
                    .set(AiUserSubscription::getNextRenewTime, null));
                createFreeSubscriptionIfAbsent(
                    locked.getTenantId() == null ? null : Math.toIntExact(locked.getTenantId()),
                    Math.toIntExact(locked.getUserId()),
                    now
                );
                clearEntitlementCache(locked);
                changed = true;
            }
            if (changed) {
                processed++;
            }
        }
        return processed;
    }

    @Override
    public int sendExpiryReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime reminderEnd = now.plusDays(7);
        List<AiUserSubscription> subscriptions = subscriptionMapper.selectList(
            new LambdaQueryWrapper<AiUserSubscription>()
                .in(AiUserSubscription::getStatus, "active", "canceling")
                .eq(AiUserSubscription::getAutoRenew, 0)
                .gt(AiUserSubscription::getCurrentPeriodEnd, now)
                .le(AiUserSubscription::getCurrentPeriodEnd, reminderEnd)
                .orderByAsc(AiUserSubscription::getCurrentPeriodEnd)
                .last("LIMIT 500")
        );
        int sent = 0;
        for (AiUserSubscription subscription : subscriptions) {
            long remainingDays = Math.max(0, ChronoUnit.DAYS.between(
                now.toLocalDate(), subscription.getCurrentPeriodEnd().toLocalDate()
            ));
            int reminderStage = remainingDays <= 1 ? 1 : remainingDays <= 3 ? 3 : 7;
            String expiryText = subscription.getCurrentPeriodEnd().format(
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            );
            String remainingText = remainingDays == 0 ? "今天" : "还有" + remainingDays + "天";
            boolean created = notificationService.sendOnce(
                subscription.getTenantId() == null ? null : Math.toIntExact(subscription.getTenantId()),
                Math.toIntExact(subscription.getUserId()),
                "system",
                "membership_expiry",
                subscription.getId() + ":" + subscription.getCurrentPeriodEnd() + ":" + reminderStage,
                "会员即将到期",
                "你的会员" + remainingText + "到期（" + expiryText + "）。请前往会员中心选择当前可用的支付方式，重新购买月卡、季卡或年卡。"
            );
            if (created) {
                sent++;
            }
        }
        return sent;
    }

    private AiUserSubscription createFreeSubscriptionIfAbsent(Integer tenantId, Integer userId, LocalDateTime now) {
        AiUserSubscription active = findActiveSubscription(userId.longValue());
        if (active != null && active.getCurrentPeriodEnd() != null && active.getCurrentPeriodEnd().isAfter(now)) {
            return active;
        }
        AiUserSubscription latest = findLatestSubscription(userId.longValue());
        if (isExpiredFreeTrial(latest, now)) {
            return latest;
        }
        AiMembershipPlan freePlan = planMapper.selectOne(new LambdaQueryWrapper<AiMembershipPlan>()
            .eq(AiMembershipPlan::getIsFree, 1)
            .eq(AiMembershipPlan::getStatus, 1)
            .orderByAsc(AiMembershipPlan::getDisplayOrder)
            .orderByAsc(AiMembershipPlan::getId)
            .last("LIMIT 1"));
        if (freePlan == null) {
            throw new BusinessException("免费会员套餐未配置");
        }
        AiMembershipPlanSku freeSku = skuMapper.selectOne(new LambdaQueryWrapper<AiMembershipPlanSku>()
            .eq(AiMembershipPlanSku::getPlanId, freePlan.getId())
            .eq(AiMembershipPlanSku::getStatus, 1)
            .orderByAsc(AiMembershipPlanSku::getDisplayOrder)
            .orderByAsc(AiMembershipPlanSku::getId)
            .last("LIMIT 1"));
        if (freeSku == null) {
            throw new BusinessException("免费会员套餐没有配置可用的订阅方案");
        }
        return createFreeSubscription(tenantId, userId, now, freePlan, freeSku);
    }

    private AiMembershipBenefitCycle ensureCurrentCycle(AiUserSubscription subscription, LocalDateTime now) {
        LocalDateTime anchor = normalizeDatabaseTime(subscription.getBenefitAnchorTime() == null
            ? subscription.getStartTime()
            : subscription.getBenefitAnchorTime());
        BenefitCycleBounds bounds = benefitCycleBounds(anchor, normalizeDatabaseTime(now));
        long monthOffset = bounds.monthOffset();
        LocalDateTime cycleStart = normalizeDatabaseTime(bounds.start());
        LocalDateTime cycleEnd = normalizeDatabaseTime(bounds.end());
        if (subscription.getCurrentPeriodEnd() != null && cycleEnd.isAfter(subscription.getCurrentPeriodEnd())) {
            cycleEnd = normalizeDatabaseTime(subscription.getCurrentPeriodEnd());
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
        cycleMapper.upsertCycle(cycle);
        AiMembershipBenefitCycle canonical = cycleMapper.selectOne(
            new LambdaQueryWrapper<AiMembershipBenefitCycle>()
                .eq(AiMembershipBenefitCycle::getSubscriptionId, subscription.getId())
                .eq(AiMembershipBenefitCycle::getCycleStart, cycleStart)
                .last("LIMIT 1")
        );
        if (canonical == null) {
            throw new BusinessException("会员权益周期创建失败");
        }
        return canonical;
    }

    static LocalDateTime normalizeDatabaseTime(LocalDateTime value) {
        return value == null ? null : value.truncatedTo(ChronoUnit.SECONDS);
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
        subscription.setAutoRenew(0);
        subscription.setCurrentPeriodStart(now);
        subscription.setCurrentPeriodEnd(addSkuPeriod(now, targetSku));
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

    private PointPackageVO toPointPackageVO(AiPointPackage pointPackage) {
        return toPointPackageVO(pointPackage, null);
    }

    private PointPackageVO toPointPackageVO(AiPointPackage pointPackage, Long pointsPer10Yuan) {
        PointPackageVO vo = new PointPackageVO();
        vo.setId(String.valueOf(pointPackage.getId()));
        vo.setCode(pointPackage.getPackageCode());
        vo.setName(pointPackage.getPackageName());
        vo.setPrice(pointPackage.getPrice());
        vo.setBasePoints(pointPackage.getPoints());
        vo.setPointsPer10Yuan(pointsPer10Yuan);
        vo.setPoints(pointsPer10Yuan == null
            ? pointPackage.getPoints()
            : calculatePackagePoints(pointPackage.getPoints(), pointsPer10Yuan));
        vo.setDescription(pointPackage.getDescription());
        vo.setDisplayOrder(pointPackage.getDisplayOrder());
        vo.setStatus(pointPackage.getStatus());
        return vo;
    }

    private long resolvePointsPer10Yuan(LoginUser user) {
        AiUserSubscription subscription = ensureActiveSubscription(user.getTenantId(), user.getUserId());
        return planBenefitMapper.selectActiveEntitlements(subscription.getPlanId()).stream()
            .filter(row -> "POINTS_PER_10_YUAN".equals(row.getBenefitCode()))
            .findFirst()
            .map(row -> parsePositiveLong(row.getBenefitValue()))
            .orElse(0L);
    }

    static long calculatePackagePoints(Long basePoints, long pointsPer10Yuan) {
        if (basePoints == null || basePoints <= 0 || pointsPer10Yuan <= 0) {
            return 0L;
        }
        return java.math.BigDecimal.valueOf(basePoints)
            .multiply(java.math.BigDecimal.valueOf(pointsPer10Yuan))
            .divide(java.math.BigDecimal.valueOf(500), 0, java.math.RoundingMode.DOWN)
            .longValueExact();
    }

    private long parsePositiveLong(String value) {
        try {
            return Math.max(0L, Long.parseLong(value));
        } catch (NumberFormatException exception) {
            return 0L;
        }
    }

    static BenefitCycleBounds benefitCycleBounds(LocalDateTime anchor, LocalDateTime now) {
        long offset = Math.max(0, ChronoUnit.MONTHS.between(
            anchor.toLocalDate().withDayOfMonth(1), now.toLocalDate().withDayOfMonth(1)
        ));
        LocalDateTime start = anchor.plusMonths(offset);
        while (offset > 0 && start.isAfter(now)) {
            start = anchor.plusMonths(--offset);
        }
        LocalDateTime end = anchor.plusMonths(offset + 1);
        while (!end.isAfter(now)) {
            start = end;
            end = anchor.plusMonths(++offset + 1);
        }
        return new BenefitCycleBounds(offset, start, end);
    }

    record BenefitCycleBounds(long monthOffset, LocalDateTime start, LocalDateTime end) { }

    private String format(LocalDateTime time) {
        return time == null ? null : time.toString();
    }

    private void clearEntitlementCache(AiUserSubscription subscription) {
        if (subscription == null || subscription.getUserId() == null) {
            return;
        }
        String key = "membership:entitlement:"
            + (subscription.getTenantId() == null ? "default" : Math.toIntExact(subscription.getTenantId()))
            + ":" + Math.toIntExact(subscription.getUserId());
        redisTemplate.delete(key);
    }

    private LoginUser currentLoginUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser;
        }
        throw new BusinessException(ResultCode.UNAUTHORIZED, "未登录");
    }
}
