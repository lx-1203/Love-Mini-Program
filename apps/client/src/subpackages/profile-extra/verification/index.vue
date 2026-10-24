<script setup lang="ts">
/**
 * 恋爱认证页
 * 校园身份认证流程：上传学生证 → 提交审核 → 审核通过
 * mock 模式下默认展示"已认证"状态
 */
import { ref, computed, onUnmounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { lightHaptic } from "../../../utils/haptic";
// MP-R7-REALNAME-001：本地临时路径判定统一走 isUploadedMediaUrl（DevTools http://tmp/ 误判修复）
import { isUploadedMediaUrl, resolveMediaUrl } from "../../../utils/media";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
import { IMAGE_PATHS } from "../../../config/images";
import { TOAST_DURATION } from "../../../constants/limits";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../../utils/privacy";
import { isMockMode } from "../../../services/env";
// 3-A 恋爱认证 real 链路：GET/POST /verification（mock 分支保留本地演示逻辑）
import { useMock } from "../../../stores/helpers/use-mock";
import { request } from "../../../services/http";
import { clientApi } from "../../../services/api";
// R10-P2-012：注入 --statusbar（safe-top 依赖该变量，DevTools env 恒 0）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const { t } = useI18n();

/** 即时反馈 toast 时长（毫秒）：隐私授权/图片选择等轻提示，比 SHORT_MS 更短 */
const QUICK_TOAST_MS = 1200;
/** 最短反馈 toast 时长（毫秒）：取消类提示，一闪即过 */
const MIN_TOAST_MS = 1000;

/** 认证状态：unverified | pending | verified | rejected */
type VerifyStatus = "unverified" | "pending" | "verified" | "rejected";

/**
 * 后端恋爱认证视图（GET /verification 响应载荷，3-A）。
 * 未提交过申请时 status 为 null（前端映射为 unverified）。
 */
interface LoveVerificationView {
  id: number | null;
  status: "pending" | "approved" | "rejected" | null;
  studentName: string | null;
  studentId: string | null;
  schoolName: string | null;
  studentIdCardUrl: string | null;
  rejectReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

/** 当前认证状态（mock 模式默认 verified） */
const status = ref<VerifyStatus>("unverified");
/** real 认证状态首拉中（2026-09-03：骨架占位，避免「未认证→审核中」状态跳变；失败回退表单态） */
const statusLoading = ref(false);

/** 学生姓名 */
const studentName = ref("");
/** 学号 */
const studentId = ref("");
/** 学校名称 */
const schoolName = ref("");
/** 上传的学生证图片路径 */
const uploadedImagePath = ref("");

/** 是否正在提交 */
const submitting = ref(false);

/** real 模式：驳回原因（仅 rejected 状态下有值，展示在状态卡片） */
const rejectReason = ref("");

/** 提交定时器引用，用于卸载时清理 */
let submitTimer: ReturnType<typeof setTimeout> | null = null;

/** 状态文案映射 */
const statusInfo = computed(() => {
  switch (status.value) {
    case "verified":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.CHECK_CIRCLE,
        title: t("verification.statusVerified"),
        desc: t("verification.statusVerifiedDesc"),
        color: "var(--c-brand-500, #36C99A)",
        bgColor: "var(--c-brand-50, #E8FAF3)",
      };
    case "pending":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.PENDING,
        title: t("verification.statusPending"),
        desc: t("verification.statusPendingDesc"),
        color: "var(--c-warning, #F59E0B)",
        bgColor: "var(--c-tint-amber-50, #FFF8E7)",
      };
    case "rejected":
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.CHECK_FAIL,
        title: t("verification.statusRejected"),
        // real 模式：驳回原因追加到描述（mock 模式无原因展示原文案）
        desc: rejectReason.value
          ? `${t("verification.statusRejectedDesc")}\n${t("verification.rejectReasonLabel")}：${rejectReason.value}`
          : t("verification.statusRejectedDesc"),
        color: "var(--c-error, #E5454D)",
        bgColor: "var(--c-tint-pink-soft, #FFF0F5)",
      };
    default:
      return {
        icon: IMAGE_PATHS.ICONS_EMOJI.GRAD_CAP,
        title: t("verification.statusUnverified"),
        desc: t("verification.statusUnverifiedDesc"),
        // R8-L09-D12（颜色token）：原 default（未认证）分支与 :85 已认证分支写的是同一个
        // --c-brand-500 #36C99A ⇒ 两态实测墨迹同为 #33C999 / #36C99A，颜色上完全无法区分。
        // 规范给未认证定的角色令牌是 --c-unverified / --c-purple #A29BFE
        // （design-variables.scss:25/281），但 #A29BFE 压本卡浅紫底相对亮度 0.3826 vs 0.9074
        // ⇒ 实测 2.21:1，会把这行状态标题落进"不可读"档；故取紫色族最深的既有档位令牌
        // --c-lavender-500 #8B5CF6（压 --c-lavender-50 #F5F3FF 实测 3.86:1，
        // 较原值 #36C99A 压 #E8F4FD 的 1.88:1 提升 2.05 倍），并与仓内已定案的
        // 未认证处理逐字同构（campus/campus/hub.vue:804-808 R1-L05-D15「未认证=淡紫底+紫字」）。
        // brand 绿自此只留给已认证/可行动态（:85 不动）。
        // R15-L09-D09（颜色token P2）：--c-lavender-500 #8B5CF6 压 --c-lavender-50 #F5F3FF
        // 实算 3.86:1（帧上墨迹 #9063F6 ⇒ 3.61:1），而本行 36rpx/700 未达 24px 或 18.66px 粗体
        // 的「大字号」档 ⇒ 必须 ≥4.5:1。lavender 族在 design-variables.scss:313-315 只发了
        // 50/100/500 三阶、无更深档，故取仓内同一枚未认证紫的定案实色 #6D28D9
        // （campus/campus/hub.vue:840 R10-L04-D20 同值同语义「未认证=淡紫底+紫字」），
        // 压 #F5F3FF 实算 6.48:1、压 lavender-100 5.98:1，色相仍是紫、与已认证绿分家。底色不动。
        color: "#6D28D9",
        // R8-L09-D14（颜色token）：原 --c-tint-blue-soft 让同一张状态卡在未认证态走蓝调、
        // 已认证态走 real-name.vue:91 的 --c-brand-50 绿调 ⇒ 两态两套色相，且蓝调与本道
        // 其余帧的浅绿体系（--c-bg-page #EEF7F2）断层。改取紫色族 50 阶浅底
        // --c-lavender-50 #F5F3FF（仓内既有令牌 design-variables.scss:313），
        // 与 :112 紫字同族、与绿调已认证态分家。
        bgColor: "var(--c-lavender-50, #F5F3FF)",
      };
  }
});

