package com.aiscript.modules.workflow.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.brief.service.BriefService;
import com.aiscript.modules.brief.vo.BriefVO;
import com.aiscript.modules.script.service.ScriptReviewService;
import com.aiscript.modules.script.service.ScriptService;
import com.aiscript.modules.script.vo.ScriptVO;
import com.aiscript.modules.workflow.dto.SceneNoticeSaveDTO;
import com.aiscript.modules.workflow.mapper.AiSceneNoticePlanMapper;
import com.aiscript.modules.workflow.vo.SceneNoticeVO;
import com.aiscript.security.LoginUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class SceneNoticeServiceImplTest {
    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void computesSceneProductTableFromCurrentBriefAndScriptCounts() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
            LoginUser.builder().userId(3).tenantId(1).build(), null));
        BriefService briefs = mock(BriefService.class);
        ScriptService scripts = mock(ScriptService.class);
        BriefVO brief = new BriefVO();
        brief.setId("12"); brief.setName("产品资料"); brief.setProductName("烟机"); brief.setProductModel("MJ10");
        when(briefs.list(7)).thenReturn(List.of(brief));
        List<ScriptVO> scriptList = new ArrayList<>();
        for (int index = 0; index < 11; index++) {
            ScriptVO script = new ScriptVO(); script.setBriefId("12"); scriptList.add(script);
        }
        when(scripts.list(7)).thenReturn(scriptList);
        SceneNoticeServiceImpl service = new SceneNoticeServiceImpl(mock(AiSceneNoticePlanMapper.class), briefs,
            scripts, mock(ScriptReviewService.class), new ObjectMapper());
        SceneNoticeSaveDTO request = new SceneNoticeSaveDTO();
        request.setPerSceneCap(10); request.setSceneCount(2);

        SceneNoticeVO result = service.preview(7, request);

        assertEquals(11, result.getPlan().path("totalScripts").asInt());
        assertEquals(2, result.getPlan().path("scenes").size());
        assertEquals(6, result.getPlan().path("scenes").get(0).path("assignments").get(0).path("count").asInt());
        assertEquals(5, result.getPlan().path("scenes").get(1).path("assignments").get(0).path("count").asInt());
        assertEquals("MJ10", result.getPlan().path("scenes").get(0).path("assignments").get(0).path("modelName").asText());

        request.setSceneCount(1);
        assertThrows(BusinessException.class, () -> service.preview(7, request));
    }
}
