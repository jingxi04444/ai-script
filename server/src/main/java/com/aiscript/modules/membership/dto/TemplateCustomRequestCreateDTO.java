package com.aiscript.modules.membership.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TemplateCustomRequestCreateDTO {
    @NotBlank(message = "请填写定制模板标题")
    @Size(max = 120, message = "标题不能超过120个字符")
    private String title;

    @NotBlank(message = "请填写定制需求")
    @Size(max = 4000, message = "定制需求不能超过4000个字符")
    private String requirements;

    @Size(max = 200, message = "联系方式不能超过200个字符")
    private String contact;
}
