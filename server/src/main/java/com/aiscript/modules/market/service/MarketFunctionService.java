package com.aiscript.modules.market.service;

import com.aiscript.modules.market.dto.MarketFunctionSaveDTO;
import com.aiscript.modules.market.vo.MarketFunctionVO;
import java.util.List;

public interface MarketFunctionService {
    List<MarketFunctionVO> listPublished();

    List<MarketFunctionVO> listAdmin();

    MarketFunctionVO save(Long id, MarketFunctionSaveDTO dto);

    void delete(Long id);
}
