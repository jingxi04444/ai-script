package com.aiscript.modules.brief.vo;

import java.util.List;
import lombok.Data;

@Data
public class BriefSharePackVO {
    private String shareToken;
    private String shareUrl;
    private String permission;
    private List<BriefVO> briefs;
}
