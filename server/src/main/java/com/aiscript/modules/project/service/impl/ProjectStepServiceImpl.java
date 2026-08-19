package com.aiscript.modules.project.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.project.dto.ProjectStepSaveDTO;
import com.aiscript.modules.project.entity.AiProjectStep;
import com.aiscript.modules.project.mapper.AiProjectStepMapper;
import com.aiscript.modules.project.service.ProjectCollaborationService;
import com.aiscript.modules.project.service.ProjectStepService;
import com.aiscript.modules.project.vo.ProjectStepVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ProjectStepServiceImpl implements ProjectStepService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private final AiProjectStepMapper stepMapper;
    private final ProjectCollaborationService collaborationService;

    public ProjectStepServiceImpl(AiProjectStepMapper stepMapper,
                                  ProjectCollaborationService collaborationService) {
        this.stepMapper = stepMapper;
        this.collaborationService = collaborationService;
    }

    @Override
    public List<ProjectStepVO> list(Integer projectId) {
        ensureProject(projectId);
        return stepMapper.selectList(new LambdaQueryWrapper<AiProjectStep>()
                .eq(AiProjectStep::getProjectId, projectId)
                .orderByAsc(AiProjectStep::getId))
            .stream().map(this::toVO).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProjectStepVO save(Integer projectId, Integer id, ProjectStepSaveDTO dto) {
        ensureProject(projectId);
        AiProjectStep step = id == null ? new AiProjectStep() : stepMapper.selectById(id);
        if (step == null) {
            throw new BusinessException("项目步骤不存在");
        }
        step.setTenantId(DEFAULT_TENANT_ID);
        step.setProjectId(projectId);
        step.setStepKey(dto.stepCode);
        step.setStepName(dto.stepName);
        step.setStatus(StringUtils.hasText(dto.status) ? dto.status : "pending");
        step.setDraftData(dto.draftData);
        if (id == null) {
            stepMapper.insert(step);
        } else {
            stepMapper.updateById(step);
        }
        updateProjectCurrentStep(projectId, step.getStepKey());
        return toVO(step);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProjectStepVO complete(Integer projectId, Integer id) {
        ensureProject(projectId);
        AiProjectStep step = stepMapper.selectById(id);
        if (step == null || !projectId.equals(step.getProjectId())) {
            throw new BusinessException("项目步骤不存在");
        }
        step.setStatus("done");
        step.setCompleteTime(LocalDateTime.now());
        stepMapper.updateById(step);
        updateProjectCurrentStep(projectId, step.getStepKey());
        return toVO(step);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProjectStepVO reopen(Integer projectId, Integer id) {
        ensureProject(projectId);
        AiProjectStep step = stepMapper.selectById(id);
        if (step == null || !projectId.equals(step.getProjectId())) {
            throw new BusinessException("项目步骤不存在");
        }
        step.setStatus("pending");
        step.setCompleteTime(null);
        stepMapper.updateById(step);
        updateProjectCurrentStep(projectId, step.getStepKey());
        return toVO(step);
    }

    private void ensureProject(Integer projectId) {
        collaborationService.requireAccess(projectId);
    }

    private void updateProjectCurrentStep(Integer projectId, String stepCode) {
        if (!StringUtils.hasText(stepCode)) return;
        collaborationService.updateCurrentStep(projectId, stepCode);
    }

    private ProjectStepVO toVO(AiProjectStep step) {
        ProjectStepVO vo = new ProjectStepVO();
        vo.id = String.valueOf(step.getId());
        vo.projectId = String.valueOf(step.getProjectId());
        vo.stepCode = step.getStepKey();
        vo.stepName = step.getStepName();
        vo.status = step.getStatus();
        vo.draftData = step.getDraftData();
        vo.completeTime = step.getCompleteTime() == null ? null : step.getCompleteTime().toString();
        vo.createdAt = step.getCreateTime() == null ? null : step.getCreateTime().toString();
        vo.updatedAt = step.getUpdateTime() == null ? null : step.getUpdateTime().toString();
        return vo;
    }
}
