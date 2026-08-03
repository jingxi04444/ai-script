package com.aiscript.modules.auth.service;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.integration.wechat.WechatOAuthClient;
import com.aiscript.modules.auth.entity.SysUser;
import com.aiscript.modules.auth.mapper.SysUserMapper;
import com.aiscript.modules.auth.vo.WechatLoginStartVO;
import com.aiscript.modules.auth.vo.WechatLoginStatusVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WechatAuthService {
    private static final String KEY_PREFIX = "auth:wechat:";
    private final WechatOAuthClient wechatOAuthClient;
    private final StringRedisTemplate redisTemplate;
    private final SysUserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    public WechatAuthService(WechatOAuthClient wechatOAuthClient, StringRedisTemplate redisTemplate,
        SysUserMapper userMapper, PasswordEncoder passwordEncoder,
        AuthService authService) {
        this.wechatOAuthClient = wechatOAuthClient;
        this.redisTemplate = redisTemplate;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
    }

    public WechatLoginStartVO start() {
        String state = UUID.randomUUID().toString().replace("-", "");
        String authorizationUrl = wechatOAuthClient.buildAuthorizationUrl(state);
        redisTemplate.opsForValue().set(KEY_PREFIX + state, "waiting", Duration.ofMinutes(5));
        WechatLoginStartVO vo = new WechatLoginStartVO();
        vo.setState(state);
        vo.setAuthorizationUrl(authorizationUrl);
        vo.setExpiresIn(300);
        return vo;
    }

    @Transactional(rollbackFor = Exception.class)
    public void callback(String code, String state) {
        String key = KEY_PREFIX + state;
        if (!"waiting".equals(redisTemplate.opsForValue().get(key))) {
            throw new BusinessException("微信登录二维码已过期");
        }
        Map<String, Object> profile = wechatOAuthClient.fetchUser(code);
        String openId = String.valueOf(profile.get("openid"));
        Object unionValue = profile.get("unionid");
        String unionId = unionValue == null ? null : String.valueOf(unionValue);
        SysUser user = userMapper.selectOne(new LambdaQueryWrapper<SysUser>()
            .eq(SysUser::getUserType, "front")
            .and(query -> query.eq(SysUser::getWechatOpenId, openId)
                .or(unionId != null, nested -> nested.eq(SysUser::getWechatUnionId, unionId)))
            .last("limit 1"));
        if (user == null) {
            user = new SysUser();
            user.setTenantId(1);
            user.setUsername(String.valueOf(profile.getOrDefault("nickname", "微信用户")));
            user.setAccount("wx_" + openId);
            user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setAvatarUrl(String.valueOf(profile.getOrDefault("headimgurl", "")));
            user.setWechatOpenId(openId);
            user.setWechatUnionId(unionId);
            user.setUserType("front");
            user.setMemberLevel(0);
            user.setStatus(1);
            userMapper.insert(user);
        }
        redisTemplate.opsForValue().set(key, "complete:" + user.getId(), Duration.ofMinutes(2));
    }

    public WechatLoginStatusVO status(String state) {
        String key = KEY_PREFIX + state;
        String value = redisTemplate.opsForValue().get(key);
        WechatLoginStatusVO vo = new WechatLoginStatusVO();
        if (value == null) {
            vo.setStatus("expired");
        } else if (value.startsWith("complete:")) {
            Integer userId = Integer.valueOf(value.substring("complete:".length()));
            vo.setStatus("complete");
            vo.setLogin(authService.loginWechatUser(userId));
            redisTemplate.delete(key);
        } else {
            vo.setStatus("waiting");
        }
        return vo;
    }
}
