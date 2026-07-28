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
import com.aiscript.modules.brief.entity.AiBriefShareLink;
import com.aiscript.modules.brief.entity.AiBriefVersion;
import com.aiscript.modules.brief.entity.AiProjectBriefRef;
import com.aiscript.modules.brief.mapper.AiBriefCollaboratorMapper;
import com.aiscript.modules.brief.mapper.AiBriefEditRequestMapper;
import com.aiscript.modules.brief.mapper.AiBriefMapper;
import com.aiscript.modules.brief.mapper.AiBriefShareLinkMapper;
import com.aiscript.modules.brief.mapper.AiBriefVersionMapper;
import com.aiscript.modules.brief.mapper.AiProjectBriefRefMapper;
import com.aiscript.modules.project.entity.AiProject;
import com.aiscript.modules.project.mapper.AiProjectMapper;
import com.aiscript.modules.brief.service.BriefService;
import com.aiscript.modules.brief.vo.BriefEditRequestVO;
import com.aiscript.modules.brief.vo.BriefAssetGroupVO;
import com.aiscript.modules.brief.vo.BriefAssetItemVO;
import com.aiscript.modules.brief.vo.BriefAssetLibraryVO;
import com.aiscript.modules.brief.vo.BriefAssetRowVO;
import com.aiscript.modules.brief.vo.BriefDetailQueryResult;
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
import java.util.LinkedHashMap;
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
    private final AiProjectBriefRefMapper projectBriefRefMapper;
    private final AiProjectMapper projectMapper;
    private final AiBriefCollaboratorMapper collaboratorMapper;
    private final AiBriefEditRequestMapper editRequestMapper;
    private final AiBriefShareLinkMapper shareLinkMapper;

    public BriefServiceImpl(
        AiBriefMapper briefMapper,
        AiBriefVersionMapper briefVersionMapper,
        AiProjectBriefRefMapper projectBriefRefMapper,
        AiProjectMapper projectMapper,
        AiBriefCollaboratorMapper collaboratorMapper,
        AiBriefEditRequestMapper editRequestMapper,
        AiBriefShareLinkMapper shareLinkMapper
    ) {
        this.briefMapper = briefMapper;
        this.briefVersionMapper = briefVersionMapper;
        this.projectBriefRefMapper = projectBriefRefMapper;
        this.projectMapper = projectMapper;
        this.collaboratorMapper = collaboratorMapper;
        this.editRequestMapper = editRequestMapper;
        this.shareLinkMapper = shareLinkMapper;
    }

    @Override
    public List<BriefVO> list(Integer projectId) {
        ensureOwnedProject(projectId);
        List<Integer> linkedBriefIds = projectBriefRefMapper.selectList(
                new LambdaQueryWrapper<AiProjectBriefRef>()
                    .eq(AiProjectBriefRef::getProjectId, projectId)
                    .eq(AiProjectBriefRef::getTenantId, currentTenantId()))
            .stream()
            .map(AiProjectBriefRef::getBriefId)
            .toList();
        LambdaQueryWrapper<AiBrief> wrapper = new LambdaQueryWrapper<>();
        wrapper.and(scope -> {
            scope.and(direct -> direct
                .eq(AiBrief::getProjectId, projectId)
                .eq(AiBrief::getTenantId, currentTenantId()));
            if (!linkedBriefIds.isEmpty()) {
                scope.or().in(AiBrief::getId, linkedBriefIds);
            }
        });
        wrapper.orderByDesc(AiBrief::getUpdateTime);
        return toVOsWithVersions(briefMapper.selectList(wrapper));
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
        return toVOsWithVersions(briefMapper.selectList(wrapper));
    }

    @Override
    public List<BriefVO> mineList(String keyword) {
        Integer userId = requireCurrentUserId();
        LambdaQueryWrapper<AiBrief> wrapper = new LambdaQueryWrapper<AiBrief>()
                .eq(AiBrief::getTenantId, currentTenantId())
                .eq(AiBrief::getCreateBy, userId)
                .orderByDesc(AiBrief::getUpdateTime);
        if (StringUtils.hasText(keyword)) {
            wrapper.and(query -> query
                    .like(AiBrief::getBriefName, keyword)
                    .or()
                    .like(AiBrief::getProductName, keyword)
                    .or()
                    .like(AiBrief::getProductModel, keyword));
        }
        return toVOsWithVersions(briefMapper.selectList(wrapper));
    }



    @Override
    public BriefAssetLibraryVO assetLibrary() {
        List<BriefAssetRowVO> rows = briefMapper.selectAssetLibraryRows(
            currentTenantId(),
            requireCurrentUserId()
        );
        Map<Integer, BriefAssetGroupVO> groups = new LinkedHashMap<>();
        for (BriefAssetRowVO row : rows) {
            BriefAssetGroupVO group = groups.computeIfAbsent(row.getProjectId(), projectId -> {
                BriefAssetGroupVO created = new BriefAssetGroupVO();
                created.setProjectId(String.valueOf(projectId));
                created.setProjectName(row.getProjectName());
                created.setBriefs(new ArrayList<>());
                return created;
            });

            BriefAssetItemVO item = new BriefAssetItemVO();
            item.setId(String.valueOf(row.getBriefId()));
            item.setProjectId(String.valueOf(row.getProjectId()));
            item.setName(row.getName());
            item.setProductName(row.getProductName());
            item.setProductModel(row.getProductModel());
            item.setUpdatedAt(row.getUpdatedAt() == null ? null : row.getUpdatedAt().toString());
            group.getBriefs().add(item);
        }

        BriefAssetLibraryVO result = new BriefAssetLibraryVO();
        result.setTotal((int) rows.stream().map(BriefAssetRowVO::getBriefId).distinct().count());
        result.setProjects(new ArrayList<>(groups.values()));
        return result;
    }

    @Override
    public BriefVO getById(Integer id) {
        BriefDetailQueryResult detail = briefMapper.selectDetail(
            id,
            currentTenantId(),
            requireCurrentUserId()
        );
        if (detail == null || detail.getBrief() == null) {
            throw new BusinessException("Brief 不存在或无权查看");
        }
        BriefVO vo = BriefConvert.toVO(detail.getBrief(), detail.getVersions());
        vo.setAccessPermission(normalizeSharePermission(detail.getAccessPermission()));
        return vo;
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
        brief.setSharePermission("read");
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
    @Transactional(rollbackFor = Exception.class)
    public void delete(Integer id) {
        AiBrief brief = getBrief(id);
        ensureOwner(brief);
        projectBriefRefMapper.delete(new LambdaQueryWrapper<AiProjectBriefRef>()
            .eq(AiProjectBriefRef::getBriefId, id));
        briefMapper.deleteById(id);
    }

    @Override
    public BriefShareVO enableShare(Integer id, String permission) {
        AiBrief brief = getBrief(id);
        ensureCanManage(brief);
        String normalizedPermission = normalizeSharePermission(permission);
        AiBriefShareLink shareLink = shareLinkMapper.selectOne(new LambdaQueryWrapper<AiBriefShareLink>()
                .eq(AiBriefShareLink::getBriefId, brief.getId())
                .eq(AiBriefShareLink::getPermission, normalizedPermission)
                .last("LIMIT 1"));
        if (shareLink == null) {
            shareLink = new AiBriefShareLink();
            shareLink.setTenantId(brief.getTenantId());
            shareLink.setBriefId(brief.getId());
            shareLink.setPermission(normalizedPermission);
            shareLink.setShareToken(
                normalizedPermission.equals(normalizeSharePermission(brief.getSharePermission()))
                    && StringUtils.hasText(brief.getShareToken())
                    ? brief.getShareToken()
                    : newShareToken()
            );
            shareLink.setEnabled(1);
            shareLinkMapper.insert(shareLink);
        } else if (!Integer.valueOf(1).equals(shareLink.getEnabled())) {
            shareLink.setEnabled(1);
            shareLinkMapper.updateById(shareLink);
        }
        brief.setShareEnabled(1);
        brief.setShareTime(LocalDateTime.now());
        briefMapper.updateById(brief);
        return toShareVO(shareLink);
    }

    @Override
    public List<BriefShareVO> shareLinks(Integer id) {
        AiBrief brief = getBrief(id);
        ensureCanManage(brief);
        return shareLinkMapper.selectList(new LambdaQueryWrapper<AiBriefShareLink>()
                .eq(AiBriefShareLink::getBriefId, id)
                .eq(AiBriefShareLink::getEnabled, 1)
                .orderByAsc(AiBriefShareLink::getId))
            .stream()
            .map(this::toShareVO)
            .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefVO getByShareToken(String token) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException("分享链接无效");
        }
        ResolvedShareLink resolved = resolveShareLink(token);
        AiBrief brief = resolved.brief();
        Integer viewerId = currentUserIdOrNull();
        if (viewerId != null) {
            if (viewerId.equals(brief.getCreateBy())) {
                throw new BusinessException("不能使用自己创建的 Brief 分享链接");
            }
            upsertCollaborator(brief, viewerId, resolved.permission(), "link");
        }
        return toVOWithVersions(brief, resolved.permission());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefVO updateByShareToken(String token, Integer projectId, BriefSaveDTO dto) {
        ResolvedShareLink resolved = resolveShareLink(token);
        if ("read".equals(resolved.permission())) {
            throw new BusinessException("当前分享链接仅可阅读，不能修改 Brief");
        }
        Integer userId = requireCurrentUserId();
        AiBrief brief = resolved.brief();
        if (userId.equals(brief.getCreateBy())) {
            throw new BusinessException("不能使用自己创建的 Brief 分享链接");
        }
        ensureOwnedProject(projectId);
        Long referenceCount = projectBriefRefMapper.selectCount(new LambdaQueryWrapper<AiProjectBriefRef>()
            .eq(AiProjectBriefRef::getTenantId, currentTenantId())
            .eq(AiProjectBriefRef::getProjectId, projectId)
            .eq(AiProjectBriefRef::getBriefId, brief.getId()));
        if (referenceCount == 0) {
            throw new BusinessException("请先将共享 Brief 加入所选项目");
        }
        upsertCollaborator(brief, userId, resolved.permission(), "link");
        fillPartial(brief, dto);
        brief.setVersionNo(brief.getVersionNo() == null ? 1 : brief.getVersionNo() + 1);
        briefMapper.updateById(brief);
        saveVersion(brief, "share-link-update");
        return toVOWithVersions(brief, resolved.permission());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefVO linkToProject(Integer id, Integer projectId) {
        AiBrief brief = getBrief(id);
        Integer userId = requireCurrentUserId();
        if (userId.equals(brief.getCreateBy())) {
            throw new BusinessException("不能将自己创建的 Brief 作为共享 Brief 加入项目");
        }
        ensureOwnedProject(projectId);
        if (!hasCollaboratorPermission(brief.getId(), userId, "read", "edit", "manage")) {
            throw new BusinessException("请先通过有效分享链接访问该 Brief");
        }

        AiProjectBriefRef existing = projectBriefRefMapper.selectOne(
            new LambdaQueryWrapper<AiProjectBriefRef>()
                .eq(AiProjectBriefRef::getProjectId, projectId)
                .eq(AiProjectBriefRef::getBriefId, brief.getId())
                .last("LIMIT 1")
        );
        if (existing == null) {
            AiProjectBriefRef reference = new AiProjectBriefRef();
            reference.setTenantId(currentTenantId());
            reference.setProjectId(projectId);
            reference.setBriefId(brief.getId());
            projectBriefRefMapper.insert(reference);
        }
        return toVOWithVersions(brief);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefEditRequestVO requestEditByShareToken(String token, BriefEditRequestDTO dto) {
        ResolvedShareLink resolved = resolveShareLink(token);
        AiBrief brief = resolved.brief();
        Integer requesterId = requireCurrentUserId();
        if (requesterId.equals(brief.getCreateBy())) {
            throw new BusinessException("创建人已拥有编辑权限");
        }
        if (!"read".equals(resolved.permission())) {
            upsertCollaborator(brief, requesterId, resolved.permission(), "link");
            throw new BusinessException("该分享链接已包含编辑权限，无需申请");
        }
        if (hasCollaboratorPermission(brief.getId(), requesterId, "edit", "manage")) {
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
        ensureCanManage(brief);
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
        ensureCanManage(brief);
        request.setStatus("approved");
        request.setApproveTime(LocalDateTime.now());
        editRequestMapper.updateById(request);
        upsertCollaborator(brief, request.getRequesterId(), "edit", "approval");
        return toEditRequestVO(request);
    }

    @Override
    public BriefEditRequestVO rejectEditRequest(Integer requestId) {
        AiBriefEditRequest request = getEditRequest(requestId);
        AiBrief brief = getBrief(request.getBriefId());
        ensureCanManage(brief);
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
        brief.setRichContent(dto.getRichContent());
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
        if (dto.getRichContent() != null) {
            brief.setRichContent(dto.getRichContent());
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

    private void ensureOwnedProject(Integer projectId) {
        if (projectId == null) {
            throw new BusinessException("项目ID不能为空");
        }
        Integer userId = requireCurrentUserId();
        Long count = projectMapper.selectCount(new LambdaQueryWrapper<AiProject>()
            .eq(AiProject::getId, projectId)
            .eq(AiProject::getTenantId, currentTenantId())
            .eq(AiProject::getOwnerId, userId));
        if (count == 0) {
            throw new BusinessException("项目不存在或无权操作");
        }
    }

    private AiBrief getBrief(Integer id) {
        AiBrief brief = briefMapper.selectById(id);
        if (brief == null) {
            throw new BusinessException("Brief 不存在");
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

    private void upsertCollaborator(AiBrief brief, Integer userId, String permission, String permissionSource) {
        AiBriefCollaborator collaborator = collaboratorMapper.selectOne(new LambdaQueryWrapper<AiBriefCollaborator>()
                .eq(AiBriefCollaborator::getBriefId, brief.getId())
                .eq(AiBriefCollaborator::getUserId, userId)
                .last("LIMIT 1"));
        if (collaborator == null) {
            collaborator = new AiBriefCollaborator();
            collaborator.setTenantId(brief.getTenantId());
            collaborator.setBriefId(brief.getId());
            collaborator.setUserId(userId);
            collaborator.setPermission(permission);
            collaborator.setPermissionSource(permissionSource);
        } else if (permissionRank(permission) > permissionRank(collaborator.getPermission())) {
            collaborator.setPermission(permission);
            collaborator.setPermissionSource(permissionSource);
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
        if (userId.equals(brief.getCreateBy()) || hasCollaboratorPermission(brief.getId(), userId, "edit", "manage")) {
            return;
        }
        throw new BusinessException("没有该 Brief 的编辑权限，请先申请编辑权限");
    }

    private void ensureCanManage(AiBrief brief) {
        Integer userId = requireCurrentUserId();
        if (brief.getCreateBy() == null) {
            brief.setCreateBy(userId);
            briefMapper.updateById(brief);
            return;
        }
        if (userId.equals(brief.getCreateBy()) || hasCollaboratorPermission(brief.getId(), userId, "manage")) {
            return;
        }
        throw new BusinessException("没有该 Brief 的管理权限");
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

    private boolean hasCollaboratorPermission(Integer briefId, Integer userId, String... permissions) {
        return collaboratorMapper.selectCount(new LambdaQueryWrapper<AiBriefCollaborator>()
                .eq(AiBriefCollaborator::getBriefId, briefId)
                .eq(AiBriefCollaborator::getUserId, userId)
                .in(AiBriefCollaborator::getPermission, List.of(permissions))
                .eq(AiBriefCollaborator::getStatus, 1)) > 0;
    }

    private String normalizeSharePermission(String permission) {
        if ("edit".equals(permission) || "manage".equals(permission)) {
            return permission;
        }
        return "read";
    }

    private int permissionRank(String permission) {
        return switch (normalizeSharePermission(permission)) {
            case "manage" -> 3;
            case "edit" -> 2;
            default -> 1;
        };
    }

    private Integer currentUserIdOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            return null;
        }
        return loginUser.getUserId();
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
            Map.entry("briefContent", empty(brief.getBriefContent())),
            Map.entry("richContent", empty(brief.getRichContent()))
        )));
        version.setChangeNote(changeNote);
        version.setCreateTime(LocalDateTime.now());
        briefVersionMapper.insert(version);
    }

    private List<BriefVO> toVOsWithVersions(List<AiBrief> briefs) {
        if (briefs == null || briefs.isEmpty()) {
            return List.of();
        }

        List<Integer> briefIds = briefs.stream().map(AiBrief::getId).toList();
        List<AiBriefVersion> versions = briefVersionMapper.selectList(new LambdaQueryWrapper<AiBriefVersion>()
                .in(AiBriefVersion::getBriefId, briefIds)
                .orderByDesc(AiBriefVersion::getBriefId)
                .orderByDesc(AiBriefVersion::getVersionNo));
        Map<Integer, List<AiBriefVersion>> versionsByBriefId = new HashMap<>();
        for (AiBriefVersion version : versions) {
            versionsByBriefId.computeIfAbsent(version.getBriefId(), ignored -> new ArrayList<>()).add(version);
        }

        Integer userId = currentUserIdOrNull();
        Map<Integer, String> collaboratorPermissions = new HashMap<>();
        if (userId != null) {
            List<Integer> nonOwnedBriefIds = briefs.stream()
                .filter(brief -> !userId.equals(brief.getCreateBy()))
                .map(AiBrief::getId)
                .toList();
            if (!nonOwnedBriefIds.isEmpty()) {
                List<AiBriefCollaborator> collaborators = collaboratorMapper.selectList(
                    new LambdaQueryWrapper<AiBriefCollaborator>()
                        .in(AiBriefCollaborator::getBriefId, nonOwnedBriefIds)
                        .eq(AiBriefCollaborator::getUserId, userId)
                        .eq(AiBriefCollaborator::getStatus, 1));
                for (AiBriefCollaborator collaborator : collaborators) {
                    collaboratorPermissions.put(
                        collaborator.getBriefId(),
                        normalizeSharePermission(collaborator.getPermission())
                    );
                }
            }
        }

        return briefs.stream().map(brief -> {
            BriefVO vo = BriefConvert.toVO(
                brief,
                versionsByBriefId.getOrDefault(brief.getId(), List.of())
            );
            String accessPermission = userId == null
                ? "read"
                : userId.equals(brief.getCreateBy())
                    ? "manage"
                    : collaboratorPermissions.getOrDefault(brief.getId(), "read");
            vo.setAccessPermission(accessPermission);
            return vo;
        }).toList();
    }

    private BriefVO toVOWithVersions(AiBrief brief) {
        List<AiBriefVersion> versions = briefVersionMapper.selectList(new LambdaQueryWrapper<AiBriefVersion>()
                .eq(AiBriefVersion::getBriefId, brief.getId())
                .orderByDesc(AiBriefVersion::getVersionNo)
                .orderByDesc(AiBriefVersion::getCreateTime));
        BriefVO vo = BriefConvert.toVO(brief, versions);
        vo.setAccessPermission(resolveAccessPermission(brief));
        return vo;
    }

    private BriefVO toVOWithVersions(AiBrief brief, String accessPermission) {
        BriefVO vo = toVOWithVersions(brief);
        vo.setAccessPermission(normalizeSharePermission(accessPermission));
        vo.setSharePermission(normalizeSharePermission(accessPermission));
        return vo;
    }

    private BriefShareVO toShareVO(AiBriefShareLink shareLink) {
        BriefShareVO vo = new BriefShareVO();
        vo.setBriefId(String.valueOf(shareLink.getBriefId()));
        vo.setShareToken(shareLink.getShareToken());
        vo.setShareUrl("/brief-share/" + shareLink.getShareToken());
        vo.setPermission(normalizeSharePermission(shareLink.getPermission()));
        return vo;
    }

    private ResolvedShareLink resolveShareLink(String token) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException("分享链接无效");
        }
        AiBriefShareLink shareLink = shareLinkMapper.selectOne(new LambdaQueryWrapper<AiBriefShareLink>()
                .eq(AiBriefShareLink::getShareToken, token)
                .eq(AiBriefShareLink::getEnabled, 1)
                .last("LIMIT 1"));
        if (shareLink != null) {
            AiBrief brief = briefMapper.selectById(shareLink.getBriefId());
            if (brief != null && Integer.valueOf(1).equals(brief.getShareEnabled())) {
                return new ResolvedShareLink(brief, normalizeSharePermission(shareLink.getPermission()));
            }
        }
        AiBrief legacyBrief = briefMapper.selectOne(new LambdaQueryWrapper<AiBrief>()
                .eq(AiBrief::getShareToken, token)
                .eq(AiBrief::getShareEnabled, 1)
                .last("LIMIT 1"));
        if (legacyBrief == null) {
            throw new BusinessException("分享链接不存在或已失效");
        }
        return new ResolvedShareLink(legacyBrief, normalizeSharePermission(legacyBrief.getSharePermission()));
    }

    private record ResolvedShareLink(AiBrief brief, String permission) {
    }

    private String resolveAccessPermission(AiBrief brief) {
        Integer userId = currentUserIdOrNull();
        if (userId == null) {
            return "read";
        }
        if (userId.equals(brief.getCreateBy())) {
            return "manage";
        }
        AiBriefCollaborator collaborator = collaboratorMapper.selectOne(new LambdaQueryWrapper<AiBriefCollaborator>()
                .eq(AiBriefCollaborator::getBriefId, brief.getId())
                .eq(AiBriefCollaborator::getUserId, userId)
                .eq(AiBriefCollaborator::getStatus, 1)
                .last("LIMIT 1"));
        return collaborator == null ? "read" : normalizeSharePermission(collaborator.getPermission());
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
