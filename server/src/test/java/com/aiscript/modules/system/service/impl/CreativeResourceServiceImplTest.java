package com.aiscript.modules.system.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.system.dto.CreativeResourceMediaDTO;
import com.aiscript.modules.system.dto.CreativeResourceQueryDTO;
import com.aiscript.modules.system.dto.CreativeResourceSaveDTO;
import com.aiscript.modules.system.entity.SysCreativeResource;
import com.aiscript.modules.system.mapper.SysCreativeResourceMapper;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class CreativeResourceServiceImplTest {
    private SysCreativeResourceMapper mapper;
    private CreativeResourceServiceImpl service;

    @BeforeEach
    void setup() {
        mapper = mock(SysCreativeResourceMapper.class);
        service = new CreativeResourceServiceImpl(mapper, new ObjectMapper());
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), "creative-test"), SysCreativeResource.class);
        login("admin");
        when(mapper.findReservedCode(anyString())).thenReturn(null);
        when(mapper.insert(any(SysCreativeResource.class))).thenAnswer(invocation -> {
            ((SysCreativeResource) invocation.getArgument(0)).setId(9007199254740993L); return 1;
        });
    }

    @AfterEach
    void clearSecurity() { SecurityContextHolder.clearContext(); }

    private void login(String type) {
        var principal = LoginUser.builder().userId(7).userType(type).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    private CreativeResourceSaveDTO valid() {
        var dto = new CreativeResourceSaveDTO();
        dto.code = "studio-style"; dto.type = "style"; dto.name = "产品摄影"; dto.category = "摄影";
        dto.coverUrl = "https://example.com/cover.jpg"; dto.prompt = "保留产品包装，柔和侧光";
        dto.status = "published"; dto.licenseNote = "自有原创模板";
        dto.gallery = List.of(new CreativeResourceMediaDTO("参考", "/uploads/cover.png"));
        dto.tags = List.of("摄影", "摄影"); dto.config = Map.of("strength", 0.7);
        return dto;
    }

    private SysCreativeResource resource(String status) {
        var resource = new SysCreativeResource(); resource.setId(9007199254740993L); resource.setCode("studio-style");
        resource.setStatus(status); resource.setDeleted(0); resource.setGalleryJson("[]"); resource.setTagsJson("[]"); resource.setConfigJson("{}");
        return resource;
    }

    @Test
    void ordinaryAndAnonymousAccountsCannotCallAnyAdminOperation() {
        login("front");
        assertEquals(ResultCode.FORBIDDEN, assertThrows(BusinessException.class, () -> service.adminPage(new CreativeResourceQueryDTO())).getResultCode());
        assertThrows(BusinessException.class, () -> service.save(null, valid()));
        assertThrows(BusinessException.class, () -> service.delete(1L));
        SecurityContextHolder.clearContext();
        assertEquals(ResultCode.UNAUTHORIZED, assertThrows(BusinessException.class, () -> service.save(null, valid())).getResultCode());
        verifyNoInteractions(mapper);
    }

    @Test
    void createsPublishedResourceWithStringIdAndJsonCollections() {
        var vo = service.save(null, valid());
        assertEquals("9007199254740993", vo.id);
        assertEquals(List.of("摄影"), vo.tags);
        assertEquals("/uploads/cover.png", vo.gallery.get(0).url());
        assertEquals(0.7, vo.config.get("strength"));
        var capture = ArgumentCaptor.forClass(SysCreativeResource.class);
        verify(mapper).insert(capture.capture());
        assertEquals(7, capture.getValue().getUpdateBy());
        assertNotNull(capture.getValue().getUpdateTime());
    }

    @Test
    void draftMayBeIncompleteButPublishNeedsCoverPromptAndLicense() {
        var dto = valid(); dto.coverUrl = "";
        assertThrows(BusinessException.class, () -> service.save(null, dto));
        dto.coverUrl = "https://example.com/c.jpg"; dto.prompt = "";
        assertThrows(BusinessException.class, () -> service.save(null, dto));
        dto.prompt = "模板"; dto.licenseNote = "";
        assertThrows(BusinessException.class, () -> service.save(null, dto));
        dto.status = "draft"; dto.coverUrl = ""; dto.prompt = "";
        assertEquals("draft", service.save(null, dto).status);
    }

    @Test
    void rejectsUnsafeOrTemporaryMediaInEveryField() {
        for (String value : List.of("javascript:alert(1)", "data:image/png;base64,AA", "blob:https://a/x", "//evil.test/x", "file:///tmp/a", "https://u:p@example.com/a", "/\\evil.test/x")) {
            var dto = valid(); dto.coverUrl = value;
            assertThrows(BusinessException.class, () -> service.save(null, dto), value);
            dto.coverUrl = "https://example.com/c.jpg"; dto.previewVideoUrl = value;
            assertThrows(BusinessException.class, () -> service.save(null, dto), value);
            dto.previewVideoUrl = ""; dto.gallery = List.of(new CreativeResourceMediaDTO("图", value));
            assertThrows(BusinessException.class, () -> service.save(null, dto), value);
        }
        verify(mapper, never()).insert(any(SysCreativeResource.class));
    }

    @Test
    void codeIsImmutableAndReservedAfterSoftDeletionIncludingConcurrentCreate() {
        var existing = resource("draft"); when(mapper.selectById(existing.getId())).thenReturn(existing);
        var dto = valid(); dto.code = "new-code";
        assertThrows(BusinessException.class, () -> service.save(existing.getId(), dto));
        when(mapper.findReservedCode("studio-style")).thenReturn(existing.getId());
        assertEquals(ResultCode.CONFLICT, assertThrows(BusinessException.class, () -> service.save(null, valid())).getResultCode());
        when(mapper.findReservedCode("studio-style")).thenReturn(null);
        when(mapper.insert(any(SysCreativeResource.class))).thenThrow(new DuplicateKeyException("race"));
        assertEquals(ResultCode.CONFLICT, assertThrows(BusinessException.class, () -> service.save(null, valid())).getResultCode());
    }

    @Test
    void validatesBoundedParametersAndLists() {
        var dto = valid(); dto.config = Map.of("__proto__", Map.of("admin", true));
        assertThrows(BusinessException.class, () -> service.save(null, dto));
        dto.config = Map.of("text", "x".repeat(4001));
        assertThrows(BusinessException.class, () -> service.save(null, dto));
        dto.config = Map.of(); dto.tags = java.util.Collections.nCopies(21, "tag");
        assertThrows(BusinessException.class, () -> service.save(null, dto));
        dto.tags = List.of(); dto.gallery = java.util.Collections.nCopies(13, new CreativeResourceMediaDTO("图", "/image.png"));
        assertThrows(BusinessException.class, () -> service.save(null, dto));
    }

    @Test
    void publishedDetailHidesDraftDeletedAndMissingRecords() {
        when(mapper.selectById(1L)).thenReturn(resource("draft"));
        assertEquals(ResultCode.NOT_FOUND, assertThrows(BusinessException.class, () -> service.publishedDetail(1L)).getResultCode());
        var deleted = resource("published"); deleted.setDeleted(1); when(mapper.selectById(2L)).thenReturn(deleted);
        assertThrows(BusinessException.class, () -> service.publishedDetail(2L));
        assertThrows(BusinessException.class, () -> service.publishedDetail(3L));
        when(mapper.selectById(4L)).thenReturn(resource("published"));
        assertEquals("published", service.publishedDetail(4L).status);
    }

    @Test
    @SuppressWarnings("unchecked")
    void publicPageForcesPublishedEvenWhenDraftRequestedAndReturnsStandardPagination() {
        when(mapper.selectPage(any(Page.class), any())).thenAnswer(invocation -> {
            Page<SysCreativeResource> page = invocation.getArgument(0);
            LambdaQueryWrapper<SysCreativeResource> query = invocation.getArgument(1);
            query.getSqlSegment();
            assertTrue(query.getParamNameValuePairs().containsValue("published"));
            assertFalse(query.getParamNameValuePairs().containsValue("draft"));
            page.setTotal(11); page.setRecords(List.of(resource("published"))); return page;
        });
        var query = new CreativeResourceQueryDTO(); query.setStatus("draft"); query.setPage(2L); query.setPageSize(10L);
        var result = service.publishedPage(query);
        assertEquals(11, result.getTotal()); assertEquals(2, result.getPage()); assertEquals(10, result.getPageSize()); assertEquals(2, result.getPages());
        assertEquals("9007199254740993", result.getList().get(0).id);
    }

    @Test
    @SuppressWarnings("unchecked")
    void keywordSearchIncludesJsonTagsWithBoundParameter() {
        when(mapper.selectPage(any(Page.class), any())).thenAnswer(invocation -> {
            LambdaQueryWrapper<SysCreativeResource> wrapper = invocation.getArgument(1);
            String sql = wrapper.getSqlSegment();
            assertTrue(sql.contains("name LIKE"));
            assertTrue(sql.contains("code LIKE"));
            assertTrue(sql.contains("description LIKE"));
            assertTrue(sql.contains("CAST(tags_json AS CHAR) LIKE"));
            assertFalse(sql.contains("仅标签命中"), "Search text is a bound parameter, not SQL interpolation");
            assertTrue(wrapper.getParamNameValuePairs().containsValue("%仅标签命中%"));
            return invocation.getArgument(0);
        });
        var query = new CreativeResourceQueryDTO(); query.setKeyword("仅标签命中");
        service.publishedPage(query);
    }

    @Test
    void logicalDeleteUsesEntityAndRefreshesAudit() {
        var existing = resource("draft"); existing.setUpdateBy(99);
        when(mapper.selectById(existing.getId())).thenReturn(existing);
        when(mapper.deleteById(existing)).thenReturn(1);
        service.delete(existing.getId());
        verify(mapper).deleteById(existing);
        assertEquals(7, existing.getUpdateBy()); assertNotNull(existing.getUpdateTime());
    }
}
