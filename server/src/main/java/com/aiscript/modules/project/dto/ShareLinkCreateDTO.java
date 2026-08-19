package com.aiscript.modules.project.dto;

import lombok.Data;

@Data
public class ShareLinkCreateDTO {
    private Integer expiresInHours = 168;
    private Integer maxUses;
    private String versionScope = "all";
}
