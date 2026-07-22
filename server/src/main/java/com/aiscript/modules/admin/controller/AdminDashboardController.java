package com.aiscript.modules.admin.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.asset.entity.AiAsset;
import com.aiscript.modules.asset.mapper.AiAssetMapper;
import com.aiscript.modules.auth.entity.SysUser;
import com.aiscript.modules.auth.mapper.SysUserMapper;
import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.admin.vo.DashboardSummaryVO;
import com.aiscript.modules.project.mapper.AiProjectMapper;
import com.aiscript.modules.storyboard.mapper.AiStoryboardScriptMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {
    private final SysUserMapper userMapper;
    private final AiProjectMapper projectMapper;
    private final AiStoryboardScriptMapper scriptMapper;
    private final AiAssetMapper assetMapper;
    private final AiGenerationTaskMapper taskMapper;

    public AdminDashboardController(
        SysUserMapper userMapper,
        AiProjectMapper projectMapper,
        AiStoryboardScriptMapper scriptMapper,
        AiAssetMapper assetMapper,
        AiGenerationTaskMapper taskMapper
    ) {
        this.userMapper = userMapper;
        this.projectMapper = projectMapper;
        this.scriptMapper = scriptMapper;
        this.assetMapper = assetMapper;
        this.taskMapper = taskMapper;
    }

    @GetMapping("/summary")
    public R<DashboardSummaryVO> summary() {
        DashboardSummaryVO vo = new DashboardSummaryVO();
        vo.setUserCount(userMapper.selectCount(new LambdaQueryWrapper<SysUser>().eq(SysUser::getUserType, "front")));
        vo.setProjectCount(projectMapper.selectCount(null));
        vo.setScriptCount(scriptMapper.selectCount(null));
        vo.setVideoCount(videoCount());
        return R.ok(vo);
    }

    private Long videoCount() {
        Long assetVideos = assetMapper.selectCount(new LambdaQueryWrapper<AiAsset>().eq(AiAsset::getAssetType, "video"));
        Long generatedVideos = taskMapper.selectCount(new LambdaQueryWrapper<AiGenerationTask>()
            .in(AiGenerationTask::getTaskType, "generate_video", "video_generate", "video_export"));
        return assetVideos + generatedVideos;
    }
}
