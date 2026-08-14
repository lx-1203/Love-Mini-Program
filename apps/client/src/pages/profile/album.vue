<script setup lang="ts">
/**
 * 个人主页相册页（功能4）
 *
 * 展示当前用户的照片墙（最多 6 张），支持：
 * - 上传新照片到下一个空位
 * - 长按照片弹出操作菜单（设为头像 / 删除）
 * - 点击照片全屏预览
 *
 * 数据来源：profileStore.photoGallery + uploadPhotoAtIndex / removePhotoAtIndex
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（mp-weixin 不支持），改用 hover-class
 * - 不使用 import.meta.env.DEV（mp-weixin 运行时会报错）
 * - 不使用 optional catch binding（catch {}），mp-weixin 不兼容
 * - 不使用 backdrop-filter（仅 H5 条件编译）
 */
import { computed, onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useProfileStore } from "../../stores/profile";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";
import { errorHaptic, lightHaptic, successHaptic } from "../../utils/haptic";
import { resolveMediaUrl } from "../../utils/media";
// 导入 UniUploadFileLike 类型，消除 buildFileLike 中 `as unknown as File` 交叉类型断言
import type { UniUploadFileLike } from "../../services/api";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../utils/privacy";

/** 照片墙最大数量（与后端契约一致，6 张） */
const PHOTO_GALLERY_MAX = 6;

/** 单张照片大小上限（10MB，与上传接口约定一致） */
const PHOTO_SIZE_LIMIT = 10 * 1024 * 1024;

const { t } = useI18n();
const profileStore = useProfileStore();
// 修复（严格模式 noUnusedLocals）：sessionStore 仅在注释中提及，实际未使用，已移除。

/** 照片墙 URL 数组（响应式） */
const { photoGallery } = storeToRefs(profileStore);

/** 是否正在上传中（控制 loading 蒙层 + 防重复触发） */
const isUploading = ref<boolean>(false);
/** 当前正在上传的照片索引（用于精确显示 loading 蒙层位置） */
const uploadingIndex = ref<number>(-1);
/** 错误信息（用于错误状态展示） */
const errorMessage = ref<string | null>(null);

/**
 * 返回上一页（自定义导航栏返回键，navigationStyle: custom 无系统返回栏）。
 * 无上一页时（如从 reLaunch/直达进入）回退到首页 tab。
 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: "/pages/home/index" });
  }
}

/**
 * 照片格子列表（始终渲染 6 格）
 * - 已上传的格子：filled=true + url
 * - 空格子：filled=false + url=""
 * 顺序：已上传照片在前，空位在后
 */
const photoCells = computed<Array<{ index: number; url: string; filled: boolean }>>(() => {
  const cells: Array<{ index: number; url: string; filled: boolean }> = [];
  for (let i = 0; i < PHOTO_GALLERY_MAX; i++) {
    const url = photoGallery.value[i] ?? "";
    cells.push({ index: i, url, filled: url.length > 0 });
  }
  return cells;
});

/** 是否有空位可继续上传 */
const hasEmptySlot = computed(() => photoGallery.value.length < PHOTO_GALLERY_MAX);

/** 已上传照片数量 */
const photoCount = computed(() => photoGallery.value.length);

/**
 * 从 uni.chooseImage 返回值构造类 File 对象。
 *
 * 兼容 H5（File 标准）与 mp-weixin（tempFilePaths + path 字段）双端：
 * - H5：uni.chooseImage 返回 tempFiles，每项是标准 File
 * - mp-weixin：tempFiles 仅含 path/size，无 name 字段，包装为 File-like
 *
 * 返回 UniUploadFileLike 而非 File，避免 `as unknown as File` 交叉类型断言：
 * mp-weixin 端无 File 类型，强行断言会引入运行时风险；
 * UniUploadFileLike 仅约束上传所需的最小契约（name + 可选 path），双端兼容。
 *
 * @param filePath - 文件路径（tempFilePath）
 * @returns 类 File 对象（含 name/path 字段，满足 clientApi 上传签名）
 */
