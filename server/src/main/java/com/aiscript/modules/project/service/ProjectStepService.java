package com.aiscript.modules.project.service;

import com.aiscript.modules.project.dto.ProjectStepSaveDTO;
import com.aiscript.modules.project.vo.ProjectStepVO;
import java.util.List;

public interface ProjectStepService {
    List<ProjectStepVO> list(Integer projectId);
    ProjectStepVO save(Integer projectId, Integer id, ProjectStepSaveDTO dto);
    ProjectStepVO complete(Integer projectId, Integer id);
    ProjectStepVO reopen(Integer projectId, Integer id);
}
