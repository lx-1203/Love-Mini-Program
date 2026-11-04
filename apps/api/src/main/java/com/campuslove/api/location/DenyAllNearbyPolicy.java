package com.campuslove.api.location;

import com.campuslove.api.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * {@link NearbyVisibilityPolicy} 的<b>当前生产实现：一律拒绝</b>。
 *
 * <p>这不是「懒实现」，而是本库现状下唯一诚实的取值——库里没有「同意被附近的人看到」
 * 这一位（论证见 {@link NearbyVisibilityPolicy} 类注释）。证明不了授权就返回身份字段，
 * 等于把「没有证据」当成「有证据」用，正是第六轮 W1b F-W1b-1 判定的缺陷本体。</p>
 *
 * <p><b>TODO(F-W1b-1-H)：本实现是临时 deny，不是终态。</b>它把「附近的人」这一面在
 * 授权位落地之前整体关掉了。这件事由静态门
 * {@code NearbySubjectBindingStaticGateTest#denyPolicyCarriesMachineReadableHandoff}
 * 与 {@code ...#consentColumnAndDenyPolicyCannotCoexist} 双向看住：
 * 摘掉本行标记即红；迁移里一旦补出地理曝光同意位而本实现还在，也即红
 * （功能被永久打死而没人知道，比暂时关掉更糟）。标记字符串本身是门禁的判据，
 * 改名前请先改门。</p>
 *
 * <p><b>B-1 拍板（R14-2，2026-11-05）：维持 deny-all 为「附近的人」的产品终态，直至授权列落地。</b>
 * 该授权位（地理曝光同意位）的引入属隐私合规工程，依赖《用户隐私保护指引》等法律性质材料——
 * 按委托口径归入法律门禁排除项；交接清单（下方 3 条前置）保持有效，静态门双向看护不变。</p>
 *
 * <p><b>等待授权列落地 —— 解除拒绝的前置条件（交接项，见 round-6-fix-lane-W1b-authz 交付报告）</b>：
 * <ol>
 *   <li>新增迁移给 {@code users} 补一个<b>默认关闭</b>的地理曝光同意位
 *       （形如 {@code nearby_visible TINYINT(1) NOT NULL DEFAULT 0}，并配
 *       {@code nearby_consent_at} 留痕时间），默认值必须是 0——存量行不能被迁移「顺带授权」；</li>
 *   <li>用户侧有可关闭该位的入口，且注销清单（{@code PersonalDataTables}）
 *       与个人数据导出把这一位算作处理依据；</li>
 *   <li>替换本实现，读取该位；判点
 *       {@code NearbySubjectBindingStaticGateTest} 与 {@code GeoServiceNearbyAuthzTest}
 *       的正反两组用例已经把「未授权不出现在结果里」钉死，替换实现时会自动复红。</li>
 * </ol>
 *
 * <p>本类不做任何数据库写入，也不接受任何外部输入，因此可以安全地在 mock/real 两档共存。</p>
 */
@Component
public class DenyAllNearbyPolicy implements NearbyVisibilityPolicy {

    private static final Logger log = LoggerFactory.getLogger(DenyAllNearbyPolicy.class);

    @Override
    public boolean isDiscoverableTo(User candidate, Long requesterId) {
        if (candidate == null || requesterId == null) {
            return false;
        }
        // 没有同意位 ⇒ 无法证明授权 ⇒ deny。留一条 DEBUG 便于运维确认「附近的人为空」
        // 是授权缺失（设计如此），而不是坐标数据丢了（那是另一个缺陷）。
        log.debug("附近的人授权判定 deny：候选={} 主体={}，原因=库中不存在地理曝光同意位",
                candidate.getId(), requesterId);
        return false;
    }
}
