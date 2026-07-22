package com.aiscript.modules.brief.service.impl;

import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.context.AnalysisContext;
import com.alibaba.excel.event.AnalysisEventListener;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.brief.convert.BriefConvert;
import com.aiscript.modules.brief.dto.BriefEditRequestDTO;
import com.aiscript.modules.brief.dto.BriefSaveDTO;
import com.aiscript.modules.brief.entity.AiBrief;
import com.aiscript.modules.brief.entity.AiBriefCollaborator;
import com.aiscript.modules.brief.entity.AiBriefEditRequest;
import com.aiscript.modules.brief.entity.AiBriefVersion;
import com.aiscript.modules.brief.mapper.AiBriefCollaboratorMapper;
import com.aiscript.modules.brief.mapper.AiBriefEditRequestMapper;
import com.aiscript.modules.brief.mapper.AiBriefMapper;
import com.aiscript.modules.brief.mapper.AiBriefVersionMapper;
import com.aiscript.modules.brief.service.BriefService;
import com.aiscript.modules.brief.vo.BriefEditRequestVO;
import com.aiscript.modules.brief.vo.BriefShareVO;
import com.aiscript.modules.brief.vo.BriefVO;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.io.IOException;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class BriefServiceImpl implements BriefService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private final AiBriefMapper briefMapper;
    private final AiBriefVersionMapper briefVersionMapper;
    private final AiBriefCollaboratorMapper collaboratorMapper;
    private final AiBriefEditRequestMapper editRequestMapper;

    public BriefServiceImpl(
        AiBriefMapper briefMapper,
        AiBriefVersionMapper briefVersionMapper,
        AiBriefCollaboratorMapper collaboratorMapper,
        AiBriefEditRequestMapper editRequestMapper
    ) {
        this.briefMapper = briefMapper;
        this.briefVersionMapper = briefVersionMapper;
        this.collaboratorMapper = collaboratorMapper;
        this.editRequestMapper = editRequestMapper;
    }

    @Override
    public List<BriefVO> list(Integer projectId) {
        return briefMapper.selectList(new LambdaQueryWrapper<AiBrief>()
                .eq(AiBrief::getProjectId, projectId)
                .orderByDesc(AiBrief::getUpdateTime))
            .stream()
            .map(this::toVOWithVersions)
            .toList();
    }

    @Override
    public List<BriefVO> sharedList(String keyword) {
        LambdaQueryWrapper<AiBrief> wrapper = new LambdaQueryWrapper<AiBrief>()
                .eq(AiBrief::getTenantId, currentTenantId())
                .eq(AiBrief::getIsShared, 1)
                .orderByDesc(AiBrief::getUpdateTime);
        if (StringUtils.hasText(keyword)) {
            wrapper.and(query -> query
                    .like(AiBrief::getBriefName, keyword)
                    .or()
                    .like(AiBrief::getProductName, keyword)
                    .or()
                    .like(AiBrief::getProductModel, keyword));
        }
        return briefMapper.selectList(wrapper).stream().map(this::toVOWithVersions).toList();
    }

    @Override
    public List<BriefVO> mineList(String keyword) {
        LambdaQueryWrapper<AiBrief> wrapper = new LambdaQueryWrapper<AiBrief>()
                .eq(AiBrief::getTenantId, currentTenantId())
                .eq(AiBrief::getCreateBy, requireCurrentUserId())
                .orderByDesc(AiBrief::getUpdateTime);
        if (StringUtils.hasText(keyword)) {
            wrapper.and(query -> query
                    .like(AiBrief::getBriefName, keyword)
                    .or()
                    .like(AiBrief::getProductName, keyword)
                    .or()
                    .like(AiBrief::getProductModel, keyword));
        }
        return briefMapper.selectList(wrapper).stream().map(this::toVOWithVersions).toList();
    }

    @Override
    public BriefVO getById(Integer id) {
        AiBrief brief = briefMapper.selectById(id);
        if (brief == null) {
            throw new BusinessException("Brief 不存在");
        }
        return toVOWithVersions(brief);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefVO create(BriefSaveDTO dto) {
        AiBrief brief = new AiBrief();
        brief.setTenantId(TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId());
        brief.setProjectId(Integer.valueOf(dto.getProjectId()));
        fill(brief, dto);
        brief.setVersionNo(1);
        brief.setStatus("draft");
        brief.setIsShared(value(dto.getIsShared()));
        brief.setShareEnabled(value(dto.getShareEnabled()));
        if (brief.getShareEnabled() == 1) {
            brief.setShareToken(newShareToken());
            brief.setShareTime(LocalDateTime.now());
        }
        briefMapper.insert(brief);
        saveVersion(brief, "create");
        return toVOWithVersions(brief);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefVO update(Integer id, BriefSaveDTO dto) {
        AiBrief brief = briefMapper.selectById(id);
        if (brief == null) {
            throw new BusinessException("Brief 不存在");
        }
        ensureCanEdit(brief);
        fillPartial(brief, dto);
        if (dto.getIsShared() != null) {
            brief.setIsShared(value(dto.getIsShared()));
        }
        if (dto.getShareEnabled() != null) {
            brief.setShareEnabled(value(dto.getShareEnabled()));
            if (brief.getShareEnabled() == 1 && !StringUtils.hasText(brief.getShareToken())) {
                brief.setShareToken(newShareToken());
                brief.setShareTime(LocalDateTime.now());
            }
        }
        boolean createNewVersion = Boolean.TRUE.equals(dto.getForceNewVersion());
        if (createNewVersion) {
            brief.setVersionNo(brief.getVersionNo() == null ? 1 : brief.getVersionNo() + 1);
        }
        briefMapper.updateById(brief);
        if (createNewVersion) {
            saveVersion(brief, "update");
        }
        return toVOWithVersions(brief);
    }

    @Override
    public void delete(Integer id) {
        AiBrief brief = getBrief(id);
        ensureOwner(brief);
        briefMapper.deleteById(id);
    }

    @Override
    public BriefShareVO enableShare(Integer id) {
        AiBrief brief = getBrief(id);
        ensureOwner(brief);
        if (!StringUtils.hasText(brief.getShareToken())) {
            brief.setShareToken(newShareToken());
        }
        brief.setShareEnabled(1);
        brief.setShareTime(LocalDateTime.now());
        briefMapper.updateById(brief);

        BriefShareVO vo = new BriefShareVO();
        vo.setBriefId(String.valueOf(brief.getId()));
        vo.setShareToken(brief.getShareToken());
        vo.setShareUrl("/brief-share/" + brief.getShareToken());
        return vo;
    }

    @Override
    public BriefVO getByShareToken(String token) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException("分享链接无效");
        }
        AiBrief brief = briefMapper.selectOne(new LambdaQueryWrapper<AiBrief>()
                .eq(AiBrief::getShareToken, token)
                .eq(AiBrief::getShareEnabled, 1)
                .last("LIMIT 1"));
        if (brief == null) {
            throw new BusinessException("分享链接不存在或已失效");
        }
        return toVOWithVersions(brief);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefVO copyToProject(Integer id, Integer projectId) {
        AiBrief source = getBrief(id);
        if (projectId == null) {
            throw new BusinessException("项目ID不能为空");
        }
        AiBrief target = new AiBrief();
        target.setTenantId(currentTenantId());
        target.setProjectId(projectId);
        target.setBriefName(source.getBriefName());
        target.setProductName(source.getProductName());
        target.setProductModel(source.getProductModel());
        target.setPrice(source.getPrice());
        target.setSlogan(source.getSlogan());
        target.setPrimarySellingPoint(source.getPrimarySellingPoint());
        target.setTargetAudience(source.getTargetAudience());
        target.setTargetScene(source.getTargetScene());
        target.setOtherRequirements(source.getOtherRequirements());
        target.setBriefContent(source.getBriefContent());
        target.setVersionNo(1);
        target.setStatus("draft");
        target.setIsShared(0);
        target.setShareEnabled(0);
        briefMapper.insert(target);
        saveVersion(target, "copy-from-shared");
        return toVOWithVersions(target);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefEditRequestVO requestEditByShareToken(String token, BriefEditRequestDTO dto) {
        AiBrief brief = getBriefByShareToken(token);
        Integer requesterId = requireCurrentUserId();
        if (requesterId.equals(brief.getCreateBy())) {
            throw new BusinessException("创建人已拥有编辑权限");
        }
        if (hasCollaboratorPermission(brief.getId(), requesterId)) {
            throw new BusinessException("你已拥有该 Brief 的编辑权限");
        }
        if (brief.getCreateBy() == null) {
            throw new BusinessException("该 Brief 暂未绑定分享人，请让分享人重新开启分享链接");
        }
        AiBriefEditRequest existing = editRequestMapper.selectOne(new LambdaQueryWrapper<AiBriefEditRequest>()
                .eq(AiBriefEditRequest::getBriefId, brief.getId())
                .eq(AiBriefEditRequest::getRequesterId, requesterId)
                .eq(AiBriefEditRequest::getStatus, "pending")
                .last("LIMIT 1"));
        if (existing != null) {
            return toEditRequestVO(existing);
        }
        AiBriefEditRequest request = new AiBriefEditRequest();
        request.setTenantId(brief.getTenantId());
        request.setBriefId(brief.getId());
        request.setRequesterId(requesterId);
        request.setOwnerId(brief.getCreateBy());
        request.setRequestMessage(dto == null ? null : dto.getMessage());
        request.setStatus("pending");
        editRequestMapper.insert(request);
        return toEditRequestVO(request);
    }

    @Override
    public List<BriefEditRequestVO> editRequests(Integer briefId) {
        AiBrief brief = getBrief(briefId);
        ensureOwner(brief);
        return editRequestMapper.selectList(new LambdaQueryWrapper<AiBriefEditRequest>()
                .eq(AiBriefEditRequest::getBriefId, briefId)
                .orderByDesc(AiBriefEditRequest::getCreateTime))
            .stream()
            .map(this::toEditRequestVO)
            .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefEditRequestVO approveEditRequest(Integer requestId) {
        AiBriefEditRequest request = getEditRequest(requestId);
        AiBrief brief = getBrief(request.getBriefId());
        ensureOwner(brief);
        request.setStatus("approved");
        request.setApproveTime(LocalDateTime.now());
        editRequestMapper.updateById(request);
        upsertCollaborator(brief, request.getRequesterId());
        return toEditRequestVO(request);
    }

    @Override
    public BriefEditRequestVO rejectEditRequest(Integer requestId) {
        AiBriefEditRequest request = getEditRequest(requestId);
        AiBrief brief = getBrief(request.getBriefId());
        ensureOwner(brief);
        request.setStatus("rejected");
        request.setApproveTime(LocalDateTime.now());
        editRequestMapper.updateById(request);
        return toEditRequestVO(request);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<BriefVO> importBrief(Integer projectId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("请上传文件");
        }
        if (projectId == null) {
            throw new BusinessException("项目ID不能为空");
        }
        List<Map<String, String>> rows = readRows(file);
        if (rows.isEmpty()) {
            throw new BusinessException("导入文件没有可读取的数据");
        }
        List<BriefVO> imported = new ArrayList<>();
        for (Map<String, String> row : rows) {
            String productName = firstValue(row, "productName", "产品名称", "name", "Brief名称", "名称");
            if (!StringUtils.hasText(productName)) {
                continue;
            }
            BriefSaveDTO dto = new BriefSaveDTO();
            dto.setProjectId(String.valueOf(projectId));
            dto.setName(productName);
            dto.setProductName(productName);
            dto.setProductModel(firstValue(row, "productModel", "产品型号"));
            dto.setPrice(firstValue(row, "price", "产品价格", "价格"));
            dto.setSlogan(firstValue(row, "slogan", "产品slogan", "产品Slogan", "口号"));
            dto.setPrimarySellingPoint(firstValue(row, "primarySellingPoint", "产品主要卖点", "主卖点", "核心卖点"));
            dto.setTargetAudience(firstValue(row, "targetAudience", "目标人群"));
            dto.setTargetScene(firstValue(row, "targetScene", "产品特色卖点", "目标场景", "使用场景"));
            dto.setOtherRequirements(firstValue(row, "otherRequirements", "产品次要卖点", "辅助卖点", "次要卖点", "其他要求"));
            dto.setBriefContent(firstValue(row, "briefContent", "完整Brief", "Brief内容", "内容"));

            AiBrief brief = briefMapper.selectOne(new LambdaQueryWrapper<AiBrief>()
                .eq(AiBrief::getProjectId, projectId)
                .and(wrapper -> wrapper.eq(AiBrief::getProductName, productName).or().eq(AiBrief::getBriefName, productName))
                .last("LIMIT 1"));
            if (brief == null) {
                brief = new AiBrief();
                brief.setTenantId(currentTenantId());
                brief.setProjectId(projectId);
                fill(brief, dto);
                brief.setVersionNo(1);
                brief.setStatus("draft");
                brief.setIsShared(0);
                brief.setShareEnabled(0);
                briefMapper.insert(brief);
                saveVersion(brief, "import-create");
            } else {
                ensureCanEdit(brief);
                fillPartial(brief, dto);
                brief.setVersionNo(brief.getVersionNo() == null ? 1 : brief.getVersionNo() + 1);
                briefMapper.updateById(brief);
                saveVersion(brief, "import-new-version");
            }
            imported.add(toVOWithVersions(brief));
        }
        if (imported.isEmpty()) {
            throw new BusinessException("导入失败：没有包含产品名称的有效数据行");
        }
        return imported;
    }

    private void fill(AiBrief brief, BriefSaveDTO dto) {
        String productName = resolveProductName(dto);
        brief.setBriefName(productName);
        brief.setProductName(productName);
        brief.setProductModel(dto.getProductModel());
        brief.setPrice(dto.getPrice());
        brief.setSlogan(dto.getSlogan());
        brief.setPrimarySellingPoint(dto.getPrimarySellingPoint());
        brief.setTargetAudience(dto.getTargetAudience());
        brief.setTargetScene(dto.getTargetScene());
        brief.setOtherRequirements(dto.getOtherRequirements());
        brief.setBriefContent(dto.getBriefContent());
    }

    private void fillPartial(AiBrief brief, BriefSaveDTO dto) {
        if (dto.getProductName() != null) {
            brief.setProductName(dto.getProductName());
            brief.setBriefName(dto.getProductName());
        } else if (StringUtils.hasText(dto.getName())) {
            brief.setProductName(dto.getName());
            brief.setBriefName(dto.getName());
        }
        if (dto.getProductModel() != null) {
            brief.setProductModel(dto.getProductModel());
        }
        if (dto.getPrice() != null) {
            brief.setPrice(dto.getPrice());
        }
        if (dto.getSlogan() != null) {
            brief.setSlogan(dto.getSlogan());
        }
        if (dto.getPrimarySellingPoint() != null) {
            brief.setPrimarySellingPoint(dto.getPrimarySellingPoint());
        }
        if (dto.getTargetAudience() != null) {
            brief.setTargetAudience(dto.getTargetAudience());
        }
        if (dto.getTargetScene() != null) {
            brief.setTargetScene(dto.getTargetScene());
        }
        if (dto.getOtherRequirements() != null) {
            brief.setOtherRequirements(dto.getOtherRequirements());
        }
        if (dto.getBriefContent() != null) {
            brief.setBriefContent(dto.getBriefContent());
        }
    }

    private String resolveProductName(BriefSaveDTO dto) {
        if (StringUtils.hasText(dto.getProductName())) {
            return dto.getProductName();
        }
        if (StringUtils.hasText(dto.getName())) {
            return dto.getName();
        }
        return "未命名产品";
    }

    private AiBrief getBrief(Integer id) {
        AiBrief brief = briefMapper.selectById(id);
        if (brief == null) {
            throw new BusinessException("Brief 不存在");
        }
        return brief;
    }

    private AiBrief getBriefByShareToken(String token) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException("分享链接无效");
        }
        AiBrief brief = briefMapper.selectOne(new LambdaQueryWrapper<AiBrief>()
                .eq(AiBrief::getShareToken, token)
                .eq(AiBrief::getShareEnabled, 1)
                .last("LIMIT 1"));
        if (brief == null) {
            throw new BusinessException("分享链接不存在或已失效");
        }
        return brief;
    }

    private AiBriefEditRequest getEditRequest(Integer requestId) {
        AiBriefEditRequest request = editRequestMapper.selectById(requestId);
        if (request == null) {
            throw new BusinessException("编辑申请不存在");
        }
        return request;
    }

    private void upsertCollaborator(AiBrief brief, Integer userId) {
        AiBriefCollaborator collaborator = collaboratorMapper.selectOne(new LambdaQueryWrapper<AiBriefCollaborator>()
                .eq(AiBriefCollaborator::getBriefId, brief.getId())
                .eq(AiBriefCollaborator::getUserId, userId)
                .last("LIMIT 1"));
        if (collaborator == null) {
            collaborator = new AiBriefCollaborator();
            collaborator.setTenantId(brief.getTenantId());
            collaborator.setBriefId(brief.getId());
            collaborator.setUserId(userId);
            collaborator.setPermission("edit");
        }
        collaborator.setStatus(1);
        if (collaborator.getId() == null) {
            collaboratorMapper.insert(collaborator);
        } else {
            collaboratorMapper.updateById(collaborator);
        }
    }

    private void ensureCanEdit(AiBrief brief) {
        Integer userId = requireCurrentUserId();
        if (userId.equals(brief.getCreateBy()) || hasCollaboratorPermission(brief.getId(), userId)) {
            return;
        }
        throw new BusinessException("没有该 Brief 的编辑权限，请先申请编辑权限");
    }

    private void ensureOwner(AiBrief brief) {
        Integer userId = requireCurrentUserId();
        if (brief.getCreateBy() == null) {
            brief.setCreateBy(userId);
            briefMapper.updateById(brief);
            return;
        }
        if (!userId.equals(brief.getCreateBy())) {
            throw new BusinessException("只有分享人可以执行该操作");
        }
    }

    private boolean hasCollaboratorPermission(Integer briefId, Integer userId) {
        return collaboratorMapper.selectCount(new LambdaQueryWrapper<AiBriefCollaborator>()
                .eq(AiBriefCollaborator::getBriefId, briefId)
                .eq(AiBriefCollaborator::getUserId, userId)
                .eq(AiBriefCollaborator::getPermission, "edit")
                .eq(AiBriefCollaborator::getStatus, 1)) > 0;
    }

    private BriefEditRequestVO toEditRequestVO(AiBriefEditRequest request) {
        BriefEditRequestVO vo = new BriefEditRequestVO();
        vo.setId(String.valueOf(request.getId()));
        vo.setBriefId(String.valueOf(request.getBriefId()));
        vo.setRequesterId(String.valueOf(request.getRequesterId()));
        vo.setOwnerId(String.valueOf(request.getOwnerId()));
        vo.setRequestMessage(request.getRequestMessage());
        vo.setStatus(request.getStatus());
        vo.setCreatedAt(request.getCreateTime() == null ? null : request.getCreateTime().toString());
        vo.setApproveTime(request.getApproveTime() == null ? null : request.getApproveTime().toString());
        return vo;
    }

    private List<Map<String, String>> readRows(MultipartFile file) {
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (filename.endsWith(".csv")) {
            return readCsvRows(file);
        }
        List<Map<String, String>> rows = new ArrayList<>();
        try {
            EasyExcel.read(file.getInputStream(), new AnalysisEventListener<Map<Integer, String>>() {
                private final Map<Integer, String> headers = new HashMap<>();

                @Override
                public void invokeHeadMap(Map<Integer, String> headMap, AnalysisContext context) {
                    headers.clear();
                    headers.putAll(headMap);
                }

                @Override
                public void invoke(Map<Integer, String> data, AnalysisContext context) {
                    Map<String, String> row = new HashMap<>();
                    data.forEach((index, value) -> {
                        String header = headers.get(index);
                        if (StringUtils.hasText(header) && StringUtils.hasText(value)) {
                            row.put(header.trim(), value.trim());
                        }
                    });
                    if (!row.isEmpty()) {
                        rows.add(row);
                    }
                }

                @Override
                public void doAfterAllAnalysed(AnalysisContext context) {
                }
            }).sheet().doRead();
            return rows;
        } catch (IOException ex) {
            throw new BusinessException("导入文件读取失败：" + ex.getMessage());
        } catch (RuntimeException ex) {
            if (ex instanceof BusinessException businessException) {
                throw businessException;
            }
            throw new BusinessException("导入文件解析失败：" + ex.getMessage());
        }
    }

    private List<Map<String, String>> readCsvRows(MultipartFile file) {
        List<Map<String, String>> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (!StringUtils.hasText(headerLine)) {
                return rows;
            }
            String[] headers = splitCsvLine(headerLine.replace("\uFEFF", ""));
            String line;
            while ((line = reader.readLine()) != null) {
                if (!StringUtils.hasText(line)) {
                    continue;
                }
                String[] values = splitCsvLine(line);
                Map<String, String> row = new HashMap<>();
                for (int i = 0; i < headers.length && i < values.length; i++) {
                    if (StringUtils.hasText(headers[i]) && StringUtils.hasText(values[i])) {
                        row.put(headers[i].trim(), values[i].trim());
                    }
                }
                if (!row.isEmpty()) {
                    rows.add(row);
                }
            }
            return rows;
        } catch (IOException ex) {
            throw new BusinessException("CSV文件读取失败：" + ex.getMessage());
        }
    }

    private String[] splitCsvLine(String line) {
        return line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
    }

    private void saveVersion(AiBrief brief, String changeNote) {
        AiBriefVersion version = new AiBriefVersion();
        version.setTenantId(brief.getTenantId());
        version.setBriefId(brief.getId());
        version.setVersionNo(brief.getVersionNo());
        version.setVersionLabel("v" + brief.getVersionNo() + ".0");
        version.setContentSnapshot(JsonUtils.toJson(Map.ofEntries(
            Map.entry("briefName", empty(brief.getBriefName())),
            Map.entry("projectId", String.valueOf(brief.getProjectId())),
            Map.entry("productName", empty(brief.getProductName())),
            Map.entry("productModel", empty(brief.getProductModel())),
            Map.entry("price", empty(brief.getPrice())),
            Map.entry("slogan", empty(brief.getSlogan())),
            Map.entry("primarySellingPoint", empty(brief.getPrimarySellingPoint())),
            Map.entry("targetAudience", empty(brief.getTargetAudience())),
            Map.entry("targetScene", empty(brief.getTargetScene())),
            Map.entry("otherRequirements", empty(brief.getOtherRequirements())),
            Map.entry("briefContent", empty(brief.getBriefContent()))
        )));
        version.setChangeNote(changeNote);
        version.setCreateTime(LocalDateTime.now());
        briefVersionMapper.insert(version);
    }

    private BriefVO toVOWithVersions(AiBrief brief) {
        List<AiBriefVersion> versions = briefVersionMapper.selectList(new LambdaQueryWrapper<AiBriefVersion>()
                .eq(AiBriefVersion::getBriefId, brief.getId())
                .orderByDesc(AiBriefVersion::getVersionNo)
                .orderByDesc(AiBriefVersion::getCreateTime));
        return BriefConvert.toVO(brief, versions);
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }

    private Integer requireCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException("请先登录");
        }
        return loginUser.getUserId();
    }

    private String firstValue(Map<String, String> row, String... keys) {
        for (String key : keys) {
            String value = row.get(key);
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    private Integer parseLong(String value, String message) {
        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException ex) {
            throw new BusinessException(message);
        }
    }

    private String empty(String value) {
        return value == null ? "" : value;
    }

    private Integer value(Integer value) {
        return value == null || value == 0 ? 0 : 1;
    }

    private String newShareToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

}
