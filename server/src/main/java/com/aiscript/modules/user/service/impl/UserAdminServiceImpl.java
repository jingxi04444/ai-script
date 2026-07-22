package com.aiscript.modules.user.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.auth.entity.SysUser;
import com.aiscript.modules.auth.mapper.SysUserMapper;
import com.aiscript.modules.user.convert.UserConvert;
import com.aiscript.modules.user.dto.UserQueryDTO;
import com.aiscript.modules.user.service.UserAdminService;
import com.aiscript.modules.user.vo.UserVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class UserAdminServiceImpl implements UserAdminService {
    private final SysUserMapper sysUserMapper;

    public UserAdminServiceImpl(SysUserMapper sysUserMapper) {
        this.sysUserMapper = sysUserMapper;
    }

    @Override
    public PageResult<UserVO> page(UserQueryDTO query) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<SysUser>()
            .eq(SysUser::getUserType, "front")
            .orderByDesc(SysUser::getCreateTime);
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.and(w -> w.like(SysUser::getUsername, query.getKeyword()).or().like(SysUser::getAccount, query.getKeyword()));
        }
        if ("active".equals(query.getStatus())) {
            wrapper.eq(SysUser::getStatus, 1);
        } else if ("disabled".equals(query.getStatus())) {
            wrapper.eq(SysUser::getStatus, 0);
        }
        IPage<SysUser> page = sysUserMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        List<UserVO> list = page.getRecords().stream().map(UserConvert::toVO).toList();
        return new PageResult<>(list, page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    public UserVO getById(Integer id) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return UserConvert.toVO(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserVO update(Integer id, UserVO payload) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        user.setUsername(payload.getUsername());
        user.setEmail(payload.getEmail());
        user.setPhone(payload.getPhone());
        user.setMemberLevel(payload.getMemberLevel());
        user.setBalance(payload.getBalance());
        sysUserMapper.updateById(user);
        return UserConvert.toVO(user);
    }

    @Override
    public void enable(Integer id) {
        updateStatus(id, 1);
    }

    @Override
    public void disable(Integer id) {
        updateStatus(id, 0);
    }

    private void updateStatus(Integer id, Integer status) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        user.setStatus(status);
        sysUserMapper.updateById(user);
    }
}
