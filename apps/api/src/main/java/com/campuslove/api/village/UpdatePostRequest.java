package com.campuslove.api.village;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 编辑帖子请求体（P1-1「更新帖子」，2026-11-03）。
 *
 * <p>语义：<b>全量替换</b>标题/正文/标签/图片四个内容字段（与发帖一致的校验口径），
 * 未出现在请求体中的可选字段按「清空」处理——半更新（PATCH）会让「删除一张图」
 * 和「字段缺失」不可区分，UGC 编辑一律全量提交更可证伪。</p>
 *
 * <p>不可编辑字段（刻意不支持，防越权/防口径漂移）：</p>
 * <ul>
 *   <li>{@code category / targetType / targetId / visibility / circleId}——
 *       可见范围与圈层归属在发布时已校验（圈子成员/校园认证），放开编辑等于
 *       允许作者把帖子事后挪进自己已退出的圈子；如需迁移属后台运营职责</li>
 *   <li>{@code activityId}——活动关联由发布时确定</li>
 *   <li>{@code mentionedUserIds}——@提及关系在发布时已落库并通知，编辑不重发</li>
 * </ul>
 *
 * <p>提交成功后帖子回到 {@code audit_status=pending} 重新过审（编辑留痕见
 * {@code posts.edited_at / edit_count}）。</p>
 */
public record UpdatePostRequest(
    // 标题长度口径与 CreatePostRequest / VillagePostService 完全一致（5-30 字）
    @Size(min = 5, max = 30) String title,
    @NotBlank @Size(max = 5000) String content,
    @Size(max = 20) List<@Size(max = 20) String> tags,
    @Size(max = 9) List<String> images
) {
}
