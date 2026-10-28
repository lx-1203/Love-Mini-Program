package com.campuslove.api.chat;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.TempChatSession.SessionPhase;
import com.campuslove.api.repository.TempChatSessionRepository;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 临时会话媒体访问控制（2026-10-28 强匿名 B）。
 *
 * <p>规则：</p>
 * <ul>
 *   <li>只有会话双方可上传/读取；非参与者一律 403（不区分「会话不存在」以免探测）；</li>
 *   <li>上传仅限未过期、未关闭的会话；</li>
 *   <li>读取允许到保留期截止（{@code closesAt + grace-hours}，默认 24h 宽限 ⇒ T+48h），
 *       到期后文件由清理任务物理删除。</li>
 * </ul>
 */
@Profile("real")
@Service
public class TempChatMediaService {

    private final TempChatSessionRepository sessionRepository;

    /** 会话关闭后的宽限小时数（默认 24h；会话本身 24h ⇒ 最终 T+48h 删除）。 */
    private final long graceHours;

    public TempChatMediaService(
            TempChatSessionRepository sessionRepository,
            @Value("${app.temp-chat.grace-hours:24}") long graceHours) {
        this.sessionRepository = sessionRepository;
        this.graceHours = Math.max(0, graceHours);
    }

    /** 上传前置：必须为参与者且会话可继续发送。 */
    @Transactional(readOnly = true)
    public TempChatSession requireUploadable(String sessionUid, Long userId) {
        TempChatSession session = requireParticipant(sessionUid, userId);
        if (session.getPhase() == SessionPhase.expired || session.getPhase() == SessionPhase.closed) {
            throw new AccessDeniedException("会话已结束，无法发送图片");
        }
        if (!LocalDateTime.now(TimeZones.BUSINESS).isBefore(retentionDeadline(session))) {
            throw new AccessDeniedException("会话已过保留期，无法发送图片");
        }
        return session;
    }

    /** 读取前置：必须为参与者且未过保留期。 */
    @Transactional(readOnly = true)
    public TempChatSession requireReadable(String sessionUid, Long userId) {
        TempChatSession session = requireParticipant(sessionUid, userId);
        if (session.getPhase() == SessionPhase.expired
                || !LocalDateTime.now(TimeZones.BUSINESS).isBefore(retentionDeadline(session))) {
            throw new AccessDeniedException("会话已过期，图片不可访问");
        }
        return session;
    }

    /** 布尔版本（签名/探测用，不区分拒绝原因）。 */
    @Transactional(readOnly = true)
    public boolean canRead(String sessionUid, Long userId) {
        if (userId == null) {
            return false;
        }
        try {
            requireReadable(sessionUid, userId);
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    /** 会话保留期截止时刻（closesAt + 宽限）。 */
    public LocalDateTime retentionDeadline(TempChatSession session) {
        return session.getClosesAt().plusHours(graceHours);
    }

    private TempChatSession requireParticipant(String sessionUid, Long userId) {
        if (sessionUid == null || sessionUid.isBlank() || userId == null) {
            throw new AccessDeniedException("会话不存在或无权访问");
        }
        TempChatSession session = sessionRepository.findBySessionUid(sessionUid)
                .orElseThrow(() -> new AccessDeniedException("会话不存在或无权访问"));
        if (!userId.equals(session.getUserAId()) && !userId.equals(session.getUserBId())) {
            throw new AccessDeniedException("会话不存在或无权访问");
        }
        return session;
    }
}
