package com.aiscript.modules.market.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.modules.market.dto.MarketViralQueryDTO;
import com.aiscript.modules.market.dto.MarketViralRefreshDTO;
import com.aiscript.modules.market.vo.MarketViralRefreshVO;
import com.aiscript.modules.market.vo.MarketViralVideoVO;

public interface MarketViralService {
    PageResult<MarketViralVideoVO> page(MarketViralQueryDTO query);

    MarketViralRefreshVO createRefreshTask(MarketViralRefreshDTO dto);

    void executeRefreshTask(Integer taskId);
}
