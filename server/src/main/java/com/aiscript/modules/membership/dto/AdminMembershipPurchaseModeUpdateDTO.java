package com.aiscript.modules.membership.dto;

import java.util.ArrayList;
import java.util.List;

public class AdminMembershipPurchaseModeUpdateDTO {
    public List<Item> items = new ArrayList<>();

    public static class Item {
        public String value;
        public String label;
        public String hint;
        public String badge;
        public Boolean enabled;
        public Integer displayOrder;
    }
}
