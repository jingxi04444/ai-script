package com.aiscript.modules.system.entity;

import com.aiscript.common.model.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@TableName("sys_home_banner")
@Data
@EqualsAndHashCode(callSuper = true)
public class SysHomeBanner extends BaseEntity {
    private String title;
    private String subtitle;
    private String imageUrl;
    private String imageKey;
    private String linkUrl;
    private Integer sortOrder;
    private Integer status;
}
