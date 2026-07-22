package com.aiscript.modules.project.dto;

import lombok.Data;

import com.aiscript.common.pagination.PageQuery;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ProjectQueryDTO extends PageQuery {
    private String status;
}
