package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.dto.AdminMembershipPurchaseModeUpdateDTO;
import com.aiscript.modules.membership.service.MembershipPurchaseModeService;
import com.aiscript.modules.membership.vo.MembershipPurchaseModeVO;
import com.aiscript.modules.system.service.ConfigDictionaryService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MembershipPurchaseModeServiceImpl implements MembershipPurchaseModeService {
    private static final String CONFIG_KEY = "membership.purchase-modes";
    private static final Set<String> SUPPORTED_VALUES = Set.of("once_month", "once_quarter", "once_year");

    private final ConfigDictionaryService configDictionaryService;
    private final ObjectMapper objectMapper;

    public MembershipPurchaseModeServiceImpl(ConfigDictionaryService configDictionaryService, ObjectMapper objectMapper) {
        this.configDictionaryService = configDictionaryService;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<MembershipPurchaseModeVO> list() {
        List<MembershipPurchaseModeVO> defaults = defaults();
        String json = configDictionaryService.getValue(CONFIG_KEY);
        if (!StringUtils.hasText(json)) {
            return defaults;
        }
        try {
            List<MembershipPurchaseModeVO> stored = objectMapper.readValue(json, new TypeReference<>() {});
            Map<String, MembershipPurchaseModeVO> storedByValue = new LinkedHashMap<>();
            if (stored != null) {
                stored.stream()
                    .filter(item -> item != null && SUPPORTED_VALUES.contains(item.value))
                    .forEach(item -> storedByValue.put(item.value, item));
            }
            for (MembershipPurchaseModeVO fallback : defaults) {
                MembershipPurchaseModeVO configured = storedByValue.get(fallback.value);
                if (configured == null) continue;
                fallback.label = StringUtils.hasText(configured.label) ? configured.label.trim() : fallback.label;
                fallback.hint = configured.hint == null ? fallback.hint : configured.hint.trim();
                fallback.badge = configured.badge == null ? fallback.badge : configured.badge.trim();
                fallback.enabled = configured.enabled == null ? fallback.enabled : configured.enabled;
                fallback.displayOrder = configured.displayOrder == null ? fallback.displayOrder : configured.displayOrder;
            }
            defaults.sort(Comparator.comparing(item -> item.displayOrder));
            return defaults;
        } catch (Exception ignored) {
            return defaults;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<MembershipPurchaseModeVO> save(AdminMembershipPurchaseModeUpdateDTO dto) {
        if (dto == null || dto.items == null || dto.items.isEmpty()) {
            throw new BusinessException("购买方式配置不能为空");
        }
        Map<String, AdminMembershipPurchaseModeUpdateDTO.Item> updates = new LinkedHashMap<>();
        for (AdminMembershipPurchaseModeUpdateDTO.Item item : dto.items) {
            if (item == null || !SUPPORTED_VALUES.contains(item.value)) {
                throw new BusinessException("存在不支持的购买方式");
            }
            if (!StringUtils.hasText(item.label)) {
                throw new BusinessException("购买方式名称不能为空");
            }
            updates.put(item.value, item);
        }
        if (updates.values().stream().noneMatch(item -> item.enabled == null || item.enabled)) {
            throw new BusinessException("至少需要保留一种购买方式");
        }
        List<MembershipPurchaseModeVO> result = new ArrayList<>();
        for (MembershipPurchaseModeVO current : list()) {
            AdminMembershipPurchaseModeUpdateDTO.Item update = updates.get(current.value);
            if (update != null) {
                current.label = update.label.trim();
                current.hint = update.hint == null ? "" : update.hint.trim();
                current.badge = update.badge == null ? "" : update.badge.trim();
                current.enabled = update.enabled == null || update.enabled;
                current.displayOrder = update.displayOrder == null ? current.displayOrder : update.displayOrder;
            }
            result.add(current);
        }
        result.sort(Comparator.comparing(item -> item.displayOrder));
        try {
            configDictionaryService.putValue(
                CONFIG_KEY,
                objectMapper.writeValueAsString(result),
                "json",
                "会员购买方式 Tab 配置",
                "membership"
            );
        } catch (Exception exception) {
            throw new BusinessException("购买方式配置保存失败");
        }
        return result;
    }

    private List<MembershipPurchaseModeVO> defaults() {
        return new ArrayList<>(List.of(
            mode("once_month", "单月购买", "购买一个月", "", true, 10),
            mode("once_quarter", "季卡", "购买一个季度", "", true, 20),
            mode("once_year", "年卡", "购买一年", "限时优惠", true, 30)
        ));
    }

    private MembershipPurchaseModeVO mode(
        String value,
        String label,
        String hint,
        String badge,
        boolean enabled,
        int displayOrder
    ) {
        MembershipPurchaseModeVO vo = new MembershipPurchaseModeVO();
        vo.value = value;
        vo.label = label;
        vo.hint = hint;
        vo.badge = badge;
        vo.enabled = enabled;
        vo.displayOrder = displayOrder;
        return vo;
    }
}
