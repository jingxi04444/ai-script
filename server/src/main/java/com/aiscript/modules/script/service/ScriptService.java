package com.aiscript.modules.script.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.script.dto.GenerateScriptDTO;
import com.aiscript.modules.script.dto.PolishScriptDTO;
import com.aiscript.modules.script.dto.ScriptSaveDTO;
import com.aiscript.modules.script.dto.TemplateSaveDTO;
import com.aiscript.modules.script.vo.PolishScriptVO;
import com.aiscript.modules.script.vo.ScriptTemplateVO;
import com.aiscript.modules.script.vo.ScriptVO;
import java.util.List;

public interface ScriptService {
    List<ScriptVO> list(Integer projectId);

    List<ScriptVO> mineList();

    ScriptVO getById(Integer id);

    ScriptVO generate(GenerateScriptDTO dto);

    PolishScriptVO polish(Integer id, PolishScriptDTO dto);

    ScriptVO update(Integer id, ScriptSaveDTO dto);

    void delete(Integer id);

    List<ScriptTemplateVO> enabledTemplates();

    PageResult<ScriptTemplateVO> templatePage(PageQuery query, String category);

    ScriptTemplateVO templateById(Integer id);

    ScriptTemplateVO createTemplate(TemplateSaveDTO dto);

    ScriptTemplateVO updateTemplate(Integer id, TemplateSaveDTO dto);

    void deleteTemplate(Integer id);
}
