package com.campuslove.api.clientconfig;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.config.MatchConfig;
import com.campuslove.api.config.SecurityUtils;
import com.campuslove.api.entity.MatchConfigEntity;
import com.campuslove.api.entity.NotifyConfig;
import com.campuslove.api.repository.MatchConfigEntityRepository;
import com.campuslove.api.repository.NotifyConfigRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 客户端 DB 配置读取控制器（缺陷修复：后台配置下发链路打通）。
 *
 * <p>背景：管理后台（AdminNotifyConfigController / AdminMatchConfigController）
 * 将配置写入 {@code notify_config} / {@code match_config} 表，但客户端此前
 * 没有读取这些 DB 配置的端点（ConfigController 的 5 个端点均为内置默认值），
 * 造成「后台修改 → 客户端无感知」的数据互通缺口。</p>
 *
 * <p>本控制器在 real profile 下激活，提供两个高价值配置项的动态读取端点，
 * 打通「后台写入 DB → 客户端读取 DB」链路，修改后立即生效（不缓存）：
 * <ul>
 *   <li>GET /api/v1/config/notify-config - 通知配置（启停状态 + 模板），
 *       读取 {@code notify_config} 表，DB 无数据/异常时降级为「全部类型启用」默认值</li>
 *   <li>GET /api/v1/config/match-config  - 匹配配置（key/value），
 *       以内存 {@link MatchConfig} 默认值为底，DB 值覆盖，与
 *       {@code AdminMatchConfigService.getMatchConfig()} 语义一致</li>
 * </ul></p>
 *
 * <p>鉴权：与 ConfigController 一致，通过 {@link SecurityUtils#getCurrentUserId()}
 * 触发鉴权，未登录返回 401。</p>
 *
 * <p>降级保证：DB 查询异常时不抛 500，返回内置默认值，保证客户端首屏可用。</p>
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/config")
public class ClientDbConfigController {

    private static final Logger log = LoggerFactory.getLogger(ClientDbConfigController.class);

    /** DB 无数据时的默认通知类型列表（与 Flyway seed 保持一致） */
    private static final List<String> DEFAULT_NOTIFY_TYPES =
            List.of("LIKE", "COMMENT", "FOLLOW", "VISITOR", "MATCH", "SYSTEM");

    private final NotifyConfigRepository notifyConfigRepository;
    private final MatchConfigEntityRepository matchConfigRepository;
    private final MatchConfig matchConfig;

    public ClientDbConfigController(
            NotifyConfigRepository notifyConfigRepository,
            MatchConfigEntityRepository matchConfigRepository,
            MatchConfig matchConfig) {
        this.notifyConfigRepository = notifyConfigRepository;
        this.matchConfigRepository = matchConfigRepository;
        this.matchConfig = matchConfig;
    }

    /**
     * 获取通知配置列表（按 type 升序）。
     *
     * @return 通知配置视图列表
     */
    @GetMapping("/notify-config")
    public ResponseEntity<List<ClientNotifyConfigView>> getNotifyConfig() {
        // 触发鉴权校验：未登录用户将收到 401
        SecurityUtils.getCurrentUserId();
        try {
            List<NotifyConfig> entities = notifyConfigRepository.findAllByOrderByTypeAsc();
            if (entities.isEmpty()) {
                return ResponseEntity.ok(buildDefaultNotifyConfig());
            }
            List<ClientNotifyConfigView> views = entities.stream()
                    .map(e -> new ClientNotifyConfigView(
                            e.getType(),
                            e.getEnabled() != null ? e.getEnabled() : Boolean.TRUE,
                            e.getTemplate(),
                            e.getUpdatedAt() != null ? e.getUpdatedAt().toString() : null))
                    .toList();
            return ResponseEntity.ok(views);
        } catch (DataAccessException e) {
            // 数据库查询异常时降级为默认配置，避免影响客户端
            log.warn("查询 notify_config 表失败，降级返回默认通知配置", e);
            return ResponseEntity.ok(buildDefaultNotifyConfig());
        }
    }

    /**
     * 获取匹配配置（key/value 映射）。
     *
     * <p>始终先放入内存 {@link MatchConfig} 默认值（保证未持久化的字段也有返回），
     * 再用 {@code match_config} 表的值覆盖，与管理后台读取语义一致。</p>
     *
     * @return 匹配配置键值映射
     */
    @GetMapping("/match-config")
    public ResponseEntity<Map<String, String>> getMatchConfig() {
        SecurityUtils.getCurrentUserId();
        Map<String, String> values = new LinkedHashMap<>();
        putMatchConfigDefaults(values);
        try {
            for (MatchConfigEntity entity : matchConfigRepository.findAll()) {
                if (entity.getConfigKey() != null) {
                    values.put(entity.getConfigKey(), entity.getConfigValue());
                }
            }
        } catch (DataAccessException e) {
            // 数据库查询失败时降级使用内存默认值
            log.warn("查询 match_config 表失败，仅返回内存默认匹配配置", e);
        }
        return ResponseEntity.ok(values);
    }

    /**
     * 将内存 MatchConfig bean 的当前值放入 Map（作为默认值兜底）。
     * 键与 match_config 表 / 管理后台 MatchConfigView 保持一致。
     */
    private void putMatchConfigDefaults(Map<String, String> values) {
        values.put("heartSignalExpireHours", String.valueOf(matchConfig.getHeartSignalExpireHours()));
        values.put("candidatePageSize", String.valueOf(matchConfig.getCandidatePageSize()));
        values.put("defaultChatDuration", String.valueOf(matchConfig.getDefaultChatDuration()));
        values.put("campusWeight", String.valueOf(matchConfig.getCampusWeight()));
        values.put("cityWeight", String.valueOf(matchConfig.getCityWeight()));
        values.put("interestWeight", String.valueOf(matchConfig.getInterestWeight()));
        values.put("scheduleWeight", String.valueOf(matchConfig.getScheduleWeight()));
    }

    /**
     * 构建默认通知配置（DB 无数据时降级使用）。
     */
    private List<ClientNotifyConfigView> buildDefaultNotifyConfig() {
        LocalDateTime now = LocalDateTime.now(TimeZones.BUSINESS);
        return DEFAULT_NOTIFY_TYPES.stream()
                .map(type -> new ClientNotifyConfigView(type, Boolean.TRUE, null, now.toString()))
                .toList();
    }
}
