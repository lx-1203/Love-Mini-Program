<script setup lang="ts">
/**
 * 基础资料编辑页（MP-R6-EDITPAGE，2026-09-14 全量重写）
 *
 * 设计对齐：注册页设计包（deliverables/注册页/寻觅注册页-高保真设计稿.html + 设计规范 v1.0）。
 * 用户要求：编辑资料页与注册时所见页面保持同一设计语言——
 * hero 插图全出血 + 渐隐 + 白色表单卡骑压 + 图标字段（96rpx · 圆角 24rpx ·
 * 聚焦品牌色光环）+ 行内错误（红框 + 抖动）+ 渐变主按钮。
 *
 * 功能保持（不因重构丢失）：
 * - 头像 + 照片墙（MP-R5-EDITPAGE 链路：ensurePrivacyAuthorized → chooseImage →
 *   profileStore.uploadAvatar/uploadPhotoAtIndex，后端落 users.avatar_url /
 *   photoGallery 并 recordUpload 进 media_asset → 管理后台可审核管理）
 * - 全部字段：nickname/bio/grade/pronouns/height/educationLevel/relationshipStatus/
 *   hometownProvince/hometownCity/futureCity/expectedPartner
 * - 身份分流（student → 校园认证；non_student → 时间安排）
 * - 提交锁 + 必填 4 字段全量携带 + 可选字段 diff 语义（PUT /profile/basic 契约）
 *
 * 双模式（2026-09-14 流程修复）：
 * - wizard（默认，注册向导）：显示 SetupProgress，保存后 redirectTo 下一步
 * - edit（?entry=edit，从「我的」进入）：隐藏进度条，保存后 navigateBack 返回
 *   ——修复原实现编辑保存后被误投递到注册向导下一身份步骤的流程断裂。
 */
import { computed, onMounted, reactive, ref, onUnmounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import SetupProgress from "../../../components/setup/SetupProgress.vue";
import { ROUTES, SUBPACKAGE_ROUTES } from "../../../constants/routes";
import { IMAGE_PATHS } from "../../../config/images";
import { useProfileStore } from "../../../stores/profile";
import { useSessionStore } from "../../../stores/session";
import { clientApi } from "../../../services/api";
import { lightHaptic, successHaptic } from "../../../utils/haptic";
import type { UpdateBasicProfileRequest } from "../../../services/generated/api-types-supplement";
// MP-R5-EDITPAGE：头像 + 照片墙（复用我的页同款链路，上传落 media_asset → 后台可审）
import { ensurePrivacyAuthorized } from "../../../utils/privacy";
import { resolveMediaUrl } from "../../../utils/media";
import type { UniUploadFileLike } from "../../../services/api";
// 2026-08-07 流程重构：注册第 1 步身份选择（学生/非学生），决定后续分支
import {
  loadIdentity,
  saveIdentity,
  type UserIdentity,
} from "../../../config/identity";

const ICONS = IMAGE_PATHS.REGISTER_ICONS;

const profileStore = useProfileStore();
const sessionStore = useSessionStore();
const { t } = useI18n();

/* ---------------- 页面模式（wizard=注册向导 / edit=编辑资料） ---------------- */
const entryMode = ref<"wizard" | "edit">("wizard");
onLoad((options: Record<string, string> | undefined) => {
  if (options && options.entry === "edit") {
    entryMode.value = "edit";
  }
});

/** 返回：有页面栈则 back（向导→注册成功页；编辑→我的页），无栈兜底回首页 */
function goBack(): void {
  lightHaptic();
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: ROUTES.TAB.HOME });
  }
}

/* ---------------- 输入处理与校验（对齐注册页：行内错误 + 抖动 + Toast） ---------------- */
type FieldKey = "nickname" | "bio" | "grade" | "pronouns" | "height";
/** 行内错误（管「哪个字段错了」，Toast 管「整次结果」） */
const errors = ref<Record<FieldKey, string>>({
  nickname: "",
  bio: "",
  grade: "",
  pronouns: "",
  height: "",
});
/** 抖动中的字段（红框 + 抖动 4px × 2） */
const shakeField = ref<FieldKey | "">("");
let shakeTimer: ReturnType<typeof setTimeout> | null = null;

function shake(field: FieldKey): void {
  shakeField.value = "";
  if (shakeTimer) clearTimeout(shakeTimer);
  // 强制重启动画：先摘掉类，下一帧再挂上
  shakeTimer = setTimeout(() => {
    shakeField.value = field;
    shakeTimer = setTimeout(() => {
      shakeField.value = "";
    }, 400);
  }, 30);
}

function clearError(field: FieldKey): void {
  if (errors.value[field]) errors.value[field] = "";
}

/** 输入框焦点态（品牌色边框 + 光环，对齐注册页） */
const focusField = ref("");
const focusHandlers = {
  nickname: { focus: () => (focusField.value = "nickname"), blur: () => (focusField.value = "") },
  bio: { focus: () => (focusField.value = "bio"), blur: () => (focusField.value = "") },
  pronouns: { focus: () => (focusField.value = "pronouns"), blur: () => (focusField.value = "") },
  hometownProvince: { focus: () => (focusField.value = "hometownProvince"), blur: () => (focusField.value = "") },
  hometownCity: { focus: () => (focusField.value = "hometownCity"), blur: () => (focusField.value = "") },
  futureCity: { focus: () => (focusField.value = "futureCity"), blur: () => (focusField.value = "") },
  expectedPartner: { focus: () => (focusField.value = "expectedPartner"), blur: () => (focusField.value = "") },
};

/* ---------------- 身份（注册第 1 步选择，决定向导分支） ---------------- */
const identity = ref<UserIdentity>(loadIdentity());

/** 身份选项（i18n 化） */
const identityOptions = computed(() => [
  { value: "student" as const, label: t("setup.profile.identityStudent"), desc: t("setup.profile.identityStudentDesc") },
  { value: "non_student" as const, label: t("setup.profile.identityNonStudent"), desc: t("setup.profile.identityNonStudentDesc") },
]);

/** 身份选择 change 事件（即时持久化） */
function onIdentityChange(value: UserIdentity): void {
  if (identity.value === value) return;
  identity.value = value;
  saveIdentity(value);
  lightHaptic();
}

