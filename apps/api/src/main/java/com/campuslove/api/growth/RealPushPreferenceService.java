package com.campuslove.api.growth;

import com.campuslove.api.entity.PushPreference;
import com.campuslove.api.repository.PushPreferenceRepository;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实推送偏好服务实现。
 * 在 real profile 下激活，使用 PushPreferenceRepository 实现数据库持久化。
 */
@Profile("real")
@Service
public class RealPushPreferenceService implements PushPreferenceService {

    private static final Logger log = LoggerFactory.getLogger(RealPushPreferenceService.class);

    private final PushPreferenceRepository pushPreferenceRepository;

    /**
     * 构造函数，注入推送偏好 Repository。
     *
     * @param pushPreferenceRepository 推送偏好数据访问层
     */
    public RealPushPreferenceService(PushPreferenceRepository pushPreferenceRepository) {
        this.pushPreferenceRepository = pushPreferenceRepository;
    }

    /**
     * 获取指定用户的推送偏好设置。
     * 如果用户尚未设置，则返回默认偏好。
     *
     * @param userId 用户 ID
     * @return 推送偏好设置（包含默认值的实体，可能是新建的未持久化对象）
     */
    @Override
    @Transactional(readOnly = true)
    public PushPreference getPreference(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        return pushPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    log.debug("用户[{}]尚无推送偏好记录，返回默认偏好", userId);
                    PushPreference defaultPref = new PushPreference();
                    defaultPref.setUserId(userId);
                    defaultPref.setPushEnabled(true);
                    defaultPref.setPushFrequency(1);
                    defaultPref.setActiveHours(null);
                    return defaultPref;
                });
    }

    /**
     * 更新指定用户的推送偏好设置。
     * 如果用户尚无偏好记录，则自动创建。
     *
     * @param userId         用户 ID
     * @param pushEnabled    是否启用推送
     * @param pushFrequency  每日最大推送次数
     * @param activeHours    活跃时段
     * @return 更新后的推送偏好设置
     */
    @Override
    @Transactional
    public PushPreference updatePreference(Long userId, Boolean pushEnabled,
                                           Integer pushFrequency, String activeHours) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        PushPreference preference = pushPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    log.info("用户[{}]尚无推送偏好记录，创建新记录", userId);
                    PushPreference newPref = new PushPreference();
                    newPref.setUserId(userId);
                    return newPref;
                });

        if (pushEnabled != null) {
            preference.setPushEnabled(pushEnabled);
        }
        if (pushFrequency != null) {
            if (pushFrequency < 1 || pushFrequency > 10) {
                throw new IllegalArgumentException("pushFrequency must be between 1 and 10");
            }
            preference.setPushFrequency(pushFrequency);
        }
        if (activeHours != null) {
            preference.setActiveHours(activeHours);
        }
        preference.setUpdatedAt(LocalDateTime.now());

        PushPreference saved = pushPreferenceRepository.save(preference);
        log.debug("用户[{}]推送偏好已更新: enabled={}, frequency={}, activeHours={}",
                userId, saved.getPushEnabled(), saved.getPushFrequency(), saved.getActiveHours());
        return saved;
    }
}