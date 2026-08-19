package com.aiscript.modules.script.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ScriptAccessVO {
    private boolean canView;
    private boolean canComment;
    private boolean canEditScript;
    private boolean canUseAi;
    private boolean canViewAiMessages;
    private boolean canViewVersions;
    private boolean canSubmitReview;
    private String accessMode;
}
