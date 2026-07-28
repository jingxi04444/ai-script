package com.aiscript.modules.brief.vo;

import com.aiscript.modules.brief.entity.AiBrief;
import com.aiscript.modules.brief.entity.AiBriefVersion;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class BriefDetailQueryResult {
    private AiBrief brief;
    private String accessPermission;
    private List<AiBriefVersion> versions = new ArrayList<>();
}
