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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.entity.AiMembershipPlanSku;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.service.MembershipSubscriptionService;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipPointService;
import com.aiscript.modules.membership.vo.MembershipChangeQuoteVO;
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
import java.util.Map;
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
    private final AiMembershipPlanSkuMapper skuMapper;
    private final MembershipSubscriptionService membershipSubscriptionService;
    private final MembershipEntitlementService membershipEntitlementService;
    private final MembershipPointService membershipPointService;
    private final PayClientRouter payClientRouter;
    private final AiPaymentCallbackMapper callbackMapper;
    private final AiWalletAccountMapper walletAccountMapper;
    private final AiWalletTransactionMapper walletTransactionMapper;
    private final AiQuotaAccountMapper quotaAccountMapper;
    private final AiQuotaTransactionMapper quotaTransactionMapper;
    private final ObjectMapper objectMapper;

    public PaymentServiceImpl(
        AiPaymentOrderMapper orderMapper,
        AiMembershipPlanMapper planMapper,
        AiMembershipPlanSkuMapper skuMapper,
        MembershipSubscriptionService membershipSubscriptionService,
        MembershipEntitlementService membershipEntitlementService,
        MembershipPointService membershipPointService,
        PayClientRouter payClientRouter,
        AiPaymentCallbackMapper callbackMapper,
        AiWalletAccountMapper walletAccountMapper,
        AiWalletTransactionMapper walletTransactionMapper,
        AiQuotaAccountMapper quotaAccountMapper,
        AiQuotaTransactionMapper quotaTransactionMapper,
        ObjectMapper objectMapper
    ) {
        this.orderMapper = orderMapper;
        this.planMapper = planMapper;
        this.skuMapper = skuMapper;
        this.membershipSubscriptionService = membershipSubscriptionService;
        this.membershipEntitlementService = membershipEntitlementService;
        this.membershipPointService = membershipPointService;
        this.payClientRouter = payClientRouter;
        this.callbackMapper = callbackMapper;
        this.walletAccountMapper = walletAccountMapper;
        this.walletTransactionMapper = walletTransactionMapper;
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
        if ("balance".equalsIgnoreCase(dto.getPayMethod())) {
            return handleBalanceMemberOrder(dto);
        }
        MembershipOrderTarget target = resolveMembershipTarget(dto);
        MembershipChangeQuoteVO quote = membershipSubscriptionService.quote(
            currentTenantId(), currentUserId(), target.sku().getId()
        );
        assertPayableChange(quote);
        return createOrder(
            "member", dto.getPayMethod(), quote.getPayableAmount(),
            "会员订阅-" + target.sku().getSkuName(), target.plan().getId(),
            target.sku().getId(), quote.getChangeType(), dto.getIdempotencyKey(),
            toJson(Map.of("plan", target.plan(), "sku", target.sku(), "quote", quote))
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO pointOrder(PaymentOrderDTO dto) {
        if (dto == null || dto.getAmount() == null
            || dto.getAmount().compareTo(BigDecimal.ZERO) <= 0
            || dto.getAmount().remainder(BigDecimal.TEN).compareTo(BigDecimal.ZERO) != 0) {
            throw new BusinessException("积分包金额必须是大于0的10元整数倍");
        }
        membershipEntitlementService.requireFeature(
            currentTenantId(), currentUserId(), "POINT_PURCHASE_ACCESS"
        );
        long rate = membershipEntitlementService.getLimit(
            currentTenantId(), currentUserId(), "POINTS_PER_10_YUAN"
        );
        if (rate <= 0) {
            throw new BusinessException("当前会员等级不支持购买积分包");
        }
        long blocks;
        try {
            blocks = dto.getAmount().divideToIntegralValue(BigDecimal.TEN).longValueExact();
        } catch (ArithmeticException exception) {
            throw new BusinessException("积分包金额过大");
        }
        long points;
        try {
            points = Math.multiplyExact(blocks, rate);
        } catch (ArithmeticException exception) {
            throw new BusinessException("积分数量超出系统限制");
        }
        String snapshot = toJson(Map.of("points", points, "pointsPer10Yuan", rate));
        PaymentOrderVO created = createOrder(
            "point", dto.getPayMethod(), dto.getAmount(), "积分包-" + points + "积分",
            null, null, "point_purchase", dto.getIdempotencyKey(), snapshot
        );
        if (!"balance".equalsIgnoreCase(dto.getPayMethod())) {
            return created;
        }
        return payPointOrderByBalance(created.getOrderNo());
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
        try { if ("recharge".equals(order.getOrderType())) rechargeWallet(order); else if ("member".equals(order.getOrderType())) membershipSubscriptionService.fulfillPaidOrder(order); else if ("point".equals(order.getOrderType())) fulfillPointPurchase(order); order.setFulfillStatus("success"); order.setFulfillTime(LocalDateTime.now()); }
        catch (Exception ex) { order.setFulfillStatus("failed"); order.setFulfillError(ex.getMessage()); throw ex; }
        finally { orderMapper.updateById(order); }
        cb.setHandleResult("success"); saveCallback(cb); return toOrderVO(order, null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO handleBalanceMemberOrder(PaymentOrderDTO dto) {
        MembershipOrderTarget target = resolveMembershipTarget(dto);
        MembershipChangeQuoteVO quote = membershipSubscriptionService.quote(
            currentTenantId(), currentUserId(), target.sku().getId()
        );
        assertPayableChange(quote);
        PaymentOrderVO vo = createOrder(
            "member", "balance", quote.getPayableAmount(),
            "会员订阅-" + target.sku().getSkuName(), target.plan().getId(),
            target.sku().getId(), quote.getChangeType(), dto.getIdempotencyKey(),
            toJson(Map.of("plan", target.plan(), "sku", target.sku(), "quote", quote))
        );
        AiPaymentOrder order = findOrder(vo.getOrderNo());
        if ("paid".equals(order.getStatus()) && "success".equals(order.getFulfillStatus())) {
            return toOrderVO(order, null);
        }
        int claimed = orderMapper.update(
            null,
            new LambdaUpdateWrapper<AiPaymentOrder>()
                .eq(AiPaymentOrder::getId, order.getId())
                .eq(AiPaymentOrder::getStatus, "pending")
                .eq(AiPaymentOrder::getFulfillStatus, "pending")
                .set(AiPaymentOrder::getFulfillStatus, "processing")
        );
        if (claimed == 0) {
            AiPaymentOrder latest = findOrder(order.getOrderNo());
            if ("paid".equals(latest.getStatus()) && "success".equals(latest.getFulfillStatus())) {
                return toOrderVO(latest, null);
            }
            throw new BusinessException(ResultCode.CONFLICT, "会员订单正在处理，请勿重复提交");
        }
        AiWalletAccount wallet = ensureWallet(order.getUserId());
        if (wallet.getBalance().compareTo(order.getAmount()) < 0) {
            throw new BusinessException(ResultCode.CONFLICT, "余额不足");
        }
        int updated = walletAccountMapper.update(
            null,
            new LambdaUpdateWrapper<AiWalletAccount>()
                .eq(AiWalletAccount::getId, wallet.getId())
                .ge(AiWalletAccount::getBalance, order.getAmount())
                .setSql("balance = balance - " + order.getAmount())
        );
        if (updated == 0) {
            throw new BusinessException(ResultCode.CONFLICT, "余额不足");
        }
        wallet = ensureWallet(order.getUserId());
        saveWalletTransaction(
            wallet, "consume", order.getAmount().negate(),
            "payment_order", order.getId(), "会员余额支付"
        );
        order.setStatus("paid");
        order.setPaidAmount(order.getAmount());
        order.setPayTime(LocalDateTime.now());
        membershipSubscriptionService.fulfillPaidOrder(order);
        order.setFulfillStatus("success");
        order.setFulfillTime(LocalDateTime.now());
        orderMapper.updateById(order);
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

    private PaymentOrderVO createOrder(
        String type,
        String payMethod,
        BigDecimal amount,
        String subject,
        Integer planId,
        String snapshot
    ) {
        return createOrder(type, payMethod, amount, subject, planId, null, null, null, snapshot);
    }

    private PaymentOrderVO createOrder(
        String type,
        String payMethod,
        BigDecimal amount,
        String subject,
        Integer planId,
        Long skuId,
        String orderScene,
        String idempotencyKey,
        String snapshot
    ) {
        Integer userId = currentUserId();
        if (StringUtils.hasText(idempotencyKey)) {
            AiPaymentOrder existing = orderMapper.selectOne(new LambdaQueryWrapper<AiPaymentOrder>()
                .eq(AiPaymentOrder::getUserId, userId)
                .eq(AiPaymentOrder::getIdempotencyKey, idempotencyKey)
                .last("LIMIT 1"));
            if (existing != null) {
                return toOrderVO(existing, null);
            }
        }

        AiPaymentOrder order = new AiPaymentOrder();
        order.setTenantId(TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId());
        order.setUserId(userId);
        order.setOrderNo(type.toUpperCase() + IdUtils.nextId());
        order.setIdempotencyKey(idempotencyKey);
        order.setOrderType(type);
        order.setOrderScene(orderScene);
        order.setPayMethod(payMethod == null ? "wechat" : payMethod);
        order.setProvider(payClientRouter.providerOf(order.getPayMethod()));
        order.setTradeType("NATIVE");
        order.setPlanId(planId);
        order.setSkuId(skuId);
        order.setProductSnapshotJson(snapshot);
        order.setCurrency("CNY");
        order.setFulfillStatus("pending");
        order.setVersion(0);
        order.setAmount(amount == null ? BigDecimal.ZERO : amount);
        order.setRefundAmount(BigDecimal.ZERO);
        order.setSubject(subject);
        order.setStatus("pending");
        order.setExpireTime(LocalDateTime.now().plusMinutes(15));
        try {
            orderMapper.insert(order);
        } catch (DuplicateKeyException duplicate) {
            if (!StringUtils.hasText(idempotencyKey)) {
                throw duplicate;
            }
            AiPaymentOrder concurrent = orderMapper.selectOne(new LambdaQueryWrapper<AiPaymentOrder>()
                .eq(AiPaymentOrder::getUserId, userId)
                .eq(AiPaymentOrder::getIdempotencyKey, idempotencyKey)
                .last("LIMIT 1"));
            if (concurrent == null) {
                throw duplicate;
            }
            return toOrderVO(concurrent, null);
        }
        if ("balance".equals(order.getPayMethod())) {
            return toOrderVO(order, null);
        }

        PayCreateRequest request = new PayCreateRequest();
        request.setProvider(order.getProvider());
        request.setPayMethod(order.getPayMethod());
        request.setOrderNo(order.getOrderNo());
        request.setAmount(order.getAmount());
        request.setSubject(order.getSubject());
        PayCreateResponse payParams = payClientRouter
            .route(order.getProvider(), order.getPayMethod())
            .createNativeOrder(request);
        if (payParams.getProviderTradeNo() != null) {
            order.setProviderTradeNo(payParams.getProviderTradeNo());
        }
        order.setQrContent(payParams.getQrContent());
        orderMapper.updateById(order);
        return toOrderVO(order, toPaymentParamsVO(payParams));
    }

    private PaymentOrderVO toOrderVO(AiPaymentOrder order, PaymentParamsVO payParams) {
        PaymentOrderVO vo = new PaymentOrderVO();
        vo.setId(String.valueOf(order.getId()));
        vo.setUserId(order.getUserId() == null ? null : String.valueOf(order.getUserId()));
        vo.setOrderNo(order.getOrderNo());
        vo.setOrderType(order.getOrderType());
        vo.setOrderScene(order.getOrderScene());
        vo.setIdempotencyKey(order.getIdempotencyKey());
        vo.setPlanId(order.getPlanId() == null ? null : String.valueOf(order.getPlanId()));
        vo.setSkuId(order.getSkuId() == null ? null : String.valueOf(order.getSkuId()));
        vo.setSubscriptionId(order.getSubscriptionId() == null ? null : String.valueOf(order.getSubscriptionId()));
        vo.setStatus(order.getStatus());
        vo.setAmount(order.getAmount());
        vo.setPaidAmount(order.getPaidAmount());
        vo.setRefundAmount(order.getRefundAmount());
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

    private PaymentOrderVO payPointOrderByBalance(String orderNo) {
        AiPaymentOrder order = findOrder(orderNo);
        if ("paid".equals(order.getStatus()) && "success".equals(order.getFulfillStatus())) {
            return toOrderVO(order, null);
        }
        int claimed = orderMapper.update(
            null,
            new LambdaUpdateWrapper<AiPaymentOrder>()
                .eq(AiPaymentOrder::getId, order.getId())
                .eq(AiPaymentOrder::getStatus, "pending")
                .eq(AiPaymentOrder::getFulfillStatus, "pending")
                .set(AiPaymentOrder::getFulfillStatus, "processing")
        );
        if (claimed == 0) {
            AiPaymentOrder latest = findOrder(orderNo);
            if ("paid".equals(latest.getStatus()) && "success".equals(latest.getFulfillStatus())) {
                return toOrderVO(latest, null);
            }
            throw new BusinessException(ResultCode.CONFLICT, "积分订单正在处理，请勿重复提交");
        }

        AiWalletAccount wallet = ensureWallet(order.getUserId());
        int updated = walletAccountMapper.update(
            null,
            new LambdaUpdateWrapper<AiWalletAccount>()
                .eq(AiWalletAccount::getId, wallet.getId())
                .ge(AiWalletAccount::getBalance, order.getAmount())
                .setSql("balance = balance - " + order.getAmount())
        );
        if (updated == 0) {
            throw new BusinessException(ResultCode.CONFLICT, "余额不足");
        }
        wallet = ensureWallet(order.getUserId());
        saveWalletTransaction(
            wallet, "consume", order.getAmount().negate(),
            "payment_order", order.getId(), "积分包余额支付"
        );
        order.setStatus("paid");
        order.setPaidAmount(order.getAmount());
        order.setPayTime(LocalDateTime.now());
        fulfillPointPurchase(order);
        order.setFulfillStatus("success");
        order.setFulfillTime(LocalDateTime.now());
        orderMapper.updateById(order);
        return toOrderVO(order, null);
    }

    private void fulfillPointPurchase(AiPaymentOrder order) {
        long points;
        try {
            JsonNode snapshot = objectMapper.readTree(order.getProductSnapshotJson());
            points = snapshot.path("points").asLong(0);
        } catch (Exception exception) {
            throw new BusinessException("积分订单快照解析失败");
        }
        if (points <= 0) {
            throw new BusinessException("积分订单数量无效");
        }
        membershipPointService.grantPoints(
            order.getTenantId(), order.getUserId(), points, "purchase",
            "point_purchase:" + order.getOrderNo(), "payment_order",
            order.getId().longValue(), order.getOrderNo(), "积分包购买"
        );
    }
    private void rechargeWallet(AiPaymentOrder order) {
        AiWalletAccount wallet = ensureWallet(order.getUserId());
        if (!insertWalletTransaction(wallet, "recharge", order.getAmount(), "payment_order", order.getId(), "余额充值到账")) return;
        walletAccountMapper.update(null, new LambdaUpdateWrapper<AiWalletAccount>().eq(AiWalletAccount::getId, wallet.getId()).setSql("balance = balance + " + order.getAmount()));
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
    private MembershipOrderTarget resolveMembershipTarget(PaymentOrderDTO dto) {
        AiMembershipPlanSku sku;
        if (StringUtils.hasText(dto.getSkuId())) {
            sku = skuMapper.selectById(parseLongId(dto.getSkuId(), "会员SKU格式不正确"));
        } else if (StringUtils.hasText(dto.getPlanId())) {
            Integer planId = parseLong(dto.getPlanId(), "会员套餐ID格式不正确");
            sku = skuMapper.selectOne(new LambdaQueryWrapper<AiMembershipPlanSku>()
                .eq(AiMembershipPlanSku::getPlanId, planId.longValue())
                .eq(AiMembershipPlanSku::getStatus, 1)
                .orderByAsc(AiMembershipPlanSku::getDisplayOrder)
                .last("LIMIT 1"));
        } else {
            throw new BusinessException("会员SKU不能为空");
        }
        if (sku == null || sku.getStatus() == null || sku.getStatus() != 1) {
            throw new BusinessException("会员SKU不存在或已下架");
        }
        AiMembershipPlan plan = planMapper.selectById(sku.getPlanId());
        if (plan == null || plan.getStatus() == null || plan.getStatus() != 1) {
            throw new BusinessException("会员套餐不存在或已下架");
        }
        return new MembershipOrderTarget(plan, sku);
    }

    private void assertPayableChange(MembershipChangeQuoteVO quote) {
        if ("downgrade".equals(quote.getChangeType())) {
            throw new BusinessException(ResultCode.CONFLICT, "降级无需支付，请使用到期降级接口");
        }
        if (quote.getPayableAmount() == null || quote.getPayableAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("会员订单金额必须大于0");
        }
    }

    private Long parseLongId(String value, String message) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException exception) {
            throw new BusinessException(message);
        }
    }

    private record MembershipOrderTarget(AiMembershipPlan plan, AiMembershipPlanSku sku) {
    }
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
