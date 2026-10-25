package com.aiscript.modules.market.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.market.dto.MarketFunctionSaveDTO;
import com.aiscript.modules.market.entity.SysMarketFunction;
import com.aiscript.modules.market.mapper.SysMarketFunctionMapper;
import com.aiscript.modules.market.service.MarketFunctionService;
import com.aiscript.modules.market.vo.MarketFunctionVO;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MarketFunctionServiceImpl implements MarketFunctionService {
    private static final Set<String> FEATURE_TYPES = Set.of("builtin", "external");
    private final SysMarketFunctionMapper mapper;
    private final ObjectMapper objectMapper;

    public MarketFunctionServiceImpl(SysMarketFunctionMapper mapper, ObjectMapper objectMapper) {
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<MarketFunctionVO> listPublished() {
        return mapper.selectList(new LambdaQueryWrapper<SysMarketFunction>()
                .eq(SysMarketFunction::getStatus, 1)
                .orderByAsc(SysMarketFunction::getSortOrder)
                .orderByAsc(SysMarketFunction::getId))
            .stream().map(this::toVO).toList();
    }

    @Override
    public List<MarketFunctionVO> listAdmin() {
        requireAdmin();
        return mapper.selectList(new LambdaQueryWrapper<SysMarketFunction>()
                .orderByAsc(SysMarketFunction::getSortOrder)
                .orderByAsc(SysMarketFunction::getId))
            .stream().map(this::toVO).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MarketFunctionVO save(Long id, MarketFunctionSaveDTO dto) {
        LoginUser admin = requireAdmin();
        if (dto == null) {
            throw invalid("功能配置不能为空");
        }
        SysMarketFunction entity = id == null ? new SysMarketFunction() : mapper.selectById(id);
        if (entity == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "市场功能不存在");
        }
        String code = text(dto.getCode(), "功能编码", 80, true);
        if (!code.matches("[a-z0-9]+(?:-[a-z0-9]+)*")) {
            throw invalid("功能编码仅支持小写字母、数字和连字符");
        }
        Long existingId = mapper.findIdByCodeIncludingDeleted(code);
        if (existingId != null && !existingId.equals(id)) {
            throw new BusinessException(ResultCode.CONFLICT, "功能编码已存在，包含已删除记录");
        }
        String featureType = text(dto.getFeatureType(), "功能类型", 24, true).toLowerCase();
        if (!FEATURE_TYPES.contains(featureType)) {
            throw invalid("功能类型只支持 builtin 或 external");
        }
        String route = validateRoute(dto.getRoute(), featureType);
        int status = dto.getStatus() == null ? 0 : dto.getStatus();
        if (status != 0 && status != 1) {
            throw invalid("功能状态只支持草稿或上架");
        }
        int sortOrder = dto.getSortOrder() == null ? 100 : dto.getSortOrder();
        if (sortOrder < -100_000 || sortOrder > 100_000) {
            throw invalid("排序值超出允许范围");
        }
        List<String> tags = new ArrayList<>();
        if (dto.getTags() != null) {
            if (dto.getTags().size() > 10) {
                throw invalid("功能标签最多 10 个");
            }
            for (String value : dto.getTags()) {
                String tag = text(value, "功能标签", 30, false);
                if (StringUtils.hasText(tag) && !tags.contains(tag)) {
                    tags.add(tag);
                }
            }
        }
        entity.setCode(code);
        entity.setTitle(text(dto.getTitle(), "功能名称", 120, true));
        entity.setSummary(text(dto.getSummary(), "功能简介", 500, true));
        entity.setDescription(text(dto.getDescription(), "功能说明", 5000, false));
        entity.setBadge(text(dto.getBadge(), "角标", 40, false));
        entity.setIcon(defaultText(dto.getIcon(), "sparkles", 60));
        entity.setCoverUrl(url(dto.getCoverUrl(), "封面地址", false));
        entity.setFeatureType(featureType);
        entity.setRoute(route);
        entity.setCategory(text(dto.getCategory(), "分类", 60, false));
        entity.setTagsJson(writeJson(tags));
        entity.setSortOrder(sortOrder);
        entity.setStatus(status);
        entity.setUpdateBy(admin.getUserId());
        entity.setUpdateTime(LocalDateTime.now());
        try {
            if (id == null) {
                entity.setCreateBy(admin.getUserId());
                entity.setCreateTime(LocalDateTime.now());
                entity.setDeleted(0);
                mapper.insert(entity);
            } else {
                mapper.updateById(entity);
            }
        } catch (DuplicateKeyException exception) {
            throw new BusinessException(ResultCode.CONFLICT, "功能编码已存在，请更换编码");
        }
        return toVO(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        LoginUser admin = requireAdmin();
        SysMarketFunction entity = id == null ? null : mapper.selectById(id);
        if (entity == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "市场功能不存在");
        }
        entity.setUpdateBy(admin.getUserId());
        entity.setUpdateTime(LocalDateTime.now());
        mapper.deleteById(entity);
    }

    private MarketFunctionVO toVO(SysMarketFunction entity) {
        MarketFunctionVO vo = new MarketFunctionVO();
        vo.setId(String.valueOf(entity.getId()));
        vo.setCode(entity.getCode());
        vo.setTitle(entity.getTitle());
        vo.setSummary(entity.getSummary());
        vo.setDescription(entity.getDescription());
        vo.setBadge(entity.getBadge());
        vo.setIcon(entity.getIcon());
        vo.setCoverUrl(entity.getCoverUrl());
        vo.setFeatureType(entity.getFeatureType());
        vo.setRoute(entity.getRoute());
        vo.setCategory(entity.getCategory());
        vo.setTags(readTags(entity.getTagsJson()));
        vo.setSortOrder(entity.getSortOrder());
        vo.setStatus(entity.getStatus());
        vo.setUpdateTime(entity.getUpdateTime());
        return vo;
    }

    private List<String> readTags(String value) {
        if (!StringUtils.hasText(value)) return List.of();
        try {
            return objectMapper.readValue(value, new TypeReference<>() {});
        } catch (JsonProcessingException exception) {
            return List.of();
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw invalid("功能标签格式不正确");
        }
    }

    private LoginUser requireAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser user)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录管理员账号");
        }
        if (!"admin".equals(user.getUserType())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅管理员可维护市场功能");
        }
        return user;
    }

    private static String validateRoute(String value, String featureType) {
        String route = text(value, "功能入口", 1000, true);
        if ("builtin".equals(featureType)) {
            if (!route.startsWith("/market/") || route.startsWith("//") || route.contains("\\")) {
                throw invalid("内置功能入口必须以 /market/ 开头");
            }
            return route;
        }
        return url(route, "外部功能入口", true);
    }

    private static String url(String value, String label, boolean required) {
        String result = text(value, label, 2000, required);
        if (!StringUtils.hasText(result)) return "";
        try {
            if (result.contains("\\") || result.chars().anyMatch(Character::isISOControl)) {
                throw new IllegalArgumentException();
            }
            URI uri = URI.create(result);
            if (("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                && uri.getHost() != null && uri.getUserInfo() == null) {
                return result;
            }
        } catch (IllegalArgumentException ignored) {
            // Fall through to the consistent validation error.
        }
        throw invalid(label + "必须是有效的 HTTP(S) 地址");
    }

    private static String text(String value, String label, int max, boolean required) {
        String result = value == null ? "" : value.trim();
        if (required && !StringUtils.hasText(result)) {
            throw invalid(label + "不能为空");
        }
        if (result.length() > max || result.indexOf('\0') >= 0) {
            throw invalid(label + "长度超限或包含非法字符");
        }
        return result;
    }

    private static String defaultText(String value, String fallback, int max) {
        String result = text(value, "图标", max, false);
        return StringUtils.hasText(result) ? result : fallback;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(ResultCode.PARAM_ERROR, message);
    }
}
