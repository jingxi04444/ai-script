package com.aiscript.modules.brief.vo;

import lombok.Data;

import java.util.List;

@Data
public class BriefAssetGroupVO {
    private String projectId;
    private String projectName;
    private List<BriefAssetItemVO> briefs;
}
