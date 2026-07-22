package com.aiscript.modules.storyboard.service;

import com.aiscript.modules.storyboard.dto.StoryboardUpdateDTO;
import com.aiscript.modules.storyboard.vo.StoryboardVO;

public interface StoryboardService {
    StoryboardVO getByScriptId(Integer scriptId);

    StoryboardVO getById(Integer id);

    StoryboardVO update(Integer id, StoryboardUpdateDTO dto);

    byte[] exportCsv(Integer id);
}
