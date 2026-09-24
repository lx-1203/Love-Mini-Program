<script setup lang="ts">
/**
 * 发布动态页（village/post）
 *
 * 对齐「发布动态」理想图流式布局（替代原论坛式发帖表单）：
 *  顶部导航（X 关闭 + 发布动态 + 深绿胶囊发布按钮）
 *  发布到选择器（个人动态/校园圈/兴趣圈）→ 正文输入 → 图片九宫格
 *  附加功能（添加话题/位置/提及/谁可以看）→ 发帖小贴士 → 底部工具栏
 *
 * 保留既有发布提交链路与路由（ROUTES.VILLAGE.POST=/subpackages/village/village/post）：
 *  - real 模式本地图片经 clientApi.uploadPostImage 上传换取 URL 后再提交；
 *  - mock 模式沿用本地路径；
 *  - 圈内目标走 circleStore.createTopic，其余走 villageStore.createPost；
 *  - 草稿写入本地 storage(POST_DRAFT_STORAGE_KEY)，进入自动恢复、发布成功清除。
 */
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useVillageStore } from "../../../stores/village";
import { useCircleStore, type CircleItem } from "../../../stores/circle";
import { clientApi } from "../../../services/api";
import { useMock } from "../../../stores/helpers/use-mock";
import { IMAGE_PATHS } from "../../../config/images";
// MP-R2-POST-006：本地/已上传路径判定
// MP-R2-POST-012（两页一致）：选图改走 utils/media 统一封装——隐私授权 + 取消静默 +
// 单张 ≤10MB 大小校验；原裸 uni.chooseImage 缺大小校验且把用户主动取消误报为失败
import { isUploadedMediaUrl, chooseImages } from "../../../utils/media";
import { compressImages } from "../../../utils/compress-image";
import {
  POST_MAX_LENGTH,
  POST_MAX_IMAGES,
  POST_MAX_CUSTOM_TAGS,
  POST_DRAFT_STORAGE_KEY,
  POST_SUBMIT_NAVIGATE_BACK_MS,
  POST_TITLE_MIN_LENGTH,
  POST_TITLE_MAX_LENGTH,
} from "../../../constants/village";
import { POST_DRAFT_SAVE_DEBOUNCE_MS } from "../../../constants/chat";
// 调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../../utils/privacy";
// R20（2026-09-08）：post-header 此前无状态栏留白（padding: 24rpx 32rpx 起步），
// 全局自定义导航下系统时间与「发布动态」标题叠印（P0 显示 Bug）→ JS 注入 statusBarHeight
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";
// MP-R2-VILLAGE-POST-R01：--capsule-right 此前恒走 CSS 静态兜底 7px（H5 端无胶囊也恒预留
// 111px 死白、胶囊间隙非 7px 的机型不随实测）→ 与同目录村口页 index.vue:63 同口径动态注入
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";

const statusBarHeightPx = useStatusBarHeight();
const { styleVars: menuStyleVars } = useMenuButtonRect();

const villageStore = useVillageStore();
const circleStore = useCircleStore();
const { t } = useI18n();

/** 标题（2026-09-05 R17 小红书化：独立可编辑标题，20 字内） */
const TITLE_MAX_LENGTH = 20;
const title = ref("");
/** 正文内容 */
const content = ref("");
/** 已选图片（本地临时路径 / 远端 http URL） */
const images = ref<string[]>([]);
/** 话题标签（# 前缀） */
const topics = ref<string[]>([]);
/** 位置（可编辑：常用位置 chips + 自定义输入） */
const location = ref("");
/** 可见范围：public | school | interest（对齐后端 Post.Visibility 枚举，
 *  2026-09-03 审查报告 P3-7：原 legacy 值 circle_members/private 后端不识别） */
const visibility = ref("public");
/** 发帖小贴士是否展示 */
const tipVisible = ref(true);
/** 提交中标志（防重复提交） */
const submitting = ref(false);

/** 发布目标类型：general | circle | campus */
const targetType = ref<"general" | "circle" | "campus">("general");
const targetId = ref<number | null>(null);
const targetCircle = ref<CircleItem | null>(null);
const targetOpen = ref(false);

// MP-R1-POST-202：移植 publish.vue ensureCirclesLoaded——fetchCircles 无应用级
// 预加载，直入本页时 circleStore.circles 为空，「兴趣圈子」分组挂
// v-if="circles.length>0" 被静默隐藏且无加载/失败/空态；弹层打开时懒加载一次
const circlesLoading = ref(false);
const circlesLoadFailed = ref(false);
async function ensureCirclesLoaded(): Promise<void> {
  if (circleStore.circles.length > 0 || circlesLoading.value) return;
  circlesLoading.value = true;
  circlesLoadFailed.value = false;
  try {
    await circleStore.fetchCircles();
  } catch (_e) {
    /* store 内部已吞错，errorMessage 判定在下方 */
  } finally {
    circlesLoading.value = false;
    if (circleStore.errorMessage) circlesLoadFailed.value = true;
  }
}
function retryLoadCircles(): void {
  void ensureCirclesLoaded();
}
watch(targetOpen, (open) => {
  if (open && circleStore.circles.length === 0) {
    void ensureCirclesLoaded();
  }
});

/* ---------- 2026-09-05 R17：话题/位置/可见范围选择弹层（全部可编辑） ---------- */
const topicSheetOpen = ref(false);
const locationSheetOpen = ref(false);
const visibilitySheetOpen = ref(false);
/** 自定义话题输入 */
const customTopic = ref("");
/** 自定义位置输入 */
const customLocation = ref("");
/** 热门话题（小红书式：点选 + 自定义输入） */
const HOT_TOPICS = ["校园日常", "晚自习", "食堂美食", "社团活动", "运动打卡", "考研上岸", "宿舍日常", "恋爱心事", "周末去哪", "校园美景"];
/** 常用位置（学校场景快捷项，可被自定义输入覆盖） */
const COMMON_LOCATIONS = ["校园·图书馆", "校园·操场", "校园·食堂", "校园·教学楼", "宿舍", "校外·咖啡馆"];

/** 可见范围选项（按发布目标约束合法集合，来自 cycleVisibility 语义） */
const visibilityOptions = computed(() => {
  if (targetType.value === "general") {
    return [
      { value: "public", label: "所有人可见", desc: "公开广场 · 全平台用户可见" },
      { value: "school", label: "学校圈可见", desc: "仅同校认证成员可见" },
    ];
  }
  if (targetType.value === "campus") {
    return [{ value: "school", label: "学校圈可见", desc: "仅同校认证成员可见" }];
  }
  return [{ value: "interest", label: "圈子成员可见", desc: "仅该兴趣圈成员可见" }];
});