/**
 * 认证权益列表（B4 强化，2026-08-13：新增第 5 项「互动资格」）
 *
 * R11-L09-D13（P0 / 需新建，§12.4 形态②「把没有真值支撑的那块内容撤掉/降级为不承诺」）：
 * 本表原第 2、3 项承诺的是「按认证态施加的推荐排序加权」——
 *   · benefitMatchTitle/Desc = 「匹配加权 / 匹配概率提升 1.5 倍」
 *   · benefitTrustTitle/Desc = 「信任优先 / 认证用户优先推荐排序」
 * 这两句在 real 档没有任何真相源，逐条核过：
 *   `apps/api/…/discover/RecommendationRanker.java:615-616` 只把认证徽章解析成
 *   `machineVerified/humanVerified` 两个布尔，:690-691 原样塞进 RecommendedPersonView 当展示字段；
 *   同文件里与 verified 相关的分支只有 `loadBadgeLevelMap`（:817-852，school>email>idcard>none
 *   的徽章级别），全仓 grep「verified × rank/score/boost/weight/sort/multipl」没有任何一处
 *   按认证态改排序或乘系数 ⇒ 「优先展示/优先排序/1.5 倍」三句都是同一个不存在的机制的承诺。
 *   客户端侧真字段只用于渲染徽章文字（`components/discover/CardDetailOverlay.vue:319-321`），
 *   即「专属标识 / 个人主页展示认证徽章」那一项是有真相源的，保留。
 * 处置：两项整格撤下（不是换一组数字、也不是换成另一句加权说法——那是 §12.4 明令禁止的第三种形态）。
 *   卡上建议的「改成『认证用户在推荐中优先展示』」这一条**没有采纳**：那句话与已被撤下的
 *   「优先推荐排序」是同一个未实现机制，换了措辞仍然是无真相源的承诺。
 * 待后端补列后再接回（缺列登记见 FXK 交件「缺列 / 移交登记」第 1 条）：
 *   认证态排序权重/倍率的真相源（app_switch 或 discover 侧系数列）+ 实际倍率回写文案。
 * 本表消费点两处（verified 分支与 else 分支各一个 benefits-grid）同源同时收口，不会只改一屏。
 */
const benefits = computed(() => [
  { icon: IMAGE_PATHS.ICONS_EMOJI.TARGET, title: t("verification.benefitBadgeTitle"), desc: t("verification.benefitBadgeDesc") },
  { icon: IMAGE_PATHS.ICONS_EMOJI.GIFT, title: t("verification.benefitPerksTitle"), desc: t("verification.benefitPerksDesc") },
  { icon: IMAGE_PATHS.ICONS_EMOJI.CHAT, title: t("verification.benefitInteractTitle"), desc: t("verification.benefitInteractDesc") },
]);

/** 认证流程步骤（B4 强化：上传学生证 → 人工审核 → 认证通过） */
const processSteps = computed(() => [
  { step: "1", title: t("verification.processStep1Title"), desc: t("verification.processStep1Desc") },
  { step: "2", title: t("verification.processStep2Title"), desc: t("verification.processStep2Desc") },
  { step: "3", title: t("verification.processStep3Title"), desc: t("verification.processStep3Desc") },
]);

/**
 * R11-L09-D21（文案 P2）：空态横幅写死的「大小 ≤ 5MB」（:3426 verification.uploadHint）
 * 原先在本页没有执行点——success 只读 tempFilePaths[0]，从不读 tempFiles[i].size，
 * 超限图会一路走到提交、失败只以通用 toast 出现。
 * 这里按提示原文的同一口径（5MB）落成拦截；上限与文案不再各说各话。
 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** 选择学生证图片
 *
 * Task 0.2.4：调用 chooseImage 前先调用 ensurePrivacyAuthorized 检查隐私授权。
 * R11-L09-D21：选图回调按 tempFiles[0].size 执行横幅承诺的 5MB 上限
 * （locale 属并行车道/不在本泳道可写集，故不新增「学生证照片需 ≤ 5MB」专用键，
 *  复用同一句 uploadHint 作为拒收提示，约束与文案同源；专用键已登记移交）。
 */
async function chooseImage() {
  lightHaptic();
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({
      title: t("verification.privacyRequiredImage"),
      icon: "none",
      duration: QUICK_TOAST_MS,
    });
    return;
  }
  uni.chooseImage({
    count: 1,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      // R11-L09-D21：先按 size 拦超限图（横幅承诺的 5MB 在此执行），拦下不赋值、不报「已上传」
      // uni 的 tempFiles 在 legacy 类型里是「单项 | 数组」联合，两种形态都取首项再读 size。
      const tempFiles = res.tempFiles;
      const firstFile = Array.isArray(tempFiles) ? tempFiles[0] : tempFiles;
      const pickedSize = (firstFile as { size?: number } | undefined)?.size;
      if (typeof pickedSize === "number" && pickedSize > MAX_IMAGE_BYTES) {
        uni.showToast({
          title: t("verification.uploadHint"),
          icon: "none",
          duration: QUICK_TOAST_MS,
        });
        return;
      }
      // 修复（严格模式 noUncheckedIndexedAccess）：res.tempFilePaths[0] 索引访问返回 string | undefined，
      // 此处兜底空字符串，避免在异常（空数组）情况下赋值 undefined 给 ref<string>。
      uploadedImagePath.value = res.tempFilePaths[0] ?? "";
      uni.showToast({
        title: t("verification.imageUploaded"),
        icon: "success",
        duration: QUICK_TOAST_MS,
      });
    },
    fail: () => {
      uni.showToast({
        title: t("verification.imageChooseCancelled"),
        icon: "none",
        duration: MIN_TOAST_MS,
      });
    },
  });
}

