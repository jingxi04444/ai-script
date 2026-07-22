package com.aiscript.modules.system.entity;

import com.aiscript.common.model.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@TableName("sys_site_config")
@Data
@EqualsAndHashCode(callSuper = true)
public class SysSiteConfig extends BaseEntity {
    private String configCode;
    private String frontHomeLogoUrl;
    private String frontHomeLogoKey;
    private String frontViralSimpleAnalysisExample;
    private String frontViralDeepAnalysisExample;
    private String frontOriginalScenarioPrompts;
    private Integer status;
}
