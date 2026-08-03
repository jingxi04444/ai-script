package com.aiscript.modules.payment.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.IdUtils;
import com.aiscript.integration.pay.PayClient;
import com.aiscript.integration.pay.PayClientRouter;
import com.aiscript.integration.pay.PayRefundRequest;
import com.aiscript.integration.pay.PayRefundResponse;
import com.aiscript.modules.membership.entity.AiMembershipPlanSku;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.service.MembershipSubscriptionService;
import com.aiscript.modules.payment.dto.RefundQueryDTO;
import com.aiscript.modules.payment.entity.AiPaymentOrder;
import com.aiscript.modules.payment.entity.AiRefundOrder;
import com.aiscript.modules.payment.mapper.AiPaymentOrderMapper;
import com.aiscript.modules.payment.mapper.AiRefundOrderMapper;
import com.aiscript.modules.payment.service.PaymentRefundService;
import com.aiscript.modules.payment.vo.RefundOrderVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

@Service
@Slf4j
public class PaymentRefundServiceImpl implements PaymentRefundService {
    private final AiRefundOrderMapper refundMapper;
    private final AiPaymentOrderMapper paymentOrderMapper;
    private final AiMembershipPlanSkuMapper skuMapper;
    private final PayClientRouter payClientRouter;
    private final MembershipSubscriptionService subscriptionService;
    private final TransactionTemplate transactionTemplate;

    public PaymentRefundServiceImpl(
        AiRefundOrderMapper refundMapper,
        AiPaymentOrderMapper paymentOrderMapper,
        AiMembershipPlanSkuMapper skuMapper,
        PayClientRouter payClientRouter,
        MembershipSubscriptionService subscriptionService
        , PlatformTransactionManager transactionManager
    ) {
        this.refundMapper = refundMapper;
        this.paymentOrderMapper = paymentOrderMapper;
        this.skuMapper = skuMapper;
        this.payClientRouter = payClientRouter;
        this.subscriptionService = subscriptionService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RefundOrderVO requestRefund(
        Integer tenantId,
        Integer userId,
        String orderNo,
        String reason
    ) {
        AiPaymentOrder order = paymentOrderMapper.selectOne(new LambdaQueryWrapper<AiPaymentOrder>()
            .eq(AiPaymentOrder::getOrderNo, orderNo)
            .eq(AiPaymentOrder::getUserId, userId)
            .last("LIMIT 1"));
        if (order == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "会员订单不存在");
        }
        validateRefundable(order);
        AiRefundOrder existing = refundMapper.selectOne(new LambdaQueryWrapper<AiRefundOrder>()
            .eq(AiRefundOrder::getPaymentOrderId, order.getId().longValue())
            .last("LIMIT 1"));
        if (existing != null) {
            return toVO(existing, order);
        }

        BigDecimal paid = order.getPaidAmount() == null ? order.getAmount() : order.getPaidAmount();
        BigDecimal refunded = order.getRefundAmount() == null ? BigDecimal.ZERO : order.getRefundAmount();
        AiRefundOrder refund = new AiRefundOrder();
        refund.setTenantId(tenantId == null ? null : tenantId.longValue());
        refund.setRefundNo("RF" + IdUtils.nextId());
        refund.setPaymentOrderId(order.getId().longValue());
        refund.setSubscriptionId(order.getSubscriptionId());
        refund.setUserId(userId.longValue());
        refund.setRefundAmount(paid.subtract(refunded));
        refund.setRefundReason(StringUtils.hasText(reason) ? reason : "用户申请会员退款");
        refund.setProvider(order.getProvider());
        refund.setStatus("pending");
        refund.setRequestedTime(LocalDateTime.now());
        try {
            refundMapper.insert(refund);
        } catch (DuplicateKeyException duplicate) {
            AiRefundOrder concurrent = refundMapper.selectOne(new LambdaQueryWrapper<AiRefundOrder>()
                .eq(AiRefundOrder::getPaymentOrderId, order.getId().longValue())
                .last("LIMIT 1"));
            if (concurrent == null) {
                throw duplicate;
            }
            return toVO(concurrent, order);
        }
        return toVO(refund, order);
    }

    @Override
    public PageResult<RefundOrderVO> myRefunds(Integer userId, RefundQueryDTO query) {
        return refundPage(userId.longValue(), query);
    }

    @Override
    public PageResult<RefundOrderVO> adminRefunds(RefundQueryDTO query) {
        Long userId = null;
        if (StringUtils.hasText(query.getUserId())) {
            try {
                userId = Long.valueOf(query.getUserId());
            } catch (NumberFormatException exception) {
                throw new BusinessException("用户ID格式不正确");
            }
        }
        return refundPage(userId, query);
    }

