package com.aiscript.modules.generation.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.generation.service.PaidOperationClaim;
import com.aiscript.modules.generation.service.PaidOperationCompletion;
import com.aiscript.modules.generation.service.PaidOperationCoordinator;
import com.aiscript.modules.generation.service.PaidOperationFailure;
import com.aiscript.modules.generation.service.PaidOperationSpec;
import com.aiscript.modules.generation.service.PaidOperationStatus;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipPointService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class PaidOperationCoordinatorImpl implements PaidOperationCoordinator {
    static final String STATUS_NEW = "pending";
    static final String STATUS_RUNNING = "running";
    static final String STATUS_SUCCESS = "success";
    static final String STATUS_FAILED = "failed";

    private static final int IDEMPOTENCY_KEY_LIMIT = 160;
    private static final int REQUEST_NO_LIMIT = 160;
    private static final int REQUEST_HASH_LIMIT = 160;

    private final AiGenerationTaskMapper taskMapper;
    private final MembershipEntitlementService entitlementService;
    private final MembershipPointService pointService;
    private final ObjectMapper objectMapper;

    public PaidOperationCoordinatorImpl(
        AiGenerationTaskMapper taskMapper,
        MembershipEntitlementService entitlementService,
        MembershipPointService pointService,
        ObjectMapper objectMapper
    ) {
        this.taskMapper = taskMapper;
        this.entitlementService = entitlementService;
        this.pointService = pointService;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public PaidOperationClaim claim(PaidOperationSpec spec) {
        validateSpec(spec);
        String idempotencyKey = idempotencyKey(spec.userId(), spec.requestNo());

        AiGenerationTask existing = taskMapper.selectByIdempotencyKey(spec.tenantId(), idempotencyKey);
        if (existing != null) {
            return replay(existing, spec);
        }

        long currentCost = entitlementService.getPointCost(
            spec.tenantId(), spec.userId(), spec.operationCode()
        );
        if (currentCost < 0) {
            throw new BusinessException("水滴费用配置不能小于 0");
        }
        if (currentCost != spec.expectedPointCost()) {
            throw new BusinessException(ResultCode.CONFLICT, "水滴费用已更新，请重试");
        }

        AiGenerationTask task = newTask(spec, idempotencyKey, currentCost);
        try {
            taskMapper.insert(task);
        } catch (DuplicateKeyException duplicate) {
            AiGenerationTask concurrent = taskMapper.selectByIdempotencyKeyForUpdate(
                spec.tenantId(), idempotencyKey
            );
            if (concurrent == null) {
                throw duplicate;
            }
            return replay(concurrent, spec);
        }

        String chargeRequestNo = chargeRequestNo(task.getId());
        if (currentCost > 0) {
            pointService.consumePoints(
                spec.tenantId(),
                spec.userId(),
                currentCost,
                chargeRequestNo,
                spec.operationCode(),
                task.getId().longValue(),
                paidRemark(spec.taskLabel(), "消耗")
            );
        }
        if (taskMapper.markRunning(task.getId(), spec.tenantId(), spec.userId()) != 1) {
            throw new BusinessException(ResultCode.CONFLICT, "付费操作状态已变化，请重试");
        }
        task.setStatus(STATUS_RUNNING);
        task.setProgress(1);
        return toClaim(task, currentCost, true);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED, rollbackFor = Exception.class)
    public PaidOperationClaim complete(PaidOperationCompletion completion) {
        return doComplete(completion);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public PaidOperationClaim failAndRefund(PaidOperationFailure failure) {
        validateOwner(failure.taskId(), failure.tenantId(), failure.userId());
        AiGenerationTask task = requireOwnedTaskForUpdate(
            failure.taskId(), failure.tenantId(), failure.userId()
        );
        PaidOperationEnvelope envelope = readEnvelope(task);
        validatePaidStatus(task.getStatus());

        if (STATUS_SUCCESS.equals(task.getStatus()) || STATUS_FAILED.equals(task.getStatus())) {
            return toClaim(task, envelope.pointCost(), false);
        }

        String errorCode = truncate(defaultIfBlank(failure.errorCode(), "OPERATION_FAILED"), 80);
        String errorMessage = truncate(defaultIfBlank(failure.errorMessage(), "付费操作执行失败"), 4000);
        if (taskMapper.markFailed(
            task.getId(), failure.tenantId(), failure.userId(), errorCode, errorMessage
        ) != 1) {
            throw new BusinessException(ResultCode.CONFLICT, "付费操作状态已变化，请重试");
        }

        if (envelope.pointCost() > 0) {
            pointService.grantPoints(
                failure.tenantId(),
                failure.userId(),
                envelope.pointCost(),
                "refund",
                refundRequestNo(task.getId()),
                envelope.operationCode(),
                task.getId().longValue(),
                null,
                paidRemark(task.getTaskLabel(), "失败退回")
            );
        }
        task.setStatus(STATUS_FAILED);
        task.setErrorCode(errorCode);
        task.setErrorMessage(errorMessage);
        return toClaim(task, envelope.pointCost(), false);
    }

    private PaidOperationClaim doComplete(PaidOperationCompletion completion) {
        validateOwner(completion.taskId(), completion.tenantId(), completion.userId());
        String resultPayload = normalizeResultPayload(completion.resultPayload());
        AiGenerationTask task = requireOwnedTaskForUpdate(
            completion.taskId(), completion.tenantId(), completion.userId()
        );
        PaidOperationEnvelope envelope = readEnvelope(task);
        validatePaidStatus(task.getStatus());

        if (STATUS_SUCCESS.equals(task.getStatus())) {
            return toClaim(task, envelope.pointCost(), false);
        }
        if (STATUS_FAILED.equals(task.getStatus())) {
            throw new BusinessException(ResultCode.CONFLICT, "付费操作已失败，不能标记为成功");
        }
        if (taskMapper.markSuccess(
            task.getId(), completion.tenantId(), completion.userId(), resultPayload
        ) != 1) {
            throw new BusinessException(ResultCode.CONFLICT, "付费操作状态已变化，请重试");
        }
        task.setStatus(STATUS_SUCCESS);
        task.setProgress(100);
        task.setResultPayload(resultPayload);
        return toClaim(task, envelope.pointCost(), false);
    }

    private AiGenerationTask newTask(
        PaidOperationSpec spec,
        String idempotencyKey,
        long pointCost
    ) {
        AiGenerationTask task = new AiGenerationTask();
        task.setTenantId(spec.tenantId());
        task.setProjectId(spec.projectId());
        task.setCreateBy(spec.userId());
        task.setUpdateBy(spec.userId());
        task.setTaskType(spec.taskType());
        task.setTaskLabel(spec.taskLabel());
        task.setStatus(STATUS_NEW);
        task.setProgress(0);
        task.setInputPayload(writeJson(new PaidOperationEnvelope(
            spec.requestNo(),
            spec.requestHash(),
            spec.operationCode(),
            spec.taskType(),
            pointCost,
            spec.userId()
        )));
        task.setIdempotencyKey(idempotencyKey);
        return task;
    }

    private PaidOperationClaim replay(AiGenerationTask task, PaidOperationSpec spec) {
        PaidOperationEnvelope envelope = readEnvelope(task);
        if (!spec.userId().equals(task.getCreateBy())
            || !spec.requestNo().equals(envelope.requestNo())
            || !spec.requestHash().equals(envelope.requestHash())
            || !spec.operationCode().equals(envelope.operationCode())
            || !spec.taskType().equals(envelope.taskType())) {
            throw new BusinessException(ResultCode.CONFLICT, "请求号已被不同的付费操作使用");
        }
        validatePaidStatus(task.getStatus());
        return toClaim(task, envelope.pointCost(), false);
    }

    private AiGenerationTask requireOwnedTaskForUpdate(Integer id, Integer tenantId, Integer userId) {
        AiGenerationTask task = taskMapper.selectOwnedTaskForUpdate(id, tenantId, userId);
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "付费操作不存在或无权访问");
        }
        return task;
    }

    private PaidOperationEnvelope readEnvelope(AiGenerationTask task) {
        try {
            PaidOperationEnvelope envelope = objectMapper.readValue(
                task.getInputPayload(), PaidOperationEnvelope.class
            );
            if (envelope.pointCost() < 0 || !StringUtils.hasText(envelope.operationCode())) {
                throw new BusinessException(ResultCode.CONFLICT, "付费操作记录不完整");
            }
            return envelope;
        } catch (JsonProcessingException | IllegalArgumentException exception) {
            throw new BusinessException(ResultCode.CONFLICT, "付费操作记录不完整");
        }
    }

    private String normalizeResultPayload(String payload) {
        if (!StringUtils.hasText(payload)) {
            throw new BusinessException("付费操作结果不能为空");
        }
        try {
            JsonNode result = objectMapper.readTree(payload);
            if (result == null) {
                throw new BusinessException("付费操作结果不能为空");
            }
            return objectMapper.writeValueAsString(result);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("付费操作结果必须是合法 JSON");
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new BusinessException("付费操作参数序列化失败");
        }
    }

    private void validateSpec(PaidOperationSpec spec) {
        if (spec == null) {
            throw new BusinessException("付费操作参数不能为空");
        }
        validateOwner(1, spec.tenantId(), spec.userId());
        requireText(spec.operationCode(), "付费操作编码不能为空", 80);
        requireText(spec.taskType(), "任务类型不能为空", 60);
        requireText(spec.requestNo(), "请求号不能为空", REQUEST_NO_LIMIT);
        requireText(spec.requestHash(), "请求摘要不能为空", REQUEST_HASH_LIMIT);
        if (spec.expectedPointCost() < 0) {
            throw new BusinessException("预期水滴费用不能小于 0");
        }
        if (spec.taskLabel() != null && spec.taskLabel().length() > 240) {
            throw new BusinessException("任务标题不能超过 240 个字符");
        }
    }

    private void validateOwner(Integer taskId, Integer tenantId, Integer userId) {
        if (taskId == null || taskId <= 0 || tenantId == null || tenantId <= 0
            || userId == null || userId <= 0) {
            throw new BusinessException("付费操作归属参数不完整");
        }
    }

    private void requireText(String value, String message, int maxLength) {
        if (!StringUtils.hasText(value)) {
            throw new BusinessException(message);
        }
        if (value.length() > maxLength) {
            throw new BusinessException(message.replace("不能为空", "过长"));
        }
    }

    private void validatePaidStatus(String status) {
        if (!STATUS_NEW.equals(status) && !STATUS_RUNNING.equals(status)
            && !STATUS_SUCCESS.equals(status) && !STATUS_FAILED.equals(status)) {
            throw new BusinessException(ResultCode.CONFLICT, "任务不是付费操作任务");
        }
    }

    private PaidOperationClaim toClaim(AiGenerationTask task, long pointCost, boolean newlyClaimed) {
        return new PaidOperationClaim(
            task.getId(), pointCost, PaidOperationStatus.fromPersistentValue(task.getStatus()),
            task.getResultPayload(), newlyClaimed
        );
    }

    private String idempotencyKey(Integer userId, String requestNo) {
        String raw = "paid:" + userId + ":" + requestNo;
        if (raw.length() <= IDEMPOTENCY_KEY_LIMIT) {
            return raw;
        }
        return "paid:" + userId + ":sha256:" + sha256(requestNo);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))
            );
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is not available", impossible);
        }
    }

    private String chargeRequestNo(Integer taskId) {
        return "paid_charge:" + taskId;
    }

    private String refundRequestNo(Integer taskId) {
        return "paid_refund:" + taskId;
    }

    private String paidRemark(String taskLabel, String action) {
        String label = StringUtils.hasText(taskLabel) ? taskLabel : "付费操作";
        return truncate(label + action + "💧", 500);
    }

    private String defaultIfBlank(String value, String fallback) {
        return StringUtils.hasText(value) ? value : fallback;
    }

    private String truncate(String value, int limit) {
        return value.length() <= limit ? value : value.substring(0, limit);
    }

    private record PaidOperationEnvelope(
        String requestNo,
        String requestHash,
        String operationCode,
        String taskType,
        long pointCost,
        Integer userId
    ) {
    }
}
