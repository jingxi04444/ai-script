package com.aiscript.modules.brief.vo;

import lombok.Data;

@Data
public class BriefEditRequestVO {
    private String id;
    private String briefId;
    private String requesterId;
    private String ownerId;
    private String requestMessage;
    private String status;
    private String createdAt;
    private String approveTime;
}