function buildFileLike(filePath: string): UniUploadFileLike {
  const name = filePath.split("/").pop() || "upload";
  // 构造 UniUploadFileLike 对象，无需断言；
  // H5 端 filePath 是 blob: URL，mp-weixin 端是 tempFilePath，
  // 均由 uploadFileViaUni 通过 path 字段处理。
  return { name, path: filePath };
}

/**
 * 加载相册数据（复用 profileStore.load）
 * 错误处理：捕获异常并设置 errorMessage，不向上抛出
 */
async function loadAlbum(): Promise<void> {
  errorMessage.value = null;
  try {
    await profileStore.fetchProfile();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("common.networkError");
  }
}

/**
 * 选择并上传一张照片到指定索引位置。
 *
 * 流程：
 * 1. uni.chooseImage 选择单张压缩图
 * 2. 校验文件大小（≤ 10MB）
 * 3. 构造类 File 对象（兼容 mp-weixin path 字段）
 * 4. 调用 profileStore.uploadPhotoAtIndex 上传 + 更新本地状态
 * 5. 上传中显示 loading + 进度文案，上传完成 toast 提示
 * 6. 失败时 toast 提示错误信息
 *
 * @param index - 目标索引（0-5），若不传则追加到末尾第一个空位
 *
 * Task 0.2.4：调用 chooseImage 前先调用 ensurePrivacyAuthorized 检查隐私授权。
 */
async function handleAddPhoto(index?: number): Promise<void> {
  // 防重复触发
  if (isUploading.value) return;
  // 已满 6 张，不允许继续上传
  if (photoGallery.value.length >= PHOTO_GALLERY_MAX) {
    uni.showToast({ title: t("profile.albumFull", { n: PHOTO_GALLERY_MAX }), icon: "none" });
    return;
  }
  // 计算目标索引：未指定时追加到末尾第一个空位
  const targetIndex = index ?? photoGallery.value.length;
  lightHaptic();
  // 隐私授权预检查：未同意隐私协议时直接终止，避免 chooseImage 触发 fail
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    errorHaptic();
    uni.showToast({
      title: t("profile.privacyRequiredImage"),
      icon: "none",
    });
    return;
  }
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      const tempPath = res.tempFilePaths?.[0] ?? "";
      // 修复（严格模式 TS7053）：res.tempFiles 类型为联合类型
      // （File | File[] | ChooseImageSuccessCallbackResultFile | ChooseImageSuccessCallbackResultFile[]），
      // 直接索引 [0] 会报隐式 any；通过 Array.isArray 类型守卫收敛后再索引。
      const tempFilesRaw: unknown = res.tempFiles;
      const tempFile = Array.isArray(tempFilesRaw) ? tempFilesRaw[0] : undefined;
      const size = (tempFile as { size?: number } | undefined)?.size ?? 0;
      if (!tempPath) {
        uni.showToast({ title: t("profile.noPhotoSelected"), icon: "none" });
        return;
      }
      // 校验文件大小
      if (size > PHOTO_SIZE_LIMIT) {
        uni.showToast({ title: t("profile.photoSizeLimit"), icon: "none" });
        return;
      }
      const file = buildFileLike(tempPath);
      void uploadPhoto(file, targetIndex);
    },
    fail: (err) => {
      // 用户取消选择时不报错（errMsg 包含 "cancel"）
      if (err && typeof err.errMsg === "string" && err.errMsg.includes("cancel")) {
        return;
      }
      uni.showToast({ title: t("profile.photoChooseFailed"), icon: "none" });
    },
  });
}

/**
 * 执行照片上传（内联辅助函数，统一处理 loading / 错误）
 *
 * @param file - 类 File 对象
 * @param index - 目标索引
 */