// MP-R2-VERIFICATION-001：预览用解析后 URL（/api/v1/media、/uploads 相对路径
// 必须重写为鉴权代理绝对 URL 才能在 mp 端加载）
const resolvedUploadedImage = computed(() =>
  uploadedImagePath.value ? resolveMediaUrl(uploadedImagePath.value) : ""
);

/** 提交认证申请 */
function submitVerification() {
  // MP-R1-VERIFY-INDEX-002：防重入守卫——按钮置灰不拦截 @tap，showLoading 默认无 mask，
  // 快速双击会并发两次 uploadPostImage + 两次 POST /verification
  if (submitting.value) return;
  lightHaptic();

  if (!studentName.value.trim()) {
    uni.showToast({ title: t("verification.errStudentName"), icon: "none" });
    return;
  }
  if (!studentId.value.trim()) {
    uni.showToast({ title: t("verification.errStudentId"), icon: "none" });
    return;
  }
  if (!schoolName.value.trim()) {
    uni.showToast({ title: t("verification.errSchoolName"), icon: "none" });
    return;
  }
  if (!uploadedImagePath.value) {
    uni.showToast({ title: t("verification.errImageRequired"), icon: "none" });
    return;
  }

  submitting.value = true;
  // MP-R1-VERIFY-INDEX-002：mask:true 覆盖提交流程（双保险）
  uni.showLoading({ title: t("verification.submitting"), mask: true });

  // Mock 分支：保留本地演示逻辑（1s 后置为 pending）
  if (useMock()) {
    if (submitTimer) clearTimeout(submitTimer);
    submitTimer = setTimeout(() => {
      submitting.value = false;
      uni.hideLoading();
      status.value = "pending";
      uni.showToast({
        title: t("verification.submitSuccess"),
        icon: "success",
        duration: TOAST_DURATION.SHORT_MS,
      });
      submitTimer = null;
    }, 1000);
    return;
  }

  // Real 分支（3-A）：先上传学生证图片换取可访问 URL（对齐 campus/certification 链路），
  // 再 POST /verification 提交；重复提交（pending/approved）后端返回 409 业务冲突。
  void submitVerificationReal();
}

/**
 * real 模式提交认证申请（与 mock 分支解耦，便于异常处理收敛）。
 * - 本地临时路径先经 clientApi.uploadPostImage 上传换取 URL；
 * - 后端 409（已有 pending/approved 申请）提示「已有申请审核中」；
 * - 提交成功后重新拉取状态（pending）。
 */
async function submitVerificationReal(): Promise<void> {
  try {
    let cardUrl = uploadedImagePath.value;
    // 非 http(s) 开头视为本地临时路径：上传换取可访问 URL，否则审核人员无法查看学生证
    if (!isUploadedMediaUrl(cardUrl)) {
      const uploaded = await clientApi.uploadPostImage({
        name: "love-verification-id-card",
        path: cardUrl,
      });
      cardUrl = uploaded?.url ?? cardUrl;
    }
    await request<LoveVerificationView, { studentName: string; studentId: string; schoolName: string; studentIdCardUrl: string }>({
      url: "/verification",
      method: "POST",
      data: {
        studentName: studentName.value.trim(),
        studentId: studentId.value.trim(),
        schoolName: schoolName.value.trim(),
        studentIdCardUrl: cardUrl,
      },
    });
    // 提交成功后刷新状态（置为 pending 并回显）
    await loadVerification();
    uni.showToast({
      title: t("verification.submitSuccess"),
      icon: "success",
      duration: TOAST_DURATION.SHORT_MS,
    });
  } catch (error) {
    // 409：已有 pending/approved 申请，提示「已有申请审核中」
    const status =
      error !== null && typeof error === "object" && "status" in error
        ? (error as { status: number }).status
        : 0;
    const message =
      error instanceof Error && error.message && error.message.trim().length > 0
        ? error.message
        : t("verification.submitFailed");
    uni.showToast({
      title: status === 409 ? t("verification.alreadyPending") : message,
      icon: "none",
      duration: TOAST_DURATION.SHORT_MS,
    });
  } finally {
    submitting.value = false;
    uni.hideLoading();
  }
}

/**
 * 将后端恋爱认证视图映射到页面状态。
 * @param view GET /verification 返回的视图（status 为 null 表示未提交）
 */
function applyVerificationView(view: LoveVerificationView): void {
  const s = view.status;
  if (s === "approved") {
    status.value = "verified";
  } else if (s === "pending") {
    status.value = "pending";
  } else if (s === "rejected") {
    status.value = "rejected";
  } else {
    status.value = "unverified";
  }
  rejectReason.value = view.rejectReason ?? "";
  // 回显已提交的信息（驳回后重新提交时表单预填，减少重复输入）
  if (view.studentName) studentName.value = view.studentName;
  if (view.studentId) studentId.value = view.studentId;
  if (view.schoolName) schoolName.value = view.schoolName;
  if (view.studentIdCardUrl) {
    // MP-R2-VERIFICATION-001：uploadedImagePath 保持服务端原始相对路径（单一来源，
    // isUploadedMediaUrl 据此判定不再重复上传）；预览经 resolvedImagePath 解析
    uploadedImagePath.value = view.studentIdCardUrl;
  }
}

/**
 * 拉取当前用户的恋爱认证状态（real 模式）。
 * mock 模式保留现有本地演示逻辑，不做任何请求。
 */
async function loadVerification(): Promise<void> {
  if (useMock()) return;
  statusLoading.value = true;
  try {
    const view = await request<LoveVerificationView>({ url: "/verification", method: "GET" });
    applyVerificationView(view);
  } catch (_e) {
    // 拉取失败保持当前状态（不阻塞页面展示）
  } finally {
    statusLoading.value = false;
  }
}

/** 进入页面时拉取认证状态（real 模式）；mock 模式无操作 */
onLoad(() => {
  void loadVerification();
});

