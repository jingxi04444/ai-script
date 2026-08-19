package com.aiscript.modules.recyclebin.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Data;

@Data
public class RecycleBinBatchDTO {
    @NotEmpty(message = "请选择回收站项目")
    private List<Integer> ids;
}
