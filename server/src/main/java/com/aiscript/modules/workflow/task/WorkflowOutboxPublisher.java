package com.aiscript.modules.workflow.task;

import com.aiscript.modules.workflow.entity.AiWorkflowOutbox;
import com.aiscript.modules.workflow.mapper.AiWorkflowOutboxMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class WorkflowOutboxPublisher {
    private static final Logger log = LoggerFactory.getLogger(WorkflowOutboxPublisher.class);
    private final AiWorkflowOutboxMapper outboxMapper;
    private final StringRedisTemplate redisTemplate;
    private final String commandsStream;

    public WorkflowOutboxPublisher(
        AiWorkflowOutboxMapper outboxMapper,
        StringRedisTemplate redisTemplate,
        @Value("${aiscript.workflow.redis.commands-stream}") String commandsStream
    ) {
        this.outboxMapper = outboxMapper;
        this.redisTemplate = redisTemplate;
        this.commandsStream = commandsStream;
    }

    @Scheduled(fixedDelayString = "${aiscript.workflow.outbox.publish-delay-ms:500}")
    public void publishPending() {
        recoverAbandonedClaims();
        LocalDateTime now = LocalDateTime.now();
        List<AiWorkflowOutbox> records = outboxMapper.selectList(Wrappers.<AiWorkflowOutbox>lambdaQuery()
            .eq(AiWorkflowOutbox::getStatus, "pending")
            .and(wrapper -> wrapper.isNull(AiWorkflowOutbox::getNextAttemptTime)
                .or().le(AiWorkflowOutbox::getNextAttemptTime, now))
            .orderByAsc(AiWorkflowOutbox::getCreateTime)
            .last("LIMIT 50"));
        records.forEach(this::publishOne);
    }

    private void publishOne(AiWorkflowOutbox record) {
        int claimed = outboxMapper.update(null, Wrappers.<AiWorkflowOutbox>lambdaUpdate()
            .eq(AiWorkflowOutbox::getId, record.getId())
            .eq(AiWorkflowOutbox::getStatus, "pending")
            .set(AiWorkflowOutbox::getStatus, "publishing"));
        if (claimed != 1) return;
        try {
            redisTemplate.opsForStream().add(StreamRecords
                .mapBacked(Map.of("payload", record.getPayloadJson()))
                .withStreamKey(commandsStream));
            record.setStatus("sent");
            record.setAttempts(record.getAttempts() + 1);
            record.setSentTime(LocalDateTime.now());
            record.setNextAttemptTime(null);
            record.setErrorMessage(null);
            outboxMapper.updateById(record);
        } catch (RuntimeException exception) {
            int attempts = record.getAttempts() + 1;
            record.setStatus("pending");
            record.setAttempts(attempts);
            record.setNextAttemptTime(LocalDateTime.now().plusSeconds(Math.min(60, 1L << Math.min(attempts, 6))));
            record.setErrorMessage(trimError(exception.getMessage()));
            outboxMapper.updateById(record);
            log.warn("Workflow outbox publish failed, id={}, attempt={}", record.getId(), attempts);
        }
    }

    private void recoverAbandonedClaims() {
        outboxMapper.update(null, Wrappers.<AiWorkflowOutbox>lambdaUpdate()
            .eq(AiWorkflowOutbox::getStatus, "publishing")
            .lt(AiWorkflowOutbox::getUpdateTime, LocalDateTime.now().minusMinutes(2))
            .set(AiWorkflowOutbox::getStatus, "pending"));
    }

    private String trimError(String message) {
        if (message == null) return "Redis publish failed";
        return message.length() <= 500 ? message : message.substring(0, 500);
    }
}
