<script setup lang="ts">
/**
 * 统一发布动态页（village/publish）
 *
 * 对齐素材\附近\帖子 参考图「发布动态」：
 *  顶部导航（X + 发布动态 + 绿色发布按钮）
 *  发布到选择器（圈子/校园/通用）→ 内容输入 → 图片九宫格
 *  添加话题/位置/提及/谁可以看 → 发帖小贴士 → 底部工具栏
 *
 * 草稿：本地 storage(village:publish-draft，MP-R1-PUBLISH-004 起独立键) + 后端
 *      /drafts/current 双写；退出未发布提示"是否保留草稿"；进入自动恢复；发布成功后清除。
 */
import { ref, computed, watch, onUnmounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useCircleStore, type CircleItem } from "../../../stores/circle";
// R1-B33/D18：「发布到」非圈子目标的头像位改取本人真实头像（原为 44rpx SCHOOL 象形图标，
// 既非头像也非品牌图形）。单一数据源 = profile.avatarUrl：App.vue:217 在登录启动时已拉取一次，
// 只读取、不请求、不改 store（与 HomeHeader.vue:34 同一口径，缺失时回落本地默认头像素材）。
import { useProfileStore } from "../../../stores/profile";
// MP-R1-PUB-016：字数上限与 store 校验同一来源。该缺陷当年是「页面 1000 / store 500」向下对齐，
// 2026-10-26 按规范 §3.14 与理想效果图的 0/1000 反向收口——单一真源仍是本常量，数值为 1000
import { useVillageStore, MAX_CONTENT_LENGTH } from "../../../stores/village";
import { useMock } from "../../../stores/helpers/use-mock";
import { clientApi } from "../../../services/api";
// MP-R1-PUBLISH-004：publish 独立草稿存储键（原与 post.vue 共用 village:post-draft，
// 两页快照结构不同互写污染：post 的 title 被静默丢弃、publish 的空 title 反向覆盖）
// 标题长度闸与 post.vue 同源（后端 CreatePostRequest.title @Size(min=5,max=30)）
import {
  PUBLISH_DRAFT_STORAGE_KEY,
  POST_MAX_IMAGES,
  POST_MAX_CUSTOM_TAGS,
  POST_TITLE_MIN_LENGTH,
  POST_TITLE_MAX_LENGTH,
} from "../../../constants/village";
// MP-R1-PUBLISH-006：缓存城市键统一入 constants/storage-keys.ts
import { STORAGE_KEYS } from "../../../constants/storage-keys";
import { POST_DRAFT_SAVE_DEBOUNCE_MS } from "../../../constants/chat";
import { IMAGE_PATHS } from "../../../config/images";
import { ensurePrivacyAuthorized } from "../../../utils/privacy";
import { chooseImages, isUploadedMediaUrl, resolveMediaUrl } from "../../../utils/media";
import { compressImages } from "../../../utils/compress-image";
// R20（2026-09-08）：publish-header 原用 var(--statusbar, env(safe-area-inset-top))（模拟器/无刘海机型=0），
// 系统时间与「发布动态」标题叠印 → 改 JS 注入 statusBarHeight
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";
// MP-R2-VILLAGE-POST-R01（两页一致）：与 post.vue/index.vue 同口径动态注入 --capsule-right，
// 头部「发布」按钮的胶囊避让不再恒为静态值（H5 端归零回退设计原值）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";

const statusBarHeightPx = useStatusBarHeight();
const { styleVars: menuStyleVars } = useMenuButtonRect();

const { t } = useI18n();
const circleStore = useCircleStore();
const villageStore = useVillageStore();
const profileStore = useProfileStore();
/** R1-B33/D18：本人头像（profile.avatarUrl 单一数据源）→ 缺省回落本地默认头像 */
const selfAvatar = computed<string>(() => profileStore.avatarUrl || IMAGE_PATHS.DEFAULT_AVATAR);

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
const joinedCircles = computed(() => circleStore.joinedCircles.slice(0, 8));

/** MP-R1-PUB-017：圈子列表加载中（弹层「兴趣圈子」分组提示用） */
const circlesLoading = ref(false);

// MP-R1-PUB-017（2026-09-20）：直入发布页时 circleStore 尚未加载，joinedCircles 恒空，
// 「兴趣圈子」分组被静默隐藏。弹层打开时若为空则懒加载一次，加载中/空态在弹层内提示。
// MP-R2-PUB-103：fetchCircles 内部吞错不 rethrow，原 .catch(toast) 永不可达且失败被
// 渲染成「尚未加入兴趣圈子」空态——现读取 errorMessage 区分失败（弹层内可重试）。
const circlesLoadFailed = ref(false);
async function ensureCirclesLoaded(): Promise<void> {
  if (circleStore.circles.length > 0 || circlesLoading.value) return;
  circlesLoading.value = true;
  circlesLoadFailed.value = false;
  try {
    await circleStore.fetchCircles();
  } catch (_e) {
    /* store 内部已吞错， errorMessage 判定在下方 */
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
  // R2b-L03-D18（空态文案 P3）：原「默认公开 · 所有人可见」与下方「谁可以看 = 所有人可见」同屏重复，
  // 且状态标签位已改由标题行的「公开可见」胶囊承担。subtitle 换成不重复的落点信息。
  return "发布后进入广场";
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
  // MP-R2-PUB-114：入口回设同步 visibility（原只设 targetType，无草稿时 restoreDraft
  // 在 :496 早退，campus/circleId 深链同屏出现「校园圈·所有校园成员可见」与「谁可以看=所有人可见」）
  if (entryTarget === "campus") {
    targetType.value = "campus";
    visibility.value = "school";
  }
  // R16：日常模式入口（我的故事「添加日常」）
  if (entryTarget === "friends") {
    targetType.value = "friends";
    visibility.value = "friends";
  }
  if (cid && !Number.isNaN(cid)) {
    targetType.value = "circle";
    targetId.value = cid;
    visibility.value = "interest";
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
      // MP-R1-PUBLISH-101/MP-R1-PUB-018：目标回退 general 时同步复位可见范围——
      // 后端按 targetType 推导可见性（general→public 全平台公开），残留「兴趣圈/
      // 学校圈」文案会静默放大实际可见范围（UI 承诺窄、落库宽）
      visibility.value = "public";
    }
  } catch (_e) {
    targetType.value = "general";
    targetId.value = null;
    targetCircle.value = null;
    // MP-R1-PUBLISH-101/MP-R1-PUB-018：同上，回退分支同步复位可见范围
    visibility.value = "public";
  }
}

