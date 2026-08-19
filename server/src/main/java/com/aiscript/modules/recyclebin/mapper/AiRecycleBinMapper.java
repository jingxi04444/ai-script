package com.aiscript.modules.recyclebin.mapper;

import com.aiscript.modules.recyclebin.entity.AiRecycleBin;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.util.List;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface AiRecycleBinMapper extends BaseMapper<AiRecycleBin> {
    @Update("UPDATE ai_project SET deleted = 0, update_time = NOW() WHERE id = #{resourceId} AND tenant_id = #{tenantId} AND deleted = 1")
    int restoreProject(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Update("UPDATE ai_brief SET deleted = 0, update_time = NOW() WHERE id = #{resourceId} AND tenant_id = #{tenantId} AND deleted = 1")
    int restoreBrief(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Update("UPDATE ai_storyboard_script SET deleted = 0, update_time = NOW() WHERE id = #{resourceId} AND tenant_id = #{tenantId} AND deleted = 1")
    int restoreScript(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_project_brief_ref WHERE tenant_id = #{tenantId} AND project_id = #{resourceId}")
    int purgeProjectBriefRefs(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_project_collaboration_link WHERE tenant_id = #{tenantId} AND project_id = #{resourceId}")
    int purgeProjectLinks(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_project_collaborator WHERE tenant_id = #{tenantId} AND project_id = #{resourceId}")
    int purgeProjectCollaborators(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_project_step WHERE tenant_id = #{tenantId} AND project_id = #{resourceId}")
    int purgeProjectSteps(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_project WHERE tenant_id = #{tenantId} AND id = #{resourceId} AND deleted = 1")
    int purgeProject(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_project_brief_ref WHERE tenant_id = #{tenantId} AND brief_id = #{resourceId}")
    int purgeBriefProjectRefs(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_brief_ai_result WHERE tenant_id = #{tenantId} AND brief_id = #{resourceId}")
    int purgeBriefAiResults(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_brief_collaborator WHERE tenant_id = #{tenantId} AND brief_id = #{resourceId}")
    int purgeBriefCollaborators(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_brief_edit_request WHERE tenant_id = #{tenantId} AND brief_id = #{resourceId}")
    int purgeBriefEditRequests(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_brief_share_link WHERE tenant_id = #{tenantId} AND brief_id = #{resourceId}")
    int purgeBriefShareLinks(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_brief_share_pack_item WHERE tenant_id = #{tenantId} AND brief_id = #{resourceId}")
    int purgeBriefSharePackItems(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_selling_point WHERE brief_id = #{resourceId}")
    int purgeBriefSellingPoints(@Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_brief WHERE tenant_id = #{tenantId} AND id = #{resourceId} AND deleted = 1")
    int purgeBrief(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_script_polish_message WHERE tenant_id = #{tenantId} AND script_id = #{resourceId}")
    int purgeScriptPolishMessages(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_script_review_access WHERE tenant_id = #{tenantId} AND script_id = #{resourceId}")
    int purgeScriptReviewAccess(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_script_review_link WHERE tenant_id = #{tenantId} AND script_id = #{resourceId}")
    int purgeScriptReviewLinks(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Delete("DELETE FROM ai_storyboard_script WHERE tenant_id = #{tenantId} AND id = #{resourceId} AND deleted = 1")
    int purgeScript(@Param("tenantId") Integer tenantId, @Param("resourceId") Integer resourceId);

    @Select("SELECT id FROM ai_recycle_bin WHERE recycle_status = 'active' AND deleted = 0 AND expire_at <= NOW() ORDER BY expire_at ASC LIMIT #{limit}")
    List<Integer> selectExpiredIds(@Param("limit") int limit);
}
