package com.aiscript.modules.auth.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class MenuVO {
    private String id;
    private String parentId;
    private String name;
    private String code;
    private String moduleCode;
    private String type;
    private String path;
    private String icon;
    private Integer sortOrder;
    private List<MenuVO> children = new ArrayList<>();
}
