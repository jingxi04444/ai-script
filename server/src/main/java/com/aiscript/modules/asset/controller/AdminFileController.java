package com.aiscript.modules.asset.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.asset.service.AdminFileService;
import com.aiscript.modules.asset.vo.FileUploadVO;
import java.io.IOException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/files")
public class AdminFileController {
    private final AdminFileService adminFileService;

    public AdminFileController(AdminFileService adminFileService) {
        this.adminFileService = adminFileService;
    }

    @PostMapping("/upload")
    public R<FileUploadVO> upload(
        @RequestParam("file") MultipartFile file,
        @RequestParam(required = false, defaultValue = "site-config") String folder
    ) throws IOException {
        return R.ok(adminFileService.upload(file, folder));
    }
}