/** 审核状态轮询间隔（pending 态自动刷新审核结果，2026-08-10 B2） */
const VERIFICATION_POLL_MS = 30_000;
/** pending 态轮询定时器 */
let verificationPollTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * pending 态轮询：进入页面与页面再次展示时，若状态为 pending 则每 30s 重拉
 * GET /verification（审核通过/驳回后自动反映到页面，无需手动刷新）。
 */
function startVerificationPolling() {
  if (useMock()) return;
  if (verificationPollTimer) {
    clearTimeout(verificationPollTimer);
    verificationPollTimer = null;
  }
  if (status.value !== "pending") return;
  verificationPollTimer = setTimeout(async () => {
    await loadVerification();
    if (status.value === "pending") {
      startVerificationPolling();
    }
  }, VERIFICATION_POLL_MS);
}

/** 页面再次展示时续接 pending 轮询（后台期间审核结果可能在返回时已更新） */
onShow(() => {
  if (!useMock() && status.value === "pending") {
    void loadVerification();
  }
  startVerificationPolling();
});

/**
 * 页面卸载时清理定时器，避免内存泄漏。
 * 修复（P1 BUG）：原实现未保存 setTimeout 返回值，页面销毁后定时器仍会触发
 * uni.hideLoading 与状态修改。
 */
onUnmounted(() => {
  if (submitTimer) {
    clearTimeout(submitTimer);
    submitTimer = null;
  }
  if (verificationPollTimer) {
    clearTimeout(verificationPollTimer);
    verificationPollTimer = null;
  }
});

/** 模拟审核通过（mock 模式演示用）
 * R4-00029：函数内增加 isMockMode 守卫——仅 mock/演示模式允许伪造认证通过，
 * 防止未来其他调用点绕过模板 v-if 在真实模式伪造认证状态。
 * 2026-08-10 B2：real 模式已接入 GET /verification 状态轮询（pending 态 30s 自动刷新），
 * 本函数保留仅用于 mock 演示。 */
function simulateApprove() {
  // MP-R1-VERIFY-INDEX-004：补调用括号——原 `!isMockMode` 判的是函数引用（恒真值），
  // 守卫永不触发，R4-00029 防伪造认证守卫失效，仅剩模板 v-if 单层防护
  if (!isMockMode()) {
    console.warn("[Verification] simulateApprove 仅允许在 mock 模式调用");
    return;
  }
  lightHaptic();
  status.value = "verified";
  uni.showToast({
    title: t("verification.approvedTitle"),
    icon: "success",
    duration: TOAST_DURATION.SHORT_MS,
  });
}

/** 重新认证 */
function resetVerification() {
  lightHaptic();
  uni.showModal({
    title: t("verification.resetConfirmTitle"),
    content: t("verification.resetConfirmContent"),
    success: (res) => {
      if (res.confirm) {
        status.value = "unverified";
        studentName.value = "";
        studentId.value = "";
        schoolName.value = "";
        uploadedImagePath.value = "";
      }
    },
  });
}

/** 删除人工认证（解除认证状态，回到未认证） */
function removeVerification() {
  uni.showModal({
    title: t("verification.removeConfirmTitle"),
    content: t("verification.removeConfirmContent"),
    // 原生属性不支持 CSS 变量：取 design token --c-error 的实际色值 #E5454D
    confirmColor: "#E5454D",
    success: (res) => {
      if (res.confirm) {
        status.value = "unverified";
        studentName.value = "";
        studentId.value = "";
        schoolName.value = "";
        uploadedImagePath.value = "";
        uni.showToast({ title: t("verification.removedToast"), icon: "none" });
      }
    },
  });
}

/** 返回上一页（MP-R1-VERIFY-INDEX-001：深链直达栈=1 时 navigateBack 无反应，兜底回「我的」Tab） */
function goBack() {
  lightHaptic();
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: "/pages/profile/index" });
  }
}

/** 输入框失去焦点时轻振动 */
function onBlur() {
  lightHaptic();
}
</script>

