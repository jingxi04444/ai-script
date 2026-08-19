package com.aiscript.modules.generation.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ScriptQueueConcurrencyDTO {
    @NotNull(message = "并发数不能为空")
    @Min(value = 1, message = "并发数不能小于 1")
    @Max(value = 16, message = "并发数不能大于 16")
    private Integer concurrency;
}