/** 按身份分流：学生 → 校园认证（步骤 2/4）；非学生 → 时间安排（跳过校园认证） */
function getNextSetupPath(): string {
  // P0-35：非学生跳过校园认证进入时间安排（完成度 30+20=50）；学生流程 30+30+20=80
  return identity.value === "non_student"
    ? SUBPACKAGE_ROUTES.SETUP_PROGRESS.SCHEDULE
    : SUBPACKAGE_ROUTES.SETUP_PROGRESS.CAMPUS;
}

// 修复（严格模式 noUnusedLocals）：vue-tsc 对 setTimeout 闭包内经
// getNextSetupPath 间接使用 SUBPACKAGE_ROUTES 识别失败（模板指令解析干扰），
// 通过 defineExpose 标记为已使用。
defineExpose({ SUBPACKAGE_ROUTES });

/**
 * SubTask 1.5.2：保存成功/无变更后跳转的定时器引用，卸载时清理。
 */
let saveSuccessNavTimer: ReturnType<typeof setTimeout> | null = null;

onUnmounted(() => {
  if (saveSuccessNavTimer) {
    clearTimeout(saveSuccessNavTimer);
    saveSuccessNavTimer = null;
  }
  if (shakeTimer) {
    clearTimeout(shakeTimer);
    shakeTimer = null;
  }
});

/* ---------------- 表单数据（含 Phase A 扩展字段） ---------------- */
const form = reactive<UpdateBasicProfileRequest>({
  nickname: "",
  bio: "",
  grade: "",
  pronouns: "",
  height: undefined,
  educationLevel: undefined,
  relationshipStatus: undefined,
  hometownProvince: "",
  hometownCity: "",
  futureCity: "",
  expectedPartner: "",
});

/** 学历选项（i18n 化） */
const educationLevelOptions = computed(() => [
  { label: t("setup.profile.educationHighSchool"), value: "high_school" },
  { label: t("setup.profile.educationBachelor"), value: "bachelor" },
  { label: t("setup.profile.educationMaster"), value: "master" },
  { label: t("setup.profile.educationPhd"), value: "phd" },
]);

/** 感情状态选项（i18n 化） */
const relationshipStatusOptions = computed(() => [
  { label: t("setup.profile.relationshipNever"), value: "never" },
  { label: t("setup.profile.relationshipMarriedBefore"), value: "married_before" },
  { label: t("setup.profile.relationshipDivorced"), value: "divorced" },
  { label: t("setup.profile.relationshipWidowed"), value: "widowed" },
]);

/** 当前选中的学历（picker 回显） */
const educationLevelLabel = ref<string>("");
/** 当前选中的感情状态（picker 回显） */
const relationshipStatusLabel = ref<string>("");

/** 年级选项（i18n 化） */
const gradeOptions = computed(() => [
  t("setup.profile.gradeFreshman"),
  t("setup.profile.gradeSophomore"),
  t("setup.profile.gradeJunior"),
  t("setup.profile.gradeSenior"),
  t("setup.profile.gradeGrad1"),
  t("setup.profile.gradeGrad2"),
  t("setup.profile.gradeGrad3"),
  t("setup.profile.gradeGraduated"),
]);

/** 年级 picker 回显 */
const gradeLabel = ref<string>("");

/** 身高选项（140-200 cm，步长 1） */
const heightOptions = computed(() => {
  const list: string[] = [];
  for (let h = 140; h <= 200; h++) {
    list.push(`${h}cm`);
  }
  return list;
});

/** 身高 picker 回显 */
const heightLabel = ref<string>("");

/** 年级 picker change 事件（索引强制 Number，与身高同口径） */
function onGradeChange(e: { detail: { value: number } }): void {
  const idx = Number(e.detail.value);
  const opt = gradeOptions.value[idx];
  if (opt) {
    form.grade = opt;
    gradeLabel.value = opt;
    clearError("grade");
    lightHaptic();
  }
}

/** 身高 picker change 事件（140-200，存储数字；索引强制 Number 防字符串拼接越界） */
function onHeightChange(e: { detail: { value: number } }): void {
  const idx = Number(e.detail.value);
  const opt = heightOptions.value[idx];
  if (opt) {
    form.height = 140 + idx;
    heightLabel.value = opt;
    clearError("height");
    lightHaptic();
  }
}

/** 字符长度限制常量（与后端 @Size 契约一致） */
const NICKNAME_MAX_LENGTH = 30;
const BIO_MAX_LENGTH = 160;

/** 提交锁：防止连续点击保存按钮触发重复提交 */
const isSubmitting = ref(false);

/** 必填 5 项齐备 → 主按钮可用态（置灰仍可点，给「哪里没填对」定位提示，对齐注册页） */
const formComplete = computed(
  () =>
    !!(form.nickname ?? "").trim() &&
    !!(form.bio ?? "").trim() &&
    !!form.grade &&
    !!(form.pronouns ?? "").trim() &&
    form.height !== undefined &&
    form.height !== null,
);

/* ================= MP-R5-EDITPAGE：头像与照片墙 ================= */
/** 头像/照片上传进行中（防重复触发与并发上传） */
const isMediaUploading = ref(false);
/** 正在上传的照片墙槽位（-1 = 无；用于宫格按钮 loading 态） */
const photoUploadingIndex = ref(-1);

/** 从 uni.chooseImage 返回路径构造类 File（兼容 H5 / mp-weixin 双端） */
function buildFileLike(filePath: string): UniUploadFileLike {
  const name = filePath.split("/").pop() || "upload";
  return { name, path: filePath };
}

/** 点击头像：相册 / 相机二选一（actionSheet），随后走隐私授权 → 选图 → 上传 */
function onAvatarTap(): void {
  if (isMediaUploading.value) return;
  uni.showActionSheet({
    itemList: [t("setup.profile.avatarAlbum"), t("setup.profile.avatarCamera")],
    success: (res) => {
      void chooseAvatarFrom(res.tapIndex === 1 ? "camera" : "album");
    },
    fail: () => {},
  });
}

/** 隐私授权 → uni.chooseImage → 上传头像（与我的页 chooseAvatarImage 同语义） */
async function chooseAvatarFrom(sourceType: "album" | "camera"): Promise<void> {
  if (isMediaUploading.value) return;
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({ title: t("setup.profile.privacyRequiredImage"), icon: "none" });
    return;
  }
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: [sourceType],
    success: (res) => {
      const tempPath = res.tempFilePaths?.[0] ?? "";
      if (!tempPath) {
        uni.showToast({ title: t("setup.profile.noPhotoSelected"), icon: "none" });
        return;
      }
      void uploadAvatarFile(buildFileLike(tempPath));
    },
    fail: (err) => {
      if (!String(err?.errMsg || "").includes("cancel")) {
        uni.showToast({ title: t("setup.profile.choosePhotoFailed"), icon: "none" });
      }
    },
  });
}