function selectTarget(circle: CircleItem) {
  // MP-R2-POST-009（两页一致）：成员守卫——未加入的圈不可选为发布目标
  // （real 模式后端 RealCircleService.createTopic 成员校验必 403 CIRCLE_JOIN_REQUIRED）。
  // 弹层列表已按 isJoined 过滤，此处为深链/列表脏数据兜底，与 post.vue selectTarget 同款
  if (!circle.isJoined) return;
  targetType.value = "circle";
  targetId.value = Number(circle.id);
  targetCircle.value = circle;
  // 圈子目标 → 仅圈内成员可见（批次 B4：对齐后端 visibility interest）
  visibility.value = "interest";
  targetOpen.value = false;
  // W2-PUBLISH-TOPIC：话题行在圈子目标下隐藏（createTopic 请求体无 tags，见模板注释），
  // 切过去时必须关弹层并显式告知——否则用户已选的话题会在提交时被静默丢弃
  topicSheetOpen.value = false;
  if (topics.value.length > 0) {
    uni.showToast({ title: "兴趣圈子发帖暂不支持话题，所选话题不会随本条发布", icon: "none" });
  }
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
/**
 * W2-PUBLISH-TOPIC（2026-09-24）：「添加话题」行原为
 * `@tap="toggleTopic('#校园日常')"`——无弹层、把写死的单个话题反复开关，
 * 行内 meta 却承诺「已选 N/5」多选上限，属假 affordance（看着能点开弹层，
 * 点了只切一个常量）。现按本项目既有先例 post.vue 话题弹层（post.vue:1067）
 * 同构做真：热门点选 + 自定义输入 + 再点取消，上限 POST_MAX_CUSTOM_TAGS(=5)。
 * 状态全部在本页内联（无新组件/store/service 依赖，故不触发「本轮不宜引入弹层」条件）。
 * HOT_TOPICS 与 post.vue:116 同表——两页本轮已决定不合并，提取到 constants/ 需改
 * 本泳道禁改文件，故按「两页一致」口径各自内联一份（后续合并泳道单一来源化）。
 */
const topicSheetOpen = ref(false);
/** 自定义话题输入 */
const customTopic = ref("");
/** 自定义话题长度上限（与 post.vue 弹层输入 maxlength 同值） */
const CUSTOM_TOPIC_MAX_LENGTH = 16;
/** 热门话题（小红书式：点选 + 自定义输入） */
const HOT_TOPICS = ["校园日常", "晚自习", "食堂美食", "社团活动", "运动打卡", "考研上岸", "宿舍日常", "恋爱心事", "周末去哪", "校园美景"];

function toggleTopic(topic: string) {
  const tag = topic.startsWith("#") ? topic : "#" + topic;
  const idx = topics.value.indexOf(tag);
  if (idx >= 0) {
    topics.value.splice(idx, 1);
    return;
  }
  // 上限拦截必须有可观测反馈：否则满 5 个后点未选中 chip「没反应」即死按钮
  if (topics.value.length >= POST_MAX_CUSTOM_TAGS) {
    uni.showToast({ title: t("village.post.maxTagsError", { n: POST_MAX_CUSTOM_TAGS }), icon: "none" });
    return;
  }
  topics.value.push(tag);
}

/** 自定义话题入列（弹层「添加」按钮 / 键盘完成） */
function addCustomTopic() {
  const raw = customTopic.value.trim().replace(/^#/, "");
  if (!raw) {
    uni.showToast({ title: t("formValidator.required"), icon: "none" });
    return;
  }
  const tag = "#" + raw;
  if (topics.value.includes(tag)) {
    uni.showToast({ title: t("village.post.tagExists"), icon: "none" });
    return;
  }
  if (topics.value.length >= POST_MAX_CUSTOM_TAGS) {
    uni.showToast({ title: t("village.post.maxTagsError", { n: POST_MAX_CUSTOM_TAGS }), icon: "none" });
    return;
  }
  topics.value.push(tag);
  customTopic.value = "";
  topicSheetOpen.value = false;
}

/** 移除单个已选话题（正文下方 chips 的 × 入口，与弹层内 chip 再点取消同源） */
function removeTopic(index: number) {
  topics.value.splice(index, 1);
}

function openMentionPicker() {
  uni.showToast({ title: t("village.post.mentionHint"), icon: "none" });
}
/* ---------- R10-L02-D14（P1）：位置选择接真实能力 ----------
 * 原状态：无城市缓存时「添加位置」行只剩一句「位置选择即将开放」，整行无 @tap、无选择器，
 * 底栏「位置」也只弹同一句 toast ⇒ 用户发帖带不了位置（R9-L02-D25 当时按「本页无选点能力」
 * 退成 tap-to-explain）。本轮把真实选点接上：微信原生地图选点 uni.chooseLocation。
 * 依据（全部仓内既有，不新增依赖）：
 *  - manifest.json:50 requiredPrivateInfos 已声明 ["getLocation","chooseLocation"]（R6/F7 落的地基），
 *    未声明时微信真机直接 fail ⇒ 本能力在小程序端是通的；
 *  - 活例 subpackages/profile-extra/profile/location.vue:122 pickFromMap（同 API、同条件编译范式）。
 * 小程序端以外的平台没有原生选点 ⇒ 保留既有陈述键 village.post.locationHint
 * （该键全仓仅此一处消费，摘掉引用会让 scripts/qa/verify-i18n-orphan.mjs 的孤儿棘轮 1257 上跳）。 */
let hasNativeLocationPicker = false;
// #ifdef MP-WEIXIN
hasNativeLocationPicker = true;
// #endif
/** 「添加位置」行与底栏「位置」项共用的展示串（保持单一来源，两处口径不分叉）：
 *  已选位置 > 缓存城市（既有 nearby:city 链路）> 平台能力提示。 */
const locationRowText = computed<string>(() => {
  const picked = location.value.trim();
  if (picked) return picked;
  if (currentCity) return currentCityLabel;
  return hasNativeLocationPicker ? "点击选择位置" : t("village.post.locationHint");
});
/** 选点结果写 location.value —— 与 snapshotDraft 的 location 字段 / restoreDraft 的
 *  draft.location 分支（既有链路，本车道未改）同源，选完即上屏、离页不丢。 */
function pickLocationFromMap(): void {
  // #ifdef MP-WEIXIN
  uni.chooseLocation({
    success: (res: UniApp.ChooseLocationSuccess) => {
      const text = String(res?.name || res?.address || "").trim();
      if (!text) {
        uni.showToast({ title: "未获取到选点结果，请重新选择", icon: "none" });
        return;
      }
      location.value = text;
      /* 帖子表没有位置列：apps/api/.../entity/Post.java 的 @Column 全表（title/content/images/
         tags/category/visibility/circle_id…）与 CreatePostRequest 记录均无 location/city 字段，
         前端不许编造 ⇒ 所选位置只进本页表单与草稿，不随本条对外发布。当场说清去向，
         并在行下渲染常驻说明 + 清除入口（见模板 .publish-location-note），不留「选了就会发出去」
         的空头承诺（同页「圈子发帖暂不支持话题，所选话题不会随本条发布」hint 的既有诚实范式）。 */
      uni.showToast({ title: "位置已选择（暂不随本条帖子对外展示）", icon: "none" });
    },
    fail: (_err: unknown) => {
      // 与 profile-extra/profile/location.vue 的 pickFromMap 同口径：主动返回与权限被拒都走 fail，
      // 一律给可见反馈，不静默（静默=死按钮）
      uni.showToast({ title: "未选择位置，请检查定位权限后重试", icon: "none" });
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: locationRowText.value, icon: "none" });
  // #endif
}
/** R9-L02-D25：底栏「谁可以看」项。可见范围由「发布到」目标推导（:863 只读行同源），
 *  点按回答当前值。理想图第 5 枚「更多」在本页无任何可执行项（无后端、无弹层），
 *  不摆一个点不动的死按钮，改挂本页唯一剩下的真实设置「谁可以看」并沿用其 EYE 图标。 */
function showVisibilityHint(): void {
  uni.showToast({ title: visibilityText.value, icon: "none" });
}
/**
 * 2026-09-03（审查报告 P3-7）：可见范围轮换与后端 visibility 枚举强联动。
 * MP-R1-VILLAGE-PUBLISH-103：「谁可以看」行已降级为只读信息行（轮换列表均为单值、
 * 点击永远不改值，保留可点假象违反交互铁律）；cycleVisibility 死代码随之移除，
 * 可见范围由「发布到」目标经 legalVisibility 推导（loadTarget/restoreDraft 同步复位）。
 */

/* ---------- 草稿：本地 + 后端双写 ---------- */
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;
let draftSyncTimer: ReturnType<typeof setTimeout> | null = null;

/** R5(INDEP-001)：正文 #话题 与已选话题合并——原逻辑只在 submit 作用域内，
 *  snapshotDraft 越界引用导致每次编辑草稿都抛 ReferenceError，草稿保存完全不生效 */
function buildMergedTopics(): string[] {
  // W2-PUBLISH-TOPIC：上限改引用 POST_MAX_CUSTOM_TAGS（原裸 5 与弹层/行内 meta 双源，
  // 常量若变会静默出现「行内显示 5、正文并入 3」的错位）
  const inlineTopics = Array.from(content.value.matchAll(/#([^\s#··]+)/g))
    .map((m) => `#${m[1]}`)
    .filter((tag) => !topics.value.includes(tag))
    .slice(0, POST_MAX_CUSTOM_TAGS - topics.value.length);
  return [...topics.value, ...inlineTopics];
}

function snapshotDraft() {
  // MP-R2-PUB-106：草稿只存可跨会话稳定引用——临时路径（wxfile://tmp、http://tmp）
  // 跨进程失效，恢复后九宫格整排破图且阻塞发布；仅持久化已上传 URL
  const stableImages = images.value.filter((img) => isUploadedMediaUrl(img));
  return {
    targetType: targetType.value,
    targetId: targetId.value,
    title: "",
    content: content.value,
    images: stableImages,
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
 * 草稿是否有实质内容（正文/标题/图/话题任一非空）。
 * MP-R2-PUB-113（与 post.vue hasDraftContent 同口径）：onLoad 的入口参数回设
 * （friends/campus/circleId 改 targetType/visibility）必触发一次草稿 watch，
 * 500ms 后写出的就是「全空但带目标」的幽灵快照——它会按 updatedAt「取新」规则
 * 压过本地/后端的真实草稿，并在下次进入时恢复出旧目标与矛盾的「谁可以看」。
 * 现空快照一律不落盘（双端），restoreDraft 侧再补同款恢复闸。
 */
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
 * MP-R1-PUBLISH-003：同步落盘当前快照（本地 + 后端双写，不等防抖）。
 * 「保留草稿」退出路径直接 flush——原 scheduleDraftSave() 挂上 500ms 定时器后立即
 * leave()→onUnmounted clearTimeout，最终快照永不落盘（最后 ≤500ms 编辑必丢）。
 */
function flushDraftSave() {
  cancelDraftTimers();
  const snap = snapshotDraft();
  // MP-R2-PUB-113：空快照不落盘（requestLeave 的 dirty 判定已挡掉大部分场景，
  // 此处与 scheduleDraftSave 同闸，杜绝「只选了目标没打字」这类空写入）
  if (!hasDraftContent(snap)) return;
  try {
    uni.setStorageSync(PUBLISH_DRAFT_STORAGE_KEY, snap);
  } catch (_e) { /* storage 失败不阻塞 */ }
  void clientApi.saveDraft(snap).catch(() => { /* 后端失败由本地兜底 */ });
}

function scheduleDraftSave() {
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(async () => {
    const snap = snapshotDraft();
    // MP-R2-PUB-113：空快照不落盘（详见 hasDraftContent）
    if (!hasDraftContent(snap)) return;
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
  // MP-R2-PUB-113（两页一致）：空快照恢复闸——post.vue:400-406（MP-R1-POST-101）已有同款，
  // 本页缺失。历史遗留的空草稿（全字段空、仅 targetType/visibility 有值）若被恢复，
  // 会凭空恢复出旧 friends/circle 目标与「谁可以看」文案，与空表单同屏矛盾
  if (!hasDraftContent(draft)) return;
  if (draft.targetType === "circle" && draft.targetId) {
    targetType.value = "circle";
    targetId.value = Number(draft.targetId);
  } else if (draft.targetType === "campus") {
    targetType.value = "campus";
  } else if (draft.targetType === "friends") {
    // MP-R2-PUB-101：补 friends 分支——原缺失使 friends 草稿经无参入口恢复后
    // targetType 回落 general 而 visibility 仍为 friends（目标卡与「谁可以看」矛盾，
    // 且后端按 targetType 推导可见范围 general→public_，静默放大可见性）
    targetType.value = "friends";
  }
  if (typeof draft.content === "string") content.value = draft.content;
  // MP-R2-PUB-106：恢复时过滤失效临时路径（仅保留已上传 URL）
  if (Array.isArray(draft.images)) images.value = draft.images.filter((img) => isUploadedMediaUrl(img));
  if (Array.isArray(draft.topics)) topics.value = draft.topics;
  else if (Array.isArray(draft.tags)) topics.value = draft.tags;
  if (typeof draft.location === "string") location.value = draft.location;
  // MP-R2-PUB-101：按 targetType 重算可见范围合法值，替代无条件恢复草稿 visibility
  // （UI 所见 = 服务端按 targetType 推导的落库口径，杜绝「个人动态+仅朋友可见」同屏矛盾）
  const legalVisibility: Record<string, string> = {
    general: "public",
    campus: "school",
    circle: "interest",
    friends: "friends",
  };
  visibility.value = legalVisibility[targetType.value] ?? "public";
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
    // MP-R1-PUB-018：entryCircleId 回设在 legalVisibility 重算之后，必须同步重算——
    // 否则残留草稿的「学校圈」visibility 与 circle 目标同屏矛盾（UI 承诺窄、落库宽）
    visibility.value = "interest";
  }
  // 草稿为圈子目标时同样校验是否仍为「已加入」圈子（否则回退到个人动态）
  if (isCircleTarget.value || images.value.length > 0) void loadTarget();
}

/** MP-R1-PUBLISH-003：先取消在途定时器再删存储（防止定时器把已删草稿写回） */
function clearDraft() {
  cancelDraftTimers();
  try { uni.removeStorageSync(PUBLISH_DRAFT_STORAGE_KEY); } catch (_e) { /* ignore */ }
  // MP-R1-PUBLISH-108 / R11 附录 B「禁空 catch」：本端点是后端草稿单例（全用户一条，
  // 无来源维度），删除失败只意味着下次进入会恢复出已发布内容——本地键此刻已清，
  // 故留痕不阻塞；本页 restoreDraft 按 updatedAt 取新，本地空/后端旧不会覆盖新编辑
  void clientApi.deleteDraft().catch((e: unknown) => {
    console.warn("后端草稿清理失败（本地键已清，下次进入按 updatedAt 取新）", e);
  });
}

// MP-R1-PUBLISH-002：images/topics 为 ref 数组且 chooseImage/removeImage/toggleTopic 全部
// 原地变异（push/splice 不换 .value 引用），非 deep watch 感知不到——改 getter 摊平数组，
// 每次增删都触发草稿保存（只加图不打字的用户图片不再丢出草稿）
watch([content, () => [...images.value], () => [...topics.value], location, visibility, targetType, targetId], () => scheduleDraftSave());

/* ---------- 退出：未发布提示保留草稿 ---------- */
const allowLeave = ref(false);
/**
 * MP-R2-POST-010（两页一致）：页面是否已卸载。提交在途时用户点 X 离页，
 * 异步成功回调若继续跑 navigateAway()，会把「返回后的无关栈顶页」再弹一次
 * （栈=1 时更会 reLaunch 硬拉用户回村口）。
 */
let pageDestroyed = false;
function requestLeave() {
  if (allowLeave.value) return;
  // MP-R2-POST-010（与 post.vue 同口径）：提交在途不放行离页——请求不会因离页中止，
  // 此时弹窗「保留草稿/丢弃」会让用户在写操作结果未知的情况下清掉自己的内容
  if (submitting.value) {
    uni.showToast({ title: t("village.post.publishing"), icon: "none" });
    return;
  }
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

/** MP-R2-PUB-108：导航兜底单一出口（leave/发布成功跳转共用） */
function navigateAway(): void {
  // 兜底：首页/深链场景 navigateBack 会失败
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.reLaunch({ url: "/subpackages/village/village/index" });
  }
}

function leave() {
  allowLeave.value = true;
  navigateAway();
}

/* ---------- 提交 ---------- */
async function submitPublish() {
  // MP-R2-POST-004（与 post.vue 同口径）：防重守卫置于函数首行，
  // 提交在途的二次点按静默返回，不再先跑一遍内容校验
  if (submitting.value) return;
  if (!content.value.trim()) {
    uni.showToast({ title: t("village.contentRequired"), icon: "none" });
    return;
  }
  // 后端 CreatePostRequest 的 title 闸 @Size(min = 5, max = 30)（400 否决）：
  // 正文即标题的发布形态下 = 正文至少 5 字 + 标题截断 30 字。
  // 长度改为引用 constants/village 的 POST_TITLE_*（与 post.vue 同源，不再各写魔数）
  if (content.value.trim().length < POST_TITLE_MIN_LENGTH) {
    uni.showToast({ title: t("village.contentMinLength", { n: POST_TITLE_MIN_LENGTH }), icon: "none" });
    return;
  }
  const titleFromContent = content.value.trim().slice(0, POST_TITLE_MAX_LENGTH);
  submitting.value = true;
  // 2026-09-06：正文中直接输入的 #话题 自动并入话题列表（与行入口等效）
  // R5(INDEP-001)：合并逻辑提取为 buildMergedTopics()（草稿快照共用），消除越界引用
  const mergedTopics = buildMergedTopics();
  uni.showLoading({ title: t("village.post.publishing"), mask: true });
  let failureMsg = "";
  try {
    // real 模式上传本地图片
    let finalImages = images.value;
    // MP-R2-PUB-102：本地/已上传判定统一走 isUploadedMediaUrl——裸 /^https?:/ 正则会把
    // DevTools/iOS 的 http://tmp/*、http://usr/* 临时路径误判为已上传，后端落库死链
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
          title: titleFromContent,
          content: content.value.trim(),
          images: finalImages,
          tags: mergedTopics,
        });
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
      }
    }
  } catch (e) {
    // 2026-08-31：优先展示后端具体原因（如「请先加入该圈子，再在圈内发帖」）
    failureMsg = e instanceof Error && e.message
      ? e.message
      : circleStore.errorMessage || villageStore.errorMessage || t("village.post.publishFailed");
  }
  // MP-R1-PUBLISH-109（两页一致）：出口唯一且「先 hideLoading 再 toast」——
  // 原结构 showToast 在 try 内、finally 再 hideLoading，小程序端 hideLoading 会把刚弹出
  // 的 toast 一并关掉（成功/失败提示闪失）；loading 也只在这一处关闭，不会永驻
  uni.hideLoading();
  submitting.value = false;
  if (failureMsg) {
    uni.showToast({ title: failureMsg, icon: "none" });
    return;
  }
  // MP-R8-DRAFT-001（2026-09-16）：清草稿。clearDraft() 已内置「取消在途定时器 + 删本地键 +
  // deleteDraft 删后端 /drafts/current」——MP-R1-PUBLISH-108：原此处另有一次直调
  // deleteDraft，同一次发布发两条重复 DELETE（/drafts 端点无 @Idempotent，是真重复请求），已删
  clearDraft();
  allowLeave.value = true;
  // MP-R2-POST-010：页面已离页时到此为止（清理必须完成，否则已发内容会作为草稿复活）
  if (pageDestroyed) return;
  // 两页一致（MP-R2-PUB-112 能力分叉的一项）：成功后清空表单——post.vue 成功即清、
  // 本页不清，于是「submitting 已复位 + 400ms 导航窗口内按钮仍可点 + 表单仍是已发内容」
  // 在本页成为重复提交通道。注意 P1-1（2026-10-25）后 services/http.ts 对写请求注入的是
  // 「一次逻辑调用一把唯一键」的 Idempotency-Key（旧「method+URL+body 哈希」稳定键会把
  // 合法的二次操作一并拦成 409，已废弃）：同 payload 的二次提交不再有后端兜底，
  // 会真的发出两帖——清表单因此从「双保险」升级为唯一防重通道。清空后 canSubmit 恒 false，
  // 二次点按不可能再产出同一 payload；空快照又被 hasDraftContent 闸挡住，草稿不会复活
  content.value = "";
  images.value = [];
  topics.value = [];
  location.value = "";
  uni.showToast({ title: t("village.postSuccess"), icon: "success" });
  // MP-R2-PUB-108：复用 navigateAway()（原与 leave() 逐行重复）。
  // 400ms 与 post.vue 的 POST_SUBMIT_NAVIGATE_BACK_MS(800) 口径差异留待产品统一
  setTimeout(() => {
    // MP-R2-POST-010：延时窗口内用户可能已自行离页——此时 navigateBack 会弹掉无关栈顶页
    if (pageDestroyed) return;
    navigateAway();
  }, 400);
}

onUnmounted(() => {
  // MP-R2-POST-010（两页一致）：置卸载标志，拦断在途提交回调的导航副作用
  pageDestroyed = true;
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  if (draftSyncTimer) clearTimeout(draftSyncTimer);
});
</script>

<template>
  <view class="publish-page" :style="menuStyleVars">
    <!-- 顶部导航（R20：padding-top 注入状态栏高度，标题不再与系统时间叠印） -->
    <view class="publish-header" :style="{ paddingTop: statusBarHeightPx + 10 + 'px' }">
      <view class="publish-header__close press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.closeAria')" @tap="requestLeave">
        <image class="publish-header__x" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.CLOSE)" mode="aspectFit" alt="" />
      </view>
      <text class="publish-header__title">发布动态</text>
      <!-- MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-005：页内唯一无按压反馈的 @tap view
           （同页其余 @tap 节点均已按 .publish-image__remove 范式补齐） -->
      <view class="publish-header__submit press-feedback" :class="{ 'publish-header__submit--disabled': !canSubmit }" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.publish')" @tap="submitPublish">
        <text class="publish-header__submit-text">发布</text>
      </view>
    </view>

    <scroll-view class="publish-body" scroll-y :show-scrollbar="false">
      <!-- 发布到 -->
      <view class="publish-to">
        <text class="publish-to__label">发布到</text>
        <view class="publish-to__card press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" @tap="targetOpen = !targetOpen">
          <view class="publish-to__avatar">
            <image v-if="isCircleTarget && targetCircle" class="publish-to__avatar-img" :src="resolveMediaUrl(IMAGE_PATHS.CIRCLE_COVERS.DEFAULT)" mode="aspectFill" alt="" />
            <image v-else-if="isCircleTarget" class="publish-to__avatar-emoji" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.CAMERA_ICON)" mode="aspectFit" alt="" />
            <!-- R2b-L03-D14（素材缺失 P1）：general 目标无头像时原 <image> 解析为空，只剩一颗空心淡绿圆。
                 补两级：有头像渲染 img，无头像渲染 USER 占位字形（与 :761 同 56rpx 档），底色改中性 --c-neutral-50。 -->
            <image v-else-if="selfAvatar" class="publish-to__avatar-img" :src="resolveMediaUrl(selfAvatar)" mode="aspectFill" alt="" />
            <image v-else class="publish-to__avatar-emoji" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.USER)" mode="aspectFit" alt="" />
          </view>
          <view class="publish-to__info">
            <view class="publish-to__name-row">
              <text class="publish-to__name">{{ targetTitle }}</text>
              <!-- R2b-L03-D18（空态文案 P3）：原状态胶囊整枚 v-if="isCircleTarget"，general 目标下
                   标题行右侧一整块空位。补一枚中性灰「公开可见」胶囊（复用 .publish-to__tag 结构 + --neutral 变体）。 -->
              <text v-if="isCircleTarget" class="publish-to__tag">圈内成员可见</text>
              <text v-else class="publish-to__tag publish-to__tag--neutral">公开可见</text>
            </view>
            <text class="publish-to__subtitle">{{ targetSubtitle }}</text>
          </view>
          <text class="publish-to__arrow">›</text>
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
          <image class="publish-image__img" :src="resolveMediaUrl(img)" mode="aspectFill" alt="" />
          <view class="publish-image__remove press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" @tap="removeImage(idx)">
            <image class="publish-image__remove-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.CLOSE)" mode="aspectFit" alt="" />
          </view>
        </view>
        <view v-if="images.length < POST_MAX_IMAGES" class="publish-image publish-image--add press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" @tap="chooseImage">
          <text class="publish-image__plus">＋</text>
        </view>
      </view>

      <!-- 行项 -->
      <view class="publish-rows">
        <!-- MP-R2-PUB-104：圈子目标下隐藏话题行——createTopic real 请求体仅 title/content/images，
             后端 CreateTopicRequest 无 tags 字段，所选话题在圈子路径全部静默丢弃（UI 承诺即丢数据）。
             general/campus/friends 路径的 createPost 正常携带 tags，入口保留 -->
        <!-- W2-PUBLISH-TOPIC：原 @tap="toggleTopic('#校园日常')"（写死单话题反复开关、无弹层）
             改为打开与 post.vue 同构的话题弹层，行内 meta 的「已选 N/5」自此名副其实 -->
        <view
          v-if="!isCircleTarget"
          class="publish-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          @tap="topicSheetOpen = true"
        >
          <text class="publish-row__icon">#</text>
          <text class="publish-row__label">添加话题</text>
          <text class="publish-row__meta">已选 {{ topics.length }}/{{ POST_MAX_CUSTOM_TAGS }}</text>
          <!-- R9-L02-D27（位置 P2）：R2b-L03-D19 为消「一个箭头 + 三行裸文本」的参差把四行 › 全删，
               削掉的却是本组唯一真可点的那一行——「添加话题」有 @tap + role="button"（:842 打开
               话题弹层），其余三行是只读信息（位置钉死当前城市 / 提及只弹说明 / 可见范围随目标推导）。
               删箭头等于把可点线索一起删掉：四行外观同构后用户分不清哪行能点。修正方向取反——
               交互行恢复 ›（与 .publish-to__card 的 › 同竖列），三行只读行保持无箭头；
               只读行标签不降到 --c-text-quaternary（#9AA39F 压白 2.59:1，28rpx 正文字不达 4.5:1），
               「可点 / 只读」的区分由箭头承担。
               R10-L02-D14 更新：本组「位置」行已接微信原生地图选点 ⇒ 转为交互行并按同一口径恢复 ›；
               仍是只读的只剩「提及」（只弹说明）与「谁可以看」（随目标推导）。 -->
          <text class="publish-row__arrow">›</text>
        </view>
        <!-- R10-L02-D14：本行恢复为交互行——2026-09-06「位置固定为当前城市、移除选择交互」的
             前提（本页无选点能力）已被 uni.chooseLocation 推翻，manifest :50 早已声明该隐私接口。
             行内 meta 三态：已选位置 / 缓存城市 / 可点 prompt（不再只剩「即将开放」一句）。
             › 给真可点的那一行，与 R9-L02-D27 对立行的箭头口径一致。 -->
        <view
          class="publish-row press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="'添加位置'"
          @tap="pickLocationFromMap"
        >
          <image class="publish-row__icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.LOCATION)" mode="aspectFit" alt="" />
          <text class="publish-row__label">添加位置</text>
          <!-- R3：原「北京市 · 当前位置」语义混拼，改为可读的定位说明 -->
          <!-- MP-R1-PUBLISH-006：无定位缓存时不再宣称「自动定位」（原恒显示缺省「北京市 · 自动定位」） -->
          <!-- R1-B33/D16 的「位置选择即将开放」陈述串在小程序端已不是唯一状态（见上方三态），
               仍保留给无原生选点的平台作为诚实说明。 -->
          <text class="publish-row__meta">{{ locationRowText }}</text>
          <text class="publish-row__arrow">›</text>
        </view>
        <!-- R10-L02-D14：后端 posts 表无位置列 ⇒ 所选位置只落草稿，当场明示 + 给真能生效的清除入口 -->
        <view v-if="location" class="publish-location-note">
          <text class="publish-location-note__text">位置仅保存在草稿，暂不随本条帖子对外展示</text>
          <text class="publish-location-note__clear" @tap="location = ''">清除位置</text>
        </view>
        <!-- MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-A01：本行能力与 post.vue:164-168
             insertMention（真往正文插 @）不一致，且本页 openMentionPicker 只弹「即将开放」。
             按台账 (b) 支取只读形态：剥掉 press-feedback / hover-class / role=button / › 四件
             交互线索（对齐 MP-R1-VILLAGE-PUBLISH-103 对「谁可以看」行的既有裁定——点了不改值
             却保留可点线索=可点假象）；@tap 保留，因为「即将开放」这一信息只有点下去才拿得到
             （tap-to-explain，同页 -A04 已认可的形态）。行内灰色「即将开放」常驻标记需新增
             village.post.comingSoon 双语键，已登记 .zcode/tmp/fixwave/i18n-requests/closer.json，
             键落地后再补标记，避免本轮出现渲染键路径字面量的中间态。 -->
        <view class="publish-row" @tap="openMentionPicker">
          <text class="publish-row__icon">@</text>
          <text class="publish-row__label">提及好友</text>
        </view>
        <!-- MP-R2-PUB-105：friends 目标锁定可见范围（原可轮换落入 interest 桶，UI 当场失真）
             MP-R1-VILLAGE-PUBLISH-103：cycleVisibility 四目标轮换列表均为单值（点击永远
             不改值），保留 press-feedback/chevron 构成「可点假象」——降级为只读信息行，
             可见范围随「发布到」目标推导（对齐「添加位置」行的只读形态） -->
        <view class="publish-row">
          <image class="publish-row__icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.EYE)" mode="aspectFit" alt="" />
          <text class="publish-row__label">谁可以看</text>
          <text class="publish-row__meta">{{ visibilityText }}</text>
        </view>
      </view>

      <!-- W2-PUBLISH-TOPIC：已选话题 chips（与 post.vue:981 同构）——关弹层后仍可见
           所选内容并可单个取消，弹层的选择结果不再只留一个计数 -->
      <view v-if="topics.length > 0" class="publish-topics">
        <!-- 圈子目标下话题行隐藏（后端 CreateTopicRequest 无 tags），但已选话题仍会随草稿恢复
             出现——不藏起来，改为当场明示「不会随本条发布」，否则又是「UI 承诺即丢数据」 -->
        <text v-if="isCircleTarget" class="publish-topics__hint">兴趣圈子发帖暂不支持话题，所选话题不会随本条发布</text>
        <view v-for="(tag, idx) in topics" :key="`${tag}-${idx}`" class="publish-topic-chip">
          <text class="publish-topic-chip__text">{{ tag }}</text>
          <!-- MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-005：原判据「给 × 移除钮补 hover-class」
               在本节点上是死属性——mp-weixin 的 hover-class 只对 view/button 生效，本节点原为 <text>。
               按台账更正后的判据先换型为 <view>，再套本页既有范式（见 :788 .publish-image__remove） -->
          <view
            class="publish-topic-chip__remove press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="'移除话题 ' + tag"
            @tap="removeTopic(idx)"
          >×</view>
        </view>
      </view>

      <!-- 发帖小贴士 -->
      <view v-if="tipVisible" class="publish-tip">
        <view class="publish-tip__text-wrap">
          <!-- R2b-L03-D15（间距 P2）：✕ 原为 .publish-tip__text-wrap 的同级 flex 兄弟，
               其 88rpx 命中区 + gap 从描述列吃掉约 52px，导致 24 字描述折成两行、卡片比理想图高一整行。
               把 ✕ 移进标题行内（title 行 space-between），描述列恢复整卡宽度、单行显示。 -->
          <view class="publish-tip__title">
            <view class="publish-tip__title-main">
              <image class="publish-tip__title-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.SPROUT)" mode="aspectFit" alt="" />
              <text>发帖小贴士</text>
            </view>
            <view class="publish-tip__close press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" @tap="tipVisible = false">
              <image class="publish-tip__close-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.CLOSE)" mode="aspectFit" alt="" />
            </view>
          </view>
          <text class="publish-tip__desc">真实分享校园生活，友善互动，让更多人认识有趣的你～</text>
        </view>
      </view>

      <view class="publish-body__bottom-space" />
    </scroll-view>

    <!-- R9-L02-D25（素材缺失 P1）：底部工具栏按既有 .publish-toolbar/.publish-tool* 样式（见样式段）
         补 DOM——此前只有 CSS 没有节点（模板末尾还留着「已按需求移除」的旧注释），理想图那一整条
         一键入口在页面上不存在，用户拿不到图片/话题/位置/提及入口。
         五项全部复用页内既有 handler，不新增后端字段、不引仓外素材：
           图片→chooseImage（与九宫格 ＋ 同源）；话题→话题弹层（圈子目标下 createTopic 请求体无
           tags，与 :837 行同 v-if）；提及→openMentionPicker。
         位置在 R10-L02-D14 起接微信原生地图选点（与「添加位置」行同一个 pickLocationFromMap，
         不再是只弹说明的假入口）；可见范围仍是只读（随「发布到」目标推导 :884），
         点按按同页 :868-875 已认可的 tap-to-explain 形态报出真实状态——不造空壳选点弹层，
         也不摆一个点不动的死按钮。理想图第 5 枚「更多」在本页没有任何可执行项，第 5 枚因此
         取本页唯一剩下的真实设置「谁可以看」，沿用其 EYE 图标与同一竖列。 -->
    <view class="publish-toolbar">
      <view
        class="publish-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="'添加图片'"
        @tap="chooseImage"
      >
        <image class="publish-tool__icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.IMAGE)" mode="aspectFit" alt="" />
        <text class="publish-tool__label">图片</text>
      </view>
      <view
        v-if="!isCircleTarget"
        class="publish-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="'添加话题'"
        @tap="topicSheetOpen = true"
      >
        <text class="publish-tool__icon publish-tool__icon--glyph">#</text>
        <text class="publish-tool__label">话题</text>
      </view>
      <view
        class="publish-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="'添加位置'"
        @tap="pickLocationFromMap"
      >
        <image class="publish-tool__icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.LOCATION)" mode="aspectFit" alt="" />
        <text class="publish-tool__label">位置</text>
      </view>
      <view
        class="publish-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="'提及好友'"
        @tap="openMentionPicker"
      >
        <text class="publish-tool__icon publish-tool__icon--glyph">@</text>
        <text class="publish-tool__label">提及</text>
      </view>
      <view
        class="publish-tool press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="'谁可以看'"
        @tap="showVisibilityHint"
      >
        <image class="publish-tool__icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.EYE)" mode="aspectFit" alt="" />
        <text class="publish-tool__label">谁可以看</text>
      </view>
    </view>

    <!-- MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-A05：目标选择弹层自 scroll-view 内迁出到页面根，
         与下方话题弹层同层（position:fixed 面板嵌在 scroll-view 内会随内容滚动/被裁切），
         消除同页两套层级策略。DOM 顺序仍在话题弹层之前，等 z-index 下的叠放关系不变 -->
    <view v-if="targetOpen" class="publish-target-sheet" @tap="targetOpen = false">
      <view class="publish-target-sheet__panel" @tap.stop>
        <view class="publish-target-sheet__head">
          <text class="publish-target-sheet__title">选择发布到</text>
        </view>
        <text class="publish-target-sheet__group">公域 · 所有人可见</text>
        <view class="publish-target-sheet__option press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" @tap="chooseGeneral">
          <text class="publish-target-sheet__name">个人动态</text>
          <text class="publish-target-sheet__desc">默认公开，所有人可见</text>
          <image v-if="targetType === 'general'" class="publish-target-sheet__check" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.CHECK)" mode="aspectFit" alt="" />
        </view>
        <text class="publish-target-sheet__group">校园私域 · 同校可见</text>
        <view class="publish-target-sheet__option press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" @tap="chooseCampus">
          <text class="publish-target-sheet__name">校园圈</text>
          <text class="publish-target-sheet__desc">仅认证同校同学可见</text>
          <image v-if="targetType === 'campus'" class="publish-target-sheet__check" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.CHECK)" mode="aspectFit" alt="" />
        </view>
        <template v-if="circlesLoading">
          <text class="publish-target-sheet__hint">兴趣圈子加载中…</text>
        </template>
        <!-- MP-R2-PUB-103：失败态区别于空态（原失败渲染「尚未加入兴趣圈子」误导已加入用户），可重试 -->
        <template v-else-if="circlesLoadFailed">
          <text class="publish-target-sheet__hint">圈子列表加载失败，请稍后重试</text>
          <view class="publish-target-sheet__option press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" @tap="retryLoadCircles">
            <text class="publish-target-sheet__name">重试加载</text>
          </view>
        </template>
        <template v-else-if="joinedCircles.length > 0">
          <text class="publish-target-sheet__group">兴趣圈子 · 圈内成员可见</text>
          <!-- MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-006：两个发布入口的圈子候选行统一为
               「圈名 + 一条描述（已加入 · N 成员）」两段结构，与 post.vue:849-850 同构。
               裁决取多数侧：本域 6 个目标行里 5 个（本页 :900/:906 与 post.vue :795/:814/:850）
               均为 name+desc 两段，三段（圈名 + 绿色已加入胶囊 + 成员数）全仓仅此 1 处，故删少数侧。
               被删胶囊同时是语义/样式越界点：独立 text 在 role="button" 行内被读作孤立片段，
               且其墨绿字色、浅绿底色与 6rpx 圆角全表无等值 token（见本文件 PUBLISH-004 备注）。 -->
          <view
            v-for="circle in joinedCircles"
            :key="circle.id"
            class="publish-target-sheet__option press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            @tap="selectTarget(circle)"
          >
            <text class="publish-target-sheet__name">{{ circle.name }}</text>
            <text class="publish-target-sheet__desc">已加入 · {{ formatMemberShort(circle.memberCount) }} 成员</text>
            <image v-if="isCircleTarget && targetId === Number(circle.id)" class="publish-target-sheet__check" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.CHECK)" mode="aspectFit" alt="" />
          </view>
        </template>
        <template v-else>
          <text class="publish-target-sheet__hint">尚未加入兴趣圈子，可先在「附近 - 热门兴趣圈」加入</text>
        </template>
      </view>
    </view>

    <!-- ===== W2-PUBLISH-TOPIC：话题选择弹层（与 post.vue:1067 同构：热门点选 + 自定义输入）
           放在 scroll-view 之外、页面根层级——position:fixed 面板嵌在 scroll-view 内会随内容
           滚动/被裁切（本页「发布到」弹层的历史槽位问题，新弹层不再复制） ===== -->
    <view v-if="topicSheetOpen" class="publish-sheet" @tap="topicSheetOpen = false">
      <view class="publish-sheet__panel" @tap.stop>
        <view class="publish-sheet__head">
          <text class="publish-sheet__title">添加话题</text>
          <text class="publish-sheet__sub">已选 {{ topics.length }}/{{ POST_MAX_CUSTOM_TAGS }}</text>
        </view>
        <view class="publish-sheet__chips">
          <view
            v-for="topic in HOT_TOPICS"
            :key="topic"
            class="publish-sheet__chip press-feedback"
            :class="{ 'publish-sheet__chip--on': topics.includes('#' + topic) }"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="'选择话题 ' + topic"
            @tap="toggleTopic(topic)"
          >
            <text class="publish-sheet__chip-text"># {{ topic }}</text>
          </view>
        </view>
        <view class="publish-sheet__input-row">
          <input
            v-model="customTopic"
            class="publish-sheet__input"
            cursor-spacing="20"
            :maxlength="CUSTOM_TOPIC_MAX_LENGTH"
            :placeholder="'输入自定义话题（' + CUSTOM_TOPIC_MAX_LENGTH + ' 字内）'"
            placeholder-class="publish-sheet__placeholder"
            confirm-type="done"
            :aria-label="'自定义话题'"
            @confirm="addCustomTopic"
          />
          <view
            class="publish-sheet__confirm press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('village.post.addTag')"
            @tap="addCustomTopic"
          >
            <text class="publish-sheet__confirm-text">{{ t("village.post.addTag") }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- R9-L02-D25：2026-09-06 的「底部工具栏已按需求移除（与上方行项重复，且无实际作用）」注释
         随本轮补 DOM 一并作废——理想图有这一条，且它与上方行项并不等价（行项是只读状态行，
         底栏是滚动时始终可达的一键入口）。工具栏节点见 </scroll-view> 之后。 -->
  </view>
</template>

<style scoped lang="scss">
.publish-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  /* R1-B33/D24：字面量令牌化。此处不采纳卡片建议的 --c-bg-page（$bg-page = #EEF7F2 带绿底），
     那会推翻 R16「页面背景统一纯白」的既有裁定；等值档取 --c-bg-container（#FFFFFF），视觉零变化 */
  background: var(--c-bg-container, #FFFFFF);
}

.publish-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  /* R20：状态栏高度改由 JS 注入（:style paddingTop），env() 在模拟器为 0 会与系统时间叠印；
     右侧仍预留微信胶囊宽度，避免「发布」被胶囊遮挡。
     MP-R2-VILLAGE-POST-R01（两页一致）：原静态 210rpx 不参与胶囊实测——改为与 post.vue:1101、
     index.vue:909 同款 calc(var(--capsule-right) + 104px)：MP 端随实测间隙、H5 端归零回退。
     （R4 记录的 200→210rpx 静态值仅适配标准 7px 间隙机型） */
  padding: 16rpx 32rpx;
  padding-right: calc(var(--capsule-right, 7px) + 104px);
  background: #fff;
  /* R1-B33/D24：#EEF2F0 与 --c-border-light（$border-light: #EEF2F0）逐位等值，令牌化零视觉变化 */
  border-bottom: 1rpx solid var(--c-border-light, #EEF2F0);
  flex-shrink: 0;
}
/* R10-L02-D16（P2 可达性）：关闭钮是不发布离开页面的显式出口，原热区 64rpx=32px 低于 88rpx 下限。
   只放大容器（88rpx=44px，与本文件 .publish-tip__close 同规格），36rpx 字形不动 ⇒ 视觉大小不变、
   可点面积 +96%。flex-shrink 已有，页头因此整体长高 24rpx（标题/发布按钮仍垂直居中）。 */
.publish-header__close { width: 88rpx; height: 88rpx; display:flex; align-items:center; justify-content:center; flex-shrink: 0; }
.publish-header__x { width: 36rpx; height: 36rpx; color: var(--c-text-primary, #1A1E1C); }
.publish-header__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  /* R4：三栏弹性布局——标题在 [X] 与 [发布] 之间的剩余空间内居中（绝对居中会与发布按钮贴挤） */
  /* R1-B33/D14 复核 R4 成立，故不改绝对居中：胶囊避让使 padding-right=calc(--capsule-right+104px)
     ≈111px，375px 屏下内容盒右界 264px、「发布」占 200–264px；标题若按建议 left:50% 绝对居中，
     四字 64px 宽将落在 155–219px，与按钮重叠 19px（避让区是微信原生胶囊硬约束，不能挪按钮）。
     视觉中心 124px=33% 系此约束的必然结果，与理想图（无胶囊稿）的 50% 不可同时满足——需裁定：
     要么接受标题偏左，要么把「发布」移入胶囊下（会被原生胶囊遮挡）。 */
  flex: 1;
  text-align: center;
}
/* R10-L02-D13（P1 颜色token）：本页唯一主操作。原底 --c-brand #36C99A 压白字 28rpx/14px 实测
   2.10:1（design-variables.scss 真值算得，非 .vue 字面量），白字读不出。改深档 --c-brand-800
   #156B51（$brand-800 见 theme/design-variables.scss:18）⇒ 白字 6.45:1，与 R9 收口的
   BottomActionBar.vue:104 全站深档白字口径一致。禁用态规则在下方同特异度后置，仍覆盖本行。 */
.publish-header__submit { padding: 12rpx 36rpx; border-radius: var(--r-full, 999rpx); background: var(--c-brand-800, #156B51); flex-shrink: 0; }
/* R3：禁用态白字对浅绿底对比度仅 1.36:1（judged 证据），文字改深绿保证可辨认 */
.publish-header__submit--disabled { background: #C7E9DC; }
.publish-header__submit--disabled .publish-header__submit-text { color: #2A7A5E; }
.publish-header__submit-text { font-size: 28rpx; font-weight: 700; color: #fff; }

.publish-body { flex: 1; min-height: 0; }

.publish-to { padding: 32rpx 32rpx 8rpx; }
.publish-to__label { font-size: 26rpx; color: var(--c-text-secondary, #6B7571); margin-bottom: 16rpx; }
.publish-to__card { display: flex; align-items: center; gap: 20rpx; padding: 24rpx; background: #fff; border-radius: var(--r-xl, 24rpx); border: 1rpx solid var(--c-border-light, #EEF2F0); } /* R1-B33/D24 */
/* R1-B33/D19：头像位 88rpx → 112rpx 档。理想图头像约占卡高 70%：本卡高 = 24×2 padding + 112 = 160rpx，
   头像/卡高 = 70%，与右侧两行文字（30 + 8 gap + 24 = 62rpx）等高有余量 */
.publish-to__avatar { width: 112rpx; height: 112rpx; border-radius: 50%; background: var(--c-neutral-50, #F7FAF9); display:flex; align-items:center; justify-content:center; overflow:hidden; } /* R2b-L03-D14：占位底由硬编码 #E8FBF2 改中性 --c-neutral-50（无头像时是中性占位，非品牌绿） */
.publish-to__avatar-img {
  border-radius: var(--r-full);
 width: 100%; height: 100%; }
/* R1-B33/D19：容器放大后同步放大占位象形图标（44→56rpx，保持原 1/2 圆径比例；
   D18 已让本人头像走 __avatar-img 满幅分支，此处仅服务「已选圈子但无封面」分支） */
.publish-to__avatar-emoji { width: 56rpx; height: 56rpx; }
.publish-to__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.publish-to__name-row { display: flex; align-items: center; gap: 10rpx; }
.publish-to__name { font-size: 30rpx; font-weight: 700; color: var(--c-text-primary, #1A1E1C); }
.publish-to__tag { padding: 2rpx 12rpx; border-radius: var(--r-sm, 8rpx); background: var(--c-brand-50, #E8FAF3); color: var(--c-brand, #36C99A); font-size: 20rpx; } /* R2b-L03-D17：#E8FBF2 就近并入 --c-brand-50，与同页其余浅绿统一为单一来源 */
/* R2b-L03-D18：general 目标「公开可见」中性灰变体（复用同结构，颜色走 --c-neutral-* 档） */
.publish-to__tag--neutral { background: var(--c-neutral-100, #EEF2F0); color: var(--c-text-secondary, #6B7571); }
.publish-to__subtitle { font-size: 24rpx; color: var(--c-text-tertiary, #9AA39F); }
.publish-to__arrow { font-size: 36rpx; color: var(--c-text-quaternary, #C2CAC6); }

.publish-target-sheet { position: fixed; inset: 0; z-index: 1100; background: rgba(0,0,0,0.45); display:flex; align-items:flex-end; }
/* R21：弹层加高到 78vh（兴趣圈子分组此前在 70vh 下不可见）+ 底部安全区，末行不再贴屏裁切 */
.publish-target-sheet__panel { width: 100%; background: #fff; border-radius: var(--r-xxl, 32rpx) var(--r-xxl, 32rpx) 0 0; padding: 24rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); max-height: 78vh; overflow-y: auto; box-sizing: border-box; }
.publish-target-sheet__head { padding: 16rpx 0 24rpx; }
.publish-target-sheet__title { font-size: 30rpx; font-weight: 700; color: var(--c-text-primary, #1A1E1C); }
/* R20：渠道分组标题（公域 / 校园私域 / 兴趣圈子） */
.publish-target-sheet__group { display: block; padding: 20rpx 8rpx 8rpx; font-size: 22rpx; font-weight: 600; color: var(--c-brand, #36C99A); }
.publish-target-sheet__option { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 8rpx; border-bottom: 1rpx solid var(--c-divider-light, rgba(15, 23, 42, 0.06)); } /* R1-B33/D24 */
.publish-target-sheet__name { font-size: 28rpx; color: var(--c-text-primary, #1A1E1C); }
.publish-target-sheet__circle-opt { display: flex; align-items: center; }
/* MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-006：绿色「已加入」胶囊的样式规则随三段结构一并删除，
   圈子候选行改回 name + 单条 desc（已加入 · N 成员），与 post.vue 同构 */
.publish-target-sheet__desc { font-size: 24rpx; color: var(--c-text-tertiary, #9AA39F); margin-left: 12rpx; /* R21：desc 弹性占位（与 post 版一致），选项行结构跨版统一 */ flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.publish-target-sheet__check { width: 32rpx; height: 32rpx; color: var(--c-brand, #36C99A); }
/* MP-R1-PUB-017：弹层「兴趣圈子」分组加载中/空态提示 */
.publish-target-sheet__hint { display: block; padding: 24rpx 8rpx; font-size: 24rpx; color: var(--c-text-tertiary, #9AA39F); }

.publish-content { padding: 24rpx 32rpx; }
.publish-content__input { width: 100%; min-height: 220rpx; font-size: 30rpx; color: var(--c-text-primary, #1A1E1C); line-height: 1.6; }
/* R1-B33/D20：计数 22rpx（11pt）在真机几乎糊成一团。卡片给的 var(--fs-sm) 实为 22rpx
   （design-variables.scss:532），换过去是零变化——按 --fs-* 档位表取 24rpx 档 = --fs-base:533，
   与同页次级文本（.publish-row__meta / .publish-to__subtitle 24rpx）同档。
   正文 .publish-content__input 30rpx 恰为 --fs-xl 档，与理想图正文档一致，不动。 */
.publish-content__count { text-align: right; font-size: var(--fs-base, 24rpx); color: var(--c-text-tertiary, #9AA39F); margin-top: 8rpx; }
/* MP-R1-PUB-016：接近字数上限警示（颜色走 --c-warning token） */
.publish-content__count--warning { color: var(--c-warning, #FF9F43); }

.publish-images { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 16rpx 32rpx; }
/* R1-B33/D17：一行四格栅格。单格 = (750 − 2×32 页边距 − 3×16 gap)/4 = 159.5rpx，取整 159rpx——
   4×159 + 3×16 = 684rpx ≤ 内容宽 686rpx，留 2rpx 余量避免亚像素进位换成三格一行。
   （原 200rpx 单格只容得下 3 格：3×200 + 2×16 = 632rpx，与理想图四格不符） */
.publish-image { width: 159rpx; height: 159rpx; border-radius: 16rpx; overflow: hidden; position: relative; background: var(--c-brand-50, #E8FAF3); } /* 16rpx 字面量按判据「不等值即不替换」以 nit 保留（2026-10-06 用户全量采纳裁定建议书 #1：--r-lg 以实现为准 20rpx，本行「不做 16→20rpx 视觉替换」，见 reports/audit/round-7/ledger-plan-ruling-closure-2026-10-06.json 与 tests/design-token-rulings.spec.ts:131）；R1-B33/D24 占位底色收敛到 --c-brand-50 保留 */
.publish-image__img { width: 100%; height: 100%; }
.publish-image__remove { position: absolute; top: 6rpx; right: 6rpx; width: 40rpx; height: 40rpx; border-radius: 50%; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; }
.publish-image__remove-icon { width: 22rpx; height: 22rpx; color: #fff; }
/* R21：添加图片块对齐 post 版虚线白底样式（原继承浅绿实心底，与理想图不符） */
.publish-image--add { display: flex; align-items: center; justify-content: center; background: #ffffff; border: 2rpx dashed var(--c-border-strong, #C2CAC6); box-sizing: border-box; } /* R2b-L03-D20：虚线格边框色 #C7D8D2 令牌化到 --c-border-strong（同族中性描边，视觉近等值） */
.publish-image__plus { font-size: 56rpx; color: var(--c-text-tertiary, #9AA39F); }

/* R1-B33/D15：理想图这四行是「通栏列表 + 贯穿全宽的细分割线」，原容器却带
   左右 32rpx margin + 24rpx 圆角 + 1rpx 描边，被切成一张圆角卡、分割线随之内缩。
   去描边、去圆角、左右 margin 归零；页边距改由行自身 padding 承担（32rpx 与全页同栏），
   仅保留行底部分割线（D24 同步令牌化为 --c-divider-light）。 */
.publish-rows { background: var(--c-bg-container, #FFFFFF); }
.publish-row { display: flex; align-items: center; gap: 16rpx; padding: 26rpx 32rpx; border-bottom: 1rpx solid var(--c-divider-light, rgba(15, 23, 42, 0.06)); }
.publish-row__icon { width: 44rpx; height: 44rpx; color: var(--c-brand, #36C99A); text-align: center; }
.publish-row__label { font-size: 28rpx; color: var(--c-text-primary, #1A1E1C); }
.publish-row__meta { flex: 1; text-align: right; font-size: 24rpx; color: var(--c-text-tertiary, #6B7571); }
/* R9-L02-D27：› 恢复给唯一交互行后重新接线（此前无 DOM 消费者）。色档必须 ≥3:1（它是「这行能点」
   的唯一图形线索，属非文本 UI）：--c-text-quaternary #9AA39F 压白仅 2.59:1，不取；--c-text-tertiary
   #6B7571 = 4.76:1（design-variables.scss:125/364 真值，非 .vue 里的过期字面量）达标。
   与 .publish-to__arrow 的 quaternary 档刻意分开（meta 与箭头分档，R9-L02-D26 的裁定方向）。 */
.publish-row__arrow { font-size: 32rpx; color: var(--c-text-tertiary, #6B7571); }

/* R10-L02-D14：位置行的常驻说明条（仅在已选位置后出现）。文字取 --c-text-secondary #6B7571
   压白 4.76:1（22rpx 小字按 4.5:1 判，不取 --c-text-tertiary #9AA39F=2.59:1）；
   「清除位置」取 --c-brand-800 #156B51 压白 6.45:1（与本页主 CTA 同深档，非装饰性绿字）。 */
.publish-location-note { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 8rpx 32rpx 20rpx; }
.publish-location-note__text { flex: 1; min-width: 0; font-size: var(--fs-xs, 22rpx); color: var(--c-text-secondary, #6B7571); }
.publish-location-note__clear { flex-shrink: 0; padding: 8rpx 12rpx; font-size: var(--fs-base, 24rpx); color: var(--c-brand-800, #156B51); }

/* W2-PUBLISH-TOPIC：已选话题 chips（与 post.vue .post-topics 同口径，token 强制） */
.publish-topics { display: flex; flex-wrap: wrap; gap: 12rpx; padding: 0 32rpx; }
.publish-topics__hint { width: 100%; font-size: var(--fs-xs, 22rpx); color: var(--c-text-tertiary, #9AA39F); }
.publish-topic-chip { display: flex; align-items: center; gap: 8rpx; padding: 10rpx 20rpx; border-radius: var(--r-full, 999rpx); background: var(--c-brand-50, #E8FAF3); }
.publish-topic-chip__text { font-size: var(--fs-base, 24rpx); color: var(--c-brand, #36C99A); font-weight: 500; }
.publish-topic-chip__remove { font-size: var(--fs-base, 24rpx); color: var(--c-romance-500, #FF6B81); padding: 0 8rpx; font-weight: 600; }

/* W2-PUBLISH-TOPIC：话题选择弹层（结构/间距/配色与 post.vue .post-sheet 一致，禁 grid、颜色全 token） */
.publish-sheet { position: fixed; inset: 0; z-index: 1100; background: var(--c-overlay-mid, rgba(0, 0, 0, 0.45)); display: flex; align-items: flex-end; }
.publish-sheet__panel { width: 100%; box-sizing: border-box; background: var(--c-bg-container, #FFFFFF); border-radius: var(--r-xxl, 32rpx) var(--r-xxl, 32rpx) 0 0; padding: 24rpx 32rpx calc(env(safe-area-inset-bottom) + 48rpx); max-height: 70vh; overflow-y: auto; }
.publish-sheet__head { display: flex; align-items: baseline; justify-content: space-between; padding: 8rpx 0 20rpx; }
.publish-sheet__title { font-size: var(--fs-xl, 30rpx); font-weight: 700; color: var(--c-text-primary, #1A1E1C); }
.publish-sheet__sub { font-size: var(--fs-xs, 22rpx); color: var(--c-text-tertiary, #9AA39F); }
.publish-sheet__chips { display: flex; flex-wrap: wrap; gap: 16rpx; padding-bottom: 20rpx; }
.publish-sheet__chip { padding: 12rpx 26rpx; border-radius: var(--r-full, 999rpx); background: var(--c-brand-50, #E8FAF3); border: 1rpx solid transparent; }
.publish-sheet__chip--on { background: var(--c-brand, #36C99A); border-color: var(--c-brand, #36C99A); }
.publish-sheet__chip--on .publish-sheet__chip-text { color: var(--c-neutral-0, #FFFFFF); }
.publish-sheet__chip-text { font-size: var(--fs-base, 24rpx); color: var(--c-brand, #36C99A); font-weight: 500; }
.publish-sheet__input-row { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0 4rpx; }
.publish-sheet__input { flex: 1; height: 72rpx; padding: 0 24rpx; border-radius: var(--r-lg, 16rpx); background: var(--c-neutral-50, #F2F5F3); font-size: var(--fs-base, 24rpx); color: var(--c-text-primary, #1A1E1C); }
.publish-sheet__placeholder { color: var(--c-text-quaternary, #C2CAC6); }
.publish-sheet__confirm { padding: 16rpx 36rpx; border-radius: var(--r-full, 999rpx); background: var(--c-brand, #36C99A); flex-shrink: 0; }
.publish-sheet__confirm-text { font-size: var(--fs-base, 24rpx); font-weight: 700; color: var(--c-neutral-0, #FFFFFF); }

/* MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-004：圆角字面量按「等值才换」收口——
   本行 20rpx = --r-lg（design-variables.scss:194）等值，已令牌化。
   R2b-L03-D20 的「.publish-image 也取 --r-lg」建议**不予采纳**：该改动实为 16→20rpx 的视觉替换，
   而 2026-10-06 用户全量采纳的裁定建议书 #1（reports/audit/round-7/ruling-recommendations-2026-10-06.md
   + ledger-plan-ruling-closure-2026-10-06.json 对 PUBLISH-004 处置列的裁定块）已把这条写死：
   「16→--r-lg」的等值替换要求作废、--r-lg 以实现为准 20rpx，但 publish.vue 的 16rpx 字面量
   以 nit 保留、不做 16→20rpx 视觉替换。修车道不得单方面挪动已采纳的裁定 ⇒ 本行按裁定回 16rpx，
   由 tests/design-token-rulings.spec.ts「16rpx 字面量仍在位」判点钉住。
   若理想图量测（R2b-L03-D20 自述「约 20rpx」）要推翻这条裁定，须另立裁决行由用户裁，不在本车道。
   同批虚线格边框色 #C7D8D2 令牌化到 --c-border-strong 那条与本裁定无冲突，保留。
   （原同批备注里那条 6rpx 圆角例外，属已删除的「已加入」胶囊规则，现已无对应样式） */
.publish-tip { margin: 24rpx 32rpx; padding: 24rpx; background: var(--c-brand-50, #E8FAF3); border-radius: var(--r-lg, 20rpx); display: flex; align-items: flex-start; gap: 16rpx; } /* R1-B33/D24：提示底 #EAF9F3 系就近取色，收敛到 --c-brand-50 */
.publish-tip__text-wrap { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
/* R2b-L03-D15：✕ 移入标题行内 → 标题行 space-between（左 [嫩芽+发帖小贴士] / 右 [✕]），
   描述列不再被 ✕ 命中区挤占，恢复整卡宽度单行显示。 */
/* R10-L02-D17（P2 颜色token）：小贴士卡底是 --c-brand-50 #E8FAF3，标题原取 --c-brand #36C99A
   压其上仅 1.94:1，26rpx/13px 粗体不享大字号豁免 ⇒ 读不清。改 --c-brand-800 #156B51 = 5.96:1。
   卡上给的第二个选项 --c-text-secondary #6B7571 压 brand-50 实测 4.40:1，不达 4.5:1，**不采纳**
   （已知机制 §2「对比度要算不要看着改」的同型坑）。 */
.publish-tip__title { font-size: 26rpx; font-weight: 700; color: var(--c-brand-800, #156B51); display: flex; align-items: center; justify-content: space-between; gap: 8rpx; }
.publish-tip__title-main { display: flex; align-items: center; gap: 8rpx; }
/* 与标题同档：嫩芽图标是「这是小贴士」的图形线索，属非文本 UI（≥3:1），
   原 --c-brand 压 brand-50 只有 1.94:1，随标题一并收深（brand-800 压 brand-50 = 5.96:1）。 */
.publish-tip__title-icon { width: 28rpx; height: 28rpx; color: var(--c-brand-800, #156B51); }
.publish-tip__desc { font-size: 24rpx; color: var(--c-text-secondary, #6B7571); }
/* R1-B33/D23：模板中 class=publish-tip__close 的可点关闭 × 此前无任何样式（该节点仅承载
   一个 28rpx／14pt 图标），落在拇指可达区、误触即永久关掉提示。补齐 88rpx（44px）方形命中区，
   与全页其余可点节点同规格。图标尺寸理想图未给量测依据，保持 28rpx 不动。 */
.publish-tip__close { min-width: 88rpx; min-height: 88rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.publish-tip__close-icon { width: 28rpx; height: 28rpx; color: var(--c-text-tertiary, #9AA39F); }

/* R1-B33/D22：尾部占位原只有 24rpx 且不含安全区 → 小贴士卡描述行贴屏幕底缘、下半截被
   Home Indicator 吃掉。改为 48rpx 呼吸位。
   本页非 tabBar 页（由 village/index 导航进入），不需要 tabBar 避让；故刻意不引用
   --tab-bar-total-h——该 token 的安全区双计属 R1-B01/D25 的地盘，在本页引用会把双计引进来。
   R9-L02-D25：底栏已补（见下一段），且它是 .publish-page 这条 flex 列的末位子节点（非 fixed），
   安全区由 .publish-toolbar 自己的 padding-bottom 承担 ⇒ 本占位去掉 env(safe-area-inset-bottom)，
   否则滚动到底会多留一整条安全区（双计）。 */
.publish-body__bottom-space { height: 48rpx; }

/* R9-L02-D25（原 R1-B33/D21「有 CSS 无 DOM，不修待裁定」结案）：DOM 见 </scroll-view> 之后的
   .publish-toolbar。补的五枚全部接页内既有 handler（图片→chooseImage、话题→话题弹层、
   提及→openMentionPicker、位置→原生地图选点（R10-L02-D14 起）、谁可以看→tap-to-explain），没有为「视频」「更多」这类本页
   无后端、无实现的项凭空造按钮：理想图第 5 枚「更多」由本页唯一剩下的真实设置「谁可以看」顶上。
   以下样式即原存档样式，本轮起有真实消费者。 */
.publish-toolbar { display: flex; justify-content: space-around; padding: 16rpx 24rpx calc(env(safe-area-inset-bottom) + 12rpx); background: #fff; border-top: 1rpx solid #EEF2F0; flex-shrink: 0; }
/* R10-L02-D18（P2 可达性）：底栏五枚是本页图片/话题/位置/提及/谁可以看的唯一常驻入口排，
   原无最小高度——40rpx 图标 + 6rpx gap + 20rpx 标签 ≈70rpx（35px）低于 88rpx（44px）拇指下限。
   补 min-height:88rpx 并 justify-content:center 让内容在扩出的热区内垂直居中
   （容器已是 display:flex + column，align-items 有生效前提，见已知机制 §7.4）。 */
.publish-tool { flex: 1; min-height: 88rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx; }
/* R9-L02-D25：color 曾挂在本类上，而本页补 DOM 后这里的消费者是 <image>（图片节点不吃 color，
   与 D29 同型零消费者）——颜色移到 #/@ 文本 glyph 的修饰类，位图图标本身由素材着色。
   font-size / line-height 供 glyph 与 40rpx 图标同档居中（与 post.vue:1654-1664 同口径）。 */
.publish-tool__icon { width: 40rpx; height: 40rpx; font-size: var(--fs-xl, 30rpx); line-height: 40rpx; text-align: center; }
.publish-tool__icon--glyph { color: var(--c-text-secondary, #4A524E); }
/* 20rpx 小字：--c-text-tertiary #6B7571 压白 4.76:1 ≥ 4.5:1（design-variables.scss:125/364 真值） */
.publish-tool__label { font-size: 20rpx; color: var(--c-text-tertiary, #6B7571); }


/* R16（2026-09-07）：页面背景统一纯白（对齐「他人显示主页」理想图色调） */
page {
  background: #ffffff;
}

</style>
