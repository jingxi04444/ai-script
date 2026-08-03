package com.aiscript.modules.user.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.auth.entity.SysUser;
import com.aiscript.modules.auth.mapper.SysUserMapper;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.entity.AiMembershipPlanSku;
import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.mapper.AiUserSubscriptionMapper;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.system.entity.SysRole;
import com.aiscript.modules.system.entity.SysUserRole;
import com.aiscript.modules.system.mapper.SysRoleMapper;
import com.aiscript.modules.system.mapper.SysUserRoleMapper;
import com.aiscript.modules.user.convert.UserConvert;
import com.aiscript.modules.user.dto.InternalMembershipAdjustDTO;
import com.aiscript.modules.user.dto.InternalUserCreateDTO;
import com.aiscript.modules.user.dto.UserQueryDTO;
import com.aiscript.modules.user.service.UserAdminService;
import com.aiscript.modules.user.vo.UserVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class UserAdminServiceImpl implements UserAdminService {
    private final SysUserMapper sysUserMapper;
    private final SysRoleMapper roleMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final AiMembershipPlanMapper planMapper;
    private final AiMembershipPlanSkuMapper skuMapper;
    private final AiUserSubscriptionMapper subscriptionMapper;
    private final MembershipEntitlementService entitlementService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    public UserAdminServiceImpl(
        SysUserMapper sysUserMapper,
        SysRoleMapper roleMapper,
        SysUserRoleMapper userRoleMapper,
        AiMembershipPlanMapper planMapper,
        AiMembershipPlanSkuMapper skuMapper,
        AiUserSubscriptionMapper subscriptionMapper,
        MembershipEntitlementService entitlementService,
        PasswordEncoder passwordEncoder,
        ObjectMapper objectMapper
    ) {
        this.sysUserMapper = sysUserMapper;
        this.roleMapper = roleMapper;
        this.userRoleMapper = userRoleMapper;
        this.planMapper = planMapper;
        this.skuMapper = skuMapper;
        this.subscriptionMapper = subscriptionMapper;
        this.entitlementService = entitlementService;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    @Override
    public PageResult<UserVO> page(UserQueryDTO query) {
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<SysUser>()
            .eq(SysUser::getUserType, "front")
            .orderByDesc(SysUser::getCreateTime);
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.and(w -> w.like(SysUser::getUsername, query.getKeyword())
                .or().like(SysUser::getAccount, query.getKeyword())
                .or().like(SysUser::getEmail, query.getKeyword())
                .or().like(SysUser::getPhone, query.getKeyword()));
        }
        if ("active".equals(query.getStatus())) {
            wrapper.eq(SysUser::getStatus, 1);
        } else if ("disabled".equals(query.getStatus())) {
            wrapper.eq(SysUser::getStatus, 0);
        }
        IPage<SysUser> page = sysUserMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        List<UserVO> list = page.getRecords().stream().map(this::toUserVO).toList();
        return new PageResult<>(list, page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    public UserVO getById(Integer id) {
        SysUser user = requireUser(id);
        return toUserVO(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserVO update(Integer id, UserVO payload) {
        SysUser user = requireUser(id);
        user.setUsername(payload.getUsername());
        user.setEmail(payload.getEmail());
        user.setPhone(payload.getPhone());
        // 会员等级必须通过内部账号调级接口修改，避免只改用户表却没有真正授予权益。
        sysUserMapper.updateById(user);
        return toUserVO(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserVO createInternalAccount(InternalUserCreateDTO dto, Integer operatorId, Integer tenantId) {
        String email = dto.getEmail().trim().toLowerCase(Locale.ROOT);
        Long duplicate = sysUserMapper.selectCount(new LambdaQueryWrapper<SysUser>()
            .eq(SysUser::getAccount, email)
            .or()
            .eq(SysUser::getEmail, email));
        if (duplicate > 0) {
            throw new BusinessException("该邮箱已注册，请直接在内部账号列表中调整套餐");
        }
        PlanSelection selection = requirePlanSelection(dto.getPlanId(), dto.getSkuId());
        LocalDateTime now = LocalDateTime.now();
        SysUser user = new SysUser();
        user.setTenantId(tenantId == null ? 1 : tenantId);
        user.setUsername(dto.getUsername().trim());
        user.setAccount(email);
        user.setEmail(email);
        user.setPhone(normalize(dto.getPhone()));
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        user.setUserType("front");
        user.setMemberLevel(selection.plan().getPlanLevel());
        user.setInternalAccount(1);
        user.setStatus(1);
        user.setCreateBy(operatorId);
        user.setUpdateBy(operatorId);
        user.setCreateTime(now);
        user.setUpdateTime(now);
        sysUserMapper.insert(user);
        assignFrontUserRole(user, now);
        applyInternalMembership(user, selection, dto.getValidDays(), operatorId, now);
        return toUserVO(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UserVO adjustInternalMembership(Integer id, InternalMembershipAdjustDTO dto, Integer operatorId) {
        SysUser user = requireUser(id);
        if (user.getInternalAccount() == null || user.getInternalAccount() != 1) {
            throw new BusinessException("只能调整内部员工账号的会员等级");
        }
        PlanSelection selection = requirePlanSelection(dto.getPlanId(), dto.getSkuId());
        applyInternalMembership(user, selection, dto.getValidDays(), operatorId, LocalDateTime.now());
        return toUserVO(requireUser(id));
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
        SysUser user = requireUser(id);
        user.setStatus(status);
        sysUserMapper.updateById(user);
    }

    private SysUser requireUser(Integer id) {
        SysUser user = sysUserMapper.selectById(id);
        if (user == null || !"front".equals(user.getUserType())) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    private PlanSelection requirePlanSelection(Long planId, Long skuId) {
        AiMembershipPlan plan = planMapper.selectById(planId);
        AiMembershipPlanSku sku = skuMapper.selectById(skuId);
        if (plan == null || plan.getStatus() == null || plan.getStatus() != 1) {
            throw new BusinessException("所选会员套餐不存在或已停用");
        }
        if (sku == null || sku.getStatus() == null || sku.getStatus() != 1 || !planId.equals(sku.getPlanId())) {
            throw new BusinessException("所选订阅方案不存在、已停用或不属于该套餐");
        }
        return new PlanSelection(plan, sku);
    }

    private void assignFrontUserRole(SysUser user, LocalDateTime now) {
        SysRole role = roleMapper.selectOne(new QueryWrapper<SysRole>()
            .eq("role_code", "front_user")
            .eq("status", 1)
            .and(w -> w.eq("tenant_id", user.getTenantId()).or().isNull("tenant_id"))
            .orderByDesc("tenant_id")
            .last("LIMIT 1"));
        if (role == null) {
            throw new BusinessException("前台用户角色 front_user 未配置，无法创建内部账号");
        }
        SysUserRole relation = new SysUserRole();
        relation.userId = user.getId();
        relation.roleId = role.id;
        relation.createTime = now;
        userRoleMapper.insert(relation);
    }

    private void applyInternalMembership(
        SysUser user,
        PlanSelection selection,
        Integer validDays,
        Integer operatorId,
        LocalDateTime now
    ) {
        LocalDateTime end = now.plusDays(validDays);
        AiUserSubscription active = subscriptionMapper.selectActiveByUserForUpdate(user.getId().longValue());
        String snapshot = buildSnapshot(selection, validDays, operatorId);
        if (active == null) {
            active = new AiUserSubscription();
            active.setTenantId(user.getTenantId().longValue());
            active.setUserId(user.getId().longValue());
            active.setPlanId(selection.plan().getId().longValue());
            active.setSkuId(selection.sku().getId());
            active.setStatus("active");
            active.setAutoRenew(0);
            active.setStartTime(now);
            active.setCurrentPeriodStart(now);
            active.setCurrentPeriodEnd(end);
            active.setBenefitAnchorTime(now);
            active.setCancelAtPeriodEnd(1);
            active.setProvider("internal");
            active.setPlanSnapshotJson(snapshot);
            active.setSourceOrderNo("INTERNAL-" + user.getId() + "-" + System.currentTimeMillis());
            active.setVersion(0);
            active.setCreateBy(operatorId.longValue());
            active.setUpdateBy(operatorId.longValue());
            active.setCreateTime(now);
            active.setUpdateTime(now);
            active.setDeleted(0);
            subscriptionMapper.insert(active);
        } else {
            int currentVersion = active.getVersion() == null ? 0 : active.getVersion();
            subscriptionMapper.update(null, new LambdaUpdateWrapper<AiUserSubscription>()
                .eq(AiUserSubscription::getId, active.getId())
                .set(AiUserSubscription::getPlanId, selection.plan().getId().longValue())
                .set(AiUserSubscription::getSkuId, selection.sku().getId())
                .set(AiUserSubscription::getStatus, "active")
                .set(AiUserSubscription::getAutoRenew, 0)
                .set(AiUserSubscription::getStartTime, now)
                .set(AiUserSubscription::getCurrentPeriodStart, now)
                .set(AiUserSubscription::getCurrentPeriodEnd, end)
                .set(AiUserSubscription::getBenefitAnchorTime, now)
                .set(AiUserSubscription::getNextRenewTime, null)
                .set(AiUserSubscription::getGraceEndTime, null)
                .set(AiUserSubscription::getCancelAtPeriodEnd, 1)
                .set(AiUserSubscription::getCancelTime, null)
                .set(AiUserSubscription::getPendingPlanId, null)
                .set(AiUserSubscription::getPendingSkuId, null)
                .set(AiUserSubscription::getPendingEffectiveTime, null)
                .set(AiUserSubscription::getProvider, "internal")
                .set(AiUserSubscription::getAgreementNo, null)
                .set(AiUserSubscription::getPlanSnapshotJson, snapshot)
                .set(AiUserSubscription::getVersion, currentVersion + 1)
                .set(AiUserSubscription::getUpdateBy, operatorId.longValue())
                .set(AiUserSubscription::getUpdateTime, now));
        }
        user.setMemberLevel(selection.plan().getPlanLevel());
        user.setInternalAccount(1);
        user.setUpdateBy(operatorId);
        user.setUpdateTime(now);
        sysUserMapper.updateById(user);
        entitlementService.clearEntitlementCache(user.getTenantId(), user.getId());
    }

    private String buildSnapshot(PlanSelection selection, Integer validDays, Integer operatorId) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                "planId", selection.plan().getId(),
                "planCode", selection.plan().getPlanCode(),
                "planName", selection.plan().getPlanName(),
                "skuId", selection.sku().getId(),
                "skuCode", selection.sku().getSkuCode(),
                "internalGrant", true,
                "validDays", validDays,
                "operatorId", operatorId
            ));
        } catch (JsonProcessingException ex) {
            throw new BusinessException("会员套餐快照生成失败");
        }
    }

    private UserVO toUserVO(SysUser user) {
        UserVO vo = UserConvert.toVO(user);
        AiUserSubscription subscription = subscriptionMapper.selectOne(new LambdaQueryWrapper<AiUserSubscription>()
            .eq(AiUserSubscription::getUserId, user.getId().longValue())
            .in(AiUserSubscription::getStatus, "active", "canceling", "past_due")
            .orderByDesc(AiUserSubscription::getCurrentPeriodEnd)
            .last("LIMIT 1"));
        if (subscription == null) {
            return vo;
        }
        vo.setPlanId(String.valueOf(subscription.getPlanId()));
        vo.setSkuId(subscription.getSkuId() == null ? null : String.valueOf(subscription.getSkuId()));
        vo.setSubscriptionStatus(subscription.getStatus());
        vo.setSubscriptionEnd(subscription.getCurrentPeriodEnd() == null ? null : subscription.getCurrentPeriodEnd().toString());
        AiMembershipPlan plan = planMapper.selectById(subscription.getPlanId());
        AiMembershipPlanSku sku = subscription.getSkuId() == null ? null : skuMapper.selectById(subscription.getSkuId());
        vo.setPlanName(plan == null ? null : plan.getPlanName());
        vo.setSkuName(sku == null ? null : sku.getSkuName());
        return vo;
    }

    private String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private record PlanSelection(AiMembershipPlan plan, AiMembershipPlanSku sku) {
    }
}
