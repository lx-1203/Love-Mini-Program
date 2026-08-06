package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.auth.OnlineUserService;
import com.campuslove.api.auth.TokenBlacklistService;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.testdata.ControllerTestBase;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.client.HttpClientErrorException;

/**
 * 管理后台 - 在线用户管理控制器单元测试（eladmin「在线用户」对齐，P2-A）。
 *
 * <p>覆盖：</p>
 * <ul>
 *   <li>列表：返回在线用户视图（userId/昵称/登录方式/登录时间），昵称批量补全</li>
 *   <li>列表：用户已删除时昵称为 null（不报错）</li>
 *   <li>踢下线：在线 → jti 加入黑名单（TTL=剩余有效期）+ 删除会话</li>
 *   <li>踢下线：用户不在线 → IllegalArgumentException（400）</li>
 *   <li>未认证（无当前用户）→ 401</li>
 * </ul>
 */
class OnlineUserAdminControllerTest extends ControllerTestBase {

    private static final Long ADMIN_ID = 100L;
    private static final Long TARGET_USER_ID = 200L;

    @Mock private OnlineUserService onlineUserService;
    @Mock private TokenBlacklistService tokenBlacklistService;
    @Mock private UserRepository userRepository;
    private OnlineUserAdminController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new OnlineUserAdminController(onlineUserService, tokenBlacklistService, userRepository);
    }

    /** 构造一个未来 1 小时过期的在线会话记录 */
    private OnlineUserService.OnlineSessionRecord sessionRecord(String jti, String method) {
        long now = System.currentTimeMillis();
        return new OnlineUserService.OnlineSessionRecord(jti, method, now, now + 3600_000L);
    }

    @Test
    @DisplayName("列表：返回在线用户视图，昵称批量补全")
    void listOnlineUsers_shouldReturnViewsWithNickname() {
        // Arrange
        OnlineUserService.OnlineSessionEntry entry =
                new OnlineUserService.OnlineSessionEntry(TARGET_USER_ID, sessionRecord("jti-1", "wechat"));
        when(onlineUserService.listOnlineSessions()).thenReturn(List.of(entry));
        User user = new User();
        user.setId(TARGET_USER_ID);
        user.setNickname("在线用户甲");
        when(userRepository.findByIdIn(any())).thenReturn(List.of(user));

        withUserId(ADMIN_ID, () -> {
            // Act
            List<OnlineUserView> views = controller.listOnlineUsers().data();

            // Assert
            assertEquals(1, views.size());
            OnlineUserView view = views.get(0);
            assertEquals(TARGET_USER_ID, view.userId());
            assertEquals("在线用户甲", view.nickname());
            assertEquals("wechat", view.loginMethod());
            assertTrue(view.loginAt() != null && !view.loginAt().isBlank(), "登录时间不应为空");
        });
    }

    @Test
    @DisplayName("列表：用户已被删除 → 昵称为 null（不报错）")
    void listOnlineUsers_withDeletedUser_shouldHaveNullNickname() {
        // Arrange：会话存在但 UserRepository 查不到该用户
        OnlineUserService.OnlineSessionEntry entry =
                new OnlineUserService.OnlineSessionEntry(TARGET_USER_ID, sessionRecord("jti-1", "admin"));
        when(onlineUserService.listOnlineSessions()).thenReturn(List.of(entry));
        when(userRepository.findByIdIn(any())).thenReturn(List.of());

        withUserId(ADMIN_ID, () -> {
            List<OnlineUserView> views = controller.listOnlineUsers().data();
            assertEquals(1, views.size());
            assertEquals(null, views.get(0).nickname(), "用户已删除时昵称为 null");
        });
    }

    @Test
    @DisplayName("踢下线：在线 → jti 加入黑名单（TTL=剩余有效期）+ 删除会话")
    void kickOnlineUser_withOnlineSession_shouldRevokeAndRemove() {
        // Arrange
        OnlineUserService.OnlineSessionRecord record = sessionRecord("jti-kick", "phone");
        when(onlineUserService.getSession(TARGET_USER_ID)).thenReturn(Optional.of(record));

        withUserId(ADMIN_ID, () -> {
            // Act
            controller.kickOnlineUser(TARGET_USER_ID);

            // Assert：黑名单撤销（jti + 正 TTL）+ 会话删除
            verify(tokenBlacklistService).revoke(eq("jti-kick"), anyLong());
            verify(onlineUserService).removeLogin(TARGET_USER_ID);
        });
    }

    @Test
    @DisplayName("踢下线：用户不在线 → IllegalArgumentException（400），不撤销黑名单")
    void kickOnlineUser_withoutOnlineSession_shouldThrow() {
        // Arrange
        when(onlineUserService.getSession(TARGET_USER_ID)).thenReturn(Optional.empty());

        withUserId(ADMIN_ID, () -> {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.kickOnlineUser(TARGET_USER_ID));
            assertEquals("该用户当前不在线", ex.getMessage());
            verify(tokenBlacklistService, never()).revoke(any(), anyLong());
            verify(onlineUserService, never()).removeLogin(any());
        });
    }

    @Test
    @DisplayName("踢下线：未认证（无当前用户）→ 401")
    void kickOnlineUser_withoutAuthentication_shouldThrow401() {
        withoutUserId(() -> {
            assertThrows(HttpClientErrorException.Unauthorized.class,
                    () -> controller.kickOnlineUser(TARGET_USER_ID));
        });
    }
}
