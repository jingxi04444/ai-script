package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.membership.entity.AiDailyPointReward;
import com.aiscript.modules.membership.entity.AiPointAccount;
import com.aiscript.modules.membership.entity.AiPointTransaction;
import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.mapper.AiDailyPointRewardMapper;
import com.aiscript.modules.membership.mapper.AiPointAccountMapper;
import com.aiscript.modules.membership.mapper.AiPointTransactionMapper;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipPointService;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.vo.DailyPointRewardVO;
import com.aiscript.modules.membership.vo.PointAccountVO;
import com.aiscript.modules.membership.vo.PointTransactionVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.time.LocalDate;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MembershipPointServiceImpl implements MembershipPointService {
    private static final String DAILY_REWARD_BENEFIT = "DAILY_LOGIN_POINT";

    private final AiPointAccountMapper accountMapper;
    private final AiPointTransactionMapper transactionMapper;
    private final AiDailyPointRewardMapper dailyRewardMapper;
    private final MembershipEntitlementService entitlementService;
    private final MembershipService membershipService;

    public MembershipPointServiceImpl(
        AiPointAccountMapper accountMapper,
        AiPointTransactionMapper transactionMapper,
        AiDailyPointRewardMapper dailyRewardMapper,
        MembershipEntitlementService entitlementService,
        MembershipService membershipService
    ) {
        this.accountMapper = accountMapper;
        this.transactionMapper = transactionMapper;
        this.dailyRewardMapper = dailyRewardMapper;
        this.entitlementService = entitlementService;
        this.membershipService = membershipService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PointAccountVO account(Integer tenantId, Integer userId) {
        return toAccountVO(ensureAccount(tenantId, userId));
    }

    @Override
    public PageResult<PointTransactionVO> transactions(Integer userId, PageQuery query) {
        if (userId == null) {
            throw new BusinessException("用户ID不能为空");
        }
        IPage<AiPointTransaction> page = transactionMapper.selectPage(
            new Page<>(query.getPage(), query.getPageSize()),
            new LambdaQueryWrapper<AiPointTransaction>()
                .eq(AiPointTransaction::getUserId, userId.longValue())
                .orderByDesc(AiPointTransaction::getCreateTime)
        );
        return new PageResult<>(
            page.getRecords().stream().map(this::toTransactionVO).toList(),
            page.getTotal(),
            page.getCurrent(),
            page.getSize(),
            page.getPages()
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PointTransactionVO grantPoints(
        Integer tenantId,
        Integer userId,
        long points,
        String transactionType,
        String requestNo,
        String bizType,
        Long bizId,
        String sourceOrderNo,
        String remark
    ) {
        validateChange(userId, points, requestNo);
        AiPointTransaction transaction = beginTransaction(
            tenantId, userId, points, transactionType, requestNo,
            bizType, bizId, sourceOrderNo, remark
        );
        if (isCompleted(transaction)) {
            return toTransactionVO(transaction);
        }
        AiPointAccount account = lockedAccount(tenantId, userId);
        if (accountMapper.addPoints(account.getId(), points) == 0) {
            throw new BusinessException("积分入账失败");
        }
        account = accountMapper.selectByUserForUpdate(userId.longValue());
        transaction.setAccountId(account.getId());
        transaction.setBalanceAfter(account.getAvailablePoints());
        transactionMapper.updateById(transaction);
        return toTransactionVO(transaction);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PointTransactionVO consumePoints(
        Integer tenantId,
        Integer userId,
        long points,
        String requestNo,
        String bizType,
        Long bizId,
        String remark
    ) {
        validateChange(userId, points, requestNo);
        AiPointTransaction transaction = beginTransaction(
            tenantId, userId, -points, "consume", requestNo,
            bizType, bizId, null, remark
        );
        if (isCompleted(transaction)) {
            return toTransactionVO(transaction);
        }
        AiPointAccount account = lockedAccount(tenantId, userId);
        if (accountMapper.consumePoints(account.getId(), points) == 0) {
            throw new BusinessException(ResultCode.CONFLICT, "积分余额不足");
        }
        account = accountMapper.selectByUserForUpdate(userId.longValue());
        transaction.setAccountId(account.getId());
        transaction.setBalanceAfter(account.getAvailablePoints());
        transactionMapper.updateById(transaction);
        return toTransactionVO(transaction);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DailyPointRewardVO claimDailyReward(Integer tenantId, Integer userId) {
        if (userId == null) {
            throw new BusinessException("用户ID不能为空");
        }
        LocalDate today = LocalDate.now();
        AiDailyPointReward existing = findDailyReward(userId, today);
        if (existing != null) {
            return dailyRewardVO(existing, account(tenantId, userId).getAvailablePoints(), true);
        }

        AiUserSubscription subscription = membershipService.ensureActiveSubscription(tenantId, userId);
        long rewardPoints = entitlementService.getLimit(tenantId, userId, DAILY_REWARD_BENEFIT);
        if (rewardPoints <= 0) {
            throw new BusinessException("当前会员等级没有每日登录积分奖励");
        }

        AiDailyPointReward reward = new AiDailyPointReward();
        reward.setTenantId(tenantId == null ? null : tenantId.longValue());
        reward.setUserId(userId.longValue());
        reward.setRewardDate(today);
        reward.setPlanId(subscription.getPlanId());
        reward.setRewardPoints(rewardPoints);
        reward.setTransactionId(0L);
        try {
            dailyRewardMapper.insert(reward);
        } catch (DuplicateKeyException duplicate) {
            AiDailyPointReward concurrent = findDailyReward(userId, today);
            if (concurrent == null) {
                throw duplicate;
            }
            return dailyRewardVO(concurrent, account(tenantId, userId).getAvailablePoints(), true);
        }

        String requestNo = "daily_login:" + userId + ":" + today;
        PointTransactionVO transaction = grantPoints(
            tenantId, userId, rewardPoints, "reward", requestNo,
            "daily_login", reward.getId(), null, "每日登录积分奖励"
        );
        reward.setTransactionId(Long.parseLong(transaction.getId()));
        dailyRewardMapper.updateById(reward);
        return dailyRewardVO(reward, transaction.getBalanceAfter(), false);
    }

    private AiDailyPointReward findDailyReward(Integer userId, LocalDate date) {
        return dailyRewardMapper.selectOne(new LambdaQueryWrapper<AiDailyPointReward>()
            .eq(AiDailyPointReward::getUserId, userId.longValue())
            .eq(AiDailyPointReward::getRewardDate, date)
            .last("LIMIT 1"));
    }

    private AiPointTransaction beginTransaction(
        Integer tenantId,
        Integer userId,
        long changePoints,
        String transactionType,
        String requestNo,
        String bizType,
        Long bizId,
        String sourceOrderNo,
        String remark
    ) {
        AiPointTransaction existing = transactionMapper.selectByRequestNoForUpdate(requestNo);
        if (existing != null) {
            validateIdempotentTransaction(existing, userId, changePoints);
            return existing;
        }

        AiPointTransaction transaction = new AiPointTransaction();
        transaction.setTenantId(tenantId == null ? null : tenantId.longValue());
        transaction.setAccountId(0L);
        transaction.setUserId(userId.longValue());
        transaction.setTransactionType(transactionType);
        transaction.setChangePoints(changePoints);
        transaction.setBalanceAfter(-1L);
        transaction.setBizType(bizType);
        transaction.setBizId(bizId);
        transaction.setRequestNo(requestNo);
        transaction.setSourceOrderNo(sourceOrderNo);
        transaction.setRemark(remark);
        try {
            transactionMapper.insert(transaction);
            return transaction;
        } catch (DuplicateKeyException duplicate) {
            AiPointTransaction concurrent = transactionMapper.selectByRequestNoForUpdate(requestNo);
            if (concurrent == null) {
                throw duplicate;
            }
            validateIdempotentTransaction(concurrent, userId, changePoints);
            return concurrent;
        }
    }

    private void validateIdempotentTransaction(
        AiPointTransaction transaction,
        Integer userId,
        long changePoints
    ) {
        if (!transaction.getUserId().equals(userId.longValue())
            || !transaction.getChangePoints().equals(changePoints)) {
            throw new BusinessException(ResultCode.CONFLICT, "积分请求号已被其他业务使用");
        }
    }

    private boolean isCompleted(AiPointTransaction transaction) {
        return transaction.getBalanceAfter() != null && transaction.getBalanceAfter() >= 0;
    }

    private AiPointAccount lockedAccount(Integer tenantId, Integer userId) {
        ensureAccount(tenantId, userId);
        AiPointAccount account = accountMapper.selectByUserForUpdate(userId.longValue());
        if (account == null) {
            throw new BusinessException("积分账户不存在");
        }
        return account;
    }

    private AiPointAccount ensureAccount(Integer tenantId, Integer userId) {
        if (userId == null) {
            throw new BusinessException("用户ID不能为空");
        }
        AiPointAccount account = accountMapper.selectOne(new LambdaQueryWrapper<AiPointAccount>()
            .eq(AiPointAccount::getUserId, userId.longValue())
            .last("LIMIT 1"));
        if (account != null) {
            return account;
        }

        account = new AiPointAccount();
        account.setTenantId(tenantId == null ? null : tenantId.longValue());
        account.setUserId(userId.longValue());
        account.setAvailablePoints(0L);
        account.setFrozenPoints(0L);
        account.setVersion(0);
        try {
            accountMapper.insert(account);
            return account;
        } catch (DuplicateKeyException ignored) {
            return accountMapper.selectOne(new LambdaQueryWrapper<AiPointAccount>()
                .eq(AiPointAccount::getUserId, userId.longValue())
                .last("LIMIT 1"));
        }
    }

    private void validateChange(Integer userId, long points, String requestNo) {
        if (userId == null || points <= 0 || !StringUtils.hasText(requestNo)) {
            throw new BusinessException("积分变动参数不完整");
        }
    }

    private PointAccountVO toAccountVO(AiPointAccount account) {
        PointAccountVO vo = new PointAccountVO();
        vo.setId(String.valueOf(account.getId()));
        vo.setUserId(String.valueOf(account.getUserId()));
        vo.setAvailablePoints(account.getAvailablePoints());
        vo.setFrozenPoints(account.getFrozenPoints());
        vo.setUpdatedAt(account.getUpdateTime() == null ? null : account.getUpdateTime().toString());
        return vo;
    }

    private PointTransactionVO toTransactionVO(AiPointTransaction transaction) {
        PointTransactionVO vo = new PointTransactionVO();
        vo.setId(String.valueOf(transaction.getId()));
        vo.setTransactionType(transaction.getTransactionType());
        vo.setChangePoints(transaction.getChangePoints());
        vo.setBalanceAfter(transaction.getBalanceAfter());
        vo.setBizType(transaction.getBizType());
        vo.setBizId(transaction.getBizId() == null ? null : String.valueOf(transaction.getBizId()));
        vo.setRequestNo(transaction.getRequestNo());
        vo.setSourceOrderNo(transaction.getSourceOrderNo());
        vo.setRemark(transaction.getRemark());
        vo.setCreatedAt(transaction.getCreateTime() == null ? null : transaction.getCreateTime().toString());
        return vo;
    }

    private DailyPointRewardVO dailyRewardVO(
        AiDailyPointReward reward,
        Long balanceAfter,
        boolean alreadyClaimed
    ) {
        DailyPointRewardVO vo = new DailyPointRewardVO();
        vo.setRewardDate(reward.getRewardDate().toString());
        vo.setRewardPoints(reward.getRewardPoints());
        vo.setBalanceAfter(balanceAfter);
        vo.setAlreadyClaimed(alreadyClaimed);
        return vo;
    }
}