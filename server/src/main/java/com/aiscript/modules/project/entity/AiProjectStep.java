package com.aiscript.modules.project.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_project_step")
@Data
public class AiProjectStep {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer projectId;
    private String stepKey;
    private String stepName;
    private String status;
    private String draftData;
    private LocalDateTime completeTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
