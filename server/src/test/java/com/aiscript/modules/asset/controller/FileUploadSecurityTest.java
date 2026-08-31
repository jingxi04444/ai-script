package com.aiscript.modules.asset.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.exception.GlobalExceptionHandler;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.modules.asset.service.ProductFrameContentExtractor;
import com.aiscript.modules.asset.service.impl.AdminFileServiceImpl;
import com.aiscript.modules.membership.service.MembershipStorageService;
import com.aiscript.modules.system.mapper.SysPermissionMapper;
import com.aiscript.modules.system.mapper.SysRoleMapper;
import com.aiscript.modules.system.mapper.SysRolePermissionMapper;
import com.aiscript.modules.system.mapper.SysUserRoleMapper;
import com.aiscript.security.DynamicAuthorizationManager;
import com.aiscript.security.JwtAuthenticationFilter;
import com.aiscript.security.JwtTokenProvider;
import com.aiscript.security.LoginUser;
import com.aiscript.security.PermissionService;
import com.aiscript.security.SecurityConfig;
import com.aiscript.security.SecurityResponseWriter;
import com.aiscript.security.TokenBlacklistService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

@SpringJUnitWebConfig(FileUploadSecurityTest.TestConfig.class)
class FileUploadSecurityTest {
    @Autowired private WebApplicationContext context;
    @Autowired private StorageClient storageClient;
    @Autowired private MembershipStorageService membershipStorageService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        reset(storageClient, membershipStorageService);
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"site-config", "script-template-video"})
    void authorizedAdminUploadsPlatformAssetsWithoutMembership(String folder) throws Exception {
        when(storageClient.putObject(anyString(), any(), anyLong(), anyString()))
            .thenAnswer(invocation -> "platform/" + invocation.getArgument(0, String.class));
        when(storageClient.presignedUrl(anyString()))
            .thenAnswer(invocation -> "https://storage.example/" + invocation.getArgument(0, String.class));

        mockMvc.perform(multipart("/api/admin/files/upload")
                .file(video()).param("folder", folder)
                .with(authentication(login("admin", "admin:file:upload"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(0))
            .andExpect(jsonPath("$.data.objectKey").value(org.hamcrest.Matchers.startsWith("platform/" + folder + "/")))
            .andExpect(jsonPath("$.data.url").value(org.hamcrest.Matchers.startsWith("https://storage.example/platform/" + folder + "/")))
            .andExpect(jsonPath("$.data.fileName").value("example.mp4"))
            .andExpect(jsonPath("$.data.contentType").value("video/mp4"))
            .andExpect(jsonPath("$.data.size").value(3));

        verifyNoInteractions(membershipStorageService);
    }

    @Test
    void anonymousUploadIsUnauthorized() throws Exception {
        mockMvc.perform(multipart("/api/admin/files/upload").file(video()))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value(40100));
        verifyNoInteractions(storageClient, membershipStorageService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"front:file:upload", "admin:file:upload"})
    void frontUserCannotUseAdminUploadEvenWithUploadPermission(String permission) throws Exception {
        mockMvc.perform(multipart("/api/admin/files/upload").file(video())
                .with(authentication(login("front", permission))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value(40300));
        verifyNoInteractions(storageClient, membershipStorageService);
    }

    @Test
    void adminWithoutUploadPermissionIsDeniedEvenBeforePermissionPathMigration() throws Exception {
        // The mocked permission mapper has no API paths: the explicit upload rule must still deny.
        mockMvc.perform(multipart("/api/admin/files/upload").file(video())
                .with(authentication(login("admin", "admin:system:site-config"))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value(40300));
        verifyNoInteractions(storageClient, membershipStorageService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"../site-config", "common", "product-frame"})
    void adminUploadRejectsNonPlatformFolders(String folder) throws Exception {
        mockMvc.perform(multipart("/api/admin/files/upload").file(video()).param("folder", folder)
                .with(authentication(login("admin", "admin:file:upload"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(40000));
        verifyNoInteractions(storageClient, membershipStorageService);
    }

    @Test
    void emptyUploadIsRejected() throws Exception {
        mockMvc.perform(multipart("/api/admin/files/upload")
                .file(new MockMultipartFile("file", "empty.mp4", "video/mp4", new byte[0]))
                .with(authentication(login("admin", "admin:file:upload"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(40001));
        verifyNoInteractions(storageClient, membershipStorageService);
    }

    @Test
    void frontUploadStillRejectsExpiredMembershipBeforeWritingFile() throws Exception {
        when(membershipStorageService.reserve(anyInt(), anyInt(), anyString(), anyLong(), eq("file_upload"), isNull()))
            .thenThrow(new BusinessException(ResultCode.FORBIDDEN, "免费体验已到期，请购买会员套餐"));

        mockMvc.perform(multipart("/api/files/upload").file(video())
                .with(authentication(login("front", "front:file:upload"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(40300))
            .andExpect(jsonPath("$.message").value("免费体验已到期，请购买会员套餐"));

        verify(membershipStorageService).reserve(eq(1), eq(7), anyString(), eq(3L), eq("file_upload"), isNull());
        verifyNoInteractions(storageClient);
    }

    private MockMultipartFile video() {
        return new MockMultipartFile("file", "example.mp4", "video/mp4", new byte[] {1, 2, 3});
    }

    private Authentication login(String userType, String permission) {
        LoginUser user = LoginUser.builder().userId(7).tenantId(1).userType(userType)
            .permissions(List.of(permission)).build();
        return new UsernamePasswordAuthenticationToken(user, null, List.of(new SimpleGrantedAuthority(permission)));
    }

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, DynamicAuthorizationManager.class,
        SecurityResponseWriter.class, GlobalExceptionHandler.class, AdminFileController.class,
        AdminFileServiceImpl.class, FileController.class})
    static class TestConfig {
        @Bean ObjectMapper objectMapper() { return new ObjectMapper(); }
        @Bean JwtTokenProvider jwtTokenProvider() { return mock(JwtTokenProvider.class); }
        @Bean TokenBlacklistService tokenBlacklistService() { return mock(TokenBlacklistService.class); }
        @Bean StorageClient storageClient() { return mock(StorageClient.class); }
        @Bean ProductFrameContentExtractor productFrameContentExtractor() { return mock(ProductFrameContentExtractor.class); }
        @Bean MembershipStorageService membershipStorageService() { return mock(MembershipStorageService.class); }
        @Bean PermissionService permissionService() {
            return new PermissionService(mock(SysUserRoleMapper.class), mock(SysRoleMapper.class),
                mock(SysRolePermissionMapper.class), mock(SysPermissionMapper.class));
        }
    }
}
