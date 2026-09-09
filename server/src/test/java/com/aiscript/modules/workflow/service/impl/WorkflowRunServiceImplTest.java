package com.aiscript.modules.workflow.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiscript.modules.workflow.dto.WorkflowRunCreateDTO;
import com.aiscript.modules.workflow.entity.AiWorkflowOutbox;
import com.aiscript.modules.workflow.entity.AiWorkflowRun;
import com.aiscript.modules.workflow.mapper.AiWorkflowNodeRunMapper;
import com.aiscript.modules.workflow.mapper.AiWorkflowOutboxMapper;
import com.aiscript.modules.workflow.mapper.AiWorkflowRunMapper;
import com.aiscript.modules.workflow.service.WorkflowService;
import com.aiscript.modules.workflow.vo.WorkflowValidationVO;
import com.aiscript.security.LoginUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class WorkflowRunServiceImplTest {
    @Mock
    private AiWorkflowRunMapper runMapper;
    @Mock
    private AiWorkflowNodeRunMapper nodeRunMapper;
    @Mock
    private AiWorkflowOutboxMapper outboxMapper;
    @Mock
    private WorkflowService workflowService;

    private WorkflowRunServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new WorkflowRunServiceImpl(
            runMapper, nodeRunMapper, outboxMapper, workflowService, new ObjectMapper()
        );
        LoginUser user = LoginUser.builder().userId(2).tenantId(1).build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(user, null)
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void startShouldPersistRunAndTransactionalOutboxCommand() {
        WorkflowRunCreateDTO dto = request();
        WorkflowValidationVO validation = new WorkflowValidationVO();
        validation.setValid(true);
        validation.setNodeCount(3);
        when(workflowService.validate(dto.getGraphJson())).thenReturn(validation);
        when(runMapper.insert(any(AiWorkflowRun.class))).thenAnswer(invocation -> {
            AiWorkflowRun run = invocation.getArgument(0);
            run.setId(9001L);
            return 1;
        });

        var result = service.start(7, dto);

        assertThat(result.getId()).isEqualTo("9001");
        assertThat(result.getStatus()).isEqualTo("queued");
        assertThat(result.getTotalNodes()).isEqualTo(3);
        verify(outboxMapper).insert(any(AiWorkflowOutbox.class));
    }

    @Test
    void startShouldReturnExistingRunForSameIdempotencyKey() {
        WorkflowRunCreateDTO dto = request();
        WorkflowValidationVO validation = new WorkflowValidationVO();
        validation.setValid(true);
        when(workflowService.validate(dto.getGraphJson())).thenReturn(validation);
        AiWorkflowRun existing = new AiWorkflowRun();
        existing.setId(9002L);
        existing.setProjectId(7);
        existing.setGraphJson(dto.getGraphJson());
        existing.setStatus("running");
        existing.setProgress(40);
        when(runMapper.selectOne(any())).thenReturn(existing);
        when(nodeRunMapper.selectList(any())).thenReturn(List.of());

        var result = service.start(7, dto);

        assertThat(result.getId()).isEqualTo("9002");
        assertThat(result.getStatus()).isEqualTo("running");
        verify(runMapper, never()).insert(any(AiWorkflowRun.class));
        verify(outboxMapper, never()).insert(any(AiWorkflowOutbox.class));
    }

    private WorkflowRunCreateDTO request() {
        WorkflowRunCreateDTO dto = new WorkflowRunCreateDTO();
        dto.setMode("video");
        dto.setIdempotencyKey("canvas-run-1");
        dto.setGraphJson("{\"nodes\":[{\"id\":\"a\",\"data\":{\"kind\":\"text\"}}],\"edges\":[]}");
        return dto;
    }
}
