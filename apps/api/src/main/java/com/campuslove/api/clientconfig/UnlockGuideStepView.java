package com.campuslove.api.clientconfig;

/**
 * 解锁引导步骤视图 DTO（Task 3.6.5）。
 *
 * <p>对应客户端 {@code GET /api/v1/config/unlock-guide-steps} 返回的列表项，
 * 用于驱动「解锁引导弹窗 / 一次性教学蒙层」的分步文案展示。</p>
 *
 * <p>由后端 {@code ConfigService.loadUnlockGuideSteps()} 返回，5 分钟缓存，
 * 替代客户端 {@code apps/client/src/stores/unlock-guide.ts} 中的硬编码文案。
 * 运营可按用户分群（如新老用户、VIP 等级）下发不同步骤文案，
 * 后续可扩展为按用户上下文动态返回（如登录态、完善度等）。</p>
 *
 * @param step          步骤序号（从 1 开始，前端按序展示）
 * @param title         步骤标题（按 Accept-Language 国际化）
 * @param description   步骤详细说明（按 Accept-Language 国际化）
 * @param ctaText       步骤主按钮文案（如「去完善资料」，按 Accept-Language 国际化）
 * @param ctaLink       点击主按钮跳转的 app 内部路径（如 /subpackages/setup/profile/index）
 * @param dismissText   关闭按钮文案（如「暂不完善」，按 Accept-Language 国际化）
 */
public record UnlockGuideStepView(
        int step,
        String title,
        String description,
        String ctaText,
        String ctaLink,
        String dismissText
) {
}
