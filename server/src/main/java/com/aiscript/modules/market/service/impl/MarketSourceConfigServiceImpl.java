package com.aiscript.modules.market.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.secret.SecretCipherService;
import com.aiscript.integration.sms.SmsClient;
import com.aiscript.modules.market.dto.MarketSourceConfigSaveDTO;
import com.aiscript.modules.market.entity.SysMarketSourceConfig;
import com.aiscript.modules.market.mapper.SysMarketSourceConfigMapper;
import com.aiscript.modules.market.service.MarketSourceConfigService;
import com.aiscript.modules.market.vo.MarketSourceConfigVO;
import com.aiscript.modules.market.vo.MarketSourceCredentialVO;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Slf4j
public class MarketSourceConfigServiceImpl implements MarketSourceConfigService {
    private static final List<String> PLATFORM_ORDER = List.of("douyin", "xiaohongshu");
    private static final Set<String> PLATFORMS = Set.copyOf(PLATFORM_ORDER);
    private static final int ALERT_AFTER_FAILURES = 2;
    private static final int REMINDER_COOLDOWN_HOURS = 24;
    private final SysMarketSourceConfigMapper mapper;
    private final SecretCipherService secretCipherService;
    private final SmsClient smsClient;

    public MarketSourceConfigServiceImpl(
        SysMarketSourceConfigMapper mapper,
        SecretCipherService secretCipherService,
        SmsClient smsClient
    ) {
        this.mapper = mapper;
        this.secretCipherService = secretCipherService;
        this.smsClient = smsClient;
    }