<template>
  <view class="verification-page" :style="menuStyleVars">
    <!-- MP-R1-VERIFY-INDEX-001：safe-top 前置于 nav-bar（与同分包 real-name.vue/settings.vue
         一致，R10-P2-012 根因模式）——navigationStyle:custom 下 nav-bar 从 y=0 起排，
         顺序错误时标题与返回键顶进状态栏与系统时间叠印 -->
    <!-- R8-L09-D17（层级遮挡）：安全区占位 + 导航栏合进同一个吸顶容器。
         原 .nav-bar 为 position:relative，bottom 帧滚动后白底头部（顶帧实测 y=46-87）整块移出视口，
         「互动资格」一行直接顶进系统区：卡白底自 y=20 起、行内文字墨迹上探到 y=5-29，
         与系统时间「1:05」(x0-32/y17-28) 及胶囊带 (x265-369/y25-94) 撞位、文字被视口上沿切掉半字。
         改 sticky 后头部常驻且不透明，正文从其下方滚过（与 AppShell.vue:323-331 的
         .is-fixed .shell__header 吸顶机制同构：sticky + top:0 + 实底 + 状态区一并盖住）。
         未滚动时该容器仍占据 safe-top(状态栏高) + 88rpx 的同一段落，top 帧头部位置逐像素不变。 -->
    <view class="nav-header">
      <!-- 顶部安全区占位 -->
      <view class="safe-top" />

      <!-- 顶部导航栏 -->
      <view class="nav-bar">
        <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="100" role="button" :aria-label="t('common.backAria')">
          <text class="nav-bar__back-icon">‹</text>
        </view>
        <text class="nav-bar__title">{{ t('verification.navTitle') }}</text>
        <view class="nav-bar__placeholder" />
      </view>
    </view>

    <!-- 认证状态卡片（real 首拉中显示骨架，避免状态跳变） -->
    <view v-if="statusLoading" class="status-card" role="status" aria-live="polite">
      <SkeletonBlock variant="list" :rows="2" :label="t('common.loading')" />
    </view>
    <view v-else class="status-card" :style="{ background: statusInfo.bgColor }">
      <view class="status-card__emoji-wrap">
        <!-- R10-P4 跟进：SafeImage custom-class 跨组件作用域不生效导致图标零尺寸，改原生 image（本地 SVG，兜底由 SafeImage 语义外的空态兜底承担） -->
        <image class="status-card__emoji-img" :src="statusInfo.icon" mode="aspectFit" alt="" />
      </view>
      <text class="status-card__title" :style="{ color: statusInfo.color }">{{ statusInfo.title }}</text>
      <text class="status-card__desc">{{ statusInfo.desc }}</text>
    </view>

    <!-- B4 认证门控横幅（2026-08-13）：未认证用户仅可浏览，引导完成认证解锁互动
         MP-R1-VERIFY-INDEX-102/REQ23-006：照 R10-P4 模式改原生 image——SafeImage
         custom-class 跨组件作用域不生效导致警示图标零尺寸不可见 -->
    <view v-if="status === 'unverified'" class="gate-banner">
      <image class="gate-banner__icon" :src="IMAGE_PATHS.ICONS_EMOJI.WARNING" mode="aspectFit" alt="" />
      <text class="gate-banner__text">{{ t('verification.gateBanner') }}</text>
    </view>

    <!-- 已认证状态：展示权益 + 重新认证按钮 -->
    <template v-if="status === 'verified'">
      <!-- 认证权益列表 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('verification.benefitsTitle') }}</text>
        </view>
        <view class="benefits-grid">
          <view
            v-for="(item, index) in benefits" :key="index"
            class="benefit-item"
          >
            <view class="benefit-item__icon">
              <!-- MP-R1-VERIFY-INDEX-102：SafeImage 塌陷 0×0 改原生 image（R10-P4 同款） -->
              <image class="benefit-item__icon-img" :src="item.icon" mode="aspectFit" alt="" />
            </view>
            <text class="benefit-item__title">{{ item.title }}</text>
            <text class="benefit-item__desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- MP-R1-VERIFY-INDEX-003：重新认证/删除人工认证仅 mock 演示可用——两操作原实现
           只重置本地 ref、无任何后端撤销接口，real 模式下用户收到「已删除」toast 但服务端
           仍为 approved，重进页面又显示「已认证」，前后矛盾。后端补撤销接口前 real 隐藏。 -->
      <!-- 重新认证按钮（仅 mock） -->
      <view v-if="useMock()" class="action-btn press-feedback" @tap="resetVerification" hover-class="action-btn--hover" hover-stay-time="100">
        <text class="action-btn__text">{{ t('verification.resetBtn') }}</text>
      </view>

      <!-- 删除认证（解除人工认定，仅 mock） -->
      <view v-if="useMock()" class="action-btn action-btn--danger press-feedback" @tap="removeVerification" hover-class="action-btn--hover" hover-stay-time="100">
        <text class="action-btn__text action-btn__text--danger">{{ t('verification.removeVerificationBtn') }}</text>
      </view>
    </template>

    <!-- 审核中状态：展示提示 -->
    <template v-else-if="status === 'pending'">
      <view class="section">
        <view class="pending-card">
          <text class="pending-card__title">{{ t('verification.pendingTitle') }}</text>
          <text class="pending-card__desc">{{ t('verification.pendingDesc') }}</text>
        </view>
      </view>

      <!-- infra R2-00019 修复：模拟审核通过按钮仅 mock 模式可见（原无环境守卫，
           真实用户可自行伪造恋爱认证通过，身份信任体系崩塌） -->
      <view v-if="isMockMode()" class="action-btn action-btn--secondary press-feedback" @tap="simulateApprove" hover-class="action-btn--hover" hover-stay-time="100">
        <text class="action-btn__text action-btn__text--secondary">{{ t('verification.simulateApproveBtn') }}</text>
      </view>
    </template>

    <!-- 未认证/未通过状态：展示认证表单 -->
    <template v-else>
      <!-- 认证权益预览 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('verification.benefitsTitle') }}</text>
        </view>
        <view class="benefits-grid">
          <view
            v-for="(item, index) in benefits" :key="index"
            class="benefit-item"
          >
            <view class="benefit-item__icon">
              <!-- MP-R1-VERIFY-INDEX-102：SafeImage 塌陷 0×0 改原生 image（R10-P4 同款） -->
              <image class="benefit-item__icon-img" :src="item.icon" mode="aspectFit" alt="" />
            </view>
            <text class="benefit-item__title">{{ item.title }}</text>
            <text class="benefit-item__desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 认证流程（B4 强化，2026-08-13：上传 → 人工审核 → 通过 三步卡） -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('verification.processTitle') }}</text>
        </view>
        <view class="process-card">
          <view v-for="(step, index) in processSteps" :key="index" class="process-step">
            <view class="process-step__badge">
              <text class="process-step__badge-text">{{ step.step }}</text>
            </view>
            <view class="process-step__content">
              <text class="process-step__title">{{ step.title }}</text>
              <text class="process-step__desc">{{ step.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 认证表单 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('verification.formTitle') }}</text>
        </view>
        <view class="form-card">
          <!-- 学生姓名 -->
          <view class="form-item">
            <label class="form-item__label" for="verification-student-name">{{ t('verification.labelStudentName') }}</label>
            <input
  cursor-spacing="20"
              id="verification-student-name"
              v-model="studentName"
              class="form-item__input"
              :placeholder="t('verification.placeholderStudentName')"
              placeholder-class="form-item__placeholder"
              maxlength="20"
              @blur="onBlur"
              :aria-label="t('verification.placeholderStudentName')"
              aria-required="true"
            />
          </view>
          <!-- 学号 -->
          <view class="form-item">
            <label class="form-item__label" for="verification-student-id">{{ t('verification.labelStudentId') }}</label>
            <input
  cursor-spacing="20"
              id="verification-student-id"
              v-model="studentId"
              class="form-item__input"
              :placeholder="t('verification.placeholderStudentId')"
              placeholder-class="form-item__placeholder"
              maxlength="20"
              @blur="onBlur"
              :aria-label="t('verification.placeholderStudentId')"
              aria-required="true"
            />
          </view>
          <!-- 学校 -->
          <view class="form-item form-item--no-border">
            <label class="form-item__label" for="verification-school-name">{{ t('verification.labelSchool') }}</label>
            <input
  cursor-spacing="20"
              id="verification-school-name"
              v-model="schoolName"
              class="form-item__input"
              :placeholder="t('verification.placeholderSchool')"
              placeholder-class="form-item__placeholder"
              maxlength="30"
              @blur="onBlur"
              :aria-label="t('verification.placeholderSchool')"
              aria-required="true"
            />
          </view>
        </view>
      </view>

      <!-- 上传学生证 -->
      <view class="section">
        <view class="section__title">
          <text class="section__title-text">{{ t('verification.uploadTitle') }}</text>
        </view>
        <view
          class="upload-card press-feedback"
          @tap="chooseImage"
          hover-class="upload-card--hover"
          hover-stay-time="100"
          role="button"
          :aria-label="t('verification.uploadTitle')"
        >
          <view v-if="!uploadedImagePath" class="upload-card__empty">
            <!-- R8-L09-D16（素材缺失）：样式表早已定义 .upload-card__icon（原 :1026）却在本模板零引用，
                 图标槽位漏挂 ⇒ 这块 101px 高的主操作区只剩两行居中文字，读起来像说明文字而非可点区。
                 补挂相机图标：走仓内既有素材 IMAGE_PATHS.ICONS_COMMON.CAMERA（camera.png，
                 src/static、static-local-backup/full-static、api/uploads/app-assets 三树均在盘，无需同步），
                 与全站同类「上传学生证/照片」空态用的是同一枚（campus/certification.vue:356、
                 support/feedback/index.vue:549、pages/profile/index.vue:1779）。
                 按本页既有结论（.status-card__emoji-img / .gate-banner__icon /
                 .benefit-item__icon-img 三处注释记录的同型事故）走原生 <image> 而非 SafeImage——
                 SafeImage 的 custom-class 跨 uni-app data-v 作用域拿不到宿主页 scoped 尺寸，会零尺寸渲染。 -->
            <image
              class="upload-card__icon"
              :src="IMAGE_PATHS.ICONS_COMMON.CAMERA"
              mode="aspectFit"
              alt=""
            />
            <text class="upload-card__text">{{ t('verification.uploadText') }}</text>
            <text class="upload-card__hint">{{ t('verification.uploadHint') }}</text>
          </view>
          <view v-else class="upload-card__preview">
            <image
              :src="resolvedUploadedImage" 
              class="upload-card__image"
              mode="aspectFill" lazy-load alt=""
            />
            <view class="upload-card__change">
              <text class="upload-card__change-text">{{ t('verification.uploadChange') }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 提交按钮
           R11-L09-D15（可达性 P2）：本页唯一提交出口原为裸 <view @tap>，既无 role 也无 aria-label，
           提交中态只靠 :1224 的 opacity:0.6 表达 ⇒ 读屏用户在表单末尾读不到这个动作节点。
           补齐按钮语义（role/aria-label）与两轴状态（aria-disabled/aria-busy=submitting），
           标签随可见文案同源切换，不新增文案。 -->
      <view
        class="action-btn press-feedback"
        :class="{ 'action-btn--disabled': submitting }"
        role="button"
        :aria-label="submitting ? t('verification.submittingBtn') : t('verification.submitBtn')"
        :aria-disabled="submitting ? 'true' : undefined"
        :aria-busy="submitting ? 'true' : undefined"
        @tap="submitVerification"
        hover-class="action-btn--hover"
        hover-stay-time="100"
      >
        <text class="action-btn__text">{{ submitting ? t('verification.submittingBtn') : t('verification.submitBtn') }}</text>
      </view>
    </template>

    <!-- 底部安全区占位 -->
    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.verification-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  /* R8-L09-D14（颜色token，同一令牌根顺手项）：渐变终点原为 --c-tint-blue-50 #E3F2FD，
     是本页"蓝调与浅绿体系断层"的第二个落点（第一个是状态卡底 :113）——状态卡已改紫族浅底，
     页面渐变若仍走蓝调，蓝会继续沿整页下缘铺开。改成同族浅绿终点 --c-brand-50 #E8FAF3，
     与 --c-bg-page 起点同色系，页底不再出现蓝调。 */
  background: linear-gradient(180deg, var(--c-bg-page) 0%, var(--c-brand-50, #E8FAF3) 100%);
  box-sizing: border-box;
  position: relative;
  padding-bottom: 32rpx;
}

/* ==================== 顶部导航栏 ==================== */
/* R8-L09-D17：吸顶容器（状态栏安全区 + 88rpx 导航行一起常驻，正文滚过时不得与系统时间/胶囊叠印）。
   本页根容器 .verification-page 是 display:flex 的列，吸顶项必须 flex-shrink:0 才不被压缩。 */
.nav-header {
  position: sticky;
  top: 0;
  z-index: 20;
  flex-shrink: 0;
  /* 实底：容器自身也要铺色，否则滚动态下 safe-top 段是透明的，卡片会从状态栏底下穿过来 */
  background: var(--c-bg-container, #FFFFFF);
  box-shadow: 0 1rpx 4rpx var(--c-neutral-shadow-xs);
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--page-padding, 32rpx);
  height: 88rpx;
  /* 导航行底色交给常驻容器，避免同一白色重复铺两层 */
  background: transparent;
  position: relative;
  z-index: 1;
}

.nav-bar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);

  &--hover {
    background: var(--c-bg-page);
    transform: scale(0.94);
  }
}

