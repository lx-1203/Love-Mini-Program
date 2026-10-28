package com.campuslove.api.chat;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.MediaAsset;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.media.MediaAssetService;
import com.campuslove.api.media.MediaStorageService;
import com.campuslove.api.repository.TempChatContactExchangeRepository;
import com.campuslove.api.repository.TempChatMessageRepository;
import com.campuslove.api.repository.TempChatSessionRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.test.util.ReflectionTestUtils;

/** 临时会话材料保留期清理（2026-10-28）：hold 跳过、到期删文件/消息。 */
class TempChatCleanupMaterialsTest {

    @Mock private TempChatContactExchangeRepository contactExchangeRepository;
    @Mock private TempChatSessionService sessionService;
    @Mock private TempChatSessionRepository sessionRepository;
    @Mock private RedissonClient redissonClient;
    @Mock private RLock lock;
    @Mock private TempChatMessageRepository messageRepository;
    @Mock private MediaAssetService mediaAssetService;
    @Mock private MediaStorageService mediaStorageService;

    private TempChatCleanupService service;

    @BeforeEach
    void setUp() throws InterruptedException {
        MockitoAnnotations.openMocks(this);
        service = new TempChatCleanupService(
                contactExchangeRepository, sessionService, sessionRepository, redissonClient);
        ReflectionTestUtils.setField(service, "tempChatMessageRepository", messageRepository);
        ReflectionTestUtils.setField(service, "mediaAssetService", mediaAssetService);
        ReflectionTestUtils.setField(service, "mediaStorageService", mediaStorageService);
        ReflectionTestUtils.setField(service, "graceHours", 24L);
        when(redissonClient.getLock(anyString())).thenReturn(lock);
        when(lock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(lock.isHeldByCurrentThread()).thenReturn(true);
    }

    private MediaAsset asset(long id, String url, LocalDateTime holdUntil) {
        MediaAsset asset = new MediaAsset();
        asset.setId(id);
        asset.setUrl(url);
        asset.setCategory("TEMP_CHAT");
        asset.setHoldUntil(holdUntil);
        return asset;
    }

    @Test
    void cleanup_deletesExpiredAssetsButSkipsHeld() {
        MediaAsset expired = asset(1L, "/api/v1/media/temp/s/202610/a.png", null);
        MediaAsset held = asset(2L, "/api/v1/media/temp/s/202610/b.png",
                LocalDateTime.now().plusDays(10));
        when(mediaAssetService.findExpiredTempAssets(any())).thenReturn(List.of(expired, held));
        when(sessionRepository.findByPhaseInAndClosesAtBefore(any(), any())).thenReturn(List.of());

        service.cleanupRetainedMaterials();

        verify(mediaStorageService).delete(expired.getUrl());
        verify(mediaAssetService).markTempDeleted(expired);
        verify(mediaStorageService, never()).delete(held.getUrl());
        verify(mediaAssetService, never()).markTempDeleted(held);
        verify(lock).unlock();
    }

    @Test
    void cleanup_deletesMessagesAndAssetsForSessionsPastGrace() {
        TempChatSession session = new TempChatSession();
        session.setId(9L);
        session.setSessionUid("session-old");
        session.setPhase(SessionPhase.expired);
        session.setClosesAt(LocalDateTime.now().minusHours(30));
        when(mediaAssetService.findExpiredTempAssets(any())).thenReturn(List.of());
        when(sessionRepository.findByPhaseInAndClosesAtBefore(any(), any())).thenReturn(List.of(session));
        MediaAsset asset = asset(3L, "/api/v1/media/temp/session-old/202610/c.png", null);
        when(mediaAssetService.findTempAssetsBySession(9L)).thenReturn(List.of(asset));
        when(messageRepository.deleteBySessionId(9L)).thenReturn(4L);

        service.cleanupRetainedMaterials();

        verify(messageRepository).deleteBySessionId(eq(9L));
        verify(mediaStorageService).delete(asset.getUrl());
        verify(mediaAssetService).markTempDeleted(asset);
    }
}
