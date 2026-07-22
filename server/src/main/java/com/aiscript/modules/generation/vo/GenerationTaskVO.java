package com.aiscript.modules.generation.vo;

import lombok.Data;

@Data
public class GenerationTaskVO {
    private String id;
    private String status;
    private Integer progress;
    private String result;
    private String errorMessage;
}
