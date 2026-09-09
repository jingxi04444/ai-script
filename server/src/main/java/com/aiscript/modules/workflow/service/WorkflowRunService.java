package com.aiscript.modules.workflow.service;

import com.aiscript.modules.workflow.dto.WorkflowRunCreateDTO;
import com.aiscript.modules.workflow.vo.WorkflowRunVO;

public interface WorkflowRunService {
    WorkflowRunVO start(Integer projectId, WorkflowRunCreateDTO dto);

    WorkflowRunVO get(Integer projectId, Long runId);

    WorkflowRunVO cancel(Integer projectId, Long runId);

    WorkflowRunVO retry(Integer projectId, Long runId);
}
