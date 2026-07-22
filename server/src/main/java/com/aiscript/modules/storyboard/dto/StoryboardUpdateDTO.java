package com.aiscript.modules.storyboard.dto;

import lombok.Data;

import com.aiscript.modules.storyboard.vo.ShotVO;
import java.util.List;

@Data
public class StoryboardUpdateDTO {
    private String scriptId;
    private List<ShotVO> shots;
}
