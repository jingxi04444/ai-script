package com.aiscript.modules.auditflow.convert;

import com.aiscript.modules.auditflow.entity.AiAuditTask;
import com.aiscript.modules.auditflow.vo.AuditTaskVO;

public final class AuditConvert {
    private AuditConvert() {
    }

    public static AuditTaskVO toVO(AiAuditTask entity) {
        AuditTaskVO vo = new AuditTaskVO();
        vo.setId(String.valueOf(entity.getId()));
        vo.setProjectId(entity.getProjectId() == null ? null : String.valueOf(entity.getProjectId()));
        vo.setScriptId(String.valueOf(entity.getScriptId()));
        vo.setCurrentVersionId(entity.getCurrentVersionId() == null ? null : String.valueOf(entity.getCurrentVersionId()));
        vo.setStatus(entity.getStatus());
        vo.setStage(entity.getStage());
        vo.setAssigneeId(entity.getAssigneeId() == null ? null : String.valueOf(entity.getAssigneeId()));
        vo.setRiskSummary(entity.getRiskSummary());
        return vo;
    }
}
