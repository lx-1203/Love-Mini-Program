package com.campuslove.api.village;

/**
 * 点赞响应。
 */
public record PostLikeResponse(boolean success, boolean liked, int likeCount) {
}
