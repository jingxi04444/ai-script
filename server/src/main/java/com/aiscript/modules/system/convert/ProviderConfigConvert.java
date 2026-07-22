package com.aiscript.modules.system.convert;

import com.aiscript.modules.system.entity.SysApiProviderConfig;
import com.aiscript.modules.system.vo.ProviderConfigVO;
import org.springframework.util.StringUtils;

public final class ProviderConfigConvert {
    private ProviderConfigConvert() {
    }

    public static ProviderConfigVO toVO(SysApiProviderConfig entity) {
        ProviderConfigVO vo = new ProviderConfigVO();
        vo.setId(String.valueOf(entity.getId()));
        vo.setProviderType(entity.getProviderType());
        vo.setProviderName(entity.getProviderName());
        vo.setPlatform(entity.getPlatform());
        vo.setEndpointUrl(entity.getEndpointUrl());
        vo.setPriority(entity.getPriority());
        vo.setTimeoutMs(entity.getTimeoutMs());
        vo.setRetryCount(entity.getRetryCount());
        vo.setConfigJson(entity.getConfigJson());
        vo.setStatus(entity.getStatus());
        vo.setApiKeyConfigured(StringUtils.hasText(entity.getApiKeyEncrypted()));
        return vo;
    }
}
