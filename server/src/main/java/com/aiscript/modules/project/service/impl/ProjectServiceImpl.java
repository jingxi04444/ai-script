package com.aiscript.modules.project.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.project.convert.ProjectConvert;
import com.aiscript.modules.project.dto.ProjectCreateDTO;
import com.aiscript.modules.project.dto.ProjectQueryDTO;
import com.aiscript.modules.project.dto.ProjectUpdateDTO;
import com.aiscript.modules.project.entity.AiProject;
import com.aiscript.modules.project.mapper.AiProjectMapper;
import com.aiscript.modules.project.service.ProjectService;
import com.aiscript.modules.project.vo.ProjectVO;
import com.aiscript.modules.project.vo.ProjectStatsRow;
import com.aiscript.modules.recyclebin.service.RecycleBinService;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
public class ProjectServiceImpl implements ProjectService {
    private static final Integer DEFAULT_TENANT_ID = 1;

    private final AiProjectMapper projectMapper;
    private final RecycleBinService recycleBinService;

    public ProjectServiceImpl(
        AiProjectMapper projectMapper,
        RecycleBinService recycleBinService
    ) {
        this.projectMapper = projectMapper;
        this.recycleBinService = recycleBinService;
    }

    @Override
    public PageResult<ProjectVO> page(ProjectQueryDTO query, boolean admin) {
        Integer tenantId = TenantContext.getTenantId();
        Integer ownerId = admin ? null : currentUserId();
        IPage<ProjectStatsRow> page = projectMapper.selectPageWithStats(
            new Page<>(query.getPage(), query.getPageSize()),
            tenantId,
            ownerId,
            query.getKeyword(),
            query.getStatus()
        );
        List<ProjectVO> list = page.getRecords().stream().map(this::toProjectVO).toList();
        return new PageResult<>(list, page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    public ProjectVO getById(Integer id) {
        LoginUser loginUser = currentLoginUser();
        Integer ownerId = "admin".equals(loginUser.getUserType()) ? null : loginUser.getUserId();
        ProjectStatsRow project = projectMapper.selectStatsById(id, currentTenantId(), ownerId);
        if (project == null) {
            throw new BusinessException("项目不存在或无权操作");
        }
        return toProjectVO(project);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProjectVO create(ProjectCreateDTO dto) {
        AiProject project = new AiProject();
        project.setTenantId(TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId());
        project.setOwnerId(currentUserId());
        project.setProjectName(StringUtils.hasText(dto.getName()) ? dto.getName() : "未命名项目");
        project.setAvatarUrl(dto.getAvatarUrl());
        project.setAnnouncement(dto.getAnnouncement());
        project.setCategory(dto.getCategory());
        project.setProductName(dto.getProductName());
        project.setPlatform(dto.getPlatform());
        project.setVideoRatio(dto.getVideoRatio());
        project.setVideoType(dto.getVideoType());
        project.setStatus("active");
        project.setCurrentStep("selling-points");
        project.setProgress(0);
        project.setBriefCount(0);
        project.setScriptCount(0);
        project.setVideoCount(0);
        projectMapper.insert(project);
        return ProjectConvert.toVO(project);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProjectVO update(Integer id, ProjectUpdateDTO dto) {
        AiProject project = accessibleProject(id);
        if (StringUtils.hasText(dto.getName())) {
            project.setProjectName(dto.getName());
        }
        if (StringUtils.hasText(dto.getAvatarUrl())) {
            project.setAvatarUrl(dto.getAvatarUrl());
        }
        if (StringUtils.hasText(dto.getAnnouncement())) {
            project.setAnnouncement(dto.getAnnouncement());
        }
        if (StringUtils.hasText(dto.getCategory())) {
            project.setCategory(dto.getCategory());
        }
        if (StringUtils.hasText(dto.getProductName())) {
            project.setProductName(dto.getProductName());
        }
        if (StringUtils.hasText(dto.getStatus())) {
            project.setStatus(dto.getStatus());
        }
        if (StringUtils.hasText(dto.getCurrentStep())) {
            project.setCurrentStep(dto.getCurrentStep());
        }
        projectMapper.updateById(project);
        return ProjectConvert.toVO(project);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Integer id) {
        AiProject project = accessibleProject(id);
        recycleBinService.moveProject(project);
        projectMapper.deleteById(project.getId());
    }

    private AiProject accessibleProject(Integer id) {
        LoginUser loginUser = currentLoginUser();
        LambdaQueryWrapper<AiProject> wrapper = new LambdaQueryWrapper<AiProject>()
            .eq(AiProject::getId, id)
            .eq(AiProject::getTenantId, currentTenantId());
        if (!"admin".equals(loginUser.getUserType())) {
            wrapper.eq(AiProject::getOwnerId, loginUser.getUserId());
        }
        AiProject project = projectMapper.selectOne(wrapper.last("LIMIT 1"));
        if (project == null) {
            throw new BusinessException("项目不存在或无权操作");
        }
        return project;
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }

    private Integer currentUserId() {
        return currentLoginUser().getUserId();
    }

    private LoginUser currentLoginUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException("请先登录");
        }
        return loginUser;
    }

    private ProjectVO toProjectVO(ProjectStatsRow row) {
        ProjectVO vo = new ProjectVO();
        vo.setId(String.valueOf(row.getId()));
        vo.setName(row.getProjectName());
        vo.setAvatarUrl(row.getAvatarUrl());
        vo.setAnnouncement(row.getAnnouncement());
        vo.setUserId(row.getOwnerId() == null ? null : String.valueOf(row.getOwnerId()));
        vo.setUsername("demo");
        vo.setCategory(row.getCategory());
        vo.setStatus(row.getStatus());
        vo.setBriefCount(row.getBriefCount());
        vo.setScriptCount(row.getScriptCount());
        vo.setVideoCount(row.getVideoCount());
        vo.setCreatedAt(row.getCreateTime() == null ? null : row.getCreateTime().toString());
        vo.setUpdatedAt(row.getUpdateTime() == null ? null : row.getUpdateTime().toString());
        return vo;
    }

}
