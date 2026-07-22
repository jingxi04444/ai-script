package com.aiscript.modules.brief.vo;

public class BriefDetectionSuggestionVO {
    public Integer index;
    public String title;
    public String detail;
    public String content;

    public BriefDetectionSuggestionVO() {
    }

    public BriefDetectionSuggestionVO(Integer index, String title, String content) {
        this.index = index;
        this.title = title;
        this.detail = content;
        this.content = content;
    }
}
