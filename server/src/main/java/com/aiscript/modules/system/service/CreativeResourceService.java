package com.aiscript.modules.system.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.modules.system.dto.CreativeResourceQueryDTO;
import com.aiscript.modules.system.dto.CreativeResourceSaveDTO;
import com.aiscript.modules.system.vo.CreativeResourceVO;

public interface CreativeResourceService {
    PageResult<CreativeResourceVO> publishedPage(CreativeResourceQueryDTO query);
    CreativeResourceVO publishedDetail(Long id);
    PageResult<CreativeResourceVO> adminPage(CreativeResourceQueryDTO query);
    CreativeResourceVO save(Long id, CreativeResourceSaveDTO dto);
    void delete(Long id);
}
