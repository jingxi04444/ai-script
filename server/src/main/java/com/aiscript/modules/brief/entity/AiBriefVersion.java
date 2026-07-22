package com.aiscript.modules.brief.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_brief_version")
@Data
public class AiBriefVersion {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer briefId;
    private Integer versionNo;
    private String versionLabel;
    private String contentSnapshot;
    private String scoreSnapshot;
    private String changeNote;
    private Integer createBy;
    private LocalDateTime createTime;
}
