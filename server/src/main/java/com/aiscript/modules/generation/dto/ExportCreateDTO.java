package com.aiscript.modules.generation.dto;

import java.util.List;

public class ExportCreateDTO {
    public String projectId;
    public String exportType;
    public String resolution;
    public String fileName;
    public Boolean removeWatermark;
    public List<String> scriptIds;
}
