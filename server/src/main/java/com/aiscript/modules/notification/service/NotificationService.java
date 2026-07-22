package com.aiscript.modules.notification.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.notification.dto.NotificationSendDTO;
import com.aiscript.modules.notification.vo.NotificationVO;

public interface NotificationService {
    PageResult<NotificationVO> adminPage(PageQuery query, String status);

    PageResult<NotificationVO> myPage(PageQuery query, String status);

    void send(NotificationSendDTO dto);

    void markRead(Integer id);
}
