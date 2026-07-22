package com.aiscript.modules.compliance.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.compliance.dto.ComplianceCheckDTO;
import com.aiscript.modules.compliance.dto.ComplianceWordSaveDTO;
import com.aiscript.modules.compliance.service.ComplianceService;
import com.aiscript.modules.compliance.vo.ComplianceCheckVO;
import com.aiscript.modules.compliance.vo.ComplianceWordVO;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ComplianceController {
    private final ComplianceService complianceService;

    public ComplianceController(ComplianceService complianceService) {
        this.complianceService = complianceService;
    }

    @PostMapping("/compliance/check")
    public R<ComplianceCheckVO> check(@RequestBody ComplianceCheckDTO dto) {
        return R.ok(complianceService.check(dto));
    }

    @PostMapping("/compliance/originality")
    public R<ComplianceCheckVO> originality(@RequestBody ComplianceCheckDTO dto) {
        return R.ok(complianceService.originality(dto));
    }

    @GetMapping("/admin/compliance/words")
    public R<PageResult<ComplianceWordVO>> words(PageQuery query) {
        return R.ok(complianceService.wordPage(query));
    }

    @PostMapping("/admin/compliance/words")
    public R<ComplianceWordVO> createWord(@RequestBody ComplianceWordSaveDTO dto) {
        return R.ok(complianceService.saveWord(null, dto));
    }

    @PutMapping("/admin/compliance/words/{id}")
    public R<ComplianceWordVO> updateWord(@PathVariable Integer id, @RequestBody ComplianceWordSaveDTO dto) {
        return R.ok(complianceService.saveWord(id, dto));
    }

    @DeleteMapping("/admin/compliance/words/{id}")
    public R<Void> deleteWord(@PathVariable Integer id) {
        complianceService.deleteWord(id);
        return R.ok();
    }
}
