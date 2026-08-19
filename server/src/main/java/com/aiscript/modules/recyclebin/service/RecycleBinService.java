package com.aiscript.modules.recyclebin.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.modules.brief.entity.AiBrief;
import com.aiscript.modules.project.entity.AiProject;
import com.aiscript.modules.recyclebin.dto.RecycleBinQueryDTO;
import com.aiscript.modules.recyclebin.vo.RecycleBinItemVO;
import com.aiscript.modules.recyclebin.vo.RecycleBinSummaryVO;
import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import java.util.List;

public interface RecycleBinService {
    String PROJECT = "project";
    String BRIEF = "brief";
    String SCRIPT = "script";

    void moveProject(AiProject project);

    void moveBrief(AiBrief brief);

    void moveScript(AiStoryboardScript script);

    PageResult<RecycleBinItemVO> page(RecycleBinQueryDTO query);

    RecycleBinSummaryVO summary();

    void restore(Integer id);

    void restoreBatch(List<Integer> ids);

    void purge(Integer id);

    void purgeBatch(List<Integer> ids);

    int cleanupExpired();
}
