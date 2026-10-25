package com.aiscript.modules.market.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.market.entity.AiMarketViralFavorite;
import com.aiscript.modules.market.entity.AiMarketViralVideo;
import com.aiscript.modules.market.mapper.AiMarketViralFavoriteMapper;
import com.aiscript.modules.market.mapper.AiMarketViralVideoMapper;
import com.aiscript.security.LoginUser;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class MarketViralFavoriteServiceImplTest {
    @Mock
    private AiMarketViralFavoriteMapper favoriteMapper;
    @Mock
    private AiMarketViralVideoMapper videoMapper;

    private MarketViralFavoriteServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MarketViralFavoriteServiceImpl(favoriteMapper, videoMapper);
        LoginUser user = LoginUser.builder().userId(8).tenantId(2).userType("front").build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(user, null, List.of())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void favoriteAndUnfavoriteTogglePersistsOnlyCurrentUserLink() {
        AiMarketViralVideo video = new AiMarketViralVideo();
        video.setId(99L);
        video.setTenantId(2);
        when(videoMapper.selectById(99L)).thenReturn(video);
        when(favoriteMapper.selectOne(any())).thenReturn(null);
        when(favoriteMapper.insert(any(AiMarketViralFavorite.class))).thenReturn(1);

        assertThat(service.toggle(99L)).isTrue();

        ArgumentCaptor<AiMarketViralFavorite> captor = ArgumentCaptor.forClass(AiMarketViralFavorite.class);
        verify(favoriteMapper).insert(captor.capture());
        assertThat(captor.getValue().getTenantId()).isEqualTo(2);
        assertThat(captor.getValue().getUserId()).isEqualTo(8);
        assertThat(captor.getValue().getVideoId()).isEqualTo(99L);
    }

    @Test
    void rejectsFavoritingAnotherTenantsVideo() {
        AiMarketViralVideo video = new AiMarketViralVideo();
        video.setId(99L);
        video.setTenantId(3);
        when(videoMapper.selectById(99L)).thenReturn(video);

        assertThatThrownBy(() -> service.toggle(99L))
            .isInstanceOf(BusinessException.class)
            .hasMessage("爆款链接不存在");
    }
}
