package com.aiscript.modules.project.convert;

import com.aiscript.modules.project.entity.AiProject;
import com.aiscript.modules.project.vo.ProjectVO;

public final class ProjectConvert {
    private ProjectConvert() {
    }

    public static ProjectVO toVO(AiProject project) {
        ProjectVO vo = new ProjectVO();
        vo.setId(String.valueOf(project.getId()));
        vo.setName(project.getProjectName());
        vo.setUserId(project.getOwnerId() == null ? null : String.valueOf(project.getOwnerId()));
        vo.setUsername("demo");
        vo.setCategory(project.getCategory());
        vo.setStatus(project.getStatus());
        vo.setBriefCount(project.getBriefCount());
        vo.setScriptCount(project.getScriptCount());
        vo.setVideoCount(project.getVideoCount());
        vo.setCreatedAt(project.getCreateTime() == null ? null : project.getCreateTime().toString());
        vo.setUpdatedAt(project.getUpdateTime() == null ? null : project.getUpdateTime().toString());
        return vo;
    }
}
