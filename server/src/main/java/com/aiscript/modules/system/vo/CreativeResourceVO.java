package com.aiscript.modules.system.vo;

import com.aiscript.modules.system.dto.CreativeResourceMediaDTO;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class CreativeResourceVO {
    public String id;
    public String code;
    public String type;
    public String name;
    public String category;
    public String description;
    public String coverUrl;
    public String previewVideoUrl;
    public List<CreativeResourceMediaDTO> gallery;
    public List<String> tags;
    public String prompt;
    public String negativePrompt;
    public Map<String, Object> config;
    public String status;
    public Integer sortOrder;
    public String licenseNote;
    public String author;
    public LocalDateTime createTime;
    public LocalDateTime updateTime;
}
