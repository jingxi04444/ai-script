package com.aiscript.modules.script.vo;

import java.util.List;
import lombok.Data;

@Data
public class ScriptReviewContextVO {
    private ScriptVO script;
    private ScriptAccessVO access;
    private List<ScriptVersionVO> versions;
    private List<ScriptReviewCommentVO> comments;
}
