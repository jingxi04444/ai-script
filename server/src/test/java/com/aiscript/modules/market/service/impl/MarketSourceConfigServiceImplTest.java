package com.aiscript.modules.market.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.integration.sms.SmsClient;
import com.aiscript.modules.market.dto.MarketSourceConfigSaveDTO;
import com.aiscript.modules.market.entity.SysMarketSourceConfig;
import com.aiscript.modules.market.mapper.SysMarketSourceConfigMapper;
import com.aiscript.security.LoginUser;
import java.time.LocalDateTime;
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
class MarketSourceConfigServiceImplTest {
    @Mock
    private SysMarketSourceConfigMapper mapper;
    @Mock
    private SecretCipherService secretCipherService;
    @Mock
    private SmsClient smsClient;

    private MarketSourceConfigServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MarketSourceConfigServiceImpl(mapper, secretCipherService, smsClient);
        LoginUser admin = LoginUser.builder()
            .userId(9)
            .tenantId(2)
            .userType("admin")
            .build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(admin, null, List.of())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void saveEncryptsCookieAndAlertPhoneBeforeInsert() {
        when(mapper.selectByTenantAndPlatform(2, "douyin")).thenReturn(null);
        when(secretCipherService.encrypt("sid=secret; uid=1")).thenReturn("ENC(cookie)");
        when(secretCipherService.encrypt("13800138000")).thenReturn("ENC(phone)");
        when(mapper.insert(any(SysMarketSourceConfig.class))).thenReturn(1);
        MarketSourceConfigSaveDTO dto = new MarketSourceConfigSaveDTO();
        dto.setCookie("sid=secret; uid=1");
        dto.setAlertPhone("13800138000");
        dto.setEnabled(true);
        dto.setAlertEnabled(true);

        service.save("douyin", dto);

        ArgumentCaptor<SysMarketSourceConfig> captor = ArgumentCaptor.forClass(SysMarketSourceConfig.class);
        verify(mapper).insert(captor.capture());
        assertThat(captor.getValue().getCookieEncrypted()).isEqualTo("ENC(cookie)");
        assertThat(captor.getValue().getAlertPhoneEncrypted()).isEqualTo("ENC(phone)");
        assertThat(captor.getValue().getTenantId()).isEqualTo(2);
    }

    @Test
    void alertsOnlyAfterTwoConsecutiveFailuresAndThenEntersCooldown() {
        SysMarketSourceConfig config = sourceConfig(0);
        when(mapper.selectByTenantAndPlatform(2, "douyin")).thenReturn(config);
        when(secretCipherService.decrypt("ENC(phone)")).thenReturn("13800138000");
        when(mapper.updateById(any(SysMarketSourceConfig.class))).thenReturn(1);

        service.recordValidation(2, "douyin", false, "Cookie 登录态无效");

        verify(smsClient, never()).sendMarketCookieExpiryAlert(any(), any());
        assertThat(config.getCookieStatus()).isEqualTo("check_failed");

        service.recordValidation(2, "douyin", false, "Cookie 登录态无效");

        verify(smsClient).sendMarketCookieExpiryAlert("13800138000", "抖音");
        assertThat(config.getCookieStatus()).isEqualTo("invalid");
        assertThat(config.getNotificationState()).isEqualTo("alerted");
        assertThat(config.getLastAlertAt()).isNotNull();
    }

    @Test
    void successfulValidationResetsFailureAndNotificationState() {
        SysMarketSourceConfig config = sourceConfig(2);
        config.setCookieStatus("invalid");
        config.setNotificationState("alerted");
        config.setLastAlertAt(LocalDateTime.now().minusHours(2));
        when(mapper.selectByTenantAndPlatform(2, "xiaohongshu")).thenReturn(config);
        when(mapper.updateById(any(SysMarketSourceConfig.class))).thenReturn(1);

        service.recordValidation(2, "xiaohongshu", true, "");

        assertThat(config.getCookieStatus()).isEqualTo("valid");
        assertThat(config.getConsecutiveFailures()).isZero();
        assertThat(config.getNotificationState()).isEqualTo("normal");
        verify(smsClient, never()).sendMarketCookieExpiryAlert(any(), eq("小红书"));
    }

    @Test
    void credentialReturnsDecryptedCookieForInternalSkill() {
        SysMarketSourceConfig config = sourceConfig(0);
        config.setCookieEncrypted("ENC(cookie)");
        when(mapper.selectByTenantAndPlatform(2, "douyin")).thenReturn(config);
        when(secretCipherService.decrypt("ENC(cookie)")).thenReturn("sid=secret");

        assertThat(service.credential(2, "douyin").getCookie()).isEqualTo("sid=secret");
    }

    private static SysMarketSourceConfig sourceConfig(int failures) {
        SysMarketSourceConfig config = new SysMarketSourceConfig();
        config.setId(1L);
        config.setTenantId(2);
        config.setPlatform("douyin");
        config.setCookieEncrypted("ENC(cookie)");
        config.setAlertPhoneEncrypted("ENC(phone)");
        config.setEnabled(1);
        config.setAlertEnabled(1);
        config.setCookieStatus("unchecked");
        config.setNotificationState("normal");
        config.setConsecutiveFailures(failures);
        return config;
    }
}
