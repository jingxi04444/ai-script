package com.aiscript.modules.membership.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Data;

@Data
public class AdminPointCostsUpdateDTO {
    @NotEmpty
    private List<@Valid AdminPointCostItemDTO> items;
}
