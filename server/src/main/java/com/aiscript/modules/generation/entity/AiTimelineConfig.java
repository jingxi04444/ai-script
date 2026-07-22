package com.aiscript.modules.generation.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_timeline_config")
@Data
public class AiTimelineConfig {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer projectId;
    private String selectedClip;
    private String transitionEffect;
    private Integer backgroundMusicAssetId;
    private String resolution;
    private String configJson;
    private LocalDateTime updateTime;
}
