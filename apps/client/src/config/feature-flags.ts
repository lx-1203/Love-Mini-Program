/**
 * 功能开关（Feature Flags） - 全局功能控制唯一真相源
 *
 * 用于按版本/运营策略控制功能可见性，避免硬删除代码：
 * - membershipEnabled=false 时，所有 VIP 购买入口、会员权益入口在 UI 层隐藏
 *   （页面路由保留，便于后期一键重新开启，见 Phase Feedback6：会员先不上线）
 *
 * 使用方式：
 *   import { featureFlags } from "@/config/feature-flags";
 *   if (featureFlags.membershipEnabled) { ... }
 */

export interface FeatureFlags {
  /** 会员功能是否启用（Phase Feedback6：默认 false，商业模式确认后置 true） */
  membershipEnabled: boolean;
  /** 心动信号模块是否启用（Phase Feedback3：保留但改名） */
  heartSignalEnabled: boolean;
  /** 圈子页"同城"Tab 是否启用（Phase Feedback4） */
  villageSameCityEnabled: boolean;
  /** 恋爱小纸条（悄悄话解锁）是否启用（B3：2026-08-13 上线，置 true 后原 WHISPER_ENABLED 常量废除） */
  whisperEnabled: boolean;
  /**
   * 401 时是否允许静默回落到 mock 假数据。
   *
   * <p>历史行为：真环境下 token 失效会直接返回 mockFixtures 的假资料，界面看起来
   * "一切正常"，从而让「小程序与后台同一份数据」这类验收假通过。默认 false，
   * 让 401 如实冒泡到调用方的 catch → toast。仅排查 mock 时才临时置 true。</p>
   */
  mockOn401Enabled: boolean;
}

export const featureFlags: FeatureFlags = {
  // 2026-08-08 走查收尾（需求「会员先不上线」）：会员关闭显性入口，
  // 后端会员体系与解锁逻辑保留，后期一键开启；解锁功能仅保留交友币入口。
  // 2026-10-11 更正：后端已接入微信支付 APIv3（apps/api/.../wxpay 与 vip/VipOrderService），
  // vip/index.vue 的 real 分支走 subscribeReal() 真实下单 + uni.requestPayment。
  // 「提示建设中」只在配置闸关闭时出现：下单返回 404（app.wechat-pay.enabled=false）
  // 或 403 COMMERCE_DISABLED（商业化封存）时回退 vip.paymentNotReady 文案。
  // 2026-08-10：本周安排改为个人设置里的用户级开关（settings 页），不再全局硬关。
  membershipEnabled: false,
  heartSignalEnabled: true,
  villageSameCityEnabled: true,
  // 2026-08-13 B3：恋爱小纸条（悄悄话付费解锁）正式开放。
  // 置 false 时按钮置灰（仅提示），置 true 时走完整解锁流程（后端端点已就绪）。
  whisperEnabled: true,
  // 真环境验收要求 401 如实暴露，不得被假数据掩盖（见字段注释）。
  mockOn401Enabled: false,
};
