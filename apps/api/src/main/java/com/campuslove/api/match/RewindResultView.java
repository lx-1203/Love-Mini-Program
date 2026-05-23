package com.campuslove.api.match;

/**
 * 反悔(rewind)操作结果视图。
 * 用于返回反悔操作的成功/失败状态和原因说明。
 */
public record RewindResultView(
    boolean success,
    String message
) {}
