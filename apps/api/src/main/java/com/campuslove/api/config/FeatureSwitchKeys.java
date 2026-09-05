package com.campuslove.api.config;

/**
 * 商业化/视频上传功能开关 key 常量（批次 A 商业化封存）。
 *
 * <p>与 {@code app_switch} 表 seed（V2026.09.01.0001__seed_commerce_switches.sql）
 * 及管理后台「功能开关-商业化」分组一一对应。</p>
 *
 * <p><b>缺省语义（ADR-2）</b>：以下 key 在代码层缺省值一律为 {@code false}（封存态）——
 * 开关行缺失 / 查询异常 / mock（无 JPA）环境均按封存处理，防止漏 seed 时商业化裸奔。
 * 注意这与 {@link com.campuslove.api.growth.AppConfigService} 既有通用开关
 * （缺失默认 true）的语义相反，消费方必须经由
 * {@link FeatureSwitchService} / {@link CommerceGuardAspect} 读取，禁止直接查表。</p>
 *
 * <p><b>总闸与子闸关系（Q2）</b>：{@link #COMMERCE_ENABLED} 为商业化总闸，
 * false 时无视子闸全部封存；true 时按各子闸（vip/coin/course/consult）各自生效。
 * {@link #UPLOAD_VIDEO_ENABLED} 为视频上传独立闸，与商业化总闸解耦。</p>
 */
public final class FeatureSwitchKeys {

    /** 商业化总闸（false 时无视子闸全部封存） */
    public static final String COMMERCE_ENABLED = "commerce.enabled";

    /** 会员/VIP 子闸（拦截面：vip/* 购买/开通/兑换写端点） */
    public static final String COMMERCE_VIP = "commerce.vip";

    /** 虚拟货币子闸（拦截面：wallet 充值/扣费/解锁写端点） */
    public static final String COMMERCE_COIN = "commerce.coin";

    /** 付费课程子闸（拦截面：consulting 课程报名写端点） */
    public static final String COMMERCE_COURSE = "commerce.course";

    /** 付费咨询子闸（预留：独立咨询报名端点接入时使用） */
    public static final String COMMERCE_CONSULT = "commerce.consult";

    /** 视频上传独立闸（false 时 type=video 上传被拒，与商业化解耦） */
    public static final String UPLOAD_VIDEO_ENABLED = "upload.video.enabled";

    private FeatureSwitchKeys() {
    }
}
