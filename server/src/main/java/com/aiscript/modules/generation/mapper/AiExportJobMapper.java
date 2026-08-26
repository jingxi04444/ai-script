package com.aiscript.modules.generation.mapper;

import com.aiscript.modules.generation.entity.AiExportJob;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface AiExportJobMapper extends BaseMapper<AiExportJob> {
    @Select("""
        SELECT * FROM ai_export_job
        WHERE status = 'success' AND storage_key IS NOT NULL AND expire_at <= CURRENT_TIMESTAMP
        ORDER BY expire_at ASC
        LIMIT #{limit}
        """)
    java.util.List<AiExportJob> selectExpired(@Param("limit") int limit);

    @Select("""
        SELECT * FROM ai_export_job
        WHERE id = #{id} AND tenant_id = #{tenantId} AND create_by = #{userId}
        LIMIT 1
        """)
    AiExportJob selectOwnedById(
        @Param("id") Integer id,
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId
    );

    @Update("""
        UPDATE ai_export_job
        SET status = 'running', progress = 5, error_message = NULL, update_time = CURRENT_TIMESTAMP
        WHERE id = #{id} AND status = 'pending'
        """)
    int markRunning(@Param("id") Integer id);

    @Update("""
        UPDATE ai_export_job
        SET progress = #{progress}, update_time = CURRENT_TIMESTAMP
        WHERE id = #{id} AND status = 'running'
        """)
    int updateProgress(@Param("id") Integer id, @Param("progress") int progress);

    @Update("""
        UPDATE ai_export_job
        SET status = 'success', progress = 100, storage_key = #{storageKey}, file_size = #{fileSize},
            error_message = NULL, finish_time = CURRENT_TIMESTAMP, expire_at = #{expireAt},
            update_time = CURRENT_TIMESTAMP
        WHERE id = #{id} AND status = 'running'
        """)
    int markSuccess(
        @Param("id") Integer id,
        @Param("storageKey") String storageKey,
        @Param("fileSize") long fileSize,
        @Param("expireAt") java.time.LocalDateTime expireAt
    );

    @Update("""
        UPDATE ai_export_job
        SET status = 'failed', error_message = #{errorMessage}, finish_time = CURRENT_TIMESTAMP,
            update_time = CURRENT_TIMESTAMP
        WHERE id = #{id} AND status IN ('pending', 'running')
        """)
    int markFailed(@Param("id") Integer id, @Param("errorMessage") String errorMessage);

    @Update("""
        UPDATE ai_export_job
        SET status = 'canceled', finish_time = CURRENT_TIMESTAMP, update_time = CURRENT_TIMESTAMP
        WHERE id = #{id} AND tenant_id = #{tenantId} AND create_by = #{userId} AND status = 'pending'
        """)
    int cancelPending(
        @Param("id") Integer id,
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId
    );

    @Update("""
        UPDATE ai_export_job
        SET task_id = #{taskId}, status = 'pending', progress = 0, storage_key = NULL, file_size = NULL,
            error_message = NULL, finish_time = NULL, expire_at = NULL, update_time = CURRENT_TIMESTAMP
        WHERE id = #{id} AND tenant_id = #{tenantId} AND create_by = #{userId}
          AND status IN ('failed', 'canceled')
        """)
    int resetForRetry(
        @Param("id") Integer id,
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId,
        @Param("taskId") Integer taskId
    );

    @Update("""
        UPDATE ai_export_job
        SET status = 'expired', storage_key = NULL, update_time = CURRENT_TIMESTAMP
        WHERE id = #{id} AND status = 'success'
        """)
    int markExpired(@Param("id") Integer id);
}
