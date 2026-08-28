package com.aiscript.modules.script.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.script.dto.GenerateScriptDTO;
import com.aiscript.modules.script.dto.PolishScriptDTO;
import com.aiscript.modules.script.dto.ScriptSaveDTO;
import com.aiscript.modules.script.dto.TemplateSaveDTO;
import com.aiscript.modules.script.dto.TemplateStateDTO;
import com.aiscript.modules.script.vo.PolishScriptVO;
import com.aiscript.modules.script.vo.AdminScriptTemplateVO;
import com.aiscript.modules.script.vo.ScriptListVO;
import com.aiscript.modules.script.vo.ScriptPolishMessageVO;
import com.aiscript.modules.script.vo.ScriptTemplateVO;
import com.aiscript.modules.script.vo.ScriptVO;
import com.aiscript.modules.script.vo.ScriptVersionVO;
import java.util.List;

public interface ScriptService {
    List<ScriptVO> list(Integer projectId);

    default PageResult<ScriptListVO> page(PageQuery query, Integer projectId, String type, String status) {
        return page(query, projectId, type, status, "updated");
    }

    PageResult<ScriptListVO> page(PageQuery query, Integer projectId, String type, String status, String sortBy);

    List<ScriptVO> mineList();

    ScriptVO getById(Integer id);

    ScriptVO generate(GenerateScriptDTO dto);

    PolishScriptVO polish(Integer id, PolishScriptDTO dto);

    void cancelPolish(Integer id, String requestNo);

    List<ScriptPolishMessageVO> polishMessages(Integer id);

    List<ScriptVersionVO> versions(Integer id);

    ScriptVO restoreVersion(Integer id, Integer versionId);

    ScriptVO update(Integer id, ScriptSaveDTO dto);

    void delete(Integer id);

    List<ScriptTemplateVO> enabledTemplates();

    PageResult<AdminScriptTemplateVO> templatePage(PageQuery query, String category);

    AdminScriptTemplateVO templateById(Integer id);

    ScriptTemplateVO createTemplate(TemplateSaveDTO dto);

    ScriptTemplateVO updateTemplate(Integer id, TemplateSaveDTO dto);

    ScriptTemplateVO updateTemplateState(Integer id, TemplateStateDTO dto);

    void deleteTemplate(Integer id);
}
