package com.aiscript.modules.generation.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.generation.vo.GenerationTaskVO;
import com.aiscript.security.LoginUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class GenerationTaskServiceImplTest {
    @Mock
    private AiGenerationTaskMapper taskMapper;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getByIdShouldScopeLookupToCurrentTenantAndUser() {
        login(2, 1);
        AiGenerationTask task = new AiGenerationTask();
        task.setId(9);
        task.setStatus("SUCCESS");
        task.setProgress(100);
        task.setResultPayload("{\"ok\":true}");
        when(taskMapper.selectOwnedTask(9, 1, 2)).thenReturn(task);

        GenerationTaskVO result = new GenerationTaskServiceImpl(taskMapper).getById(9);

        assertThat(result.getId()).isEqualTo("9");
        assertThat(result.getStatus()).isEqualTo("SUCCESS");
        verify(taskMapper).selectOwnedTask(9, 1, 2);
    }

    @Test
    void getByIdShouldRejectAnonymousAccess() {
        assertThatThrownBy(() -> new GenerationTaskServiceImpl(taskMapper).getById(9))
            .isInstanceOf(BusinessException.class)
            .hasMessage("请先登录")
            .extracting(error -> ((BusinessException) error).getResultCode())
            .isEqualTo(ResultCode.UNAUTHORIZED);
    }

    @Test
    void getByIdShouldNotRevealOtherUsersTask() {
        login(2, 1);
        when(taskMapper.selectOwnedTask(9, 1, 2)).thenReturn(null);

        assertThatThrownBy(() -> new GenerationTaskServiceImpl(taskMapper).getById(9))
            .isInstanceOf(BusinessException.class)
            .hasMessage("任务不存在或无权访问")
            .extracting(error -> ((BusinessException) error).getResultCode())
            .isEqualTo(ResultCode.NOT_FOUND);
    }

    private void login(Integer userId, Integer tenantId) {
        LoginUser loginUser = LoginUser.builder().userId(userId).tenantId(tenantId).build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(loginUser, null)
        );
    }
}
