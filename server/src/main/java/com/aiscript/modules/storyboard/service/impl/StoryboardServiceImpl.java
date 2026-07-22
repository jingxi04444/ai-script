package com.aiscript.modules.storyboard.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.storyboard.convert.StoryboardConvert;
import com.aiscript.modules.storyboard.dto.StoryboardUpdateDTO;
import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import com.aiscript.modules.storyboard.entity.AiStoryboardShot;
import com.aiscript.modules.storyboard.mapper.AiStoryboardScriptMapper;
import com.aiscript.modules.storyboard.mapper.AiStoryboardShotMapper;
import com.aiscript.modules.storyboard.service.StoryboardService;
import com.aiscript.modules.storyboard.vo.ShotVO;
import com.aiscript.modules.storyboard.vo.StoryboardVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StoryboardServiceImpl implements StoryboardService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private final AiStoryboardScriptMapper scriptMapper;
    private final AiStoryboardShotMapper shotMapper;

    public StoryboardServiceImpl(AiStoryboardScriptMapper scriptMapper, AiStoryboardShotMapper shotMapper) {
        this.scriptMapper = scriptMapper;
        this.shotMapper = shotMapper;
    }

    @Override
    public StoryboardVO getByScriptId(Integer scriptId) {
        AiStoryboardScript script = scriptMapper.selectById(scriptId);
        if (script == null) {
            throw new BusinessException("脚本不存在");
        }
        return build(script);
    }

    @Override
    public StoryboardVO getById(Integer id) {
        return getByScriptId(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public StoryboardVO update(Integer id, StoryboardUpdateDTO dto) {
        AiStoryboardScript script = scriptMapper.selectById(Integer.valueOf(dto.getScriptId() == null ? String.valueOf(id) : dto.getScriptId()));
        if (script == null) {
            throw new BusinessException("脚本不存在");
        }
        if (dto.getShots() != null && script.getCurrentVersionId() != null) {
            shotMapper.delete(new LambdaQueryWrapper<AiStoryboardShot>().eq(AiStoryboardShot::getScriptVersionId, script.getCurrentVersionId()));
            int index = 1;
            for (ShotVO item : dto.getShots()) {
                AiStoryboardShot shot = new AiStoryboardShot();
                shot.setTenantId(TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId());
                shot.setScriptVersionId(script.getCurrentVersionId());
                shot.setShotNo(item.getNumber() == null ? index : item.getNumber());
                shot.setShotType(item.getType());
                shot.setSceneDescription(item.getScene());
                shot.setLineText(item.getLine());
                shot.setDurationSeconds(item.getDuration() == null ? null : new BigDecimal(item.getDuration()));
                shot.setRiskLevel(item.getRisk() == null ? "low" : item.getRisk());
                shot.setSortOrder(index);
                shotMapper.insert(shot);
                index++;
            }
        }
        return build(script);
    }

    @Override
    public byte[] exportCsv(Integer id) {
        AiStoryboardScript script = scriptMapper.selectById(id);
        if (script == null) {
            throw new BusinessException("脚本不存在");
        }
        List<AiStoryboardShot> shots = List.of();
        if (script.getCurrentVersionId() != null) {
            shots = shotMapper.selectList(new LambdaQueryWrapper<AiStoryboardShot>()
                .eq(AiStoryboardShot::getScriptVersionId, script.getCurrentVersionId())
                .orderByAsc(AiStoryboardShot::getSortOrder));
        }
        StringBuilder csv = new StringBuilder("\uFEFF");
        csv.append("scriptId,scriptName,shotNo,shotType,scene,line,durationSeconds,sellingPointNote,riskLevel\n");
        for (AiStoryboardShot shot : shots) {
            csv.append(cell(String.valueOf(script.getId()))).append(',')
                .append(cell(script.getScriptName())).append(',')
                .append(cell(String.valueOf(shot.getShotNo()))).append(',')
                .append(cell(shot.getShotType())).append(',')
                .append(cell(shot.getSceneDescription())).append(',')
                .append(cell(shot.getLineText())).append(',')
                .append(cell(shot.getDurationSeconds() == null ? "" : shot.getDurationSeconds().toPlainString())).append(',')
                .append(cell(shot.getSellingPointNote())).append(',')
                .append(cell(shot.getRiskLevel()))
                .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private StoryboardVO build(AiStoryboardScript script) {
        List<ShotVO> shots = List.of();
        if (script.getCurrentVersionId() != null) {
            shots = shotMapper.selectList(new LambdaQueryWrapper<AiStoryboardShot>()
                    .eq(AiStoryboardShot::getScriptVersionId, script.getCurrentVersionId())
                    .orderByAsc(AiStoryboardShot::getSortOrder))
                .stream()
                .map(StoryboardConvert::toShotVO)
                .toList();
        }
        StoryboardVO vo = new StoryboardVO();
        vo.setId(String.valueOf(script.getId()));
        vo.setScriptId(String.valueOf(script.getId()));
        vo.setShots(shots);
        vo.setCreatedAt(script.getCreateTime() == null ? null : script.getCreateTime().toString());
        vo.setUpdatedAt(script.getUpdateTime() == null ? null : script.getUpdateTime().toString());
        return vo;
    }

    private String cell(String value) {
        String text = value == null ? "" : value;
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }
}
