package com.aiscript.modules.workflow.service;

import com.aiscript.modules.workflow.dto.WorkflowProviderExecuteDTO;
import com.aiscript.modules.workflow.dto.WorkflowProviderPollDTO;
import com.aiscript.modules.workflow.vo.WorkflowProviderExecuteVO;

public interface WorkflowProviderGatewayService {
    WorkflowProviderExecuteVO execute(WorkflowProviderExecuteDTO dto);

    WorkflowProviderExecuteVO poll(WorkflowProviderPollDTO dto);
}
