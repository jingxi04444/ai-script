package com.aiscript.common.exception;

import com.aiscript.common.api.ResultCode;
import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final ResultCode resultCode;

    public BusinessException(String message) {
        this(ResultCode.BUSINESS_ERROR, message);
    }

    public BusinessException(ResultCode resultCode, String message) {
        super(message);
        this.resultCode = resultCode;
    }

}
