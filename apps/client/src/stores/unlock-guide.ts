import { defineStore } from "pinia";
import { openAppPath } from "../utils/navigation";

/**
 * 解锁引导弹窗 Store
 *
 * Phase 4 任务 20：替换 profile-guard 静默重定向为友好的 Modal 弹窗引导。
 *
 * 当用户访问锁定页面（likes/village/messages）且资料未完善时，
 * 不再静默跳转到 setup 页，而是弹出 Modal 引导用户：
 *   - 主按钮「去完善资料」→ 跳转资料完善页
 *   - 次按钮「暂不完善」  → 关闭弹窗，用户可继续浏览当前锁定页（LockScreen 占位）
 *
 * 同时维护「首次进入锁定页」的一次性教学蒙层（UnlockGuideOverlay）状态，
 * 通过 uni.getStorageSync('unlock_guide_shown') 记录是否已展示过。
 */
export const useUnlockGuideStore = defineStore("unlock-guide", {
  state: () => ({
    /** 弹窗是否可见 */
    visible: false,
    /** 当前锁定的功能名称（用于弹窗文案，如「喜欢列表」） */
    featureName: "此功能",
    /** 当前资料完善度百分比 */
    completionPercent: 0,
    /** 一次性教学蒙层是否可见（仅首次进入锁定页时为 true） */
    overlayVisible: false,
  }),
  actions: {
    /**
     * 展示解锁引导弹窗
     * @param featureName - 锁定功能名称
     * @param completionPercent - 当前完善度百分比
     */
    show(featureName: string, completionPercent: number) {
      this.featureName = featureName || "此功能";
      this.completionPercent = completionPercent || 0;
      this.visible = true;

      // 首次进入锁定页时展示一次性教学蒙层
      // 通过本地存储记录是否已展示，避免重复打扰用户
      try {
        const shown = uni.getStorageSync("unlock_guide_shown");
        if (!shown) {
          this.overlayVisible = true;
        }
      } catch (_e) {
        // 读取失败时安全降级：不展示蒙层（不影响主弹窗）
        this.overlayVisible = false;
      }
    },

    /** 隐藏解锁引导弹窗（保留 overlayVisible 状态由 overlay 自行管理） */
    hide() {
      this.visible = false;
    },

    /**
     * 点击「去完善资料」主按钮
     * 跳转到资料完善页并关闭弹窗
     */
    confirm() {
      this.visible = false;
      this.overlayVisible = false;
      openAppPath("/subpackages/setup/profile/index");
    },

    /**
     * 关闭一次性教学蒙层
     * 同时写入本地存储，避免下次再次展示
     */
    hideOverlay() {
      this.overlayVisible = false;
      try {
        uni.setStorageSync("unlock_guide_shown", true);
      } catch (_e) {
        // 写入失败时忽略，下次可能再次展示（不影响主流程）
      }
    },
  },
});