.nav-bar__back-icon {
  font-size: var(--fs-7xl, 56rpx);
  color: var(--c-text-primary);
  font-weight: 300;
  line-height: 1;
}

.nav-bar__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

.nav-bar__placeholder {
  width: 64rpx;
  height: 64rpx;
}

/* ==================== 安全区占位 ==================== */
.safe-top {
  
  height: calc(var(--statusbar, env(safe-area-inset-top)) + 0rpx);
  flex-shrink: 0;
}

.safe-bottom {
  height: calc(constant(safe-area-inset-bottom) + 24rpx);
  height: calc(env(safe-area-inset-bottom) + 24rpx);
  flex-shrink: 0;
}

/* ==================== 状态卡片 ==================== */
.status-card {
  position: relative;
  z-index: 1;
  /* R8-L09-D15：状态卡是缺陷行实测「左缘 x=13」的第一块卡，若只改 .section 会与新页边距错位
     ⇒ 水平方向一并走 var(--page-padding)，纵向仍为 --sp-6。 */
  margin: var(--sp-6, 24rpx) var(--page-padding, 32rpx);
  padding: 48rpx 32rpx;
  border-radius: var(--r-xl, 24rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 16rpx var(--c-neutral-shadow-md);
}


.status-card__emoji-img {
  /* R10-P1-004：SafeImage custom-class 此前未定义尺寸 → 图标零尺寸渲染为空白圆 */
  width: 72rpx;
  height: 72rpx;
}

.status-card__emoji-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-container);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx var(--c-black-shadow-sm);
}

