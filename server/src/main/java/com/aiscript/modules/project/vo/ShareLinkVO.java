package com.aiscript.modules.project.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ShareLinkVO {
    private String id;
    private String token;
    private String path;
    private String expiresAt;
}
