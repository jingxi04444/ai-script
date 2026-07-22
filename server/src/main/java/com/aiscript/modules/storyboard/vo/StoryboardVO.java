package com.aiscript.modules.storyboard.vo;

import lombok.Data;

import java.util.List;

@Data
public class StoryboardVO {
    private String id;
    private String scriptId;
    private List<ShotVO> shots;
    private String createdAt;
    private String updatedAt;
}
