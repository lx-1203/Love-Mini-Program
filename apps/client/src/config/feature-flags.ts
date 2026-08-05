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
  /** 首页"本周安排"是否启用（Phase Feedback2：课表 OCR 方案确认前默认隐藏） */
  weeklyScheduleEnabled: boolean;
  /** 心动信号模块是否启用（Phase Feedback3：保留但改名） */
  heartSignalEnabled: boolean;
  /** 圈子页"同城"Tab 是否启用（Phase Feedback4） */
  villageSameCityEnabled: boolean;
}

export const featureFlags: FeatureFlags = {
  membershipEnabled: false,
  weeklyScheduleEnabled: false,
  heartSignalEnabled: true,
  villageSameCityEnabled: true,
};
