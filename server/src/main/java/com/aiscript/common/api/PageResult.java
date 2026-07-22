package com.aiscript.common.api;

import lombok.Data;

import java.util.Collections;
import java.util.List;

@Data
public class PageResult<T> {
    private List<T> list;
    private Long total;
    private Long page;
    private Long pageSize;
    private Long pages;

    public static <T> PageResult<T> empty(Long page, Long pageSize) {
        return new PageResult<>(Collections.emptyList(), 0L, page, pageSize, 0L);
    }

    public PageResult() {
    }

    public PageResult(List<T> list, Long total, Long page, Long pageSize, Long pages) {
        this.list = list;
        this.total = total;
        this.page = page;
        this.pageSize = pageSize;
        this.pages = pages;
    }
}
