package com.aiscript.modules.source.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_source_report")
@Data
public class AiSourceReport {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer analysisId;
    private String reportType;
    private String reportContent;
    private LocalDateTime createTime;
}
