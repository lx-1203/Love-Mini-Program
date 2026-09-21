<script setup lang="ts">
/**
 * 统一发布动态页（village/publish）
 *
 * 对齐素材\附近\帖子 参考图「发布动态」：
 *  顶部导航（X + 发布动态 + 绿色发布按钮）
 *  发布到选择器（圈子/校园/通用）→ 内容输入 → 图片九宫格
 *  添加话题/位置/提及/谁可以看 → 发帖小贴士 → 底部工具栏
 *
 * 草稿：本地 storage(village:post-draft) + 后端 /drafts 双写；
 *      退出未发布提示"是否保留草稿"；进入自动恢复；发布成功后清除。
 */
import { ref, computed, watch, onUnmounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useCircleStore, type CircleItem } from "../../../stores/circle";
// MP-R1-PUB-016：字数上限与 store 校验同一来源（stores/village MAX_CONTENT_LENGTH=500），
// 此前本地 POST_MAX_LENGTH=1000 与 store 校验 500 不一致，超 500 字发布必败且仅提交时提示
import { useVillageStore, MAX_CONTENT_LENGTH } from "../../../stores/village";
import { useMock } from "../../../stores/helpers/use-mock";
import { clientApi } from "../../../services/api";
// MP-R1-PUBLISH-004：publish 独立草稿存储键（原与 post.vue 共用 village:post-draft，
// 两页快照结构不同互写污染：post 的 title 被静默丢弃、publish 的空 title 反向覆盖）
import { PUBLISH_DRAFT_STORAGE_KEY, POST_MAX_IMAGES } from "../../../constants/village";
// MP-R1-PUBLISH-006：缓存城市键统一入 constants/storage-keys.ts
import { STORAGE_KEYS } from "../../../constants/storage-keys";
import { POST_DRAFT_SAVE_DEBOUNCE_MS } from "../../../constants/chat";
import { IMAGE_PATHS } from "../../../config/images";
import { ensurePrivacyAuthorized } from "../../../utils/privacy";
import { chooseImages } from "../../../utils/media";
import { compressImages } from "../../../utils/compress-image";
// R20（2026-09-08）：publish-header 原用 var(--statusbar, env(safe-area-inset-top))（模拟器/无刘海机型=0），
// 系统时间与「发布动态」标题叠印 → 改 JS 注入 statusBarHeight
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";

const statusBarHeightPx = useStatusBarHeight();

const { t } = useI18n();
const circleStore = useCircleStore();
const villageStore = useVillageStore();

/** MP-R1-PUB-016：接近字数上限的提醒阈值（剩 50 字内计数变警示色） */
const CONTENT_LENGTH_WARN_THRESHOLD = 50;

/* ---------- 状态 ---------- */
const content = ref("");
const images = ref<string[]>([]);
const topics = ref<string[]>([]);
const location = ref("");
// 2026-09-06 位置固定为当前城市（默认定位，不可更改）：读缓存城市，缺省北京。
// MP-R1-PUBLISH-006：原全库无 nearby:city 写入方 → 恒显示缺省「北京市 · 自动定位」；
// nearby 页定位成功处已补写入（utils/location.ts 链路），无缓存时不再宣称「自动定位」。
const currentCity = (() => {
  try {
    const city = uni.getStorageSync(STORAGE_KEYS.NEARBY_CITY);
    return typeof city === "string" && city.trim().length > 0 ? city : "";
  } catch (_e) {
    return "";
  }
})();
const currentCityLabel = currentCity ? `${currentCity} · 自动定位` : "北京市";
// 2026-08-31：默认目标为公开广场 → 默认所有人可见；选择圈子目标时联动为圈内成员可见
const visibility = ref("public");
const tipVisible = ref(true);
const submitting = ref(false);

/** 发布目标：general | circle | campus | friends（R16：日常，仅喜欢/关注可见） */
const targetType = ref<"general" | "circle" | "campus" | "friends">("general");
const targetId = ref<number | null>(null);
const targetCircle = ref<CircleItem | null>(null);
const targetOpen = ref(false);

const currentLength = computed(() => content.value.length);
/** MP-R1-PUB-016：接近上限时计数警示（颜色提示用 token，见样式 --c-warning） */
const isNearLimit = computed(
  () => MAX_CONTENT_LENGTH - currentLength.value <= CONTENT_LENGTH_WARN_THRESHOLD
);
const canSubmit = computed(() => content.value.trim().length > 0 && !submitting.value);
const isCircleTarget = computed(() => targetType.value === "circle");

/** 可发布的目标圈子（仅当前用户已加入的兴趣圈），保持上限 8 个展示 */
const joinedCircles = computed(() => circleStore.circles.filter((c) => c.isJoined).slice(0, 8));

/** MP-R1-PUB-017：圈子列表加载中（弹层「兴趣圈子」分组提示用） */
const circlesLoading = ref(false);

