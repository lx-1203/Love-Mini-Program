package com.campuslove.api.clientconfig;

import java.util.List;

/**
 * 法律文本列表响应。
 * 客户端 legal-texts.ts 统一按 {@code { items: [...] }} 解析；后端不再返回裸对象。
 */
public record LegalTextListResponse(List<LegalTextView> items) {
}
