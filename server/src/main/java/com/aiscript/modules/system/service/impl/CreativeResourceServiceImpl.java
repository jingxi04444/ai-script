package com.aiscript.modules.system.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.system.dto.CreativeResourceMediaDTO;
import com.aiscript.modules.system.dto.CreativeResourceQueryDTO;
import com.aiscript.modules.system.dto.CreativeResourceSaveDTO;
import com.aiscript.modules.system.entity.SysCreativeResource;
import com.aiscript.modules.system.mapper.SysCreativeResourceMapper;
import com.aiscript.modules.system.service.CreativeResourceService;
import com.aiscript.modules.system.vo.CreativeResourceVO;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreativeResourceServiceImpl implements CreativeResourceService {
    private static final Set<String> TYPES = Set.of("character", "style", "effect");
    private static final Set<String> STATUSES = Set.of("draft", "published");
    private final SysCreativeResourceMapper mapper;
    private final ObjectMapper json;

    public CreativeResourceServiceImpl(SysCreativeResourceMapper mapper, ObjectMapper json) { this.mapper = mapper; this.json = json; }

    @Override
    public PageResult<CreativeResourceVO> publishedPage(CreativeResourceQueryDTO query) { return page(query, true); }

    @Override
    public CreativeResourceVO publishedDetail(Long id) {
        SysCreativeResource resource = find(id);
        if (!"published".equals(resource.getStatus())) throw missing();
        return toVO(resource);
    }

    @Override
    public PageResult<CreativeResourceVO> adminPage(CreativeResourceQueryDTO query) { requireAdmin(); return page(query, false); }

    private PageResult<CreativeResourceVO> page(CreativeResourceQueryDTO query, boolean publishedOnly) {
        if (query == null) query = new CreativeResourceQueryDTO();
        long page = query.getPage() == null ? 1 : query.getPage();
        long size = query.getPageSize() == null ? 10 : query.getPageSize();
        if (page < 1 || page > 1_000_000 || size < 1 || size > 200) throw invalid("分页参数超出范围");
        String type = text(query.getType(), "类型", 20, false);
        String category = text(query.getCategory(), "分类", 80, false);
        String keyword = text(query.getKeyword(), "搜索词", 100, false);
        if (!type.isEmpty() && !TYPES.contains(type)) throw invalid("资源类型不正确");
        String status = publishedOnly ? "published" : text(query.getStatus(), "状态", 20, false);
        if (!status.isEmpty() && !STATUSES.contains(status)) throw invalid("资源状态不正确");
        var wrapper = new LambdaQueryWrapper<SysCreativeResource>()
            .eq(!type.isEmpty(), SysCreativeResource::getType, type)
            .eq(!category.isEmpty(), SysCreativeResource::getCategory, category)
            .eq(!status.isEmpty(), SysCreativeResource::getStatus, status)
            .and(!keyword.isEmpty(), nested -> nested.like(SysCreativeResource::getName, keyword)
                .or().like(SysCreativeResource::getCode, keyword)
                .or().like(SysCreativeResource::getDescription, keyword)
                .or().apply("CAST(tags_json AS CHAR) LIKE {0}", "%" + keyword + "%"))
            .orderByAsc(SysCreativeResource::getSortOrder).orderByDesc(SysCreativeResource::getId);
        Page<SysCreativeResource> result = mapper.selectPage(new Page<>(page, size), wrapper);
        return new PageResult<>(result.getRecords().stream().map(this::toVO).toList(), result.getTotal(), result.getCurrent(), result.getSize(), result.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CreativeResourceVO save(Long id, CreativeResourceSaveDTO dto) {
        LoginUser admin = requireAdmin();
        if (dto == null) throw invalid("资源内容不能为空");
        SysCreativeResource resource = id == null ? new SysCreativeResource() : find(id);
        String code = text(dto.code, "资源编码", 80, true);
        if (!code.matches("[a-z0-9]+(?:-[a-z0-9]+)*")) throw invalid("编码仅支持小写字母、数字与连字符");
        if (id != null && !code.equals(resource.getCode())) throw invalid("资源编码创建后不可修改，请新建资源");
        if (id == null && mapper.findReservedCode(code) != null) throw new BusinessException(ResultCode.CONFLICT, "资源编码已使用（包含已删除资源），请更换编码");
        String type = text(dto.type, "资源类型", 20, true);
        String status = text(dto.status, "状态", 20, true);
        if (!TYPES.contains(type)) throw invalid("资源类型不正确");
        if (!STATUSES.contains(status)) throw invalid("资源状态不正确");
        boolean published = "published".equals(status);
        resource.setCode(code);
        resource.setType(type);
        resource.setStatus(status);
        resource.setName(text(dto.name, "名称", 120, true));
        resource.setCategory(text(dto.category, "分类", 80, true));
        resource.setDescription(text(dto.description, "描述", 2000, false));
        resource.setCoverUrl(url(dto.coverUrl, "封面地址", published));
        resource.setPreviewVideoUrl(url(dto.previewVideoUrl, "预览视频地址", false));
        resource.setPrompt(text(dto.prompt, "提示词", 12000, published));
        resource.setNegativePrompt(text(dto.negativePrompt, "负向提示词", 4000, false));
        resource.setLicenseNote(text(dto.licenseNote, "授权说明", 2000, published));
        resource.setAuthor(text(dto.author, "作者", 120, false));
        int order = dto.sortOrder == null ? 0 : dto.sortOrder;
        if (order < -100000 || order > 100000) throw invalid("排序值须在 -100000 到 100000 之间");
        resource.setSortOrder(order);
        List<CreativeResourceMediaDTO> gallery = new ArrayList<>();
        if (dto.gallery != null) {
            if (dto.gallery.size() > 12) throw invalid("最多上传 12 张画廊图");
            for (CreativeResourceMediaDTO item : dto.gallery) {
                if (item == null) throw invalid("画廊图片不能为空");
                gallery.add(new CreativeResourceMediaDTO(text(item.label(), "图片说明", 80, false), url(item.url(), "画廊图片地址", true)));
            }
        }
        List<String> tags = new ArrayList<>();
        if (dto.tags != null) {
            if (dto.tags.size() > 20) throw invalid("最多设置 20 个标签");
            for (String tag : dto.tags) {
                String value = text(tag, "标签", 40, true);
                if (!tags.contains(value)) tags.add(value);
            }
        }
        Map<String, Object> config = dto.config == null ? Map.of() : dto.config;
        validateConfig(config, 0);
        String configJson = writeJson(config);
        if (configJson.getBytes(StandardCharsets.UTF_8).length > 16000) throw invalid("资源参数不能超过 16 KB");
        resource.setGalleryJson(writeJson(gallery));
        resource.setTagsJson(writeJson(tags));
        resource.setConfigJson(configJson);
        // Loaded entities already contain audit values; refresh explicitly instead
        // of relying on strictUpdateFill, which only fills null properties.
        resource.setUpdateBy(admin.getUserId());
        resource.setUpdateTime(LocalDateTime.now());
        try {
            int changed = id == null ? mapper.insert(resource) : mapper.updateById(resource);
            if (changed != 1) throw new BusinessException(ResultCode.CONFLICT, "资源已被删除或更新，请刷新后重试");
        } catch (DuplicateKeyException exception) {
            throw new BusinessException(ResultCode.CONFLICT, "资源编码已使用，请更换编码");
        }
        return toVO(resource);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        LoginUser admin = requireAdmin();
        SysCreativeResource resource = find(id);
        resource.setUpdateBy(admin.getUserId());
        resource.setUpdateTime(LocalDateTime.now());
        // Use entity overload so MyBatis-Plus also fills updateBy/updateTime on logical deletion.
        if (mapper.deleteById(resource) != 1) throw new BusinessException(ResultCode.CONFLICT, "资源状态已变更，请刷新后重试");
    }

    private SysCreativeResource find(Long id) {
        if (id == null || id <= 0) throw invalid("资源 ID 不正确");
        SysCreativeResource resource = mapper.selectById(id);
        if (resource == null || Integer.valueOf(1).equals(resource.getDeleted())) throw missing();
        return resource;
    }

    private LoginUser requireAdmin() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof LoginUser user)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录管理员账号");
        }
        if (!"admin".equals(user.getUserType())) throw new BusinessException(ResultCode.FORBIDDEN, "仅管理员可维护创意资源库");
        return user;
    }

    private static String text(String value, String label, int max, boolean required) {
        String result = value == null ? "" : value.trim();
        if (required && result.isEmpty()) throw invalid(label + "不能为空");
        if (result.length() > max || result.indexOf('\0') >= 0) throw invalid(label + "长度超限或包含非法字符");
        return result;
    }

    private static String url(String value, String label, boolean required) {
        String result = text(value, label, 2048, required);
        if (result.isEmpty()) return result;
        try {
            if (result.contains("\\") || result.chars().anyMatch(Character::isISOControl)) throw new IllegalArgumentException();
            URI uri = URI.create(result);
            if (result.startsWith("/") && !result.startsWith("//") && uri.getRawAuthority() == null) return result;
            if (("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())) && uri.getHost() != null && uri.getUserInfo() == null) return result;
        } catch (IllegalArgumentException ignored) { /* Fall through to a consistent business validation error. */ }
        throw invalid(label + "仅支持 HTTP(S) 或站内绝对路径，不支持 data/blob/javascript 地址");
    }

    /** Configuration is bounded JSON data only; never evaluated as scripts or executable skill code. */
    private static void validateConfig(Object value, int depth) {
        if (depth > 8) throw invalid("参数嵌套最多 8 层");
        if (value instanceof Map<?, ?> values) {
            if (values.size() > 100) throw invalid("参数字段过多");
            values.forEach((key, item) -> {
                if (!(key instanceof String name) || name.isBlank() || name.length() > 80 || Set.of("__proto__", "prototype", "constructor").contains(name)) throw invalid("参数字段名不合法");
                validateConfig(item, depth + 1);
            });
        } else if (value instanceof List<?> values) {
            if (values.size() > 100) throw invalid("参数数组过长");
            values.forEach(item -> validateConfig(item, depth + 1));
        } else if (value instanceof String string) {
            text(string, "参数文本", 4000, false);
        } else if (value instanceof Number number) {
            if (!Double.isFinite(number.doubleValue())) throw invalid("参数必须为有限数值");
        } else if (value != null && !(value instanceof Boolean)) throw invalid("参数仅允许 JSON 数据");
    }

    private String writeJson(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException exception) { throw invalid("资源 JSON 格式不正确"); }
    }

    private CreativeResourceVO toVO(SysCreativeResource resource) {
        CreativeResourceVO vo = new CreativeResourceVO();
        vo.id = resource.getId() == null ? null : resource.getId().toString();
        vo.code = resource.getCode(); vo.type = resource.getType(); vo.name = resource.getName(); vo.category = resource.getCategory();
        vo.description = resource.getDescription(); vo.coverUrl = resource.getCoverUrl(); vo.previewVideoUrl = resource.getPreviewVideoUrl();
        vo.prompt = resource.getPrompt(); vo.negativePrompt = resource.getNegativePrompt(); vo.status = resource.getStatus(); vo.sortOrder = resource.getSortOrder();
        vo.licenseNote = resource.getLicenseNote(); vo.author = resource.getAuthor(); vo.createTime = resource.getCreateTime(); vo.updateTime = resource.getUpdateTime();
        try {
            vo.gallery = json.readValue(resource.getGalleryJson() == null ? "[]" : resource.getGalleryJson(), new TypeReference<List<CreativeResourceMediaDTO>>() {});
            vo.tags = json.readValue(resource.getTagsJson() == null ? "[]" : resource.getTagsJson(), new TypeReference<List<String>>() {});
            vo.config = json.readValue(resource.getConfigJson() == null ? "{}" : resource.getConfigJson(), new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException exception) { throw new BusinessException(ResultCode.SYSTEM_ERROR, "创意资源数据格式异常，请联系管理员"); }
        return vo;
    }

    private static BusinessException invalid(String message) { return new BusinessException(ResultCode.PARAM_ERROR, message); }
    private static BusinessException missing() { return new BusinessException(ResultCode.NOT_FOUND, "创意资源不存在或未发布"); }
}
