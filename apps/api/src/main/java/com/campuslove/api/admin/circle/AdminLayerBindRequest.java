package com.campuslove.api.admin.circle;

/**
 * 管理员-圈层绑定写入请求体（P2：不再把 {@code @Entity AdminLayer} 直接当请求体，2026-10-31）。
 *
 * <p><b>缺陷基线（修复前）</b>：{@code AdminLayerController} 的 POST 与 PUT（替换式）
 * 用实体接 body，并走 {@code save}/{@code saveAll}——对「id 非空的游离实体」即 MERGE。
 * 于是 body 里带上别人已有的绑定行 ID 会<b>覆盖那一行</b>（把某管理员的绑定改到别的圈层），
 * 未写的字段被置空，而 {@code createdAt} 由客户端 JSON 直接决定（审计轨迹可伪造）。</p>
 *
 * <p>本 DTO 是白名单：没有 {@code id}，也没有 {@code createdAt}。绑定行一律由服务端
 * 新建（id 交给自增主键、时间戳取服务端当前时间）。PUT 替换式接口的 {@code adminId}
 * 以<b>路径变量</b>为唯一权威，body 里的 {@code adminId} 只是历史客户端的冗余字段，
 * 读进来也只做一致性校验、不参与写入。</p>
 *
 * @param adminId       管理员用户 ID（POST 必填；PUT 时以路径变量为准，body 值被忽略）
 * @param circleLayerId 绑定的圈层节点 ID（必填）
 * @param roleCode      角色冗余副本，必须等于该账号的 {@code users.role}（见控制器校验）
 * @since 2026-10-31
 */
public record AdminLayerBindRequest(
        Long adminId,
        Long circleLayerId,
        String roleCode) {
}
