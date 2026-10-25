package com.aiscript.modules.market.service;

import java.util.Set;

public interface MarketViralFavoriteService {
    boolean toggle(Long videoId);

    Set<Long> favoriteVideoIds(Integer tenantId, Integer userId);
}
