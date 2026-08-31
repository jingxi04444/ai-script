package com.aiscript.modules.workflow.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.workflow.dto.WorkflowSaveDTO;
import com.aiscript.modules.workflow.entity.AiWorkflow;
import com.aiscript.modules.workflow.mapper.AiWorkflowMapper;
import com.aiscript.modules.workflow.service.WorkflowService;
import com.aiscript.modules.workflow.vo.WorkflowVO;
import com.aiscript.modules.workflow.vo.WorkflowValidationVO;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class WorkflowServiceImpl implements WorkflowService {
    private static final int MAX_GRAPH_JSON_LENGTH = 2_000_000;

    private final AiWorkflowMapper workflowMapper;
    private final ObjectMapper objectMapper;

    public WorkflowServiceImpl(AiWorkflowMapper workflowMapper, ObjectMapper objectMapper) {
        this.workflowMapper = workflowMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public WorkflowVO get(Integer projectId, String mode) {
        LoginUser user = currentUser();
        AiWorkflow workflow = findOwned(projectId, mode, user);
        return workflow == null ? null : toVO(workflow);
    }

    @Override
    @Transactional
    public WorkflowVO save(Integer projectId, WorkflowSaveDTO dto) {
        LoginUser user = currentUser();
        WorkflowValidationVO validation = validate(dto.getGraphJson());
        if (!validation.isValid()) {
            throw new BusinessException(ResultCode.BUSINESS_ERROR, String.join("；", validation.getErrors()));
        }
        AiWorkflow workflow = findOwned(projectId, dto.getMode(), user);
        if (workflow == null) {
            workflow = new AiWorkflow();
            workflow.setTenantId(currentTenantId(user));
            workflow.setCreateBy(user.getUserId());
            workflow.setProjectId(projectId);
            workflow.setMode(dto.getMode());
            workflow.setVersion(1);
        } else {
            workflow.setVersion(workflow.getVersion() == null ? 1 : workflow.getVersion() + 1);
        }
        workflow.setName(StringUtils.hasText(dto.getName()) ? dto.getName().trim() : "产品视频生产工作流");
        workflow.setGraphJson(dto.getGraphJson());
        workflow.setUpdateBy(user.getUserId());
        if (workflow.getId() == null) workflowMapper.insert(workflow); else workflowMapper.updateById(workflow);
        return toVO(workflow);
    }

    @Override
    public WorkflowValidationVO validate(String graphJson) {
        WorkflowValidationVO result = new WorkflowValidationVO();
        if (!StringUtils.hasText(graphJson)) {
            result.getErrors().add("工作流内容不能为空");
            return result;
        }
        if (graphJson.length() > MAX_GRAPH_JSON_LENGTH) {
            result.getErrors().add("工作流内容超过 2MB 限制");
            return result;
        }
        try {
            JsonNode root = objectMapper.readTree(graphJson);
            JsonNode nodes = root.path("nodes");
            JsonNode edges = root.path("edges");
            if (!nodes.isArray() || !edges.isArray()) {
                result.getErrors().add("工作流必须包含 nodes 和 edges 数组");
                return result;
            }
            result.setNodeCount(nodes.size());
            result.setEdgeCount(edges.size());
            validateGraph(nodes, edges, result);
        } catch (Exception exception) {
            result.getErrors().add("工作流 JSON 格式不正确");
        }
        result.setValid(result.getErrors().isEmpty());
        return result;
    }

    private void validateGraph(JsonNode nodes, JsonNode edges, WorkflowValidationVO result) {
        Set<String> nodeIds = new HashSet<>();
        Map<String, List<String>> adjacency = new HashMap<>();
        Map<String, Integer> indegree = new HashMap<>();
        int shotCount = 0;
        int videoCount = 0;

        for (JsonNode node : nodes) {
            String id = node.path("id").asText();
            if (!StringUtils.hasText(id)) {
                result.getErrors().add("存在缺少 id 的节点");
                continue;
            }
            if (!nodeIds.add(id)) result.getErrors().add("节点 id 重复：" + id);
            adjacency.putIfAbsent(id, new ArrayList<>());
            indegree.putIfAbsent(id, 0);
            JsonNode data = node.path("data");
            String kind = data.path("kind").asText();
            if ("video".equals(kind) || "batchMaterial".equals(kind)) shotCount += Math.max(0, data.path("batchSize").asInt());
            if ("export".equals(kind)) videoCount += Math.max(0, data.path("outputCount").asInt());
        }

        Set<String> edgeKeys = new HashSet<>();
        for (JsonNode edge : edges) {
            String source = edge.path("source").asText();
            String target = edge.path("target").asText();
            if (!nodeIds.contains(source) || !nodeIds.contains(target)) {
                result.getErrors().add("连线引用了不存在的节点：" + source + " → " + target);
                continue;
            }
            if (source.equals(target)) {
                result.getErrors().add("节点不能连接自身：" + source);
                continue;
            }
            if (!edgeKeys.add(source + "\u0000" + target)) {
                result.getErrors().add("存在重复连线：" + source + " → " + target);
                continue;
            }
            adjacency.get(source).add(target);
            indegree.put(target, indegree.get(target) + 1);
        }

        ArrayDeque<String> ready = new ArrayDeque<>();
        indegree.forEach((id, degree) -> { if (degree == 0) ready.add(id); });
        int visited = 0;
        while (!ready.isEmpty()) {
            String id = ready.removeFirst();
            visited++;
            for (String target : adjacency.getOrDefault(id, List.of())) {
                int nextDegree = indegree.merge(target, -1, Integer::sum);
                if (nextDegree == 0) ready.add(target);
            }
        }
        if (visited != nodeIds.size()) result.getErrors().add("工作流存在环路，无法执行");
        result.setEstimatedShotCount(shotCount);
        result.setEstimatedVideoCount(videoCount);
    }

    private AiWorkflow findOwned(Integer projectId, String mode, LoginUser user) {
        return workflowMapper.selectOne(Wrappers.<AiWorkflow>lambdaQuery()
            .eq(AiWorkflow::getTenantId, currentTenantId(user))
            .eq(AiWorkflow::getCreateBy, user.getUserId())
            .eq(AiWorkflow::getProjectId, projectId)
            .eq(AiWorkflow::getMode, mode)
            .last("LIMIT 1"));
    }

    private WorkflowVO toVO(AiWorkflow workflow) {
        WorkflowVO vo = new WorkflowVO();
        vo.setId(String.valueOf(workflow.getId()));
        vo.setProjectId(String.valueOf(workflow.getProjectId()));
        vo.setName(workflow.getName());
        vo.setMode(workflow.getMode());
        vo.setVersion(workflow.getVersion());
        vo.setGraphJson(workflow.getGraphJson());
        vo.setUpdatedAt(workflow.getUpdateTime());
        return vo;
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return loginUser;
    }

    private Integer currentTenantId(LoginUser user) {
        return TenantContext.getTenantId() == null ? user.getTenantId() : TenantContext.getTenantId();
    }
}