// MP-R1-PUB-017（2026-09-20）：直入发布页时 circleStore 尚未加载，joinedCircles 恒空，
// 「兴趣圈子」分组被静默隐藏。弹层打开时若为空则懒加载一次，加载中/空态在弹层内提示。
watch(targetOpen, (open) => {
  if (open && circleStore.circles.length === 0 && !circlesLoading.value) {
    circlesLoading.value = true;
    circleStore
      .fetchCircles()
      .catch(() => {
        uni.showToast({ title: "圈子列表加载失败，请稍后重试", icon: "none" });
      })
      .finally(() => {
        circlesLoading.value = false;
      });
  }
});

/** 发布到展示文案 */
const targetTitle = computed(() => {
  if (isCircleTarget.value && targetCircle.value) return targetCircle.value.name;
  if (targetType.value === "campus") return t("circle.postTopicTargetCampus");
  // R16：日常目标
  if (targetType.value === "friends") return "个人日常";
  // R21（2026-09-09）：与 post 版发布页/渠道弹层统一命名为「个人动态」（原「公开广场」两处叫法不一致）
  return "个人动态";
});

const targetSubtitle = computed(() => {
  if (isCircleTarget.value && targetCircle.value) {
    return `${formatMemberShort(targetCircle.value.memberCount)} 成员`;
  }
  if (targetType.value === "campus") return "校园圈 · 所有校园成员可见";
  // R16：日常目标文案
  if (targetType.value === "friends") return "日常 · 仅互相喜欢或关注我的人可见";
  return "默认公开 · 所有人可见";
});

/** R21：成员数短格式（1.2w / 8,932） */
function formatMemberShort(count: number): string {
  const n = count ?? 0;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  return n.toLocaleString("en-US");
}

/** 圈内成员可见（谁可以看） */
/** 批次 B4：可见范围文案对齐后端 visibility 三态 */
const visibilityText = computed(() => {
  if (visibility.value === "public") return t("village.post.visibilityPublic");
  if (visibility.value === "school") return "学校圈";
  if (visibility.value === "interest") return "兴趣圈";
  // R16：日常可见范围
  if (visibility.value === "friends") return "仅喜欢/关注的人可见";
  return t("village.post.visibilityPublic");
});

/* ---------- 进入：解析目标 + 恢复草稿 ---------- */
onLoad((query) => {
  const cid = query?.circleId ? Number(query.circleId) : null;
  const entryTarget = query?.target;
  if (entryTarget === "campus") targetType.value = "campus";
  // R16：日常模式入口（我的故事「添加日常」）
  if (entryTarget === "friends") {
    targetType.value = "friends";
    visibility.value = "friends";
  }
  if (cid && !Number.isNaN(cid)) {
    targetType.value = "circle";
    targetId.value = cid;
  }
  void loadTarget();
  // MP-R1-PUBLISH-005：入口参数（friends/campus/circleId）优先级高于旧草稿——
  // restoreDraft 内部恢复后会强制回设入口语义的目标与可见范围
  void restoreDraft(entryTarget, cid);
});

async function loadTarget() {
  if (!isCircleTarget.value) return;
  try {
    if (circleStore.circles.length === 0) await circleStore.fetchCircles();
    targetCircle.value = circleStore.circles.find((c) => c.id === String(targetId.value)) ?? null;
    // 修复：目标圈子已不可选（未加入 / 不存在）时回退到「个人动态」，
    // 避免选中空圈子提交导致 400。
    const selected = targetCircle.value;
    if (!selected || !selected.isJoined) {
      targetType.value = "general";
      targetId.value = null;
      targetCircle.value = null;
    }
  } catch (_e) {
    targetType.value = "general";
    targetId.value = null;
    targetCircle.value = null;
  }
}

function selectTarget(circle: CircleItem) {
  targetType.value = "circle";
  targetId.value = Number(circle.id);
  targetCircle.value = circle;
  // 圈子目标 → 仅圈内成员可见（批次 B4：对齐后端 visibility interest）
  visibility.value = "interest";
  targetOpen.value = false;
}

function chooseGeneral() {
  targetType.value = "general";
  targetId.value = null;
  targetCircle.value = null;
  // 公开广场 → 所有人可见
  visibility.value = "public";
  targetOpen.value = false;
}

function chooseCampus() {
  targetType.value = "campus";
  targetId.value = null;
  targetCircle.value = null;
  // 校园圈 → 仅同校认证成员可见（批次 B4：对齐后端 visibility school）
  visibility.value = "school";
  targetOpen.value = false;
}

