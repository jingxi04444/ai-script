package com.aiscript.modules.project.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.brief.entity.AiBrief;
import com.aiscript.modules.brief.mapper.AiBriefMapper;
import com.aiscript.modules.generation.entity.AiVideoSegment;
import com.aiscript.modules.generation.mapper.AiVideoSegmentMapper;
import com.aiscript.modules.project.convert.ProjectConvert;
import com.aiscript.modules.project.dto.ProjectCreateDTO;
import com.aiscript.modules.project.dto.ProjectQueryDTO;
import com.aiscript.modules.project.dto.ProjectUpdateDTO;
import com.aiscript.modules.project.entity.AiProject;
import com.aiscript.modules.project.mapper.AiProjectMapper;
import com.aiscript.modules.project.service.ProjectService;
import com.aiscript.modules.project.vo.ProjectVO;
import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import com.aiscript.modules.storyboard.mapper.AiStoryboardScriptMapper;
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
    private final AiBriefMapper briefMapper;
    private final AiStoryboardScriptMapper scriptMapper;
    private final AiVideoSegmentMapper videoSegmentMapper;

    public ProjectServiceImpl(
        AiProjectMapper projectMapper,
        AiBriefMapper briefMapper,
        AiStoryboardScriptMapper scriptMapper,
        AiVideoSegmentMapper videoSegmentMapper
    ) {
        this.projectMapper = projectMapper;
        this.briefMapper = briefMapper;
        this.scriptMapper = scriptMapper;
        this.videoSegmentMapper = videoSegmentMapper;
    }

    @Override
    public PageResult<ProjectVO> page(ProjectQueryDTO query, boolean admin) {
        LambdaQueryWrapper<AiProject> wrapper = new LambdaQueryWrapper<>();
        Integer tenantId = TenantContext.getTenantId();
        if (tenantId != null) {
            wrapper.eq(AiProject::getTenantId, tenantId);
        }
        if (!admin) {
            wrapper.eq(AiProject::getOwnerId, currentUserId());
        }
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.like(AiProject::getProjectName, query.getKeyword());
        }
        if (StringUtils.hasText(query.getStatus())) {
            wrapper.eq(AiProject::getStatus, query.getStatus());
        }
        wrapper.orderByDesc(AiProject::getUpdateTime);
        IPage<AiProject> page = projectMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        List<ProjectVO> list = page.getRecords().stream().map(this::toVOWithStats).toList();
        return new PageResult<>(list, page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    public ProjectVO getById(Integer id) {
        AiProject project = accessibleProject(id);
        return toVOWithStats(project);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ProjectVO create(ProjectCreateDTO dto) {
        AiProject project = new AiProject();
        project.setTenantId(TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId());
        project.setOwnerId(currentUserId());
        project.setProjectName(StringUtils.hasText(dto.getName()) ? dto.getName() : "未命名项目");
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
    public void delete(Integer id) {
        projectMapper.deleteById(accessibleProject(id).getId());
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

    private ProjectVO toVOWithStats(AiProject project) {
        ProjectVO vo = ProjectConvert.toVO(project);
        vo.setBriefCount(countBriefs(project.getId()));
        vo.setScriptCount(countScripts(project.getId()));
        vo.setVideoCount(countVideos(project.getId()));
        return vo;
    }

    private Integer countBriefs(Integer projectId) {
        return Math.toIntExact(briefMapper.selectCount(new LambdaQueryWrapper<AiBrief>()
            .eq(AiBrief::getProjectId, projectId)));
    }

    private Integer countScripts(Integer projectId) {
        return Math.toIntExact(scriptMapper.selectCount(new LambdaQueryWrapper<AiStoryboardScript>()
            .eq(AiStoryboardScript::getProjectId, projectId)));
    }

    private Integer countVideos(Integer projectId) {
        return Math.toIntExact(videoSegmentMapper.selectCount(new LambdaQueryWrapper<AiVideoSegment>()
            .eq(AiVideoSegment::getProjectId, projectId)));
    }
}
