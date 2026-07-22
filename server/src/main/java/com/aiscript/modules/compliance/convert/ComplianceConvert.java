package com.aiscript.modules.compliance.convert;

import com.aiscript.modules.compliance.entity.AiComplianceWord;
import com.aiscript.modules.compliance.vo.ComplianceWordVO;

public final class ComplianceConvert {
    private ComplianceConvert() {
    }

    public static ComplianceWordVO toWordVO(AiComplianceWord entity) {
        ComplianceWordVO vo = new ComplianceWordVO();
        vo.setId(String.valueOf(entity.getId()));
        vo.setWordText(entity.getWordText());
        vo.setCategory(entity.getCategory());
        vo.setRiskLevel(entity.getRiskLevel());
        vo.setSuggestion(entity.getSuggestion());
        return vo;
    }
}
