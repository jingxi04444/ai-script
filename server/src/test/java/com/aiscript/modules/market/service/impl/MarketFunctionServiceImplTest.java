package com.aiscript.modules.market.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.market.dto.MarketFunctionSaveDTO;
import com.aiscript.modules.market.entity.SysMarketFunction;
import com.aiscript.modules.market.mapper.SysMarketFunctionMapper;
import com.aiscript.security.LoginUser;
import com.fasterxml.jackson.databind.ObjectMapper;
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
class MarketFunctionServiceImplTest {
    @Mock
    private SysMarketFunctionMapper mapper;

    private MarketFunctionServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MarketFunctionServiceImpl(mapper, new ObjectMapper());
        LoginUser admin = LoginUser.builder().userId(9).tenantId(1).userType("admin").build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(admin, null, List.of())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createsPublishedBuiltinMarketFunctionWithTags() {
        when(mapper.findIdByCodeIncludingDeleted("category-viral-links")).thenReturn(null);
        when(mapper.insert(any(SysMarketFunction.class))).thenAnswer(invocation -> {
            SysMarketFunction entity = invocation.getArgument(0);
            entity.setId(12L);
            return 1;
        });

        var result = service.save(null, dto(
            "category-viral-links", "builtin", "/market/category-viral-links", 1
        ));

        ArgumentCaptor<SysMarketFunction> captor = ArgumentCaptor.forClass(SysMarketFunction.class);
        verify(mapper).insert(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(1);
        assertThat(captor.getValue().getTagsJson()).isEqualTo("[\"爆款链接\",\"短视频\"]");
        assertThat(result.getTags()).containsExactly("爆款链接", "短视频");
        assertThat(result.getRoute()).isEqualTo("/market/category-viral-links");
    }

    @Test
    void rejectsBuiltinRouteOutsideMarketAndUnsafeExternalUrl() {
        when(mapper.findIdByCodeIncludingDeleted(anyString())).thenReturn(null);
        assertThatThrownBy(() -> service.save(null, dto("wrong-route", "builtin", "/workspace", 1)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("/market/");
        assertThatThrownBy(() -> service.save(null, dto("unsafe-link", "external", "javascript:alert(1)", 1)))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("HTTP(S)");
    }

    private static MarketFunctionSaveDTO dto(
        String code,
        String type,
        String route,
        int status
    ) {
        MarketFunctionSaveDTO dto = new MarketFunctionSaveDTO();
        dto.setCode(code);
        dto.setTitle("品类爆款链接");
        dto.setSummary("按品类查找单品测评爆款");
        dto.setFeatureType(type);
        dto.setRoute(route);
        dto.setIcon("flame");
        dto.setTags(List.of("爆款链接", "短视频"));
        dto.setStatus(status);
        dto.setSortOrder(10);
        return dto;
    }
}
