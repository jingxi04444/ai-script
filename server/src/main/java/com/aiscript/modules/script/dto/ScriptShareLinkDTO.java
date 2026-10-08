package com.aiscript.modules.script.dto;

import lombok.Data;

@Data
public class ScriptShareLinkDTO {
    /** true：互联网获得链接的人可评论；false：未开启。缺省视为开启。 */
    private Boolean enabled;
}
