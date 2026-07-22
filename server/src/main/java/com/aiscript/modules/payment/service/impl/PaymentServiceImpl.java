package com.aiscript.modules.payment.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.common.util.IdUtils;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.common.api.ResultCode;
import com.aiscript.integration.pay.PayClient;
import com.aiscript.integration.pay.PayClientRouter;
import com.aiscript.integration.pay.PayCreateRequest;
import com.aiscript.integration.pay.PayCreateResponse;
import com.aiscript.integration.pay.PayNotifyMessage;
import com.aiscript.integration.pay.PayQueryResponse;
import com.aiscript.security.LoginUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.entity.AiUserMembership;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiUserMembershipMapper;
import com.aiscript.modules.payment.dto.PaymentCallbackDTO;
import com.aiscript.modules.payment.dto.PaymentOrderDTO;
import com.aiscript.modules.payment.dto.PaymentOrderQueryDTO;
import com.aiscript.modules.payment.dto.QuotaAdjustDTO;
import com.aiscript.modules.payment.entity.AiPaymentCallback;
import com.aiscript.modules.payment.entity.AiPaymentOrder;
import com.aiscript.modules.payment.entity.AiQuotaAccount;
import com.aiscript.modules.payment.entity.AiQuotaTransaction;
import com.aiscript.modules.payment.entity.AiWalletAccount;
import com.aiscript.modules.payment.entity.AiWalletTransaction;
import com.aiscript.modules.payment.mapper.AiPaymentCallbackMapper;
import com.aiscript.modules.payment.mapper.AiPaymentOrderMapper;
import com.aiscript.modules.payment.mapper.AiQuotaAccountMapper;
import com.aiscript.modules.payment.mapper.AiQuotaTransactionMapper;
import com.aiscript.modules.payment.mapper.AiWalletAccountMapper;
import com.aiscript.modules.payment.mapper.AiWalletTransactionMapper;
import com.aiscript.modules.payment.service.PaymentService;
import com.aiscript.modules.payment.vo.QuotaVO;
import com.aiscript.modules.payment.vo.PaymentOrderVO;
import com.aiscript.modules.payment.vo.PaymentParamsVO;
import com.aiscript.modules.payment.vo.WalletTransactionVO;
import com.aiscript.modules.payment.vo.WalletVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class PaymentServiceImpl implements PaymentService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private final AiPaymentOrderMapper orderMapper;
    private final AiMembershipPlanMapper planMapper;
    private final PayClientRouter payClientRouter;
    private final AiPaymentCallbackMapper callbackMapper;
    private final AiWalletAccountMapper walletAccountMapper;
    private final AiWalletTransactionMapper walletTransactionMapper;
    private final AiUserMembershipMapper userMembershipMapper;
    private final AiQuotaAccountMapper quotaAccountMapper;
    private final AiQuotaTransactionMapper quotaTransactionMapper;
    private final ObjectMapper objectMapper;

    public PaymentServiceImpl(
        AiPaymentOrderMapper orderMapper,
        AiMembershipPlanMapper planMapper,
        PayClientRouter payClientRouter,
        AiPaymentCallbackMapper callbackMapper,
        AiWalletAccountMapper walletAccountMapper,
        AiWalletTransactionMapper walletTransactionMapper,
        AiUserMembershipMapper userMembershipMapper,
        AiQuotaAccountMapper quotaAccountMapper,
        AiQuotaTransactionMapper quotaTransactionMapper,
        ObjectMapper objectMapper
    ) {
        this.orderMapper = orderMapper;
        this.planMapper = planMapper;
        this.payClientRouter = payClientRouter;
        this.callbackMapper = callbackMapper;
        this.walletAccountMapper = walletAccountMapper;
        this.walletTransactionMapper = walletTransactionMapper;
        this.userMembershipMapper = userMembershipMapper;
        this.quotaAccountMapper = quotaAccountMapper;
        this.quotaTransactionMapper = quotaTransactionMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO recharge(PaymentOrderDTO dto) {
        if (dto == null) {
            throw new BusinessException("支付参数不能为空");
        }
        if (dto.getAmount() == null || dto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("充值金额必须大于0");
        }
        if ("balance".equalsIgnoreCase(dto.getPayMethod())) throw new BusinessException("充值不支持余额支付");
        return createOrder("recharge", dto.getPayMethod(), dto.getAmount(), "余额充值", null, null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO memberOrder(PaymentOrderDTO dto) {
        if (dto == null) {
            throw new BusinessException("支付参数不能为空");
        }
        if (!StringUtils.hasText(dto.getPlanId())) {
            throw new BusinessException("会员套餐ID不能为空");
        }
        AiMembershipPlan plan = planMapper.selectById(parseLong(dto.getPlanId(), "会员套餐ID格式不正确"));
        if (plan == null || plan.getStatus() == null || plan.getStatus() != 1) {
            throw new BusinessException("会员套餐不存在或已下架");
        }
        BigDecimal amount = plan.getPrice();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("会员订单金额必须大于0");
        }
        if ("balance".equalsIgnoreCase(dto.getPayMethod())) return handleBalanceMemberOrder(dto);
        return createOrder("member", dto.getPayMethod(), amount, "会员订单-" + plan.getPlanName(), plan.getId(), toJson(plan));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO handleCallback(PaymentCallbackDTO dto) {
        throw new BusinessException("支付回调已禁用，请使用支付平台通知接口");
    }

    @Override
    public PaymentOrderVO getOrder(String orderNo) {
        AiPaymentOrder order = findOrder(orderNo);
        assertOrderOwner(order);
        return toOrderVO(order, null);
    }

    @Override
    public PageResult<PaymentOrderVO> orders(PaymentOrderQueryDTO query) {
        IPage<AiPaymentOrder> page = orderMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()),
            new LambdaQueryWrapper<AiPaymentOrder>()
                .eq(AiPaymentOrder::getUserId, currentUserId())
                .eq(currentTenantId() != null, AiPaymentOrder::getTenantId, currentTenantId())
                .and(StringUtils.hasText(query.getKeyword()), w -> w.like(AiPaymentOrder::getOrderNo, query.getKeyword())
                    .or().like(AiPaymentOrder::getSubject, query.getKeyword())
                    .or().like(AiPaymentOrder::getProviderTradeNo, query.getKeyword()))
                .eq(StringUtils.hasText(query.getStatus()), AiPaymentOrder::getStatus, query.getStatus())
                .orderByDesc(AiPaymentOrder::getCreateTime));
        return toOrderPage(page);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO closeOrder(String orderNo) {
        AiPaymentOrder order = findOrder(orderNo);
        assertOrderOwner(order);
        if ("pending".equals(order.getStatus())) {
            payClientRouter.route(order.getProvider(), order.getPayMethod()).closeOrder(orderNo);
            order.setStatus("closed"); order.setCloseTime(LocalDateTime.now()); orderMapper.updateById(order);
        }
        return toOrderVO(order, null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO queryProviderOrder(String orderNo) {
        AiPaymentOrder order = findOrder(orderNo); assertOrderOwner(order);
        return queryProviderOrderInternal(order);
    }

    @Override
    public PageResult<PaymentOrderVO> adminOrders(PaymentOrderQueryDTO query) {
        IPage<AiPaymentOrder> page = orderMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), buildAdminOrderWrapper(query));
        return toOrderPage(page);
    }

    @Override
    public PaymentOrderVO adminGetOrder(String orderNo) {
        return toOrderVO(findOrder(orderNo), null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO adminQueryProviderOrder(String orderNo) {
        return queryProviderOrderInternal(findOrder(orderNo));
    }

    private PaymentOrderVO queryProviderOrderInternal(AiPaymentOrder order) {
        PayQueryResponse q = payClientRouter.route(order.getProvider(), order.getPayMethod()).queryOrder(order.getOrderNo());
        order.setLastQueryTime(LocalDateTime.now()); order.setProviderStatus(q.getTradeStatus()); if (StringUtils.hasText(q.getProviderTradeNo())) order.setProviderTradeNo(q.getProviderTradeNo()); orderMapper.updateById(order);
        if (q.isPaid()) { PayNotifyMessage msg = new PayNotifyMessage(); msg.setProvider(order.getProvider()); msg.setOrderNo(order.getOrderNo()); msg.setProviderTradeNo(q.getProviderTradeNo()); msg.setTradeStatus(q.getTradeStatus()); msg.setTotalAmount(q.getPaidAmount()); msg.setVerified(true); msg.setPaid(true); return handleProviderNotify(msg); }
        return toOrderVO(order, null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO handleProviderNotify(PayNotifyMessage msg) {
        AiPaymentOrder order = findOrder(msg.getOrderNo());
        AiPaymentCallback cb = new AiPaymentCallback(); cb.setProvider(msg.getProvider()); cb.setOrderNo(msg.getOrderNo()); cb.setProviderTradeNo(msg.getProviderTradeNo());
        cb.setTradeStatus(msg.getTradeStatus()); cb.setTotalAmount(msg.getTotalAmount()); cb.setRawBody(msg.getRawBody()); cb.setSignature(msg.getSignature()); cb.setVerified(msg.isVerified()); cb.setErrorMsg(msg.getErrorMsg()); cb.setReceivedTime(LocalDateTime.now()); cb.setHeadersJson(toJson(msg.getHeaders()));
        cb.setPayloadJson(toJson(msg.getParams() == null || msg.getParams().isEmpty() ? msg : msg.getParams()));
        cb.setNotifyId(msg.getNotifyId());
        if (!msg.isVerified()) { cb.setHandleResult("verify_failed"); saveCallback(cb); throw new BusinessException("支付回调验签失败"); }
        if (!msg.isPaid()) { cb.setHandleResult("ignored"); saveCallback(cb); return toOrderVO(order, null); }
        if (!order.getProvider().equalsIgnoreCase(msg.getProvider())) throw new BusinessException("支付渠道不匹配");
        if (msg.getTotalAmount() == null || msg.getTotalAmount().compareTo(order.getAmount()) != 0) throw new BusinessException("支付金额不匹配");
        if ("paid".equals(order.getStatus()) && "success".equals(order.getFulfillStatus())) { cb.setHandleResult("duplicate"); saveCallback(cb); return toOrderVO(order, null); }
        order.setStatus("paid"); order.setPaidAmount(msg.getTotalAmount() == null ? order.getAmount() : msg.getTotalAmount()); order.setProviderTradeNo(msg.getProviderTradeNo());
        order.setProviderStatus(msg.getTradeStatus()); order.setPayTime(LocalDateTime.now()); order.setNotifyTime(LocalDateTime.now()); orderMapper.updateById(order);
        try { if ("recharge".equals(order.getOrderType())) rechargeWallet(order); else if ("member".equals(order.getOrderType())) activateMembership(order); order.setFulfillStatus("success"); order.setFulfillTime(LocalDateTime.now()); }
        catch (Exception ex) { order.setFulfillStatus("failed"); order.setFulfillError(ex.getMessage()); throw ex; }
        finally { orderMapper.updateById(order); }
        cb.setHandleResult("success"); saveCallback(cb); return toOrderVO(order, null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO handleBalanceMemberOrder(PaymentOrderDTO dto) {
        AiMembershipPlan plan = planMapper.selectById(parseLong(dto.getPlanId(), "会员套餐ID格式不正确"));
        PaymentOrderVO vo = createOrder("member", "balance", plan.getPrice(), "会员订单-" + plan.getPlanName(), plan.getId(), toJson(plan));
        AiPaymentOrder order = findOrder(vo.getOrderNo()); AiWalletAccount wallet = ensureWallet(order.getUserId());
        if (wallet.getBalance().compareTo(order.getAmount()) < 0) throw new BusinessException(ResultCode.CONFLICT, "余额不足");
        int updated = walletAccountMapper.update(null, new LambdaUpdateWrapper<AiWalletAccount>().eq(AiWalletAccount::getId, wallet.getId()).ge(AiWalletAccount::getBalance, order.getAmount()).setSql("balance = balance - " + order.getAmount()));
        if (updated == 0) throw new BusinessException(ResultCode.CONFLICT, "余额不足");
        wallet = ensureWallet(order.getUserId()); saveWalletTransaction(wallet, "consume", order.getAmount().negate(), "payment_order", order.getId(), "会员余额支付");
        order.setStatus("paid"); order.setPaidAmount(order.getAmount()); order.setPayTime(LocalDateTime.now()); activateMembership(order); order.setFulfillStatus("success"); order.setFulfillTime(LocalDateTime.now()); orderMapper.updateById(order);
        return toOrderVO(order, null);
    }

    @Override
    public WalletVO wallet() {
        return toWalletVO(ensureWallet(currentUserId()));
    }

    @Override
    public PageResult<WalletTransactionVO> walletTransactions(PageQuery query) {
        IPage<AiWalletTransaction> page = walletTransactionMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()),
            new LambdaQueryWrapper<AiWalletTransaction>()
                .eq(AiWalletTransaction::getUserId, currentUserId())
                .orderByDesc(AiWalletTransaction::getCreateTime));
        return new PageResult<>(page.getRecords().stream().map(this::toWalletTransactionVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    public List<QuotaVO> quotas() {
        return quotaAccountMapper.selectList(new LambdaQueryWrapper<AiQuotaAccount>().eq(AiQuotaAccount::getUserId, currentUserId()))
            .stream().map(this::toQuotaVO).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public QuotaVO adjustQuota(QuotaAdjustDTO dto) {
        if (dto == null || !StringUtils.hasText(dto.userId) || !StringUtils.hasText(dto.quotaType) || dto.changeCount == null) {
            throw new BusinessException("额度调整参数不完整");
        }
        Integer userId = parseLong(dto.userId, "用户ID格式不正确");
        AiQuotaAccount account = quotaAccountMapper.selectOne(new LambdaQueryWrapper<AiQuotaAccount>()
            .eq(AiQuotaAccount::getUserId, userId)
            .eq(AiQuotaAccount::getQuotaType, dto.quotaType));
        if (account == null) {
            account = new AiQuotaAccount();
            account.setTenantId(currentTenantId());
            account.setUserId(userId);
            account.setQuotaType(dto.quotaType);
            account.setRemainingCount(0);
            quotaAccountMapper.insert(account);
        }
        account.setRemainingCount(Math.max(0, account.getRemainingCount() + dto.changeCount));
        quotaAccountMapper.updateById(account);
        AiQuotaTransaction tx = new AiQuotaTransaction();
        tx.setQuotaAccountId(account.getId());
        tx.setUserId(userId);
        tx.setChangeCount(dto.changeCount);
        tx.setRemainingAfter(account.getRemainingCount());
        tx.setBizType("admin_adjust");
        tx.setRemark(dto.remark);
        quotaTransactionMapper.insert(tx);
        return toQuotaVO(account);
    }

    private PaymentOrderVO createOrder(String type, String payMethod, BigDecimal amount, String subject, Integer planId, String snapshot) {
        AiPaymentOrder order = new AiPaymentOrder();
        order.setTenantId(TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId());
        order.setUserId(currentUserId());
        order.setOrderNo(type.toUpperCase() + IdUtils.nextId());
        order.setOrderType(type);
        order.setPayMethod(payMethod == null ? "wechat" : payMethod);
        order.setProvider(payClientRouter.providerOf(order.getPayMethod())); order.setTradeType("NATIVE"); order.setPlanId(planId); order.setProductSnapshotJson(snapshot); order.setCurrency("CNY"); order.setFulfillStatus("pending"); order.setVersion(0);
        order.setAmount(amount == null ? BigDecimal.ZERO : amount);
        order.setSubject(subject);
        order.setStatus("pending");
        orderMapper.insert(order);
        if ("balance".equals(order.getPayMethod())) return toOrderVO(order, null);
        PayCreateRequest req = new PayCreateRequest(); req.setProvider(order.getProvider()); req.setPayMethod(order.getPayMethod()); req.setOrderNo(order.getOrderNo()); req.setAmount(order.getAmount()); req.setSubject(order.getSubject());
        PayCreateResponse payParams = payClientRouter.route(order.getProvider(), order.getPayMethod()).createNativeOrder(req);
        if (payParams.getProviderTradeNo() != null) {
            order.setProviderTradeNo(payParams.getProviderTradeNo());
        }
        order.setQrContent(payParams.getQrContent()); orderMapper.updateById(order);
        return toOrderVO(order, toPaymentParamsVO(payParams));
    }

    private PaymentOrderVO toOrderVO(AiPaymentOrder order, PaymentParamsVO payParams) {
        PaymentOrderVO vo = new PaymentOrderVO();
        vo.setId(String.valueOf(order.getId()));
        vo.setUserId(order.getUserId() == null ? null : String.valueOf(order.getUserId()));
        vo.setOrderNo(order.getOrderNo());
        vo.setOrderType(order.getOrderType());
        vo.setStatus(order.getStatus());
        vo.setAmount(order.getAmount());
        vo.setPaidAmount(order.getPaidAmount());
        vo.setCurrency(order.getCurrency());
        vo.setPayMethod(order.getPayMethod());
        vo.setSubject(order.getSubject());
        vo.setProviderTradeNo(order.getProviderTradeNo());
        vo.setProvider(order.getProvider()); vo.setProviderStatus(order.getProviderStatus()); vo.setFulfillStatus(order.getFulfillStatus()); vo.setQrContent(order.getQrContent()); vo.setExpireTime(formatTime(order.getExpireTime()));
        vo.setPayTime(formatTime(order.getPayTime())); vo.setCreatedAt(formatTime(order.getCreateTime())); vo.setUpdatedAt(formatTime(order.getUpdateTime())); vo.setLastQueryTime(formatTime(order.getLastQueryTime())); vo.setFulfillTime(formatTime(order.getFulfillTime())); vo.setFulfillError(order.getFulfillError());
        vo.setPayParams(payParams == null && StringUtils.hasText(order.getQrContent()) ? toPaymentParamsVO(order) : payParams);
        return vo;
    }

    private PageResult<PaymentOrderVO> toOrderPage(IPage<AiPaymentOrder> page) {
        return new PageResult<>(page.getRecords().stream().map(order -> toOrderVO(order, null)).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    private LambdaQueryWrapper<AiPaymentOrder> buildAdminOrderWrapper(PaymentOrderQueryDTO query) {
        LambdaQueryWrapper<AiPaymentOrder> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.getKeyword())) {
            String keyword = query.getKeyword();
            wrapper.and(w -> w.like(AiPaymentOrder::getOrderNo, keyword)
                .or().like(AiPaymentOrder::getSubject, keyword)
                .or().like(AiPaymentOrder::getProviderTradeNo, keyword));
        }
        wrapper.eq(StringUtils.hasText(query.getStatus()), AiPaymentOrder::getStatus, query.getStatus())
            .eq(StringUtils.hasText(query.getPayMethod()), AiPaymentOrder::getPayMethod, query.getPayMethod())
            .eq(StringUtils.hasText(query.getOrderType()), AiPaymentOrder::getOrderType, query.getOrderType());
        if (StringUtils.hasText(query.getUserId())) {
            wrapper.eq(AiPaymentOrder::getUserId, parseLong(query.getUserId(), "用户ID格式不正确"));
        }
        return wrapper.orderByDesc(AiPaymentOrder::getCreateTime);
    }

    private String formatTime(LocalDateTime time) {
        return time == null ? null : time.toString();
    }

    private void rechargeWallet(AiPaymentOrder order) {
        AiWalletAccount wallet = ensureWallet(order.getUserId());
        if (!insertWalletTransaction(wallet, "recharge", order.getAmount(), "payment_order", order.getId(), "余额充值到账")) return;
        walletAccountMapper.update(null, new LambdaUpdateWrapper<AiWalletAccount>().eq(AiWalletAccount::getId, wallet.getId()).setSql("balance = balance + " + order.getAmount()));
    }

    private void activateMembership(AiPaymentOrder order) {
        if (userMembershipMapper.selectCount(new LambdaQueryWrapper<AiUserMembership>().eq(AiUserMembership::getSourceOrderNo, order.getOrderNo())) > 0) return;
        AiMembershipPlan plan = order.getPlanId() == null ? null : planMapper.selectById(order.getPlanId());
        if (plan == null) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        AiUserMembership membership = new AiUserMembership();
        membership.setTenantId(order.getTenantId());
        membership.setUserId(order.getUserId());
        membership.setPlanId(plan.getId());
        membership.setStatus("active");
        membership.setSourceOrderNo(order.getOrderNo()); membership.setSourcePayMethod(order.getPayMethod()); membership.setPlanSnapshotJson(order.getProductSnapshotJson());
        membership.setStartTime(now);
        membership.setExpireTime(now.plusDays(plan.getPeriodDays() == null ? 30 : plan.getPeriodDays()));
        try { userMembershipMapper.insert(membership); } catch (DuplicateKeyException ignored) { }
    }

    private AiWalletAccount ensureWallet(Integer userId) {
        AiWalletAccount wallet = walletAccountMapper.selectOne(new LambdaQueryWrapper<AiWalletAccount>().eq(AiWalletAccount::getUserId, userId));
        if (wallet != null) {
            return wallet;
        }
        wallet = new AiWalletAccount();
        wallet.setTenantId(currentTenantId());
        wallet.setUserId(userId);
        wallet.setBalance(BigDecimal.ZERO);
        wallet.setFrozenBalance(BigDecimal.ZERO);
        walletAccountMapper.insert(wallet);
        return wallet;
    }

    private void saveWalletTransaction(AiWalletAccount wallet, String type, BigDecimal amount, String bizType, Integer bizId, String remark) {
        insertWalletTransaction(wallet, type, amount, bizType, bizId, remark);
    }

    private boolean insertWalletTransaction(AiWalletAccount wallet, String type, BigDecimal amount, String bizType, Integer bizId, String remark) {
        AiPaymentOrder order = orderMapper.selectById(bizId);
        String orderNo = order == null ? null : order.getOrderNo();
        AiWalletTransaction tx = new AiWalletTransaction();
        tx.setTenantId(wallet.getTenantId());
        tx.setWalletId(wallet.getId());
        tx.setUserId(wallet.getUserId());
        tx.setTransactionType(type);
        tx.setAmount(amount);
        tx.setBalanceAfter(wallet.getBalance());
        tx.setBizType(bizType);
        tx.setBizId(bizId);
        tx.setOrderNo(orderNo); tx.setRequestNo(orderNo == null ? null : orderNo + ":" + type);
        tx.setRemark(remark);
        try { walletTransactionMapper.insert(tx); return true; } catch (DuplicateKeyException ignored) { return false; }
    }

    private void saveCallback(AiPaymentCallback callback) {
        try { callbackMapper.insert(callback); } catch (DuplicateKeyException ignored) { }
    }

    private WalletVO toWalletVO(AiWalletAccount wallet) {
        WalletVO vo = new WalletVO();
        vo.id = String.valueOf(wallet.getId());
        vo.userId = String.valueOf(wallet.getUserId());
        vo.balance = wallet.getBalance();
        vo.frozenBalance = wallet.getFrozenBalance();
        vo.updatedAt = wallet.getUpdateTime() == null ? null : wallet.getUpdateTime().toString();
        return vo;
    }

    private WalletTransactionVO toWalletTransactionVO(AiWalletTransaction tx) {
        WalletTransactionVO vo = new WalletTransactionVO();
        vo.id = String.valueOf(tx.getId());
        vo.walletId = String.valueOf(tx.getWalletId());
        vo.userId = String.valueOf(tx.getUserId());
        vo.transactionType = tx.getTransactionType();
        vo.amount = tx.getAmount();
        vo.balanceAfter = tx.getBalanceAfter();
        vo.bizType = tx.getBizType();
        vo.bizId = tx.getBizId() == null ? null : String.valueOf(tx.getBizId());
        vo.remark = tx.getRemark();
        vo.createdAt = tx.getCreateTime() == null ? null : tx.getCreateTime().toString();
        return vo;
    }

    private QuotaVO toQuotaVO(AiQuotaAccount account) {
        QuotaVO vo = new QuotaVO();
        vo.id = String.valueOf(account.getId());
        vo.userId = String.valueOf(account.getUserId());
        vo.quotaType = account.getQuotaType();
        vo.remainingCount = account.getRemainingCount();
        vo.expireTime = account.getExpireTime() == null ? null : account.getExpireTime().toString();
        return vo;
    }

    private PaymentParamsVO toPaymentParamsVO(PayCreateResponse result) {
        PaymentParamsVO vo = new PaymentParamsVO();
        vo.setProviderTradeNo(result.getProviderTradeNo());
        vo.setOrderNo(result.getOrderNo());
        vo.setAmount(result.getAmount());
        vo.setSubject(result.getSubject());
        vo.setPayUrl(result.getPayUrl());
        vo.setQrCode(result.getQrContent());
        vo.setRawPayload(null);
        return vo;
    }
    private PaymentParamsVO toPaymentParamsVO(AiPaymentOrder order) { PaymentParamsVO vo = new PaymentParamsVO(); vo.setProviderTradeNo(order.getProviderTradeNo()); vo.setOrderNo(order.getOrderNo()); vo.setAmount(order.getAmount()); vo.setSubject(order.getSubject()); vo.setPayUrl(order.getQrContent()); vo.setQrCode(order.getQrContent()); return vo; }
    private String toJson(Object o) { try { return objectMapper.writeValueAsString(o); } catch (Exception ex) { return "{}"; } }

    private Integer parseLong(String value, String message) {
        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException ex) {
            throw new BusinessException(message);
        }
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }
    private Integer currentUserId() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a != null && a.getPrincipal() instanceof LoginUser u) return u.getUserId();
        throw new BusinessException(ResultCode.UNAUTHORIZED, "未登录");
    }
    private AiPaymentOrder findOrder(String orderNo) {
        AiPaymentOrder order = orderMapper.selectOne(new LambdaQueryWrapper<AiPaymentOrder>().eq(AiPaymentOrder::getOrderNo, orderNo));
        if (order == null) throw new BusinessException(ResultCode.NOT_FOUND, "支付订单不存在");
        return order;
    }
    private void assertOrderOwner(AiPaymentOrder order) { if (!order.getUserId().equals(currentUserId()) || (order.getTenantId() != null && !order.getTenantId().equals(currentTenantId()))) throw new BusinessException(ResultCode.FORBIDDEN, "无权访问该订单"); }
}
