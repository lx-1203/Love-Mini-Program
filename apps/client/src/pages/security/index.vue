<script setup lang="ts">
/**
 * 安全中心页（Phase Feedback5 P2.6）
 *
 * 功能：
 * - 账号安全：绑定手机号 / 修改密码（real 走 AccountSecurityController）
 * - 登录设备管理：设备列表 + 下线操作（real 走 GET /auth/devices + POST /auth/devices/{id}/revoke，
 *   2026-08-10 B3 已接真实接口；mock 分支保留本地演示）
 * - 隐私保护：权限设置 / 隐私政策入口
 * - 注销账号：二次确认 + 提示
 */
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppShell from "../../components/layout/AppShell.vue";
import SectionCard from "../../components/common/SectionCard.vue";
import { IMAGE_PATHS } from "../../config/images";
import { lightHaptic, successHaptic } from "../../utils/haptic";
import { designTokens } from "../../theme/tokens";
import { openAppPath } from "../../utils/navigation";
// R4-00226：隐私权限设置路径走 ROUTES 常量
import { ROUTES, SUBPACKAGE_ROUTES } from "../../constants/routes";
import { STORAGE_KEYS } from "../../constants/storage-keys";
import { usePageAccess } from "../../composables/usePageAccess";
import { profilePageRequirements } from "../../config/page-access";
import { useSessionStore } from "../../stores/session";
// 3-B/C/D/E 账号安全 real 链路：change-phone / change-password / devices / deactivate
import { useMock } from "../../stores/helpers/use-mock";
import { request, clearTokens } from "../../services/http";

/** 安全中心访问要求（需登录，无需资料完善） */
usePageAccess(profilePageRequirements);

const { t } = useI18n();
const sessionStore = useSessionStore();

/**
 * 当前绑定手机号展示。
 * R4-00063：不再硬编码假手机号——按会话绑定状态展示，
 * 后端 UserSession 下发真实手机号后在此透出（当前仅展示脱敏态文案）。
 */
const boundPhone = computed<string>(() =>
  // phoneBound 是 UserSession 字段（session store 无顶层同名属性），经 userSession 访问
  sessionStore.userSession?.phoneBound ? t("security.phoneBoundMask") : t("security.phoneNotBound"),
);