async function uploadPhoto(file: UniUploadFileLike, index: number): Promise<void> {
  isUploading.value = true;
  uploadingIndex.value = index;
  errorMessage.value = null;
  try {
    await profileStore.uploadPhotoAtIndex(file, index);
    successHaptic();
    uni.showToast({ title: t("profile.albumUploadSuccess"), icon: "success" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : t("profile.albumUploadFailed");
    errorMessage.value = msg;
    errorHaptic();
    uni.showToast({ title: msg, icon: "none" });
  } finally {
    isUploading.value = false;
    uploadingIndex.value = -1;
  }
}

/**
 * 长按照片弹出操作菜单：设为头像 / 删除
 *
 * 使用 uni.showActionSheet 实现，兼容 mp-weixin 与 H5 双端。
 *
 * @param index - 照片索引
 */
function handleLongPress(index: number): void {
  if (index < 0 || index >= photoGallery.value.length) return;
  lightHaptic();
  uni.showActionSheet({
    itemList: [t("profile.albumSetAvatar"), t("profile.albumDelete")],
    success: (res) => {
      if (res.tapIndex === 0) {
        void setAsAvatar(index);
      } else if (res.tapIndex === 1) {
        void confirmDelete(index);
      }
    },
    fail: (_e) => {
      // 用户取消，无需处理
    },
  });
}

/**
 * 将指定照片设为头像（2026-08-09 真实化）。
 *
 * 链路：resolveMediaUrl 鉴权代理 → uni.downloadFile 下载原图 →
 * profileStore.uploadAvatar 重新上传为头像（走真实 POST /profile/avatar + 审核链路）。
 * 下载失败（如 H5 跨域 / mock 静态路径）时回退原有本地重排逻辑，保证交互闭环。
 *
 * @param index - 照片索引
 */
async function setAsAvatar(index: number): Promise<void> {
  const url = photoGallery.value[index];
  if (!url) return;
  // mock 演示态（mock:// 或包内静态路径）无需下载，直接本地重排（mock fixture 不校验文件内容）
  if (url.startsWith("mock://") || url.startsWith("/static/")) {
    localReorderAsAvatar(index);
    return;
  }
  isUploading.value = true;
  try {
    const filePath = await downloadToTemp(resolveMediaUrl(url));
    const file = buildFileLike(filePath);
    await profileStore.uploadAvatar(file);
    successHaptic();
    uni.showToast({ title: t("profile.albumSetAvatarSuccess"), icon: "success" });
  } catch (error) {
    // 下载/上传失败：回退本地重排，保证交互闭环
    localReorderAsAvatar(index);
    const msg = error instanceof Error ? error.message : t("profile.albumSetAvatarFailed");
    errorHaptic();
    uni.showToast({ title: msg, icon: "none" });
  } finally {
    isUploading.value = false;
  }
}

/**
 * 下载图片到本地临时路径（鉴权代理 URL 需带 token 才能读取）。
 *
 * @param url - 已解析的媒体 URL
 * @returns 本地临时文件路径
 */
function downloadToTemp(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
          resolve(res.tempFilePath);
        } else {
          reject(new Error(`download failed: ${res.statusCode}`));
        }
      },
      fail: (err) => reject(err),
    });
  });
}

/**
 * 本地重排兜底（原实现）：将选中照片移至 photoGallery[0]，仅本地生效。
 */
function localReorderAsAvatar(index: number): void {
  const next = [...photoGallery.value];
  const [removed] = next.splice(index, 1);
  next.unshift(removed ?? "");
  photoGallery.value = next;
}

/**
 * 删除照片（带二次确认）
 *
 * @param index - 照片索引
 */
async function confirmDelete(index: number): Promise<void> {
  if (index < 0 || index >= photoGallery.value.length) return;
  uni.showModal({
    title: t("profile.albumDelete"),
    content: t("profile.albumDeleteConfirm"),
    confirmText: t("common.confirm"),
    cancelText: t("common.cancel"),
    success: (res) => {
      if (res.confirm) {
        void doDelete(index);
      }
    },
  });
}

/**
 * 执行删除操作
 *
 * @param index - 照片索引
 */
