package com.aiscript.modules.script.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.GlobalExceptionHandler;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.script.dto.PolishScriptDTO;
import com.aiscript.modules.generation.service.ScriptGenerationQueueService;
import com.aiscript.modules.script.service.ScriptService;
import com.aiscript.modules.script.vo.PolishScriptVO;
import com.aiscript.modules.script.vo.ScriptListVO;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ScriptControllerTest {
    private ScriptService scriptService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        scriptService = Mockito.mock(ScriptService.class);
        ScriptGenerationQueueService queueService = Mockito.mock(ScriptGenerationQueueService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new ScriptController(scriptService, queueService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void polishReturnsPolishedContent() throws Exception {
        when(scriptService.polish(eq(17), any(PolishScriptDTO.class)))
            .thenReturn(new PolishScriptVO("修改后的脚本", "已完成润色", "changes_requested"));

        mockMvc.perform(post("/api/scripts/17/polish")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"requestNo\":\"script_polish:test-1\",\"expectedPointCost\":10,\"instruction\":\"开场更抓人\",\"content\":\"原脚本\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(0))
            .andExpect(jsonPath("$.data.content").value("修改后的脚本"))
            .andExpect(jsonPath("$.data.summary").value("已完成润色"))
            .andExpect(jsonPath("$.data.status").value("changes_requested"));
    }

    @Test
    void polishRejectsBlankInstruction() throws Exception {
        mockMvc.perform(post("/api/scripts/17/polish")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"requestNo\":\"script_polish:test-2\",\"expectedPointCost\":10,\"instruction\":\" \",\"content\":\"原脚本\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(40000));
    }

    @Test
    void scriptPageAcceptsBackendPaginationAndFilters() throws Exception {
        ScriptListVO item = new ScriptListVO();
        item.setId("17");
        item.setName("分页脚本");
        when(scriptService.page(any(PageQuery.class), eq(9), eq("viral"), eq("draft")))
            .thenReturn(new PageResult<>(List.of(item), 12L, 2L, 10L, 2L));

        mockMvc.perform(get("/api/scripts/page")
                .param("projectId", "9")
                .param("page", "2")
                .param("pageSize", "10")
                .param("keyword", "脚本")
                .param("type", "viral")
                .param("status", "draft"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(0))
            .andExpect(jsonPath("$.data.total").value(12))
            .andExpect(jsonPath("$.data.page").value(2))
            .andExpect(jsonPath("$.data.list[0].content").doesNotExist())
            .andExpect(jsonPath("$.data.list[0].name").value("分页脚本"));
    }
}
