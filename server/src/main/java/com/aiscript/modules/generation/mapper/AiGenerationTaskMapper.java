package com.aiscript.modules.generation.mapper;

import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface AiGenerationTaskMapper extends BaseMapper<AiGenerationTask> {
    @Select("""
        SELECT *
        FROM ai_generation_task
        WHERE tenant_id = #{tenantId}
          AND idempotency_key = #{idempotencyKey}
          AND deleted = 0
        LIMIT 1
        """)
    AiGenerationTask selectByIdempotencyKey(
        @Param("tenantId") Integer tenantId,
        @Param("idempotencyKey") String idempotencyKey
    );

    @Select("""
        SELECT *
        FROM ai_generation_task
        WHERE tenant_id = #{tenantId}
          AND idempotency_key = #{idempotencyKey}
          AND deleted = 0
        LIMIT 1
        FOR UPDATE
        """)
    AiGenerationTask selectByIdempotencyKeyForUpdate(
        @Param("tenantId") Integer tenantId,
        @Param("idempotencyKey") String idempotencyKey
    );

    @Select("""
        SELECT *
        FROM ai_generation_task
        WHERE id = #{id}
          AND tenant_id = #{tenantId}
          AND create_by = #{userId}
          AND deleted = 0
        LIMIT 1
        FOR UPDATE
        """)
    AiGenerationTask selectOwnedTaskForUpdate(
        @Param("id") Integer id,
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId
    );

    @Select("""
        SELECT *
        FROM ai_generation_task
        WHERE id = #{id}
          AND tenant_id = #{tenantId}
          AND create_by = #{userId}
          AND deleted = 0
        LIMIT 1
        """)
    AiGenerationTask selectOwnedTask(
        @Param("id") Integer id,
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId
    );

    @Update("""
        UPDATE ai_generation_task
        SET status = 'running',
            progress = 1,
            start_time = CURRENT_TIMESTAMP,
            update_time = CURRENT_TIMESTAMP
        WHERE id = #{id}
          AND tenant_id = #{tenantId}
          AND create_by = #{userId}
          AND deleted = 0
          AND status = 'pending'
        """)
    int markRunning(
        @Param("id") Integer id,
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId
    );

    @Update("""
        UPDATE ai_generation_task
        SET status = 'success',
            progress = 100,
            result_payload = #{resultPayload},
            error_code = NULL,
            error_message = NULL,
            finish_time = CURRENT_TIMESTAMP,
            update_time = CURRENT_TIMESTAMP
        WHERE id = #{id}
          AND tenant_id = #{tenantId}
          AND create_by = #{userId}
          AND deleted = 0
          AND status IN ('pending', 'running')
        """)
    int markSuccess(
        @Param("id") Integer id,
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId,
        @Param("resultPayload") String resultPayload
    );

    @Update("""
        UPDATE ai_generation_task
        SET status = 'failed',
            error_code = #{errorCode},
            error_message = #{errorMessage},
            finish_time = CURRENT_TIMESTAMP,
            update_time = CURRENT_TIMESTAMP
        WHERE id = #{id}
          AND tenant_id = #{tenantId}
          AND create_by = #{userId}
          AND deleted = 0
          AND status IN ('pending', 'running')
        """)
    int markFailed(
        @Param("id") Integer id,
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId,
        @Param("errorCode") String errorCode,
        @Param("errorMessage") String errorMessage
    );
}
