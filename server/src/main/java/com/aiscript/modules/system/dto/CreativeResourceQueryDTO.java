package com.aiscript.modules.system.dto;

import com.aiscript.common.pagination.PageQuery;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class CreativeResourceQueryDTO extends PageQuery {
    @Size(max = 20)
    private String type;
    @Size(max = 80)
    private String category;
    @Size(max = 20)
    private String status;
}
