package com.aiscript.modules.script.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 脚本链接分享状态。脚本分享只有两种状态：未开启、互联网获得链接的人可评论。
 * 链接不设有效期，关闭分享或撤销后立即失效。
 */
@Data
@AllArgsConstructor
public class ScriptShareLinkVO {
    private boolean enabled;
    private String status;
    private String permission;
    private String path;
    private String token;
}
