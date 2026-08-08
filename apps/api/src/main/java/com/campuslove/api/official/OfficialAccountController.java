package com.campuslove.api.official;

import com.campuslove.api.common.ErrorMessages;
import com.campuslove.api.ratelimit.RateLimit;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

    public OfficialAccountController(OfficialAccountService officialAccountService) {
        this.officialAccountService = officialAccountService;
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
        // 账号不存在：返回空列表（与消息列表官方号会话的静态渲染语义一致）
        return ResponseEntity.ok(messages);
    }
}
