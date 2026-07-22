package com.aiscript.modules.generation.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_dubbing_asset")
@Data
public class AiDubbingAsset {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer projectId;
    private Integer taskId;
    private Integer assetId;
    private String mode;
    private String voice;
    private String speed;
    private String tone;
    private String volume;
    private String lipPrecision;
    private String status;
    private LocalDateTime createTime;
}