async function doDelete(index: number): Promise<void> {
  try {
    await profileStore.removePhotoAtIndex(index);
    successHaptic();
    uni.showToast({ title: t("profile.albumDeleteSuccess"), icon: "success" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : t("profile.albumDeleteFailed");
    errorHaptic();
    uni.showToast({ title: msg, icon: "none" });
  }
}

/**
 * 点击已上传照片：全屏预览
 *
 * @param index - 照片索引
 */
function handlePhotoTap(index: number): void {
  const url = photoGallery.value[index];
  if (!url) return;
  lightHaptic();
  uni.previewImage({
    urls: photoGallery.value,
    current: url,
  });
}

/**
 * 重试加载（错误状态下点击重试按钮）
 */
function handleRetry(): void {
  errorHaptic();
  void loadAlbum();
}

onMounted(() => {
  void loadAlbum();
});

onShow(() => {
  // 切换 Tab 返回时刷新数据，确保最新状态
  void loadAlbum();
});
</script>

<template>
  <view class="album-page">
    <!-- 页面标题（2026-08-09：左侧补返回键） -->
    <view class="album-header">
      <view
        class="album-header__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.back')"
        @tap="goBack"
      >
        <image class="album-header__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
      </view>
      <text class="album-header__title">{{ t("profile.albumTitle") }}</text>
      <text class="album-header__count" v-if="photoCount > 0">
        {{ photoCount }} / {{ PHOTO_GALLERY_MAX }}
      </text>
    </view>

    <!-- 错误状态 -->
    <view v-if="errorMessage" class="album-error card-base" role="alert">
      <text class="album-error__title">{{ errorMessage }}</text>
      <view class="album-error__retry press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="handleRetry">
        <text class="album-error__retry-text">{{ t("common.retry") }}</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="photoCount === 0 && !isUploading" class="album-empty card-base">
      <SafeImage
        :src="IMAGE_PATHS.ICONS_SOCIAL.HEART_SIGNAL"
        custom-class="album-empty__icon"
        mode="aspectFit"
      />
      <text class="album-empty__title">{{ t("profile.albumEmpty") }}</text>
      <text class="album-empty__subtitle">{{ t("profile.albumEmptyDesc") }}</text>
      <view
        class="album-empty__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="handleAddPhoto()"
      >
        <text class="album-empty__btn-text">{{ t("profile.albumAddPhoto") }}</text>
      </view>
    </view>

    <!-- 照片墙网格（6 格） -->
    <view v-else class="album-grid">
      <view
        v-for="cell in photoCells"
        :key="cell.index"
        class="album-cell press-feedback"
        :class="{
          'album-cell--filled': cell.filled,
          'album-cell--uploading': uploadingIndex === cell.index,
        }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="cell.filled ? handlePhotoTap(cell.index) : handleAddPhoto(cell.index)"
        @longpress="cell.filled ? handleLongPress(cell.index) : undefined"
      >
        <!-- 已上传照片 -->
        <image
          v-if="cell.filled"
          class="album-cell__img"
          :src="resolveMediaUrl(cell.url)"
          mode="aspectFill"
          lazy-load alt=""
        />
        <!-- 上传中蒙层 -->
        <view v-if="uploadingIndex === cell.index" class="album-cell__loading">
          <view class="album-cell__spinner" />
          <text class="album-cell__loading-text">{{ t("profile.uploading") }}</text>
        </view>
        <!-- 空位 + 号占位 -->
        <view v-if="!cell.filled" class="album-cell__placeholder">
          <text class="album-cell__plus">+</text>
        </view>
      </view>
    </view>

    <!-- 底部添加按钮（仅在有照片且未满时显示） -->
    <view
      v-if="photoCount > 0 && hasEmptySlot && !isUploading"
      class="album-add-btn press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      @tap="handleAddPhoto()"
    >
      <text class="album-add-btn__text">{{ t("profile.albumAddPhoto") }}</text>
    </view>

    <!-- 长按提示文案 -->
    <view v-if="photoCount > 0" class="album-tip">
      <text class="album-tip__text">{{ t("profile.albumPreviewLongPress") }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.album-page {
  display: flex;
  flex-direction: column;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
  background: var(--c-gradient-page);
  padding: var(--sp-6) var(--sp-8);
  padding-top: calc(env(safe-area-inset-top) + var(--sp-6));
  box-sizing: border-box;
}

/* ========== 页面标题 ========== */
.album-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--section-gap);
}

