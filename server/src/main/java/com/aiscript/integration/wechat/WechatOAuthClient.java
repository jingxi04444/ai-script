package com.aiscript.integration.wechat;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.config.WechatAuthProperties;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class WechatOAuthClient {
    private final WechatAuthProperties properties;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();

    public WechatOAuthClient(WechatAuthProperties properties) {
        this.properties = properties;
    }

    public String buildAuthorizationUrl(String state) {
        ensureConfigured();
        return "https://open.weixin.qq.com/connect/qrconnect?appid=" + encode(properties.getAppId())
            + "&redirect_uri=" + encode(properties.getCallbackUrl())
            + "&response_type=code&scope=snsapi_login&state=" + encode(state)
            + "#wechat_redirect";
    }

    public Map<String, Object> fetchUser(String code) {
        ensureConfigured();
        Map<String, Object> token = get("https://api.weixin.qq.com/sns/oauth2/access_token?appid="
            + encode(properties.getAppId()) + "&secret=" + encode(properties.getAppSecret())
            + "&code=" + encode(code) + "&grant_type=authorization_code");
        String accessToken = value(token, "access_token");
        String openId = value(token, "openid");
        if (!StringUtils.hasText(accessToken) || !StringUtils.hasText(openId)) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "微信授权凭证获取失败");
        }
        return get("https://api.weixin.qq.com/sns/userinfo?access_token=" + encode(accessToken)
            + "&openid=" + encode(openId) + "&lang=zh_CN");
    }

    private Map<String, Object> get(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(8)).GET().build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            Map<String, Object> result = JsonUtils.toMap(response.body());
            if (response.statusCode() < 200 || response.statusCode() >= 300 || result.containsKey("errcode")) {
                throw new BusinessException(ResultCode.PROVIDER_ERROR,
                    "微信授权失败：" + result.getOrDefault("errmsg", response.body()));
            }
            return result;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "微信授权请求被中断");
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(ResultCode.PROVIDER_ERROR, "微信授权请求失败");
        }
    }

    private void ensureConfigured() {
        if (!properties.isEnabled() || !StringUtils.hasText(properties.getAppId())
            || !StringUtils.hasText(properties.getAppSecret()) || !StringUtils.hasText(properties.getCallbackUrl())) {
            throw new BusinessException("微信开放平台登录尚未配置");
        }
    }

    private String value(Map<String, Object> source, String key) {
        Object value = source.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
