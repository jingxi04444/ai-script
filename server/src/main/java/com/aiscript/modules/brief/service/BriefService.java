package com.aiscript.modules.brief.service;

import com.aiscript.modules.brief.dto.BriefSaveDTO;
import com.aiscript.modules.brief.dto.BriefEditRequestDTO;
import com.aiscript.modules.brief.vo.BriefEditRequestVO;
import com.aiscript.modules.brief.vo.BriefAssetLibraryVO;
import com.aiscript.modules.brief.vo.BriefShareVO;
import com.aiscript.modules.brief.vo.BriefVO;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface BriefService {
    List<BriefVO> list(Integer projectId);

    List<BriefVO> sharedList(String keyword);

    List<BriefVO> mineList(String keyword);

    BriefAssetLibraryVO assetLibrary();

    BriefVO getById(Integer id);

    BriefVO create(BriefSaveDTO dto);

    BriefVO update(Integer id, BriefSaveDTO dto);

    BriefShareVO enableShare(Integer id, String permission);

    List<BriefShareVO> shareLinks(Integer id);

    BriefVO getByShareToken(String token);

    BriefVO updateByShareToken(String token, Integer projectId, BriefSaveDTO dto);

    BriefVO linkToProject(Integer id, Integer projectId);

    void unlinkFromProject(Integer id, Integer projectId);

    BriefEditRequestVO requestEditByShareToken(String token, BriefEditRequestDTO dto);

    List<BriefEditRequestVO> editRequests(Integer briefId);

    BriefEditRequestVO approveEditRequest(Integer requestId);

    BriefEditRequestVO rejectEditRequest(Integer requestId);

    void delete(Integer id);

    List<BriefVO> importBrief(Integer projectId, MultipartFile file);
}
