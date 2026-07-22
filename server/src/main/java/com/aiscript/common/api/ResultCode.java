package com.aiscript.common.api;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ResultCode {
    SUCCESS(0, "success"),
    PARAM_ERROR(40000, "请求参数错误"),
    BUSINESS_ERROR(40001, "业务校验失败"),
    UNAUTHORIZED(40100, "未登录或 Token 无效"),
    FORBIDDEN(40300, "无权限"),
    NOT_FOUND(40400, "资源不存在"),
    CONFLICT(40900, "数据状态冲突"),
    TOO_MANY_REQUESTS(42900, "请求过于频繁"),
    SYSTEM_ERROR(50000, "系统异常"),
    PROVIDER_ERROR(50010, "第三方 Provider 调用失败");

    private final int code;
    private final String message;
}
