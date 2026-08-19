package com.aiscript.modules.script.service;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.project.dto.ShareLinkCreateDTO;
import com.aiscript.modules.project.service.ProjectCollaborationService;
import com.aiscript.modules.project.vo.ShareLinkVO;
import com.aiscript.modules.auth.entity.SysUser;
import com.aiscript.modules.auth.mapper.SysUserMapper;
import com.aiscript.modules.script.convert.ScriptConvert;
import com.aiscript.modules.script.dto.ReviewCommentDTO;
import com.aiscript.modules.script.dto.ReviewDecisionDTO;
import com.aiscript.modules.script.entity.AiScriptReviewAccess;
import com.aiscript.modules.script.entity.AiScriptReviewComment;
import com.aiscript.modules.script.entity.AiScriptReviewLink;
import com.aiscript.modules.script.entity.AiScriptReviewRecord;
import com.aiscript.modules.script.mapper.AiScriptReviewAccessMapper;
import com.aiscript.modules.script.mapper.AiScriptReviewCommentMapper;
import com.aiscript.modules.script.mapper.AiScriptReviewLinkMapper;
import com.aiscript.modules.script.mapper.AiScriptReviewRecordMapper;
import com.aiscript.modules.script.vo.ScriptAccessVO;
import com.aiscript.modules.script.vo.ScriptReviewCommentVO;
import com.aiscript.modules.script.vo.ScriptReviewContextVO;
import com.aiscript.modules.script.vo.ScriptVersionVO;
import com.aiscript.modules.storyboard.entity.AiScriptVersion;
import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import com.aiscript.modules.storyboard.mapper.AiScriptVersionMapper;
import com.aiscript.modules.storyboard.mapper.AiStoryboardScriptMapper;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.security.SecureRandom;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ScriptReviewService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private final AiStoryboardScriptMapper scriptMapper;
    private final AiScriptVersionMapper versionMapper;
    private final AiScriptReviewLinkMapper linkMapper;
    private final AiScriptReviewAccessMapper accessMapper;
    private final AiScriptReviewCommentMapper commentMapper;
    private final AiScriptReviewRecordMapper recordMapper;
    private final SysUserMapper userMapper;
    private final ProjectCollaborationService collaborationService;
    private final SecureRandom secureRandom = new SecureRandom();

    public ScriptReviewService(AiStoryboardScriptMapper scriptMapper, AiScriptVersionMapper versionMapper,
                               AiScriptReviewLinkMapper linkMapper, AiScriptReviewAccessMapper accessMapper,
                               AiScriptReviewCommentMapper commentMapper, AiScriptReviewRecordMapper recordMapper,
                               ProjectCollaborationService collaborationService, SysUserMapper userMapper) {
        this.scriptMapper = scriptMapper;
        this.versionMapper = versionMapper;
        this.linkMapper = linkMapper;
        this.accessMapper = accessMapper;
        this.commentMapper = commentMapper;
        this.recordMapper = recordMapper;
        this.collaborationService = collaborationService;
        this.userMapper = userMapper;
    }

    public ScriptAccessVO internalAccess(Integer scriptId) {
        AiStoryboardScript script = internalScript(scriptId);
        return new ScriptAccessVO(true, true, true, true, true, true, true, "internal");
    }

    public void internalAccessForProject(Integer projectId) {
        collaborationService.requireAccess(projectId);
    }

    public AiStoryboardScript internalScript(Integer scriptId) {
        AiStoryboardScript script = scriptMapper.selectOne(new LambdaQueryWrapper<AiStoryboardScript>()
            .eq(AiStoryboardScript::getId, scriptId).eq(AiStoryboardScript::getTenantId, tenantId()).last("LIMIT 1"));
        if (script == null) throw new BusinessException(ResultCode.NOT_FOUND, "脚本不存在");
        collaborationService.requireAccess(script.getProjectId());
        return script;
    }

    @Transactional(rollbackFor = Exception.class)
    public ShareLinkVO createLink(Integer scriptId, ShareLinkCreateDTO dto) {
        AiStoryboardScript script = internalScript(scriptId);
        String token = newToken();
        AiScriptReviewLink link = new AiScriptReviewLink();
        link.setTenantId(script.getTenantId());
        link.setScriptId(scriptId);
        link.setTokenHash(ProjectCollaborationService.hash(token));
        link.setVersionScope(dto == null || dto.getVersionScope() == null ? "all" : dto.getVersionScope());
        if ("current".equals(link.getVersionScope())) link.setFixedVersionId(script.getCurrentVersionId());
        link.setStatus("active");
        link.setUsedCount(0);
        link.setMaxUses(dto == null ? null : dto.getMaxUses());
        int hours = dto == null || dto.getExpiresInHours() == null ? 168 : Math.max(1, dto.getExpiresInHours());
        link.setExpiresAt(LocalDateTime.now().plusHours(hours));
        linkMapper.insert(link);
        return new ShareLinkVO(String.valueOf(link.getId()), token, "/script-review/" + token, link.getExpiresAt().toString());
    }

    @Transactional(rollbackFor = Exception.class)
    public void revokeLink(Integer scriptId, Integer linkId) {
        internalScript(scriptId);
        AiScriptReviewLink link = linkMapper.selectOne(new LambdaQueryWrapper<AiScriptReviewLink>()
            .eq(AiScriptReviewLink::getId, linkId)
            .eq(AiScriptReviewLink::getScriptId, scriptId)
            .eq(AiScriptReviewLink::getTenantId, tenantId()).last("LIMIT 1"));
        if (link == null) throw new BusinessException(ResultCode.NOT_FOUND, "评审链接不存在");
        link.setStatus("revoked");
        linkMapper.updateById(link);
        List<AiScriptReviewAccess> accesses = accessMapper.selectList(new LambdaQueryWrapper<AiScriptReviewAccess>()
            .eq(AiScriptReviewAccess::getReviewLinkId, linkId));
        accesses.forEach(access -> { access.setStatus("revoked"); accessMapper.updateById(access); });
    }

    @Transactional(rollbackFor = Exception.class)
    public ScriptReviewContextVO context(String token) {
        AiScriptReviewLink link = validLink(token);
        bindAccess(link);
        AiStoryboardScript script = scriptMapper.selectById(link.getScriptId());
        ScriptReviewContextVO vo = new ScriptReviewContextVO();
        vo.setScript(ScriptConvert.toScriptVO(script));
        vo.setAccess(new ScriptAccessVO(true, true, false, false, false, true, true, "review"));
        vo.setVersions(versions(link, script));
        // A review is a script-level audit trail, not a one-time share-link inbox.
        // Returning all comments lets a second review see the comments left on V1,
        // even when V2 is opened from a newly generated review link.
        vo.setComments(comments(link.getScriptId(), null, link.getTenantId()));
        return vo;
    }

    public List<ScriptReviewCommentVO> internalComments(Integer scriptId) {
        internalScript(scriptId);
        return comments(scriptId, null, tenantId());
    }

    @Transactional(rollbackFor = Exception.class)
    public ScriptReviewCommentVO addInternalComment(Integer scriptId, ReviewCommentDTO dto) {
        AiStoryboardScript script = internalScript(scriptId);
        return saveComment(script, null, dto);
    }

    @Transactional(rollbackFor = Exception.class)
    public ScriptReviewCommentVO addComment(String token, ReviewCommentDTO dto) {
        AiScriptReviewLink link = validLink(token);
        requireBound(link);
        return saveComment(scriptMapper.selectById(link.getScriptId()), link, dto);
    }

    @Transactional(rollbackFor = Exception.class)
    public ScriptReviewCommentVO updateComment(Integer commentId, ReviewCommentDTO dto) {
        AiScriptReviewComment comment = ownComment(commentId);
        comment.setContent(dto.getContent().trim());
        commentMapper.updateById(comment);
        return toCommentVO(comment);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteComment(Integer commentId) {
        AiScriptReviewComment comment = deletableComment(commentId);
        commentMapper.deleteById(comment.getId());
    }

    @Transactional(rollbackFor = Exception.class)
    public void submitDecision(String token, ReviewDecisionDTO dto) {
        AiScriptReviewLink link = validLink(token);
        requireBound(link);
        Integer versionId = parseId(dto.getVersionId());
        requireAllowedVersion(link, versionId);
        AiScriptReviewRecord record = new AiScriptReviewRecord();
        record.setTenantId(link.getTenantId());
        record.setScriptId(link.getScriptId());
        record.setReviewLinkId(link.getId());
        record.setVersionId(versionId);
        record.setUserId(currentUser().getUserId());
        record.setDecision(dto.getDecision());
        record.setOpinion(dto.getOpinion());
        recordMapper.insert(record);
        AiStoryboardScript script = scriptMapper.selectById(link.getScriptId());
        if (StringUtils.hasText(dto.getOpinion())) {
            ReviewCommentDTO opinion = new ReviewCommentDTO();
            opinion.setVersionId(dto.getVersionId());
            opinion.setContent(dto.getOpinion().trim());
            saveComment(script, link, opinion);
        }
        script.setStatus("approved".equals(dto.getDecision()) ? "approved" : "changes_requested");
        scriptMapper.updateById(script);
    }

    private ScriptReviewCommentVO saveComment(AiStoryboardScript script, AiScriptReviewLink link, ReviewCommentDTO dto) {
        Integer versionId = parseId(dto.getVersionId());
        Integer parentId = parseId(dto.getParentId());
        AiScriptReviewComment parent = null;
        if (parentId != null) {
            parent = commentMapper.selectOne(new LambdaQueryWrapper<AiScriptReviewComment>()
                .eq(AiScriptReviewComment::getId, parentId)
                .eq(AiScriptReviewComment::getScriptId, script.getId())
                .last("LIMIT 1"));
            if (parent == null || link != null && !link.getId().equals(parent.getReviewLinkId())) {
                throw new BusinessException(ResultCode.FORBIDDEN, "不能回复其他评审会话的批注");
            }
            versionId = parent.getVersionId();
        }
        if (link != null) requireAllowedVersion(link, versionId);
        AiScriptReviewComment comment = new AiScriptReviewComment();
        comment.setTenantId(script.getTenantId());
        comment.setScriptId(script.getId());
        comment.setReviewLinkId(link == null ? null : link.getId());
        comment.setVersionId(versionId);
        comment.setUserId(currentUser().getUserId());
        comment.setParentId(parentId);
        comment.setRowIndex(parent == null ? dto.getRowIndex() : parent.getRowIndex());
        comment.setColumnKey(parent == null ? dto.getColumnKey() : parent.getColumnKey());
        comment.setContent(dto.getContent().trim());
        comment.setCommentStatus("open");
        commentMapper.insert(comment);
        return toCommentVO(comment);
    }

    private List<ScriptReviewCommentVO> comments(Integer scriptId, Integer linkId, Integer commentTenantId) {
        LambdaQueryWrapper<AiScriptReviewComment> query = new LambdaQueryWrapper<AiScriptReviewComment>()
            .eq(AiScriptReviewComment::getTenantId, commentTenantId)
            .eq(AiScriptReviewComment::getScriptId, scriptId)
            .orderByAsc(AiScriptReviewComment::getCreateTime);
        if (linkId != null) query.eq(AiScriptReviewComment::getReviewLinkId, linkId);
        List<AiScriptReviewComment> items = commentMapper.selectList(query);
        Map<Integer, AiScriptReviewComment> commentsById = items.stream().collect(
            java.util.stream.Collectors.toMap(AiScriptReviewComment::getId, item -> item)
        );
        AiStoryboardScript script = scriptMapper.selectById(scriptId);
        boolean scriptCreator = script != null && script.getCreateBy() != null
            && script.getCreateBy().equals(currentUser().getUserId());
        return items.stream().map(item -> toCommentVO(item, commentsById.get(item.getParentId()), scriptCreator)).toList();
    }

    private ScriptReviewCommentVO toCommentVO(AiScriptReviewComment item) {
        AiScriptReviewComment parent = item.getParentId() == null ? null : commentMapper.selectById(item.getParentId());
        return toCommentVO(item, parent);
    }

    private ScriptReviewCommentVO toCommentVO(AiScriptReviewComment item, AiScriptReviewComment parent) {
        AiStoryboardScript script = scriptMapper.selectById(item.getScriptId());
        boolean scriptCreator = script != null && script.getCreateBy() != null
            && script.getCreateBy().equals(currentUser().getUserId());
        return toCommentVO(item, parent, scriptCreator);
    }

    private ScriptReviewCommentVO toCommentVO(AiScriptReviewComment item, AiScriptReviewComment parent, boolean scriptCreator) {
        Integer versionId = item.getVersionId() == null && parent != null ? parent.getVersionId() : item.getVersionId();
        Integer rowIndex = item.getRowIndex() == null && parent != null ? parent.getRowIndex() : item.getRowIndex();
        String columnKey = item.getColumnKey() == null && parent != null ? parent.getColumnKey() : item.getColumnKey();
        ScriptReviewCommentVO vo = new ScriptReviewCommentVO();
        vo.setId(String.valueOf(item.getId()));
        vo.setParentId(item.getParentId() == null ? null : String.valueOf(item.getParentId()));
        vo.setVersionId(versionId == null ? null : String.valueOf(versionId));
        vo.setUserId(String.valueOf(item.getUserId()));
        SysUser author = userMapper.selectById(item.getUserId());
        String username = author == null || !StringUtils.hasText(author.getUsername())
            ? "未知用户"
            : author.getUsername().trim();
        vo.setUsername(username);
        vo.setUserAvatar(author == null ? null : author.getAvatarUrl());
        vo.setRowIndex(rowIndex);
        vo.setColumnKey(columnKey);
        vo.setContent(item.getContent());
        vo.setStatus(item.getCommentStatus());
        boolean mine = item.getUserId().equals(currentUser().getUserId());
        vo.setMine(mine);
        vo.setDeletable(mine || scriptCreator);
        vo.setCreatedAt(item.getCreateTime() == null ? null : item.getCreateTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        return vo;
    }

    private List<ScriptVersionVO> versions(AiScriptReviewLink link, AiStoryboardScript script) {
        LambdaQueryWrapper<AiScriptVersion> query = new LambdaQueryWrapper<AiScriptVersion>()
            .eq(AiScriptVersion::getTenantId, link.getTenantId()).eq(AiScriptVersion::getScriptId, script.getId())
            .orderByAsc(AiScriptVersion::getVersionNo);
        if (link.getFixedVersionId() != null) query.eq(AiScriptVersion::getId, link.getFixedVersionId());
        return versionMapper.selectList(query).stream().map(item -> {
            Map<String, Object> snapshot = JsonUtils.toMap(item.getContentSnapshot());
            ScriptVersionVO vo = new ScriptVersionVO();
            vo.setId(String.valueOf(item.getId()));
            vo.setVersionNo(item.getVersionNo());
            vo.setTitle(item.getVersionTitle());
            vo.setContent(String.valueOf(snapshot.getOrDefault("content", "")));
            vo.setChangeNote(item.getChangeNote());
            vo.setSource(String.valueOf(snapshot.getOrDefault("source", "legacy")));
            vo.setInstruction((String) snapshot.get("instruction"));
            vo.setSummary((String) snapshot.get("summary"));
            Object restoredFromVersionId = snapshot.get("restoredFromVersionId");
            vo.setRestoredFromVersionId(restoredFromVersionId == null ? null : String.valueOf(restoredFromVersionId));
            vo.setCurrent(item.getId().equals(script.getCurrentVersionId()));
            vo.setCreatedAt(item.getCreateTime() == null ? null : item.getCreateTime().toString());
            return vo;
        }).toList();
    }

    private AiScriptReviewLink validLink(String token) {
        AiScriptReviewLink link = linkMapper.selectOne(new LambdaQueryWrapper<AiScriptReviewLink>()
            .eq(AiScriptReviewLink::getTokenHash, ProjectCollaborationService.hash(token))
            .eq(AiScriptReviewLink::getStatus, "active").last("LIMIT 1"));
        if (link == null) throw new BusinessException(ResultCode.NOT_FOUND, "评审链接不存在或已失效");
        if (link.getExpiresAt() != null && link.getExpiresAt().isBefore(LocalDateTime.now())) throw new BusinessException("评审链接已过期");
        if (link.getMaxUses() != null && link.getUsedCount() >= link.getMaxUses()
            && accessMapper.selectCount(new LambdaQueryWrapper<AiScriptReviewAccess>()
                .eq(AiScriptReviewAccess::getReviewLinkId, link.getId()).eq(AiScriptReviewAccess::getUserId, currentUser().getUserId())) == 0) {
            throw new BusinessException("评审链接使用次数已达上限");
        }
        return link;
    }

    private void bindAccess(AiScriptReviewLink link) {
        AiScriptReviewAccess access = accessMapper.selectOne(new LambdaQueryWrapper<AiScriptReviewAccess>()
            .eq(AiScriptReviewAccess::getReviewLinkId, link.getId())
            .eq(AiScriptReviewAccess::getUserId, currentUser().getUserId()).last("LIMIT 1"));
        if (access == null) {
            access = new AiScriptReviewAccess();
            access.setTenantId(link.getTenantId());
            access.setReviewLinkId(link.getId());
            access.setScriptId(link.getScriptId());
            access.setUserId(currentUser().getUserId());
            access.setStatus("active");
            access.setLastAccessTime(LocalDateTime.now());
            accessMapper.insert(access);
            link.setUsedCount(link.getUsedCount() + 1);
            linkMapper.updateById(link);
        } else {
            if (!"active".equals(access.getStatus())) throw new BusinessException(ResultCode.FORBIDDEN, "评审权限已被取消");
            access.setLastAccessTime(LocalDateTime.now());
            accessMapper.updateById(access);
        }
    }

    private void requireBound(AiScriptReviewLink link) {
        if (accessMapper.selectCount(new LambdaQueryWrapper<AiScriptReviewAccess>()
            .eq(AiScriptReviewAccess::getReviewLinkId, link.getId())
            .eq(AiScriptReviewAccess::getUserId, currentUser().getUserId())
            .eq(AiScriptReviewAccess::getStatus, "active")) == 0) bindAccess(link);
    }

    private AiScriptReviewComment ownComment(Integer id) {
        AiScriptReviewComment comment = commentMapper.selectOne(new LambdaQueryWrapper<AiScriptReviewComment>()
            .eq(AiScriptReviewComment::getId, id).last("LIMIT 1"));
        if (comment == null) throw new BusinessException(ResultCode.NOT_FOUND, "批注不存在");
        if (!comment.getUserId().equals(currentUser().getUserId())) throw new BusinessException(ResultCode.FORBIDDEN, "只能修改或删除自己的批注");
        if (comment.getReviewLinkId() != null) {
            AiScriptReviewLink link = linkMapper.selectById(comment.getReviewLinkId());
            if (link == null || !"active".equals(link.getStatus())
                || link.getExpiresAt() != null && link.getExpiresAt().isBefore(LocalDateTime.now())
                || accessMapper.selectCount(new LambdaQueryWrapper<AiScriptReviewAccess>()
                    .eq(AiScriptReviewAccess::getReviewLinkId, link.getId())
                    .eq(AiScriptReviewAccess::getUserId, currentUser().getUserId())
                    .eq(AiScriptReviewAccess::getStatus, "active")) == 0) {
                throw new BusinessException(ResultCode.FORBIDDEN, "评审权限已失效");
            }
        } else {
            internalScript(comment.getScriptId());
        }
        return comment;
    }

    private AiScriptReviewComment deletableComment(Integer id) {
        AiScriptReviewComment comment = commentMapper.selectOne(new LambdaQueryWrapper<AiScriptReviewComment>()
            .eq(AiScriptReviewComment::getId, id).last("LIMIT 1"));
        if (comment == null) throw new BusinessException(ResultCode.NOT_FOUND, "批注不存在");
        if (comment.getUserId().equals(currentUser().getUserId())) return ownComment(id);

        AiStoryboardScript script = scriptMapper.selectById(comment.getScriptId());
        if (script == null || script.getCreateBy() == null || !script.getCreateBy().equals(currentUser().getUserId())) {
            throw new BusinessException(ResultCode.FORBIDDEN, "只能删除自己的批注，脚本创建者可删除该脚本下的全部批注");
        }
        internalScript(script.getId());
        return comment;
    }

    private void requireAllowedVersion(AiScriptReviewLink link, Integer versionId) {
        if (versionId == null) return;
        if (link.getFixedVersionId() != null && !link.getFixedVersionId().equals(versionId)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "该评审链接无权访问此版本");
        }
        if (versionMapper.selectCount(new LambdaQueryWrapper<AiScriptVersion>()
            .eq(AiScriptVersion::getId, versionId)
            .eq(AiScriptVersion::getScriptId, link.getScriptId())
            .eq(AiScriptVersion::getTenantId, link.getTenantId())) == 0) {
            throw new BusinessException(ResultCode.FORBIDDEN, "脚本版本不存在或不属于当前脚本");
        }
    }

    private String newToken() { byte[] bytes = new byte[32]; secureRandom.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    private Integer parseId(String value) { try { return value == null || value.isBlank() ? null : Integer.valueOf(value); } catch (NumberFormatException ex) { throw new BusinessException("ID 参数错误"); } }
    private Integer tenantId() { return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId(); }
    private LoginUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof LoginUser user)) throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        return user;
    }
}
