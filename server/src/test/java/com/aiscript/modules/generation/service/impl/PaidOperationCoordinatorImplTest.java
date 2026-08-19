package com.aiscript.modules.generation.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.generation.service.PaidOperationClaim;
import com.aiscript.modules.generation.service.PaidOperationCompletion;
import com.aiscript.modules.generation.service.PaidOperationFailure;
import com.aiscript.modules.generation.service.PaidOperationSpec;
import com.aiscript.modules.generation.service.PaidOperationStatus;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipPointService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Method;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@ExtendWith(MockitoExtension.class)
class PaidOperationCoordinatorImplTest {
    @Mock
    private AiGenerationTaskMapper taskMapper;
    @Mock
    private MembershipEntitlementService entitlementService;
    @Mock
    private MembershipPointService pointService;

    private PaidOperationCoordinatorImpl coordinator;

    @BeforeEach
    void setUp() {
        coordinator = new PaidOperationCoordinatorImpl(
            taskMapper, entitlementService, pointService, new ObjectMapper()
        );
    }

    @Test
    void claimShouldCreateTaskAndChargeExactlyOnce() {
        PaidOperationSpec spec = spec(12L);
        when(taskMapper.selectByIdempotencyKey(1, "paid:2:req-1")).thenReturn(null);
        when(entitlementService.getPointCost(1, 2, "script_generate")).thenReturn(12L);
        when(taskMapper.insert(any(AiGenerationTask.class))).thenAnswer(invocation -> {
            AiGenerationTask task = invocation.getArgument(0);
            task.setId(91);
            return 1;
        });
        when(taskMapper.markRunning(91, 1, 2)).thenReturn(1);

        PaidOperationClaim claim = coordinator.claim(spec);

        assertThat(claim.taskId()).isEqualTo(91);
        assertThat(claim.pointCost()).isEqualTo(12L);
        assertThat(claim.status()).isEqualTo(PaidOperationStatus.RUNNING);
        assertThat(claim.newlyClaimed()).isTrue();
        assertThat(claim.shouldExecute()).isTrue();
        verify(pointService).consumePoints(
            1, 2, 12L, "paid_charge:91", "script_generate", 91L, "生成脚本消耗💧"
        );
    }

    @Test
    void claimShouldAllowZeroCostWithoutPointTransaction() {
        PaidOperationSpec spec = spec(0L);
        when(taskMapper.selectByIdempotencyKey(1, "paid:2:req-1")).thenReturn(null);
        when(entitlementService.getPointCost(1, 2, "script_generate")).thenReturn(0L);
        when(taskMapper.insert(any(AiGenerationTask.class))).thenAnswer(invocation -> {
            AiGenerationTask task = invocation.getArgument(0);
            task.setId(92);
            return 1;
        });
        when(taskMapper.markRunning(92, 1, 2)).thenReturn(1);

        PaidOperationClaim claim = coordinator.claim(spec);

        assertThat(claim.pointCost()).isZero();
        verify(pointService, never()).consumePoints(
            any(), any(), any(Long.class), any(), any(), any(), any()
        );
    }

    @Test
    void claimShouldRejectStaleDisplayedCostBeforeCreatingTask() {
        when(taskMapper.selectByIdempotencyKey(1, "paid:2:req-1")).thenReturn(null);
        when(entitlementService.getPointCost(1, 2, "script_generate")).thenReturn(15L);

        assertThatThrownBy(() -> coordinator.claim(spec(12L)))
            .isInstanceOf(BusinessException.class)
            .hasMessage("水滴费用已更新，请重试")
            .extracting(error -> ((BusinessException) error).getResultCode())
            .isEqualTo(ResultCode.CONFLICT);
        verify(taskMapper, never()).insert(any(AiGenerationTask.class));
        verify(pointService, never()).consumePoints(
            any(), any(), any(Long.class), any(), any(), any(), any()
        );
    }

    @Test
    void replayShouldReturnStoredResultWithoutChargingAgain() {
        AiGenerationTask existing = paidTask("success", 12L, "hash-1");
        existing.setResultPayload("{\"scriptId\":7}");
        when(taskMapper.selectByIdempotencyKey(1, "paid:2:req-1")).thenReturn(existing);

        PaidOperationClaim replay = coordinator.claim(spec(999L));

        assertThat(replay.newlyClaimed()).isFalse();
        assertThat(replay.shouldExecute()).isFalse();
        assertThat(replay.status()).isEqualTo(PaidOperationStatus.SUCCESS);
        assertThat(replay.pointCost()).isEqualTo(12L);
        assertThat(replay.resultPayload()).isEqualTo("{\"scriptId\":7}");
        verify(entitlementService, never()).getPointCost(any(), any(), any());
        verify(pointService, never()).consumePoints(
            any(), any(), any(Long.class), any(), any(), any(), any()
        );
    }

