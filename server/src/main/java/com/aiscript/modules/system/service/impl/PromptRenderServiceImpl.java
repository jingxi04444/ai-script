package com.aiscript.modules.system.service.impl;

import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.system.entity.SysPromptTemplate;
import com.aiscript.modules.system.mapper.SysPromptTemplateMapper;
import com.aiscript.modules.system.service.PromptRenderService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class PromptRenderServiceImpl implements PromptRenderService {
    private final SysPromptTemplateMapper promptTemplateMapper;

    public PromptRenderServiceImpl(SysPromptTemplateMapper promptTemplateMapper) {
        this.promptTemplateMapper = promptTemplateMapper;
    }

    @Override
    public RenderedPrompt render(String sceneCode, String defaultSystemPrompt, String defaultUserPrompt, Map<String, String> variables) {
        Integer tenantId = TenantContext.getTenantId();
        QueryWrapper<SysPromptTemplate> query = new QueryWrapper<SysPromptTemplate>()
            .eq("scene_code", sceneCode)
            .eq("status", 1);
        if (tenantId == null) {
            query.isNull("tenant_id");
        } else {
            query.and(scope -> scope.eq("tenant_id", tenantId).or().isNull("tenant_id"));
        }
        SysPromptTemplate template = promptTemplateMapper.selectList(query
                .orderByDesc("tenant_id")
                .orderByDesc("update_time")
                .orderByDesc("id")
                .last("limit 1"))
            .stream()
            .findFirst()
            .orElse(null);
        String systemPrompt = template == null || !StringUtils.hasText(template.systemPrompt) ? defaultSystemPrompt : template.systemPrompt;
        String userPrompt = template == null || !StringUtils.hasText(template.userPrompt) ? defaultUserPrompt : template.userPrompt;
        return new RenderedPrompt(renderText(systemPrompt, variables), renderText(userPrompt, variables));
    }

    private String renderText(String text, Map<String, String> variables) {
        if (text == null || variables == null || variables.isEmpty()) {
            return text;
        }
        String rendered = text;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            String value = entry.getValue() == null ? "" : entry.getValue();
            rendered = rendered.replace("{{" + entry.getKey() + "}}", value);
            rendered = rendered.replace("${" + entry.getKey() + "}", value);
        }
        return rendered;
    }
}
