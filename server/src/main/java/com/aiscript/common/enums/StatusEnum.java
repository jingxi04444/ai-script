package com.aiscript.common.enums;

public enum StatusEnum {
    DISABLED(0),
    ENABLED(1);

    private final int value;

    StatusEnum(int value) {
        this.value = value;
    }
}
