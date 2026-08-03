package com.aiscript.modules.membership.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminTemplateCustomRequestUpdateDTO {
    @NotBlank(message = "请选择工单状态")
    @Pattern(regexp = "pending|processing|completed|rejected", message = "工单状态不正确")
    private String status;

    @Size(max = 1000, message = "处理备注不能超过1000个字符")
    private String adminRemark;
}
