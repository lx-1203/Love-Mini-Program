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
import { useSessionStore } from "../../stores/session";
import { IMAGE_PATHS } from "../../config/images";
import SafeImage from "../../components/common/SafeImage.vue";
import { errorHaptic, lightHaptic, successHaptic } from "../../utils/haptic";

/** 照片墙最大数量（与后端契约一致，6 张） */
const PHOTO_GALLERY_MAX = 6;

/** 单张照片大小上限（10MB，与上传接口约定一致） */
const PHOTO_SIZE_LIMIT = 10 * 1024 * 1024;

const { t } = useI18n();
const profileStore = useProfileStore();
const sessionStore = useSessionStore();

/** 照片墙 URL 数组（响应式） */
const { photoGallery } = storeToRefs(profileStore);

/** 是否正在上传中（控制 loading 蒙层 + 防重复触发） */
const isUploading = ref<boolean>(false);
/** 当前正在上传的照片索引（用于精确显示 loading 蒙层位置） */
const uploadingIndex = ref<number>(-1);
/** 错误信息（用于错误状态展示） */
const errorMessage = ref<string | null>(null);

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
 * @param filePath - 文件路径（tempFilePath）
 * @param size - 文件大小（字节）
 * @returns 类 File 对象（含 name/path/size 字段，满足 clientApi 上传签名）
 */
function buildFileLike(filePath: string, size: number): File {
  const name = filePath.split("/").pop() || "upload";
  // H5 端 filePath 实际是 blob: URL，无法直接转换为 File；
  // 这里构造一个类 File 对象，由 uploadFileViaUni 通过 path 字段处理
  return { name, size, type: "application/octet-stream", path: filePath } as unknown as File;
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
 */
function handleAddPhoto(index?: number): void {
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
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      const tempPath = res.tempFilePaths?.[0] ?? "";
      const tempFile = res.tempFiles?.[0];
      const size = (tempFile as { size?: number })?.size ?? 0;
      if (!tempPath) {
        uni.showToast({ title: t("profile.noPhotoSelected"), icon: "none" });
        return;
      }
      // 校验文件大小
      if (size > PHOTO_SIZE_LIMIT) {
        uni.showToast({ title: t("profile.photoSizeLimit"), icon: "none" });
        return;
      }
      const file = buildFileLike(tempPath, size);
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
async function uploadPhoto(file: File, index: number): Promise<void> {
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
 * 将指定照片设为头像。
 *
 * 调用 sessionStore 更新本地头像 URL，并 toast 提示。
 * 注：后端暂未提供独立的"设为头像"接口，前端通过更新 sessionStore.avatarUrl 实现交互闭环。
 *
 * @param index - 照片索引
 */
async function setAsAvatar(index: number): Promise<void> {
  const url = photoGallery.value[index];
  if (!url) return;
  try {
    // 将选中照片移至 photoGallery[0]（头像位），通过 profileStore 更新本地状态
    // 注：后端暂未提供独立的"设为头像"接口，前端通过调整照片墙顺序实现交互闭环
    const next = [...photoGallery.value];
    next.splice(index, 1);
    next.unshift(url);
    photoGallery.value = next;
    successHaptic();
    uni.showToast({ title: t("profile.albumSetAvatarSuccess"), icon: "success" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : t("profile.albumSetAvatarFailed");
    errorHaptic();
    uni.showToast({ title: msg, icon: "none" });
  }
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
  <view class="album-page page-fade-in">
    <!-- 页面标题 -->
    <view class="album-header">
      <text class="album-header__title">{{ t("profile.albumTitle") }}</text>
      <text class="album-header__count" v-if="photoCount > 0">
        {{ photoCount }} / {{ PHOTO_GALLERY_MAX }}
      </text>
    </view>

    <!-- 错误状态 -->
    <view v-if="errorMessage" class="album-error card-base">
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
          :src="cell.url"
          mode="aspectFill"
          lazy-load
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
  min-height: 100vh;
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
  color: #ffffff;
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
  color: #ffffff;
  font-size: var(--fs-md);
  font-weight: 600;
}

/* ========== 照片墙网格 ========== */
.album-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-3);
}

.album-cell {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--r-lg);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-cell--filled {
  background: var(--c-bg-page);
}

.album-cell__img {
  width: 100%;
  height: 100%;
  display: block;
}

.album-cell__placeholder {
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
  background: rgba(0, 0, 0, 0.45);
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
  border-top-color: #ffffff;
  border-radius: var(--r-full);
  animation: album-spin 1s linear infinite;
}

@keyframes album-spin {
  to { transform: rotate(360deg); }
}

.album-cell__loading-text {
  font-size: var(--fs-sm);
  color: #ffffff;
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
