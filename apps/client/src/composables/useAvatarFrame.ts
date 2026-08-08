/**
 * useAvatarFrame - 头像框佩戴逻辑（2026-08-08，参考 QQ 头像框机制）。
 *
 * 根据用户当前身份计算应佩戴的头像框主题：
 * - 周年限定（活动运营预留，优先级最高）
 * - 超级测试账号（活动限定身份）
 * - 超级会员 SVIP（炫彩框）
 * - VIP（金色框）
 * - 校园认证（品牌绿认证框）
 * - 普通用户（基础白框）
 *
 * 同一用户满足多个身份时，取注册表 priority 最高的主题。
 * 新增身份 → 在 config/avatar-frames.ts 注册主题 + 在本文件补充判定分支即可。
 */
import { computed } from "vue";
import { useProfileStore } from "../stores/profile";
import { useSessionStore } from "../stores/session";
// Phase Feedback6：会员功能开关（false 时 VIP/SVIP 身份不展示头像框）
import { featureFlags } from "../config/feature-flags";
import type { AvatarFrameId } from "../config/avatar-frames";

/**
 * 计算当前登录用户的头像框主题 ID。
 *
 * @param overrides 可选覆盖项（例如浏览他人主页时传对方身份；不传则按当前登录用户判定）
 */
export function useAvatarFrame() {
  const profileStore = useProfileStore();
  const sessionStore = useSessionStore();

  const frameId = computed<AvatarFrameId>(() => {
    const vipStatus = profileStore.vipStatus;
    // 会员功能开关关闭时，VIP/SVIP 身份不展示专属头像框（Phase Feedback6 约定）
    const vipIdentityVisible = featureFlags.membershipEnabled && Boolean(vipStatus?.isVip);
    // 超级会员判定：计划名含 svip/super 关键字（与后端约定），否则按普通 VIP 处理
    const isSvip = vipIdentityVisible && /svip|super/i.test(vipStatus?.planName ?? "");
    const isSchoolVerified = profileStore.campusProfile?.verificationStatus === "verified";
    const isSuperTest = sessionStore.isSuperTestAccount;

    // 优先级从高到低（对应注册表 priority）
    if (isSuperTest) return "super-test";
    if (isSvip) return "svip";
    if (vipIdentityVisible) return "vip";
    if (isSchoolVerified) return "school-verified";
    return "none";
  });

  return { frameId };
}
