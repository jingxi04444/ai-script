package com.aiscript.modules.generation.mapper;

import com.aiscript.modules.generation.entity.AiScriptGenerationQueueItem;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface AiScriptGenerationQueueItemMapper extends BaseMapper<AiScriptGenerationQueueItem> {
    @Select("""
        SELECT * FROM ai_script_generation_queue_item
        WHERE tenant_id = #{tenantId} AND create_by = #{userId} AND deleted = 0
        ORDER BY CASE status WHEN 'running' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
                 CASE WHEN status IN ('running', 'pending') THEN id END ASC,
                 COALESCE(finish_time, create_time) DESC
        LIMIT #{limit}
        """)
    List<AiScriptGenerationQueueItem> selectRecentOwned(
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId,
        @Param("limit") int limit
    );

    @Select("""
        SELECT batch_no FROM ai_script_generation_queue_item
        WHERE tenant_id = #{tenantId} AND create_by = #{userId} AND deleted = 0
          AND status IN ('pending', 'running')
        ORDER BY id DESC LIMIT 1
        """)
    String selectActiveBatchNo(@Param("tenantId") Integer tenantId, @Param("userId") Integer userId);

    @Select("""
        SELECT * FROM ai_script_generation_queue_item
        WHERE tenant_id = #{tenantId} AND create_by = #{userId} AND request_no = #{requestNo}
          AND deleted = 0 LIMIT 1
        """)
    AiScriptGenerationQueueItem selectByRequestNo(
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId,
        @Param("requestNo") String requestNo
    );

    @Select("""
        SELECT tenant_id, create_by
        FROM ai_script_generation_queue_item
        WHERE deleted = 0 AND status = 'pending'
        GROUP BY tenant_id, create_by
        ORDER BY MIN(id)
        LIMIT #{limit}
        """)
    List<AiScriptGenerationQueueItem> selectPendingOwners(@Param("limit") int limit);

    @Select("""
        SELECT COUNT(*) FROM ai_script_generation_queue_item
        WHERE tenant_id = #{tenantId} AND create_by = #{userId} AND deleted = 0 AND status = 'running'
        """)
    int countRunning(@Param("tenantId") Integer tenantId, @Param("userId") Integer userId);

    @Select("""
        SELECT COUNT(*) FROM ai_script_generation_queue_item
        WHERE tenant_id = #{tenantId} AND create_by = #{userId} AND deleted = 0 AND status = #{status}
        """)
    int countOwnedStatus(
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId,
        @Param("status") String status
    );

    @Select("""
        SELECT id FROM ai_script_generation_queue_item
        WHERE tenant_id = #{tenantId} AND create_by = #{userId} AND deleted = 0 AND status = 'pending'
        ORDER BY id ASC LIMIT #{limit}
        """)
    List<Long> selectPendingIds(
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId,
        @Param("limit") int limit
    );

    @Update("""
        UPDATE ai_script_generation_queue_item
        SET status = 'running', start_time = CURRENT_TIMESTAMP, update_time = CURRENT_TIMESTAMP
        WHERE id = #{id} AND deleted = 0 AND status = 'pending'
        """)
    int markRunning(@Param("id") Long id);

    @Update("""
        UPDATE ai_script_generation_queue_item
        SET status = 'pending', start_time = NULL, update_time = CURRENT_TIMESTAMP
        WHERE id = #{id} AND deleted = 0 AND status = 'running'
        """)
    int returnToPending(@Param("id") Long id);

    @Update("""
        UPDATE ai_script_generation_queue_item
        SET status = 'success', script_id = #{scriptId}, error_message = NULL,
            finish_time = CURRENT_TIMESTAMP, update_time = CURRENT_TIMESTAMP
        WHERE id = #{id} AND deleted = 0 AND status = 'running'
        """)
    int markSuccess(@Param("id") Long id, @Param("scriptId") Integer scriptId);

    @Update("""
        UPDATE ai_script_generation_queue_item
        SET status = 'failed', error_message = #{errorMessage},
            finish_time = CURRENT_TIMESTAMP, update_time = CURRENT_TIMESTAMP
        WHERE id = #{id} AND deleted = 0 AND status = 'running'
        """)
    int markFailed(@Param("id") Long id, @Param("errorMessage") String errorMessage);

    @Update("""
        UPDATE ai_script_generation_queue_item
        SET status = 'failed', error_message = '任务执行超时，请重新提交',
            finish_time = CURRENT_TIMESTAMP, update_time = CURRENT_TIMESTAMP
        WHERE deleted = 0 AND status = 'running' AND start_time < #{deadline}
        """)
    int markStaleRunningFailed(@Param("deadline") LocalDateTime deadline);

    @Select("""
        SELECT COUNT(*) FROM ai_script_generation_queue_item
        WHERE batch_no = #{batchNo} AND deleted = 0 AND status IN ('pending', 'running')
        """)
    int countBatchActive(@Param("batchNo") String batchNo);

    @Select("""
        SELECT COUNT(*) FROM ai_script_generation_queue_item
        WHERE batch_no = #{batchNo} AND deleted = 0 AND status = #{status}
        """)
    int countBatchStatus(@Param("batchNo") String batchNo, @Param("status") String status);
}
