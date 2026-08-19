package com.aiscript.modules.source.controller;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiscript.common.exception.GlobalExceptionHandler;
import com.aiscript.modules.source.dto.KuaishouTranscriptDTO;
import com.aiscript.modules.source.service.KuaishouTranscriptService;
import com.aiscript.modules.source.service.SourceAnalysisService;
import com.aiscript.modules.source.vo.KuaishouTranscriptVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SourceAnalysisControllerTest {
    private KuaishouTranscriptService kuaishouTranscriptService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        SourceAnalysisService sourceAnalysisService = Mockito.mock(SourceAnalysisService.class);
        kuaishouTranscriptService = Mockito.mock(KuaishouTranscriptService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(
                new SourceAnalysisController(sourceAnalysisService, kuaishouTranscriptService)
            )
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void kuaishouTranscriptReturnsExtractedCopySynchronously() throws Exception {
        KuaishouTranscriptVO vo = new KuaishouTranscriptVO();
        vo.setPlatform("kuaishou");
        vo.setShareUrl("https://v.kuaishou.com/AbC123");
        vo.setCaption("作品配文");
        vo.setTranscript("语音文案");
        vo.setTranscriptSource("asr");
        when(kuaishouTranscriptService.extract(any(KuaishouTranscriptDTO.class))).thenReturn(vo);

        mockMvc.perform(post("/api/video/kuaishou/transcript")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"https://v.kuaishou.com/AbC123\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(0))
            .andExpect(jsonPath("$.data.platform").value("kuaishou"))
            .andExpect(jsonPath("$.data.caption").value("作品配文"))
            .andExpect(jsonPath("$.data.transcript").value("语音文案"));
    }

    @Test
    void kuaishouTranscriptRejectsBlankUrl() throws Exception {
        mockMvc.perform(post("/api/video/kuaishou/transcript")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\" \"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(40000))
            .andExpect(jsonPath("$.message").value(containsString("快手分享链接不能为空")));
    }
}
