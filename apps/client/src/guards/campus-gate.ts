import { useMock } from "../stores/helpers/use-mock";
import { useSessionStore } from "../stores/session";
import { useProfileStore } from "../stores/profile";
import { ROUTES } from "../constants/routes";
import { openAppPath } from "../utils/navigation";
import { isDev } from "../config/env";
// i18n 翻译函数：门控弹窗文案（SubTask 3.3.3：业务提示 i18n 化）
import { t } from "@/i18n";

/**
 * 认证等级（B4 认证门控，2026-08-13）。
 *
 * 与产品决策层级一致：
 * 年龄（18+，注册门）→ 实名认证（身份证）→ 学历认证（校园认证 + 学信网）。
 * 互动操作要求 ≥ 实名；更深层的校园功能要求学历（校园认证）。
 */
export type CertificationLevel = "realname" | "education";

/**
 * 实名认证是否已完成（纯状态判定，不弹窗）。
 *
 * 判定规则（与后端数据模型对齐）：
 * - mock 模式恒通过（演示账号 userSession.campusVerified=true，联调演示不设卡）；
 * - 已通过学历认证（userSession.campusVerified === true）视为已满足实名——
 *   后端强制实名认证为校园认证的前置门槛，故学历认证通过必然实名已通过；
 * - 其余以 BasicProfile.idCardVerified === true 为准。
 *
 * 注意：profile 未加载（basicProfile 为 null）时按未认证处理，
 * 不在此处发起异步加载（保持门控的同步语义，由页面 onShow 常规加载兜底）。
 *
 * @returns 是否已通过实名认证
 */
export function isRealNameVerified(): boolean {
  if (useMock()) return true;
  const sessionStore = useSessionStore();
  // 学历认证通过 ⇒ 后端已强制实名前置，视为已满足实名
  if (sessionStore.userSession?.campusVerified === true) return true;
  const profileStore = useProfileStore();
  return profileStore.basicProfile?.idCardVerified === true;
}

/**
 * 学历认证（校园认证）是否已完成（纯状态判定，不弹窗）。
 *
 * 判定规则：
 * - mock 模式恒通过（演示账号 campusVerified=true，见 stores/session.ts mockUserSession）；
 * - 真实模式以 userSession.campusVerified === true 为准（校园认证审核通过）。
 *
 * @returns 是否已通过学历认证
 */
export function isEducationVerified(): boolean {
  if (useMock()) return true;
  const sessionStore = useSessionStore();
  return sessionStore.userSession?.campusVerified === true;
}

/**
 * 认证门控（B4）：互动操作前置校验。
 *
 * 调用时机：喜欢 / 超级喜欢 / 打招呼 / 悄悄话 / 发帖等互动操作入口，
 * 在 requireLogin() 通过之后调用（浏览类操作不受门控，保持浏览自由）。
 *
 * 未通过时弹出引导弹窗（i18n 文案）：
 * - "realname"（实名）→ 跳转 /pages/verification/real-name（实名认证页）；
 * - "education"（学历）→ 跳转 /pages/campus/certification（校园认证页）。
 *
 * 同步语义：不发起异步加载，profile 未就绪时按未认证处理（返回 false + 弹窗引导）。
 *
 * @param level 认证等级
 * @returns 是否已通过该等级认证（未通过时已弹出引导弹窗）
 */
export function ensureCertified(level: CertificationLevel): boolean {
  const passed = level === "realname" ? isRealNameVerified() : isEducationVerified();
  if (passed) return true;

  // 未通过：弹出引导弹窗，确认后跳转对应认证页
  const isRealName = level === "realname";
  if (isDev) {
    // 修复 no-console：调试日志改用 console.warn（允许的方法）
    console.warn("[campus-gate] 拦截：未通过认证", {
      level,
      campusVerified: useSessionStore().userSession?.campusVerified,
    });
  }
  uni.showModal({
    title: t(isRealName ? "campus.gateTitle" : "campus.gateEducationTitle"),
    content: t(isRealName ? "campus.gateHint" : "campus.gateEducationHint"),
    confirmText: t(isRealName ? "campus.gateGoCertify" : "campus.gateEducationGo"),
    cancelText: t("common.cancel"),
    success: (res) => {
      if (res.confirm) {
        openAppPath(isRealName ? ROUTES.REAL_NAME_CERTIFICATION : ROUTES.CAMPUS.CERTIFICATION);
      }
    },
  });
  return false;
}
