package com.aiscript.modules.workflow.controller;

import com.aiscript.common.api.R;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.modules.system.service.ProviderConfigService;
import com.aiscript.modules.workflow.vo.WorkflowModelOptionVO;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workflow/models")
public class WorkflowModelCatalogController {
    private final ProviderConfigService providerConfigService;

    public WorkflowModelCatalogController(ProviderConfigService providerConfigService) {
        this.providerConfigService = providerConfigService;
    }

    @GetMapping
    public R<List<WorkflowModelOptionVO>> list() {
        return R.ok(providerConfigService.listEnabled().stream().map(provider -> {
            Object configuredModel = JsonUtils.toMap(provider.getConfigJson()).get("model");
            String model = configuredModel == null
                ? provider.getProviderName()
                : String.valueOf(configuredModel);
            return new WorkflowModelOptionVO(
                String.valueOf(provider.getId()),
                provider.getProviderType(),
                provider.getProviderName(),
                provider.getPlatform(),
                model
            );
        }).toList());
    }
}