.status-card__emoji {
  font-size: 64rpx;
  line-height: 1;
}

.status-card__title {
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  margin-bottom: 12rpx;
}

.status-card__desc {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.6;
}

/* ==================== B4 认证门控横幅（2026-08-13） ==================== */
.gate-banner {
  position: relative;
  z-index: 1;
  /* R8-L09-D15（间距）：水平外边距原硬编码 24rpx(=12px)，比规范页边距少 4px，
     与同页 .section 的第三种节奏并存 ⇒ 统一走 var(--page-padding)（32rpx=16px）。 */
  margin: 0 var(--page-padding, 32rpx);
  padding: 20rpx 24rpx;
  /* 兜底字面量原写 #FFF8E7（那是 --c-tint-cream-50 的值），真令牌为 #FFF8E1
     （design-variables.scss:827，帧上实测横幅底正是 #FFF8E1）⇒ 兜底与令牌值对齐。 */
  background: var(--c-tint-amber-50, #FFF8E1);
  border: 1rpx solid var(--c-border-light);
  border-radius: var(--r-lg, 20rpx);
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.gate-banner__icon {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.gate-banner__text {
  flex: 1;
  /* R8-L09-D13（可达性）：本行是全站唯一一条说明「游客能做什么/不能做什么」的门控文案，
     原实测文字 #F59E0B~#F7AD2F 压 --c-tint-amber-50 #FFF8E1 只有 2.0:1（相对亮度
     #F59E0B=0.4390 vs #FFF8E1=0.9383 ⇒ (0.9883)/(0.4890)=2.02:1），且字号走全站最小正文档 --fs-sm 22rpx。
     ① 文案色改 --c-text-primary #1A1E1C（同底实测 (0.9883)/(0.0623)=15.86:1，
        远高于本行要求的 ≥7:1；建议里的 brand-700 #1F8D6A 同底只有 3.89:1，不达该线，
        故不采纳。注：#1A1E1C 是 design-variables.scss:362 浅色 page 块的值，
        tokens.scss:275 的 #F0F2F5 在 @mixin dark-theme-vars 内，浅色态不会覆盖）；
     ② 字号由 --fs-sm 22rpx 提到 --fs-base 24rpx，与同卡 .status-card__desc /
        .pending-card__desc 的正文档位对齐——门控文案不该用全站最小档。
     警示三角图标保留资产原色：warning.svg 的 stroke 烘焙在素材里（#94A3B8），
     仓内无琥珀色警示三角素材，改色需要新素材 ⇒ 不在本车道内自造。 */
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-primary, #1A1E1C);
  line-height: 1.5;
}

/* ==================== 认证流程卡（B4 强化） ==================== */
.process-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  padding: 24rpx 28rpx;
}

.process-step {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 20rpx 0;

  & + & {
    border-top: 1rpx dashed var(--c-border-light);
  }
}

.process-step__badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: var(--r-circle, 50%);
  /* R9-L09-D05（颜色token P2）：原 brand→brand-300 渐变，序号 11px 白字（.process-step__badge-text
     取的 --c-text-inverse = rgba(255,255,255,0.95)）压在 #4DD2A5 一类的浅绿上只有 1.85:1
     （渐变两端 2.10/1.59）。改成同页主按钮那一档深绿渐变 brand-900→brand-800：
     最亮端 #156B51 对 95% 白字 6.01:1（#F3F8F6 压 #156B51），最暗端 #0B4A38 9.42:1，
     两端都过 4.5:1。 */
  background: linear-gradient(
    135deg,
    var(--c-brand-900, #0B4A38) 0%,
    var(--c-brand-800, #156B51) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.process-step__badge-text {
  font-size: var(--fs-sm, 22rpx);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.process-step__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.process-step__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary);
}

.process-step__desc {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-secondary);
  line-height: 1.5;
  white-space: pre-line;
}

/* ==================== 分组 ==================== */
.section {
  position: relative;
  z-index: 1;
  /* R8-L09-D15（间距）：水平外边距原硬编码 24rpx ⇒ 状态卡/权益格/表单卡/上传卡实测
     统一左缘 x=13、右缘 x=365（页边距 12px，比规范 32rpx=16px 少 4px）。
     与本页 .gate-banner / .status-card / .action-btn 一并按 var(--page-padding) 归口，
     三套水平节奏收成一套。纵向节奏（24rpx = --sp-6）保持原值不动。 */
  margin: var(--sp-6, 24rpx) var(--page-padding, 32rpx) 0;
}

.section__title {
  padding: 0 12rpx 12rpx;
}

.section__title-text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
  font-weight: 500;
}

/* ==================== 权益网格 ==================== */
.benefits-grid {
  display: flex;
  flex-wrap: wrap;
  /* R8-L09-D15：格内 16rpx 属「栅格间距」另一档，原为裸字面量 ⇒ 归口到间距刻度
     --sp-4（值同为 16rpx，渲染零变化），使本页只剩 --page-padding(外缘) 与 --sp-4(内栅) 两套明确节奏。 */
  gap: var(--sp-4, 16rpx);
}

.benefit-item {
  flex: 1 1 calc(50% - 8rpx);
  min-width: 280rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-lg, 20rpx);
  padding: 24rpx;
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.benefit-item__icon {
  width: 64rpx;
  height: 64rpx;
  /* R11-L09-D14（颜色token P3）：同一个 --r-lg 在本页四处兜底写了两种值——
     :879 门控横幅 / :1009 权益卡 / :1117 上传框写 20rpx，本行原写 16rpx。
     令牌真值 = design-variables.scss:201 $radius-lg: 20rpx ⇒ 兜底必须等于真值，
     否则令牌一旦解析失败，这四块圆角分叉成 8px/10px 两档。归口 20rpx。 */
  border-radius: var(--r-lg, 20rpx);
  /* R8-L09-D14 同根第三落点：原为 linear-gradient(135deg, --c-tint-blue-50, --c-tint-blue-50)
     ——两端同值的退化渐变，且仍是蓝调。权益格底座并入本页浅绿族浅底。 */
  background: var(--c-brand-50, #E8FAF3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

/* MP-R1-VERIFY-INDEX-102：图标随 64rpx 底座撑满（原生 image 直引，无跨组件作用域问题） */
.benefit-item__icon-img {
  width: 40rpx;
  height: 40rpx;
}

/* R11-L09-D14（同卡第二条）：.benefit-item__emoji 是孤儿样式——模板自 MP-R1-VERIFY-INDEX-102 起
   渲染的是 :532/.584 的 <image class="benefit-item__icon-img">，全文件 grep 零个 benefit-item__emoji
   引用 ⇒ 删除这条只有 font-size 的死规则（改它零像素，留着只会让下一轮误判「emoji 字形还在」）。 */

.benefit-item__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary);
  margin-bottom: 4rpx;
}

.benefit-item__desc {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

/* ==================== 表单卡片 ==================== */
.form-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  overflow: hidden;
  padding: 0 28rpx;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid var(--c-border-light);
  gap: 24rpx;

  &--no-border {
    border-bottom: none;
  }
}

.form-item__label {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary);
  font-weight: 500;
  width: 120rpx;
  flex-shrink: 0;
}

