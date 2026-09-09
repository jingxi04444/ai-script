package com.aiscript.modules.workflow.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.workflow.dto.WorkflowRunCreateDTO;
import com.aiscript.modules.workflow.entity.AiWorkflowNodeRun;
import com.aiscript.modules.workflow.entity.AiWorkflowOutbox;
import com.aiscript.modules.workflow.entity.AiWorkflowRun;
import com.aiscript.modules.workflow.mapper.AiWorkflowNodeRunMapper;
import com.aiscript.modules.workflow.mapper.AiWorkflowOutboxMapper;
import com.aiscript.modules.workflow.mapper.AiWorkflowRunMapper;
import com.aiscript.modules.workflow.service.WorkflowRunService;
import com.aiscript.modules.workflow.service.WorkflowService;
import com.aiscript.modules.workflow.vo.WorkflowNodeRunVO;
import com.aiscript.modules.workflow.vo.WorkflowRunVO;
import com.aiscript.modules.workflow.vo.WorkflowValidationVO;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class WorkflowRunServiceImpl implements WorkflowRunService {
    private static final Set<String> TERMINAL_STATUSES = Set.of("success", "failed", "canceled");
    private static final Set<String> RETRYABLE_STATUSES = Set.of("failed", "canceled");

    private final AiWorkflowRunMapper runMapper;
    private final AiWorkflowNodeRunMapper nodeRunMapper;
    private final AiWorkflowOutboxMapper outboxMapper;
    private final WorkflowService workflowService;
    private final ObjectMapper objectMapper;

    public WorkflowRunServiceImpl(
        AiWorkflowRunMapper runMapper,
        AiWorkflowNodeRunMapper nodeRunMapper,
        AiWorkflowOutboxMapper outboxMapper,
        WorkflowService workflowService,
        ObjectMapper objectMapper
    ) {
        this.runMapper = runMapper;
        this.nodeRunMapper = nodeRunMapper;
        this.outboxMapper = outboxMapper;
        this.workflowService = workflowService;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public WorkflowRunVO start(Integer projectId, WorkflowRunCreateDTO dto) {
        LoginUser user = currentUser();
        Integer tenantId = currentTenantId(user);
        WorkflowValidationVO validation = workflowService.validate(dto.getGraphJson());
        if (!validation.isValid()) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, String.join("；", validation.getErrors()));
        }

        String idempotencyKey = StringUtils.hasText(dto.getIdempotencyKey())
            ? dto.getIdempotencyKey().trim()
            : UUID.randomUUID().toString();
        AiWorkflowRun existing = runMapper.selectOne(Wrappers.<AiWorkflowRun>lambdaQuery()
            .eq(AiWorkflowRun::getTenantId, tenantId)
            .eq(AiWorkflowRun::getCreateBy, user.getUserId())
            .eq(AiWorkflowRun::getIdempotencyKey, idempotencyKey)
            .last("LIMIT 1"));
        if (existing != null) {
            if (!Objects.equals(existing.getProjectId(), projectId)
                || !Objects.equals(existing.getGraphJson(), dto.getGraphJson())) {
                throw new BusinessException(ResultCode.CONFLICT, "幂等键已被另一份工作流运行使用");
            }
            return toVO(existing, true);
        }

        AiWorkflowRun run = new AiWorkflowRun();
        run.setTenantId(tenantId);
        run.setProjectId(projectId);
        run.setWorkflowId(dto.getWorkflowId());
        run.setWorkflowVersion(dto.getWorkflowVersion() == null ? 1 : dto.getWorkflowVersion());
        run.setStatus("queued");
        run.setProgress(0);
        run.setGraphJson(dto.getGraphJson());
        run.setInputJson(StringUtils.hasText(dto.getInputJson()) ? dto.getInputJson() : "{}");
        run.setTotalNodes(validation.getNodeCount());
        run.setCompletedNodes(0);
        run.setFailedNodes(0);
        run.setCancelRequested(0);
        run.setIdempotencyKey(idempotencyKey);
        run.setCreateBy(user.getUserId());
        run.setUpdateBy(user.getUserId());
        runMapper.insert(run);

        enqueue(run, "START_WORKFLOW", Map.of(
            "type", "START_WORKFLOW",
            "runId", String.valueOf(run.getId()),
            "tenantId", String.valueOf(tenantId),
            "projectId", String.valueOf(projectId),
            "workflowVersion", String.valueOf(run.getWorkflowVersion())
        ));
        return toVO(run, false);
    }

    @Override
    public WorkflowRunVO get(Integer projectId, Long runId) {
        return toVO(findOwned(projectId, runId), true);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public WorkflowRunVO cancel(Integer projectId, Long runId) {
        AiWorkflowRun run = findOwned(projectId, runId);
        if (TERMINAL_STATUSES.contains(run.getStatus())) return toVO(run, true);
        run.setCancelRequested(1);
        run.setStatus("canceling");
        runMapper.updateById(run);
        enqueue(run, "CANCEL_WORKFLOW", Map.of(
            "type", "CANCEL_WORKFLOW",
            "runId", String.valueOf(run.getId()),
            "tenantId", String.valueOf(run.getTenantId())
        ));
        return toVO(run, true);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public WorkflowRunVO retry(Integer projectId, Long runId) {
        AiWorkflowRun run = findOwned(projectId, runId);
        if (!RETRYABLE_STATUSES.contains(run.getStatus())) {
            throw new BusinessException(ResultCode.CONFLICT, "只有失败或已取消的工作流可以重试");
        }
        int updated = runMapper.update(null, Wrappers.<AiWorkflowRun>lambdaUpdate()
            .eq(AiWorkflowRun::getId, run.getId())
            .eq(AiWorkflowRun::getTenantId, run.getTenantId())
            .in(AiWorkflowRun::getStatus, RETRYABLE_STATUSES)
            .set(AiWorkflowRun::getStatus, "queued")
            .set(AiWorkflowRun::getProgress, 0)
            .set(AiWorkflowRun::getCompletedNodes, 0)
            .set(AiWorkflowRun::getFailedNodes, 0)
            .set(AiWorkflowRun::getCancelRequested, 0)
            .set(AiWorkflowRun::getOutputJson, null)
            .set(AiWorkflowRun::getErrorCode, null)
            .set(AiWorkflowRun::getErrorMessage, null)
            .set(AiWorkflowRun::getStartedAt, null)
            .set(AiWorkflowRun::getFinishedAt, null)
            .set(AiWorkflowRun::getUpdateBy, run.getCreateBy()));
        if (updated != 1) {
            throw new BusinessException(ResultCode.CONFLICT, "工作流状态已变化，请刷新后重试");
        }
        run.setStatus("queued");
        run.setProgress(0);
        run.setCompletedNodes(0);
        run.setFailedNodes(0);
        run.setCancelRequested(0);
        enqueue(run, "START_WORKFLOW", Map.of(
            "type", "START_WORKFLOW",
            "runId", String.valueOf(run.getId()),
            "tenantId", String.valueOf(run.getTenantId()),
            "projectId", String.valueOf(run.getProjectId()),
            "workflowVersion", String.valueOf(run.getWorkflowVersion())
        ));
        return toVO(run, true);
    }

    private void enqueue(AiWorkflowRun run, String eventType, Map<String, String> payload) {
        AiWorkflowOutbox outbox = new AiWorkflowOutbox();
        outbox.setTenantId(run.getTenantId());
        outbox.setAggregateType("workflow_run");
        outbox.setAggregateId(run.getId());
        outbox.setEventType(eventType);
        try {
            outbox.setPayloadJson(objectMapper.writeValueAsString(payload));
        } catch (JsonProcessingException exception) {
            throw new BusinessException(ResultCode.SYSTEM_ERROR, "工作流命令序列化失败");
        }
        outbox.setStatus("pending");
        outbox.setAttempts(0);
        outbox.setCreateBy(run.getCreateBy());
        outbox.setUpdateBy(run.getCreateBy());
        outboxMapper.insert(outbox);
    }

    private AiWorkflowRun findOwned(Integer projectId, Long runId) {
        LoginUser user = currentUser();
        AiWorkflowRun run = runMapper.selectOne(Wrappers.<AiWorkflowRun>lambdaQuery()
            .eq(AiWorkflowRun::getId, runId)
            .eq(AiWorkflowRun::getTenantId, currentTenantId(user))
            .eq(AiWorkflowRun::getProjectId, projectId)
            .eq(AiWorkflowRun::getCreateBy, user.getUserId())
            .last("LIMIT 1"));
        if (run == null) throw new BusinessException(ResultCode.NOT_FOUND, "工作流运行不存在或无权访问");
        return run;
    }

    private WorkflowRunVO toVO(AiWorkflowRun run, boolean includeNodes) {
        WorkflowRunVO vo = new WorkflowRunVO();
        vo.setId(String.valueOf(run.getId()));
        vo.setProjectId(String.valueOf(run.getProjectId()));
        vo.setWorkflowId(run.getWorkflowId() == null ? null : String.valueOf(run.getWorkflowId()));
        vo.setWorkflowVersion(run.getWorkflowVersion());
        vo.setStatus(run.getStatus());
        vo.setProgress(run.getProgress());
        vo.setTotalNodes(run.getTotalNodes());
        vo.setCompletedNodes(run.getCompletedNodes());
        vo.setFailedNodes(run.getFailedNodes());
        vo.setCancelRequested(Integer.valueOf(1).equals(run.getCancelRequested()));
        vo.setOutputJson(run.getOutputJson());
        vo.setErrorCode(run.getErrorCode());
        vo.setErrorMessage(run.getErrorMessage());
        vo.setStartedAt(run.getStartedAt());
        vo.setFinishedAt(run.getFinishedAt());
        if (includeNodes) {
            List<AiWorkflowNodeRun> nodeRuns = nodeRunMapper.selectList(Wrappers.<AiWorkflowNodeRun>lambdaQuery()
                .eq(AiWorkflowNodeRun::getTenantId, run.getTenantId())
                .eq(AiWorkflowNodeRun::getWorkflowRunId, run.getId())
                .orderByAsc(AiWorkflowNodeRun::getCreateTime, AiWorkflowNodeRun::getId));
            vo.setNodes(nodeRuns.stream().map(this::toNodeVO).toList());
        }
        return vo;
    }

    private WorkflowNodeRunVO toNodeVO(AiWorkflowNodeRun run) {
        WorkflowNodeRunVO vo = new WorkflowNodeRunVO();
        vo.setId(String.valueOf(run.getId()));
        vo.setNodeId(run.getNodeId());
        vo.setNodeKind(run.getNodeKind());
        vo.setSkillCode(run.getSkillCode());
        vo.setSkillVersion(run.getSkillVersion());
        vo.setStatus(run.getStatus());
        vo.setAttempt(run.getAttempt());
        vo.setProgress(run.getProgress());
        vo.setOutputJson(run.getOutputJson());
        vo.setErrorCode(run.getErrorCode());
        vo.setErrorMessage(run.getErrorMessage());
        vo.setStartedAt(run.getStartedAt());
        vo.setFinishedAt(run.getFinishedAt());
        return vo;
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return loginUser;
    }

    private Integer currentTenantId(LoginUser user) {
        return TenantContext.getTenantId() == null ? user.getTenantId() : TenantContext.getTenantId();
    }
}
