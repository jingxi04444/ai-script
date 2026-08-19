package com.aiscript.modules.generation.vo;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class ScriptQueueStateVO {
    private List<ScriptQueueItemVO> items = new ArrayList<>();
    private Integer pendingCount;
    private Integer runningCount;
    private Integer activeCount;
    private Integer concurrency;
    private Integer maxConcurrency;
    private Boolean parallelConfigurable;
}
