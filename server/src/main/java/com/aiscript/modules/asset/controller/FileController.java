package com.aiscript.modules.asset.controller;

import com.aiscript.common.api.R;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.modules.asset.vo.FileUploadVO;
import java.io.IOException;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
public class FileController {
    private final StorageClient storageClient;

    public FileController(StorageClient storageClient) {
        this.storageClient = storageClient;
    }

    @PostMapping("/upload")
    public R<FileUploadVO> upload(@RequestParam("file") MultipartFile file, @RequestParam(required = false, defaultValue = "common") String folder) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String suffix = "";
        if (StringUtils.hasText(originalFilename) && originalFilename.contains(".")) {
            suffix = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String objectKey = folder + "/" + LocalDate.now() + "/" + UUID.randomUUID().toString().replace("-", "") + suffix;
        objectKey = storageClient.putObject(objectKey, file.getInputStream(), file.getSize(), file.getContentType());
        FileUploadVO vo = new FileUploadVO();
        vo.setObjectKey(objectKey);
        vo.setUrl(storageClient.presignedUrl(objectKey));
        vo.setFileName(originalFilename);
        vo.setContentType(file.getContentType());
        vo.setSize(file.getSize());
        return R.ok(vo);
    }
}
