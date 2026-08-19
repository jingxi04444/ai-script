package com.aiscript.modules.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProjectCreateDTO {
    @NotBlank(message = "项目名称不能为空")
    @Size(max = 180, message = "项目名称不能超过180个字符")
    private String name;
    @Size(max = 500, message = "项目头像地址不能超过500个字符")
    private String avatarUrl;
    @Size(max = 1000, message = "项目公告不能超过1000个字符")
    private String announcement;
    private String category;
    private String productName;
    private String platform;
    private String videoRatio;
    private String videoType;
}
