package com.campuslove.api.admin;

import com.campuslove.api.official.OfficialAccountService;
import com.campuslove.api.official.OfficialAccountView;
import com.campuslove.api.official.OfficialMessageView;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台 - 官方号只读控制器（2026-08-07 官方号体系）。
 *
 * <p>运营侧查看官方号账号列表与消息流（只读版；推送能力列入后续迭代）。</p>
 *
 * <p>数据隔离说明：官方号为<b>全局资源</b>（官方号内容面向全平台用户，不区分校区），
 * 不做校区数据隔离。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/official-accounts")
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class AdminOfficialAccountController {

    private final OfficialAccountService officialAccountService;

    public AdminOfficialAccountController(OfficialAccountService officialAccountService) {
        this.officialAccountService = officialAccountService;
    }

    /**
     * 获取全部启用官方账号列表。
     * GET /api/v1/admin/official-accounts
     *
     * @return 账号视图列表
     */
    @GetMapping
    public List<OfficialAccountView> getAccounts() {
        return officialAccountService.getAccounts();
    }

    /**
     * 获取某官方号的消息流（发布时间升序）。
     * GET /api/v1/admin/official-accounts/{code}/messages
     *
     * @param code 官方号唯一标识
     * @return 消息视图列表；账号不存在或已下线时返回空列表
     */
    @GetMapping("/{code}/messages")
    public ResponseEntity<List<OfficialMessageView>> getMessages(
            @PathVariable("code")
            @NotBlank(message = "code 不能为空")
            @Size(max = 32, message = "code 长度不能超过 32") String code) {
        List<OfficialMessageView> messages = officialAccountService.getMessages(code);
        return ResponseEntity.ok(messages);
    }
}
