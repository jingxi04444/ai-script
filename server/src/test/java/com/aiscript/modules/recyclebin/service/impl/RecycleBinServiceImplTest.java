package com.aiscript.modules.recyclebin.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.brief.entity.AiBrief;
import com.aiscript.modules.recyclebin.entity.AiRecycleBin;
import com.aiscript.modules.recyclebin.mapper.AiRecycleBinMapper;
import com.aiscript.security.LoginUser;
import java.lang.reflect.Proxy;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class RecycleBinServiceImplTest {
    private RecordingMapper recordingMapper;
    private RecycleBinServiceImpl service;

    @BeforeEach
    void setUp() {
        recordingMapper = new RecordingMapper();
        service = new RecycleBinServiceImpl(recordingMapper.proxy(), 7);
        TenantContext.setTenantId(9);
        LoginUser user = LoginUser.builder().userId(28).tenantId(9).account("owner").userType("user").build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(user, null)
        );
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    void movingBriefCreatesSevenDayRecoveryRecordWithoutTouchingRelations() {
        recordingMapper.selectCount = 0L;
        AiBrief brief = new AiBrief();
        brief.setId(101);
        brief.setTenantId(9);
        brief.setProjectId(12);
        brief.setBriefName("按摩椅产品 Brief");
        brief.setProductName("A60 MAX");

        service.moveBrief(brief);

        AiRecycleBin record = recordingMapper.inserted;
        assertThat(record).isNotNull();
        assertThat(record.getTenantId()).isEqualTo(9);
        assertThat(record.getDeletedBy()).isEqualTo(28);
        assertThat(record.getResourceType()).isEqualTo("brief");
        assertThat(record.getResourceId()).isEqualTo(101);
        assertThat(record.getResourceName()).isEqualTo("A60 MAX");
        assertThat(record.getParentId()).isEqualTo(12);
        assertThat(record.getRecycleStatus()).isEqualTo("active");
        assertThat(record.getRetentionDays()).isEqualTo(7);
        assertThat(Duration.between(record.getDeletedAt(), record.getExpireAt()).toDays()).isEqualTo(7);
        assertThat(record.getSnapshotJson()).contains("productName", "A60 MAX");
    }

    @Test
    void restoreReactivatesRootAndClosesRecycleRecord() {
        AiRecycleBin record = activeRecord("brief");
        recordingMapper.selected = record;
        recordingMapper.restoreResult = 1;

        service.restore(66);

        assertThat(recordingMapper.calls).contains("restoreBrief", "updateById");
        assertThat(recordingMapper.updated).isSameAs(record);
        assertThat(record.getRecycleStatus()).isEqualTo("restored");
        assertThat(record.getRestoreTime()).isNotNull();
    }

    @Test
    void restoreFailsWhenOriginalDataWasAlreadyPurged() {
        AiRecycleBin record = activeRecord("brief");
        recordingMapper.selected = record;
        recordingMapper.restoreResult = 0;

        assertThatThrownBy(() -> service.restore(66))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("无法恢复");
        assertThat(recordingMapper.calls).doesNotContain("updateById");
    }

    @Test
    void permanentBriefDeletePurgesBusinessContentButKeepsImmutableVersions() {
        AiRecycleBin record = activeRecord("brief");
        recordingMapper.selected = record;

        service.purge(66);

        assertThat(recordingMapper.calls).contains(
            "purgeBriefProjectRefs",
            "purgeBriefShareLinks",
            "purgeBriefSellingPoints",
            "purgeBrief",
            "updateById"
        );
        assertThat(recordingMapper.calls).doesNotContain("purgeBriefVersions");
        assertThat(recordingMapper.updated).isSameAs(record);
        assertThat(record.getRecycleStatus()).isEqualTo("purged");
        assertThat(record.getPurgeTime()).isNotNull();
    }

    private AiRecycleBin activeRecord(String resourceType) {
        AiRecycleBin record = new AiRecycleBin();
        record.setId(66);
        record.setTenantId(9);
        record.setDeletedBy(28);
        record.setResourceType(resourceType);
        record.setResourceId(101);
        record.setResourceName("A60 MAX");
        record.setRecycleStatus("active");
        record.setDeletedAt(LocalDateTime.now().minusDays(1));
        record.setExpireAt(LocalDateTime.now().plusDays(6));
        return record;
    }

    private static final class RecordingMapper {
        private final Set<String> calls = new HashSet<>();
        private AiRecycleBin inserted;
        private AiRecycleBin updated;
        private AiRecycleBin selected;
        private long selectCount;
        private int restoreResult = 1;

        private AiRecycleBinMapper proxy() {
            return (AiRecycleBinMapper) Proxy.newProxyInstance(
                AiRecycleBinMapper.class.getClassLoader(),
                new Class<?>[]{AiRecycleBinMapper.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if (method.getDeclaringClass() == Object.class) {
                        return switch (name) {
                            case "toString" -> "RecordingAiRecycleBinMapper";
                            case "hashCode" -> System.identityHashCode(proxy);
                            case "equals" -> proxy == args[0];
                            default -> null;
                        };
                    }
                    calls.add(name);
                    return switch (name) {
                        case "selectCount" -> selectCount;
                        case "selectOne" -> selected;
                        case "insert" -> {
                            inserted = (AiRecycleBin) args[0];
                            yield 1;
                        }
                        case "updateById" -> {
                            updated = (AiRecycleBin) args[0];
                            yield 1;
                        }
                        case "restoreProject", "restoreBrief", "restoreScript" -> restoreResult;
                        default -> method.getReturnType() == int.class ? 1 : null;
                    };
                }
            );
        }
    }
}
