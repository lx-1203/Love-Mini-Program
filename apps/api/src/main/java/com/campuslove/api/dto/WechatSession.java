package com.campuslove.api.dto;

/**
 * 微信 code2Session 返回的会话信息。
 * sessionKey 仅供服务端使用，绝不返回给客户端。
 */
public record WechatSession(String openid, String sessionKey, String unionid) {
}