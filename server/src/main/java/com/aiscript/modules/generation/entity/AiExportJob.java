package com.aiscript.modules.generation.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_export_job")
@Data
public class AiExportJob {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer projectId;
    private Integer taskId;
    private String exportType;
    private String resolution;
    private String fileName;
    private Integer assetId;
    private String storageKey;
    private String status;
    private Integer sourceCount;
    private Integer progress;
    private Long fileSize;
    private String errorMessage;
    private LocalDateTime finishTime;
    private LocalDateTime expireAt;
    private Integer createBy;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