.form-item__input {
  flex: 1;
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary);
}

.form-item__placeholder {
  color: var(--c-text-tertiary);
  font-size: var(--fs-lg, 28rpx);
}

/* ==================== 上传卡片 ==================== */
.upload-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  overflow: hidden;
  transition: all var(--d-fast, 120ms) ease;

  &--hover {
    transform: scale(0.98);
  }
}

.upload-card__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* R8-L09-D16：外缘补一圈虚线框 + 浅底，让这块空态读起来是「投放/上传区」而不是两行说明文字
     （虚线可点盒为仓内既有做法，见 setup/schedule 页 .time-window-add 与本页同类 add 盒）。 */
  margin: 20rpx;
  padding: 44rpx 32rpx;
  gap: 12rpx;
  box-sizing: border-box;
  border: 1rpx dashed var(--c-border-strong, #C2CAC6);
  border-radius: var(--r-lg, 20rpx);
  background: var(--c-bg-surface, #F3FAF6);
}

.upload-card__icon {
  /* R8-L09-D16：本类此前只写 font-size:80rpx（为从未挂上的 emoji 字形准备），
     挂到原生 <image> 上等于没有尺寸 ⇒ 换成同量级的 80rpx 实尺寸（40px）。 */
  width: 80rpx;
  height: 80rpx;
}

.upload-card__text {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary);
  font-weight: 500;
}

.upload-card__hint {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
}

.upload-card__preview {
  position: relative;
  width: 100%;
  height: 360rpx;
}

.upload-card__image {
  width: 100%;
  height: 100%;
}

.upload-card__change {
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
  padding: 8rpx 20rpx;
  background: var(--c-gradient-mask-strong);
  border-radius: var(--r-full, 9999rpx);
}

.upload-card__change-text {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-inverse);
}

/* ==================== 审核中卡片 ==================== */
.pending-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs), 0 1rpx 4rpx var(--c-neutral-shadow-xs);
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pending-card__emoji {
  font-size: 80rpx;
  line-height: 1;
  margin-bottom: 20rpx;
}

.pending-card__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-warning);
  margin-bottom: 12rpx;
}

.pending-card__desc {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.6;
}

/* ==================== 操作按钮 ==================== */
.action-btn {
  position: relative;
  z-index: 1;
  /* R8-L09-D15：提交按钮同属实测 x=13-365 那一列，随其余卡片一起归口 --page-padding。 */
  margin: var(--sp-7, 32rpx) var(--page-padding, 32rpx) 0;
  padding: 28rpx;
  /* R9-L09-D06（颜色token P1）：原 brand(#36C99A)→brand-300(#75E1B7) 渐变，帧上 365×46px
     按钮实测底 #50D4A6→#59D6AA、文案核心 #F7FEFB ⇒ 1.83:1，本页唯一提交出口看不清。
     建议里的 brand-700 终点不达标（95% 白字压 #1F8D6A 仅 3.89:1），故两端一起压深：
     brand-900→brand-800，最亮端 #156B51 对 95% 白字 6.01:1（#F3F8F6 vs #156B51）、
     最暗端 #0B4A38 9.42:1，渐变内每一像素都过 4.5:1。 */
  background: linear-gradient(
    135deg,
    var(--c-brand-900, #0B4A38) 0%,
    var(--c-brand-800, #156B51) 100%
  );
  border-radius: var(--r-xl, 24rpx);
  box-shadow: 0 4rpx 16rpx var(--c-brand-border-tint-stronger);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;

  &--hover {
    transform: scale(0.98);
    box-shadow: 0 2rpx 8rpx var(--c-brand-border-tint);
  }

  &--disabled {
    opacity: 0.6;
  }

  &--secondary {
    background: var(--c-bg-container);
    box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs);
  }

  &--danger {
    background: var(--c-bg-container);
    border: 1rpx solid var(--c-error, #e5454d);
    box-shadow: 0 2rpx 16rpx var(--c-neutral-shadow-xs);
  }
}

.action-btn__text {
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-inverse);
  font-weight: 600;

  &--secondary {
    color: var(--c-brand);
  }

  &--danger {
    color: var(--c-error, #e5454d);
  }
}
</style>

