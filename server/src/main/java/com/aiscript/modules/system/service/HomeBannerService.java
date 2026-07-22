package com.aiscript.modules.system.service;

import com.aiscript.modules.system.dto.HomeBannerDTO;
import com.aiscript.modules.system.vo.HomeBannerVO;
import java.util.List;

public interface HomeBannerService {
    List<HomeBannerVO> listEnabled();

    List<HomeBannerVO> listAll();

    HomeBannerVO save(Integer id, HomeBannerDTO dto);

    void delete(Integer id);
}
