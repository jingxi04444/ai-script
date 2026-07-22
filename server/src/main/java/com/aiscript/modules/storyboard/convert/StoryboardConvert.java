package com.aiscript.modules.storyboard.convert;

import com.aiscript.modules.storyboard.entity.AiStoryboardShot;
import com.aiscript.modules.storyboard.vo.ShotVO;

public final class StoryboardConvert {
    private StoryboardConvert() {
    }

    public static ShotVO toShotVO(AiStoryboardShot shot) {
        ShotVO vo = new ShotVO();
        vo.setId(String.valueOf(shot.getId()));
        vo.setNumber(shot.getShotNo());
        vo.setType(shot.getShotType());
        vo.setScene(shot.getSceneDescription());
        vo.setLine(shot.getLineText());
        vo.setDuration(shot.getDurationSeconds() == null ? null : shot.getDurationSeconds().stripTrailingZeros().toPlainString());
        vo.setRisk(shot.getRiskLevel());
        return vo;
    }
}
