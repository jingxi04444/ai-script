package com.aiscript.modules.market.service;

import com.aiscript.modules.market.dto.MarketSourceConfigSaveDTO;
import com.aiscript.modules.market.entity.SysMarketSourceConfig;
import com.aiscript.modules.market.vo.MarketSourceConfigVO;
import com.aiscript.modules.market.vo.MarketSourceCredentialVO;
import java.util.List;

public interface MarketSourceConfigService {
    List<MarketSourceConfigVO> listCurrentTenant();

    MarketSourceConfigVO save(String platform, MarketSourceConfigSaveDTO dto);

    MarketSourceCredentialVO credential(Integer tenantId, String platform);

    List<SysMarketSourceConfig> listEnabledSources();

    void recordValidation(Integer tenantId, String platform, boolean valid, String errorMessage);
}
