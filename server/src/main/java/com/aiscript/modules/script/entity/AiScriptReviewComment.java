package com.aiscript.modules.script.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_script_review_comment")
public class AiScriptReviewComment extends TenantBaseEntity {
    private Integer scriptId;
    private Integer reviewLinkId;
    private Integer versionId;
    private Integer userId;
    private Integer parentId;
    private Integer rowIndex;
    private String columnKey;
    private String content;
    private String commentStatus;
}