function addCustomTopic() {
  const raw = customTopic.value.trim().replace(/^#/, "");
  if (!raw) return;
  const tag = "#" + raw;
  if (topics.value.includes(tag)) {
    uni.showToast({ title: "该话题已添加", icon: "none" });
    return;
  }
  if (topics.value.length >= POST_MAX_CUSTOM_TAGS) {
    uni.showToast({ title: `最多 ${POST_MAX_CUSTOM_TAGS} 个话题`, icon: "none" });
    return;
  }
  topics.value.push(tag);
  customTopic.value = "";
  topicSheetOpen.value = false;
}

function pickLocation(text: string) {
  location.value = text;
  locationSheetOpen.value = false;
}

function addCustomLocation() {
  const raw = customLocation.value.trim();
  if (!raw) return;
  location.value = raw;
  customLocation.value = "";
  locationSheetOpen.value = false;
}

/** 提及好友：向正文末尾插入 @，可直接续打昵称（轻量可编辑方案） */
function insertMention() {
  content.value = content.value.replace(/\s*$/, "") + " @";
  uni.showToast({ title: "已在正文末尾插入 @，请输入昵称", icon: "none" });
}

/** 发布成功返回定时器，卸载时清理 */
let postSubmitNavTimer: ReturnType<typeof setTimeout> | null = null;
/** 草稿保存防抖定时器 */
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * MP-R2-POST-010：页面是否已卸载。提交是有副作用的写操作，网络往返窗口内用户点 X
 * 离页（requestLeave → leave → navigateBack）后，仍在途的 createPost/createTopic
 * resolve 时会继续跑「清表单 → toast → 800ms 后 leave()」，第二次 navigateBack 会把
 * 用户返回后所在的无关栈顶页（通常是村口 index）弹掉，栈=1 时更会 reLaunch 硬拉。
 * 现以本标志拦断导航/提示副作用（草稿清理仍照常执行，避免已发布内容下次进入复活成草稿）。
 */
let pageDestroyed = false;

const currentLength = computed(() => content.value.length);
const isOverLimit = computed(() => currentLength.value > POST_MAX_LENGTH);
// 2026-09-05 R17：标题或正文任一非空即可发布（小红书语义）
const canSubmit = computed(
  () => (title.value.trim().length > 0 || content.value.trim().length > 0) && !submitting.value
);
const isCircleTarget = computed(() => targetType.value === "circle");

/**
 * MP-R2-POST-009：可发布的目标圈子 = 当前用户「已加入」的圈子（上限 8 个）。
 * 原实现直接铺 circleStore.circles.slice(0, 8)——fetchCircles 拉的是 GET /circles
 * 全量列表（非「我的圈子」），未加入的圈照样列在弹层里且可点，real 模式提交被
 * RealCircleService.createTopic 的成员校验拒为 403 CIRCLE_JOIN_REQUIRED，
 * 已填的标题/正文/图片整组报废；同时前 8 截断会把排在第 9 位的已加入圈挤掉选不到。
 * 口径与 publish.vue joinedCircles 完全一致（同一 store getter，先过滤再截断）。
 */
const joinedCircles = computed(() => circleStore.joinedCircles.slice(0, 8));

/** R21 同 publish.vue formatMemberShort：成员数短格式（1.2w / 8,932） */
function formatMemberShort(count: number): string {
  const n = count ?? 0;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  return n.toLocaleString("en-US");
}

/** 发布到展示标题 */
const targetTitle = computed(() => {
  if (isCircleTarget.value && targetCircle.value) return targetCircle.value.name;
  // MP-R1-POST-101：圈子目标解析失败（如恢复草稿时圈子已退出）时显示「兴趣圈帖子」，
  // 不再伪装成「个人动态」——原 UI 显示与提交链路（createTopic 进圈）不一致，
  // 用户极可能把想发广场的内容误发进兴趣圈
  if (isCircleTarget.value) return "兴趣圈帖子";
  if (targetType.value === "campus") return t("circle.postTopicTargetCampus");
  return "个人动态";
});

/** 发布到展示副标题 */
const targetSubtitle = computed(() => {
  if (isCircleTarget.value && targetCircle.value) {
    // 两页一致：成员数短格式与 publish.vue:126 同款（1.2w / 8,932）
    return `${formatMemberShort(targetCircle.value.memberCount ?? 0)} 成员`;
  }
  if (targetType.value === "campus") return "校园圈 · 所有校园成员可见";
  return "默认公开 · 所有人可见";
});

/** 谁可以看文案 */
const visibilityText = computed(() => {
  if (visibility.value === "public") return t("village.post.visibilityPublic");
  if (visibility.value === "school") return "学校圈";
  if (visibility.value === "interest") return "兴趣圈";
  return t("village.post.visibilityPublic");
});

/* ---------- 进入：解析发布目标 + 恢复草稿 ---------- */
onLoad((query) => {
  const cid = query?.circleId ? Number(query.circleId) : null;
  const entryTarget = query?.target;
  if (entryTarget === "campus") targetType.value = "campus";
  if (cid && !Number.isNaN(cid)) {
    targetType.value = "circle";
    targetId.value = cid;
  }
  void loadTarget();
  // MP-R1-POST-101：入口参数优先于旧草稿（恢复后强制回设，见 restoreDraft 入参）
  void restoreDraft(entryTarget, cid);
});

onMounted(() => {
  // 监听表单变化，debounce 保存草稿到 storage
  // MP-R1-PUBLISH-002 同构修复：images/topics 原地变异（push/splice），非 deep /
  // 非摊平 getter 的 watch 感知不到 → 改 getter 摊平数组，增删均触发草稿保存
  watch(
    [title, content, () => [...images.value], () => [...topics.value], location, visibility, targetType, targetId],
    () => {
      if (!suppressDraftSave.value) scheduleDraftSave();
    }
  );
});

// 卸载时清理定时器，避免内存泄漏
onUnmounted(() => {
  // MP-R2-POST-010：置卸载标志——提交在途时离页，异步成功回调不得再做 UI 副作用
  pageDestroyed = true;
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
  }
  if (postSubmitNavTimer) {
    clearTimeout(postSubmitNavTimer);
    postSubmitNavTimer = null;
  }
});

// 页面卸载时清理 village store 定时器/请求资源
onUnload(() => {
  // MP-R2-POST-002：移除 villageStore.dispose()——dispose 会 abort 跨页共享的
  // fetchPostsController，而 navigateBack 时村口页 onShow 先于本页 onUnload 执行，
  // 其触发的 fetchPosts 刚建好 controller 就被 abort，发帖返回的频道刷新被静默取消。
  // 村口页自身 onUnload 已兜底同一清理（index.vue onUnload dispose）。
});

async function loadTarget() {
  if (!isCircleTarget.value) return;
  try {
    if (circleStore.circles.length === 0) await circleStore.fetchCircles();
    targetCircle.value = circleStore.circles.find((c) => c.id === String(targetId.value)) ?? null;
    // MP-R2-POST-009（与 publish.vue:177-188 同口径）：入口 circleId / 草稿恢复出的
    // 圈子目标可能「不存在」或「未加入」（例：深链分享、退圈后的旧草稿）——
    // 这种目标提交必被后端成员校验拒为 403，故在此当场回退「个人动态」并复位可见范围，
    // 不再把不可用的目标留给提交链路
    const selected = targetCircle.value;
    if (!selected || !selected.isJoined) {
      targetType.value = "general";
      targetId.value = null;
      targetCircle.value = null;
      visibility.value = "public";
    }
  } catch (_e) {
    targetType.value = "general";
    targetId.value = null;
    targetCircle.value = null;
    visibility.value = "public";
  }
}

