package com.aiscript.modules.notification.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.notification.dto.NotificationSendDTO;
import com.aiscript.modules.notification.service.NotificationService;
import com.aiscript.modules.notification.vo.NotificationVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class NotificationController {
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/notifications")
    public R<PageResult<NotificationVO>> myNotifications(PageQuery query, @RequestParam(required = false) String status) {
        return R.ok(notificationService.myPage(query, status));
    }

    @PostMapping("/notifications/{id}/read")
    public R<Void> markRead(@PathVariable Integer id) {
        notificationService.markRead(id);
        return R.ok();
    }

    @GetMapping("/admin/notifications")
    public R<PageResult<NotificationVO>> adminNotifications(PageQuery query, @RequestParam(required = false) String status) {
        return R.ok(notificationService.adminPage(query, status));
    }

    @PostMapping("/admin/notifications")
    public R<Void> send(@RequestBody NotificationSendDTO dto) {
        notificationService.send(dto);
        return R.ok();
    }
}
