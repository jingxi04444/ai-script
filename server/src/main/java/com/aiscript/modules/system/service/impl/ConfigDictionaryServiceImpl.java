package com.aiscript.modules.system.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.system.dto.ConfigItemSaveDTO;
import com.aiscript.modules.system.entity.SysConfigItem;
import com.aiscript.modules.system.mapper.SysConfigItemMapper;
import com.aiscript.modules.system.service.ConfigDictionaryService;
import com.aiscript.modules.system.vo.ConfigItemVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ConfigDictionaryServiceImpl implements ConfigDictionaryService {
    private final SysConfigItemMapper configItemMapper;

    public ConfigDictionaryServiceImpl(SysConfigItemMapper configItemMapper) {
        this.configItemMapper = configItemMapper;
    }

    @Override
    public String getValue(String configKey) {
        if (!StringUtils.hasText(configKey)) {
            return null;
        }
        SysConfigItem item = findByKey(configKey);
        return item == null || item.getStatus() == null || item.getStatus() != 1
            ? null
            : item.getConfigValue();
    }

    @Override
    public Map<String, String> getValues(List<String> configKeys) {
        if (configKeys == null || configKeys.isEmpty()) {
            return Map.of();
        }
        return configItemMapper.selectList(new LambdaQueryWrapper<SysConfigItem>()
                .in(SysConfigItem::getConfigKey, configKeys)
                .eq(SysConfigItem::getNodeType, "item")
                .eq(SysConfigItem::getStatus, 1))
            .stream()
            .collect(Collectors.toMap(
                SysConfigItem::getConfigKey,
                item -> item.getConfigValue() == null ? "" : item.getConfigValue(),
                (left, right) -> right,
                LinkedHashMap::new
            ));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void putValue(String configKey, String configValue, String valueType, String configName, String groupCode) {
        if (!StringUtils.hasText(configKey)) {
            throw new BusinessException("配置键不能为空");
        }
        SysConfigItem item = findByKey(configKey);
        if (item == null) {
            item = new SysConfigItem();
            item.setParentId(resolveParentId(configKey));
            item.setNodeType("item");
            item.setGroupCode(groupCode);
            item.setConfigKey(configKey);
            item.setConfigName(StringUtils.hasText(configName) ? configName : configKey);
            item.setValueType(StringUtils.hasText(valueType) ? valueType : "string");
            item.setConfigValue(configValue);
            item.setSortOrder(0);
            item.setStatus(1);
            configItemMapper.insert(item);
            return;
        }
        item.setConfigValue(configValue);
        if (StringUtils.hasText(valueType)) {
            item.setValueType(valueType);
        }
        if (StringUtils.hasText(configName)) {
            item.setConfigName(configName);
        }
        if (StringUtils.hasText(groupCode)) {
            item.setGroupCode(groupCode);
        }
        configItemMapper.updateById(item);
    }

    @Override
    public List<ConfigItemVO> tree(String groupCode) {
        LambdaQueryWrapper<SysConfigItem> query = new LambdaQueryWrapper<SysConfigItem>()
            .orderByAsc(SysConfigItem::getSortOrder)
            .orderByAsc(SysConfigItem::getId);
        if (StringUtils.hasText(groupCode)) {
            query.eq(SysConfigItem::getGroupCode, groupCode);
        }
        List<SysConfigItem> items = configItemMapper.selectList(query);
        Map<Integer, ConfigItemVO> nodes = items.stream()
            .collect(Collectors.toMap(SysConfigItem::getId, this::toVO, (left, right) -> left, LinkedHashMap::new));
        List<ConfigItemVO> roots = new ArrayList<>();
        for (SysConfigItem item : items) {
            ConfigItemVO node = nodes.get(item.getId());
            ConfigItemVO parent = item.getParentId() == null ? null : nodes.get(item.getParentId());
            if (parent == null) {
                roots.add(node);
            } else {
                parent.children.add(node);
            }
        }
        return roots;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ConfigItemVO update(String configKey, ConfigItemSaveDTO dto) {
        SysConfigItem item = findByKey(configKey);
        if (item == null || !"item".equals(item.getNodeType())) {
            throw new BusinessException("配置项不存在");
        }
        if (dto != null) {
            if (dto.configKey != null && !dto.configKey.equals(item.getConfigKey())) {
                String nextKey = dto.configKey.trim();
                if (!nextKey.matches("[A-Za-z0-9._-]+")) {
                    throw new BusinessException("配置 Key 只能包含字母、数字、点、横线和下划线");
                }
                SysConfigItem duplicate = findByKey(nextKey);
                if (duplicate != null && !duplicate.getId().equals(item.getId())) {
                    throw new BusinessException("配置 Key 已存在");
                }
                item.setConfigKey(nextKey);
            }
            if (dto.configName != null) {
                if (!StringUtils.hasText(dto.configName)) {
                    throw new BusinessException("配置名称不能为空");
                }
                item.setConfigName(dto.configName.trim());
            }
            if (dto.configValue != null) item.setConfigValue(dto.configValue);
            if (StringUtils.hasText(dto.valueType)) item.setValueType(dto.valueType);
            if (dto.description != null) item.setDescription(dto.description);
            if (dto.status != null) item.setStatus(dto.status);
        }
        configItemMapper.updateById(item);
        return toVO(item);
    }

    private SysConfigItem findByKey(String configKey) {
        return configItemMapper.selectOne(new LambdaQueryWrapper<SysConfigItem>()
            .eq(SysConfigItem::getConfigKey, configKey)
            .last("LIMIT 1"));
    }

    private Integer resolveParentId(String configKey) {
        String parentKey;
        if (configKey.startsWith("site.home.") || configKey.equals("visual.home.config")) {
            parentKey = "visual.home";
        } else if (configKey.equals("visual.script-generator.config")) {
            parentKey = "visual.script-generator";
        } else if (configKey.startsWith("content.viral.")) {
            parentKey = "content.viral";
        } else if (configKey.startsWith("content.original.")) {
            parentKey = "content.original";
        } else {
            return null;
        }
        SysConfigItem parent = findByKey(parentKey);
        return parent == null ? null : parent.getId();
    }

    private ConfigItemVO toVO(SysConfigItem item) {
        ConfigItemVO vo = new ConfigItemVO();
        vo.id = String.valueOf(item.getId());
        vo.parentId = item.getParentId() == null ? null : String.valueOf(item.getParentId());
        vo.nodeType = item.getNodeType();
        vo.groupCode = item.getGroupCode();
        vo.configKey = item.getConfigKey();
        vo.configName = item.getConfigName();
        vo.configValue = item.getConfigValue();
        vo.valueType = item.getValueType();
        vo.description = item.getDescription();
        vo.sortOrder = item.getSortOrder();
        vo.status = item.getStatus();
        return vo;
    }
}
