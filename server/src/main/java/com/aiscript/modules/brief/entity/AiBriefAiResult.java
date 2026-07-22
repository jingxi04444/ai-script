package com.aiscript.modules.brief.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_brief_ai_result")
@Data
public class AiBriefAiResult {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer briefId;
    private String resultType;
    private Integer providerId;
    private Integer promptTemplateId;
    private String resultJson;
    private String rawResponse;
    private Integer createBy;
    private LocalDateTime createTime;
}
