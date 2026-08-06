package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 在线用户会话记录服务单元测试（eladmin「在线用户」对齐，P2-A）。
 *
 * <p>不注入 RedisTemplate（null），验证本地内存降级路径：记录/查询/列表/删除。</p>
 *
 * <p>覆盖：</p>
 * <ul>
 *   <li>recordLogin 记录会话 → getSession 可查到（含 jti/登录方式/登录时间）</li>
 *   <li>recordLogin 重复登录 → 覆盖为最新会话</li>
 *   <li>removeLogin 删除会话 → getSession 为空</li>
 *   <li>listOnlineSessions 列出全部在线会话</li>
 *   <li>剩余有效期计算（remainingTtlSeconds）</li>
 * </ul>
 */
class OnlineUserServiceTest {

    private OnlineUserService onlineUserService;

    @BeforeEach
    void setUp() {
        onlineUserService = new OnlineUserService();
        onlineUserService.clearLocalSessionsForTest();
    }

    @Test
    @DisplayName("recordLogin 后 getSession 可查到会话（jti/登录方式/登录时间）")
    void recordLogin_thenGetSession_shouldReturnRecord() {
        // Act
        onlineUserService.recordLogin(1L, "jti-1", "wechat", 3600L);

        // Assert
        Optional<OnlineUserService.OnlineSessionRecord> opt = onlineUserService.getSession(1L);
        assertTrue(opt.isPresent(), "登录后应存在在线会话");
        OnlineUserService.OnlineSessionRecord record = opt.get();
        assertEquals("jti-1", record.jti());
        assertEquals("wechat", record.loginMethod());
        assertFalse(record.loginAtIso().isBlank(), "登录时间应为 ISO 字符串");
        assertTrue(record.remainingTtlSeconds() > 0, "会话剩余有效期应大于 0");
    }

    @Test
    @DisplayName("重复登录（多端）→ 覆盖为最新会话")
    void recordLogin_twice_shouldKeepLatest() {
        // Act：同一用户先微信后手机号登录
        onlineUserService.recordLogin(1L, "jti-old", "wechat", 3600L);
        onlineUserService.recordLogin(1L, "jti-new", "phone", 3600L);

        // Assert：保留最新会话
        Optional<OnlineUserService.OnlineSessionRecord> opt = onlineUserService.getSession(1L);
        assertTrue(opt.isPresent());
        assertEquals("jti-new", opt.get().jti());
        assertEquals("phone", opt.get().loginMethod());
    }

    @Test
    @DisplayName("removeLogin 后 getSession 为空（登出清理）")
    void removeLogin_thenGetSession_shouldBeEmpty() {
        // Arrange
        onlineUserService.recordLogin(1L, "jti-1", "phone", 3600L);
        assertTrue(onlineUserService.getSession(1L).isPresent());

        // Act
        onlineUserService.removeLogin(1L);

        // Assert
        assertTrue(onlineUserService.getSession(1L).isEmpty(), "登出后在线会话应被删除");
    }

    @Test
    @DisplayName("listOnlineSessions 列出全部在线会话（含 userId 与登录方式）")
    void listOnlineSessions_shouldReturnAllOnlineUsers() {
        // Arrange
        onlineUserService.recordLogin(1L, "jti-1", "wechat", 3600L);
        onlineUserService.recordLogin(2L, "jti-2", "admin", 7200L);
        onlineUserService.recordLogin(3L, "jti-3", "phone", 3600L);

        // Act
        List<OnlineUserService.OnlineSessionEntry> entries = onlineUserService.listOnlineSessions();

        // Assert
        assertEquals(3, entries.size());
        assertTrue(entries.stream().anyMatch(e -> e.userId() == 1L && "wechat".equals(e.session().loginMethod())),
                "应包含微信登录用户 1");
        assertTrue(entries.stream().anyMatch(e -> e.userId() == 2L && "admin".equals(e.session().loginMethod())),
                "应包含管理员登录用户 2");
        assertTrue(entries.stream().anyMatch(e -> e.userId() == 3L && "phone".equals(e.session().loginMethod())),
                "应包含手机号登录用户 3");
    }

    @Test
    @DisplayName("removeLogin(null) 无副作用")
    void removeLogin_withNull_shouldBeNoOp() {
        onlineUserService.recordLogin(1L, "jti-1", "wechat", 3600L);
        // Act：null 用户不报错
        onlineUserService.removeLogin(null);
        // Assert：既有会话不受影响
        assertTrue(onlineUserService.getSession(1L).isPresent());
    }

    @Test
    @DisplayName("recordLogin 参数缺失（null jti）跳过记录")
    void recordLogin_withMissingJti_shouldSkip() {
        onlineUserService.recordLogin(1L, null, "wechat", 3600L);
        assertTrue(onlineUserService.getSession(1L).isEmpty(), "jti 缺失时不记录会话");
    }
}
