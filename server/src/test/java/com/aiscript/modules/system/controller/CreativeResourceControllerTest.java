package com.aiscript.modules.system.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.aiscript.common.exception.GlobalExceptionHandler;
import com.aiscript.modules.system.entity.SysCreativeResource;
import com.aiscript.modules.system.mapper.SysCreativeResourceMapper;
import com.aiscript.modules.system.service.impl.CreativeResourceServiceImpl;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class CreativeResourceControllerTest {
    private SysCreativeResourceMapper mapper;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        mapper = mock(SysCreativeResourceMapper.class);
        var service = new CreativeResourceServiceImpl(mapper, new ObjectMapper());
        mvc = MockMvcBuilders.standaloneSetup(new CreativeResourceController(service), new AdminCreativeResourceController(service))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        var user = LoginUser.builder().userId(8).userType("front").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }

    @AfterEach
    void clear() { SecurityContextHolder.clearContext(); }

    @Test
    void frontAccountCannotReadOrMutateAdminCatalogEvenWithoutSecurityFilter() throws Exception {
        mvc.perform(get("/api/admin/creative-resources")).andExpect(jsonPath("$.code").value(40300));
        mvc.perform(post("/api/admin/creative-resources").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(jsonPath("$.code").value(40300));
        mvc.perform(put("/api/admin/creative-resources/1").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(jsonPath("$.code").value(40300));
        mvc.perform(delete("/api/admin/creative-resources/1")).andExpect(jsonPath("$.code").value(40300));
        verifyNoInteractions(mapper);
    }

    @Test
    void detailUsesUnifiedEnvelopeAndStringLongId() throws Exception {
        var resource = new SysCreativeResource(); resource.setId(9007199254740993L); resource.setStatus("published"); resource.setName("角色");
        when(mapper.selectById(9007199254740993L)).thenReturn(resource);
        mvc.perform(get("/api/creative-resources/9007199254740993"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(0))
            .andExpect(jsonPath("$.data.id").isString()).andExpect(jsonPath("$.data.id").value("9007199254740993"))
            .andExpect(jsonPath("$.data.gallery").isArray()).andExpect(jsonPath("$.data.tags").isArray());
    }

    @Test
    @SuppressWarnings("unchecked")
    void pageReturnsStandardShapeAndRejectsOversizedPagination() throws Exception {
        when(mapper.selectPage(any(Page.class), any())).thenAnswer(invocation -> invocation.getArgument(0));
        mvc.perform(get("/api/creative-resources").param("page", "2").param("pageSize", "12").param("type", "style").param("status", "draft"))
            .andExpect(jsonPath("$.code").value(0)).andExpect(jsonPath("$.data.page").value(2))
            .andExpect(jsonPath("$.data.pageSize").value(12)).andExpect(jsonPath("$.data.total").value(0))
            .andExpect(jsonPath("$.data.pages").value(0)).andExpect(jsonPath("$.data.list").isArray());
        mvc.perform(get("/api/creative-resources").param("pageSize", "201")).andExpect(jsonPath("$.code").value(40000));
    }
}
