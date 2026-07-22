package com.aiscript.modules.compliance.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_compliance_word")
@Data
public class AiComplianceWord {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private String wordText;
    private String category;
    private String riskLevel;
    private String suggestion;
    private Integer status;
    private Integer createBy;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer deleted;
}
