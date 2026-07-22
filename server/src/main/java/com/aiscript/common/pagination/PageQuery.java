package com.aiscript.common.pagination;

import lombok.Data;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@Data
public class PageQuery {
    @Min(1)
    private Long page = 1L;

    @Min(1)
    @Max(200)
    private Long pageSize = 10L;

    private String keyword;
}
