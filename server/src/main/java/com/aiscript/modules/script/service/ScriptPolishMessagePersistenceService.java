package com.aiscript.modules.script.service;

import com.aiscript.modules.script.entity.AiScriptPolishMessage;
import com.aiscript.modules.script.mapper.AiScriptPolishMessageMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScriptPolishMessagePersistenceService {
    private final AiScriptPolishMessageMapper messageMapper;

    public ScriptPolishMessagePersistenceService(AiScriptPolishMessageMapper messageMapper) {
        this.messageMapper = messageMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Integer createUserMessage(
        Integer tenantId,
        Integer userId,
        Integer scriptId,
        String content,
        String contextSnapshot
    ) {
        AiScriptPolishMessage message = new AiScriptPolishMessage();
        message.setTenantId(tenantId);
        message.setScriptId(scriptId);
        message.setUserId(userId);
        message.setRole("user");
        message.setStatus("pending");
        message.setContent(content);
        message.setContextSnapshot(contextSnapshot);
        message.setCreateBy(userId);
        messageMapper.insert(message);
        return message.getId();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void complete(Integer messageId) {
        AiScriptPolishMessage update = new AiScriptPolishMessage();
        update.setId(messageId);
        update.setStatus("success");
        messageMapper.updateById(update);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void fail(Integer messageId, String errorMessage) {
        AiScriptPolishMessage update = new AiScriptPolishMessage();
        update.setId(messageId);
        update.setStatus("failed");
        update.setErrorMessage(errorMessage);
        messageMapper.updateById(update);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createAssistantMessage(
        Integer tenantId,
        Integer userId,
        Integer scriptId,
        Integer replyToId,
        String status,
        String content,
        String contextSnapshot,
        String errorMessage
    ) {
        AiScriptPolishMessage message = new AiScriptPolishMessage();
        message.setTenantId(tenantId);
        message.setScriptId(scriptId);
        message.setUserId(userId);
        message.setReplyToId(replyToId);
        message.setRole("assistant");
        message.setStatus(status);
        message.setContent(content);
        message.setContextSnapshot(contextSnapshot);
        message.setErrorMessage(errorMessage);
        message.setCreateBy(userId);
        messageMapper.insert(message);
    }
}
