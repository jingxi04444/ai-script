package com.aiscript.common.api;

import lombok.Data;

import com.aiscript.framework.log.TraceIdHolder;

@Data
public class R<T> {
    private Integer code;
    private String message;
    private T data;
    private String traceId;
    private Long timestamp;

    public static <T> R<T> ok() {
        return ok(null);
    }

    public static <T> R<T> ok(T data) {
        R<T> result = new R<>();
        result.setCode(ResultCode.SUCCESS.getCode());
        result.setMessage(ResultCode.SUCCESS.getMessage());
        result.setData(data);
        result.fillMeta();
        return result;
    }

    public static <T> R<T> fail(ResultCode resultCode) {
        return fail(resultCode, resultCode.getMessage());
    }

    public static <T> R<T> fail(ResultCode resultCode, String message) {
        R<T> result = new R<>();
        result.setCode(resultCode.getCode());
        result.setMessage(message);
        result.setData(null);
        result.fillMeta();
        return result;
    }

    private void fillMeta() {
        this.traceId = TraceIdHolder.getTraceId();
        this.timestamp = System.currentTimeMillis();
    }
}
