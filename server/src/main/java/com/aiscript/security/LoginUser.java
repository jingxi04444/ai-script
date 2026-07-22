package com.aiscript.security;

import java.util.Collection;
import java.util.Collections;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LoginUser {
    private Integer userId;

    private Integer tenantId;

    private String account;
    private String userType;
    @Builder.Default
    private Collection<String> permissions = Collections.emptyList();
}
