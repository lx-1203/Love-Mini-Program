package com.campuslove.api.chat;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 聊天页概况接口
 *
 * 提供聊天页所需的聚合数据：临时聊天会话列表、空状态引导文案与推荐人物卡片。
 * 后端复用 {@link TempChatService} 完成会话聚合与推荐查询。
 */
@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

  private final TempChatService tempChatService;

  public ChatController(TempChatService tempChatService) {
    this.tempChatService = tempChatService;
  }

  /**
   * 获取聊天页概况数据。
   *
   * 包含：
   * <ul>
   *   <li>当前用户的临时聊天会话列表（按最近活跃时间倒序）</li>
   *   <li>空状态引导文案（无会话时展示）</li>
   *   <li>推荐人物卡片（用于"可能感兴趣的人"模块）</li>
   * </ul>
   *
   * @return 聊天页概况视图
   */
  @GetMapping("/overview")
  public ChatOverviewView getOverview() {
    return tempChatService.getOverview();
  }
}

/**
 * 聊天页概况视图
 *
 * @param sessions         当前用户的临时聊天会话列表
 * @param emptyStateLead   空状态引导文案（无会话时展示）
 * @param recommendedPeople 推荐人物卡片列表
 */
record ChatOverviewView(
    List<ChatSessionSummaryView> sessions,
    String emptyStateLead,
    List<RecommendedPersonCardView> recommendedPeople
) {
}

/**
 * 聊天会话摘要视图
 *
 * @param id                    会话 ID
 * @param recommendedPersonId   关联的推荐人物 ID
 * @param partnerName           对方昵称
 * @param partnerHeadline       对方一句话签名
 * @param availabilityHint      可用性提示（如"今晚 22:00 前"）
 * @param phase                 会话阶段（如"破冰期"、"升温期"）
 * @param closesAt              会话关闭时间（ISO 8601）
 * @param closedReason          关闭原因（如"已交换联系方式"、"超时未回复"）
 * @param lastMessagePreview    最近一条消息预览文本
 * @param lastMessageSentAt     最近一条消息发送时间（ISO 8601）
 * @param contactExchangeStatus 联系方式交换状态
 * @param pinned                是否置顶
 * @param unreadCount           未读消息数
 */
record ChatSessionSummaryView(
    String id,
    String recommendedPersonId,
    String partnerName,
    String partnerHeadline,
    String availabilityHint,
    String phase,
    String closesAt,
    String closedReason,
    String lastMessagePreview,
    String lastMessageSentAt,
    String contactExchangeStatus,
    boolean pinned,
    int unreadCount
) {
}

/**
 * 推荐人物卡片视图（聊天页"可能感兴趣的人"模块）
 *
 * @param id           人物 ID
 * @param name         昵称
 * @param initials     头像缺失时的占位首字母
 * @param headline     一句话签名
 * @param commonGround 共同点描述（如"同校 · 同专业"）
 * @param availability 可用性描述（如"今天有空"）
 */
record RecommendedPersonCardView(
    String id,
    String name,
    String initials,
    String headline,
    String commonGround,
    String availability
) {
}
