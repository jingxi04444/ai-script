package com.aiscript.modules.brief.dto;

import java.util.List;
import lombok.Data;

@Data
public class BriefSharePackLinkDTO {
    private Integer projectId;
    private List<Integer> briefIds;
}