/* ---------- 图片 ---------- */
async function chooseImage() {
  if (images.value.length >= POST_MAX_IMAGES) {
    uni.showToast({ title: t("village.post.maxImagesError", { n: POST_MAX_IMAGES }), icon: "none" });
    return;
  }
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({ title: t("village.post.privacyRequiredImage"), icon: "none" });
    return;
  }
  try {
    const picked = await chooseImages({ count: POST_MAX_IMAGES - images.value.length });
    const tempPaths = (picked as string[]) || [];
    const compressed = await compressImages(tempPaths);
    images.value.push(...compressed);
  } catch (e: unknown) {
    // errno 112: api scope 未在隐私指引声明 → 给用户明确提示
    const errMsg = typeof e === "object" && e !== null && "errMsg" in e
      ? String((e as { errMsg?: unknown }).errMsg)
      : String(e ?? "");
    if (errMsg.includes("112") || errMsg.includes("privacy agreement")) {
      console.error("选择图片失败: 隐私协议未声明相册/相机 scope", e);
      uni.showToast({ title: "请在微信后台隐私指引声明相册/相机权限", icon: "none" });
    } else {
      console.error("选择图片失败:", e);
    }
  }
}

function removeImage(index: number) {
  images.value.splice(index, 1);
}

/* ---------- 话题 ---------- */
function toggleTopic(topic: string) {
  const tag = topic.startsWith("#") ? topic : "#" + topic;
  const idx = topics.value.indexOf(tag);
  if (idx >= 0) topics.value.splice(idx, 1);
  else if (topics.value.length < 5) topics.value.push(tag);
}

function openMentionPicker() {
  uni.showToast({ title: t("village.post.mentionHint"), icon: "none" });
}
/**
 * 2026-09-03（审查报告 P3-7）：可见范围轮换与后端 visibility 枚举强联动。
 * 原实现轮换 legacy 值 circle_members/private（后端 Post.Visibility 仅
 * public_/school/interest），payload 携带非法值有 400 风险。
 * 按发布目标约束合法集合：公开广场→公开/学校圈；学校圈→学校圈；兴趣圈→圈内。
 */
function cycleVisibility() {
  // MP-R1-PUBLISH-001：general 目标不再提供「学校圈」轮换项——后端 CreatePostRequest
  // 无 visibility 字段、可见范围由 targetType 推导（general→public_），UI 承诺的
  // 「学校圈」会被服务端静默变成全平台公开。UI 所见 = 服务端落库，故只保留「公开」。
  const order: string[] =
    targetType.value === "general"
      ? ["public"]
      : targetType.value === "campus"
        ? ["school"]
        : ["interest"];
  // noUncheckedIndexedAccess：数组索引访问为 string|undefined，先收敛再赋值
  const first = order[0];
  if (first && !order.includes(visibility.value)) {
    visibility.value = first;
    return;
  }
  const next = order[(order.indexOf(visibility.value) + 1) % order.length];
  if (next) visibility.value = next;
}

/* ---------- 草稿：本地 + 后端双写 ---------- */
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;
let draftSyncTimer: ReturnType<typeof setTimeout> | null = null;

/** R5(INDEP-001)：正文 #话题 与已选话题合并——原逻辑只在 submit 作用域内，
 *  snapshotDraft 越界引用导致每次编辑草稿都抛 ReferenceError，草稿保存完全不生效 */
function buildMergedTopics(): string[] {
  const inlineTopics = Array.from(content.value.matchAll(/#([^\s#··]+)/g))
    .map((m) => `#${m[1]}`)
    .filter((tag) => !topics.value.includes(tag))
    .slice(0, 5 - topics.value.length);
  return [...topics.value, ...inlineTopics];
}

function snapshotDraft() {
  return {
    targetType: targetType.value,
    targetId: targetId.value,
    title: "",
    content: content.value,
    images: images.value,
    tags: buildMergedTopics(),
    topics: topics.value,
    location: location.value,
    visibility: visibility.value,
    // MP-R1-PUBLISH-004：快照带时间戳，恢复时与后端草稿取新（原后端旧草稿无条件压过本地）
    updatedAt: Date.now(),
  };
}

/** 草稿 updatedAt 归一为毫秒（本地为 number，后端为 ISO 字符串） */
function draftTimeMs(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }
  return 0;
}

/** MP-R1-PUBLISH-003：取消全部在途草稿定时器 */
function cancelDraftTimers() {
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
  }
  if (draftSyncTimer) {
    clearTimeout(draftSyncTimer);
    draftSyncTimer = null;
  }
}

/**
 * MP-R1-PUBLISH-003：同步落盘当前快照（本地 + 后端双写，不等防抖）。
 * 「保留草稿」退出路径直接 flush——原 scheduleDraftSave() 挂上 500ms 定时器后立即
 * leave()→onUnmounted clearTimeout，最终快照永不落盘（最后 ≤500ms 编辑必丢）。
 */
function flushDraftSave() {
  cancelDraftTimers();
  const snap = snapshotDraft();
  try {
    uni.setStorageSync(PUBLISH_DRAFT_STORAGE_KEY, snap);
  } catch (_e) { /* storage 失败不阻塞 */ }
  void clientApi.saveDraft(snap).catch(() => { /* 后端失败由本地兜底 */ });
}

