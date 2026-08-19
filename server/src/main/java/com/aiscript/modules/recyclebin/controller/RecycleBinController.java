package com.aiscript.modules.recyclebin.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.modules.recyclebin.dto.RecycleBinBatchDTO;
import com.aiscript.modules.recyclebin.dto.RecycleBinQueryDTO;
import com.aiscript.modules.recyclebin.service.RecycleBinService;
import com.aiscript.modules.recyclebin.vo.RecycleBinItemVO;
import com.aiscript.modules.recyclebin.vo.RecycleBinSummaryVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/recycle-bin")
public class RecycleBinController {
    private final RecycleBinService recycleBinService;

    public RecycleBinController(RecycleBinService recycleBinService) {
        this.recycleBinService = recycleBinService;
    }

    @GetMapping
    public R<PageResult<RecycleBinItemVO>> page(@Valid RecycleBinQueryDTO query) {
        return R.ok(recycleBinService.page(query));
    }

    @GetMapping("/summary")
    public R<RecycleBinSummaryVO> summary() {
        return R.ok(recycleBinService.summary());
    }

    @PostMapping("/{id}/restore")
    public R<Void> restore(@PathVariable Integer id) {
        recycleBinService.restore(id);
        return R.ok();
    }

    @DeleteMapping("/{id}")
    public R<Void> purge(@PathVariable Integer id) {
        recycleBinService.purge(id);
        return R.ok();
    }

    @PostMapping("/batch/restore")
    public R<Void> restoreBatch(@Valid @RequestBody RecycleBinBatchDTO payload) {
        recycleBinService.restoreBatch(payload.getIds());
        return R.ok();
    }

    @PostMapping("/batch/purge")
    public R<Void> purgeBatch(@Valid @RequestBody RecycleBinBatchDTO payload) {
        recycleBinService.purgeBatch(payload.getIds());
        return R.ok();
    }
}
