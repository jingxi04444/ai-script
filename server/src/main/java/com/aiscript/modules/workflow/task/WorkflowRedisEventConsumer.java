package com.aiscript.modules.workflow.task;

import com.aiscript.modules.workflow.event.WorkflowRunEventBroker;
import com.aiscript.modules.workflow.vo.WorkflowRunEventVO;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class WorkflowRedisEventConsumer {
    private static final Logger log = LoggerFactory.getLogger(WorkflowRedisEventConsumer.class);
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final WorkflowRunEventBroker broker;
    private final String eventsStream;
    private final String consumerGroup;
    private final String consumerName;
    private volatile boolean groupReady;

    public WorkflowRedisEventConsumer(
        StringRedisTemplate redisTemplate,
        ObjectMapper objectMapper,
        WorkflowRunEventBroker broker,
        @Value("${aiscript.workflow.redis.events-stream}") String eventsStream,
        @Value("${aiscript.workflow.redis.event-consumer-group}") String consumerGroup,
        @Value("${aiscript.workflow.redis.event-consumer-name}") String consumerName
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.broker = broker;
        this.eventsStream = eventsStream;
        this.consumerGroup = consumerGroup;
        this.consumerName = consumerName + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    @Scheduled(fixedDelayString = "${aiscript.workflow.events.consume-delay-ms:300}")
    public void consume() {
        if (!ensureGroup()) return;
        try {
            List<MapRecord<String, Object, Object>> records = redisTemplate.opsForStream().read(
                Consumer.from(consumerGroup, consumerName),
                StreamReadOptions.empty().count(50),
                StreamOffset.create(eventsStream, ReadOffset.lastConsumed())
            );
            if (records == null) return;
            for (MapRecord<String, Object, Object> record : records) consumeRecord(record);
        } catch (RuntimeException exception) {
            groupReady = false;
            log.debug("Workflow event stream is temporarily unavailable: {}", exception.getMessage());
        }
    }

    private boolean ensureGroup() {
        if (groupReady) return true;
        String bootstrapId = null;
        try {
            bootstrapId = String.valueOf(redisTemplate.opsForStream().add(StreamRecords
                .mapBacked(Map.of("payload", "{\"type\":\"STREAM_READY\"}"))
                .withStreamKey(eventsStream)));
            redisTemplate.opsForStream().createGroup(eventsStream, ReadOffset.latest(), consumerGroup);
            groupReady = true;
            if (bootstrapId != null) redisTemplate.opsForStream().delete(eventsStream, bootstrapId);
            return true;
        } catch (RuntimeException exception) {
            if (exception.getMessage() != null && exception.getMessage().contains("BUSYGROUP")) {
                groupReady = true;
                if (bootstrapId != null) redisTemplate.opsForStream().delete(eventsStream, bootstrapId);
                return true;
            }
            log.debug("Unable to initialize workflow event consumer group: {}", exception.getMessage());
            return false;
        }
    }

    private void consumeRecord(MapRecord<String, Object, Object> record) {
        try {
            Object rawPayload = record.getValue().get("payload");
            if (rawPayload != null) {
                WorkflowRunEventVO event = objectMapper.readValue(String.valueOf(rawPayload), WorkflowRunEventVO.class);
                if (!"STREAM_READY".equals(event.getType())) broker.publish(event);
            }
            redisTemplate.opsForStream().acknowledge(eventsStream, consumerGroup, record.getId());
        } catch (Exception exception) {
            log.warn("Invalid workflow event ignored, recordId={}", record.getId(), exception);
            redisTemplate.opsForStream().acknowledge(eventsStream, consumerGroup, record.getId());
        }
    }
}
