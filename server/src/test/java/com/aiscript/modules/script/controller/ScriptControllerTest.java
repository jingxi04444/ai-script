package com.aiscript.modules.script.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiscript.common.exception.GlobalExceptionHandler;
import com.aiscript.modules.script.dto.PolishScriptDTO;
import com.aiscript.modules.script.service.ScriptService;
import com.aiscript.modules.script.vo.PolishScriptVO;
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
        mockMvc = MockMvcBuilders.standaloneSetup(new ScriptController(scriptService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void polishReturnsPolishedContent() throws Exception {
        when(scriptService.polish(eq(17), any(PolishScriptDTO.class)))
            .thenReturn(new PolishScriptVO("修改后的脚本", "已完成润色"));

        mockMvc.perform(post("/api/scripts/17/polish")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"instruction\":\"开场更抓人\",\"content\":\"原脚本\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(0))
            .andExpect(jsonPath("$.data.content").value("修改后的脚本"))
            .andExpect(jsonPath("$.data.summary").value("已完成润色"));
    }

    @Test
    void polishRejectsBlankInstruction() throws Exception {
        mockMvc.perform(post("/api/scripts/17/polish")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"instruction\":\" \",\"content\":\"原脚本\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(40000));
    }
}