    @Test
    void replayShouldRejectSameRequestNumberWithAnotherHash() {
        when(taskMapper.selectByIdempotencyKey(1, "paid:2:req-1"))
            .thenReturn(paidTask("running", 12L, "another-hash"));

        assertThatThrownBy(() -> coordinator.claim(spec(12L)))
            .isInstanceOf(BusinessException.class)
            .hasMessage("请求号已被不同的付费操作使用")
            .extracting(error -> ((BusinessException) error).getResultCode())
            .isEqualTo(ResultCode.CONFLICT);
    }

    @Test
    void completeShouldPersistResultInRequiredTransaction() {
        AiGenerationTask task = paidTask("running", 12L, "hash-1");
        when(taskMapper.selectOwnedTaskForUpdate(91, 1, 2)).thenReturn(task);
        when(taskMapper.markSuccess(91, 1, 2, "{\"scriptId\":7}")).thenReturn(1);

        PaidOperationClaim completed = coordinator.complete(
            new PaidOperationCompletion(91, 1, 2, "{ \"scriptId\" : 7 }")
        );

        assertThat(completed.status()).isEqualTo(PaidOperationStatus.SUCCESS);
        assertThat(completed.resultPayload()).isEqualTo("{\"scriptId\":7}");
    }

    @Test
    void failShouldCompareAndSetThenRefundOnlyOnce() {
        AiGenerationTask task = paidTask("running", 12L, "hash-1");
        when(taskMapper.selectOwnedTaskForUpdate(91, 1, 2)).thenReturn(task);
        when(taskMapper.markFailed(91, 1, 2, "LLM_ERROR", "供应商失败")).thenReturn(1);

        PaidOperationClaim failed = coordinator.failAndRefund(
            new PaidOperationFailure(91, 1, 2, "LLM_ERROR", "供应商失败")
        );

        assertThat(failed.status()).isEqualTo(PaidOperationStatus.FAILED);
        verify(pointService).grantPoints(
            1, 2, 12L, "refund", "paid_refund:91", "script_generate", 91L,
            null, "生成脚本失败退回💧"
        );

        clearInvocations(pointService);
        task.setStatus("failed");
        PaidOperationClaim replay = coordinator.failAndRefund(
            new PaidOperationFailure(91, 1, 2, "LLM_ERROR", "供应商失败")
        );
        assertThat(replay.status()).isEqualTo(PaidOperationStatus.FAILED);
        verify(pointService, never()).grantPoints(
            any(), any(), any(Long.class), any(), any(), any(), any(), any(), any()
        );
    }

    @Test
    void transactionBoundariesShouldMatchCoordinatorContract() throws Exception {
        Method claim = PaidOperationCoordinatorImpl.class.getMethod("claim", PaidOperationSpec.class);
        Method complete = PaidOperationCoordinatorImpl.class.getMethod(
            "complete", PaidOperationCompletion.class
        );
        Method fail = PaidOperationCoordinatorImpl.class.getMethod(
            "failAndRefund", PaidOperationFailure.class
        );

        assertThat(claim.getAnnotation(Transactional.class).propagation())
            .isEqualTo(Propagation.REQUIRES_NEW);
        assertThat(complete.getAnnotation(Transactional.class).propagation())
            .isEqualTo(Propagation.REQUIRED);
        assertThat(fail.getAnnotation(Transactional.class).propagation())
            .isEqualTo(Propagation.REQUIRES_NEW);
    }

    private PaidOperationSpec spec(long expectedCost) {
        return new PaidOperationSpec(
            1, 2, 3, "script_generate", "paid_script_generate", "生成脚本",
            "req-1", "hash-1", expectedCost
        );
    }

    private AiGenerationTask paidTask(String status, long pointCost, String requestHash) {
        AiGenerationTask task = new AiGenerationTask();
        task.setId(91);
        task.setTenantId(1);
        task.setCreateBy(2);
        task.setTaskType("paid_script_generate");
        task.setTaskLabel("生成脚本");
        task.setStatus(status);
        task.setInputPayload("""
            {"requestNo":"req-1","requestHash":"%s","operationCode":"script_generate",\
             "taskType":"paid_script_generate","pointCost":%d,"userId":2}
            """.formatted(requestHash, pointCost));
        return task;
    }
}
