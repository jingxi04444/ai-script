package com.aiscript.modules.generation.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("ai_video_segment")
@Data
public class AiVideoSegment {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer projectId;
    private Integer shotId;
    private Integer taskId;
    private Integer assetId;
    private String status;
    private String tagsJson;
    private BigDecimal durationSeconds;
    private LocalDateTime createTime;
}
