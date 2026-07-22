package com.aiscript.modules.source.convert;

import com.aiscript.modules.source.entity.AiSourceAnalysis;
import com.aiscript.modules.source.vo.SourceAnalysisVO;

public final class SourceConvert {
    private SourceConvert() {
    }

    public static SourceAnalysisVO toVO(AiSourceAnalysis entity) {
        SourceAnalysisVO vo = new SourceAnalysisVO();
        vo.setId(String.valueOf(entity.getId()));
        vo.setProjectId(String.valueOf(entity.getProjectId()));
        vo.setMode(entity.getMode());
        vo.setSourceUrl(entity.getSourceUrl());
        vo.setPlatform(entity.getPlatform());
        vo.setTitle(entity.getTitle());
        vo.setAuthorName(entity.getAuthorName());
        vo.setCoverUrl(entity.getCoverUrl());
        vo.setVideoUrl(entity.getVideoUrl());
        vo.setEditableCopy(entity.getEditableCopy());
        vo.setStructureSummary(entity.getStructureSummary());
        vo.setStatus(entity.getStatus());
        return vo;
    }
}
