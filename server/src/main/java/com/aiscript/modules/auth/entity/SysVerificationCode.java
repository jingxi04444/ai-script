package com.aiscript.modules.auth.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("sys_verification_code")
@Data
public class SysVerificationCode {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private String target;
    private String channel;
    private String scene;
    private String codeHash;
    private LocalDateTime expireTime;
    private LocalDateTime usedTime;
    private LocalDateTime createTime;
}
