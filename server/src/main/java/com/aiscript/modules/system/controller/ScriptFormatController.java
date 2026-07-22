package com.aiscript.modules.system.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.system.service.SystemManagementService;
import com.aiscript.modules.system.vo.ScriptFormatVO;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/script-formats")
public class ScriptFormatController {
    private final SystemManagementService systemManagementService;

    public ScriptFormatController(SystemManagementService systemManagementService) {
        this.systemManagementService = systemManagementService;
    }

    @GetMapping
    public R<List<ScriptFormatVO>> listEnabled() {
        return R.ok(systemManagementService.enabledScriptFormats());
    }
}
