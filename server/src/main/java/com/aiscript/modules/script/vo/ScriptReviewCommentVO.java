package com.aiscript.modules.script.vo;

import lombok.Data;

@Data
public class ScriptReviewCommentVO {
    private String id;
    private String parentId;
    private String versionId;
    private String userId;
    private String username;
    private String userAvatar;
    private Integer rowIndex;
    private String columnKey;
    private String content;
    private String status;
    private boolean mine;
    private boolean deletable;
    private String createdAt;
}