    @Override
    public RefundOrderVO review(
        String refundNo,
        boolean approved,
        String remark,
        Integer reviewerId
    ) {
        AiRefundOrder refund = requireRefund(refundNo);
        if (!"pending".equals(refund.getStatus())) {
            throw new BusinessException(ResultCode.CONFLICT, "退款申请已处理，请勿重复审核");
        }
        LocalDateTime now = LocalDateTime.now();
        if (!approved) {
            refund.setStatus("rejected");
            refund.setReviewBy(reviewerId == null ? null : reviewerId.longValue());
            refund.setReviewTime(now);
            refund.setReviewRemark(remark);
            refundMapper.updateById(refund);
            return toVO(refund, paymentOrderMapper.selectById(refund.getPaymentOrderId()));
        }

        int claimed = refundMapper.update(null, new LambdaUpdateWrapper<AiRefundOrder>()
            .eq(AiRefundOrder::getId, refund.getId())
            .eq(AiRefundOrder::getStatus, "pending")
            .set(AiRefundOrder::getStatus, "processing")
            .set(AiRefundOrder::getReviewBy, reviewerId == null ? null : reviewerId.longValue())
            .set(AiRefundOrder::getReviewTime, now)
            .set(AiRefundOrder::getReviewRemark, remark));
        if (claimed == 0) {
            throw new BusinessException(ResultCode.CONFLICT, "退款申请正在处理");
        }
        refund = requireRefund(refundNo);
        executeRefund(refund);
        return toVO(requireRefund(refundNo), paymentOrderMapper.selectById(refund.getPaymentOrderId()));
    }

    @Override
    public RefundOrderVO refresh(String refundNo) {
        AiRefundOrder refund = requireRefund(refundNo);
        if ("completed".equals(refund.getStatus()) || "rejected".equals(refund.getStatus())) {
            return toVO(refund, paymentOrderMapper.selectById(refund.getPaymentOrderId()));
        }
        if (!"processing".equals(refund.getStatus()) && !"failed".equals(refund.getStatus())) {
            throw new BusinessException(ResultCode.CONFLICT, "当前退款状态不允许刷新");
        }
        boolean retryFailedRefund = "failed".equals(refund.getStatus());
        refund.setStatus("processing");
        refund.setFailureReason(null);
        refundMapper.updateById(refund);
        if (retryFailedRefund) {
            executeRefund(refund);
        } else {
            queryRefund(refund);
        }
        return toVO(requireRefund(refundNo), paymentOrderMapper.selectById(refund.getPaymentOrderId()));
    }

