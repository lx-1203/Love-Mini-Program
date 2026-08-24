package com.campuslove.api.draft;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.config.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 发布草稿控制器。
 *
 * <ul>
 *   <li>POST /api/v1/drafts —— 保存/更新当前用户草稿（双写：前端本地兜底 + 后端同步）。</li>
 *   <li>GET  /api/v1/drafts/current —— 获取当前用户草稿（无则返回 null）。</li>
 *   <li>DELETE /api/v1/drafts/current —— 发布成功后清除草稿。</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/drafts")
public class DraftController {

    private final DraftService draftService;

    public DraftController(DraftService draftService) {
        this.draftService = draftService;
    }

    /** 保存/更新当前用户草稿。 */
    @PostMapping
    public ApiResponse<DraftView> save(@Valid @RequestBody SaveDraftRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(draftService.save(userId, request));
    }

    /** 获取当前用户草稿（无草稿时 data 为 null）。 */
    @GetMapping("/current")
    public ApiResponse<DraftView> current() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(draftService.get(userId));
    }

    /** 删除当前用户草稿（发布成功后调用）。 */
    @DeleteMapping("/current")
    public ApiResponse<Void> delete() {
        Long userId = SecurityUtils.getCurrentUserId();
        draftService.delete(userId);
        return ApiResponse.empty();
    }
}
