package com.aiscript.modules.system.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.system.dto.ProviderConfigSaveDTO;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import com.aiscript.modules.system.vo.ProviderConfigVO;

public interface ProviderConfigService {
    PageResult<ProviderConfigVO> page(PageQuery query, String providerType);

    ProviderConfigVO save(Integer id, ProviderConfigSaveDTO dto);

    void delete(Integer id);

    SysApiProviderConfig firstEnabled(String providerType);
}
