package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.entity.AiStorageObject;
import com.aiscript.modules.membership.mapper.AiStorageObjectMapper;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipStorageService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class MembershipStorageServiceImpl implements MembershipStorageService {
    private static final String STORAGE_BENEFIT = "STORAGE_LIMIT_BYTES";

    private final AiStorageObjectMapper storageObjectMapper;
    private final MembershipEntitlementService entitlementService;

    public MembershipStorageServiceImpl(
        AiStorageObjectMapper storageObjectMapper,
        MembershipEntitlementService entitlementService
    ) {
        this.storageObjectMapper = storageObjectMapper;
        this.entitlementService = entitlementService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String reserve(
        Integer tenantId,
        Integer userId,
        String objectKey,
        long sizeBytes,
        String bizType,
        Long bizId
    ) {
        if (userId == null || !StringUtils.hasText(objectKey) || sizeBytes <= 0) {
            throw new BusinessException("存储额度预占参数不完整");
        }
        AiStorageObject existing = find(tenantId, userId, objectKey);
        if (existing != null) {
            if (!Long.valueOf(sizeBytes).equals(existing.getSizeBytes())) {
                throw new BusinessException("同一文件标识对应的文件大小不一致");
            }
            return existing.getRequestNo();
        }

        String requestNo = "storage:" + UUID.nameUUIDFromBytes(
            (tenantId + ":" + userId + ":" + objectKey).getBytes(StandardCharsets.UTF_8)
        ).toString().replace("-", "");
        entitlementService.reserveQuota(
            tenantId, userId, STORAGE_BENEFIT, sizeBytes, requestNo, bizType, bizId
        );

        AiStorageObject object = new AiStorageObject();
        object.setTenantId(tenantId == null ? null : tenantId.longValue());
        object.setUserId(userId.longValue());
        object.setObjectKey(objectKey);
        object.setRequestNo(requestNo);
        object.setSizeBytes(sizeBytes);
        object.setBizType(bizType);
        object.setBizId(bizId);
        object.setStatus("reserved");
        try {
            storageObjectMapper.insert(object);
        } catch (DuplicateKeyException duplicate) {
            AiStorageObject duplicateObject = find(tenantId, userId, objectKey);
            if (duplicateObject == null) {
                throw duplicate;
            }
            return duplicateObject.getRequestNo();
        }
        return requestNo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void confirm(String requestNo, String actualObjectKey) {
        AiStorageObject object = findByRequestNo(requestNo);
        if ("active".equals(object.getStatus())) {
            return;
        }
        if (!"reserved".equals(object.getStatus())) {
            throw new BusinessException("文件存储记录当前状态不能确认");
        }
        entitlementService.confirmQuota(requestNo);
        if (StringUtils.hasText(actualObjectKey)) {
            object.setObjectKey(actualObjectKey);
        }
        object.setStatus("active");
        storageObjectMapper.updateById(object);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void release(String requestNo) {
        AiStorageObject object = findByRequestNo(requestNo);
        if ("released".equals(object.getStatus())) {
            return;
        }
        if ("reserved".equals(object.getStatus())) {
            entitlementService.releaseQuota(requestNo);
        } else if ("active".equals(object.getStatus())) {
            entitlementService.releaseConsumedQuota(requestNo);
        } else {
            throw new BusinessException("文件存储记录当前状态不能释放");
        }
        object.setStatus("released");
        storageObjectMapper.updateById(object);
    }

    @Override
    public void releaseByObjectKey(Integer tenantId, Integer userId, String objectKey) {
        if (!StringUtils.hasText(objectKey)) {
            return;
        }
        AiStorageObject object = find(tenantId, userId, objectKey);
        if (object != null) {
            release(object.getRequestNo());
        }
    }

    private AiStorageObject find(Integer tenantId, Integer userId, String objectKey) {
        return storageObjectMapper.selectOne(new LambdaQueryWrapper<AiStorageObject>()
            .eq(AiStorageObject::getTenantId, tenantId)
            .eq(AiStorageObject::getUserId, userId)
            .eq(AiStorageObject::getObjectKey, objectKey)
            .last("LIMIT 1"));
    }

    private AiStorageObject findByRequestNo(String requestNo) {
        AiStorageObject object = storageObjectMapper.selectOne(new LambdaQueryWrapper<AiStorageObject>()
            .eq(AiStorageObject::getRequestNo, requestNo)
            .last("LIMIT 1"));
        if (object == null) {
            throw new BusinessException("文件存储记录不存在");
        }
        return object;
    }
}
