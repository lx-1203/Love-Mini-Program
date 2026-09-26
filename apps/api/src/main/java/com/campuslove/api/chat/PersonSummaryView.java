package com.campuslove.api.chat;

import java.util.List;

/**
 * 消息首页推荐人摘要视图（新用户冷启动）。
 */
public record PersonSummaryView(
        Long userId,
        String name,
        String avatarUrl,
        String headline,
        List<String> tags,
        String distanceText,
        /** 当前请求者是否已喜欢该用户（likes 表真源，非客户端本地镜像） */
        boolean liked) {
}
