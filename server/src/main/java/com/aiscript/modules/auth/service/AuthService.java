package com.aiscript.modules.auth.service;

import com.aiscript.modules.auth.dto.LoginDTO;
import com.aiscript.modules.auth.dto.BindEmailDTO;
import com.aiscript.modules.auth.dto.BindPhoneDTO;
import com.aiscript.modules.auth.dto.RegisterDTO;
import com.aiscript.modules.auth.dto.SendCodeDTO;
import com.aiscript.modules.auth.dto.SmsLoginDTO;
import com.aiscript.modules.auth.vo.AdminUserVO;
import com.aiscript.modules.auth.vo.LoginVO;
import com.aiscript.modules.auth.vo.UserInfoVO;

public interface AuthService {
    LoginVO login(LoginDTO dto, String userType);

    LoginVO register(RegisterDTO dto);

    LoginVO smsLogin(SmsLoginDTO dto);

    LoginVO bindPhone(BindPhoneDTO dto);

    LoginVO bindEmail(BindEmailDTO dto);

    LoginVO loginWechatUser(Integer userId);

    void sendCode(SendCodeDTO dto);

    UserInfoVO currentUserInfo();

    AdminUserVO currentAdminInfo();
}
