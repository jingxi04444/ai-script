package com.aiscript.modules.auditflow.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.auditflow.convert.AuditConvert;
import com.aiscript.modules.auditflow.dto.AuditHandleDTO;
import com.aiscript.modules.auditflow.dto.AuditSubmitDTO;
import com.aiscript.modules.auditflow.entity.AiAuditRecord;
import com.aiscript.modules.auditflow.entity.AiAuditTask;
import com.aiscript.modules.auditflow.mapper.AiAuditRecordMapper;
import com.aiscript.modules.auditflow.mapper.AiAuditTaskMapper;
import com.aiscript.modules.auditflow.service.AuditFlowService;
import com.aiscript.modules.auditflow.vo.AuditTaskVO;
import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import com.aiscript.modules.storyboard.mapper.AiStoryboardScriptMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuditFlowServiceImpl implements AuditFlowService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private static final Integer DEFAULT_USER_ID = 2;
    private final AiAuditTaskMapper taskMapper;
    private final AiAuditRecordMapper recordMapper;
    private final AiStoryboardScriptMapper scriptMapper;

    public AuditFlowServiceImpl(AiAuditTaskMapper taskMapper, AiAuditRecordMapper recordMapper, AiStoryboardScriptMapper scriptMapper) {
        this.taskMapper = taskMapper;
        this.recordMapper = recordMapper;
        this.scriptMapper = scriptMapper;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AuditTaskVO submit(AuditSubmitDTO dto) {
        if (!StringUtils.hasText(dto.getScriptId())) {
            throw new BusinessException("脚本ID不能为空");
        }
        AiStoryboardScript script = scriptMapper.selectById(Integer.valueOf(dto.getScriptId()));
        if (script == null) {
            throw new BusinessException("脚本不存在");
        }
        AiAuditTask task = new AiAuditTask();
        task.setTenantId(script.getTenantId() == null ? currentTenantId() : script.getTenantId());
        task.setProjectId(script.getProjectId());
        task.setScriptId(script.getId());
        task.setCurrentVersionId(script.getCurrentVersionId());
        task.setStatus("pending");
        task.setStage("operation_review");
        task.setSubmitterId(DEFAULT_USER_ID);
        task.setRiskSummary(dto.getRiskSummary());
        task.setSubmitTime(LocalDateTime.now());
        taskMapper.insert(task);

        script.setAuditStatus("pending");
        scriptMapper.updateById(script);
        saveRecord(task, "submit", null, "pending", dto.getRiskSummary());
        return AuditConvert.toVO(task);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AuditTaskVO approve(Integer taskId, AuditHandleDTO dto) {
        return complete(taskId, "approved", "approve", dto);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AuditTaskVO reject(Integer taskId, AuditHandleDTO dto) {
        return complete(taskId, "rejected", "reject", dto);
    }

    @Override
    public PageResult<AuditTaskVO> page(PageQuery query, String status) {
        LambdaQueryWrapper<AiAuditTask> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(status)) {
            wrapper.eq(AiAuditTask::getStatus, status);
        }
        wrapper.orderByDesc(AiAuditTask::getSubmitTime);
        IPage<AiAuditTask> page = taskMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        List<AuditTaskVO> list = page.getRecords().stream().map(AuditConvert::toVO).toList();
        return new PageResult<>(list, page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    private AuditTaskVO complete(Integer taskId, String toStatus, String action, AuditHandleDTO dto) {
        AiAuditTask task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new BusinessException("审核任务不存在");
        }
        String fromStatus = task.getStatus();
        if (!"pending".equals(fromStatus)) {
            throw new BusinessException("当前审核任务状态不允许处理");
        }
        task.setStatus(toStatus);
        task.setCompleteTime(LocalDateTime.now());
        if (dto != null && StringUtils.hasText(dto.getAssigneeId())) {
            task.setAssigneeId(Integer.valueOf(dto.getAssigneeId()));
        }
        taskMapper.updateById(task);

        AiStoryboardScript script = scriptMapper.selectById(task.getScriptId());
        if (script != null) {
            script.setAuditStatus(toStatus);
            scriptMapper.updateById(script);
        }
        saveRecord(task, action, fromStatus, toStatus, dto == null ? null : dto.getComment());
        return AuditConvert.toVO(task);
    }

    private void saveRecord(AiAuditTask task, String action, String fromStatus, String toStatus, String comment) {
        AiAuditRecord record = new AiAuditRecord();
        record.setTenantId(task.getTenantId());
        record.setAuditTaskId(task.getId());
        record.setAuditorId(DEFAULT_USER_ID);
        record.setActionCode(action);
        record.setFromStatus(fromStatus);
        record.setToStatus(toStatus);
        record.setCommentText(comment);
        recordMapper.insert(record);
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }
}
