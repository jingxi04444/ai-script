package com.aiscript.modules.script.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewDecisionDTO {
    private String versionId;
    @NotBlank(message = "请选择评审结论")
    @Pattern(regexp = "approved|changes_requested", message = "评审结论不正确")
    private String decision;
    private String opinion;
}
