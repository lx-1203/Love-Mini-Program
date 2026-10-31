package com.campuslove.api.profile;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * 主页运营配置（2.0 Profile Config 层）。
 *
 * <p>两个数值字段带范围约束：这条 PUT 是后台写路径，值会被原样序列化进
 * {@code app_config} 并下发给客户端解释（本仓 Java 侧没有任何消费方）。
 * 不设上下界时，管理员可以存下 {@code maxStories=0}（主页一条都不出）或
 * {@code 100000}（客户端按它去取），也可以存下 {@code minHighQualityScore=-5}
 * 让「高质量阈值」变成永真条件——校验必须守在写入边界，而不是等下游去猜。</p>
 *
 * @param showMBTI             是否展示 MBTI
 * @param showVoice            是否展示语音
 * @param showCircle           是否展示圈层
 * @param maxStories           主页最多展示条数，1..50（默认 6）
 * @param minHighQualityScore  高质量内容分阈值，0..100（默认 90）
 */
public record ProfileConfigView(
        boolean showMBTI,
        boolean showVoice,
        boolean showCircle,
        @Min(value = 1, message = "maxStories 至少为 1")
        @Max(value = 50, message = "maxStories 至多为 50")
        int maxStories,
        @Min(value = 0, message = "minHighQualityScore 不能为负")
        @Max(value = 100, message = "minHighQualityScore 至多为 100")
        int minHighQualityScore
) {
}
