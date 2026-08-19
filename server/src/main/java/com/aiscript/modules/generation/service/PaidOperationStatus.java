package com.aiscript.modules.generation.service;

public enum PaidOperationStatus {
    NEW,
    RUNNING,
    SUCCESS,
    FAILED;

    public static PaidOperationStatus fromPersistentValue(String value) {
        return switch (value) {
            case "pending" -> NEW;
            case "running" -> RUNNING;
            case "success" -> SUCCESS;
            case "failed" -> FAILED;
            default -> throw new IllegalArgumentException("Unsupported paid operation status: " + value);
        };
    }
}