/* 2026-08-09：返回键（圆角图标按钮） */
.album-header__back {
  flex-shrink: 0;
  align-self: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-header__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.album-header__title {
  font-size: var(--fs-5xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.album-header__count {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  font-variant-numeric: tabular-nums;
}

/* ========== 错误状态 ========== */
.album-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-10);
  margin-top: var(--sp-5);
}

.album-error__title {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  text-align: center;
}

.album-error__retry {
  padding: var(--sp-3) var(--sp-6);
  background: var(--c-brand);
  border-radius: var(--r-full);
}

.album-error__retry-text {
  /* 反色文字：使用 token 替代硬编码 #ffffff */
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  font-weight: 600;
}

/* ========== 空状态 ========== */
.album-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-5);
  padding: var(--sp-10);
  margin-top: var(--sp-5);
}

.album-empty__icon {
  width: 120rpx;
  height: 120rpx;
  opacity: 0.5;
}

.album-empty__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.album-empty__subtitle {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  text-align: center;
}

.album-empty__btn {
  padding: var(--sp-3) var(--sp-8);
  background: var(--c-brand);
  border-radius: var(--r-full);
  margin-top: var(--sp-3);
}

.album-empty__btn-text {
  /* 反色文字：使用 token 替代硬编码 #ffffff */
  color: var(--c-text-inverse);
  font-size: var(--fs-md);
  font-weight: 600;
}

/* ========== 照片墙网格 ========== */
/* mp-weixin 不支持 display:grid，改用 Flexbox + 子元素 width: calc 实现三列等宽布局 */
.album-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.album-cell {
  position: relative;
  /* 3 列布局：每行 3 张，gap var(--sp-3) 共 2 个间隙 → width = calc((100% - 2*sp-3) / 3) */
  width: calc((100% - 2 * var(--sp-3)) / 3);
  /* mp-weixin 不支持 aspect-ratio，改用 padding-top 百分比（1:1 → 100%） */
  padding-top: calc((100% - 2 * var(--sp-3)) / 3);
  border-radius: var(--r-lg);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  overflow: hidden;
  box-sizing: border-box;
}

.album-cell--filled {
  background: var(--c-bg-page);
}

.album-cell__img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.album-cell__placeholder {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.album-cell__plus {
  font-size: 56rpx;
  color: var(--c-text-tertiary);
  font-weight: 300;
  line-height: 1;
}

.album-cell__loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-bg-overlay, rgba(15, 23, 42, 0.45));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
}

.album-cell__spinner {
  width: var(--sp-8);
  height: var(--sp-8);
  border: var(--sp-1) solid rgba(255, 255, 255, 0.3);
  /* 反色文字：使用 token 替代硬编码 #ffffff */
  border-top-color: var(--c-text-inverse);
  border-radius: var(--r-full);
  animation: album-spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes album-spin {
  to { transform: rotate(360deg); }
}

.album-cell__loading-text {
  font-size: var(--fs-sm);
  /* 反色文字：使用 token 替代硬编码 #ffffff */
  color: var(--c-text-inverse);
}

/* ========== 底部添加按钮 ========== */
.album-add-btn {
  margin-top: var(--sp-6);
  padding: var(--sp-4) var(--sp-8);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-card-soft);
}

.album-add-btn__text {
  color: var(--c-brand);
  font-size: var(--fs-md);
  font-weight: 600;
}

/* ========== 长按提示 ========== */
.album-tip {
  margin-top: var(--sp-5);
  text-align: center;
}

.album-tip__text {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}
</style>
