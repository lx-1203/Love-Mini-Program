package com.campuslove.api.official;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.ratelimit.RateLimit;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 官方号 Controller（2026-08-07 官方号体系）。
 *
 * <p>提供官方号列表与消息流拉取：</p>
 * <ul>
 *   <li>GET /api/v1/official-accounts —— 启用账号列表（消息列表官方号会话用）</li>
 *   <li>GET /api/v1/official-accounts/{code}/messages —— 某官方号消息流（发布时间升序）</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/official-accounts")
@Validated
public class OfficialAccountController {

    private final OfficialAccountService officialAccountService;
    private final OfficialChatService officialChatService;

    public OfficialAccountController(OfficialAccountService officialAccountService,
                                     OfficialChatService officialChatService) {
        this.officialAccountService = officialAccountService;
        this.officialChatService = officialChatService;
    }

    /**
     * 获取启用官方账号列表。
     * GET /api/official-accounts
     *
     * @return 账号视图列表（按 sortOrder 升序）
     */
    @GetMapping
    @RateLimit(capacity = 60, refillTokens = 1, key = "#request.remoteAddr")
    public List<OfficialAccountView> getAccounts() {
        return officialAccountService.getAccounts();
    }

    /**
     * 获取某官方号的消息流。
     * GET /api/official-accounts/{code}/messages
     *
     * @param code 官方号唯一标识（official-assistant / official-promoter）
     * @return 消息视图列表（发布时间升序）；账号不存在或已下线时返回空列表
     */
    @GetMapping("/{code}/messages")
    @RateLimit(capacity = 60, refillTokens = 1, key = "#request.remoteAddr")
    public ResponseEntity<List<OfficialMessageView>> getMessages(
            @PathVariable("code")
            @NotBlank(message = ErrorMessages.CODE_REQUIRED)
            @Size(max = 32, message = ErrorMessages.CODE_MAX_LENGTH) String code) {
        List<OfficialMessageView> messages = officialAccountService.getMessages(code);
        // R16（2026-09-07）：合并当前登录用户与该官方号的双向会话消息（时间归并升序），
        // 使寻觅助手会话在刷新后仍保留用户发送与助手回复
        Long userId = SecurityUtils.getCurrentUserIdOrNull();
        if (userId != null) {
            List<OfficialMessageView> conversation = officialChatService.getConversation(code, userId);
            if (!conversation.isEmpty()) {
                messages = mergeByTime(messages, conversation);
            }
        }
        // 账号不存在：返回空列表（与消息列表官方号会话的静态渲染语义一致）
        return ResponseEntity.ok(messages);
    }

    /**
     * 用户向官方号发送一条消息（R16 2026-09-07）。
     * POST /api/v1/official-accounts/{code}/messages { content }
     * 消息落库并返回 [用户消息, 助手回复]（direction 区分）。
     */
    @PostMapping("/{code}/messages")
    @RateLimit(capacity = 30, refillTokens = 1, key = "#request.remoteAddr")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<OfficialMessageView>> sendMessage(
            @PathVariable("code")
            @NotBlank(message = ErrorMessages.CODE_REQUIRED)
            @Size(max = 32, message = ErrorMessages.CODE_MAX_LENGTH) String code,
            @RequestBody OfficialChatSendRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        List<OfficialMessageView> result =
                officialChatService.sendUserMessage(code, userId, request.content());
        return ResponseEntity.ok(result);
    }

    /** 发送请求体。 */
    public record OfficialChatSendRequest(
            @NotBlank(message = ErrorMessages.CONTENT_REQUIRED)
            @Size(max = 500, message = ErrorMessages.CONTENT_MAX_LENGTH_PREFIX + "500") String content) {
    }

    /** 广播流与会话消息按发布时间归并（稳定排序，时间相同保持传入顺序）。 */
    private static List<OfficialMessageView> mergeByTime(List<OfficialMessageView> broadcast,
                                                         List<OfficialMessageView> conversation) {
        List<OfficialMessageView> merged = new ArrayList<>(broadcast.size() + conversation.size());
        merged.addAll(broadcast);
        merged.addAll(conversation);
        merged.sort(java.util.Comparator.comparing(
                OfficialMessageView::publishedAt,
                java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())));
        return merged;
    }
}
