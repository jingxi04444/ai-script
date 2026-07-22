package com.aiscript.framework.audit;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.apache.ibatis.annotations.Mapper;
import lombok.Data;

@Service
public class OperationLogService {
    private final SysOperationLogMapper operationLogMapper;

    public OperationLogService(SysOperationLogMapper operationLogMapper) {
        this.operationLogMapper = operationLogMapper;
    }

    public void record(String moduleCode, String actionCode, Integer targetId, Object payload, boolean success) {
        HttpServletRequest request = currentRequest();
        SysOperationLog log = new SysOperationLog();
        log.setTenantId(currentTenantId());
        log.setUserId(currentUserId());
        log.setModuleCode(moduleCode);
        log.setActionCode(actionCode);
        log.setTargetType(moduleCode);
        log.setTargetId(targetId);
        log.setRequestPayload(JsonUtils.toJson(Map.of("payload", payload == null ? "" : String.valueOf(payload))));
        log.setResultStatus(success ? "success" : "failed");
        if (request != null) {
            log.setIpAddress(clientIp(request));
            log.setUserAgent(request.getHeader("User-Agent"));
        }
        operationLogMapper.insert(log);
    }

    public void record(String moduleCode, String actionCode, Integer targetId) {
        record(moduleCode, actionCode, targetId, null, true);
    }

    public PageResult<OperationLogVO> page(PageQuery query, String moduleCode, String resultStatus) {
        LambdaQueryWrapper<SysOperationLog> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(moduleCode)) {
            wrapper.eq(SysOperationLog::getModuleCode, moduleCode);
        }
        if (StringUtils.hasText(resultStatus)) {
            wrapper.eq(SysOperationLog::getResultStatus, resultStatus);
        }
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.and(w -> w.like(SysOperationLog::getActionCode, query.getKeyword())
                .or()
                .like(SysOperationLog::getIpAddress, query.getKeyword()));
        }
        wrapper.orderByDesc(SysOperationLog::getCreateTime);
        IPage<SysOperationLog> page = operationLogMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(
            page.getRecords().stream().map(this::toVO).toList(),
            page.getTotal(),
            page.getCurrent(),
            page.getSize(),
            page.getPages()
        );
    }

    private OperationLogVO toVO(SysOperationLog log) {
        OperationLogVO vo = new OperationLogVO();
        vo.setId(String.valueOf(log.getId()));
        vo.setTenantId(log.getTenantId() == null ? null : String.valueOf(log.getTenantId()));
        vo.setUserId(log.getUserId() == null ? null : String.valueOf(log.getUserId()));
        vo.setModuleCode(log.getModuleCode());
        vo.setActionCode(log.getActionCode());
        vo.setTargetType(log.getTargetType());
        vo.setTargetId(log.getTargetId() == null ? null : String.valueOf(log.getTargetId()));
        vo.setResultStatus(log.getResultStatus());
        vo.setIpAddress(log.getIpAddress());
        vo.setUserAgent(log.getUserAgent());
        vo.setCreateTime(log.getCreateTime());
        return vo;
    }

    private Integer currentTenantId() {
        Integer tenantId = TenantContext.getTenantId();
        if (tenantId != null) {
            return tenantId;
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser.getTenantId();
        }
        return null;
    }

    private Integer currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser.getUserId();
        }
        return null;
    }

    private HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return attributes.getRequest();
        }
        return null;
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    @TableName("sys_operation_log")
    @Data
    public static class SysOperationLog {
        @TableId(type = IdType.AUTO)
        private Integer id;
        private Integer tenantId;
        private Integer userId;
        private String moduleCode;
        private String actionCode;
        private String targetType;
        private Integer targetId;
        private String requestPayload;
        private String resultStatus;
        private String ipAddress;
        private String userAgent;
        private LocalDateTime createTime;
    }

    @Mapper
    public interface SysOperationLogMapper extends BaseMapper<SysOperationLog> {
    }
}
