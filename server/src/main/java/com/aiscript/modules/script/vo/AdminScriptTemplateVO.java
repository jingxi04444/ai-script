package com.aiscript.modules.script.vo;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class AdminScriptTemplateVO extends ScriptTemplateVO {
    private String referenceUrl;
    private String referenceDesc;
    private String fullVideoUrl;
}
