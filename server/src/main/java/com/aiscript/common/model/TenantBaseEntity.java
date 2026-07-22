package com.aiscript.common.model;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class TenantBaseEntity extends BaseEntity {
    private Integer tenantId;
}
