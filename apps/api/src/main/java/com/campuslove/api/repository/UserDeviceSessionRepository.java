package com.campuslove.api.repository;

import com.campuslove.api.auth.UserDeviceSession;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 用户设备会话 Repository（3-D 设备管理）。
 * 提供基于用户 ID / 设备 ID 的查询与吊销能力。
 */
public interface UserDeviceSessionRepository extends JpaRepository<UserDeviceSession, Long> {

    /**
     * 查询指定用户的全部设备（含已吊销），按最近活跃时间倒序。
     *
     * @param userId 用户 ID
     * @return 设备列表
     */
    List<UserDeviceSession> findByUserIdOrderByLastActiveAtDesc(Long userId);

    /**
     * 查询指定用户的未吊销设备（用于「吊销该用户全部 token」）。
     *
     * @param userId 用户 ID
     * @return 未吊销设备列表
     */
    List<UserDeviceSession> findByUserIdAndRevokedFalse(Long userId);

    /**
     * 按用户 + 设备 ID 查询（吊销时校验属主）。
     *
     * @param userId   用户 ID
     * @param deviceId 设备 ID
     * @return 设备记录（Optional）
     */
    Optional<UserDeviceSession> findByUserIdAndDeviceId(Long userId, String deviceId);
}