/** 实际执行头像上传（profileStore.uploadAvatar 成功后 store 即时回写 avatarUrl） */
async function uploadAvatarFile(file: UniUploadFileLike): Promise<void> {
  isMediaUploading.value = true;
  try {
    await profileStore.uploadAvatar(file);
    successHaptic();
    uni.showToast({ title: t("setup.profile.avatarUpdated"), icon: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : t("setup.profile.uploadFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    isMediaUploading.value = false;
  }
}

/** 点击照片墙槽位：空位 → 选图上传到该槽；已占用 → 确认删除 */
function onPhotoSlotTap(index: number): void {
  if (isMediaUploading.value) return;
  if (index < profileStore.photoGallery.length) {
    uni.showModal({
      title: t("setup.profile.photoWallLabel"),
      content: t("setup.profile.deletePhotoConfirm"),
      confirmColor: "#E5454D",
      success: (res) => {
        if (res.confirm) void deletePhotoAt(index);
      },
    });
    return;
  }
  // 仅允许下一个空位按顺序上传（与后端 photoGallery 数组语义一致：index = 当前长度）
  if (index > profileStore.photoGallery.length) {
    onPhotoSlotTap(profileStore.photoGallery.length);
    return;
  }
  void choosePhotoForSlot(index);
}

/** 隐私授权 → 选图 → 上传到照片墙指定索引 */
async function choosePhotoForSlot(index: number): Promise<void> {
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({ title: t("setup.profile.privacyRequiredImage"), icon: "none" });
    return;
  }
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      const tempPath = res.tempFilePaths?.[0] ?? "";
      if (!tempPath) {
        uni.showToast({ title: t("setup.profile.noPhotoSelected"), icon: "none" });
        return;
      }
      void uploadPhotoFile(buildFileLike(tempPath), index);
    },
    fail: (err) => {
      if (!String(err?.errMsg || "").includes("cancel")) {
        uni.showToast({ title: t("setup.profile.choosePhotoFailed"), icon: "none" });
      }
    },
  });
}

