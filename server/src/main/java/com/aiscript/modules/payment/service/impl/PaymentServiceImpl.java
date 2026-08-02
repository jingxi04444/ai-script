package com.aiscript.modules.payment.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.IdUtils;
import com.aiscript.config.PaymentProperties;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.common.api.ResultCode;
import com.aiscript.integration.pay.PayClient;
import com.aiscript.integration.pay.PayClientRouter;
import com.aiscript.integration.pay.PayCreateRequest;
import com.aiscript.integration.pay.PayCreateResponse;
import com.aiscript.integration.pay.PayContractSignRequest;
import com.aiscript.integration.pay.PayContractSignResponse;
import com.aiscript.integration.pay.PayContractTerminateRequest;
import com.aiscript.integration.pay.PayNotifyMessage;
import com.aiscript.integration.pay.PayQueryResponse;
import com.aiscript.security.LoginUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.entity.AiMembershipPlanSku;
import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.mapper.AiUserSubscriptionMapper;
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
import com.aiscript.modules.payment.entity.AiUserPayContract;
import com.aiscript.modules.payment.entity.AiQuotaAccount;
import com.aiscript.modules.payment.entity.AiQuotaTransaction;
import com.aiscript.modules.payment.mapper.AiPaymentCallbackMapper;
import com.aiscript.modules.payment.mapper.AiPaymentOrderMapper;
import com.aiscript.modules.payment.mapper.AiUserPayContractMapper;
import com.aiscript.modules.payment.mapper.AiQuotaAccountMapper;
import com.aiscript.modules.payment.mapper.AiQuotaTransactionMapper;
import com.aiscript.modules.payment.service.PaymentService;
import com.aiscript.modules.payment.vo.QuotaVO;
import com.aiscript.modules.payment.vo.PaymentOrderVO;
import com.aiscript.modules.payment.vo.PaymentParamsVO;
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
    private final AiUserSubscriptionMapper subscriptionMapper;
    private final MembershipSubscriptionService membershipSubscriptionService;
    private final MembershipEntitlementService membershipEntitlementService;
    private final MembershipPointService membershipPointService;
    private final PayClientRouter payClientRouter;
    private final AiPaymentCallbackMapper callbackMapper;
    private final AiQuotaAccountMapper quotaAccountMapper;
    private final AiQuotaTransactionMapper quotaTransactionMapper;
    private final AiUserPayContractMapper contractMapper;
    private final ObjectMapper objectMapper;
    private final PaymentProperties paymentProperties;

    public PaymentServiceImpl(
        AiPaymentOrderMapper orderMapper,
        AiMembershipPlanMapper planMapper,
        AiMembershipPlanSkuMapper skuMapper,
        AiUserSubscriptionMapper subscriptionMapper,
        MembershipSubscriptionService membershipSubscriptionService,
        MembershipEntitlementService membershipEntitlementService,
        MembershipPointService membershipPointService,
        PayClientRouter payClientRouter,
        AiPaymentCallbackMapper callbackMapper,
        AiQuotaAccountMapper quotaAccountMapper,
        AiQuotaTransactionMapper quotaTransactionMapper,
        AiUserPayContractMapper contractMapper,
        ObjectMapper objectMapper,
        PaymentProperties paymentProperties
    ) {
        this.orderMapper = orderMapper;
        this.planMapper = planMapper;
        this.skuMapper = skuMapper;
        this.subscriptionMapper = subscriptionMapper;
        this.membershipSubscriptionService = membershipSubscriptionService;
        this.membershipEntitlementService = membershipEntitlementService;
        this.membershipPointService = membershipPointService;
        this.payClientRouter = payClientRouter;
        this.callbackMapper = callbackMapper;
        this.quotaAccountMapper = quotaAccountMapper;
        this.quotaTransactionMapper = quotaTransactionMapper;
        this.contractMapper = contractMapper;
        this.objectMapper = objectMapper;
        this.paymentProperties = paymentProperties;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO recharge(PaymentOrderDTO dto) {
        throw new BusinessException(ResultCode.CONFLICT, "余额充值已下线");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO memberOrder(PaymentOrderDTO dto) {
        if (dto == null) {
            throw new BusinessException("支付参数不能为空");
        }
        MembershipOrderTarget target = resolveMembershipTarget(dto);
        boolean autoRenewSku = isAutoRenewSku(target.sku());
        MembershipChangeQuoteVO quote = membershipSubscriptionService.quote(
            currentTenantId(), currentUserId(), target.sku().getId()
        );
        assertPayableChange(quote);
        PaymentOrderVO vo = createOrder(
            "member", dto.getPayMethod(), quote.getPayableAmount(),
            "会员订阅-" + target.sku().getSkuName(), target.plan().getId(),
            target.sku().getId(), quote.getChangeType(), dto.getIdempotencyKey(),
            toJson(Map.of("plan", target.plan(), "sku", target.sku(), "quote", quote))
        );
        if (autoRenewSku) {
            attachAutoDeductContractSign(vo, dto, target, quote);
        }
        return vo;
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
        return created;
    }

    private void attachAutoDeductContractSign(PaymentOrderVO vo, PaymentOrderDTO dto, MembershipOrderTarget target, MembershipChangeQuoteVO quote) {
        String channel = autoDeductChannel(dto.getPayMethod());
        String outContractCode = "CONTRACT" + IdUtils.nextId();
        PayContractSignRequest request = new PayContractSignRequest();
        request.setChannel(StringUtils.hasText(dto.getContractChannel()) ? dto.getContractChannel() : defaultContractChannel(channel));
        request.setPlanId("wechat_auto_deduct".equals(channel) ? paymentProperties.getWechat().getAutoDeduct().getPlanId() : paymentProperties.getAlipay().getAutoDeduct().getProductCode());
        request.setOutContractCode(outContractCode);
        request.setContractDisplayAccount("user:" + currentUserId());
        request.setContractNotifyUrl("wechat_auto_deduct".equals(channel) ? paymentProperties.getWechat().getAutoDeduct().getContractNotifyUrl() : paymentProperties.getAlipay().getAutoDeduct().getContractNotifyUrl());
        request.setOpenid(dto.getOpenid());
        request.setEstimatedDeductAmount(quote.getPayableAmount());
        PayContractSignResponse sign = payClientRouter.route(channel, channel).createContractSign(request);
        AiUserPayContract contract = new AiUserPayContract();
        contract.setTenantId(currentTenantId() == null ? DEFAULT_TENANT_ID.longValue() : currentTenantId().longValue());
        contract.setUserId(currentUserId().longValue());
        contract.setChannel(channel);
        contract.setPlanId(request.getPlanId());
        contract.setContractCode(outContractCode);
        contract.setStatus("pending");
        contract.setNotifyUrl(request.getContractNotifyUrl());
        contract.setExtraJson(sign.getRawPayload());
        contractMapper.insert(contract);
        vo.setContractCode(outContractCode);
        vo.setPreEntrustwebId(sign.getPreEntrustwebId());
        vo.setContractRedirectUrl(sign.getRedirectUrl());
        vo.setContractFormHtml(sign.getFormHtml());
    }

    private String autoDeductChannel(String payMethod) {
        if ("alipay".equalsIgnoreCase(payMethod) || "alipay_scan".equalsIgnoreCase(payMethod)) return "alipay_auto_deduct";
        if ("wechat".equalsIgnoreCase(payMethod) || "wechat_native".equalsIgnoreCase(payMethod)) return "wechat_auto_deduct";
        throw new BusinessException(ResultCode.CONFLICT, "连续订阅套餐仅支持微信或支付宝自动续费签约");
    }

    private String defaultContractChannel(String channel) {
        return "alipay_auto_deduct".equals(channel) ? "QRCODE" : "h5";
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
        try { if ("member".equals(order.getOrderType())) membershipSubscriptionService.fulfillPaidOrder(order); else if ("point".equals(order.getOrderType())) fulfillPointPurchase(order); order.setFulfillStatus("success"); order.setFulfillTime(LocalDateTime.now()); }
        catch (Exception ex) { order.setFulfillStatus("failed"); order.setFulfillError(ex.getMessage()); throw ex; }
        finally { orderMapper.updateById(order); }
        cb.setHandleResult("success"); saveCallback(cb); return toOrderVO(order, null);
    }

    private boolean isAutoRenewSku(AiMembershipPlanSku sku) {
        return sku != null && "auto_renew".equalsIgnoreCase(sku.getBillingMode());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentOrderVO renewMembershipSubscription(
        Integer tenantId,
        Integer userId,
        Long subscriptionId,
        Long skuId,
        LocalDateTime renewalDueTime,
        String idempotencyKey
    ) {
        if (userId == null || subscriptionId == null || skuId == null) {
            throw new BusinessException("续费参数不完整");
        }
        AiPaymentOrder existing = findOrderByIdempotency(userId, idempotencyKey);
        if (existing != null) {
            return toOrderVO(existing, null);
        }
        AiUserSubscription subscription = subscriptionMapper.selectById(subscriptionId);
        if (subscription == null || !StringUtils.hasText(subscription.getAgreementNo())) {
            throw new BusinessException(ResultCode.CONFLICT, "用户未签约自动续费协议");
        }
        AiUserPayContract contract = contractMapper.selectOne(new LambdaQueryWrapper<AiUserPayContract>()
            .eq(AiUserPayContract::getUserId, userId.longValue())
            .eq(AiUserPayContract::getStatus, "signed")
            .eq(AiUserPayContract::getContractId, subscription.getAgreementNo())
            .last("LIMIT 1"));
        if (contract == null) {
            throw new BusinessException(ResultCode.CONFLICT, "用户未签约自动续费协议");
        }
        AiMembershipPlanSku sku = skuMapper.selectById(skuId);
        if (sku == null || sku.getStatus() == null || sku.getStatus() != 1) {
            throw new BusinessException("会员SKU不存在或已下架");
        }
        AiMembershipPlan plan = planMapper.selectById(sku.getPlanId());
        if (plan == null) {
            throw new BusinessException("会员套餐不存在");
        }
        PaymentOrderVO created = createOrderForUser(
            tenantId, userId, "member", contract.getChannel(), sku.getPrice() == null ? BigDecimal.ZERO : sku.getPrice(),
            "会员自动续费-" + sku.getSkuName(), plan.getId(), sku.getId(), subscriptionId,
            "renewal", idempotencyKey, toJson(Map.of("plan", plan, "sku", sku, "renewalDueTime", renewalDueTime))
        );
        AiPaymentOrder order = findOrder(created.getOrderNo());
        PayCreateRequest request = new PayCreateRequest(); request.setProvider(contract.getChannel()); request.setPayMethod(contract.getChannel()); request.setOrderNo(order.getOrderNo()); request.setAmount(order.getAmount()); request.setSubject(order.getSubject()); request.setContractId(contract.getContractId());
        PayCreateResponse response = payClientRouter.route(contract.getChannel(), contract.getChannel()).createDeductOrder(request);
        order.setProvider(contract.getChannel()); order.setProviderTradeNo(response.getProviderTradeNo()); order.setProviderStatus("ACCEPTED");
        orderMapper.updateById(order);
        return toOrderVO(order, null);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void handleContractNotify(PayNotifyMessage msg) {
        String channel = StringUtils.hasText(msg.getProvider()) ? msg.getProvider() : "wechat_auto_deduct";
        AiUserPayContract contract = findContractByNotify(msg, channel);
        if (contract == null) return;
        String changeType = msg.getParams().get("change_type");
        String notifyType = msg.getParams().get("notify_type");
        boolean signed = "ADD".equalsIgnoreCase(changeType) || "dut_user_sign".equalsIgnoreCase(notifyType);
        boolean terminated = "DELETE".equalsIgnoreCase(changeType) || "dut_user_unsign".equalsIgnoreCase(notifyType);
        if (signed) {
            String contractId = firstText(msg.getParams().get("contract_id"), msg.getParams().get("agreement_no"));
            contract.setStatus("signed"); contract.setContractId(contractId); contract.setSignedTime(LocalDateTime.now()); contractMapper.updateById(contract);
            AiUserSubscription sub = subscriptionMapper.selectActiveByUserForUpdate(contract.getUserId());
            if (sub != null) { sub.setAgreementNo(contract.getContractId()); sub.setAutoRenew(1); sub.setProvider(contract.getChannel()); subscriptionMapper.updateById(sub); }
        } else if (terminated) {
            contract.setStatus("terminated"); contract.setTerminatedTime(LocalDateTime.now()); contract.setTerminateMode(channel); contractMapper.updateById(contract);
            AiUserSubscription sub = subscriptionMapper.selectActiveByUserForUpdate(contract.getUserId());
            if (sub != null && (contract.getContractId() == null || contract.getContractId().equals(sub.getAgreementNo()))) {
                sub.setAutoRenew(0); sub.setAgreementNo(null); subscriptionMapper.updateById(sub);
                membershipEntitlementService.clearEntitlementCache(sub.getTenantId() == null ? null : Math.toIntExact(sub.getTenantId()), Math.toIntExact(sub.getUserId()));
            }
        }
    }

    private AiUserPayContract findContractByNotify(PayNotifyMessage msg, String channel) {
        String code = msg.getParams().get("out_contract_code");
        if (StringUtils.hasText(code)) {
            AiUserPayContract contract = contractMapper.selectOne(new LambdaQueryWrapper<AiUserPayContract>().eq(AiUserPayContract::getContractCode, code).eq(AiUserPayContract::getChannel, channel).last("LIMIT 1"));
            if (contract != null) return contract;
        }
        String contractId = firstText(msg.getParams().get("contract_id"), msg.getParams().get("agreement_no"));
        if (StringUtils.hasText(contractId)) {
            return contractMapper.selectOne(new LambdaQueryWrapper<AiUserPayContract>().eq(AiUserPayContract::getContractId, contractId).eq(AiUserPayContract::getChannel, channel).last("LIMIT 1"));
        }
        return null;
    }

    private String firstText(String... values) {
        for (String value : values) if (StringUtils.hasText(value)) return value;
        return null;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void cancelWechatAutoRenew() {
        Integer userId = currentUserId();
        AiUserPayContract contract = contractMapper.selectOne(new LambdaQueryWrapper<AiUserPayContract>().eq(AiUserPayContract::getUserId, userId.longValue()).in(AiUserPayContract::getChannel, "wechat_auto_deduct", "alipay_auto_deduct").eq(AiUserPayContract::getStatus, "signed").last("LIMIT 1"));
        if (contract == null) throw new BusinessException("未找到有效自动续费协议");
        PayContractTerminateRequest request = new PayContractTerminateRequest(); request.setPlanId(contract.getPlanId()); request.setOutContractCode(contract.getContractCode()); request.setContractId(contract.getContractId());
        payClientRouter.route(contract.getChannel(), contract.getChannel()).terminateContract(request);
        contract.setStatus("terminated"); contract.setTerminatedTime(LocalDateTime.now()); contract.setTerminateMode("user"); contractMapper.updateById(contract);
        AiUserSubscription sub = subscriptionMapper.selectActiveByUserForUpdate(userId.longValue());
        if (sub != null) { sub.setAutoRenew(0); sub.setAgreementNo(null); subscriptionMapper.updateById(sub); membershipEntitlementService.clearEntitlementCache(sub.getTenantId() == null ? null : Math.toIntExact(sub.getTenantId()), Math.toIntExact(sub.getUserId())); }
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
        return createOrderForUser(currentTenantId(), userId, type, payMethod, amount, subject, planId, skuId, null, orderScene, idempotencyKey, snapshot);
    }

    private PaymentOrderVO createOrderForUser(Integer tenantId, Integer userId, String type, String payMethod, BigDecimal amount, String subject, Integer planId, Long skuId, Long subscriptionId, String orderScene, String idempotencyKey, String snapshot) {
        if (StringUtils.hasText(idempotencyKey)) {
            AiPaymentOrder existing = findOrderByIdempotency(userId, idempotencyKey);
            if (existing != null) {
                return toOrderVO(existing, null);
            }
        }

        AiPaymentOrder order = new AiPaymentOrder();
        order.setTenantId(tenantId == null ? DEFAULT_TENANT_ID : tenantId);
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
        order.setSubscriptionId(subscriptionId);
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

    private AiPaymentOrder findOrderByIdempotency(Integer userId, String idempotencyKey) {
        if (!StringUtils.hasText(idempotencyKey)) return null;
        return orderMapper.selectOne(new LambdaQueryWrapper<AiPaymentOrder>()
            .eq(AiPaymentOrder::getUserId, userId)
            .eq(AiPaymentOrder::getIdempotencyKey, idempotencyKey)
            .last("LIMIT 1"));
    }

    private void markSubscriptionPastDue(Long subscriptionId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime graceEnd = now.plusHours(72);
        AiUserSubscription subscription = subscriptionMapper.selectById(subscriptionId);
        if (subscription != null && subscription.getCurrentPeriodEnd() != null) {
            graceEnd = subscription.getCurrentPeriodEnd().plusHours(72);
        }
        subscriptionMapper.update(null, new LambdaUpdateWrapper<AiUserSubscription>()
            .eq(AiUserSubscription::getId, subscriptionId)
            .set(AiUserSubscription::getStatus, "past_due")
            .set(AiUserSubscription::getNextRenewTime, null)
            .set(AiUserSubscription::getGraceEndTime, graceEnd));
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
        membershipEntitlementService.clearEntitlementCache(order.getTenantId(), order.getUserId());
    }
    private void saveCallback(AiPaymentCallback callback) {
        try { callbackMapper.insert(callback); } catch (DuplicateKeyException ignored) { }
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
