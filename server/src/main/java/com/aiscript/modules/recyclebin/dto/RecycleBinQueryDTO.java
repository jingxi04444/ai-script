package com.aiscript.modules.recyclebin.dto;

import com.aiscript.common.pagination.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class RecycleBinQueryDTO extends PageQuery {
    private String resourceType;
}
