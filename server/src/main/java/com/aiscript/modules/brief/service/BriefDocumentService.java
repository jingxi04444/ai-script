package com.aiscript.modules.brief.service;

import com.aiscript.modules.brief.vo.BriefVO;

public interface BriefDocumentService {
    byte[] createDocx(BriefVO brief, String versionId);
}
