package com.aiscript.modules.script.vo;

import lombok.Data;

@Data
public class ScriptPolishMessageVO {
    private String id;
    private String replyToId;
    private String role;
    private String status;
    private String content;
    private String errorMessage;
    private String createdAt;
}
