package com.aiscript.modules.workflow.service;

import com.aiscript.modules.workflow.dto.SceneNoticeSaveDTO;
import com.aiscript.modules.workflow.vo.SceneNoticeVO;

public interface SceneNoticeService {
    SceneNoticeVO get(Integer projectId);
    SceneNoticeVO preview(Integer projectId, SceneNoticeSaveDTO dto);
    SceneNoticeVO save(Integer projectId, SceneNoticeSaveDTO dto);
}
