package com.aiscript.modules.market.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class MarketViralRefreshDTO {
    @NotBlank(message = "品类不能为空")
    @Size(max = 40, message = "品类名称不能超过 40 个字符")
    private String category;
    private List<String> platforms;
    @Size(max = 80, message = "请求编号不能超过 80 个字符")
    private String requestNo;
}
