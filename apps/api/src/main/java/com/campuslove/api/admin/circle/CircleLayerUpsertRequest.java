package com.campuslove.api.admin.circle;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 圈层写入请求体（P2：不再把 {@code @Entity CircleLayer} 直接当请求体，2026-10-31）。
 *
 * <p><b>缺陷基线（修复前）</b>：{@code CircleLayerController} 的 POST/PUT 用实体接 body，
 * 而 {@code JpaRepository.save()} 对「id 非空的游离实体」执行 <b>MERGE</b>，于是：
 * <ul>
 *   <li>POST 带 {@code {"id": 已存在ID}} 不是插入新行，而是<b>覆盖那一行</b>；</li>
 *   <li>body 里没写的字段被当作 null 落库——最要命的是 {@code parent_id} 可以被静默抹掉，
 *       子树随之脱离父节点，按 {@code circle_path} 前缀授权的管理员数据域被悄悄改写；</li>
 *   <li>客户端 JSON 还直接拥有 {@code createdAt}/{@code updatedAt} 两个审计列，
 *       等于允许伪造审计轨迹。</li>
 * </ul>
 * 本 DTO 是<b>白名单</b>：只有下面这些字段能进写路径。{@code id}、时间戳、以及
 * 嵌套 {@code parent} 对象都没有通道——父节点改由 {@code parentId} 表达，
 * 服务端按 ID 取回真实节点后再挂接。</p>
 *
 * <p>{@code null} 语义（PUT）：「本次不改」。POST 则要求 name/level/circlePath 齐备
 * （由控制器显式校验，注解只负责形状与取值范围）。</p>
 *
 * @param name         圈层名称（非空，≤64 字；PUT 传 null 表示不改）
 * @param level        层级：1 公司 / 2 区域 / 3 学校（挂父节点时必须等于父层级 +1）
 * @param parentId     父圈层 ID（PUT 传 null 表示<b>保持现有父节点</b>，不是「解除挂载」）
 * @param unlinkParent 显式解除挂载（把 parent_id 置空）：必须显式传 true，
 *                     与 {@code parentId} 互斥；这是唯一能让 parent_id 变 null 的入口
 * @param circlePath   圈层路径（形如 {@code C1/R1/S1}；列 NOT NULL 且唯一，
 *                     <b>不会自动生成</b>，改父节点时必须同步给出新路径）
 * @param status       状态：仅接受 {@code active} / {@code disabled}，取值由服务端白名单裁定
 * @param color        色阶（≤16 字）
 * @param sort         同级排序值
 * @since 2026-10-31
 */
public record CircleLayerUpsertRequest(

        @Size(max = 64, message = "圈层名称最长 64 字") String name,

        @Min(value = 1, message = "圈层层级只能是 1/2/3")
        @Max(value = 3, message = "圈层层级只能是 1/2/3") Integer level,

        Long parentId,

        Boolean unlinkParent,

        @Size(max = 256, message = "圈层路径最长 256 字") String circlePath,

        @Pattern(regexp = "active|disabled", message = "圈层状态只能是 active 或 disabled") String status,

        @Size(max = 16, message = "圈层色阶最长 16 字") String color,

        Integer sort) {

    /** 状态白名单：启用 */
    public static final String STATUS_ACTIVE = "active";

    /** 状态白名单：停用 */
    public static final String STATUS_DISABLED = "disabled";

    /**
     * 是否显式要求解除挂载。
     *
     * @return true 表示请求把 parent_id 置空
     */
    public boolean wantsUnlink() {
        return Boolean.TRUE.equals(unlinkParent);
    }
}
