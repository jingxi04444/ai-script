package com.aiscript.modules.generation.service;

import com.aiscript.modules.generation.vo.ScriptQueueItemVO;
import com.aiscript.modules.generation.vo.ScriptQueueStateVO;
import com.aiscript.modules.script.dto.GenerateScriptDTO;

public interface ScriptGenerationQueueService {
    ScriptQueueItemVO enqueue(GenerateScriptDTO dto);

    ScriptQueueStateVO state();

    ScriptQueueStateVO updateConcurrency(int concurrency);

    void cancel(Long id);
}
