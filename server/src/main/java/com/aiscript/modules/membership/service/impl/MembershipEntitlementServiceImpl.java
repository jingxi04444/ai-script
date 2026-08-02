package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.entity.AiBenefitUsageTransaction;
import com.aiscript.modules.membership.entity.AiMembershipBenefitCycle;
import com.aiscript.modules.membership.entity.AiUserBenefitUsage;
import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.mapper.AiBenefitUsageTransactionMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanBenefitMapper;
import com.aiscript.modules.membership.mapper.AiUserBenefitUsageMapper;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.vo.MembershipEntitlementRow;
import com.aiscript.modules.membership.vo.QuotaReservationVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.time.Duration;

@Service
public class MembershipEntitlementServiceImpl implements MembershipEntitlementService {
    private static final long UNLIMITED = -1L;
    private static final Duration ENTITLEMENT_CACHE_TTL = Duration.ofMinutes(10);
    private static final TypeReference<List<MembershipEntitlementRow>> ENTITLEMENT_ROWS_TYPE = new TypeReference<>() { };

    private final MembershipService membershipService;
    private final AiMembershipPlanBenefitMapper planBenefitMapper;
    private final AiUserBenefitUsageMapper usageMapper;
    private final AiBenefitUsageTransactionMapper usageTransactionMapper;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public MembershipEntitlementServiceImpl(
        MembershipService membershipService,
        AiMembershipPlanBenefitMapper planBenefitMapper,
        AiUserBenefitUsageMapper usageMapper,
        AiBenefitUsageTransactionMapper usageTransactionMapper,
        StringRedisTemplate redisTemplate,
        ObjectMapper objectMapper
    ) {
        this.membershipService = membershipService;
        this.planBenefitMapper = planBenefitMapper;
        this.usageMapper = usageMapper;
        this.usageTransactionMapper = usageTransactionMapper;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String getValue(Integer tenantId, Integer userId, String benefitCode) {
        return entitlement(tenantId, userId, benefitCode).getBenefitValue();
    }

    @Override
    public boolean hasFeature(Integer tenantId, Integer userId, String benefitCode) {
        MembershipEntitlementRow row = entitlement(tenantId, userId, benefitCode);
        return isEnforced(row) && Boolean.parseBoolean(row.getBenefitValue());
    }

    @Override
    public long getLimit(Integer tenantId, Integer userId, String benefitCode) {
        MembershipEntitlementRow row = entitlement(tenantId, userId, benefitCode);
        if (!isEnforced(row)) {
            return 0L;
        }
        return parseLimit(row.getBenefitValue(), benefitCode);
    }

    @Override
    public long getPointCost(Integer tenantId, Integer userId, String operationCode) {
        return getLimit(tenantId, userId, pointCostBenefitCode(operationCode));
    }

    @Override
    public void clearEntitlementCache(Integer tenantId, Integer userId) {
        if (userId == null) {
            return;
        }
        redisTemplate.delete(cacheKey(tenantId, userId));
    }

    @Override
    public void requireFeature(Integer tenantId, Integer userId, String benefitCode) {
        if (!hasFeature(tenantId, userId, benefitCode)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "当前会员套餐未开通该功能");
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QuotaReservationVO reserveQuota(
        Integer tenantId,
        Integer userId,
        String benefitCode,
        long amount,
        String requestNo,
        String bizType,
        Long bizId
    ) {
        if (userId == null || !StringUtils.hasText(benefitCode) || !StringUtils.hasText(requestNo) || amount <= 0) {
            throw new BusinessException("额度预占参数不完整");
        }
        AiBenefitUsageTransaction existing = usageTransactionMapper.selectByRequestNoForUpdate(requestNo);
        if (existing != null) {
            assertSameRequest(existing, userId.longValue(), benefitCode, amount);
            return toReservation(existing);
        }

        AiUserSubscription subscription = membershipService.ensureActiveSubscription(tenantId, userId);
        MembershipEntitlementRow entitlement = findEntitlement(subscription.getPlanId(), benefitCode);
        if (!isEnforced(entitlement)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "当前会员套餐未开通该额度");
        }
        long quotaTotal = parseLimit(entitlement.getBenefitValue(), benefitCode);
        AiMembershipBenefitCycle cycle = null;
        String scopeKey;
        String resetType = entitlement.getResetType();
        if ("membership_month".equals(resetType)) {
            cycle = membershipService.ensureCurrentBenefitCycle(subscription);
            scopeKey = "cycle:" + cycle.getId();
        } else if ("lifetime".equals(resetType)) {
            scopeKey = "lifetime";
        } else if ("none".equals(resetType)) {
            scopeKey = "active";
        } else {
            throw new BusinessException("该权益不是可消耗额度：" + benefitCode);
        }

        AiUserBenefitUsage usage = ensureUsage(
            subscription,
            cycle,
            benefitCode,
            resetType,
            scopeKey,
            quotaTotal
        );
        if (usageMapper.reserveQuota(usage.getId(), amount) == 0) {
            throw new BusinessException(ResultCode.CONFLICT, "当前周期额度不足");
        }

        AiBenefitUsageTransaction transaction = new AiBenefitUsageTransaction();
        transaction.setUsageId(usage.getId());
        transaction.setUserId(userId.longValue());
        transaction.setBenefitCode(benefitCode);
        transaction.setRequestNo(requestNo);
        transaction.setAmount(amount);
        transaction.setStatus("reserved");
        transaction.setBizType(bizType);
        transaction.setBizId(bizId);
        try {
            usageTransactionMapper.insert(transaction);
        } catch (DuplicateKeyException duplicate) {
            throw new BusinessException(ResultCode.CONFLICT, "额度请求正在处理中，请勿重复提交");
        }
        return toReservation(transaction);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QuotaReservationVO confirmQuota(String requestNo) {
        AiBenefitUsageTransaction transaction = lockedTransaction(requestNo);
        if ("confirmed".equals(transaction.getStatus())) {
            return toReservation(transaction);
        }
        if (!"reserved".equals(transaction.getStatus())) {
            throw new BusinessException(ResultCode.CONFLICT, "当前额度请求不能确认");
        }
        if (usageMapper.confirmQuota(transaction.getUsageId(), transaction.getAmount()) == 0) {
            throw new BusinessException(ResultCode.CONFLICT, "额度预占记录异常");
        }
        transaction.setStatus("confirmed");
        usageTransactionMapper.updateById(transaction);
        return toReservation(transaction);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QuotaReservationVO releaseQuota(String requestNo) {
        AiBenefitUsageTransaction transaction = lockedTransaction(requestNo);
        if ("released".equals(transaction.getStatus())) {
            return toReservation(transaction);
        }
        if (!"reserved".equals(transaction.getStatus())) {
            throw new BusinessException(ResultCode.CONFLICT, "当前额度请求不能释放");
        }
        if (usageMapper.releaseQuota(transaction.getUsageId(), transaction.getAmount()) == 0) {
            throw new BusinessException(ResultCode.CONFLICT, "额度预占记录异常");
        }
        transaction.setStatus("released");
        usageTransactionMapper.updateById(transaction);
        return toReservation(transaction);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QuotaReservationVO releaseConsumedQuota(String requestNo) {
        AiBenefitUsageTransaction transaction = lockedTransaction(requestNo);
        if ("released".equals(transaction.getStatus())) {
            return toReservation(transaction);
        }
        if (!"confirmed".equals(transaction.getStatus())) {
            throw new BusinessException(ResultCode.CONFLICT, "当前已使用额度不能释放");
        }
        if (usageMapper.releaseConsumedQuota(transaction.getUsageId(), transaction.getAmount()) == 0) {
            throw new BusinessException(ResultCode.CONFLICT, "已使用额度记录异常");
        }
        transaction.setStatus("released");
        usageTransactionMapper.updateById(transaction);
        return toReservation(transaction);
    }
    private MembershipEntitlementRow entitlement(Integer tenantId, Integer userId, String benefitCode) {
        if (userId == null || !StringUtils.hasText(benefitCode)) {
            throw new BusinessException("权益查询参数不完整");
        }
        AiUserSubscription subscription = membershipService.ensureActiveSubscription(tenantId, userId);
        return findUserEntitlement(tenantId, userId, subscription.getPlanId(), benefitCode);
    }

    private String pointCostBenefitCode(String operationCode) {
        if (!StringUtils.hasText(operationCode)) {
            throw new BusinessException("积分消耗操作编码不能为空");
        }
        return switch (operationCode) {
            case "brief_detect", "BRIEF_DETECT_POINT_COST" -> "BRIEF_DETECT_POINT_COST";
            case "viral_simple", "VIRAL_SIMPLE_POINT_COST" -> "VIRAL_SIMPLE_POINT_COST";
            case "viral_deep", "VIRAL_DEEP_POINT_COST" -> "VIRAL_DEEP_POINT_COST";
            default -> throw new BusinessException("积分消耗操作未配置：" + operationCode);
        };
    }

    private MembershipEntitlementRow findEntitlement(Long planId, String benefitCode) {
        List<MembershipEntitlementRow> rows = planBenefitMapper.selectActiveEntitlements(planId);
        return rows.stream()
            .filter(row -> benefitCode.equals(row.getBenefitCode()))
            .findFirst()
            .orElseThrow(() -> new BusinessException("会员权益未配置：" + benefitCode));
    }

    private MembershipEntitlementRow findUserEntitlement(Integer tenantId, Integer userId, Long planId, String benefitCode) {
        return getCachedEntitlements(tenantId, userId, planId).stream()
            .filter(row -> benefitCode.equals(row.getBenefitCode()))
            .findFirst()
            .orElseThrow(() -> new BusinessException("会员权益未配置：" + benefitCode));
    }

    private List<MembershipEntitlementRow> getCachedEntitlements(Integer tenantId, Integer userId, Long planId) {
        String key = cacheKey(tenantId, userId);
        String cached = redisTemplate.opsForValue().get(key);
        if (StringUtils.hasText(cached)) {
            try {
                return objectMapper.readValue(cached, ENTITLEMENT_ROWS_TYPE);
            } catch (Exception ignored) {
                redisTemplate.delete(key);
            }
        }
        List<MembershipEntitlementRow> rows = planBenefitMapper.selectActiveEntitlements(planId);
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(rows), ENTITLEMENT_CACHE_TTL);
        } catch (Exception ignored) {
            // Cache failures must not block entitlement checks.
        }
        return rows;
    }

    private String cacheKey(Integer tenantId, Integer userId) {
        return "membership:entitlement:" + (tenantId == null ? "default" : tenantId) + ":" + userId;
    }

    private AiUserBenefitUsage ensureUsage(
        AiUserSubscription subscription,
        AiMembershipBenefitCycle cycle,
        String benefitCode,
        String usageScope,
        String scopeKey,
        long quotaTotal
    ) {
        AiUserBenefitUsage usage = usageMapper.selectOne(new LambdaQueryWrapper<AiUserBenefitUsage>()
            .eq(AiUserBenefitUsage::getUserId, subscription.getUserId())
            .eq(AiUserBenefitUsage::getBenefitCode, benefitCode)
            .eq(AiUserBenefitUsage::getScopeKey, scopeKey)
            .last("LIMIT 1"));
        if (usage == null) {
            usage = new AiUserBenefitUsage();
            usage.setTenantId(subscription.getTenantId());
            usage.setCycleId(cycle == null ? null : cycle.getId());
            usage.setUserId(subscription.getUserId());
            usage.setBenefitCode(benefitCode);
            usage.setUsageScope(usageScope);
            usage.setScopeKey(scopeKey);
            usage.setQuotaTotal(quotaTotal);
            usage.setUsedAmount(0L);
            usage.setReservedAmount(0L);
            usage.setVersion(0);
            try {
                usageMapper.insert(usage);
                return usage;
            } catch (DuplicateKeyException ignored) {
                usage = usageMapper.selectOne(new LambdaQueryWrapper<AiUserBenefitUsage>()
                    .eq(AiUserBenefitUsage::getUserId, subscription.getUserId())
                    .eq(AiUserBenefitUsage::getBenefitCode, benefitCode)
                    .eq(AiUserBenefitUsage::getScopeKey, scopeKey)
                    .last("LIMIT 1"));
            }
        }
        if (usage == null) {
            throw new BusinessException("权益使用账户创建失败");
        }
        if (!Long.valueOf(quotaTotal).equals(usage.getQuotaTotal())) {
            usage.setQuotaTotal(quotaTotal);
            usageMapper.updateById(usage);
        }
        return usage;
    }

    private AiBenefitUsageTransaction lockedTransaction(String requestNo) {
        if (!StringUtils.hasText(requestNo)) {
            throw new BusinessException("额度请求号不能为空");
        }
        AiBenefitUsageTransaction transaction = usageTransactionMapper.selectByRequestNoForUpdate(requestNo);
        if (transaction == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "额度请求不存在");
        }
        return transaction;
    }

    private void assertSameRequest(
        AiBenefitUsageTransaction transaction,
        Long userId,
        String benefitCode,
        long amount
    ) {
        if (!userId.equals(transaction.getUserId())
            || !benefitCode.equals(transaction.getBenefitCode())
            || !Long.valueOf(amount).equals(transaction.getAmount())) {
            throw new BusinessException(ResultCode.CONFLICT, "额度请求号已被其他业务使用");
        }
    }

    private boolean isEnforced(MembershipEntitlementRow row) {
        return Boolean.TRUE.equals(row.getDefinitionEnabled())
            && Boolean.TRUE.equals(row.getPlanEnabled())
            && !Boolean.TRUE.equals(row.getPreviewOnly());
    }

    private long parseLimit(String value, String benefitCode) {
        if ("unlimited".equalsIgnoreCase(value)) {
            return UNLIMITED;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException exception) {
            throw new BusinessException("会员权益值不是有效整数：" + benefitCode);
        }
    }

    private QuotaReservationVO toReservation(AiBenefitUsageTransaction transaction) {
        return new QuotaReservationVO(
            transaction.getRequestNo(),
            transaction.getBenefitCode(),
            transaction.getAmount(),
            transaction.getStatus()
        );
    }
}
