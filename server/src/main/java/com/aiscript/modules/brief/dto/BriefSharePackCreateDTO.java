package com.aiscript.modules.brief.dto;

import java.util.List;
import lombok.Data;

@Data
public class BriefSharePackCreateDTO {
    private List<Integer> briefIds;
    private String permission;
}
