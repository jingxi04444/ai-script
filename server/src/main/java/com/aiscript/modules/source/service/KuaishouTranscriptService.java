package com.aiscript.modules.source.service;

import com.aiscript.modules.source.dto.KuaishouTranscriptDTO;
import com.aiscript.modules.source.vo.KuaishouTranscriptVO;

public interface KuaishouTranscriptService {
    KuaishouTranscriptVO extract(KuaishouTranscriptDTO dto);
}