/** 登录设备列表（演示数据） */
interface DeviceItem {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

/** R4-00062：已下线设备 ID 的本地持久化 key（后端设备管理接口就绪前的过渡方案；2026-08-10 统一至 STORAGE_KEYS） */
const KICKED_DEVICES_KEY = STORAGE_KEYS.KICKED_DEVICES;

/**
 * 读取已下线设备 ID 列表（storage 异常时按空数组降级）。
 */
function readKickedDevices(): string[] {
  try {
    const raw = uni.getStorageSync(KICKED_DEVICES_KEY);
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch (_e) {
    return [];
  }
}

/**
 * 记录已下线设备 ID（防重复写入；storage 异常静默降级为内存态）。
 */
function persistKickedDevice(id: string): void {
  try {
    const kicked = readKickedDevices();
    if (!kicked.includes(id)) {
      uni.setStorageSync(KICKED_DEVICES_KEY, [...kicked, id]);
    }
  } catch (_e) {
    // 存储失败仅影响刷新后回显，不阻塞下线操作本身
  }
}

/**
 * 初始设备列表。
 * R4-00063：移除伪造设备（iPhone 15 Pro / 小米 14 / iPad Air 等假数据），
 * 仅展示真实当前设备（uni.getSystemInfoSync 读取型号）；后端设备管理接口
 * 就绪后可替换为 GET /security/devices 返回的完整设备列表。
 */
function buildInitialDevices(): DeviceItem[] {
  let model = "";
  try {
    const sys = uni.getSystemInfoSync();
    model = sys?.model || sys?.deviceModel || "";
  } catch (_e) {
    // 系统信息读取失败时降级为空型号
  }
  const all: DeviceItem[] = [
    { id: "d-current", device: model || t("security.unknownDevice"), location: "", lastActive: t("security.currentDevice"), isCurrent: true },
  ];
  const kicked = readKickedDevices();
  return kicked.length > 0 ? all.filter((d) => !kicked.includes(d.id)) : all;
}

const devices = ref<DeviceItem[]>(buildInitialDevices());

/** 是否展示下线确认中的设备 ID */
const kickingDeviceId = ref<string | null>(null);

/** 修改密码弹层状态 */
const showPasswordModal = ref(false);
const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const passwordError = ref("");
/** 修改密码请求提交中 */
const submittingPassword = ref(false);

/** 更换手机号弹层状态（3-C） */
const showChangePhoneModal = ref(false);
const newPhone = ref("");
const changePhonePassword = ref("");
const changePhoneError = ref("");
/** 更换手机号请求提交中 */
const submittingChangePhone = ref(false);

/** 注销确认弹层（第一层：危险操作提醒） */
const showDeleteModal = ref(false);
/** 注销凭据弹层（第二层：输入「注销」确认文字 + 旧密码） */
const showDeactivateModal = ref(false);
const deleteConfirmText = ref("");
const deletePassword = ref("");
const deleteError = ref("");
/** 注销请求提交中 */
const submittingDelete = ref(false);

/**
 * 后端设备会话视图（GET /auth/devices 响应项，3-D）。
 * 注意：后端 View 不含 current 字段——列表按最近活跃时间倒序返回，
 * 当前设备（本会话）因请求活跃度最高恒排首位，前端据此标记 isCurrent。
 */
interface RealDeviceView {
  id: number;
  deviceId: string;
  platform: string;
  lastActiveAt: string | null;
  revoked: boolean;
  createdAt: string | null;
}

/** 平台标识 → 展示文案映射（devices 列表） */
function platformLabel(platform: string): string {
  const map: Record<string, string> = {
    wechat: t("security.platformWechat"),
    phone: t("security.platformPhone"),
    apple: t("security.platformApple"),
    guest: t("security.platformGuest"),
    unknown: t("security.unknownDevice"),
  };
  const label = map[platform] ?? platform;
  return label && label.trim().length > 0 ? label : t("security.unknownDevice");
}

/** 时间格式化（设备最后活跃时间，取月/日 时:分） */
function formatDeviceTime(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * real 模式拉取设备列表（3-D）。
 * mock 模式保留本地演示设备（buildInitialDevices）。
 */
async function loadDevices(): Promise<void> {
  if (useMock()) return;
  try {
    const list = await request<RealDeviceView[]>({ url: "/auth/devices", method: "GET" });
    devices.value = list.map((item, index) => ({
      // 展示 ID 与后端记录 ID 保持一致（下线接口按 id 吊销）
      id: String(item.id),
      device: platformLabel(item.platform),
      location: "",
      // 按活跃时间倒序，首条即当前会话（真实会话活跃度最高）
      lastActive: item.revoked
        ? t("security.deviceRevoked")
        : formatDeviceTime(item.lastActiveAt) || t("security.unknownDevice"),
      isCurrent: index === 0 && !item.revoked,
    }));
  } catch (_e) {
    // 拉取失败保留当前列表（不阻塞页面展示）
  }
}

/** 进入页面时拉取真实设备列表（real 模式） */
onShow(() => {
  void loadDevices();
});

/** 打开更换手机号弹层（3-C） */
function handleChangePhone(): void {
  lightHaptic();
  changePhoneError.value = "";
  newPhone.value = "";
  changePhonePassword.value = "";
  showChangePhoneModal.value = true;
}

/** 关闭更换手机号弹层 */
function closeChangePhoneModal(): void {
  showChangePhoneModal.value = false;
}

/**
 * 提交更换手机号（3-C）。
 * - mock：保留原演示 toast；
 * - real：POST /auth/change-phone {password, newPhone}，成功后回读用户信息。
 */
async function submitChangePhone(): Promise<void> {
  const phone = newPhone.value.trim();
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    changePhoneError.value = t("security.phoneFormatError");
    return;
  }
  if (!changePhonePassword.value) {
    changePhoneError.value = t("security.phonePasswordRequired");
    return;
  }
  if (useMock()) {
    closeChangePhoneModal();
    uni.showToast({ title: t("security.phoneChangeHint"), icon: "none" });
    return;
  }
  changePhoneError.value = "";
  submittingChangePhone.value = true;
  try {
    // verificationCode 字段预留（后续短信验证），本期不传
    await request<void, { password: string; newPhone: string }>({
      url: "/auth/change-phone",
      method: "POST",
      data: { password: changePhonePassword.value, newPhone: phone },
    });
    closeChangePhoneModal();
    successHaptic();
    uni.showToast({ title: t("security.phoneChanged"), icon: "success" });
    // 回读用户信息，同步会话中的手机号绑定状态
    sessionStore.refreshSession().catch(() => {
      // 回读失败不影响主流程（下次进入页面守卫会自愈）
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : t("security.phoneChangeFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    submittingChangePhone.value = false;
  }
}

/** 打开修改密码弹层 */
function openPasswordModal(): void {
  lightHaptic();
  passwordError.value = "";
  oldPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
  showPasswordModal.value = true;
}

/** 关闭修改密码弹层 */
function closePasswordModal(): void {
  showPasswordModal.value = false;
}

/**
 * 提交新密码（3-B）。
 * - mock：保留本地假成功（toast）；
 * - real：POST /auth/change-password {oldPassword, newPassword}，
 *   成功提示重新登录并清 token 跳登录页；旧密码错误（403）提示旧密码错误。
 */
async function submitPassword(): Promise<void> {
  const pwd = newPassword.value.trim();
  if (pwd.length < 6 || pwd.length > 20) {
    passwordError.value = t("security.passwordLengthError");
    return;
  }
  if (pwd !== confirmPassword.value) {
    passwordError.value = t("security.passwordMismatch");
    return;
  }
  if (!oldPassword.value) {
    passwordError.value = t("security.oldPasswordRequired");
    return;
  }
  if (useMock()) {
    passwordError.value = "";
    showPasswordModal.value = false;
    successHaptic();
    uni.showToast({ title: t("security.passwordUpdated"), icon: "success" });
    return;
  }
  passwordError.value = "";
  submittingPassword.value = true;
  try {
    await request<void, { oldPassword: string; newPassword: string }>({
      url: "/auth/change-password",
      method: "POST",
      data: { oldPassword: oldPassword.value, newPassword: pwd },
    });
    showPasswordModal.value = false;
    successHaptic();
    // 后端已吊销全部 token，需重新登录
    uni.showToast({ title: t("security.passwordUpdatedRelogin"), icon: "none" });
    clearTokens();
    sessionStore.userSession = null;
    setTimeout(() => {
      uni.reLaunch({ url: ROUTES.LOGIN });
    }, 1200);
  } catch (error) {
    // 旧密码错误（403 OLD_PASSWORD_WRONG）→ 明确提示旧密码错误
    const status =
      error !== null && typeof error === "object" && "status" in error
        ? (error as { status: number }).status
        : 0;
    if (status === 403) {
      passwordError.value = t("security.oldPasswordWrong");
    } else {
      passwordError.value =
        error instanceof Error ? error.message : t("security.passwordUpdateFailed");
    }
  } finally {
    submittingPassword.value = false;
  }
}

/**
 * 下线设备。
 * - mock：保留本地持久化过渡方案（storage 记录已下线设备）；
 * - real（3-D）：确认后先调用 POST /auth/devices/{id}/revoke，成功再从列表移除。
 */
function kickDevice(id: string): void {
  const device = devices.value.find((d) => d.id === id);
  if (!device || device.isCurrent) return;
  lightHaptic();
  kickingDeviceId.value = id;
  uni.showModal({
    title: t("security.kickTitle"),
    content: t("security.kickConfirm", { device: device.device }),
    confirmText: t("security.kick"),
    cancelText: t("common.cancel"),
    confirmColor: designTokens.color.error,
    success: (res) => {
      kickingDeviceId.value = null;
      if (!res.confirm) return;
      if (useMock()) {
        devices.value = devices.value.filter((d) => d.id !== id);
        persistKickedDevice(id);
        uni.showToast({ title: t("security.kickDone"), icon: "success" });
        return;
      }
      void revokeDeviceReal(id, device);
    },
    fail: () => {
      kickingDeviceId.value = null;
    },
  });
}

/**
 * real 模式吊销设备（3-D）：先调后端接口，成功后再从列表移除。
 */
async function revokeDeviceReal(id: string, device: DeviceItem): Promise<void> {
  try {
    await request<void>({
      url: `/auth/devices/${encodeURIComponent(id)}/revoke`,
      method: "POST",
    });
    devices.value = devices.value.filter((d) => d.id !== id);
    uni.showToast({ title: t("security.kickDone"), icon: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : t("security.kickFailed");
    uni.showToast({ title: message, icon: "none" });
    if (typeof device !== "undefined") {
      console.warn("[Security] 吊销设备失败:", device.device);
    }
  }
}

/** 隐私权限设置 */
function goPrivacySettings(): void {
  lightHaptic();
  // R4-00226：路径走 ROUTES 常量
  openAppPath(ROUTES.PROFILE.PRIVACY);
}

/** 隐私政策 */
function goPrivacyPolicy(): void {
  lightHaptic();
  openAppPath(SUBPACKAGE_ROUTES.LEGAL.PRIVACY);
}

/** 注销账号（第一层确认弹层） */
function handleDeleteAccount(): void {
  lightHaptic();
  showDeleteModal.value = true;
}

/**
 * 第一层确认 → 打开第二层凭据弹层（输入「注销」确认文字 + 旧密码）。
 * 第二层强确认：需输入确认文字（无密码账号以此替代密码校验）。
 */
function confirmDeleteAccount(): void {
  showDeleteModal.value = false;
  deleteError.value = "";
  deleteConfirmText.value = "";
  deletePassword.value = "";
  showDeactivateModal.value = true;
}

/**
 * 提交注销账号（3-E）。
 * - mock：保留原「联系客服」演示提示；
 * - real：POST /auth/deactivate {password?, confirmationText?}——
 *   有密码账号验旧密码，无密码账号以「注销」确认文字替代；成功后清本地状态跳登录页。
 */
async function submitDeleteAccount(): Promise<void> {
  if (deleteConfirmText.value.trim() !== t("security.deleteTypeWord")) {
    deleteError.value = t("security.deleteTypeMismatch");
    return;
  }
  if (useMock()) {
    showDeactivateModal.value = false;
    uni.showModal({
      title: t("security.deleteNoticeTitle"),
      content: t("security.deleteNoticeContent"),
      showCancel: false,
      confirmText: t("common.ok"),
      success: () => {
        uni.showToast({ title: t("security.deleteTodo"), icon: "none" });
      },
    });
    return;
  }
  deleteError.value = "";
  showDeactivateModal.value = false;
  submittingDelete.value = true;
  try {
    await request<void, { password: string; confirmationText: string }>({
      url: "/auth/deactivate",
      method: "POST",
      data: {
        password: deletePassword.value,
        confirmationText: deleteConfirmText.value.trim(),
      },
    });
    uni.showToast({ title: t("security.deleteDone"), icon: "none" });
    // 后端已吊销全部 token，清本地状态跳登录页
    clearTokens();
    sessionStore.userSession = null;
    setTimeout(() => {
      uni.reLaunch({ url: ROUTES.LOGIN });
    }, 1200);
  } catch (error) {
    const message = error instanceof Error ? error.message : t("security.deleteFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    submittingDelete.value = false;
  }
}
</script>

<template>
  <AppShell :title="t('security.navTitle')" :subtitle="t('security.subtitle')" show-back>
    <!-- 账号安全 -->
    <SectionCard :title="t('security.accountTitle')" compact>
      <view class="sec-list">
        <view
          class="sec-item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('security.phone')"
          @tap="handleChangePhone"
        >
          <view class="sec-item__icon-wrap" :style="{ background: 'var(--c-tint-blue-soft, #E8F4FF)' }">
            <image class="sec-item__icon" :src="IMAGE_PATHS.ICONS_EMOJI.MOBILE" mode="aspectFit" alt="" />
          </view>
          <view class="sec-item__info">
            <text class="sec-item__label">{{ t('security.phone') }}</text>
            <text class="sec-item__desc">{{ boundPhone }}</text>
          </view>
          <text class="sec-item__arrow">›</text>
        </view>

        <view
          class="sec-item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('security.changePassword')"
          @tap="openPasswordModal"
        >
          <view class="sec-item__icon-wrap" :style="{ background: 'var(--c-tint-pink-soft, #FFF0F5)' }">
            <image class="sec-item__icon" :src="IMAGE_PATHS.ICONS_EMOJI.KEY" mode="aspectFit" alt="" />
          </view>
          <view class="sec-item__info">
            <text class="sec-item__label">{{ t('security.changePassword') }}</text>
            <text class="sec-item__desc">{{ t('security.changePasswordDesc') }}</text>
          </view>
          <text class="sec-item__arrow">›</text>
        </view>
      </view>
    </SectionCard>

    <!-- 登录设备 -->
    <SectionCard :title="t('security.deviceTitle')" compact>
      <view class="sec-list">
        <view
          v-for="device in devices"
          :key="device.id"
          class="sec-item"
        >
          <view class="sec-item__icon-wrap" :style="{ background: 'var(--c-tint-green-soft, #E8F8F0)' }">
            <image class="sec-item__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LIST" mode="aspectFit" alt="" />
          </view>
          <view class="sec-item__info">
            <view class="sec-item__label-row">
              <text class="sec-item__label">{{ device.device }}</text>
              <text v-if="device.isCurrent" class="sec-item__badge">{{ t('security.currentDevice') }}</text>
            </view>
            <text class="sec-item__desc">{{ device.location ? `${device.location} · ` : '' }}{{ device.lastActive }}</text>
          </view>
          <view
            v-if="!device.isCurrent"
            class="sec-item__kick press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('security.kick')"
            @tap="kickDevice(device.id)"
          >
            <text class="sec-item__kick-text">{{ t('security.kick') }}</text>
          </view>
        </view>
      </view>
    </SectionCard>

    <!-- 隐私保护 -->
    <SectionCard :title="t('security.privacyTitle')" compact>
      <view class="sec-list">
        <view
          class="sec-item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('security.privacyPermission')"
          @tap="goPrivacySettings"
        >
          <view class="sec-item__icon-wrap" :style="{ background: 'var(--c-lavender-100, #EDE9FE)' }">
            <image class="sec-item__icon" :src="IMAGE_PATHS.ICONS_EMOJI.SHIELD" mode="aspectFit" alt="" />
          </view>
          <view class="sec-item__info">
            <text class="sec-item__label">{{ t('security.privacyPermission') }}</text>
            <text class="sec-item__desc">{{ t('security.privacyPermissionDesc') }}</text>
          </view>
          <text class="sec-item__arrow">›</text>
        </view>

        <view
          class="sec-item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('security.privacyPolicy')"
          @tap="goPrivacyPolicy"
        >
          <view class="sec-item__icon-wrap" :style="{ background: 'var(--c-sky-50, #E0F2FE)' }">
            <image class="sec-item__icon" :src="IMAGE_PATHS.ICONS_EMOJI.FILE_TEXT" mode="aspectFit" alt="" />
          </view>
          <view class="sec-item__info">
            <text class="sec-item__label">{{ t('security.privacyPolicy') }}</text>
            <text class="sec-item__desc">{{ t('security.privacyPolicyDesc') }}</text>
          </view>
          <text class="sec-item__arrow">›</text>
        </view>
      </view>
    </SectionCard>

    <!-- 危险操作 -->
    <SectionCard :title="t('security.dangerTitle')" compact>
      <view
        class="sec-item sec-item--danger press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('security.deleteAccount')"
        @tap="handleDeleteAccount"
      >
        <view class="sec-item__info">
          <text class="sec-item__label sec-item__label--danger">{{ t('security.deleteAccount') }}</text>
          <text class="sec-item__desc">{{ t('security.deleteAccountDesc') }}</text>
        </view>
        <text class="sec-item__arrow">›</text>
      </view>
    </SectionCard>

    <!-- 更换手机号弹层（3-C） -->
    <view v-if="showChangePhoneModal" class="sec-modal-mask" @tap="closeChangePhoneModal">
      <view class="sec-modal" @tap.stop>
        <text class="sec-modal__title">{{ t('security.phone') }}</text>
        <input
          v-model="newPhone"
          class="sec-modal__input"
          type="number"
          maxlength="11"
          :placeholder="t('security.newPhonePlaceholder')"
          placeholder-class="sec-modal__placeholder"
        />
        <input
          v-model="changePhonePassword"
          class="sec-modal__input"
          type="password"
          :placeholder="t('security.phonePasswordPlaceholder')"
          placeholder-class="sec-modal__placeholder"
        />
        <text v-if="changePhoneError" class="sec-modal__error">{{ changePhoneError }}</text>
        <view class="sec-modal__actions">
          <view
            class="sec-modal__btn sec-modal__btn--cancel press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="closeChangePhoneModal"
          >
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view
            class="sec-modal__btn sec-modal__btn--confirm press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="submitChangePhone"
          >
            <text>{{ submittingChangePhone ? t('security.submitting') : t('common.confirm') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 修改密码弹层（3-B） -->
    <view v-if="showPasswordModal" class="sec-modal-mask" @tap="closePasswordModal">
      <view class="sec-modal" @tap.stop>
        <text class="sec-modal__title">{{ t('security.changePassword') }}</text>
        <input
          v-model="oldPassword"
          class="sec-modal__input"
          type="password"
          :placeholder="t('security.oldPasswordPlaceholder')"
          placeholder-class="sec-modal__placeholder"
        />
        <input
          v-model="newPassword"
          class="sec-modal__input"
          type="password"
          :placeholder="t('security.passwordPlaceholder')"
          placeholder-class="sec-modal__placeholder"
        />
        <input
          v-model="confirmPassword"
          class="sec-modal__input"
          type="password"
          :placeholder="t('security.passwordConfirmPlaceholder')"
          placeholder-class="sec-modal__placeholder"
        />
        <text v-if="passwordError" class="sec-modal__error">{{ passwordError }}</text>
        <view class="sec-modal__actions">
          <view
            class="sec-modal__btn sec-modal__btn--cancel press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="closePasswordModal"
          >
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view
            class="sec-modal__btn sec-modal__btn--confirm press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="submitPassword"
          >
            <text>{{ submittingPassword ? t('security.submitting') : t('common.confirm') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 注销确认弹层（第一层：危险操作提醒） -->
    <view v-if="showDeleteModal" class="sec-modal-mask" @tap="showDeleteModal = false">
      <view class="sec-modal" @tap.stop>
        <text class="sec-modal__title">{{ t('security.deleteAccount') }}</text>
        <text class="sec-modal__body">{{ t('security.deleteConfirmContent') }}</text>
        <view class="sec-modal__actions">
          <view
            class="sec-modal__btn sec-modal__btn--cancel press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="showDeleteModal = false"
          >
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view
            class="sec-modal__btn sec-modal__btn--danger press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="confirmDeleteAccount"
          >
            <text>{{ t('security.deleteAccount') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 注销凭据弹层（第二层：输入「注销」确认文字 + 旧密码，3-E） -->
    <view v-if="showDeactivateModal" class="sec-modal-mask" @tap="showDeactivateModal = false">
      <view class="sec-modal" @tap.stop>
        <text class="sec-modal__title">{{ t('security.deleteAccount') }}</text>
        <text class="sec-modal__body">{{ t('security.deleteTypeHint') }}</text>
        <input
          v-model="deleteConfirmText"
          class="sec-modal__input"
          :placeholder="t('security.deleteTypePlaceholder')"
          placeholder-class="sec-modal__placeholder"
        />
        <input
          v-model="deletePassword"
          class="sec-modal__input"
          type="password"
          :placeholder="t('security.deletePasswordPlaceholder')"
          placeholder-class="sec-modal__placeholder"
        />
        <text v-if="deleteError" class="sec-modal__error">{{ deleteError }}</text>
        <view class="sec-modal__actions">
          <view
            class="sec-modal__btn sec-modal__btn--cancel press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="showDeactivateModal = false"
          >
            <text>{{ t('common.cancel') }}</text>
          </view>
          <view
            class="sec-modal__btn sec-modal__btn--danger press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="submitDeleteAccount"
          >
            <text>{{ submittingDelete ? t('security.submitting') : t('security.deleteAccount') }}</text>
          </view>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style lang="scss" scoped>
.sec-list {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.sec-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 8rpx;
  border-radius: var(--r-md);
}

.sec-item--danger {
  justify-content: center;
  flex-direction: column;
  align-items: flex-start;
}

.sec-item__icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sec-item__icon {
  width: 40rpx;
  height: 40rpx;
}

.sec-item__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.sec-item__label-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sec-item__label {
  font-size: var(--f-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.sec-item__label--danger {
  color: var(--c-error, #f43f5e);
}

.sec-item__desc {
  font-size: var(--f-xs);
  color: var(--c-text-tertiary);
}

.sec-item__badge {
  font-size: var(--f-xs);
  color: var(--c-brand-600);
  background: var(--c-tint-brand, #E8F8F0);
  padding: 4rpx 14rpx;
  border-radius: var(--r-full);
}

.sec-item__arrow {
  font-size: var(--f-lg);
  color: var(--c-text-tertiary);
}

.sec-item__kick {
  padding: 10rpx 24rpx;
  border-radius: var(--r-full);
  background: var(--c-error-soft, #fee2e2);
  flex-shrink: 0;
}

.sec-item__kick-text {
  font-size: var(--f-xs);
  color: var(--c-error, #f43f5e);
}

/* 弹层 */
.sec-modal-mask {
  position: fixed;
  inset: 0;
  background: var(--c-bg-overlay, rgba(15, 23, 42, 0.45));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 0 60rpx;
}

.sec-modal {
  width: 100%;
  background: var(--c-neutral-0);
  border-radius: var(--r-lg);
  padding: 40rpx 36rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.sec-modal__title {
  font-size: var(--f-lg);
  font-weight: 700;
  color: var(--c-text-primary);
  text-align: center;
}

.sec-modal__body {
  font-size: var(--f-sm);
  color: var(--c-text-secondary);
  line-height: 1.7;
}

.sec-modal__input {
  height: 88rpx;
  background: var(--c-bg-page, #f4f6fa);
  border-radius: var(--r-md);
  padding: 0 24rpx;
  font-size: var(--f-md);
  color: var(--c-text-primary);
}

.sec-modal__placeholder {
  color: var(--c-text-tertiary);
}

.sec-modal__error {
  font-size: var(--f-xs);
  color: var(--c-error, #f43f5e);
}

.sec-modal__actions {
  display: flex;
  gap: 20rpx;
  margin-top: 8rpx;
}

.sec-modal__btn {
  flex: 1;
  height: 84rpx;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--f-md);
  font-weight: 600;
}

.sec-modal__btn--cancel {
  background: var(--c-bg-page, #f4f6fa);
  color: var(--c-text-secondary);
}

.sec-modal__btn--confirm {
  background: var(--c-brand-500);
  color: var(--c-neutral-0);
}

.sec-modal__btn--danger {
  background: var(--c-error, #f43f5e);
  color: var(--c-neutral-0);
}
</style>
