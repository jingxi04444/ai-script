package com.aiscript.modules.notification.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.generation.entity.AiScriptGenerationQueueItem;
import com.aiscript.modules.generation.mapper.AiScriptGenerationQueueItemMapper;
import com.aiscript.modules.notification.dto.NotificationSendDTO;
import com.aiscript.modules.notification.entity.SysNotification;
import com.aiscript.modules.notification.mapper.SysNotificationMapper;
import com.aiscript.modules.notification.service.NotificationService;
import com.aiscript.modules.notification.vo.NotificationVO;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.util.StringUtils;

@Service
public class NotificationServiceImpl implements NotificationService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private final SysNotificationMapper notificationMapper;
    private final AiScriptGenerationQueueItemMapper scriptQueueMapper;

    public NotificationServiceImpl(
        SysNotificationMapper notificationMapper,
        AiScriptGenerationQueueItemMapper scriptQueueMapper
    ) {
        this.notificationMapper = notificationMapper;
        this.scriptQueueMapper = scriptQueueMapper;
    }

    @Override
    public PageResult<NotificationVO> adminPage(PageQuery query, String status) {
        QueryWrapper<SysNotification> wrapper = new QueryWrapper<>();
        wrapper.eq(StringUtils.hasText(status), "status", status)
            .like(StringUtils.hasText(query.getKeyword()), "title", query.getKeyword())
            .orderByDesc("create_time");
        IPage<SysNotification> page = notificationMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    public PageResult<NotificationVO> myPage(PageQuery query, String status) {
        QueryWrapper<SysNotification> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", currentUserId())
            .eq(StringUtils.hasText(status), "status", status)
            .like(StringUtils.hasText(query.getKeyword()), "title", query.getKeyword())
            .orderByDesc("create_time");
        IPage<SysNotification> page = notificationMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void send(NotificationSendDTO dto) {
        List<String> userIds = dto.userIds == null || dto.userIds.isEmpty() ? Collections.singletonList(null) : dto.userIds;
        for (String userId : userIds) {
            SysNotification notification = new SysNotification();
            notification.tenantId = currentTenantId();
            notification.userId = StringUtils.hasText(userId) ? Integer.valueOf(userId) : null;
            notification.channel = StringUtils.hasText(dto.channel) ? dto.channel : "system";
            notification.title = dto.title;
            notification.content = dto.content;
            notification.status = 0;
            notificationMapper.insert(notification);
        }
    }

    @Override
    public boolean sendOnce(
        Integer tenantId,
        Integer userId,
        String channel,
        String bizType,
        String bizId,
        String title,
        String content
    ) {
        if (userId == null || !StringUtils.hasText(bizType) || !StringUtils.hasText(bizId)) {
            return false;
        }
        String resolvedChannel = StringUtils.hasText(channel) ? channel : "system";
        Long existing = notificationMapper.selectCount(new QueryWrapper<SysNotification>()
            .eq("user_id", userId)
            .eq("channel", resolvedChannel)
            .eq("biz_type", bizType)
            .eq("biz_id", bizId));
        if (existing != null && existing > 0) {
            return false;
        }
        SysNotification notification = new SysNotification();
        notification.tenantId = tenantId == null ? DEFAULT_TENANT_ID : tenantId;
        notification.userId = userId;
        notification.channel = resolvedChannel;
        notification.bizType = bizType;
        notification.bizId = bizId;
        notification.title = title;
        notification.content = content;
        notification.status = 0;
        try {
            notificationMapper.insert(notification);
            return true;
        } catch (DuplicateKeyException ignored) {
            return false;
        }
    }

    @Override
    public void markRead(Integer id) {
        notificationMapper.update(null, new UpdateWrapper<SysNotification>()
            .eq("id", id)
            .eq("user_id", currentUserId())
            .set("status", 1)
            .set("read_time", LocalDateTime.now()));
    }

    private NotificationVO toVO(SysNotification entity) {
        NotificationVO vo = new NotificationVO();
        vo.id = String.valueOf(entity.id);
        vo.userId = entity.userId == null ? null : String.valueOf(entity.userId);
        vo.channel = entity.channel;
        vo.bizType = entity.bizType;
        vo.bizId = entity.bizId;
        appendNavigationTarget(entity, vo);
        vo.title = entity.title;
        vo.content = entity.content;
        vo.status = entity.status;
        vo.readTime = entity.readTime;
        vo.createTime = entity.createTime;
        return vo;
    }

    private void appendNavigationTarget(SysNotification entity, NotificationVO vo) {
        if (!"script_queue_batch".equals(entity.bizType)
            || !StringUtils.hasText(entity.bizId)
            || entity.tenantId == null
            || entity.userId == null) {
            return;
        }
        AiScriptGenerationQueueItem item = scriptQueueMapper.selectBatchNavigationItem(
            entity.tenantId,
            entity.userId,
            entity.bizId
        );
        if (item == null) return;
        vo.targetProjectId = item.getProjectId() == null ? null : String.valueOf(item.getProjectId());
        vo.targetScriptId = item.getScriptId() == null ? null : String.valueOf(item.getScriptId());
    }

    private Integer currentTenantId() {
        Integer tenantId = TenantContext.getTenantId();
        return tenantId == null ? DEFAULT_TENANT_ID : tenantId;
    }

    private Integer currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser.getUserId();
        }
        return null;
    }
}
