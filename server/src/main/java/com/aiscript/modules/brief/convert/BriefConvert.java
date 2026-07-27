package com.aiscript.modules.brief.convert;

import com.aiscript.modules.brief.entity.AiBrief;
import com.aiscript.modules.brief.entity.AiBriefVersion;
import com.aiscript.modules.brief.vo.BriefVO;
import com.aiscript.modules.brief.vo.BriefVersionVO;
import java.util.List;

public final class BriefConvert {
    private BriefConvert() {
    }

    public static BriefVO toVO(AiBrief brief) {
        return toVO(brief, List.of());
    }

    public static BriefVO toVO(AiBrief brief, List<AiBriefVersion> versions) {
        List<BriefVersionVO> versionVOs = versions == null || versions.isEmpty()
            ? List.of(currentVersion(brief))
            : versions.stream().map(BriefConvert::toVersionVO).toList();

        BriefVO vo = new BriefVO();
        String productName = brief.getProductName() == null || brief.getProductName().isBlank() ? brief.getBriefName() : brief.getProductName();
        vo.setId(String.valueOf(brief.getId()));
        vo.setName(productName);
        vo.setProjectId(String.valueOf(brief.getProjectId()));
        vo.setVersions(versionVOs);
        vo.setUpdatedAt(
            versionVOs.isEmpty() || versionVOs.get(0).getCreatedAt() == null
                ? (brief.getUpdateTime() == null ? null : brief.getUpdateTime().toString())
                : versionVOs.get(0).getCreatedAt()
        );
        vo.setProductName(productName);
        vo.setProductModel(brief.getProductModel());
        vo.setPrice(brief.getPrice());
        vo.setSlogan(brief.getSlogan());
        vo.setPrimarySellingPoint(brief.getPrimarySellingPoint());
        vo.setTargetAudience(brief.getTargetAudience());
        vo.setTargetScene(brief.getTargetScene());
        vo.setOtherRequirements(brief.getOtherRequirements());
        vo.setBriefContent(brief.getBriefContent());
        vo.setRichContent(brief.getRichContent());
        vo.setIsShared(brief.getIsShared());
        vo.setShareEnabled(brief.getShareEnabled());
        vo.setShareToken(brief.getShareToken());
        vo.setSharePermission(brief.getSharePermission() == null ? "read" : brief.getSharePermission());
        if (brief.getShareToken() != null) {
            vo.setShareUrl("/brief-share/" + brief.getShareToken());
        }
        return vo;
    }

    private static BriefVersionVO currentVersion(AiBrief brief) {
        BriefVersionVO version = new BriefVersionVO();
        version.setId(String.valueOf(brief.getId()) + "-v" + brief.getVersionNo());
        version.setLabel("v" + (brief.getVersionNo() == null ? 1 : brief.getVersionNo()) + ".0");
        version.setContent(brief.getBriefContent());
        version.setCreatedAt(
            brief.getUpdateTime() != null
                ? brief.getUpdateTime().toString()
                : (brief.getCreateTime() == null ? null : brief.getCreateTime().toString())
        );
        return version;
    }

    private static BriefVersionVO toVersionVO(AiBriefVersion version) {
        BriefVersionVO vo = new BriefVersionVO();
        vo.setId(String.valueOf(version.getId()));
        vo.setLabel(version.getVersionLabel() == null ? "v" + version.getVersionNo() : version.getVersionLabel());
        vo.setContent(version.getContentSnapshot());
        vo.setCreatedAt(version.getCreateTime() == null ? null : version.getCreateTime().toString());
        return vo;
    }
}
