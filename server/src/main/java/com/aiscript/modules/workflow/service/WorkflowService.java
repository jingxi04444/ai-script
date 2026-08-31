package com.aiscript.modules.workflow.service;

import com.aiscript.modules.workflow.dto.WorkflowSaveDTO;
import com.aiscript.modules.workflow.vo.WorkflowVO;
import com.aiscript.modules.workflow.vo.WorkflowValidationVO;

public interface WorkflowService {
    WorkflowVO get(Integer projectId, String mode);

    WorkflowVO save(Integer projectId, WorkflowSaveDTO dto);

    WorkflowValidationVO validate(String graphJson);
}
