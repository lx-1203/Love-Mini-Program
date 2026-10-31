package com.campuslove.api.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

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
        // 2026-10-31：清理任务改为「只传等待时间、不传租期」（Redisson 看门狗续期），
        // 两个重载都要打桩——固定 30s 租期会在大表清理中途静默过期，放第二个实例进来重删。
        when(lock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
        when(lock.tryLock(anyLong(), any(TimeUnit.class))).thenReturn(true);
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

    /** 记录 begin/commit 的真实事务管理器，用来断言解锁发生在提交之后。 */
    private static final class RecordingTxManager extends AbstractPlatformTransactionManager {
        private final List<String> events;

        RecordingTxManager(List<String> events) {
            this.events = events;
        }

        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            events.add("tx-begin");
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            events.add("tx-commit");
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            events.add("tx-rollback");
        }
    }

    @Test
    @DisplayName("保留期清理：锁在事务提交后才释放（否则另一实例能重删同一批文件/消息）")
    void retainedMaterialsCleanup_releasesLockOnlyAfterCommit() throws Exception {
        List<String> events = Collections.synchronizedList(new ArrayList<>());
        doAnswer(inv -> {
            events.add("lock");
            return true;
        }).when(lock).tryLock(anyLong(), any(TimeUnit.class));
        doAnswer(inv -> {
            events.add("unlock");
            return null;
        }).when(lock).unlock();

        MediaAsset expired = asset(11L, "/api/v1/media/temp/s/202611/a.png", null);
        when(mediaAssetService.findExpiredTempAssets(any())).thenReturn(List.of(expired));
        when(sessionRepository.findByPhaseInAndClosesAtBefore(any(), any())).thenReturn(List.of());
        doAnswer(inv -> {
            events.add("delete");
            return null;
        }).when(mediaStorageService).delete(expired.getUrl());

        new TransactionTemplate(new RecordingTxManager(events))
                .executeWithoutResult(status -> service.runRetainedMaterialsCleanup());

        assertEquals(List.of("tx-begin", "lock", "delete", "tx-commit", "unlock"), events,
                "删除是 @Transactional 里的写操作：finally 提前解锁会让第二个实例在提交前拿到锁、"
                        + "对同一批资产再删一次（文件已删还会计数翻倍）");
        verify(lock).unlock();
    }
}
