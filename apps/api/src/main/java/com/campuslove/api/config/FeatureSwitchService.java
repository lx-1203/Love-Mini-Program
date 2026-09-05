package com.campuslove.api.config;

import com.campuslove.api.entity.AdminAppSwitch;
import com.campuslove.api.repository.AdminAppSwitchRepository;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

/**
 * 商业化/视频上传功能开关读取服务（批次 A / ADR-2）。
 *
 * <p>统一读取 {@code app_switch} 表中批次 A 新增的 6 个开关 key
 * （{@link FeatureSwitchKeys}），<b>缺省值一律为 false（封存态）</b>：</p>
 * <ul>
 *   <li>开关行缺失 → false（防止漏 seed 时商业化裸奔）；</li>
 *   <li>查询异常（数据库抖动）→ false（封存安全优先于可用性）；</li>
 *   <li>mock profile（排除 HibernateJpaAutoConfiguration，无
 *       {@link AdminAppSwitchRepository} bean）→ false。</li>
 * </ul>
 *
 * <p>注意语义反转：既有通用开关（{@code maintenance_mode} 等）缺失默认 true
 * （见 {@code RealAppConfigService#isSwitchEnabled}），本服务与之相反，
 * 消费方（切面 / 媒体上传）必须经由本服务读取，禁止绕过。</p>
 *
 * <p>性能：付费写端点为低频操作，每次请求 1-2 次单行唯一索引查询，可接受；
 * 不引入自缓存（避免 AOP/事务自调用代理问题）。</p>
 */
@Service
public class FeatureSwitchService {

    private static final Logger log = LoggerFactory.getLogger(FeatureSwitchService.class);

    /** app_switch 仓库可选注入：real profile 存在；mock profile 无 JPA 时为 null */
    private final ObjectProvider<AdminAppSwitchRepository> switchRepositoryProvider;

    public FeatureSwitchService(ObjectProvider<AdminAppSwitchRepository> switchRepositoryProvider) {
        this.switchRepositoryProvider = switchRepositoryProvider;
    }

    /**
     * 查询单个开关是否开启（缺省 false）。
     *
     * @param switchKey 开关 key（{@link FeatureSwitchKeys} 常量）
     * @return true=开启；false=关闭或缺失或查询异常
     */
    public boolean isEnabled(String switchKey) {
        AdminAppSwitchRepository repository = switchRepositoryProvider.getIfAvailable();
        if (repository == null) {
            // mock profile（无 JPA）：封存态
            return false;
        }
        try {
            return repository.findBySwitchKey(switchKey)
                    .map(AdminAppSwitch::getEnabled)
                    .orElse(Boolean.FALSE);
        } catch (RuntimeException e) {
            log.warn("查询功能开关失败，按封存处理: key={}, error={}", switchKey, e.getMessage());
            return false;
        }
    }

    /**
     * 查询商业化模块是否开启（总闸 + 子闸与运算，Q2）。
     *
     * <p>总闸 {@link FeatureSwitchKeys#COMMERCE_ENABLED} 为 false 时无视子闸直接封存；
     * 总闸为 true 时按子闸 key 各自生效。若传入的 module 即总闸 key，等价于
     * {@link #isEnabled(String)}。</p>
     *
     * @param moduleKey 商业化子闸 key（如 {@link FeatureSwitchKeys#COMMERCE_VIP}）
     * @return true=该模块开放；false=封存
     */
    public boolean isCommerceEnabled(String moduleKey) {
        if (Objects.equals(moduleKey, FeatureSwitchKeys.COMMERCE_ENABLED)) {
            return isEnabled(moduleKey);
        }
        if (!isEnabled(FeatureSwitchKeys.COMMERCE_ENABLED)) {
            return false;
        }
        return isEnabled(moduleKey);
    }

    /**
     * 查询视频上传是否开放（独立闸，与商业化总闸解耦）。
     *
     * @return true=视频上传开放；false=封存（type=video 上传被拒）
     */
    public boolean isVideoUploadEnabled() {
        return isEnabled(FeatureSwitchKeys.UPLOAD_VIDEO_ENABLED);
    }
}
