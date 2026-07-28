package com.aiscript.modules.brief.vo;

import lombok.Data;

import java.util.List;

@Data
public class BriefAssetLibraryVO {
    private Integer total;
    private List<BriefAssetGroupVO> projects;
}
