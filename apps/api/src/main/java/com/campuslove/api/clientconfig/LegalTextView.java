package com.campuslove.api.clientconfig;

/**
 * 法律文本视图（P0-22）。
 *
 * <p>对应客户端 {@code GET /api/v1/config/legal?type=privacy_policy|user_agreement}
 * 返回的单条文本结构（content 为长文本）：</p>
 * <ul>
 *   <li>title —— 文本标题（如"用户协议"/"隐私政策"）</li>
 *   <li>content —— 正文（纯文本，含章节编号，客户端原样展示）</li>
 *   <li>updatedAt —— 最后更新时间（ISO 8601 字符串）</li>
 * </ul>
 *
 * @param title     文本标题
 * @param content   正文长文本
 * @param updatedAt 最后更新时间（ISO 8601）
 */
public record LegalTextView(
        String title,
        String content,
        String updatedAt
) {
}
