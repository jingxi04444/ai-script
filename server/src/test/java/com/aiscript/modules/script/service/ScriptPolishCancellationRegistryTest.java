package com.aiscript.modules.script.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.aiscript.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

class ScriptPolishCancellationRegistryTest {
    private final ScriptPolishCancellationRegistry registry = new ScriptPolishCancellationRegistry();

    @Test
    void cancelInterruptsRegisteredOperation() {
        registry.register(1, 2, 3, "request-1");
        registry.cancel(1, 2, 3, "request-1");

        assertThrows(BusinessException.class, () -> registry.throwIfCancelled(1, 2, 3, "request-1"));
        registry.clear(1, 2, 3, "request-1");

        assertFalse(Thread.currentThread().isInterrupted());
    }

    @Test
    void cancelBeforeRegistrationIsStillObserved() {
        registry.cancel(1, 2, 3, "request-2");

        assertThrows(BusinessException.class, () -> registry.register(1, 2, 3, "request-2"));
        registry.clear(1, 2, 3, "request-2");

        assertFalse(Thread.currentThread().isInterrupted());
    }
}
