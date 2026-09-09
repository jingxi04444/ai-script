package com.aiscript.modules.system.dto;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class CreativeResourceSaveDTO {
    public String code;
    public String type;
    public String name;
    public String category;
    public String description;
    public String coverUrl;
    public String previewVideoUrl;
    public List<CreativeResourceMediaDTO> gallery = new ArrayList<>();
    public List<String> tags = new ArrayList<>();
    public String prompt;
    public String negativePrompt;
    public Map<String, Object> config = new LinkedHashMap<>();
    public String status = "draft";
    public Integer sortOrder = 0;
    public String licenseNote;
    public String author;
}
