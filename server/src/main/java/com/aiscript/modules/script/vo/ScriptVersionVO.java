package com.aiscript.modules.script.vo;

import lombok.Data;

@Data
public class ScriptVersionVO {
    private String id;
    private Integer versionNo;
    private String title;
    private String content;
    private String changeNote;
    private String source;
    private String instruction;
    private String summary;
    private String restoredFromVersionId;
    private Boolean current;
    private String createdAt;
}
