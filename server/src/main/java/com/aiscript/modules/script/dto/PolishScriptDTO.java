package com.aiscript.modules.script.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PolishScriptDTO {
    @NotBlank(message = "修改要求不能为空")
    private String instruction;

    private String content;
}
