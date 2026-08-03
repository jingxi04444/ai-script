package com.aiscript.modules.membership.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.membership.dto.AdminTemplateCustomRequestUpdateDTO;
import com.aiscript.modules.membership.dto.TemplateCustomRequestCreateDTO;
import com.aiscript.modules.membership.vo.TemplateCustomRequestVO;

public interface TemplateCustomRequestService {
    TemplateCustomRequestVO create(Integer tenantId, Integer userId, TemplateCustomRequestCreateDTO dto);
    PageResult<TemplateCustomRequestVO> mine(Integer tenantId, Integer userId, PageQuery query);
    PageResult<TemplateCustomRequestVO> adminPage(PageQuery query, String status);
    TemplateCustomRequestVO update(Long id, AdminTemplateCustomRequestUpdateDTO dto, Integer operatorId);
}
