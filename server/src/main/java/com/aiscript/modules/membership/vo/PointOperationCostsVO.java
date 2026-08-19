package com.aiscript.modules.membership.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PointOperationCostsVO {
    private Long briefDetect;
    private Long viralSimple;
    private Long viralDeep;
    private Long scriptGenerate;
    private Long scriptPolish;
}
