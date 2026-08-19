package com.aiscript.modules.script.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PolishScriptVO {
    private String content;
    private String summary;
    private String status;

    public PolishScriptVO(String content, String summary) {
        this(content, summary, null);
    }
}
