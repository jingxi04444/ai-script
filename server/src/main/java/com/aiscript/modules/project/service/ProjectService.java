package com.aiscript.modules.project.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.modules.project.dto.ProjectCreateDTO;
import com.aiscript.modules.project.dto.ProjectQueryDTO;
import com.aiscript.modules.project.dto.ProjectUpdateDTO;
import com.aiscript.modules.project.vo.ProjectVO;

public interface ProjectService {
    PageResult<ProjectVO> page(ProjectQueryDTO query, boolean admin);

    ProjectVO getById(Integer id);

    ProjectVO create(ProjectCreateDTO dto);

    ProjectVO update(Integer id, ProjectUpdateDTO dto);

    void delete(Integer id);
}