/** 上传照片到指定索引（成功后 store 同步 photoGallery + 审核项 pending） */
async function uploadPhotoFile(file: UniUploadFileLike, index: number): Promise<void> {
  isMediaUploading.value = true;
  photoUploadingIndex.value = index;
  try {
    await profileStore.uploadPhotoAtIndex(file, index);
    successHaptic();
  } catch (error) {
    const message = error instanceof Error ? error.message : t("setup.profile.uploadFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    isMediaUploading.value = false;
    photoUploadingIndex.value = -1;
  }
}

/** 删除照片墙指定索引（store 内部调用 DELETE /profile/photos/{index}） */
async function deletePhotoAt(index: number): Promise<void> {
  isMediaUploading.value = true;
  try {
    await profileStore.removePhotoAtIndex(index);
    uni.showToast({ title: t("setup.profile.photoDeleted"), icon: "none" });
  } catch (error) {
    const message = error instanceof Error ? error.message : t("setup.profile.uploadFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    isMediaUploading.value = false;
  }
}

/** 头像展示地址（store 原值为后端返回 URL，real 模式经 resolveMediaUrl 解析） */
const avatarDisplayUrl = computed<string>(() => resolveMediaUrl(profileStore.avatarUrl));
/** 头像上传中（照片墙上传时头像不显示遮罩） */
const isAvatarUploading = computed<boolean>(() => isMediaUploading.value && photoUploadingIndex.value === -1);
/** 照片墙展示地址（6 槽，未占位为空串） */
const photoDisplayUrls = computed<string[]>(() => {
  const list: string[] = [];
  for (let i = 0; i < 6; i++) {
    list.push(i < profileStore.photoGallery.length ? resolveMediaUrl(profileStore.photoGallery[i]) : "");
  }
  return list;
});

/* ---------------- 初始快照 + diff 提交（防无谓请求与误清空） ---------------- */
let initialFormSnapshot: UpdateBasicProfileRequest = {};

/**
 * 构建仅包含变更字段的提交数据（可选字段 diff 语义）。
 */
function buildDiffPayload(): UpdateBasicProfileRequest {
  const diff: UpdateBasicProfileRequest = {};
  if (form.nickname !== initialFormSnapshot.nickname) diff.nickname = form.nickname;
  if (form.bio !== initialFormSnapshot.bio) diff.bio = form.bio;
  if (form.grade !== initialFormSnapshot.grade) diff.grade = form.grade;
  if (form.pronouns !== initialFormSnapshot.pronouns) diff.pronouns = form.pronouns;
  if (form.height !== initialFormSnapshot.height) diff.height = form.height;
  if (form.educationLevel !== initialFormSnapshot.educationLevel) diff.educationLevel = form.educationLevel;
  if (form.relationshipStatus !== initialFormSnapshot.relationshipStatus) diff.relationshipStatus = form.relationshipStatus;
  if (form.hometownProvince !== initialFormSnapshot.hometownProvince) diff.hometownProvince = form.hometownProvince;
  if (form.hometownCity !== initialFormSnapshot.hometownCity) diff.hometownCity = form.hometownCity;
  if (form.futureCity !== initialFormSnapshot.futureCity) diff.futureCity = form.futureCity;
  if (form.expectedPartner !== initialFormSnapshot.expectedPartner) diff.expectedPartner = form.expectedPartner;
  return diff;
}

/** 学历 picker change 事件 */
function onEducationLevelChange(e: { detail: { value: number } }): void {
  const idx = e.detail.value;
  const opt = educationLevelOptions.value[idx];
  if (opt) {
    form.educationLevel = opt.value;
    educationLevelLabel.value = opt.label;
    lightHaptic();
  }
}

/** 感情状态 picker change 事件 */
function onRelationshipStatusChange(e: { detail: { value: number } }): void {
  const idx = e.detail.value;
  const opt = relationshipStatusOptions.value[idx];
  if (opt) {
    form.relationshipStatus = opt.value;
    relationshipStatusLabel.value = opt.label;
    lightHaptic();
  }
}

onMounted(async () => {
  try {
    await profileStore.load();
  } catch (_e) {
    // 资料加载失败不阻塞页面——表单保持空值可编辑，用户仍可保存
  }
  const basic = profileStore.basicProfile;
  if (basic) {
    form.nickname = basic.nickname ?? "";
    form.bio = basic.bio ?? "";
    form.grade = basic.grade ?? "";
    form.pronouns = basic.pronouns ?? "";
    // 2026-09-12 修复（PUT /profile/basic 400）：后端为全量替换语义，
    // 必填 4 字段每次都要随请求携带；height/学历/感情状态同样从既有资料回填
    if (typeof basic.height === "number") {
      form.height = basic.height;
    }
    if (basic.educationLevel) {
      form.educationLevel = basic.educationLevel;
    }
    if (basic.relationshipStatus) {
      form.relationshipStatus = basic.relationshipStatus;
    }
  }
  // R4-00043：籍贯/未来城市回填用户既有值（编辑语义，而非校区推导）
  form.hometownProvince = basic?.hometownProvince ?? "";
  form.hometownCity = basic?.hometownCity ?? "";
  form.futureCity = basic?.futureCity ?? "";
  // 同步初始 picker 回显文案
  if (form.educationLevel) {
    const found = educationLevelOptions.value.find((o) => o.value === form.educationLevel);
    if (found) educationLevelLabel.value = found.label;
  }
  if (form.relationshipStatus) {
    const found = relationshipStatusOptions.value.find((o) => o.value === form.relationshipStatus);
    if (found) relationshipStatusLabel.value = found.label;
  }
  if (form.height !== undefined) {
    heightLabel.value = `${form.height}cm`;
  }
  if (form.grade) {
    gradeLabel.value = form.grade;
  }
  form.expectedPartner = basic?.expectedPartner ?? "";

  initialFormSnapshot = {
    ...form,
  };
});

/** 保存成功/无变更后的统一导航：wizard → 下一步；edit → 返回我的页 */
function navigateAfterSave(): void {
  if (saveSuccessNavTimer) clearTimeout(saveSuccessNavTimer);
  saveSuccessNavTimer = setTimeout(() => {
    saveSuccessNavTimer = null;
    if (entryMode.value === "edit") {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
      } else {
        uni.switchTab({ url: ROUTES.TAB.PROFILE });
      }
      return;
    }
    uni.redirectTo({ url: getNextSetupPath() });
  }, 600);
}

async function save() {
  // 提交锁：锁定期间忽略新的保存调用
  if (isSubmitting.value) return;

  // 输入验证（bio/grade/pronouns/height 为后端 @NotBlank/@Min 契约必填；
  // 对齐注册页：行内错误 + 抖动 + Toast 三通道反馈）
  if (!form.nickname || !form.nickname.trim()) {
    errors.value.nickname = t("setup.profile.errNicknameRequired");
    shake("nickname");
    uni.showToast({ title: t("setup.profile.errNicknameRequired"), icon: "none" });
    return;
  }
  if (form.nickname.length > NICKNAME_MAX_LENGTH) {
    errors.value.nickname = t("setup.profile.errNicknameTooLong", { n: NICKNAME_MAX_LENGTH });
    shake("nickname");
    uni.showToast({ title: t("setup.profile.errNicknameTooLong", { n: NICKNAME_MAX_LENGTH }), icon: "none" });
    return;
  }
  if (!form.bio || !form.bio.trim()) {
    errors.value.bio = t("setup.profile.errBioRequired");
    shake("bio");
    uni.showToast({ title: t("setup.profile.errBioRequired"), icon: "none" });
    return;
  }
  if (form.bio.length > BIO_MAX_LENGTH) {
    errors.value.bio = t("setup.profile.errBioTooLong", { n: BIO_MAX_LENGTH });
    shake("bio");
    uni.showToast({ title: t("setup.profile.errBioTooLong", { n: BIO_MAX_LENGTH }), icon: "none" });
    return;
  }
  if (!form.grade) {
    errors.value.grade = t("setup.profile.errGradeRequired");
    shake("grade");
    uni.showToast({ title: t("setup.profile.errGradeRequired"), icon: "none" });
    return;
  }
  if (!form.pronouns || !form.pronouns.trim()) {
    errors.value.pronouns = t("setup.profile.errPronounsRequired");
    shake("pronouns");
    uni.showToast({ title: t("setup.profile.errPronounsRequired"), icon: "none" });
    return;
  }
  if (form.height === undefined || form.height === null) {
    errors.value.height = t("setup.profile.errHeightRequired");
    shake("height");
    uni.showToast({ title: t("setup.profile.errHeightRequired"), icon: "none" });
    return;
  }
  isSubmitting.value = true;
  try {
    // 可选字段 diff：仅提交变更项（未传字段后端保留既有值）
    const diff = buildDiffPayload();

    if (Object.keys(diff).length === 0) {
      uni.showToast({ title: t("setup.profile.noChange"), icon: "none" });
      navigateAfterSave();
      return;
    }

    // 2026-09-12 修复（PUT /profile/basic 400）：nickname/bio/grade/pronouns
    // 为 @NotBlank 必填，每次请求全量携带；可选字段保持 diff 语义
    const payload: UpdateBasicProfileRequest = {
      nickname: form.nickname.trim(),
      bio: form.bio.trim(),
      grade: form.grade,
      pronouns: form.pronouns.trim(),
      height: form.height,
    };
    if (diff.educationLevel !== undefined) payload.educationLevel = diff.educationLevel;
    if (diff.relationshipStatus !== undefined) payload.relationshipStatus = diff.relationshipStatus;
    if (diff.hometownProvince !== undefined) payload.hometownProvince = diff.hometownProvince;
    if (diff.hometownCity !== undefined) payload.hometownCity = diff.hometownCity;
    if (diff.futureCity !== undefined) payload.futureCity = diff.futureCity;
    if (diff.expectedPartner !== undefined) payload.expectedPartner = diff.expectedPartner;

    await clientApi.updateBasicProfile(payload);
    // 同步刷新 session，更新 profileCompleted 状态
    await sessionStore.refreshSession();
    successHaptic();
    uni.showToast({ title: t("setup.profile.saveSuccess"), icon: "success" });
    navigateAfterSave();
  } catch (error) {
    const message = error instanceof Error ? error.message : t("setup.profile.saveFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <view class="edit-page">
    <!-- 页头：注册页同款插图全出血 + 底部渐隐 -->
    <view class="hero">
      <image class="hero__img" :src="IMAGE_PATHS.REGISTER.HERO" mode="aspectFill" alt="" />
      <view class="hero__fade" />
      <!-- 返回：白底 78% 圆形 + 背景模糊 -->
      <view
        class="hero__back press-feedback"
        role="button"
        :aria-label="t('setup.profile.backAria')"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        @tap="goBack"
      >
        <image class="hero__back-icon" :src="ICONS.BACK" mode="aspectFit" alt="" />
      </view>
      <!-- 标题组：插图左上留白区 -->
      <view class="hero__txt">
        <text class="hero__eyebrow">XUNMI · CAMPUS</text>
        <text class="hero__title">{{ t("setup.profile.pageTitle") }}</text>
        <text class="hero__sub">{{ t("setup.profile.pageSubtitle") }}</text>
      </view>
    </view>

    <!-- 表单卡：骑压插图 64rpx（32px），卡片阴影 -->
    <view class="card">
      <!-- 注册向导进度（仅 wizard 模式；edit 模式下「第 n 步」无意义） -->
      <view v-if="entryMode === 'wizard'" class="card__progress">
        <SetupProgress :current-step="1" :variant="identity === 'non_student' ? 'non-student' : 'student'" />
      </view>

      <!-- 头像与照片（上传落 media_asset → 管理后台 MediaAssets 可见可审核） -->
      <view class="card__cap" :class="{ 'card__cap--first': entryMode !== 'wizard' }">
        <text>{{ t("setup.profile.sectionMedia") }}</text>
        <view class="card__cap-line" />
      </view>

      <view class="media-avatar-row">
        <view
          class="media-avatar"
          role="button"
          :aria-label="t('setup.profile.avatarActionSheet')"
          @tap="onAvatarTap"
        >
          <image
            class="media-avatar__img"
            :src="avatarDisplayUrl || IMAGE_PATHS.DEFAULT_AVATAR"
            mode="aspectFill"
          />
          <view class="media-avatar__edit-badge">
            <text class="media-avatar__edit-text">{{ t("setup.profile.avatarActionSheet") }}</text>
          </view>
          <view v-if="isAvatarUploading" class="media-avatar__mask">
            <text class="media-avatar__mask-text">{{ t("setup.profile.uploadingMedia") }}</text>
          </view>
        </view>
        <view class="media-avatar-side">
          <text class="media-avatar-side__label">{{ t("setup.profile.avatarLabel") }}</text>
          <text class="media-avatar-side__hint">{{ t("setup.profile.mediaHint") }}</text>
        </view>
      </view>

      <view class="media-photo-head">
        <text class="media-photo-head__label">{{ t("setup.profile.photoWallLabel") }}</text>
        <text class="media-photo-head__hint">{{ t("setup.profile.photoWallHint") }}</text>
      </view>
      <view class="photo-grid">
        <view
          v-for="(url, idx) in photoDisplayUrls"
          :key="idx"
          class="photo-grid__slot"
          role="button"
          :aria-label="t('setup.profile.photoWallLabel') + ' ' + (idx + 1)"
          @tap="onPhotoSlotTap(idx)"
        >
          <image v-if="url" class="photo-grid__img" :src="url" mode="aspectFill" />
          <view v-else class="photo-grid__add">
            <text class="photo-grid__plus">+</text>
          </view>
          <view v-if="photoUploadingIndex === idx" class="photo-grid__mask">
            <text class="photo-grid__mask-text">{{ t("setup.profile.uploadingMedia") }}</text>
          </view>
          <view v-else-if="url" class="photo-grid__del">
            <text class="photo-grid__del-text">×</text>
          </view>
        </view>
      </view>

      <!-- 基础信息 -->
      <view class="card__cap">
        <text>{{ t("setup.profile.sectionDraft") }}</text>
        <view class="card__cap-line" />
      </view>

      <!-- 昵称 -->
      <view
        class="field"
        :class="{
          'field--focus': focusField === 'nickname' && !errors.nickname,
          'field--error': !!errors.nickname,
          shake: shakeField === 'nickname',
        }"
      >
        <image class="field__icon" :src="ICONS.USER" mode="aspectFit" alt="" />
        <input
          class="field__input"
          type="text"
          v-model="form.nickname"
          :placeholder="t('setup.profile.placeholderNickname')"
          placeholder-class="field__ph"
          :maxlength="NICKNAME_MAX_LENGTH"
          :aria-label="t('setup.profile.labelNickname')"
          :disabled="isSubmitting"
          cursor-spacing="120"
          @input="clearError('nickname')"
          @focus="focusHandlers.nickname.focus()"
          @blur="focusHandlers.nickname.blur()"
        />
      </view>
      <view v-if="errors.nickname" class="field-error">
        <image class="field-error__icon" :src="ICONS.ALERT" mode="aspectFit" alt="" />
        <text class="field-error__text">{{ errors.nickname }}</text>
      </view>

      <!-- 个性签名 -->
      <view
        class="field field--area"
        :class="{
          'field--focus': focusField === 'bio' && !errors.bio,
          'field--error': !!errors.bio,
          shake: shakeField === 'bio',
        }"
      >
        <image class="field__icon field__icon--area" :src="ICONS.MESSAGE" mode="aspectFit" alt="" />
        <textarea
          class="field__textarea"
          v-model="form.bio"
          :placeholder="t('setup.profile.placeholderBio')"
          placeholder-class="field__ph"
          :maxlength="BIO_MAX_LENGTH"
          :aria-label="t('setup.profile.labelBio')"
          :disabled="isSubmitting"
          cursor-spacing="120"
          @input="clearError('bio')"
          @focus="focusHandlers.bio.focus()"
          @blur="focusHandlers.bio.blur()"
        />
      </view>
      <view v-if="errors.bio" class="field-error">
        <image class="field-error__icon" :src="ICONS.ALERT" mode="aspectFit" alt="" />
        <text class="field-error__text">{{ errors.bio }}</text>
      </view>

      <!-- 年级（滚轮选择） -->
      <view class="field" :class="{ 'field--error': !!errors.grade, shake: shakeField === 'grade' }">
        <picker class="field__picker field__picker--grade" mode="selector" :range="gradeOptions" @change="onGradeChange">
          <view class="field__picker-inner">
            <image class="field__icon" :src="ICONS.BOOK" mode="aspectFit" alt="" />
            <text class="field__pick-text" :class="{ 'field__pick-text--filled': gradeLabel }">
              {{ gradeLabel || t("setup.profile.pleaseSelect") }}
            </text>
          </view>
        </picker>
        <image class="field__chevron" :src="ICONS.CHEVRON_RIGHT" mode="aspectFit" alt="" />
      </view>
      <view v-if="errors.grade" class="field-error">
        <image class="field-error__icon" :src="ICONS.ALERT" mode="aspectFit" alt="" />
        <text class="field-error__text">{{ errors.grade }}</text>
      </view>

      <!-- 称呼偏好 -->
      <view
        class="field"
        :class="{
          'field--focus': focusField === 'pronouns' && !errors.pronouns,
          'field--error': !!errors.pronouns,
          shake: shakeField === 'pronouns',
        }"
      >
        <image class="field__icon" :src="ICONS.SMILE" mode="aspectFit" alt="" />
        <input
          class="field__input"
          type="text"
          v-model="form.pronouns"
          :placeholder="t('setup.profile.placeholderPronouns')"
          placeholder-class="field__ph"
          :maxlength="20"
          :aria-label="t('setup.profile.labelPronouns')"
          :disabled="isSubmitting"
          cursor-spacing="120"
          @input="clearError('pronouns')"
          @focus="focusHandlers.pronouns.focus()"
          @blur="focusHandlers.pronouns.blur()"
        />
      </view>
      <view v-if="errors.pronouns" class="field-error">
        <image class="field-error__icon" :src="ICONS.ALERT" mode="aspectFit" alt="" />
        <text class="field-error__text">{{ errors.pronouns }}</text>
      </view>

      <!-- 基本资料（Phase E4 / M-07 扩展字段） -->
      <view class="card__cap">
        <text>{{ t("setup.profile.sectionBasic") }}</text>
        <view class="card__cap-line" />
      </view>

      <!-- 身高（滚轮 140-200） -->
      <view class="field" :class="{ 'field--error': !!errors.height, shake: shakeField === 'height' }">
        <picker class="field__picker field__picker--height" mode="selector" :range="heightOptions" @change="onHeightChange">
          <view class="field__picker-inner">
            <image class="field__icon" :src="ICONS.RULER" mode="aspectFit" alt="" />
            <text class="field__pick-text" :class="{ 'field__pick-text--filled': heightLabel }">
              {{ heightLabel || t("setup.profile.pleaseSelect") }}
            </text>
          </view>
        </picker>
        <image class="field__chevron" :src="ICONS.CHEVRON_RIGHT" mode="aspectFit" alt="" />
      </view>
      <view v-if="errors.height" class="field-error">
        <image class="field-error__icon" :src="ICONS.ALERT" mode="aspectFit" alt="" />
        <text class="field-error__text">{{ errors.height }}</text>
      </view>

      <!-- 学历 -->
      <view class="field">
        <picker
          class="field__picker"
          mode="selector"
          :range="educationLevelOptions"
          range-key="label"
          @change="onEducationLevelChange"
        >
          <view class="field__picker-inner">
            <image class="field__icon" :src="ICONS.GRADUATION" mode="aspectFit" alt="" />
            <text class="field__pick-text" :class="{ 'field__pick-text--filled': educationLevelLabel }">
              {{ educationLevelLabel || t("setup.profile.pleaseSelect") }}
            </text>
          </view>
        </picker>
        <image class="field__chevron" :src="ICONS.CHEVRON_RIGHT" mode="aspectFit" alt="" />
      </view>

      <!-- 感情状态 -->
      <view class="field">
        <picker
          class="field__picker"
          mode="selector"
          :range="relationshipStatusOptions"
          range-key="label"
          @change="onRelationshipStatusChange"
        >
          <view class="field__picker-inner">
            <image class="field__icon" :src="ICONS.HEART" mode="aspectFit" alt="" />
            <text class="field__pick-text" :class="{ 'field__pick-text--filled': relationshipStatusLabel }">
              {{ relationshipStatusLabel || t("setup.profile.pleaseSelect") }}
            </text>
          </view>
        </picker>
        <image class="field__chevron" :src="ICONS.CHEVRON_RIGHT" mode="aspectFit" alt="" />
      </view>

      <!-- 籍贯省 -->
      <view
        class="field"
        :class="{ 'field--focus': focusField === 'hometownProvince' }"
      >
        <image class="field__icon" :src="ICONS.MAP_PIN" mode="aspectFit" alt="" />
        <input
          class="field__input"
          type="text"
          v-model="form.hometownProvince"
          :placeholder="t('setup.profile.placeholderHometownProvince')"
          placeholder-class="field__ph"
          :maxlength="30"
          :aria-label="t('setup.profile.labelHometownProvince')"
          :disabled="isSubmitting"
          cursor-spacing="120"
          @focus="focusHandlers.hometownProvince.focus()"
          @blur="focusHandlers.hometownProvince.blur()"
        />
      </view>

      <!-- 籍贯市 -->
      <view
        class="field"
        :class="{ 'field--focus': focusField === 'hometownCity' }"
      >
        <image class="field__icon" :src="ICONS.MAP_PIN" mode="aspectFit" alt="" />
        <input
          class="field__input"
          type="text"
          v-model="form.hometownCity"
          :placeholder="t('setup.profile.placeholderHometownCity')"
          placeholder-class="field__ph"
          :maxlength="30"
          :aria-label="t('setup.profile.labelHometownCity')"
          :disabled="isSubmitting"
          cursor-spacing="120"
          @focus="focusHandlers.hometownCity.focus()"
          @blur="focusHandlers.hometownCity.blur()"
        />
      </view>

      <!-- 未来城市 -->
      <view class="field" :class="{ 'field--focus': focusField === 'futureCity' }">
        <image class="field__icon" :src="ICONS.BUILDING" mode="aspectFit" alt="" />
        <input
          class="field__input"
          type="text"
          v-model="form.futureCity"
          :placeholder="t('setup.profile.placeholderFutureCity')"
          placeholder-class="field__ph"
          :maxlength="30"
          :aria-label="t('setup.profile.labelFutureCity')"
          :disabled="isSubmitting"
          cursor-spacing="120"
          @focus="focusHandlers.futureCity.focus()"
          @blur="focusHandlers.futureCity.blur()"
        />
      </view>

      <!-- 理想型画像（参与匹配加分） -->
      <view
        class="field field--area"
        :class="{ 'field--focus': focusField === 'expectedPartner' }"
      >
        <image class="field__icon field__icon--area" :src="ICONS.SPARKLES" mode="aspectFit" alt="" />
        <textarea
          class="field__textarea"
          v-model="form.expectedPartner"
          :placeholder="t('setup.profile.placeholderExpectedPartner')"
          placeholder-class="field__ph"
          :maxlength="200"
          :aria-label="t('setup.profile.labelExpectedPartner')"
          :disabled="isSubmitting"
          cursor-spacing="120"
          @focus="focusHandlers.expectedPartner.focus()"
          @blur="focusHandlers.expectedPartner.blur()"
        />
      </view>

      <!-- 你的身份（注册第 1 步；学生走校园认证分支，非学生跳过） -->
      <view class="card__cap">
        <text>{{ t("setup.profile.identityTitle") }}</text>
        <view class="card__cap-line" />
      </view>
      <view class="identity-group">
        <view
          v-for="opt in identityOptions"
          :key="opt.value"
          class="identity-option"
          :class="{ 'identity-option--selected': identity === opt.value }"
          role="radio"
          :aria-checked="identity === opt.value"
          :aria-label="opt.label"
          @tap="onIdentityChange(opt.value)"
        >
          <view class="identity-option__radio" :class="{ 'identity-option__radio--checked': identity === opt.value }">
            <view v-if="identity === opt.value" class="identity-option__dot" />
          </view>
          <view class="identity-option__main">
            <text class="identity-option__label">{{ opt.label }}</text>
            <text class="identity-option__desc">{{ opt.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 主按钮：置灰仍可点，给「哪里没填对」定位提示（对齐注册页） -->
      <view
        class="submit-btn"
        :class="{ 'submit-btn--disabled': !formComplete, 'submit-btn--loading': isSubmitting }"
        role="button"
        :aria-label="isSubmitting ? t('setup.profile.submitSaving') : entryMode === 'edit' ? t('setup.profile.submitSaveEdit') : t('setup.profile.submitSave')"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        @tap="save"
      >
        <view v-if="isSubmitting" class="submit-btn__spinner" />
        <text class="submit-btn__text">
          {{
            isSubmitting
              ? t("setup.profile.submitSaving")
              : entryMode === "edit"
                ? t("setup.profile.submitSaveEdit")
                : t("setup.profile.submitSave")
          }}
        </text>
      </view>
    </view>

    <!-- 底部安全说明：降低填表焦虑（对齐注册页） -->
    <text class="safety-note">{{ t("setup.profile.bottomNote") }}</text>
  </view>
</template>

<style scoped lang="scss">
/* ============================================================
 * MP-R6-EDITPAGE：样式对齐注册页设计规范 v1.0
 * 令牌来源 theme/design-variables.scss v4.0.0；375×812（rpx = px × 2）
 * ============================================================ */
.edit-page {
  min-height: 100vh;
  background: var(--c-bg-page, #eef7f2);
  padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx);
}

/* ---------------- 页头（与注册页同构） ---------------- */
.hero {
  position: relative;
  width: 750rpx;
  height: 480rpx;
}

.hero__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* 底部 104rpx 渐隐到页面底色，消除图片与底色硬接缝 */
.hero__fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 104rpx;
  background: linear-gradient(180deg, rgba(238, 247, 242, 0) 0%, var(--c-bg-page, #eef7f2) 100%);
  pointer-events: none;
}

.hero__back {
  position: absolute;
  left: 32rpx;
  top: 88rpx;
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.78);
  /* #ifdef H5 */
  backdrop-filter: blur(6px);
  /* #endif */
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.08);
  z-index: 3;
}

.hero__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.hero__txt {
  position: absolute;
  left: 48rpx;
  top: 208rpx;
  display: flex;
  flex-direction: column;
  z-index: 2;
}

.hero__eyebrow {
  font-size: 19rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
  color: #1f8d6a;
  margin-bottom: 10rpx;
}

.hero__title {
  font-size: 52rpx;
  font-weight: 800;
  line-height: 1.2;
  color: var(--c-text-primary, #1a1e1c);
}

.hero__sub {
  margin-top: 12rpx;
  font-size: 25rpx;
  line-height: 1.55;
  color: var(--c-text-secondary, #4a524e);
}

/* ---------------- 表单卡（与注册页同构） ---------------- */
.card {
  position: relative;
  z-index: 2;
  margin: -64rpx 40rpx 0;
  background: var(--c-bg-container, #ffffff);
  border-radius: 40rpx;
  padding: 40rpx;
  box-shadow:
    0 16rpx 48rpx rgba(15, 23, 42, 0.06),
    0 4rpx 16rpx rgba(15, 23, 42, 0.04);
}

.card__progress {
  margin-bottom: 32rpx;
}

.card__cap {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 40rpx 0 24rpx;

  text {
    font-size: 24rpx;
    font-weight: 700;
    color: var(--c-text-primary, #1a1e1c);
  }
}

/* 卡内首个 cap（无进度条时）收紧上边距 */
.card__cap--first {
  margin-top: 8rpx;
}

.card__cap-line {
  flex: 1;
  height: 2rpx;
  background: var(--c-border-light, #eef2f0);
}

/* ---------------- 字段（高 96rpx · 圆角 24rpx，与注册页同构） ---------------- */
.field {
  display: flex;
  align-items: center;
  min-height: 96rpx;
  border-radius: 24rpx;
  padding: 0 28rpx;
  margin-bottom: 24rpx;
  background: var(--c-bg-surface, #f7faf9);
  border: 2rpx solid var(--c-border-light, #eef2f0);
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.field--focus {
  background: #ffffff;
  border-color: var(--c-brand, #36c99a);
  border-width: 3rpx;
  /* 边框加粗 1rpx 视觉补偿，避免内容抖动 */
  padding-left: 27rpx;
  box-shadow: 0 0 0 6rpx rgba(54, 201, 154, 0.12);
}

.field--error {
  background: #fef5f6;
  border-color: var(--c-error, #e5454d);
  border-width: 3rpx;
  padding-left: 27rpx;
  box-shadow: 0 0 0 6rpx rgba(229, 69, 77, 0.1);
}

.field__icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.field__input {
  flex: 1;
  height: 96rpx;
  font-size: 30rpx;
  font-weight: 500;
  color: var(--c-text-primary, #1a1e1c);
}

.field__ph {
  color: var(--c-text-placeholder, #9aa39f);
  font-weight: 400;
}

/* 多行字段：图标顶置，textarea 自适应 */
.field--area {
  align-items: flex-start;
  padding-top: 20rpx;
  padding-bottom: 20rpx;
}

.field__icon--area {
  margin-top: 10rpx;
}

.field__textarea {
  flex: 1;
  min-height: 120rpx;
  height: auto;
  font-size: 30rpx;
  font-weight: 500;
  line-height: 1.55;
  color: var(--c-text-primary, #1a1e1c);
}

/* picker 字段：flex-1 撑满，右侧 chevron 指示可选 */
.field__picker {
  flex: 1;
  min-width: 0;
}

.field__picker-inner {
  display: flex;
  align-items: center;
  height: 96rpx;
}

.field__pick-text {
  font-size: 30rpx;
  color: var(--c-text-placeholder, #9aa39f);
}

.field__pick-text--filled {
  color: var(--c-text-primary, #1a1e1c);
  font-weight: 500;
}

.field__chevron {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  opacity: 0.6;
}

/* 行内错误：管「哪个字段错了」，常驻至重新输入清除 */
.field-error {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin: -12rpx 0 20rpx 8rpx;
}

.field-error__icon {
  width: 26rpx;
  height: 26rpx;
}

.field-error__text {
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1.35;
  color: var(--c-error, #e5454d);
}

/* ---------------- 主按钮（高 96rpx · 圆角 24rpx，与注册页同构） ---------------- */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 96rpx;
  margin-top: 40rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, var(--c-brand, #36c99a) 0%, #55d5a7 100%);
  box-shadow: 0 8rpx 32rpx rgba(54, 201, 154, 0.28);
  transition: transform 0.1s ease, opacity 0.1s ease;
}

.submit-btn__text {
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 0.8rpx;
  color: #ffffff;
}

.submit-btn--disabled {
  background: var(--c-status-disabled, #dce5e2);
  box-shadow: none;
}

.submit-btn--loading {
  opacity: 0.72;
}

.submit-btn__spinner {
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  animation: spin 0.8s linear infinite;
}

/* ---------------- 底部说明 ---------------- */
.safety-note {
  display: block;
  margin: 28rpx 48rpx 0;
  font-size: 21rpx;
  line-height: 1.75;
  color: var(--c-text-placeholder, #9aa39f);
  text-align: center;
}

/* ---------------- 动效 ---------------- */
.press-feedback {
  transition: transform 0.1s ease, opacity 0.1s ease;
}

.press-feedback--active {
  transform: scale(0.98);
  opacity: 0.92;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes shake-x {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-8rpx);
  }
  75% {
    transform: translateX(8rpx);
  }
}

.shake {
  animation: shake-x 0.28s ease 2;
}

/* ===== MP-R5-EDITPAGE：头像与照片墙（配色对齐注册页设计令牌） ===== */
.media-avatar-row {
  display: flex;
  align-items: center;
  gap: 28rpx;
  margin-bottom: 28rpx;
}

.media-avatar {
  position: relative;
  width: 144rpx;
  height: 144rpx;
  flex-shrink: 0;
}

.media-avatar__img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--c-bg-surface, #f7faf9);
  border: 4rpx solid #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.08);
}

.media-avatar__edit-badge {
  position: absolute;
  left: 50%;
  bottom: -14rpx;
  transform: translateX(-50%);
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: var(--c-brand, #36c99a);
  white-space: nowrap;
}

.media-avatar__edit-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #ffffff;
}

.media-avatar__mask,
.photo-grid__mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  border-radius: 50%;
}

.photo-grid__mask {
  border-radius: 24rpx;
}

.media-avatar__mask-text,
.photo-grid__mask-text {
  font-size: 22rpx;
  font-weight: 600;
  color: #ffffff;
}

.media-avatar-side {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
}

.media-avatar-side__label {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1a1e1c);
}

.media-avatar-side__hint {
  font-size: 24rpx;
  line-height: 1.5;
  color: var(--c-text-tertiary, #6b7571);
}

.media-photo-head {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-top: 8rpx;
  margin-bottom: 16rpx;
}

.media-photo-head__label {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1a1e1c);
}

.media-photo-head__hint {
  font-size: 22rpx;
  color: var(--c-text-placeholder, #9aa39f);
}

.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.photo-grid__slot {
  position: relative;
  width: calc((100% - 32rpx) / 3);
  height: 200rpx;
  border-radius: 24rpx;
  overflow: hidden;
}

.photo-grid__img {
  width: 100%;
  height: 100%;
}

.photo-grid__add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 2rpx dashed var(--c-border-default, #dde3e0);
  border-radius: 24rpx;
  background: var(--c-bg-surface, #f7faf9);
}

.photo-grid__plus {
  font-size: 56rpx;
  font-weight: 300;
  color: var(--c-text-placeholder, #9aa39f);
}

.photo-grid__del {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.55);
}

.photo-grid__del-text {
  font-size: 28rpx;
  line-height: 1;
  color: #ffffff;
}

/* ---------------- 你的身份（注册页字段语言的单选卡） ---------------- */
.identity-group {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.identity-option {
  display: flex;
  align-items: center;
  gap: 20rpx;
  min-height: 96rpx;
  padding: 20rpx 28rpx;
  border-radius: 24rpx;
  background: var(--c-bg-surface, #f7faf9);
  border: 2rpx solid var(--c-border-light, #eef2f0);
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;

  &--selected {
    background: #ffffff;
    border-color: var(--c-brand, #36c99a);
    border-width: 3rpx;
    padding-left: 27rpx;
    box-shadow: 0 0 0 6rpx rgba(54, 201, 154, 0.12);
  }
}

.identity-option__radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--r-circle, 50%);
  border: 3rpx solid var(--c-border-default, #dde3e0);
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--checked {
    border-color: var(--c-brand, #36c99a);
  }
}

.identity-option__dot {
  width: 22rpx;
  height: 22rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-brand, #36c99a);
}

.identity-option__main {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.identity-option__label {
  font-size: 28rpx;
  color: var(--c-text-primary, #1a1e1c);
  font-weight: 600;
}

.identity-option__desc {
  font-size: 22rpx;
  color: var(--c-text-tertiary, #6b7571);
  line-height: 1.5;
}

.identity-option--selected .identity-option__label {
  color: #1f8d6a;
}

/* 页面背景与注册页统一浅绿（设计规范 §2.2：不得出现白/灰断层） */
page {
  background: var(--c-bg-page, #eef7f2);
}
</style>
