package com.aiscript.modules.membership.task;

import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.membership.service.MembershipTaskQuotaService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 补偿释放异步任务已终态但尚未释放的会员并发额度。
 * 正常执行链路仍应立即释放；这里负责进程重启、回调异常等场景的最终一致性。
 */
@Component
@Slf4j
public class MembershipTaskQuotaReconciliationTask {
    private static final List<String> TERMINAL_STATUSES = List.of(
        "success", "completed", "failed", "canceled", "cancelled"
    );

    private final AiGenerationTaskMapper taskMapper;
    private final MembershipTaskQuotaService taskQuotaService;

    public MembershipTaskQuotaReconciliationTask(
        AiGenerationTaskMapper taskMapper,
        MembershipTaskQuotaService taskQuotaService
    ) {
        this.taskMapper = taskMapper;
        this.taskQuotaService = taskQuotaService;
    }

    @Scheduled(fixedDelayString = "${aiscript.membership.task-quota-reconcile-delay-ms:60000}")
    public void releaseTerminalTaskReservations() {
        List<AiGenerationTask> tasks = taskMapper.selectList(new LambdaQueryWrapper<AiGenerationTask>()
            .in(AiGenerationTask::getStatus, TERMINAL_STATUSES)
            .isNotNull(AiGenerationTask::getQuotaRequestNo)
            .ne(AiGenerationTask::getQuotaRequestNo, "")
            .orderByAsc(AiGenerationTask::getId)
            .last("LIMIT 500"));
        for (AiGenerationTask task : tasks) {
            try {
                taskQuotaService.release(task.getQuotaRequestNo());
                taskMapper.update(null, new LambdaUpdateWrapper<AiGenerationTask>()
                    .eq(AiGenerationTask::getId, task.getId())
                    .eq(AiGenerationTask::getQuotaRequestNo, task.getQuotaRequestNo())
                    .set(AiGenerationTask::getQuotaRequestNo, null));
            } catch (RuntimeException exception) {
                log.warn("释放任务并发额度失败，taskId={}, requestNo={}",
                    task.getId(), task.getQuotaRequestNo(), exception);
            }
        }
    }
}
