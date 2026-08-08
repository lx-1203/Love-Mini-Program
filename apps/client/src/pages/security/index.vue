<script setup lang="ts">
/**
 * 安全中心页（Phase Feedback5 P2.6）
 *
 * 功能：
 * - 账号安全：绑定手机号 / 修改密码（展示版为本地交互闭环）
 * - 登录设备管理：设备列表 + 下线操作（演示态）
 * - 隐私保护：权限设置 / 隐私政策入口
 * - 注销账号：二次确认 + 提示
 */
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import AppShell from "../../components/layout/AppShell.vue";
import SectionCard from "../../components/common/SectionCard.vue";
import { IMAGE_PATHS } from "../../config/images";
import { lightHaptic, successHaptic } from "../../utils/haptic";
import { designTokens } from "../../theme/tokens";
import { openAppPath } from "../../utils/navigation";
// R4-00226：隐私权限设置路径走 ROUTES 常量
import { ROUTES, SUBPACKAGE_ROUTES } from "../../constants/routes";
import { usePageAccess } from "../../composables/usePageAccess";
import { profilePageRequirements } from "../../config/page-access";
import { useSessionStore } from "../../stores/session";

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

/** R4-00062：已下线设备 ID 的本地持久化 key（后端设备管理接口就绪前的过渡方案） */
const KICKED_DEVICES_KEY = "security:kicked-devices";

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
const newPassword = ref("");
const confirmPassword = ref("");
const passwordError = ref("");

/** 注销确认弹层 */
const showDeleteModal = ref(false);

/** 绑定手机号（演示：复制 + 提示） */
function handleChangePhone(): void {
  lightHaptic();
  uni.showToast({ title: t("security.phoneChangeHint"), icon: "none" });
}

/** 打开修改密码弹层 */
function openPasswordModal(): void {
  lightHaptic();
  passwordError.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
  showPasswordModal.value = true;
}

/** 关闭修改密码弹层 */
function closePasswordModal(): void {
  showPasswordModal.value = false;
}

/** 提交新密码（本地校验：6-20 位且两次一致） */
function submitPassword(): void {
  const pwd = newPassword.value.trim();
  if (pwd.length < 6 || pwd.length > 20) {
    passwordError.value = t("security.passwordLengthError");
    return;
  }
  if (pwd !== confirmPassword.value) {
    passwordError.value = t("security.passwordMismatch");
    return;
  }
  passwordError.value = "";
  showPasswordModal.value = false;
  successHaptic();
  uni.showToast({ title: t("security.passwordUpdated"), icon: "success" });
}

/**
 * 下线设备。
 * R4-00062：后端暂无设备管理接口（后端接入设备列表/下线接口后，
 * 应在确认后先调用下线接口成功再从列表移除）。
 * 过渡方案：下线决策持久化到本地 storage，刷新页面不再"设备重现"。
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
      devices.value = devices.value.filter((d) => d.id !== id);
      persistKickedDevice(id);
      uni.showToast({ title: t("security.kickDone"), icon: "success" });
    },
    fail: () => {
      kickingDeviceId.value = null;
    },
  });
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

/** 注销账号 */
function handleDeleteAccount(): void {
  lightHaptic();
  showDeleteModal.value = true;
}

/** 确认注销（演示态：提示客服协助，真实链路接入后端注销接口） */
function confirmDeleteAccount(): void {
  showDeleteModal.value = false;
  uni.showModal({
    title: t("security.deleteNoticeTitle"),
    content: t("security.deleteNoticeContent"),
    showCancel: false,
    confirmText: t("common.ok"),
    success: () => {
      /* 真实链路：调用后端注销接口（POST /api/v1/account/deactivate）后执行登出 */
      uni.showToast({ title: t("security.deleteTodo"), icon: "none" });
    },
  });
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

    <!-- 修改密码弹层 -->
    <view v-if="showPasswordModal" class="sec-modal-mask" @tap="closePasswordModal">
      <view class="sec-modal" @tap.stop>
        <text class="sec-modal__title">{{ t('security.changePassword') }}</text>
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
            <text>{{ t('common.confirm') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 注销确认弹层 -->
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
