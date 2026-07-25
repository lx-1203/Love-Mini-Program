package com.campuslove.api.growth;

import com.campuslove.api.entity.DoNotDisturbSetting;
import com.campuslove.api.repository.DoNotDisturbSettingRepository;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 真实通知免打扰服务实现（功能6）。
 *
 * <p>在 real profile 下激活，使用 DoNotDisturbSettingRepository 实现数据库持久化。</p>
 *
 * <p>错误处理：
 * <ul>
 *   <li>userId 为空 → 抛出 IllegalArgumentException</li>
 *   <li>CUSTOM 模式下 customWeekdays 为空 → 抛出 IllegalArgumentException</li>
 *   <li>startTime/endTime 时间相同 → 抛出 IllegalArgumentException（无意义的免打扰时段）</li>
 * </ul>
 * </p>
 */
@Profile("real")
@Service
public class RealDoNotDisturbService implements DoNotDisturbService {

    private static final Logger log = LoggerFactory.getLogger(RealDoNotDisturbService.class);

    private final DoNotDisturbSettingRepository repository;

    /**
     * 构造函数，注入免打扰设置 Repository。
     *
     * @param repository 免打扰设置数据访问层
     */
    public RealDoNotDisturbService(DoNotDisturbSettingRepository repository) {
        this.repository = repository;
    }

    /**
     * 获取指定用户的免打扰设置。
     * 如果用户尚未设置，则返回默认偏好（关闭、22:00-08:00、EVERYDAY、允许紧急穿透）。
     *
     * @param userId 用户 ID
     * @return 免打扰设置视图
     * @throws IllegalArgumentException 当 userId 为空时
     */
    @Override
    @Transactional(readOnly = true)
    public DoNotDisturbView getSetting(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }

        // 用户无记录时返回默认偏好，不持久化（避免无谓写入）
        DoNotDisturbSetting setting = repository.findByUserId(userId)
                .orElseGet(() -> {
                    log.debug("用户[{}]尚无免打扰设置记录，返回默认偏好", userId);
                    DoNotDisturbSetting defaultSetting = new DoNotDisturbSetting();
                    defaultSetting.setUserId(userId);
                    defaultSetting.setEnabled(false);
                    defaultSetting.setStartTime("22:00");
                    defaultSetting.setEndTime("08:00");
                    defaultSetting.setRepeatMode("EVERYDAY");
                    defaultSetting.setCustomWeekdays(null);
                    defaultSetting.setAllowUrgent(true);
                    return defaultSetting;
                });

        return toView(setting);
    }

    /**
     * 更新指定用户的免打扰设置。
     * 如果用户尚无记录，则自动创建；已有记录则覆盖更新。
     *
     * <p>业务校验：
     * <ul>
     *   <li>CUSTOM 模式下 customWeekdays 不能为空</li>
     *   <li>startTime 与 endTime 不能完全相同（无意义的免打扰时段）</li>
     *   <li>customWeekdays 仅允许 1-7 的 CSV 字符串</li>
     * </ul>
     * </p>
     *
     * @param userId  用户 ID
     * @param request 免打扰设置请求
     * @return 更新后的免打扰设置视图
     * @throws IllegalArgumentException 当 userId 为空或参数业务校验失败时
     */
    @Override
    @Transactional
    public DoNotDisturbView updateSetting(Long userId, DoNotDisturbRequest request) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        if (request == null) {
            throw new IllegalArgumentException("request is required");
        }

        // 业务校验：CUSTOM 模式下 customWeekdays 必填
        if ("CUSTOM".equals(request.repeatMode())) {
            if (request.customWeekdays() == null || request.customWeekdays().isBlank()) {
                throw new IllegalArgumentException("CUSTOM 模式下必须指定 customWeekdays");
            }
            // 校验每个值在 1-7 范围内
            String[] parts = request.customWeekdays().split(",");
            for (String part : parts) {
                try {
                    int day = Integer.parseInt(part.trim());
                    if (day < 1 || day > 7) {
                        throw new IllegalArgumentException("customWeekdays 的值必须在 1-7 范围内: " + part);
                    }
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("customWeekdays 必须为数字 CSV: " + part);
                }
            }
        }

        // 业务校验：startTime 与 endTime 不能完全相同（允许跨天，如 22:00-08:00）
        if (request.startTime().equals(request.endTime())) {
            throw new IllegalArgumentException("开始时间与结束时间不能相同");
        }

        // 查找已有记录或创建新记录
        DoNotDisturbSetting setting = repository.findByUserId(userId)
                .orElseGet(() -> {
                    log.info("用户[{}]尚无免打扰设置记录，创建新记录", userId);
                    DoNotDisturbSetting newSetting = new DoNotDisturbSetting();
                    newSetting.setUserId(userId);
                    return newSetting;
                });

        // 覆盖更新所有字段
        setting.setEnabled(request.enabled());
        setting.setStartTime(request.startTime());
        setting.setEndTime(request.endTime());
        setting.setRepeatMode(request.repeatMode());
        // 非 CUSTOM 模式下清空 customWeekdays，避免脏数据
        setting.setCustomWeekdays("CUSTOM".equals(request.repeatMode()) ? request.customWeekdays() : null);
        setting.setAllowUrgent(request.allowUrgent());
        setting.setUpdatedAt(LocalDateTime.now());

        DoNotDisturbSetting saved = repository.save(setting);
        log.info("用户[{}]免打扰设置已更新: enabled={}, time={}~{}, repeat={}, allowUrgent={}",
                userId, saved.getEnabled(), saved.getStartTime(), saved.getEndTime(),
                saved.getRepeatMode(), saved.getAllowUrgent());

        return toView(saved);
    }

    /**
     * 将实体转换为视图。
     *
     * @param setting 免打扰设置实体
     * @return 视图对象
     */
    private DoNotDisturbView toView(DoNotDisturbSetting setting) {
        return new DoNotDisturbView(
                Boolean.TRUE.equals(setting.getEnabled()),
                setting.getStartTime(),
                setting.getEndTime(),
                setting.getRepeatMode(),
                setting.getCustomWeekdays(),
                Boolean.TRUE.equals(setting.getAllowUrgent())
        );
    }
}
