package com.aiscript.modules.asset.controller;

import com.aiscript.common.api.R;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.storage.StorageClient;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.asset.service.ProductFrameContentExtractor;
import com.aiscript.modules.asset.vo.FileUploadVO;
import com.aiscript.modules.membership.service.MembershipStorageService;
import com.aiscript.security.LoginUser;
import java.io.IOException;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
public class FileController {
    private static final Integer DEFAULT_TENANT_ID = 1;

    private final StorageClient storageClient;
    private final ProductFrameContentExtractor productFrameContentExtractor;
    private final MembershipStorageService membershipStorageService;

    public FileController(
        StorageClient storageClient,
        ProductFrameContentExtractor productFrameContentExtractor,
        MembershipStorageService membershipStorageService
    ) {
        this.storageClient = storageClient;
        this.productFrameContentExtractor = productFrameContentExtractor;
        this.membershipStorageService = membershipStorageService;
    }

    @PostMapping("/upload")
    public R<FileUploadVO> upload(
        @RequestParam("file") MultipartFile file,
        @RequestParam(required = false, defaultValue = "common") String folder
    ) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("请选择需要上传的文件");
        }
        String originalFilename = file.getOriginalFilename();
        String extractedText = "product-frame".equals(folder) ? productFrameContentExtractor.extract(file) : null;
        String suffix = "";
        if (StringUtils.hasText(originalFilename) && originalFilename.contains(".")) {
            suffix = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String requestedObjectKey = folder + "/" + LocalDate.now() + "/"
            + UUID.randomUUID().toString().replace("-", "") + suffix;
        String requestNo = membershipStorageService.reserve(
            currentTenantId(), currentUserId(), requestedObjectKey, file.getSize(), "file_upload", null
        );
        String actualObjectKey;
        try {
            actualObjectKey = storageClient.putObject(
                requestedObjectKey, file.getInputStream(), file.getSize(), file.getContentType()
            );
            membershipStorageService.confirm(requestNo, actualObjectKey);
        } catch (RuntimeException | IOException exception) {
            membershipStorageService.release(requestNo);
            throw exception;
        }

        FileUploadVO vo = new FileUploadVO();
        vo.setObjectKey(actualObjectKey);
        vo.setUrl(storageClient.presignedUrl(actualObjectKey));
        vo.setFileName(originalFilename);
        vo.setContentType(file.getContentType());
        vo.setSize(file.getSize());
        vo.setExtractedText(extractedText);
        return R.ok(vo);
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }

    private Integer currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException("请先登录");
        }
        return loginUser.getUserId();
    }
}
