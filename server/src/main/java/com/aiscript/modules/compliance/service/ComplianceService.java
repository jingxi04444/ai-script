package com.aiscript.modules.compliance.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.compliance.dto.ComplianceCheckDTO;
import com.aiscript.modules.compliance.dto.ComplianceWordSaveDTO;
import com.aiscript.modules.compliance.vo.ComplianceCheckVO;
import com.aiscript.modules.compliance.vo.ComplianceWordVO;

public interface ComplianceService {
    ComplianceCheckVO check(ComplianceCheckDTO dto);

    ComplianceCheckVO originality(ComplianceCheckDTO dto);

    PageResult<ComplianceWordVO> wordPage(PageQuery query);

    ComplianceWordVO saveWord(Integer id, ComplianceWordSaveDTO dto);

    void deleteWord(Integer id);
}
