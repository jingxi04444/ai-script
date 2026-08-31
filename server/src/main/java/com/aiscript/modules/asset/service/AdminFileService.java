package com.aiscript.modules.asset.service;

import com.aiscript.modules.asset.vo.FileUploadVO;
import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

public interface AdminFileService {
    FileUploadVO upload(MultipartFile file, String folder) throws IOException;
}
