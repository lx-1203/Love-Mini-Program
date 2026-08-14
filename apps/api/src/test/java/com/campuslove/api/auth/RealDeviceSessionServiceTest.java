package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.common.ResourceNotFoundException;
import com.campuslove.api.repository.UserDeviceSessionRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * 真实设备会话服务单元测试（3-D 设备管理）。
 *
 * <p>覆盖：</p>
 * <ul>
 *   <li>recordLogin：UPSERT（新建 / 同设备更新复活 / deviceId 空兜底 "unknown"）</li>
 *   <li>revokeDevice：属主校验（非本人设备 403）、不存在 404、已吊销幂等、
 *       吊销后 jti 加入黑名单</li>
 *   <li>revokeAllUserTokens：全部未吊销设备置 revoked 并吊销 jti</li>
 * </ul>
 */
class RealDeviceSessionServiceTest {

    private UserDeviceSessionRepository repository;
    private TokenBlacklistService tokenBlacklistService;
    private RealDeviceSessionService service;

    @BeforeEach
    void setUp() {
        repository = mock(UserDeviceSessionRepository.class);
        tokenBlacklistService = mock(TokenBlacklistService.class);
        // jwtConfig 传 null：TTL 走 24h 兜底常量
        service = new RealDeviceSessionService(repository, tokenBlacklistService, null);
    }

    // ---- recordLogin ----

    @Test
    void recordLogin_newDevice_createsSession() {
        when(repository.findByUserIdAndDeviceId(100L, "device-abc")).thenReturn(Optional.empty());

        service.recordLogin(100L, "device-abc", "wechat", "jti-1");

        verify(repository).save(any(UserDeviceSession.class));
    }

    @Test
    void recordLogin_existingDevice_revivesAndUpdatesJti() {
        UserDeviceSession existing = buildSession(1L, 100L, "device-abc", "old-jti", true);
        when(repository.findByUserIdAndDeviceId(100L, "device-abc")).thenReturn(Optional.of(existing));

        service.recordLogin(100L, "device-abc", "wechat", "new-jti");

        assertFalse(existing.getRevoked(), "同设备再次登录应复活（revoked=false）");
        assertEquals("new-jti", existing.getLastTokenJti(), "应更新最近 jti");
        assertEquals("wechat", existing.getPlatform());
        verify(repository).save(existing);
    }

    @Test
    void recordLogin_blankDeviceId_fallsBackToUnknown() {
        when(repository.findByUserIdAndDeviceId(100L, "unknown")).thenReturn(Optional.empty());

        service.recordLogin(100L, "  ", "phone", "jti-1");

        verify(repository).findByUserIdAndDeviceId(eq(100L), eq("unknown"));
        verify(repository).save(any(UserDeviceSession.class));
    }

    // ---- listDevices ----

    @Test
    void listDevices_returnsSessionsOrderedByLastActive() {
        when(repository.findByUserIdOrderByLastActiveAtDesc(100L))
                .thenReturn(List.of(buildSession(1L, 100L, "device-a", "jti-1", false)));

        List<UserDeviceSessionView> views = service.listDevices(100L);

        assertEquals(1, views.size());
        assertEquals("device-a", views.get(0).deviceId());
        assertFalse(views.get(0).revoked());
    }

    // ---- revokeDevice ----

    @Test
    void revokeDevice_notFound_throws404() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.revokeDevice(100L, 999L));
    }

    @Test
    void revokeDevice_notOwner_throws403() {
        UserDeviceSession session = buildSession(1L, 200L, "device-other", "jti-1", false);
        when(repository.findById(1L)).thenReturn(Optional.of(session));

        assertThrows(OperationForbiddenException.class, () -> service.revokeDevice(100L, 1L),
                "非本人设备吊销应抛 403");
        verify(repository, never()).save(any(UserDeviceSession.class));
        verify(tokenBlacklistService, never()).revoke(anyString(), anyLong());
    }

    @Test
    void revokeDevice_owner_marksRevokedAndBlacklistsJti() {
        UserDeviceSession session = buildSession(1L, 100L, "device-a", "jti-1", false);
        when(repository.findById(1L)).thenReturn(Optional.of(session));

        service.revokeDevice(100L, 1L);

        assertTrue(session.getRevoked(), "应标记 revoked=true");
        verify(tokenBlacklistService).revoke(eq("jti-1"), anyLong());
    }

    @Test
    void revokeDevice_alreadyRevoked_isIdempotent() {
        UserDeviceSession session = buildSession(1L, 100L, "device-a", "jti-1", true);
        when(repository.findById(1L)).thenReturn(Optional.of(session));

        service.revokeDevice(100L, 1L);

        // 幂等：不重复加入黑名单
        verify(tokenBlacklistService, never()).revoke(anyString(), anyLong());
    }

    // ---- revokeAllUserTokens ----

    @Test
    void revokeAllUserTokens_revokesAllActiveSessions() {
        UserDeviceSession s1 = buildSession(1L, 100L, "device-a", "jti-1", false);
        UserDeviceSession s2 = buildSession(2L, 100L, "device-b", "jti-2", false);
        when(repository.findByUserIdAndRevokedFalse(100L)).thenReturn(List.of(s1, s2));

        service.revokeAllUserTokens(100L);

        assertTrue(s1.getRevoked());
        assertTrue(s2.getRevoked());
        verify(tokenBlacklistService).revoke(eq("jti-1"), anyLong());
        verify(tokenBlacklistService).revoke(eq("jti-2"), anyLong());
    }

    /** 构造测试用设备会话实体。 */
    private UserDeviceSession buildSession(Long id, Long userId, String deviceId,
                                           String jti, boolean revoked) {
        UserDeviceSession session = new UserDeviceSession();
        session.setId(id);
        session.setUserId(userId);
        session.setDeviceId(deviceId);
        session.setPlatform("wechat");
        session.setLastTokenJti(jti);
        session.setLastActiveAt(LocalDateTime.now());
        session.setRevoked(revoked);
        session.setCreatedAt(LocalDateTime.now().minusDays(1));
        session.setUpdatedAt(LocalDateTime.now());
        return session;
    }
}