    @Override
    public List<MarketSourceConfigVO> listCurrentTenant() {
        CurrentAdmin admin = currentAdmin();
        Map<String, SysMarketSourceConfig> existing = new LinkedHashMap<>();
        mapper.selectList(new LambdaQueryWrapper<SysMarketSourceConfig>()
                .eq(SysMarketSourceConfig::getTenantId, admin.tenantId()))
            .forEach(item -> existing.put(item.getPlatform(), item));
        List<MarketSourceConfigVO> result = new ArrayList<>();
        for (String platform : PLATFORM_ORDER) {
            result.add(toVO(existing.get(platform), platform));
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MarketSourceConfigVO save(String platformValue, MarketSourceConfigSaveDTO dto) {
        CurrentAdmin admin = currentAdmin();
        String platform = normalizePlatform(platformValue);
        if (dto == null) {
            throw invalid("配置内容不能为空");
        }
        SysMarketSourceConfig entity = mapper.selectByTenantAndPlatform(admin.tenantId(), platform);
        boolean creating = entity == null;
        if (creating) {
            entity = new SysMarketSourceConfig();
            entity.setTenantId(admin.tenantId());
            entity.setPlatform(platform);
            entity.setEnabled(1);
            entity.setAlertEnabled(1);
            entity.setCookieStatus("unchecked");
            entity.setNotificationState("normal");
            entity.setConsecutiveFailures(0);
        }

        if (StringUtils.hasText(dto.getCookie())) {
            String cookie = validateCookie(dto.getCookie());
            entity.setCookieEncrypted(secretCipherService.encrypt(cookie));
            entity.setCookieStatus("unchecked");
            entity.setNotificationState("normal");
            entity.setConsecutiveFailures(0);
            entity.setLastErrorMessage(null);
            entity.setLastCheckedAt(null);
            entity.setLastValidAt(null);
        }
        if (Boolean.TRUE.equals(dto.getClearAlertPhone())) {
            entity.setAlertPhoneEncrypted(null);
        } else if (StringUtils.hasText(dto.getAlertPhone())) {
            entity.setAlertPhoneEncrypted(secretCipherService.encrypt(dto.getAlertPhone().trim()));
        }
        if (dto.getEnabled() != null) {
            entity.setEnabled(dto.getEnabled() ? 1 : 0);
        }
        if (dto.getAlertEnabled() != null) {
            entity.setAlertEnabled(dto.getAlertEnabled() ? 1 : 0);
        }
        if (Integer.valueOf(1).equals(entity.getAlertEnabled())
            && !StringUtils.hasText(entity.getAlertPhoneEncrypted())) {
            throw invalid("开启Cookie过期提醒时必须配置提醒手机号");
        }
        if (creating && !StringUtils.hasText(entity.getCookieEncrypted())) {
            throw invalid("首次配置时必须填写 Cookie");
        }
        entity.setUpdateBy(admin.userId());
        entity.setUpdateTime(LocalDateTime.now());
        if (creating) {
            entity.setCreateBy(admin.userId());
            entity.setCreateTime(LocalDateTime.now());
            entity.setDeleted(0);
            mapper.insert(entity);
        } else {
            mapper.updateById(entity);
        }
        return toVO(entity, platform);
    }

    @Override
    public MarketSourceCredentialVO credential(Integer tenantId, String platformValue) {
        if (tenantId == null) {
            throw invalid("租户ID不能为空");
        }
        String platform = normalizePlatform(platformValue);
        SysMarketSourceConfig config = mapper.selectByTenantAndPlatform(tenantId, platform);
        if (config == null || !Integer.valueOf(1).equals(config.getEnabled())) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR,
                platformName(platform) + "采集源未启用，请在后台市场采集配置中开启");
        }
        if (!StringUtils.hasText(config.getCookieEncrypted())) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR,
                platformName(platform) + "Cookie 未配置，请在后台市场采集配置中填写");
        }
        return new MarketSourceCredentialVO(
            platform,
            secretCipherService.decrypt(config.getCookieEncrypted())
        );
    }

    @Override
    public List<SysMarketSourceConfig> listEnabledSources() {
        return mapper.selectList(new LambdaQueryWrapper<SysMarketSourceConfig>()
            .eq(SysMarketSourceConfig::getEnabled, 1)
            .isNotNull(SysMarketSourceConfig::getCookieEncrypted));
    }

    @Override
    public void recordValidation(Integer tenantId, String platformValue, boolean valid, String errorMessage) {
        String platform = normalizePlatform(platformValue);
        SysMarketSourceConfig entity = mapper.selectByTenantAndPlatform(tenantId, platform);
        if (entity == null) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        entity.setLastCheckedAt(now);
        entity.setUpdateTime(now);
        if (valid) {
            entity.setCookieStatus("valid");
            entity.setConsecutiveFailures(0);
            entity.setLastValidAt(now);
            entity.setLastErrorMessage(null);
            entity.setNotificationState("normal");
            mapper.updateById(entity);
            return;
        }

        int failures = Math.max(0, entity.getConsecutiveFailures() == null ? 0 : entity.getConsecutiveFailures()) + 1;
        entity.setConsecutiveFailures(failures);
        entity.setCookieStatus(failures >= ALERT_AFTER_FAILURES ? "invalid" : "check_failed");
        entity.setLastErrorMessage(safeText(errorMessage, 500));
        mapper.updateById(entity);

        if (failures < ALERT_AFTER_FAILURES || !Integer.valueOf(1).equals(entity.getAlertEnabled())) {
            return;
        }
        boolean reminderDue = entity.getLastAlertAt() == null
            || !"alerted".equals(entity.getNotificationState())
            || entity.getLastAlertAt().isBefore(now.minusHours(REMINDER_COOLDOWN_HOURS));
        if (!reminderDue || !StringUtils.hasText(entity.getAlertPhoneEncrypted())) {
            return;
        }
        try {
            String phone = secretCipherService.decrypt(entity.getAlertPhoneEncrypted());
            smsClient.sendMarketCookieExpiryAlert(phone, platformName(platform));
            entity.setLastAlertAt(now);
            entity.setNotificationState("alerted");
            entity.setUpdateTime(now);
            mapper.updateById(entity);
        } catch (RuntimeException exception) {
            log.error(
                "Market source cookie alert failed: tenantId={}, platform={}",
                tenantId, platform, exception
            );
        }
    }

    private MarketSourceConfigVO toVO(SysMarketSourceConfig entity, String platform) {
        MarketSourceConfigVO vo = new MarketSourceConfigVO();
        vo.setPlatform(platform);
        vo.setPlatformName(platformName(platform));
        if (entity == null) {
            vo.setCookieConfigured(false);
            vo.setAlertPhoneConfigured(false);
            vo.setEnabled(true);
            vo.setAlertEnabled(true);
            vo.setCookieStatus("unchecked");
            vo.setConsecutiveFailures(0);
            return vo;
        }
        vo.setId(String.valueOf(entity.getId()));
        vo.setCookieConfigured(StringUtils.hasText(entity.getCookieEncrypted()));
        vo.setAlertPhoneConfigured(StringUtils.hasText(entity.getAlertPhoneEncrypted()));
        if (StringUtils.hasText(entity.getAlertPhoneEncrypted())) {
            try {
                vo.setMaskedAlertPhone(maskPhone(secretCipherService.decrypt(entity.getAlertPhoneEncrypted())));
            } catch (RuntimeException exception) {
                log.warn("Market source alert phone cannot be decrypted: tenantId={}, platform={}",
                    entity.getTenantId(), platform);
            }
        }
        vo.setEnabled(Integer.valueOf(1).equals(entity.getEnabled()));
        vo.setAlertEnabled(Integer.valueOf(1).equals(entity.getAlertEnabled()));
        vo.setCookieStatus(entity.getCookieStatus());
        vo.setConsecutiveFailures(entity.getConsecutiveFailures());
        vo.setLastErrorMessage(entity.getLastErrorMessage());
        vo.setLastCheckedAt(entity.getLastCheckedAt());
        vo.setLastValidAt(entity.getLastValidAt());
        vo.setLastAlertAt(entity.getLastAlertAt());
        return vo;
    }

    private CurrentAdmin currentAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser user)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录管理员账号");
        }
        if (!"admin".equals(user.getUserType())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅管理员可维护市场采集配置");
        }
        return new CurrentAdmin(user.getTenantId() == null ? 1 : user.getTenantId(), user.getUserId());
    }

    private static String validateCookie(String value) {
        String cookie = value == null ? "" : value.trim();
        if (cookie.length() > 30_000) {
            throw invalid("Cookie 内容过长");
        }
        if (cookie.indexOf('=') < 0 || cookie.indexOf('\0') >= 0) {
            throw invalid("Cookie 格式不正确，请粘贴浏览器中的完整 Cookie");
        }
        return cookie;
    }

    private static String normalizePlatform(String value) {
        String platform = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (!PLATFORMS.contains(platform)) {
            throw invalid("只支持抖音和小红书采集源");
        }
        return platform;
    }

    private static String platformName(String platform) {
        return "douyin".equals(platform) ? "抖音" : "小红书";
    }

    private static String maskPhone(String phone) {
        if (!StringUtils.hasText(phone) || phone.length() < 7) {
            return "***";
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    private static String safeText(String value, int maxLength) {
        if (value == null) return "";
        String result = value.replace('\0', ' ').replaceAll("\\s+", " ").trim();
        return result.length() > maxLength ? result.substring(0, maxLength) : result;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ResultCode.PARAM_ERROR, message);
    }

    private record CurrentAdmin(int tenantId, Integer userId) {
    }
}