function scheduleDraftSave() {
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(async () => {
    const snap = snapshotDraft();
    try {
      uni.setStorageSync(PUBLISH_DRAFT_STORAGE_KEY, snap);
    } catch (_e) { /* storage 失败不阻塞 */ }
    // 后端双写（失败静默，本地兜底）
    if (draftSyncTimer) clearTimeout(draftSyncTimer);
    draftSyncTimer = setTimeout(async () => {
      try {
        await clientApi.saveDraft(snap);
      } catch (_e) {
        // 前后端断连等场景静默，由本地草稿兜底
      }
    }, 2000);
  }, POST_DRAFT_SAVE_DEBOUNCE_MS);
}

/**
 * 恢复草稿。
 * @param entryTarget 入口参数 query.target（MP-R1-PUBLISH-005：带隐私语义的入口参数
 *   优先级高于草稿——friends/campus 入口恢复草稿后强制回设目标与可见范围，
 *   禁止「目标卡=个人日常」与「谁可以看=所有人可见」同屏矛盾）
 * @param entryCircleId 入口参数 query.circleId（草稿的圈子目标不得劫持带 circleId 的入口）
 */
async function restoreDraft(entryTarget?: string, entryCircleId?: number | null) {
  // MP-R1-PUBLISH-004：后端草稿与本地草稿按 updatedAt 取新（原后端无条件优先）
  type DraftShape = { targetType?: string; targetId?: number | null; content?: string; images?: string[]; topics?: string[]; tags?: string[]; location?: string; visibility?: string; updatedAt?: unknown };
  let remoteDraft: DraftShape | null = null;
  try {
    const remote = await clientApi.getDraft();
    if (remote && remote.content) remoteDraft = remote as unknown as DraftShape;
  } catch (_e) { /* 后端不可用走本地 */ }
  let localDraft: DraftShape | null = null;
  try {
    const local = uni.getStorageSync(PUBLISH_DRAFT_STORAGE_KEY);
    if (local && typeof local === "object") localDraft = local as DraftShape;
  } catch (_e) { /* ignore */ }
  let draft: DraftShape | null = null;
  if (remoteDraft && localDraft) {
    draft = draftTimeMs(localDraft.updatedAt) >= draftTimeMs(remoteDraft.updatedAt) ? localDraft : remoteDraft;
  } else {
    draft = remoteDraft ?? localDraft;
  }
  if (!draft) return;
  if (draft.targetType === "circle" && draft.targetId) {
    targetType.value = "circle";
    targetId.value = Number(draft.targetId);
  } else if (draft.targetType === "campus") {
    targetType.value = "campus";
  }
  if (typeof draft.content === "string") content.value = draft.content;
  if (Array.isArray(draft.images)) images.value = draft.images;
  if (Array.isArray(draft.topics)) topics.value = draft.topics;
  else if (Array.isArray(draft.tags)) topics.value = draft.tags;
  if (typeof draft.location === "string") location.value = draft.location;
  if (typeof draft.visibility === "string") visibility.value = draft.visibility;
  // MP-R1-PUBLISH-005：入口参数优先——恢复草稿后强制回设
  if (entryTarget === "friends") {
    targetType.value = "friends";
    visibility.value = "friends";
  } else if (entryTarget === "campus") {
    targetType.value = "campus";
    visibility.value = "school";
  }
  if (entryCircleId != null && !Number.isNaN(entryCircleId)) {
    targetType.value = "circle";
    targetId.value = entryCircleId;
  }
  // 草稿为圈子目标时同样校验是否仍为「已加入」圈子（否则回退到个人动态）
  if (isCircleTarget.value || images.value.length > 0) void loadTarget();
}

/** MP-R1-PUBLISH-003：先取消在途定时器再删存储（防止定时器把已删草稿写回） */
function clearDraft() {
  cancelDraftTimers();
  try { uni.removeStorageSync(PUBLISH_DRAFT_STORAGE_KEY); } catch (_e) { /* ignore */ }
  void clientApi.deleteDraft().catch(() => {});
}

// MP-R1-PUBLISH-002：images/topics 为 ref 数组且 chooseImage/removeImage/toggleTopic 全部
// 原地变异（push/splice 不换 .value 引用），非 deep watch 感知不到——改 getter 摊平数组，
// 每次增删都触发草稿保存（只加图不打字的用户图片不再丢出草稿）
watch([content, () => [...images.value], () => [...topics.value], location, visibility, targetType, targetId], () => scheduleDraftSave());

/* ---------- 退出：未发布提示保留草稿 ---------- */
const allowLeave = ref(false);
function requestLeave() {
  if (allowLeave.value) return;
  const dirty = content.value.trim() || images.value.length || topics.value.length;
  if (!dirty) { leave(); return; }
  uni.showModal({
    title: t("village.post.draftModalTitle"),
    content: t("village.post.draftModalContent"),
    confirmText: t("village.post.draftKeep"),
    cancelText: t("village.post.draftDiscard"),
    success: (res) => {
      // MP-R1-PUBLISH-003：「保留」路径同步 flush（原 scheduleDraftSave 的定时器在
      // leave→onUnmounted 时被清，最终快照永不落盘）
      if (res.confirm) { flushDraftSave(); leave(); }
      else { clearDraft(); leave(); }
    },
  });
}

