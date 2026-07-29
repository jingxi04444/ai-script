package com.aiscript.modules.system.service;

import com.aiscript.modules.system.dto.ConfigItemSaveDTO;
import com.aiscript.modules.system.vo.ConfigItemVO;
import java.util.List;
import java.util.Map;

public interface ConfigDictionaryService {
    String getValue(String configKey);

    Map<String, String> getValues(List<String> configKeys);

    void putValue(String configKey, String configValue, String valueType, String configName, String groupCode);

    List<ConfigItemVO> tree(String groupCode);

    ConfigItemVO update(String configKey, ConfigItemSaveDTO dto);
}
