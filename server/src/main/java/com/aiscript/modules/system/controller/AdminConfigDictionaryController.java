package com.aiscript.modules.system.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.system.dto.ConfigItemSaveDTO;
import com.aiscript.modules.system.service.ConfigDictionaryService;
import com.aiscript.modules.system.vo.ConfigItemVO;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/system/config-dictionary")
public class AdminConfigDictionaryController {
    private final ConfigDictionaryService configDictionaryService;

    public AdminConfigDictionaryController(ConfigDictionaryService configDictionaryService) {
        this.configDictionaryService = configDictionaryService;
    }

    @GetMapping
    public R<List<ConfigItemVO>> tree(@RequestParam(required = false) String groupCode) {
        return R.ok(configDictionaryService.tree(groupCode));
    }

    @PutMapping("/{configKey}")
    public R<ConfigItemVO> update(@PathVariable String configKey, @RequestBody ConfigItemSaveDTO dto) {
        return R.ok(configDictionaryService.update(configKey, dto));
    }
}
