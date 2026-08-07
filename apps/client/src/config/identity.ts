/**
 * 用户身份配置（2026-08-07 注册流程重构）。
 *
 * 注册第 1 步（setup/profile）要求用户选择身份，用于主流程分流：
 * - student（在校学生 / 毕业生）：基本信息 → 校园认证 → 推荐偏好 → 完成（4 步）
 * - non_student（非学生职场人士）：基本信息 → 推荐偏好 → 完成（3 步，跳过校园认证）
 *
 * 身份保存在本地存储（客户端流程优化，不依赖后端；后端以 campusProfile
 * 是否存在来区分是否具备校园身份，二者天然一致：非学生不填写校园资料）。
 */

/** 身份值类型 */
export type UserIdentity = "student" | "non_student";

/** 本地持久化 key（与 stores/profile.ts 的 PRIVACY_STORAGE_KEY 同风格） */
export const USER_IDENTITY_STORAGE_KEY = "campus-love:user-identity";

/** 默认身份：学生（产品主受众，且与历史流程兼容） */
export const DEFAULT_IDENTITY: UserIdentity = "student";

/** 读取本地持久化的身份（无记录/非法值时回退默认「学生」） */
export function loadIdentity(): UserIdentity {
  try {
    const raw = uni.getStorageSync(USER_IDENTITY_STORAGE_KEY) as UserIdentity | undefined;
    if (raw === "student" || raw === "non_student") {
      return raw;
    }
  } catch (_e) {
    // 读取失败时回退默认值
  }
  return DEFAULT_IDENTITY;
}

/** 持久化身份选择（存储失败时静默，不影响当前会话） */
export function saveIdentity(identity: UserIdentity): void {
  try {
    uni.setStorageSync(USER_IDENTITY_STORAGE_KEY, identity);
  } catch (_e) {
    // 存储失败时静默
  }
}

/** 身份对应的步骤数量（与 SetupProgress variant 对齐） */
export const IDENTITY_TOTAL_STEPS: Record<UserIdentity, number> = {
  student: 4,
  non_student: 3,
};