function leave() {
  allowLeave.value = true;
  // 兜底：首页/深链场景 navigateBack 会失败
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.reLaunch({ url: "/subpackages/village/village/index" });
  }
}

/* ---------- 提交 ---------- */
async function submitPublish() {
  if (!content.value.trim()) {
    uni.showToast({ title: t("village.contentRequired"), icon: "none" });
    return;
  }
  // 后端 CreatePostRequest 校验 title 长度必须 5–30 字（400 否决）；
  // 正文即标题的发布形态下：正文至少 5 字 + 标题截断到 30 字，保证与后端规则一致
  if (content.value.trim().length < 5) {
    uni.showToast({ title: t("village.contentMinLength", { n: 5 }), icon: "none" });
    return;
  }
  const titleFromContent = content.value.trim().slice(0, 30);
  if (submitting.value) return;
  submitting.value = true;
  // 2026-09-06：正文中直接输入的 #话题 自动并入话题列表（与行入口等效）
  // R5(INDEP-001)：合并逻辑提取为 buildMergedTopics()（草稿快照共用），消除越界引用
  const mergedTopics = buildMergedTopics();
  uni.showLoading({ title: t("village.post.publishing"), mask: true });
  try {
    // real 模式上传本地图片
    let finalImages = images.value;
    const localImages = images.value.filter((img) => !/^https?:\/\//.test(img));
    if (localImages.length > 0 && !useMock()) {
      uni.showLoading({ title: t("village.post.uploadingImages") });
      try {
        const urls: string[] = [];
        for (const img of localImages) {
          const r = await clientApi.uploadPostImage({ name: `post-image-${Date.now()}.jpg`, path: img });
          urls.push(r.url);
        }
        finalImages = [...images.value.filter((img) => /^https?:\/\//.test(img)), ...urls];
      } catch (_e) {
        uni.hideLoading();
        uni.showToast({ title: t("village.post.imageUploadFailed"), icon: "none" });
        return;
      } finally { uni.hideLoading(); }
    }
    if (isCircleTarget.value && targetId.value != null) {
      await circleStore.createTopic(String(targetId.value), {
        title: titleFromContent,
        content: content.value.trim(),
        images: finalImages,
        tags: mergedTopics,
      });
      uni.showToast({ title: t("village.postSuccess"), icon: "success" });
    } else {
      await villageStore.createPost({
        categoryId: "interest",
        title: titleFromContent,
        content: content.value.trim(),
        images: finalImages,
        tags: mergedTopics,
        visibility: visibility.value,
        targetType: targetType.value,
        targetId: targetId.value,
      });
      uni.showToast({ title: t("village.postSuccess"), icon: "success" });
    }
    // MP-R8-DRAFT-001（2026-09-16）：后端 /drafts 草稿也要删除——restoreDraft 优先后端草稿，
    // 只清本地会导致下次进入恢复已发布内容（重复发布风险）
    void clientApi.deleteDraft().catch(() => {});
    clearDraft();
    allowLeave.value = true;
    setTimeout(() => {
      if (getCurrentPages().length > 1) {
        uni.navigateBack();
      } else {
        uni.reLaunch({ url: "/subpackages/village/village/index" });
      }
    }, 400);
  } catch (e) {
    // 2026-08-31：优先展示后端具体原因（如「请先加入该圈子，再在圈内发帖」）
    const msg = e instanceof Error && e.message
      ? e.message
      : circleStore.errorMessage || villageStore.errorMessage || t("village.post.publishFailed");
    uni.showToast({ title: msg, icon: "none" });
  } finally {
    uni.hideLoading();
    submitting.value = false;
  }
}

onUnmounted(() => {
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  if (draftSyncTimer) clearTimeout(draftSyncTimer);
});
</script>

<template>
  <view class="publish-page">
    <!-- 顶部导航（R20：padding-top 注入状态栏高度，标题不再与系统时间叠印） -->
    <view class="publish-header" :style="{ paddingTop: statusBarHeightPx + 10 + 'px' }">
      <view class="publish-header__close press-feedback" hover-class="press-feedback--active" role="button" :aria-label="t('common.closeAria')" @tap="requestLeave">
        <image class="publish-header__x" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
      </view>
      <text class="publish-header__title">发布动态</text>
      <view class="publish-header__submit" :class="{ 'publish-header__submit--disabled': !canSubmit }" role="button" :aria-label="t('common.publish')" @tap="submitPublish">
        <text class="publish-header__submit-text">发布</text>
      </view>
    </view>

    <scroll-view class="publish-body" scroll-y :show-scrollbar="false">
      <!-- 发布到 -->
      <view class="publish-to">
        <text class="publish-to__label">发布到</text>
        <view class="publish-to__card press-feedback" role="button" @tap="targetOpen = !targetOpen">
          <view class="publish-to__avatar">
            <image v-if="isCircleTarget && targetCircle" class="publish-to__avatar-img" :src="IMAGE_PATHS.CIRCLE_COVERS.DEFAULT" mode="aspectFill" alt="" />
            <image v-else-if="isCircleTarget" class="publish-to__avatar-emoji" :src="IMAGE_PATHS.ICONS_EMOJI.CAMERA_ICON" mode="aspectFit" alt="" />
            <image v-else class="publish-to__avatar-emoji" :src="IMAGE_PATHS.ICONS_EMOJI.SCHOOL" mode="aspectFit" alt="" />
          </view>
          <view class="publish-to__info">
            <view class="publish-to__name-row">
              <text class="publish-to__name">{{ targetTitle }}</text>
              <text v-if="isCircleTarget" class="publish-to__tag">圈内成员可见</text>
            </view>
            <text class="publish-to__subtitle">{{ targetSubtitle }}</text>
          </view>
          <text class="publish-to__arrow">›</text>
        </view>
        <!-- 目标选择弹层（R20：公域 → 校园私域 → 兴趣圈子 三级分组） -->
        <view v-if="targetOpen" class="publish-target-sheet" @tap="targetOpen = false">
          <view class="publish-target-sheet__panel" @tap.stop>
            <view class="publish-target-sheet__head">
              <text class="publish-target-sheet__title">选择发布到</text>
            </view>
            <text class="publish-target-sheet__group">公域 · 所有人可见</text>
            <view class="publish-target-sheet__option press-feedback" role="button" @tap="chooseGeneral">
              <text class="publish-target-sheet__name">个人动态</text>
              <text class="publish-target-sheet__desc">默认公开，所有人可见</text>
              <image v-if="targetType === 'general'" class="publish-target-sheet__check" :src="IMAGE_PATHS.ICONS_EMOJI.CHECK" mode="aspectFit" alt="" />
            </view>
            <text class="publish-target-sheet__group">校园私域 · 同校可见</text>
            <view class="publish-target-sheet__option press-feedback" role="button" @tap="chooseCampus">
              <text class="publish-target-sheet__name">校园圈</text>
              <text class="publish-target-sheet__desc">仅认证同校同学可见</text>
              <image v-if="targetType === 'campus'" class="publish-target-sheet__check" :src="IMAGE_PATHS.ICONS_EMOJI.CHECK" mode="aspectFit" alt="" />
            </view>
            <template v-if="circlesLoading">
              <text class="publish-target-sheet__hint">兴趣圈子加载中…</text>
            </template>
            <template v-else-if="joinedCircles.length > 0">
              <text class="publish-target-sheet__group">兴趣圈子 · 圈内成员可见</text>
              <view
                v-for="circle in joinedCircles"
                :key="circle.id"
                class="publish-target-sheet__option press-feedback"
                role="button"
                @tap="selectTarget(circle)"
              >
                <text class="publish-target-sheet__name">{{ circle.name }}</text>
                <text class="publish-target-sheet__joined">已加入</text>
                <text class="publish-target-sheet__desc">{{ formatMemberShort(circle.memberCount) }} 成员</text>
                <image v-if="isCircleTarget && targetId === Number(circle.id)" class="publish-target-sheet__check" :src="IMAGE_PATHS.ICONS_EMOJI.CHECK" mode="aspectFit" alt="" />
              </view>
            </template>
            <template v-else>
              <text class="publish-target-sheet__hint">尚未加入兴趣圈子，可先在「附近 - 热门兴趣圈」加入</text>
            </template>
          </view>
        </view>
      </view>

      <!-- 内容输入 -->
      <view class="publish-content">
        <textarea
  cursor-spacing="20"
          v-model="content"
          class="publish-content__input"
          placeholder="分享一点最近发生的事…"
          :maxlength="MAX_CONTENT_LENGTH"
          :show-confirm-bar="false"
          :aria-label="t('village.post.contentPlaceholder')"
        />
        <!-- MP-R1-PUB-016：计数上限与 store 校验同源（500），接近上限变警示色 -->
        <view
          class="publish-content__count"
          :class="{ 'publish-content__count--warning': isNearLimit }"
        >{{ currentLength }}/{{ MAX_CONTENT_LENGTH }}</view>
      </view>

      <!-- 图片九宫格 -->
      <view class="publish-images">
        <view v-for="(img, idx) in images" :key="idx" class="publish-image">
          <image class="publish-image__img" :src="img" mode="aspectFill" alt="" />
          <view class="publish-image__remove press-feedback" role="button" @tap="removeImage(idx)">
            <image class="publish-image__remove-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
          </view>
        </view>
        <view v-if="images.length < POST_MAX_IMAGES" class="publish-image publish-image--add press-feedback" role="button" @tap="chooseImage">
          <text class="publish-image__plus">＋</text>
        </view>
      </view>

      <!-- 行项 -->
      <view class="publish-rows">
        <view class="publish-row press-feedback" role="button" @tap="toggleTopic('#校园日常')">
          <text class="publish-row__icon">#</text>
          <text class="publish-row__label">添加话题</text>
          <text class="publish-row__meta">已选 {{ topics.length }}/5</text>
          <text class="publish-row__arrow">›</text>
        </view>
        <!-- 2026-09-06：位置固定为当前城市（默认定位，不可更改），移除选择交互 -->
        <view class="publish-row">
          <image class="publish-row__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
          <text class="publish-row__label">添加位置</text>
          <!-- R3：原「北京市 · 当前位置」语义混拼，改为可读的定位说明 -->
          <!-- MP-R1-PUBLISH-006：无定位缓存时不再宣称「自动定位」（原恒显示缺省「北京市 · 自动定位」） -->
          <text class="publish-row__meta">{{ currentCity ? currentCityLabel : '选择位置' }}</text>
        </view>
        <view class="publish-row press-feedback" role="button" @tap="openMentionPicker">
          <text class="publish-row__icon">@</text>
          <text class="publish-row__label">提及好友</text>
          <text class="publish-row__arrow">›</text>
        </view>
        <view class="publish-row press-feedback" role="button" @tap="cycleVisibility">
          <image class="publish-row__icon" :src="IMAGE_PATHS.ICONS_EMOJI.EYE" mode="aspectFit" alt="" />
          <text class="publish-row__label">谁可以看</text>
          <text class="publish-row__meta">{{ visibilityText }}</text>
          <text class="publish-row__arrow">›</text>
        </view>
      </view>

      <!-- 发帖小贴士 -->
      <view v-if="tipVisible" class="publish-tip">
        <view class="publish-tip__text-wrap">
          <view class="publish-tip__title">
            <image class="publish-tip__title-icon" :src="IMAGE_PATHS.ICONS_EMOJI.SPROUT" mode="aspectFit" alt="" />
            <text>发帖小贴士</text>
          </view>
          <text class="publish-tip__desc">真实分享校园生活，友善互动，让更多人认识有趣的你～</text>
        </view>
        <view class="publish-tip__close press-feedback" role="button" @tap="tipVisible = false">
          <image class="publish-tip__close-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
        </view>
      </view>

      <view class="publish-body__bottom-space" />
    </scroll-view>

    <!-- 2026-09-06：底部工具栏已按需求移除（与上方行项重复，且无实际作用） -->
  </view>
</template>

<style scoped lang="scss">
.publish-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffffff; /* R16：纯白背景 */
}

.publish-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  /* R20：状态栏高度改由 JS 注入（:style paddingTop），env() 在模拟器为 0 会与系统时间叠印；
     右侧仍预留微信胶囊宽度，避免「发布」被胶囊遮挡。R4：200→210rpx，与胶囊保持 ≥10px 间距 */
  padding: 16rpx 210rpx 16rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #EEF2F0;
  flex-shrink: 0;
}
.publish-header__close { width: 64rpx; height: 64rpx; display:flex; align-items:center; justify-content:center; flex-shrink: 0; }
.publish-header__x { width: 36rpx; height: 36rpx; color: #1A1E1C; }
.publish-header__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1A1E1C;
  /* R4：三栏弹性布局——标题在 [X] 与 [发布] 之间的剩余空间内居中（绝对居中会与发布按钮贴挤） */
  flex: 1;
  text-align: center;
}
.publish-header__submit { padding: 12rpx 36rpx; border-radius: 999rpx; background: #36C99A; flex-shrink: 0; }
/* R3：禁用态白字对浅绿底对比度仅 1.36:1（judged 证据），文字改深绿保证可辨认 */
.publish-header__submit--disabled { background: #C7E9DC; }
.publish-header__submit--disabled .publish-header__submit-text { color: #2A7A5E; }
.publish-header__submit-text { font-size: 28rpx; font-weight: 700; color: #fff; }

.publish-body { flex: 1; min-height: 0; }

.publish-to { padding: 32rpx 32rpx 8rpx; }
.publish-to__label { font-size: 26rpx; color: #6B7571; margin-bottom: 16rpx; }
.publish-to__card { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; background: #fff; border-radius: 24rpx; border: 1rpx solid #EEF2F0; }
.publish-to__avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: #E8FBF2; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.publish-to__avatar-img {
  border-radius: var(--r-full);
 width: 100%; height: 100%; }
.publish-to__avatar-emoji { width: 44rpx; height: 44rpx; }
.publish-to__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.publish-to__name-row { display: flex; align-items: center; gap: 10rpx; }
.publish-to__name { font-size: 30rpx; font-weight: 700; color: #1A1E1C; }
.publish-to__tag { padding: 2rpx 12rpx; border-radius: 8rpx; background: #E8FBF2; color: #36C99A; font-size: 20rpx; }
.publish-to__subtitle { font-size: 24rpx; color: #9AA39F; }
.publish-to__arrow { font-size: 36rpx; color: #C2CAC6; }

.publish-target-sheet { position: fixed; inset: 0; z-index: 1100; background: rgba(0,0,0,0.45); display:flex; align-items:flex-end; }
/* R21：弹层加高到 78vh（兴趣圈子分组此前在 70vh 下不可见）+ 底部安全区，末行不再贴屏裁切 */
.publish-target-sheet__panel { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 24rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 78vh; overflow-y: auto; box-sizing: border-box; }
.publish-target-sheet__head { padding: 16rpx 0 24rpx; }
.publish-target-sheet__title { font-size: 30rpx; font-weight: 700; color: #1A1E1C; }
/* R20：渠道分组标题（公域 / 校园私域 / 兴趣圈子） */
.publish-target-sheet__group { display: block; padding: 20rpx 8rpx 8rpx; font-size: 22rpx; font-weight: 600; color: #36C99A; }
.publish-target-sheet__option { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 8rpx; border-bottom: 1rpx solid #F2F5F3; }
.publish-target-sheet__name { font-size: 28rpx; color: #1A1E1C; }
.publish-target-sheet__circle-opt { display: flex; align-items: center; }
.publish-target-sheet__joined { font-size: 20rpx; color: #2FA366; background: #E8F6EE; border-radius: 6rpx; padding: 2rpx 10rpx; margin-left: 12rpx; }
.publish-target-sheet__desc { font-size: 24rpx; color: #9AA39F; margin-left: 12rpx; /* R21：desc 弹性占位（与 post 版一致），选项行结构跨版统一 */ flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.publish-target-sheet__check { width: 32rpx; height: 32rpx; color: #36C99A; }
/* MP-R1-PUB-017：弹层「兴趣圈子」分组加载中/空态提示 */
.publish-target-sheet__hint { display: block; padding: 24rpx 8rpx; font-size: 24rpx; color: var(--c-text-tertiary, #9AA39F); }

.publish-content { padding: 24rpx 32rpx; }
.publish-content__input { width: 100%; min-height: 220rpx; font-size: 30rpx; color: #1A1E1C; line-height: 1.6; }
.publish-content__count { text-align: right; font-size: 22rpx; color: #9AA39F; margin-top: 8rpx; }
/* MP-R1-PUB-016：接近字数上限警示（颜色走 --c-warning token） */
.publish-content__count--warning { color: var(--c-warning, #FF9F43); }

.publish-images { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 16rpx 32rpx; }
.publish-image { width: 200rpx; height: 200rpx; border-radius: 16rpx; overflow: hidden; position: relative; background: #EAF6F1; }
.publish-image__img { width: 100%; height: 100%; }
.publish-image__remove { position: absolute; top: 6rpx; right: 6rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; }
.publish-image__remove-icon { width: 22rpx; height: 22rpx; color: #fff; }
/* R21：添加图片块对齐 post 版虚线白底样式（原继承浅绿实心底，与理想图不符） */
.publish-image--add { display: flex; align-items: center; justify-content: center; background: #ffffff; border: 2rpx dashed #C7D8D2; box-sizing: border-box; }
.publish-image__plus { font-size: 56rpx; color: #9AA39F; }

.publish-rows { margin: 16rpx 32rpx; background: #fff; border-radius: 24rpx; border: 1rpx solid #EEF2F0; }
.publish-row { display: flex; align-items: center; gap: 16rpx; padding: 26rpx 24rpx; border-bottom: 1rpx solid #F2F5F3; }
.publish-row__icon { width: 44rpx; height: 44rpx; color: #36C99A; text-align: center; }
.publish-row__label { font-size: 28rpx; color: #1A1E1C; }
.publish-row__meta { flex: 1; text-align: right; font-size: 24rpx; color: #9AA39F; }
.publish-row__arrow { font-size: 32rpx; color: #C2CAC6; }

.publish-tip { margin: 24rpx 32rpx; padding: 24rpx; background: #EAF9F3; border-radius: 20rpx; display: flex; align-items: flex-start; gap: 16rpx; }
.publish-tip__text-wrap { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.publish-tip__title { font-size: 26rpx; font-weight: 700; color: #36C99A; display: flex; align-items: center; gap: 8rpx; }
.publish-tip__title-icon { width: 28rpx; height: 28rpx; color: #36C99A; }
.publish-tip__desc { font-size: 24rpx; color: #6B7571; }
.publish-tip__close-icon { width: 28rpx; height: 28rpx; color: #9AA39F; }

.publish-body__bottom-space { height: 24rpx; }

.publish-toolbar { display: flex; justify-content: space-around; padding: 16rpx 24rpx calc(env(safe-area-inset-bottom) + 12rpx); background: #fff; border-top: 1rpx solid #EEF2F0; flex-shrink: 0; }
.publish-tool { display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.publish-tool__icon { width: 40rpx; height: 40rpx; color: #6B7571; }
.publish-tool__label { font-size: 20rpx; color: #9AA39F; }


/* R16（2026-09-07）：页面背景统一纯白（对齐「他人显示主页」理想图色调） */
page {
  background: #ffffff;
}

</style>
