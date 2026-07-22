package com.aiscript.modules.user.dto;

import lombok.Data;

import com.aiscript.common.pagination.PageQuery;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class UserQueryDTO extends PageQuery {
    private String status;
}
