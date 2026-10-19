package com.campuslove.api.profile;

/**
 * 「我们有 N 个共同点」模块的结构化条目（R6/L07 契约升级，2026-10-19）。
 *
 * <p>替代原先 {@code Relation.commonInterests: List<String>} + 客户端按 {@code "标签/副标题"}
 * 字符串拆分的权宜约定（该约定把 "/" 变成保留字符、副标题无法独立国际化，
 * 见 {@code apps/client/src/api/profile.ts} 的 deriveCommonInterests 注释）。
 * {@code commonInterests} 字段保留不删（客户端与后台仍在消费），本结构是叠加。</p>
 *
 * <p><b>保真纪律</b>：三个字段都只在库里存在真实来源时才给值，否则为 {@code null}，
 * 不允许服务端或客户端查表编造。当前实测来源与有值率（campus_love 库，2026-10-19）：</p>
 * <ul>
 *   <li>{@code title} —— 必有值。来源两类：
 *     ① 双方 {@code user_basic_profile.interest_tags}（JSON，213/213 有记录、213 条非空数组）的交集词；
 *     ② 关系型共同点「同校 / 同城 / 同龄」，分别由 {@code user_campus_profile.campus_name}
 *     （273/273）、{@code user_campus_profile.city_name}（273/273）、
 *     {@code user_basic_profile.birth_year}（208/213）推导。</li>
 *   <li>{@code subtitle} —— 关系型共同点有真值（同校=校名、同城=城市名、同龄=对方年龄）；
 *     兴趣标签型条目当前恒为 {@code null}：唯一候选来源 {@code interest_tag} 字典的
 *     {@code category} 列实测 0/8 有值（{@code group_key} 虽 8/8 有值，但它是内部分组键、
 *     取值恒为 "lifestyle"，不是面向用户的副标题文案，拿来当副标题属于形态错配，故不使用）。</li>
 *   <li>{@code icon} —— 当前恒为 {@code null}：{@code interest_tag.icon} 实测 0/8 有值。
 *     后台（{@code AdminInterestTagController}）补齐字典后本字段即自动变为真值，
 *     客户端 {@code PublicCommon.vue} 的 TAG_ICON_KEYS 查表映射届时可退役。</li>
 * </ul>
 *
 * @param title    共同点主名（兴趣词本身，如 "摄影"；或 "同校"/"同城"/"同龄"）。
 *                 刻意不拼 "都喜欢XX" 前缀 —— 前缀是展示层文案，属于客户端 i18n 职责
 * @param subtitle 灰色副标题；仅在有真实持久化来源时为文案，否则 {@code null}
 * @param icon     图标标识；仅在 {@code interest_tag.icon} 有值时下发，否则 {@code null}
 */
public record CommonPointDTO(String title, String subtitle, String icon) {
}
