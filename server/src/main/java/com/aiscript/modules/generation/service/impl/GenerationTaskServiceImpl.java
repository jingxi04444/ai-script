package com.aiscript.modules.generation.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.api.ResultCode;
import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.generation.service.GenerationTaskService;
import com.aiscript.modules.generation.vo.GenerationTaskVO;
import com.aiscript.security.LoginUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class GenerationTaskServiceImpl implements GenerationTaskService {
    private final AiGenerationTaskMapper taskMapper;

    public GenerationTaskServiceImpl(AiGenerationTaskMapper taskMapper) {
        this.taskMapper = taskMapper;
    }

    @Override
    public GenerationTaskVO getById(Integer id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser user)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        AiGenerationTask task = taskMapper.selectOwnedTask(id, user.getTenantId(), user.getUserId());
        if (task == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "任务不存在或无权访问");
        }
        GenerationTaskVO vo = new GenerationTaskVO();
        vo.setId(String.valueOf(task.getId()));
        vo.setStatus(task.getStatus());
        vo.setProgress(task.getProgress());
        vo.setResult(task.getResultPayload());
        vo.setErrorMessage(task.getErrorMessage());
        return vo;
    }
}
