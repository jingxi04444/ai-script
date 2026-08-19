package com.aiscript.modules.project.service;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.project.dto.ShareLinkCreateDTO;
import com.aiscript.modules.project.entity.AiProject;
import com.aiscript.modules.project.entity.AiProjectCollaborationLink;
import com.aiscript.modules.project.entity.AiProjectCollaborator;
import com.aiscript.modules.project.mapper.AiProjectCollaborationLinkMapper;
import com.aiscript.modules.project.mapper.AiProjectCollaboratorMapper;
import com.aiscript.modules.project.mapper.AiProjectMapper;
import com.aiscript.modules.project.vo.ShareLinkVO;
import com.aiscript.modules.project.vo.ProjectCollaborationOverviewVO;
import com.aiscript.modules.auth.entity.SysUser;
import com.aiscript.modules.auth.mapper.SysUserMapper;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectCollaborationService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private static final String PROJECT_TEAM_BENEFIT_CODE = "BRIEF_COLLABORATION";
    private final AiProjectMapper projectMapper;
    private final AiProjectCollaboratorMapper collaboratorMapper;
    private final AiProjectCollaborationLinkMapper linkMapper;
    private final SysUserMapper userMapper;
    private final MembershipEntitlementService membershipEntitlementService;
    private final SecureRandom secureRandom = new SecureRandom();

    public ProjectCollaborationService(AiProjectMapper projectMapper,
                                       AiProjectCollaboratorMapper collaboratorMapper,
                                       AiProjectCollaborationLinkMapper linkMapper,
                                       SysUserMapper userMapper,
                                       MembershipEntitlementService membershipEntitlementService) {
        this.projectMapper = projectMapper;
        this.collaboratorMapper = collaboratorMapper;
        this.linkMapper = linkMapper;
        this.userMapper = userMapper;
        this.membershipEntitlementService = membershipEntitlementService;
    }

    public boolean canAccess(Integer projectId) {
        AiProject project = projectMapper.selectOne(new LambdaQueryWrapper<AiProject>()
            .eq(AiProject::getId, projectId).eq(AiProject::getTenantId, tenantId()).last("LIMIT 1"));
        if (project == null) return false;
        LoginUser user = currentUser();
        if ("admin".equals(user.getUserType()) || user.getUserId().equals(project.getOwnerId())) return true;
        return collaboratorMapper.selectCount(new LambdaQueryWrapper<AiProjectCollaborator>()
            .eq(AiProjectCollaborator::getTenantId, tenantId())
            .eq(AiProjectCollaborator::getProjectId, projectId)
            .eq(AiProjectCollaborator::getUserId, user.getUserId())
            .eq(AiProjectCollaborator::getStatus, "active")) > 0;
    }

    public void requireAccess(Integer projectId) {
        if (!canAccess(projectId)) throw new BusinessException(ResultCode.FORBIDDEN, "无权访问该项目");
    }

    public void requireOwner(Integer projectId) {
        AiProject project = projectMapper.selectOne(new LambdaQueryWrapper<AiProject>()
            .eq(AiProject::getId, projectId).eq(AiProject::getTenantId, tenantId()).last("LIMIT 1"));
        LoginUser user = currentUser();
        if (project == null || (!"admin".equals(user.getUserType()) && !user.getUserId().equals(project.getOwnerId()))) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅项目创建者可以管理项目团队");
        }
    }

    public void updateCurrentStep(Integer projectId, String stepCode) {
        requireAccess(projectId);
        AiProject project = projectMapper.selectOne(new LambdaQueryWrapper<AiProject>()
            .eq(AiProject::getId, projectId)
            .eq(AiProject::getTenantId, tenantId())
            .last("LIMIT 1"));
        if (project == null) throw new BusinessException(ResultCode.NOT_FOUND, "项目不存在");
        project.setCurrentStep(stepCode);
        projectMapper.updateById(project);
    }

    public ProjectCollaborationOverviewVO overview(Integer projectId) {
        requireOwner(projectId);
        List<ProjectCollaborationOverviewVO.LinkItem> links = linkMapper.selectList(
            new LambdaQueryWrapper<AiProjectCollaborationLink>()
                .eq(AiProjectCollaborationLink::getTenantId, tenantId())
                .eq(AiProjectCollaborationLink::getProjectId, projectId)
                .orderByDesc(AiProjectCollaborationLink::getId)).stream()
            .map(link -> {
                String status = "active".equals(link.getStatus())
                    && link.getExpiresAt() != null
                    && link.getExpiresAt().isBefore(LocalDateTime.now()) ? "expired" : link.getStatus();
                return new ProjectCollaborationOverviewVO.LinkItem(
                    String.valueOf(link.getId()), status,
                    link.getExpiresAt() == null ? null : link.getExpiresAt().toString(),
                    link.getUsedCount(), link.getMaxUses());
            })
            .toList();
        List<ProjectCollaborationOverviewVO.MemberItem> members = collaboratorMapper.selectList(
            new LambdaQueryWrapper<AiProjectCollaborator>()
                .eq(AiProjectCollaborator::getTenantId, tenantId())
                .eq(AiProjectCollaborator::getProjectId, projectId)
                .eq(AiProjectCollaborator::getStatus, "active")
                .orderByDesc(AiProjectCollaborator::getJoinedAt)).stream()
            .map(member -> {
                SysUser user = userMapper.selectById(member.getUserId());
                String name = user == null ? "用户 " + member.getUserId()
                    : firstNonBlank(user.getUsername(), user.getAccount(), user.getEmail(), user.getPhone(), "用户 " + member.getUserId());
                return new ProjectCollaborationOverviewVO.MemberItem(
                    String.valueOf(member.getId()), String.valueOf(member.getUserId()), name,
                    user == null ? null : user.getAvatarUrl(),
                    member.getJoinedAt() == null ? null : member.getJoinedAt().toString());
            }).toList();
        return new ProjectCollaborationOverviewVO(links, members);
    }

    @Transactional(rollbackFor = Exception.class)
    public ShareLinkVO createLink(Integer projectId, ShareLinkCreateDTO dto) {
        requireOwner(projectId);
        if (!membershipEntitlementService.hasFeature(tenantId(), currentUser().getUserId(), PROJECT_TEAM_BENEFIT_CODE)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅至尊版会员可以邀请项目团队成员");
        }
        String token = newToken();
        AiProjectCollaborationLink link = new AiProjectCollaborationLink();
        link.setTenantId(tenantId());
        link.setProjectId(projectId);
        link.setTokenHash(hash(token));
        link.setStatus("active");
        link.setUsedCount(0);
        link.setMaxUses(dto == null ? null : dto.getMaxUses());
        int hours = dto == null || dto.getExpiresInHours() == null ? 168 : Math.max(1, dto.getExpiresInHours());
        link.setExpiresAt(LocalDateTime.now().plusHours(hours));
        linkMapper.insert(link);
        return new ShareLinkVO(String.valueOf(link.getId()), token,
            "/project-collaboration/" + token, link.getExpiresAt().toString());
    }

    @Transactional(rollbackFor = Exception.class)
    public String join(String token) {
        AiProjectCollaborationLink link = linkMapper.selectOne(new LambdaQueryWrapper<AiProjectCollaborationLink>()
            .eq(AiProjectCollaborationLink::getTokenHash, hash(token))
            .eq(AiProjectCollaborationLink::getStatus, "active").last("LIMIT 1"));
        validateLink(link);
        Integer userId = currentUser().getUserId();
        AiProject project = projectMapper.selectById(link.getProjectId());
        if (project == null || project.getDeleted() != null && project.getDeleted() == 1) throw new BusinessException("项目不存在");
        if (!userId.equals(project.getOwnerId())) {
            AiProjectCollaborator member = collaboratorMapper.selectOne(new LambdaQueryWrapper<AiProjectCollaborator>()
                .eq(AiProjectCollaborator::getTenantId, link.getTenantId())
                .eq(AiProjectCollaborator::getProjectId, link.getProjectId())
                .eq(AiProjectCollaborator::getUserId, userId).last("LIMIT 1"));
            if (member == null) {
                member = new AiProjectCollaborator();
                member.setTenantId(link.getTenantId());
                member.setProjectId(link.getProjectId());
                member.setUserId(userId);
                member.setJoinedLinkId(link.getId());
                member.setStatus("active");
                member.setJoinedAt(LocalDateTime.now());
                collaboratorMapper.insert(member);
                link.setUsedCount(link.getUsedCount() + 1);
                linkMapper.updateById(link);
            } else if (!"active".equals(member.getStatus())) {
                if (link.getId().equals(member.getJoinedLinkId())) {
                    throw new BusinessException(ResultCode.FORBIDDEN, "你已被移出该项目，此邀请链接不能再次加入");
                }
                member.setStatus("active");
                member.setJoinedLinkId(link.getId());
                member.setJoinedAt(LocalDateTime.now());
                collaboratorMapper.updateById(member);
                link.setUsedCount(link.getUsedCount() + 1);
                linkMapper.updateById(link);
            }
        }
        return String.valueOf(link.getProjectId());
    }

    @Transactional(rollbackFor = Exception.class)
    public void revokeLink(Integer projectId, Integer linkId) {
        requireOwner(projectId);
        AiProjectCollaborationLink link = linkMapper.selectById(linkId);
        if (link == null || !projectId.equals(link.getProjectId())) throw new BusinessException("项目团队邀请链接不存在");
        link.setStatus("revoked");
        linkMapper.updateById(link);
    }

    @Transactional(rollbackFor = Exception.class)
    public void removeCollaborator(Integer projectId, Integer userId) {
        requireOwner(projectId);
        AiProjectCollaborator collaborator = collaboratorMapper.selectOne(new LambdaQueryWrapper<AiProjectCollaborator>()
            .eq(AiProjectCollaborator::getTenantId, tenantId())
            .eq(AiProjectCollaborator::getProjectId, projectId)
            .eq(AiProjectCollaborator::getUserId, userId).last("LIMIT 1"));
        if (collaborator == null) throw new BusinessException(ResultCode.NOT_FOUND, "项目团队成员不存在");
        collaborator.setStatus("removed");
        collaboratorMapper.updateById(collaborator);
    }

    private void validateLink(AiProjectCollaborationLink link) {
        if (link == null) throw new BusinessException(ResultCode.NOT_FOUND, "项目团队邀请链接不存在或已失效");
        if (link.getExpiresAt() != null && link.getExpiresAt().isBefore(LocalDateTime.now())) throw new BusinessException("项目团队邀请链接已过期");
        if (link.getMaxUses() != null && link.getUsedCount() >= link.getMaxUses()) throw new BusinessException("项目团队邀请链接使用次数已达上限");
    }

    private String newToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) if (value != null && !value.isBlank()) return value;
        return "用户";
    }

    public static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private Integer tenantId() { return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId(); }
    private LoginUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof LoginUser user)) throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        return user;
    }
}
