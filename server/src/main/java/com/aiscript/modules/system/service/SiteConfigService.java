package com.aiscript.modules.system.service;

import com.aiscript.modules.system.dto.SiteConfigSaveDTO;
import com.aiscript.modules.system.vo.PublicSiteConfigVO;
import com.aiscript.modules.system.vo.SiteConfigVO;

public interface SiteConfigService {
    SiteConfigVO getConfig();

    PublicSiteConfigVO getPublicConfig();

    SiteConfigVO save(SiteConfigSaveDTO dto);
}
