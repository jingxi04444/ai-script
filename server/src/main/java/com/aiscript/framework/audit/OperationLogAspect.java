package com.aiscript.framework.audit;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.util.Arrays;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

@Aspect
@Component
public class OperationLogAspect {
    private final OperationLogService operationLogService;

    public OperationLogAspect(OperationLogService operationLogService) {
        this.operationLogService = operationLogService;
    }

    @Around("within(@org.springframework.web.bind.annotation.RestController *)")
    public Object aroundController(ProceedingJoinPoint joinPoint) throws Throwable {
        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        HttpServletRequest request = currentRequest();
        boolean shouldLog = request != null
            && !"GET".equalsIgnoreCase(request.getMethod())
            && method.getAnnotation(GetMapping.class) == null;
        if (!shouldLog) {
            return joinPoint.proceed();
        }
        String moduleCode = moduleCode(request);
        String actionCode = request.getMethod() + " " + request.getRequestURI();
        Integer targetId = parseLastPathId(request.getRequestURI());
        Object payload = sanitizeArgs(joinPoint.getArgs());
        try {
            Object result = joinPoint.proceed();
            operationLogService.record(moduleCode, actionCode, targetId, payload, true);
            return result;
        } catch (Throwable ex) {
            operationLogService.record(moduleCode, actionCode, targetId, payload, false);
            throw ex;
        }
    }

    private HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return attributes.getRequest();
        }
        return null;
    }

    private String moduleCode(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String normalized = uri.replaceFirst("^/api/admin/?", "").replaceFirst("^/api/?", "");
        if (normalized.isBlank()) {
            return "api";
        }
        return normalized.split("/")[0];
    }

    private Integer parseLastPathId(String uri) {
        String[] parts = uri.split("/");
        for (int i = parts.length - 1; i >= 0; i--) {
            try {
                return Integer.valueOf(parts[i]);
            } catch (NumberFormatException ignored) {
                // Continue scanning.
            }
        }
        return null;
    }

    private Object sanitizeArgs(Object[] args) {
        return Arrays.stream(args)
            .map(arg -> {
                if (arg instanceof MultipartFile file) {
                    return "MultipartFile(" + file.getOriginalFilename() + "," + file.getSize() + ")";
                }
                if (arg instanceof HttpServletRequest) {
                    return "HttpServletRequest";
                }
                return arg == null ? "" : arg.getClass().getSimpleName() + ":" + arg;
            })
            .toList();
    }
}
