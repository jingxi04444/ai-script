package com.aiscript.modules.system.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

/** Platform-maintained catalog, intentionally not a tenant's personal asset. */
@Data
@TableName("sys_creative_resource")
public class SysCreativeResource {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String code;
    private String type;
    private String name;
    private String category;
    private String description;
    private String coverUrl;
    private String previewVideoUrl;
    private String galleryJson;
    private String tagsJson;
    private String prompt;
    private String negativePrompt;
    private String configJson;
    private String status;
    private Integer sortOrder;
    private String licenseNote;
    private String author;
    @TableField(fill = FieldFill.INSERT)
    private Integer createBy;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private Integer updateBy;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
    @TableLogic
    private Integer deleted;
}
