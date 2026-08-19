package com.aiscript.modules.project.vo;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectCollaborationOverviewVO {
    private List<LinkItem> links;
    private List<MemberItem> members;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LinkItem {
        private String id;
        private String status;
        private String expiresAt;
        private Integer usedCount;
        private Integer maxUses;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemberItem {
        private String id;
        private String userId;
        private String name;
        private String avatarUrl;
        private String joinedAt;
    }
}
