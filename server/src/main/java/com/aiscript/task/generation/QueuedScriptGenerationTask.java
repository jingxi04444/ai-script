package com.aiscript.task.generation;

import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.generation.entity.AiScriptGenerationQueueItem;
import com.aiscript.modules.generation.mapper.AiScriptGenerationQueueItemMapper;
import com.aiscript.modules.notification.service.NotificationService;
import com.aiscript.modules.script.dto.GenerateScriptDTO;
import com.aiscript.modules.script.service.ScriptService;
import com.aiscript.modules.script.vo.ScriptVO;
import com.aiscript.security.LoginUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@Slf4j
public class QueuedScriptGenerationTask {
    private static final int ERROR_MESSAGE_LIMIT = 2000;

    private final AiScriptGenerationQueueItemMapper queueMapper;
    private final ScriptService scriptService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public QueuedScriptGenerationTask(
        AiScriptGenerationQueueItemMapper queueMapper,
        ScriptService scriptService,
        NotificationService notificationService,
        ObjectMapper objectMapper
    ) {
        this.queueMapper = queueMapper;
        this.scriptService = scriptService;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @Async("scriptQueueTaskExecutor")
    public void run(Long queueItemId) {
        AiScriptGenerationQueueItem item = queueMapper.selectById(queueItemId);
        if (item == null || !"running".equals(item.getStatus())) return;
        installUserContext(item);
        try {
            GenerateScriptDTO dto = objectMapper.readValue(item.getRequestPayload(), GenerateScriptDTO.class);
            ScriptVO script = scriptService.generate(dto);
            queueMapper.markSuccess(item.getId(), Integer.valueOf(script.getId()));
        } catch (Exception exception) {
            String errorMessage = StringUtils.hasText(exception.getMessage())
                ? exception.getMessage()
                : "脚本生成失败";
            queueMapper.markFailed(item.getId(), truncate(errorMessage));
            log.error("后台脚本生成失败，queueItemId={}", item.getId(), exception);
        } finally {
            SecurityContextHolder.clearContext();
            TenantContext.clear();
            notifyWhenBatchFinished(item);
        }
    }

    private void installUserContext(AiScriptGenerationQueueItem item) {
        LoginUser user = LoginUser.builder()
            .userId(item.getCreateBy())
            .tenantId(item.getTenantId())
            .account("script-queue-worker")
            .userType("user")
            .permissions(List.of())
            .build();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(user, null, List.of()));
        SecurityContextHolder.setContext(context);
        TenantContext.setTenantId(item.getTenantId());
    }

    private void notifyWhenBatchFinished(AiScriptGenerationQueueItem item) {
        if (queueMapper.countBatchActive(item.getBatchNo()) > 0) return;
        int success = queueMapper.countBatchStatus(item.getBatchNo(), "success");
        int failed = queueMapper.countBatchStatus(item.getBatchNo(), "failed");
        int canceled = queueMapper.countBatchStatus(item.getBatchNo(), "canceled");
        int total = success + failed + canceled;
        String title = failed == 0 ? "脚本批量生成已完成" : "脚本批量生成已结束";
        String content = failed == 0
            ? String.format("本批次 %d 条脚本已全部生成，可进入脚本列表逐条润色和审核。", success)
            : String.format("本批次共 %d 条：成功 %d 条，失败 %d 条，取消 %d 条。", total, success, failed, canceled);
        notificationService.sendOnce(
            item.getTenantId(), item.getCreateBy(), "system", "script_queue_batch",
            item.getBatchNo(), title, content
        );
    }

    private String truncate(String value) {
        return value.length() <= ERROR_MESSAGE_LIMIT ? value : value.substring(0, ERROR_MESSAGE_LIMIT);
    }
}
