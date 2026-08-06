package com.campuslove.api.chat;

import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.vip.VipRedPacketService;
import com.campuslove.api.vip.VipRedPacketService.RedPacketView;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 聊天红包控制器。
 * <p>提供聊天会话维度的红包列表查询接口，供前端在聊天会话页展示历史红包。</p>
 *
 * <p>接口列表：</p>
 * <ul>
 *   <li>GET /api/chat/{chatId}/red-packets：查询指定会话下的红包列表（按创建时间倒序）</li>
 * </ul>
 *
 * <p>设计说明：
 * <ul>
 *   <li>与 {@link com.campuslove.api.vip.VipRedPacketController} 区分：
 *       VipRedPacketController 处理 VIP 红包的创建/领取/详情，路径前缀 /api/vip/red-packets；</li>
 *   <li>本控制器仅负责"会话维度"的红包列表查询，路径前缀 /api/chat；
 *       复用 {@link VipRedPacketService#listByChatId(String)} 实现查询逻辑。</li>
 * </ul>
 * </p>
 *
 * <p>权限说明：/api/** 路径要求已认证，操作用户 ID 从 JWT 上下文获取。
 * 列表接口已校验当前用户是否为会话成员（resolveSessionForCurrentUser），
 * 非成员返回 403，防止枚举他人会话红包列表。</p>
 *
 * <p>错误处理：
 * <ul>
 *   <li>chatId 为空 → IllegalArgumentException（400，由 GlobalExceptionHandler 转换）</li>
 *   <li>查询异常 → RuntimeException（500）</li>
 * </ul>
 * </p>
 *
 * <p>mp-weixin 兼容：前端通过 uni.request 调用此接口，
 * 响应体为 JSON 数组，与微信小程序兼容。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/chat")
public class ChatRedPacketController {

    private static final Logger log = LoggerFactory.getLogger(ChatRedPacketController.class);

    private final VipRedPacketService redPacketService;
    private final TempChatSessionService tempChatSessionService;

    public ChatRedPacketController(
            VipRedPacketService redPacketService,
            TempChatSessionService tempChatSessionService) {
        this.redPacketService = redPacketService;
        this.tempChatSessionService = tempChatSessionService;
    }

    /**
     * 查询指定会话下的红包列表。
     *
     * <p>用于聊天会话页展示历史红包消息，按创建时间倒序排列。
     * 仅返回基础红包信息（含发送者、金额、状态等），不包含领取记录列表，
     * 避免数据量过大。如需查看领取详情，调用 GET /api/vip/red-packets/{id}。</p>
     *
     * <p>权限说明：当前用户 ID 从 JWT 上下文获取；校验当前用户必须是会话参与者，
     * 非参与者抛 OperationForbiddenException（403），防止枚举他人会话的红包列表。</p>
     *
     * @param chatId 聊天会话 ID（URL 路径参数，必填，最长 128 字符）
     * @return 红包视图列表（按创建时间倒序，不含领取记录）
     * @throws IllegalArgumentException chatId 为空时抛出
     */
    @GetMapping("/{chatId}/red-packets")
    public List<RedPacketView> listByChatId(
            @PathVariable("chatId")
            @NotBlank
            @Size(max = 128)
            String chatId) {

        Long userId = SecurityUtils.getCurrentUserId();
        // 修复（R2 review MED）：会话成员校验，防止越权查看他人会话红包列表
        tempChatSessionService.resolveSessionForCurrentUser(chatId);
        log.info("查询会话红包列表：userId={}, chatId={}", userId, chatId);

        try {
            // 委托给 VipRedPacketService 完成查询
            return redPacketService.listByChatId(chatId);
        } catch (IllegalArgumentException e) {
            // 参数校验失败，向上抛出由 GlobalExceptionHandler 转换为 400
            throw e;
        } catch (RuntimeException e) {
            log.error("查询会话红包列表失败：userId={}, chatId={}", userId, chatId, e);
            throw e;
        }
    }
}
