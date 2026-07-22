package com.aiscript.modules.tenant.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.tenant.dto.TenantSaveDTO;
import com.aiscript.modules.tenant.vo.TenantVO;

public interface TenantService {
    PageResult<TenantVO> page(PageQuery query, Integer status);
    TenantVO getById(Integer id);
    TenantVO save(Integer id, TenantSaveDTO dto);
    void delete(Integer id);
}
