package com.aiscript.modules.generation.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.generation.service.GenerationTaskService;
import com.aiscript.modules.generation.vo.GenerationTaskVO;
import org.springframework.stereotype.Service;

@Service
public class GenerationTaskServiceImpl implements GenerationTaskService {
    private final AiGenerationTaskMapper taskMapper;

    public GenerationTaskServiceImpl(AiGenerationTaskMapper taskMapper) {
        this.taskMapper = taskMapper;
    }

    @Override
    public GenerationTaskVO getById(Integer id) {
        AiGenerationTask task = taskMapper.selectById(id);
        if (task == null) {
            throw new BusinessException("任务不存在");
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