    private PageResult<RefundOrderVO> refundPage(Long userId, RefundQueryDTO query) {
        IPage<RefundOrderVO> page = refundMapper.selectRefundPage(
            new Page<>(query.getPage(), query.getPageSize()),
            userId,
            query.getStatus(),
            query.getKeyword()
        );
        return new PageResult<>(
            page.getRecords(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages()
        );
    }

    private void validateRefundable(AiPaymentOrder order) {
        if (!"member".equals(order.getOrderType())
            || !"paid".equals(order.getStatus())
            || !"success".equals(order.getFulfillStatus())) {
            throw new BusinessException("只有已支付并履约成功的会员订单可以退款");
        }
        if (order.getSkuId() == null || order.getPayTime() == null) {
            throw new BusinessException("会员订单缺少SKU或支付时间，无法判断退款窗口");
        }
        AiMembershipPlanSku sku = skuMapper.selectById(order.getSkuId());
        if (sku == null || sku.getRefundDays() == null || sku.getRefundDays() <= 0) {
            throw new BusinessException("该会员SKU不支持退款");
        }
        if (LocalDateTime.now().isAfter(order.getPayTime().plusDays(sku.getRefundDays()))) {
            throw new BusinessException("已超过该套餐的退款申请期限");
        }
        BigDecimal paid = order.getPaidAmount() == null ? order.getAmount() : order.getPaidAmount();
        BigDecimal refunded = order.getRefundAmount() == null ? BigDecimal.ZERO : order.getRefundAmount();
        if (paid == null || paid.subtract(refunded).compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("该会员订单已全部退款");
        }
    }

    private void executeRefund(AiRefundOrder refund) {
        AiPaymentOrder order = paymentOrderMapper.selectById(refund.getPaymentOrderId());
        if (order == null) {
            fail(refund, "原支付订单不存在");
            return;
        }
        try {
            PayRefundRequest request = buildRefundRequest(order, refund);
            PayClient client = payClientRouter.route(order.getProvider(), order.getPayMethod());
            PayRefundResponse response = client.refund(request);
            applyRefundResponse(order, refund, response);
        } catch (Exception exception) {
            fail(refund, exception.getMessage());
            if (exception instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new BusinessException("退款渠道调用失败");
        }
    }

    private void queryRefund(AiRefundOrder refund) {
        AiPaymentOrder order = paymentOrderMapper.selectById(refund.getPaymentOrderId());
        if (order == null) {
            fail(refund, "原支付订单不存在");
            return;
        }
        try {
            PayClient client = payClientRouter.route(order.getProvider(), order.getPayMethod());
            PayRefundResponse response = client.queryRefund(buildRefundRequest(order, refund));
            applyRefundResponse(order, refund, response);
        } catch (Exception exception) {
            log.warn("退款结果查询失败，保持处理中状态, refundNo={}, orderId={}",
                refund.getRefundNo(), refund.getPaymentOrderId(), exception);
            refund.setStatus("processing");
            refund.setFailureReason("退款结果暂未确认，请稍后重新查询");
            refundMapper.updateById(refund);
        }
    }

    private PayRefundRequest buildRefundRequest(AiPaymentOrder order, AiRefundOrder refund) {
        PayRefundRequest request = new PayRefundRequest();
        request.setOrderNo(order.getOrderNo());
        request.setProviderTradeNo(order.getProviderTradeNo());
        request.setRefundNo(refund.getRefundNo());
        request.setRefundAmount(refund.getRefundAmount());
        request.setTotalAmount(order.getPaidAmount() == null ? order.getAmount() : order.getPaidAmount());
        request.setReason(refund.getRefundReason());
        return request;
    }

    private void applyRefundResponse(
        AiPaymentOrder order,
        AiRefundOrder refund,
        PayRefundResponse response
    ) {
        refund.setProviderRefundNo(response.getProviderRefundNo());
        refund.setProviderStatus(response.getStatus());
        refund.setFailureReason(null);
        if (response.isSuccess()) {
            completeRefund(order, refund, response.getStatus(), response.getProviderRefundNo());
            return;
        }
        refund.setStatus("processing");
        refundMapper.updateById(refund);
    }

    private void completeRefund(
        AiPaymentOrder order,
        AiRefundOrder refund,
        String providerStatus,
        String providerRefundNo
    ) {
        transactionTemplate.executeWithoutResult(status ->
            completeRefundData(order, refund, providerStatus, providerRefundNo)
        );
    }

    private void completeRefundData(
        AiPaymentOrder order,
        AiRefundOrder refund,
        String providerStatus,
        String providerRefundNo
    ) {
        BigDecimal previous = order.getRefundAmount() == null ? BigDecimal.ZERO : order.getRefundAmount();
        order.setRefundAmount(previous.add(refund.getRefundAmount()));
        BigDecimal paid = order.getPaidAmount() == null ? order.getAmount() : order.getPaidAmount();
        if (order.getRefundAmount().compareTo(paid) >= 0) {
            order.setStatus("refunded");
        }
        paymentOrderMapper.updateById(order);

        refund.setProviderStatus(providerStatus);
        refund.setProviderRefundNo(providerRefundNo);
        refund.setStatus("completed");
        refund.setCompletedTime(LocalDateTime.now());
        refund.setFailureReason(null);
        refundMapper.updateById(refund);
        subscriptionService.revokeByRefund(order);
    }

    private void fail(AiRefundOrder refund, String reason) {
        refund.setStatus("failed");
        refund.setFailureReason(StringUtils.hasText(reason) ? reason : "退款渠道调用失败");
        refundMapper.updateById(refund);
    }

    private AiRefundOrder requireRefund(String refundNo) {
        AiRefundOrder refund = refundMapper.selectOne(new LambdaQueryWrapper<AiRefundOrder>()
            .eq(AiRefundOrder::getRefundNo, refundNo)
            .last("LIMIT 1"));
        if (refund == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "退款申请不存在");
        }
        return refund;
    }

    private RefundOrderVO toVO(AiRefundOrder refund, AiPaymentOrder order) {
        RefundOrderVO vo = new RefundOrderVO();
        vo.setId(String.valueOf(refund.getId()));
        vo.setRefundNo(refund.getRefundNo());
        vo.setPaymentOrderId(String.valueOf(refund.getPaymentOrderId()));
        vo.setPaymentOrderNo(order == null ? null : order.getOrderNo());
        vo.setSubscriptionId(refund.getSubscriptionId() == null ? null : String.valueOf(refund.getSubscriptionId()));
        vo.setUserId(String.valueOf(refund.getUserId()));
        vo.setRefundAmount(refund.getRefundAmount());
        vo.setRefundReason(refund.getRefundReason());
        vo.setProvider(refund.getProvider());
        vo.setProviderRefundNo(refund.getProviderRefundNo());
        vo.setProviderStatus(refund.getProviderStatus());
        vo.setStatus(refund.getStatus());
        vo.setReviewBy(refund.getReviewBy() == null ? null : String.valueOf(refund.getReviewBy()));
        vo.setReviewTime(format(refund.getReviewTime()));
        vo.setReviewRemark(refund.getReviewRemark());
        vo.setRequestedTime(format(refund.getRequestedTime()));
        vo.setCompletedTime(format(refund.getCompletedTime()));
        vo.setFailureReason(refund.getFailureReason());
        return vo;
    }

    private String format(LocalDateTime value) {
        return value == null ? null : value.toString();
    }
}