function selectTarget(circle: CircleItem) {
  // MP-R2-POST-009：成员守卫——未加入的圈不可选为发布目标（real 模式后端 403
  // CIRCLE_JOIN_REQUIRED）。弹层列表已按 isJoined 过滤，此处为深链/列表脏数据兜底，
  // 与 publish.vue selectTarget 同款
  if (!circle.isJoined) return;
  targetType.value = "circle";
  targetId.value = Number(circle.id);
  targetCircle.value = circle;
  // 圈子目标 → 仅圈内成员可见（对齐后端 visibility interest）
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
  // 校园圈 → 仅同校认证成员可见（对齐后端 visibility school）
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
    // MP-R2-POST-012（与 publish.vue:238 同口径）：chooseImages 内部把
    // errMsg 含 cancel 的 fail 视为「空选择」而非错误 → 用户放弃选图不再被弹一次
    // 「选择图片失败」；并对每张图做单张 ≤10MB 大小校验（超限自动剔除，
    // 见 constants/village.ts 头注的 10MB 项目硬约束）——原裸 uni.chooseImage 零校验
    const picked = await chooseImages({ count: POST_MAX_IMAGES - images.value.length });
    const tempPaths = (picked as string[]) || [];
    // 批量压缩（质量 80）；单张失败回退原图，不阻塞后续
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
      uni.showToast({ title: t("village.post.selectImageFailed"), icon: "none" });
    }
  }
}

/** 删除已选图片 */
function removeImage(index: number) {
  images.value.splice(index, 1);
}

/* ---------- 话题 / 位置 / 可见范围 ---------- */
function toggleTopic(topic: string) {
  const tag = topic.startsWith("#") ? topic : "#" + topic;
  const idx = topics.value.indexOf(tag);
  if (idx >= 0) topics.value.splice(idx, 1);
  else if (topics.value.length < POST_MAX_CUSTOM_TAGS) topics.value.push(tag);
}

/* ---------- 草稿：本地 storage ---------- */
function snapshotDraft() {
  // MP-R2-POST-006：草稿只持久化已上传 URL（临时路径跨进程失效，恢复后整排裂图
  // 且 real 提交必败）；本地临时图仅存活于当前会话表单
  const stableImages = images.value.filter((img) => isUploadedMediaUrl(img));
  return {
    targetType: targetType.value,
    targetId: targetId.value,
    title: title.value,
    content: content.value,
    images: stableImages,
    topics: topics.value,
    location: location.value,
    visibility: visibility.value,
  };
}

function scheduleDraftSave() {
  if (suppressDraftSave.value) return;
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    if (suppressDraftSave.value) return;
    const snap = snapshotDraft();
    // MP-R2-POST-011 / MP-R2-PUB-113（两页一致）：空快照不落盘。
    // onLoad 的入口参数回设（targetType/visibility）必触发一次 watch，
    // 500ms 后写出的就是「全空但带目标」的幽灵草稿——现直接跳过写入，
    // restoreDraft 侧的 hasContent 守卫继续兜住历史遗留快照
    if (!hasDraftContent(snap)) return;
    try {
      uni.setStorageSync(POST_DRAFT_STORAGE_KEY, snap);
    } catch (_e) {
      // storage 写入失败不阻塞主流程
    }
  }, POST_DRAFT_SAVE_DEBOUNCE_MS);
}

/** 草稿是否有实质内容（正文/标题/图/话题任一非空）——空表单不落草稿 */
function hasDraftContent(snap: {
  title?: string;
  content?: string;
  images?: string[];
  topics?: string[];
  tags?: string[];
}): boolean {
  return Boolean(
    (typeof snap.title === "string" && snap.title.trim().length > 0) ||
      (typeof snap.content === "string" && snap.content.trim().length > 0) ||
      (Array.isArray(snap.images) && snap.images.length > 0) ||
      (Array.isArray(snap.topics) && snap.topics.length > 0) ||
      (Array.isArray(snap.tags) && snap.tags.length > 0)
  );
}

/**
 * MP-R1-POST-101：发布成功清空表单期间置位——解除草稿监听，防止「清空表单」触发的
 * watch 把含 targetType:'circle' 的空表单快照写回 storage（500ms 定时器先于 800ms
 * 返回延时触发），下次进入恢复出「发布到卡片显示个人动态、实际提交进圈」的自相矛盾状态。
 */
const suppressDraftSave = ref(false);

async function restoreDraft(entryTarget?: string, entryCircleId?: number | null) {
  let draft: {
    targetType?: string;
    targetId?: number | null;
    title?: string;
    content?: string;
    images?: string[];
    topics?: string[];
    tags?: string[];
    location?: string;
    visibility?: string;
  } | null = null;
  try {
    const local = uni.getStorageSync(POST_DRAFT_STORAGE_KEY);
    if (local && typeof local === "object") draft = local;
  } catch (_e) {
    // 读取失败忽略
  }
  if (!draft) return;
  // MP-R1-POST-101：空草稿守卫——发布成功清表单时误写的空快照（全字段为空但
  // targetType/visibility 有值）不得恢复，否则「发布到」卡片解析不出圈名显示成
  // 「个人动态」而提交却走 createTopic 进圈
  // MP-R2-PUB-113（两页一致）：publish.vue restoreDraft 已补同款守卫
  if (!hasDraftContent(draft)) return;
  if (draft.targetType === "circle" && draft.targetId) {
    targetType.value = "circle";
    targetId.value = Number(draft.targetId);
  } else if (draft.targetType === "campus") {
    targetType.value = "campus";
  }
  if (typeof draft.title === "string") title.value = draft.title;
  if (typeof draft.content === "string") content.value = draft.content;
  // MP-R2-POST-006：恢复时过滤失效临时路径（仅保留已上传 URL）
  if (Array.isArray(draft.images)) images.value = draft.images.filter((img) => isUploadedMediaUrl(img));
  if (Array.isArray(draft.topics)) topics.value = draft.topics;
  else if (Array.isArray(draft.tags)) topics.value = draft.tags;
  if (typeof draft.location === "string") location.value = draft.location;
  if (typeof draft.visibility === "string") visibility.value = draft.visibility;
  // MP-R1-POST-101：入口参数优先于草稿（原 onLoad 解析的 circleId 会被旧草稿
  // targetId 无提示覆盖）
  // MP-R2-POST-003：入口参数覆盖 targetType 时按 chooseCampus/selectTarget 的
  // 完整归位口径同步关联状态（清理 targetId/targetCircle、重置 visibility），
  // 否则出现「campus 目标 + interest 可见性」等矛盾 payload
  if (entryTarget === "campus") {
    targetType.value = "campus";
    targetId.value = null;
    targetCircle.value = null;
    visibility.value = "school";
  }
  if (entryCircleId != null && !Number.isNaN(entryCircleId)) {
    targetType.value = "circle";
    targetId.value = entryCircleId;
    visibility.value = "interest";
  }
  // MP-R1-POST-101：解析闸不依赖 images——只要目标是圈子就解析圈名（原
  // images.length>0 闸使无图圈子草稿恢复后 targetCircle 恒 null → 卡片误显「个人动态」）
  if (targetType.value === "circle" && targetId.value != null) void loadTarget();
}

/** MP-R1-PUBLISH-003 同构：先取消在途定时器再删存储，防止定时器把已删草稿写回 */
function clearDraft() {
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
  }
  try {
    uni.removeStorageSync(POST_DRAFT_STORAGE_KEY);
  } catch (_e) {
    // 忽略
  }
}

