package com.aiscript.modules.asset.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.modules.asset.service.AdminFileService;
import com.aiscript.modules.asset.vo.FileUploadVO;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AdminFileServiceImpl implements AdminFileService {
    private static final Set<String> ALLOWED_FOLDERS = Set.of("site-config", "script-template-video");

    private final StorageClient storageClient;

    public AdminFileServiceImpl(StorageClient storageClient) {
        this.storageClient = storageClient;
    }

    @Override
    public FileUploadVO upload(MultipartFile file, String folder) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("请选择需要上传的文件");
        }
        if (folder == null || !ALLOWED_FOLDERS.contains(folder)) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "不支持的后台上传目录");
        }
        String originalFilename = file.getOriginalFilename();
        String extension = StringUtils.getFilenameExtension(originalFilename);
        String suffix = "";
        if (StringUtils.hasText(extension)) {
            if (!extension.matches("[a-zA-Z0-9]{1,16}")) {
                throw new BusinessException(ResultCode.PARAM_ERROR, "文件扩展名不合法");
            }
            suffix = "." + extension;
        }
        String requestedObjectKey = folder + "/" + LocalDate.now() + "/"
            + UUID.randomUUID().toString().replace("-", "") + suffix;

        // These are platform-managed assets, not a user's membership storage usage.
        String actualObjectKey;
        try (InputStream inputStream = file.getInputStream()) {
            actualObjectKey = storageClient.putObject(
                requestedObjectKey, inputStream, file.getSize(), file.getContentType()
            );
        }

        FileUploadVO vo = new FileUploadVO();
        vo.setObjectKey(actualObjectKey);
        vo.setUrl(storageClient.presignedUrl(actualObjectKey));
        vo.setFileName(originalFilename);
        vo.setContentType(file.getContentType());
        vo.setSize(file.getSize());
        return vo;
    }
}
