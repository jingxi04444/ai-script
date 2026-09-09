package com.aiscript.modules.workflow.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.integration.audio.MusicGenerationClient;
import com.aiscript.integration.image.ImageGenerationClient;
import com.aiscript.integration.llm.LlmClient;
import com.aiscript.integration.provider.AsyncProviderJobClient;
import com.aiscript.integration.tts.TtsClient;
import com.aiscript.integration.video.VideoAssemblyClient;
import com.aiscript.integration.video.VideoGenerationClient;
import com.aiscript.modules.workflow.dto.WorkflowProviderExecuteDTO;
import com.aiscript.modules.workflow.dto.WorkflowProviderPollDTO;
import com.aiscript.modules.system.entity.SysApiProviderConfig;
import com.aiscript.modules.system.service.ProviderConfigService;
import com.aiscript.modules.workflow.service.WorkflowProviderGatewayService;
import com.aiscript.modules.workflow.vo.WorkflowProviderExecuteVO;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class WorkflowProviderGatewayServiceImpl implements WorkflowProviderGatewayService {
    private static final Set<String> TEXT_KINDS = Set.of(
        "text", "scriptGenerator", "prompt", "categorySkill", "storyboard"
    );
    private final LlmClient llmClient;
    private final MusicGenerationClient musicGenerationClient;
    private final ImageGenerationClient imageGenerationClient;
    private final VideoGenerationClient videoGenerationClient;
    private final VideoAssemblyClient videoAssemblyClient;
    private final TtsClient ttsClient;
    private final ProviderConfigService providerConfigService;
    private final AsyncProviderJobClient asyncProviderJobClient;

    public WorkflowProviderGatewayServiceImpl(
        LlmClient llmClient,
        MusicGenerationClient musicGenerationClient,
        ImageGenerationClient imageGenerationClient,
        VideoGenerationClient videoGenerationClient,
        VideoAssemblyClient videoAssemblyClient,
        TtsClient ttsClient,
        ProviderConfigService providerConfigService,
        AsyncProviderJobClient asyncProviderJobClient
    ) {
        this.llmClient = llmClient;
        this.musicGenerationClient = musicGenerationClient;
        this.imageGenerationClient = imageGenerationClient;
        this.videoGenerationClient = videoGenerationClient;
        this.videoAssemblyClient = videoAssemblyClient;
        this.ttsClient = ttsClient;
        this.providerConfigService = providerConfigService;
        this.asyncProviderJobClient = asyncProviderJobClient;
    }

    @Override
    public WorkflowProviderExecuteVO execute(WorkflowProviderExecuteDTO dto) {
        String kind = dto.getNodeKind();
        Map<String, Object> config = dto.getConfig() == null ? Map.of() : dto.getConfig();
        Map<String, Object> inputs = dto.getInputs() == null ? Map.of() : dto.getInputs();
        if (TEXT_KINDS.contains(kind)) {
            String content = llmClient.chat(
                text(config, "systemPrompt"),
                prompt(config, inputs),
                text(config, "model")
            );
            return result(kind, Map.of("text", content));
        }
        if ("image".equals(kind)) {
            return result(kind, imageGenerationClient.generate(prompt(config, inputs), assetUrls(inputs), config));
        }
        if ("video".equals(kind)) {
            return result(kind, videoGenerationClient.generateVideoResult(
                prompt(config, inputs), text(config, "model")
            ));
        }
        if ("voice".equals(kind) || "audio".equals(kind)) {
            Map<String, Object> output = ttsClient.synthesizeResult(
                prompt(config, inputs),
                text(config, "voice"),
                text(config, "model")
            );
            Map<String, Object> enriched = new LinkedHashMap<>(output);
            enriched.put("voice", text(config, "voice"));
            return result(kind, enriched);
        }
        if ("music".equals(kind)) {
            return result(kind, musicGenerationClient.generate(prompt(config, inputs), config));
        }
        if ("editor".equals(kind) || "export".equals(kind)) {
            return result(kind, videoAssemblyClient.assemble(assetUrls(inputs), config));
        }
        throw new BusinessException(ResultCode.BUSINESS_ERROR, "节点类型暂未配置真实模型适配器：" + kind);
    }

    @Override
    public WorkflowProviderExecuteVO poll(WorkflowProviderPollDTO dto) {
        Integer providerId;
        try {
            providerId = Integer.valueOf(dto.getProviderId());
        } catch (NumberFormatException exception) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "Provider ID 格式不正确");
        }
        SysApiProviderConfig provider = providerConfigService.getEnabled(providerId);
        if (provider == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "异步 Provider 不存在或已停用");
        }
        return result(provider.getProviderType(), asyncProviderJobClient.poll(provider, dto.getTaskId()));
    }

    private WorkflowProviderExecuteVO result(String kind, Map<String, Object> output) {
        Map<String, Object> enriched = new LinkedHashMap<>(output);
        enriched.put("kind", kind);
        return new WorkflowProviderExecuteVO(kind, enriched);
    }

    private String prompt(Map<String, Object> config, Map<String, Object> inputs) {
        String direct = text(config, "prompt");
        if (!StringUtils.hasText(direct)) direct = text(config, "content");
        String upstream = upstreamText(inputs);
        if (!StringUtils.hasText(direct)) return upstream;
        return StringUtils.hasText(upstream) ? direct + "\n\n上游工作流资料：\n" + upstream : direct;
    }

    private String upstreamText(Map<String, Object> inputs) {
        Object upstream = inputs.get("upstream");
        if (!(upstream instanceof Map<?, ?> map)) return "";
        List<String> values = new ArrayList<>();
        map.values().forEach(value -> {
            if (value instanceof Map<?, ?> output) {
                Object outputText = output.get("text");
                if (outputText != null) values.add(String.valueOf(outputText));
                Object resource = output.get("resource");
                if (resource != null) values.add(String.valueOf(resource));
            }
        });
        return String.join("\n", values);
    }

    private List<String> assetUrls(Map<String, Object> inputs) {
        List<String> urls = new ArrayList<>();
        Object upstream = inputs.get("upstream");
        if (upstream instanceof Map<?, ?> map) {
            map.values().forEach(value -> collectAssetUrls(value, urls));
        }
        return urls.stream().distinct().toList();
    }

    private void collectAssetUrls(Object value, List<String> urls) {
        if (!(value instanceof Map<?, ?> map)) return;
        Object url = map.get("assetUrl");
        if (url != null && StringUtils.hasText(String.valueOf(url))) urls.add(String.valueOf(url));
        Object multiple = map.get("assetUrls");
        if (multiple instanceof List<?> list) {
            list.stream().filter(item -> item != null && StringUtils.hasText(String.valueOf(item)))
                .map(String::valueOf).forEach(urls::add);
        }
    }

    private String text(Map<String, Object> config, String key) {
        Object value = config.get(key);
        return value == null ? "" : String.valueOf(value);
    }
}