/* ---------- 退出：未发布提示保留草稿 ---------- */
const allowLeave = ref(false);
function requestLeave() {
  if (allowLeave.value) return;
  // MP-R2-POST-010（与 publish.vue 同口径）：提交在途不放行离页——请求不会因离页
  // 中止，此时弹窗「保留草稿/丢弃」会让用户在写操作结果未知的情况下清掉自己的内容
  if (submitting.value) {
    uni.showToast({ title: t("village.post.publishing"), icon: "none" });
    return;
  }
  const dirty = title.value.trim() || content.value.trim() || images.value.length || topics.value.length;
  if (!dirty) {
    leave();
    return;
  }
  uni.showModal({
    title: t("village.post.draftModalTitle"),
    content: t("village.post.draftModalContent"),
    confirmText: t("village.post.draftKeep"),
    cancelText: t("village.post.draftDiscard"),
    success: (res) => {
      if (res.confirm) {
        // MP-R1-PUBLISH-003 同构：保留草稿路径同步落盘（不等 500ms 防抖——防抖定时器
        // 会在 leave→onUnmounted 时被清，最终快照永不落盘）
        if (draftSaveTimer) {
          clearTimeout(draftSaveTimer);
          draftSaveTimer = null;
        }
        try {
          uni.setStorageSync(POST_DRAFT_STORAGE_KEY, snapshotDraft());
        } catch (_e) {
          // storage 失败不阻塞
        }
        leave();
      } else {
        clearDraft();
        leave();
      }
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
  // MP-R2-POST-004：防重守卫置于函数首行——canSubmit 含 !submitting 项，提交在途时
  // canSubmit 恒 false，二次点按会命中「请输入内容」分支产生误导提示
  if (submitting.value) return;
  if (!canSubmit.value) {
    uni.showToast({ title: t("village.contentRequired"), icon: "none" });
    return;
  }
  if (isOverLimit.value) {
    uni.showToast({ title: t("village.post.contentTooLong", { n: POST_MAX_LENGTH }), icon: "none" });
    return;
  }
  // 与后端 CreatePostRequest 的 title 契约（@Size(min = 5, max = 30)）对齐：
  // 2026-09-05 R17 小红书化——独立标题优先、未填标题时回退正文首行。
  // 原回退值截到 50 字，超后端 30 字上限必吃 400；且无最短 5 字闸（短标题必 400）。
  // publish.vue 同口径（那里正文即标题，故闸在正文上）。
  // 注意：本闸必须在 submitting 置位之前——置位后 return 会把按钮永久锁在提交中态
  const firstLine = content.value.trim().split("\n")[0] ?? "";
  const titleText = (title.value.trim() || firstLine).slice(0, POST_TITLE_MAX_LENGTH);
  const contentText = content.value.trim();
  if (titleText.length < POST_TITLE_MIN_LENGTH) {
    uni.showToast({ title: t("village.contentMinLength", { n: POST_TITLE_MIN_LENGTH }), icon: "none" });
    return;
  }
  submitting.value = true;
  // MP-R2-POST-010 / 两页一致：整程 loading + mask（提交在途点 X、二次点按都拿不到入口）。
  // 出口统一「先 hideLoading 再 toast」——小程序端 hideLoading 会把刚弹出的 toast 一并
  // 关掉（toast 闪失），原结构 showToast 在 try 内、finally 又 hideLoading 即此病灶
  // （publish.vue 侧同一病灶记为 MP-R1-PUBLISH-109）
  uni.showLoading({ title: t("village.post.publishing"), mask: true });
  let failureMsg = "";
  try {
    // real 模式先上传本地图片换取远端 URL；mock 沿用本地路径
    // MP-R1-POST-201：本地/已上传判定统一走 isUploadedMediaUrl（同文件草稿链路
    // 已用）——裸 /^https?:\/\// 会把 DevTools/iOS 模拟器临时路径
    // （http://tmp/xxx、http://usr/xxx）误判为「已上传」而跳过 /media/upload，
    // 导致后端落库 http://tmp/* 死链（同 publish.vue MP-R2-PUB-102 修复口径）
    let finalImages = images.value;
    const localImages = images.value.filter((img) => !isUploadedMediaUrl(img));
    if (localImages.length > 0 && !useMock()) {
      uni.showLoading({ title: t("village.post.uploadingImages"), mask: true });
      try {
        const urls: string[] = [];
        for (const img of localImages) {
          const r = await clientApi.uploadPostImage({ name: `post-image-${Date.now()}.jpg`, path: img });
          urls.push(r.url);
        }
        finalImages = [...images.value.filter((img) => isUploadedMediaUrl(img)), ...urls];
      } catch (_e) {
        // 图片上传失败：不进提交链路，表单内容与草稿原样保留（失败不留幽灵草稿）
        failureMsg = t("village.post.imageUploadFailed");
      }
    }

    if (!failureMsg) {
      if (isCircleTarget.value && targetId.value != null) {
        await circleStore.createTopic(String(targetId.value), {
          title: titleText,
          content: contentText || titleText,
          images: finalImages,
          tags: topics.value,
        });
      } else {
        await villageStore.createPost({
          // 第五轮 P0 修复：原值 "life" 不在后端支持列表
          // （all/interest/sincere/hometown/anonymous/latest/campus/activity），
          // 导致统一发帖页通用发布恒 400「请求参数错误」。
          // 与 publish.vue 对齐，通用动态默认归类 interest（DB 帖子主流分类）。
          categoryId: "interest",
          title: titleText,
          content: contentText || titleText,
          images: finalImages,
          tags: topics.value,
          // 2026-09-03：目标/可见范围透传后端——原实现 campus 目标也落到
          // 公开广场（targetType/visibility 丢失），学校圈语义失效
          visibility: visibility.value,
          targetType: targetType.value,
          targetId: targetId.value,
        });
      }
    }
  } catch (_e) {
    // MP-R1-POST-102：按失败分支取对应 store 的 errorMessage——circle 分支真实原因写入
    // circleStore.errorMessage（createTopic rethrow），villageStore 是跨页长驻状态，
    // 原实现要么展示无关陈旧文案、要么退化为泛化「发布失败」
    failureMsg =
      (isCircleTarget.value ? circleStore.errorMessage : villageStore.errorMessage) ||
      t("village.post.publishFailed");
  }
  uni.hideLoading();
  submitting.value = false;
  if (failureMsg) {
    uni.showToast({ title: failureMsg, icon: "none" });
    return;
  }

  // 发布成功后清除草稿，避免下次进入恢复已发布内容
  // MP-R2-POST-011：本页草稿只有本地键 POST_DRAFT_STORAGE_KEY——原此处还越权
  // void clientApi.deleteDraft() 删后端 /drafts/current，而该端点是「全用户单例、无来源
  // 维度」且只由 publish.vue 的双写管线写入：在本页发帖成功会静默销毁 publish 页尚未
  // 发布的后端草稿（同注释亦失实——本页 restoreDraft 从不读后端草稿）。现已移除，
  // 本页草稿统一由 clearDraft() 清本地键；双页草稿语义见 MP-R2-PUB-112（需后端按来源拆分）
  // MP-R1-POST-101：先置抑制标志 → clearDraft（已内置取消在途定时器）→ 再清表单，
  // 保证清表单触发的 watch 不再把空表单快照写回 storage（旧草稿复活链路的根因）
  suppressDraftSave.value = true;
  clearDraft();
  // MP-R2-POST-010：页面已卸载时到此为止——存储清理已完成（不留已发布内容的幽灵草稿），
  // 但绝不再执行清表单/toast/navigateBack（否则弹掉返回后的无关栈顶页）
  if (pageDestroyed) return;
  // 2026-09-05 R17：清空本地表单（返回 feed 后重新进入应为全新表单）。
  // 兼作重复提交闸：出口处 submitting 已复位、导航还有 800ms 延迟，若不清表单，
  // 窗口内的二次点按会重发同一 payload，而 services/http.ts 注入的稳定
  // Idempotency-Key + POST /posts 的 @Idempotent 会把它拦成 409——
  // 运行态看似「只发出一帖」，实为服务端兜底，且成功 toast 后还会跟一条失败 toast。
  // 清空后 canSubmit 恒 false，两页同口径（见 publish.vue 成功路径）
  title.value = "";
  content.value = "";
  images.value = [];
  topics.value = [];
  location.value = "";
  uni.showToast({ title: t("village.postSuccess"), icon: "success" });
  if (postSubmitNavTimer) clearTimeout(postSubmitNavTimer);
  postSubmitNavTimer = setTimeout(() => {
    // 2026-09-05 R17：navigateBack 仅在页面栈>1 时可用（深链/reLaunch 直进时栈=1 会静默失败），
    // 统一走 leave() 兜底（栈>1 back，否则 reLaunch 回村口）
    // MP-R2-POST-010：延时窗口内用户可能已自行离页——此时 leave() 的 navigateBack
    // 会弹掉无关栈顶页，故二次校验卸载标志
    if (pageDestroyed) {
      postSubmitNavTimer = null;
      return;
    }
    leave();
    postSubmitNavTimer = null;
  }, POST_SUBMIT_NAVIGATE_BACK_MS);
}
</script>

<template>
  <!-- MP-R2-VILLAGE-POST-R01：根节点注入 --capsule-right/--statusbar（与 index.vue:577 同口径），
       .post-header 的 padding-right 由此随实测胶囊间隙变化，H5 端归零回退设计原值 -->
  <view class="post-page" :style="menuStyleVars">
    <!-- 顶部导航（R20：padding-top 动态注入状态栏高度，标题不再与系统时间叠印） -->
    <view class="post-header" :style="{ paddingTop: statusBarHeightPx + 'px' }">
      <view
        class="post-header__close press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.closeAria')"
        @tap="requestLeave"
      >
        <image class="post-header__x" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
      </view>
      <text class="post-header__title">{{ t("village.post.headerTitle") }}</text>
      <view
        class="post-header__submit"
        :class="{ 'post-header__submit--disabled': !canSubmit }"
        role="button"
        :aria-label="t('common.publish')"
        @tap="submitPublish"
      >
        <text class="post-header__submit-text">{{ t("common.publish") }}</text>
      </view>
    </view>

    <scroll-view class="post-body" scroll-y :show-scrollbar="false">
      <!-- 发布到（圈子选择卡片） -->
      <view class="post-to">
        <text class="post-to__label">发布到</text>
        <view
          class="post-to__card press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="targetOpen = !targetOpen"
        >
          <view class="post-to__avatar">
            <image
              v-if="isCircleTarget && targetCircle"
              class="post-to__avatar-img"
              :src="IMAGE_PATHS.CIRCLE_COVERS.DEFAULT"
              mode="aspectFill"
              alt=""
            />
            <image
              v-else-if="isCircleTarget"
              class="post-to__avatar-emoji"
              :src="IMAGE_PATHS.ICONS_EMOJI.CAMERA_ICON"
              mode="aspectFit"
              alt=""
            />
            <image v-else class="post-to__avatar-emoji" :src="IMAGE_PATHS.ICONS_EMOJI.SCHOOL" mode="aspectFit" alt="" />
          </view>
          <view class="post-to__info">
            <view class="post-to__name-row">
              <text class="post-to__name">{{ targetTitle }}</text>
              <text v-if="isCircleTarget" class="post-to__tag">{{ t('village.post.visibilityCircleMembers') }}</text>
            </view>
            <text class="post-to__subtitle">{{ targetSubtitle }}</text>
          </view>
          <text class="post-to__arrow">›</text>
        </view>

        <!-- 目标选择弹层（R20：按 公域 → 校园私域 → 兴趣圈子 三级分组，消除平铺混排） -->
        <view v-if="targetOpen" class="post-target-sheet" @tap="targetOpen = false">
          <view class="post-target-sheet__panel" @tap.stop>
            <view class="post-target-sheet__head">
              <text class="post-target-sheet__title">选择发布到</text>
            </view>

            <text class="post-target-sheet__group">公域 · 所有人可见</text>
            <view
              class="post-target-sheet__option press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              @tap="chooseGeneral"
            >
              <text class="post-target-sheet__name">个人动态</text>
              <text class="post-target-sheet__desc">默认公开，所有人可见</text>
              <image
                v-if="targetType === 'general'"
                class="post-target-sheet__check"
                :src="IMAGE_PATHS.ICONS_EMOJI.CHECK"
                mode="aspectFit"
                alt=""
              />
            </view>

            <text class="post-target-sheet__group">校园私域 · 同校可见</text>
            <view
              class="post-target-sheet__option press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              @tap="chooseCampus"
            >
              <text class="post-target-sheet__name">校园圈</text>
              <text class="post-target-sheet__desc">仅认证同校同学可见</text>
              <image
                v-if="targetType === 'campus'"
                class="post-target-sheet__check"
                :src="IMAGE_PATHS.ICONS_EMOJI.CHECK"
                mode="aspectFit"
                alt=""
              />
            </view>

            <!-- MP-R1-POST-202：加载中/失败/空态（原 v-if 静默隐藏「兴趣圈子」分组） -->
            <template v-if="circlesLoading">
              <text class="post-target-sheet__desc post-target-sheet__hint">兴趣圈子加载中…</text>
            </template>
            <template v-else-if="circlesLoadFailed">
              <text class="post-target-sheet__desc post-target-sheet__hint">圈子列表加载失败，请稍后重试</text>
              <view class="post-target-sheet__option press-feedback" role="button" @tap="retryLoadCircles">
                <text class="post-target-sheet__name">重试加载</text>
              </view>
            </template>
            <template v-else-if="joinedCircles.length > 0">
              <text class="post-target-sheet__group">兴趣圈子 · 圈内成员可见</text>
              <!-- MP-R2-POST-009：列表源由 circleStore.circles.slice(0,8)（全量圈，含未加入）
                   改为 joinedCircles（先按 isJoined 过滤再截 8）——与 publish.vue:632-645 同口径。
                   未加入的圈不可选为发布目标（real 模式后端成员校验必 403 CIRCLE_JOIN_REQUIRED，
                   且已填写内容整组报废）；先过滤再截断亦消除「已加入圈排在 8 位之后选不到」。 -->
              <view
                v-for="circle in joinedCircles"
                :key="circle.id"
                class="post-target-sheet__option press-feedback"
                hover-class="press-feedback--active"
                hover-stay-time="120"
                role="button"
                @tap="selectTarget(circle)"
              >
                <text class="post-target-sheet__name">{{ circle.name }}</text>
                <text class="post-target-sheet__desc">已加入 · {{ formatMemberShort(circle.memberCount) }} 成员</text>
                <image
                  v-if="isCircleTarget && targetId === Number(circle.id)"
                  class="post-target-sheet__check"
                  :src="IMAGE_PATHS.ICONS_EMOJI.CHECK"
                  mode="aspectFit"
                  alt=""
                />
              </view>
            </template>
            <template v-else>
              <text class="post-target-sheet__desc post-target-sheet__hint">尚未加入兴趣圈子，可先在「附近 - 热门兴趣圈」加入</text>
            </template>
          </view>
        </view>
      </view>

      <!-- 标题输入（2026-09-05 R17 小红书化：独立标题，20 字内） -->
      <view class="post-title">
        <input
  cursor-spacing="20"
          v-model="title"
          class="post-title__input"
          :maxlength="TITLE_MAX_LENGTH"
          placeholder="填写标题会有更多赞哦～"
          placeholder-class="post-title__placeholder"
          :aria-label="'标题'"
        />
        <view class="post-title__count">
          <text>{{ title.length }}/{{ TITLE_MAX_LENGTH }}</text>
        </view>
      </view>

      <!-- 正文输入 -->
      <view class="post-content">
        <textarea
  cursor-spacing="20"
          v-model="content"
          class="post-content__input"
          :placeholder="t('village.post.contentPlaceholder')"
          :maxlength="POST_MAX_LENGTH"
          :show-confirm-bar="false"
          :aria-label="t('village.post.contentPlaceholder')"
        />
        <view class="post-content__count" :class="{ 'post-content__count--over': isOverLimit }">
          <text>{{ currentLength }}/{{ POST_MAX_LENGTH }}</text>
        </view>
      </view>

      <!-- 图片上传/预览区 -->
      <view class="post-images">
        <view v-for="(img, idx) in images" :key="idx" class="post-image">
          <image class="post-image__img" :src="img" mode="aspectFill" alt="" />
          <view
            class="post-image__remove press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="removeImage(idx)"
          >
            <image class="post-image__remove-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
          </view>
        </view>
        <view
          v-if="images.length < POST_MAX_IMAGES"
          class="post-image post-image--add press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="chooseImage"
        >
          <text class="post-image__plus">＋</text>
        </view>
      </view>

      <!-- 附加功能（话题/位置/提及/可见范围）——2026-09-05 R17 全部可编辑 -->
      <view class="post-rows">
        <!-- MP-R2-POST-001：圈子目标下隐藏话题入口——createTopic real 请求体仅
             title/content/images（后端 CreateTopicRequest 无 tags），所选话题静默丢弃；
             general/campus 路径（createPost 透传 tags）入口保留 -->
        <view
          v-if="!isCircleTarget"
          class="post-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="topicSheetOpen = true"
        >
          <text class="post-row__icon">#</text>
          <text class="post-row__label">添加话题</text>
          <text class="post-row__meta">已选 {{ topics.length }}/{{ POST_MAX_CUSTOM_TAGS }}</text>
          <text class="post-row__arrow">›</text>
        </view>
        <view
          class="post-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="customLocation = location; locationSheetOpen = true"
        >
          <image class="post-row__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
          <text class="post-row__label">添加位置</text>
          <text class="post-row__meta">{{ location || '选择或输入位置' }}</text>
          <text class="post-row__arrow">›</text>
        </view>
        <view
          class="post-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="insertMention"
        >
          <text class="post-row__icon">@</text>
          <text class="post-row__label">提及好友</text>
          <text class="post-row__meta">插入 @ 到正文</text>
          <text class="post-row__arrow">›</text>
        </view>
        <view
          class="post-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="visibilitySheetOpen = true"
        >
          <image class="post-row__icon" :src="IMAGE_PATHS.ICONS_EMOJI.EYE" mode="aspectFit" alt="" />
          <text class="post-row__label">谁可以看</text>
          <text class="post-row__meta">{{ visibilityText }}</text>
          <text class="post-row__arrow">›</text>
        </view>
      </view>

      <!-- 已选话题 chips -->
      <view v-if="topics.length > 0" class="post-topics">
        <view v-for="(tag, idx) in topics" :key="`${tag}-${idx}`" class="post-topic-chip">
          <text class="post-topic-chip__text">{{ tag }}</text>
          <text class="post-topic-chip__remove" @tap="topics.splice(idx, 1)">×</text>
        </view>
      </view>

      <!-- 发帖小贴士 -->
      <view v-if="tipVisible" class="post-tip">
        <view class="post-tip__text-wrap">
          <view class="post-tip__title">
            <image class="post-tip__title-icon" :src="IMAGE_PATHS.ICONS_EMOJI.SPROUT" mode="aspectFit" alt="" />
            <text>发帖小贴士</text>
          </view>
          <text class="post-tip__desc">真实分享校园生活，友善互动，让更多人认识有趣的你～</text>
        </view>
        <view
          class="post-tip__close press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="tipVisible = false"
        >
          <image class="post-tip__close-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
        </view>
      </view>

      <view class="post-body__bottom-space" />
    </scroll-view>

    <!-- 底部工具栏 -->
    <view class="post-toolbar">
      <view
        class="post-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        @tap="chooseImage"
      >
        <image class="post-tool__icon" :src="IMAGE_PATHS.ICONS_EMOJI.IMAGE" mode="aspectFit" alt="" />
        <text class="post-tool__label">图片</text>
      </view>
      <view
        v-if="!isCircleTarget"
        class="post-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        @tap="topicSheetOpen = true"
      >
        <text class="post-tool__icon">#</text>
        <text class="post-tool__label">话题</text>
      </view>
      <view
        class="post-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        @tap="customLocation = location; locationSheetOpen = true"
      >
        <image class="post-tool__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
        <text class="post-tool__label">位置</text>
      </view>
      <view
        class="post-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        @tap="insertMention"
      >
        <text class="post-tool__icon">@</text>
        <text class="post-tool__label">提及</text>
      </view>
      <view
        class="post-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        @tap="visibilitySheetOpen = true"
      >
        <image class="post-tool__icon" :src="IMAGE_PATHS.ICONS_EMOJI.EYE" mode="aspectFit" alt="" />
        <text class="post-tool__label">更多</text>
      </view>
    </view>

    <!-- ===== 话题选择弹层（2026-09-05 R17：热门点选 + 自定义输入） ===== -->
    <view v-if="topicSheetOpen" class="post-sheet" @tap="topicSheetOpen = false">
      <view class="post-sheet__panel" @tap.stop>
        <view class="post-sheet__head">
          <text class="post-sheet__title">添加话题</text>
          <text class="post-sheet__sub">已选 {{ topics.length }}/{{ POST_MAX_CUSTOM_TAGS }}</text>
        </view>
        <view class="post-sheet__chips">
          <view
            v-for="topic in HOT_TOPICS"
            :key="topic"
            class="post-sheet__chip press-feedback"
            :class="{ 'post-sheet__chip--on': topics.includes('#' + topic) }"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            @tap="toggleTopic(topic)"
          >
            <text class="post-sheet__chip-text"># {{ topic }}</text>
          </view>
        </view>
        <view class="post-sheet__input-row">
          <input
  cursor-spacing="20"
            v-model="customTopic"
            class="post-sheet__input"
            maxlength="16"
            placeholder="输入自定义话题（16 字内）"
            placeholder-class="post-sheet__placeholder"
            confirm-type="done"
            :aria-label="'自定义话题'"
          />
          <view
            class="post-sheet__confirm press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            @tap="addCustomTopic"
          >
            <text class="post-sheet__confirm-text">添加</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 位置选择弹层（常用位置点选 + 自定义输入） ===== -->
    <view v-if="locationSheetOpen" class="post-sheet" @tap="locationSheetOpen = false">
      <view class="post-sheet__panel" @tap.stop>
        <view class="post-sheet__head">
          <text class="post-sheet__title">添加位置</text>
          <text v-if="location" class="post-sheet__sub">当前：{{ location }}</text>
        </view>
        <view class="post-sheet__chips">
          <view
            v-for="spot in COMMON_LOCATIONS"
            :key="spot"
            class="post-sheet__chip press-feedback"
            :class="{ 'post-sheet__chip--on': location === spot }"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            @tap="pickLocation(spot)"
          >
            <text class="post-sheet__chip-text">{{ spot }}</text>
          </view>
        </view>
        <view class="post-sheet__input-row">
          <input
  cursor-spacing="20"
            v-model="customLocation"
            class="post-sheet__input"
            maxlength="30"
            placeholder="输入自定义位置（30 字内）"
            placeholder-class="post-sheet__placeholder"
            confirm-type="done"
            :aria-label="'自定义位置'"
          />
          <view
            class="post-sheet__confirm press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            @tap="addCustomLocation"
          >
            <text class="post-sheet__confirm-text">使用</text>
          </view>
        </view>
        <view v-if="location" class="post-sheet__clear-row">
          <text class="post-sheet__clear" @tap="location = ''">清除当前位置</text>
        </view>
      </view>
    </view>

    <!-- ===== 可见范围弹层（按发布目标约束的选项） ===== -->
    <view v-if="visibilitySheetOpen" class="post-sheet" @tap="visibilitySheetOpen = false">
      <view class="post-sheet__panel" @tap.stop>
        <view class="post-sheet__head">
          <text class="post-sheet__title">谁可以看</text>
        </view>
        <view
          v-for="opt in visibilityOptions"
          :key="opt.value"
          class="post-sheet__option press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="40"
          role="button"
          :aria-label="opt.label"
          @tap="visibility = opt.value; visibilitySheetOpen = false"
        >
          <view class="post-sheet__option-info">
            <text class="post-sheet__option-name">{{ opt.label }}</text>
            <text class="post-sheet__option-desc">{{ opt.desc }}</text>
          </view>
          <image
            v-if="visibility === opt.value"
            class="post-sheet__check"
            :src="IMAGE_PATHS.ICONS_EMOJI.CHECK"
            mode="aspectFit"
            alt=""
          />
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* 设计令牌：主色深绿 --c-brand / --c-brand-600，粉 --c-romance-500 */
.post-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--c-bg-page, #EEF7F2);
}

/* ========== 顶部导航 ========== */
.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  /* R21：右侧避让微信胶囊（--capsule-right≈7px 间隙 + 胶囊本体 87px），
     「发布」按钮此前与胶囊碰撞（•••发布◎ 挤在一起） */
  padding-right: calc(var(--capsule-right, 7px) + 104px);
  background: var(--c-bg-container, #FFFFFF);
  border-bottom: 1rpx solid var(--c-line, #EEF2F0);
  flex-shrink: 0;
}
.post-header__close {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.post-header__x {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-primary, #1A1E1C);
}
.post-header__title {
  font-size: var(--fs-3xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.post-header__submit {
  padding: 12rpx 40rpx;
  border-radius: var(--r-full, 999rpx);
  background: linear-gradient(135deg, var(--c-brand, #36C99A) 0%, var(--c-brand-600, #2AAE83) 100%);
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint-stronger, rgba(61, 201, 148, 0.4));
  transition: transform var(--d-fast, 120ms) ease;
}
.post-header__submit--disabled {
  background: var(--c-neutral-200, #D8E2DE);
  box-shadow: none;
}
.post-header__submit-text {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-neutral-0, #FFFFFF);
}
.post-header__submit--disabled .post-header__submit-text {
  color: var(--c-text-quaternary, #C2CAC6);
}

.post-body {
  flex: 1;
  min-height: 0;
}

/* ========== 发布到（圈子选择卡片） ========== */
.post-to {
  padding: 32rpx 32rpx 8rpx;
}
.post-to__label {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-secondary, #6B7571);
  margin-bottom: 16rpx;
}
.post-to__card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-xl, 24rpx);
  border: 1rpx solid var(--c-line, #EEF2F0);
  box-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs, rgba(15, 23, 42, 0.04));
}
.post-to__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--c-brand-50, #E8FAF3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.post-to__avatar-img {
  border-radius: var(--r-full);

  width: 100%;
  height: 100%;
}
.post-to__avatar-emoji {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-brand, #36C99A);
}
.post-to__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.post-to__name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.post-to__name {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.post-to__tag {
  padding: 2rpx 12rpx;
  border-radius: var(--r-md, 8rpx);
  background: var(--c-brand-bg-tint, rgba(61, 201, 148, 0.08));
  color: var(--c-brand, #36C99A);
  font-size: var(--fs-xs, 20rpx);
  flex-shrink: 0;
}
.post-to__subtitle {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #9AA39F);
}
.post-to__arrow {
  font-size: var(--fs-2xl, 36rpx);
  color: var(--c-text-quaternary, #C2CAC6);
  flex-shrink: 0;
}

/* 目标选择弹层 */
.post-target-sheet {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: var(--c-overlay-mid, rgba(0, 0, 0, 0.45));
  display: flex;
  align-items: flex-end;
}
.post-target-sheet__panel {
  width: 100%;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 32rpx 32rpx 0 0;
  /* R21：底部安全区——末行「宠物」此前贴屏幕底缘被裁切 */
  padding: 24rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  max-height: 78vh;
  overflow-y: auto;
  box-sizing: border-box;
}
.post-target-sheet__head {
  padding: 16rpx 0 24rpx;
}
.post-target-sheet__title {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
/* R20：渠道分组标题（公域 / 校园私域 / 兴趣圈子） */
.post-target-sheet__group {
  display: block;
  padding: 20rpx 8rpx 8rpx;
  font-size: var(--fs-xs, 22rpx);
  font-weight: 600;
  color: var(--c-brand, #36C99A);
}
.post-target-sheet__option {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 8rpx;
  border-bottom: 1rpx solid var(--c-neutral-50, #F2F5F3);
}
.post-target-sheet__name {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary, #1A1E1C);
}
.post-target-sheet__desc {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #9AA39F);
  flex: 1;
}
/* MP-R1-POST-202：弹层内加载中/失败/空态提示行（对齐 publish-target-sheet__hint） */
.post-target-sheet__hint {
  display: block;
  padding: 24rpx 8rpx;
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #9AA39F);
}
.post-target-sheet__check {
  width: 32rpx;
  height: 32rpx;
  color: var(--c-brand, #36C99A);
  flex-shrink: 0;
}

/* ========== 标题输入（2026-09-05 R17 小红书化） ========== */
.post-title {
  padding: 28rpx 32rpx 0;
}
.post-title__input {
  width: 100%;
  font-size: 36rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  min-height: 56rpx;
  box-sizing: border-box;
}
.post-title__placeholder {
  color: var(--c-text-quaternary, #C2CAC6);
  font-weight: 500;
}
.post-title__count {
  text-align: right;
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-text-tertiary, #9AA39F);
  margin-top: 4rpx;
}

/* ========== 正文输入 ========== */
.post-content {
  padding: 24rpx 32rpx;
}
.post-content__input {
  width: 100%;
  min-height: 220rpx;
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-primary, #1A1E1C);
  line-height: 1.6;
  box-sizing: border-box;
}
.post-content__count {
  text-align: right;
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-text-tertiary, #9AA39F);
  margin-top: 8rpx;
}
.post-content__count--over {
  color: var(--c-error, #E5454D);
}

/* ========== 图片上传/预览区 ========== */
.post-images {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 16rpx 32rpx;
}
.post-image {
  width: calc((100% - 3 * 16rpx) / 4);
  height: calc((100% - 3 * 16rpx) / 4);
  aspect-ratio: 1;
  border-radius: var(--r-lg, 16rpx);
  overflow: hidden;
  position: relative;
  background: var(--c-brand-50, #E8FAF3);
}
.post-image__img {
  width: 100%;
  height: 100%;
  display: block;
}
.post-image__remove {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--c-overlay-mid-strong, rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
}
.post-image__remove-icon {
  width: 22rpx;
  height: 22rpx;
  color: var(--c-neutral-0, #FFFFFF);
}
.post-image--add {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed var(--c-neutral-200, #D8E2DE);
  background: var(--c-bg-container, #FFFFFF);
}
.post-image__plus {
  font-size: var(--fs-5xl, 48rpx);
  color: var(--c-text-tertiary, #9AA39F);
  line-height: 1;
}

/* ========== 附加功能 ========== */
.post-rows {
  margin: 16rpx 32rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-xl, 24rpx);
  border: 1rpx solid var(--c-line, #EEF2F0);
  overflow: hidden;
}
.post-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 26rpx 24rpx;
  border-bottom: 1rpx solid var(--c-neutral-50, #F2F5F3);
}
.post-row:last-child {
  border-bottom: none;
}
.post-row__icon {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-brand, #36C99A);
  text-align: center;
  font-size: var(--fs-lg, 28rpx);
  flex-shrink: 0;
}
.post-row__label {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary, #1A1E1C);
}
.post-row__meta {
  flex: 1;
  text-align: right;
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #9AA39F);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.post-row__arrow {
  font-size: var(--fs-2xl, 32rpx);
  color: var(--c-text-quaternary, #C2CAC6);
  flex-shrink: 0;
}

/* ========== 已选话题 chips ========== */
.post-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 16rpx 32rpx 0;
}
.post-topic-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  border-radius: var(--r-full, 999rpx);
  background: var(--c-brand-50, #E8FAF3);
}
.post-topic-chip__text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-brand, #36C99A);
  font-weight: 500;
}
.post-topic-chip__remove {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-romance-500, #FF6B81);
  padding: 0 2rpx;
  font-weight: 600;
}

/* ========== 发帖小贴士 ========== */
.post-tip {
  margin: 24rpx 32rpx;
  padding: 24rpx;
  background: var(--c-brand-50, #EAF9F3);
  border-radius: var(--r-lg, 20rpx);
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.post-tip__text-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.post-tip__title {
  font-size: var(--fs-md, 26rpx);
  font-weight: 700;
  color: var(--c-brand, #36C99A);
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.post-tip__title-icon {
  width: 28rpx;
  height: 28rpx;
  color: var(--c-brand, #36C99A);
}
.post-tip__desc {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary, #6B7571);
}
.post-tip__close-icon {
  width: 28rpx;
  height: 28rpx;
  color: var(--c-text-tertiary, #9AA39F);
}

.post-body__bottom-space {
  /* 2026-09-05 R17：底部工具栏改 fixed 后预留其高度 + 安全区，避免滚动到底被遮挡 */
  height: calc(200rpx + env(safe-area-inset-bottom));
}

/* ========== 底部工具栏（2026-09-05 R17 改 fixed：滚动时始终吸底） ========== */
.post-toolbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 120;
  display: flex;
  justify-content: space-around;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom) + 12rpx);
  background: var(--c-bg-container, #FFFFFF);
  border-top: 1rpx solid var(--c-line, #EEF2F0);
  flex-shrink: 0;
}
.post-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.post-tool__icon {
  width: 40rpx;
  height: 40rpx;
  color: var(--c-text-secondary, #6B7571);
  font-size: var(--fs-xl, 30rpx);
  text-align: center;
  line-height: 40rpx;
}
.post-tool__label {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary, #9AA39F);
}

/* ========== 2026-09-05 R17：话题/位置/可见范围通用底部弹层（对齐 target-sheet 规范） ========== */
.post-sheet {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: var(--c-overlay-mid, rgba(0, 0, 0, 0.45));
  display: flex;
  align-items: flex-end;
}
.post-sheet__panel {
  width: 100%;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 32rpx 32rpx 0 0;
  padding: 24rpx 32rpx calc(env(safe-area-inset-bottom) + 48rpx);
  max-height: 70vh;
  overflow-y: auto;
  box-sizing: border-box;
}
.post-sheet__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 8rpx 0 20rpx;
}
.post-sheet__title {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.post-sheet__sub {
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-text-tertiary, #9AA39F);
}
.post-sheet__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding-bottom: 20rpx;
}
.post-sheet__chip {
  padding: 12rpx 26rpx;
  border-radius: var(--r-full, 999rpx);
  background: var(--c-brand-50, #E8FAF3);
  border: 1rpx solid transparent;
}
.post-sheet__chip--on {
  background: var(--c-brand, #36C99A);
  border-color: var(--c-brand, #36C99A);
}
.post-sheet__chip--on .post-sheet__chip-text {
  color: var(--c-neutral-0, #FFFFFF);
}
.post-sheet__chip-text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-brand, #36C99A);
  font-weight: 500;
}
.post-sheet__input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0 4rpx;
}
.post-sheet__input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: var(--r-lg, 16rpx);
  background: var(--c-neutral-50, #F2F5F3);
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-primary, #1A1E1C);
  box-sizing: border-box;
}
.post-sheet__placeholder {
  color: var(--c-text-quaternary, #C2CAC6);
}
.post-sheet__confirm {
  padding: 16rpx 36rpx;
  border-radius: var(--r-full, 999rpx);
  background: linear-gradient(135deg, var(--c-brand, #36C99A) 0%, var(--c-brand-600, #2AAE83) 100%);
  flex-shrink: 0;
}
.post-sheet__confirm-text {
  font-size: var(--fs-base, 24rpx);
  font-weight: 700;
  color: var(--c-neutral-0, #FFFFFF);
}
.post-sheet__clear-row {
  padding-top: 20rpx;
  text-align: center;
}
.post-sheet__clear {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-romance-500, #FF6B81);
}
.post-sheet__option {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 26rpx 8rpx;
  border-bottom: 1rpx solid var(--c-neutral-50, #F2F5F3);
}
.post-sheet__option:last-child {
  border-bottom: none;
}
.post-sheet__option-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.post-sheet__option-name {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-primary, #1A1E1C);
}
.post-sheet__option-desc {
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-text-tertiary, #9AA39F);
}
.post-sheet__check {
  width: 32rpx;
  height: 32rpx;
  color: var(--c-brand, #36C99A);
  flex-shrink: 0;
}


/* R16（2026-09-07）：页面背景统一纯白（对齐「他人显示主页」理想图色调） */
page {
  background: #ffffff;
}

</style>
