package com.aiscript.modules.script.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.project.dto.ShareLinkCreateDTO;
import com.aiscript.modules.project.vo.ShareLinkVO;
import com.aiscript.modules.script.dto.ReviewCommentDTO;
import com.aiscript.modules.script.dto.ReviewDecisionDTO;
import com.aiscript.modules.script.service.ScriptReviewService;
import com.aiscript.modules.script.vo.ScriptAccessVO;
import com.aiscript.modules.script.vo.ScriptReviewCommentVO;
import com.aiscript.modules.script.vo.ScriptReviewContextVO;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ScriptReviewController {
    private final ScriptReviewService service;
    public ScriptReviewController(ScriptReviewService service) { this.service = service; }

    @GetMapping("/scripts/{scriptId}/access")
    public R<ScriptAccessVO> access(@PathVariable Integer scriptId) { return R.ok(service.internalAccess(scriptId)); }

    @PostMapping("/scripts/{scriptId}/review-links")
    public R<ShareLinkVO> createLink(@PathVariable Integer scriptId, @RequestBody(required = false) ShareLinkCreateDTO dto) {
        return R.ok(service.createLink(scriptId, dto));
    }

    @DeleteMapping("/scripts/{scriptId}/review-links/{linkId}")
    public R<Void> revokeLink(@PathVariable Integer scriptId, @PathVariable Integer linkId) {
        service.revokeLink(scriptId, linkId);
        return R.ok();
    }

    @GetMapping("/scripts/{scriptId}/review-comments")
    public R<List<ScriptReviewCommentVO>> internalComments(@PathVariable Integer scriptId) { return R.ok(service.internalComments(scriptId)); }

    @PostMapping("/scripts/{scriptId}/review-comments")
    public R<ScriptReviewCommentVO> internalComment(@PathVariable Integer scriptId, @Valid @RequestBody ReviewCommentDTO dto) {
        return R.ok(service.addInternalComment(scriptId, dto));
    }

    @GetMapping("/script-reviews/{token}")
    public R<ScriptReviewContextVO> context(@PathVariable String token) { return R.ok(service.context(token)); }

    @PostMapping("/script-reviews/{token}/comments")
    public R<ScriptReviewCommentVO> comment(@PathVariable String token, @Valid @RequestBody ReviewCommentDTO dto) {
        return R.ok(service.addComment(token, dto));
    }

    @PutMapping("/script-review-comments/{commentId}")
    public R<ScriptReviewCommentVO> updateComment(@PathVariable Integer commentId, @Valid @RequestBody ReviewCommentDTO dto) {
        return R.ok(service.updateComment(commentId, dto));
    }

    @DeleteMapping("/script-review-comments/{commentId}")
    public R<Void> deleteComment(@PathVariable Integer commentId) { service.deleteComment(commentId); return R.ok(); }

    @PostMapping("/script-reviews/{token}/decision")
    public R<Void> decision(@PathVariable String token, @Valid @RequestBody ReviewDecisionDTO dto) {
        service.submitDecision(token, dto); return R.ok();
    }
}
