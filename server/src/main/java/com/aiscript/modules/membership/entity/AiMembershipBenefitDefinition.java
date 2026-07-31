package com.aiscript.modules.membership.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_membership_benefit_definition")
public class AiMembershipBenefitDefinition {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String benefitCode;
    private String benefitName;
    private String category;
    private String valueType;
    private String unit;
    private String resetType;
    private Integer previewOnly;
    private Integer enabled;
    private String description;
    private Integer displayOrder;
    private Long createBy;
    private LocalDateTime createTime;
    private Long updateBy;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer deleted;
}