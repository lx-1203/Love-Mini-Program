<script setup lang="ts">


/**
 * 兴趣圈话题列表页
 * 展示指定兴趣圈下的话题列表，支持下拉刷新和加载更多
 */
import { ref, computed, watch, nextTick, getCurrentInstance } from "vue";
import { onLoad, onReady } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCircleStore, formatCircleTime, type TopicAuthor, type CircleItem } from "../../../stores/circle";
import { useActivityStore } from "../../../stores/activity";
import { openAppPath, openUserProfile } from "../../../utils/navigation";
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";
import { IMAGE_PATHS } from "../../../config/images";
// 2026-08-26：圈子图标 emoji→SVG 解析（业务组件图标禁用 emoji 字符）
import { resolveCircleIcon } from "../../../config/circle-icons";
// 2026-08-27 兴趣圈修复：mock 数字 ID（首页入口）→ 标准圈子 ID 归一 + mock 模式守卫
import { useMock } from "../../../stores/helpers/use-mock";
import { resolveMockCircleId } from "../../../stores/circle/mock-data";
import EmptyState from "../../../components/common/EmptyState.vue";
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../../utils/media";
// SubTask 5.5.2：列表页图片 @error 占位图通用方案
import { useImageFallback } from "../../../composables/useImageFallback";

/** Emoji 替换 SVG 图标路径
 *  R6-L04-D22（§1.6 铁律 3）：改前是裸常量，直接进 EmptyState 的 image 入参与模板绑定；
 *  现统一在单一来源处过一次 resolveMediaUrl（mock 档留包内 /static、real 档按 cdn 桶出后端 URL）。 */
const chatIcon = resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.CHAT);

const { t } = useI18n();
const statusBarHeightPx = useStatusBarHeight();
const circleStore = useCircleStore();
const { currentTopics, loading, errorMessage, topicHasMore } = storeToRefs(circleStore);

// SubTask 5.5.2：列表页图片 @error 占位图 —— 失败 key 集合与判断函数
const { onImageError, isImageFailed } = useImageFallback();

/** 当前兴趣圈 ID（从页面参数获取） */
const circleId = ref("");
/** 当前兴趣圈名称 */
const circleName = ref("");
/**
 * R6-L04-D19（P1 · 可达性）：入口没带 circleId 时，本页此前仍把「话题壳」整块渲染出来
 * —— 兜底标题「话题列表」+ 5 枚可点 tab + 空态 + 「去发布」钮，但 onLoad 的 :319 分支
 * 根本不请求 ⇒ 从任何直开入口进来都是**死页**（且「去发布」会把空 circleId 再带进发布页，
 * 死页向外扩散）。现改为：不渲染话题壳，只留可返回的头部 + 一条明确占位，并把用户送回兴趣圈列表。
 */
const missingCircleContext = ref(false);

/**
 * R4-00101：昵称首字符兜底（author.name 为空/null 时返回占位符，
 * 避免 name[0] 抛 TypeError 崩溃渲染）。
 */
function initialOf(name?: string | null): string {
  return name && name.length > 0 ? name.charAt(0) : "?";
}

/** 2026-08-27 兴趣圈修复：话题配图墙布局类（1 张大图 / 2 张并排 / 3 张及以上九宫格） */
function imageWallClass(count: number): string {
  if (count === 1) return "topic-card__images--single";
  if (count === 2) return "topic-card__images--double";
  return "topic-card__images--grid";
}
/** 下拉刷新中 */
const isRefreshing = ref(false);
/** 加载更多中 */
const isLoadingMore = ref(false);


/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器。
 */
/**
 * 刷新话题列表
 */
async function onRefresh() {
  isRefreshing.value = true;
  try {
    await circleStore.fetchTopics(circleId.value, 1);
  } finally {
    isRefreshing.value = false;
    uni.stopPullDownRefresh();
  }
}

/**
 * 加载更多
 */
async function onLoadMore() {
  if (isLoadingMore.value || loading.value || !topicHasMore.value) return;
  isLoadingMore.value = true;
  try {
    await circleStore.fetchTopics(circleId.value, circleStore.topicPage + 1);
  } finally {
    isLoadingMore.value = false;
  }
}

/**
 * 点击话题，跳转到详情
 * @param topicId - 话题 ID
 */
function goToDetail(topicId: string) {
  openAppPath(`/subpackages/circles/circles/topic-detail?topicId=${topicId}&circleId=${circleId.value}`);
}

/**
 * 跳转到话题作者的个人主页（F1.3）
 * 头像点击事件使用 catchtap 阻止冒泡，避免触发话题卡片整体的 goToDetail
 * @param authorId - 作者 userId
 */
function goToAuthorProfile(authorId: string) {
  if (!authorId) return;
  openUserProfile(authorId);
}

/**
 * 发布新话题
 * R6-L04-D19：改前无 circleId 时本页仍会把空 circleId 拼进发布页 URL（死页向外扩散）。
 * 头部「写话题」钮不在话题壳的 v-if 之内（回流前 1.2s 内可点），故在此直接断掉空上下文跳转。
 */
function goToPostTopic() {
  if (missingCircleContext.value) return;
  openAppPath(`/subpackages/circles/circles/post-topic?circleId=${circleId.value}`);
}

/** 兴趣圈详情 Tab（v3 Nearby 冻结 + 2026-08-25 P0 补作品墙）：动态 / 精华 / 活动 / 作品墙 / 成员 */
const detailTab = ref<"feed" | "hot" | "works" | "members" | "activities">("feed");

/** 2026-08-25 P0：作品墙 = 带图片的话题（规格书 15.10 第五个 tab） */
const worksTopics = computed(() =>
  currentTopics.value.filter((tp) => (tp.images?.length ?? 0) > 0)
);

/** 当前 tab 展示列表（作品墙用带图话题，其余用 displayTopics） */
const listForTab = computed(() => (detailTab.value === "works" ? worksTopics.value : displayTopics.value));

/** 当前圈子（列表数据中查找，用于头部成员数/加入态）
 * 2026-08-27 兴趣圈修复：先按原始 ID 精确匹配；mock 下数字 ID（首页入口 1~14）
 * 归一为标准圈子 ID 再匹配；仍未命中时用页面参数合成展示态，保证头部恒可渲染。 */
const circle = computed<CircleItem | null>(() => {
  const exact = circleStore.circles.find((c) => c.id === circleId.value);
  if (exact) return exact;
  if (useMock()) {
    const resolved = resolveMockCircleId(circleId.value);
    const found = resolved ? circleStore.circles.find((c) => c.id === resolved) : null;
    if (found) return found;
  }
  return circleId.value
    ? {
        id: circleId.value,
        name: circleName.value || circleId.value,
        icon: "",
        description: "",
        memberCount: 0,
        topicCount: currentTopics.value.length,
        isJoined: false,
      }
    : null;
});

/** 2026-08-21：圈子封面（复用兴趣圈页素材）
 * 第五轮 QA 一致性收敛：游戏/阅读/宠物三圈原 Style B 宽幅场景大图（与 ideal 方形缩略风格不一致）
 * 改为本地 AI 生成 Style A 方形居中场景图，与 config/images.ts CIRCLE_COVERS / nearby 同步 */
const CIRCLE_COVER = {
  photo: resolveMediaUrl("/static/assets/images/covers/circle-photo.png"),
  travel: resolveMediaUrl("/static/assets/images/covers/circle-travel.png"),
  music: resolveMediaUrl("/static/assets/images/covers/circle-music.png"),
  // L11（2026-10-19）：circle-sports.png 两版都不合格（包内 185×195 左侧 30% 全白条；
  // 750 版下方 22.7% 是白页底），改指已落盘的满幅正确资产 circle-cover-sports.jpg，
  // 与 config/images.ts CIRCLE_COVERS.SPORTS 同图，消除两页封面不一致。
  sports: resolveMediaUrl("/static/assets/images/covers/circle-cover-sports.jpg"),
  food: resolveMediaUrl("/static/assets/images/covers/circle-food.png"),
  sky: resolveMediaUrl("/static/assets/images/covers/circle-sky.png"),
  // 第五轮 QA：游戏/阅读/宠物改用 Style A AI 生成图（与理想图风格一致）
  game: resolveMediaUrl("/static/assets/images/covers/Cozy_flat_lay_of_video_game_co_2026-08-21T03-34-01.png"),
  reading: resolveMediaUrl("/static/assets/images/covers/A_person_reading_a_book_in_a_c_2026-08-21T03-35-17.png"),
  pet: resolveMediaUrl("/static/assets/images/covers/A_cute_golden_retriever_dog_lo_2026-08-21T03-36-28.png"),
  // 非标准 8 圈（仅真实模式可能存在）：保留 Style B 原图
  cutepets: resolveMediaUrl("/static/assets/images/covers/circle-cutepets.png"),
  basketball: resolveMediaUrl("/static/assets/images/covers/circle-basketball.png"),
  boardgame: resolveMediaUrl("/static/assets/images/covers/circle-boardgame.png"),
  postgraduate: resolveMediaUrl("/static/assets/images/covers/circle-postgraduate.png"),
  studybuddy: resolveMediaUrl("/static/assets/images/covers/circle-studybuddy.png"),
} as const;

function circleCover(circle: { name: string }): string {
  const n = circle.name || "";
  if (n.includes("摄影")) return CIRCLE_COVER.photo;
  if (n.includes("旅行")) return CIRCLE_COVER.travel;
  if (n.includes("音乐")) return CIRCLE_COVER.music;
  if (n.includes("运动") || n.includes("篮球") || n.includes("健身")) return CIRCLE_COVER.sports;
  if (n.includes("美食") || n.includes("食")) return CIRCLE_COVER.food;
  if (n.includes("天文") || n.includes("星空")) return CIRCLE_COVER.sky;
  if (n.includes("游戏")) return CIRCLE_COVER.game;
  if (n.includes("阅读")) return CIRCLE_COVER.reading;
  if (n.includes("宠物")) return CIRCLE_COVER.pet;
  if (n.includes("萌宠")) return CIRCLE_COVER.cutepets;
  if (n.includes("篮球")) return CIRCLE_COVER.basketball;
  if (n.includes("桌游")) return CIRCLE_COVER.boardgame;
  if (n.includes("考研")) return CIRCLE_COVER.postgraduate;
  if (n.includes("学习搭子") || n.includes("学习")) return CIRCLE_COVER.studybuddy;
  return "";
}

/** 精选 = 仅对当前已拉取话题按回复数排序（likes 字段缺失，score 用回复数） */
const displayTopics = computed(() =>
  detailTab.value === "hot"
    ? [...currentTopics.value].sort((a, b) => b.replyCount - a.replyCount)
    : currentTopics.value
);

/** 成员 Tab：成员数 + 圈内活跃作者头像（取帖子作者，无新成员列表接口） */
const memberAvatars = computed(() => {
  const map = new Map<string, TopicAuthor>();
  for (const tp of currentTopics.value) {
    if (tp.author.userId && !map.has(tp.author.userId)) map.set(tp.author.userId, tp.author);
  }
  return [...map.values()];
});

/** 加入/退出兴趣圈（开放圈，无需校园认证） */
async function toggleJoin() {
  const c = circle.value;
  if (!c) return;
  try {
    if (c.isJoined) await circleStore.leaveCircle(c.id);
    else await circleStore.joinCircle(c.id);
  } catch (e) {
    // MP-R1-CIRCLES-001：store 只置 errorMessage 后 rethrow，从不出 toast——补用户可见反馈
    uni.showToast({
      title: e instanceof Error && e.message ? e.message : t("apiErrors.operationFailed"),
      icon: "none",
    });
  }
}

/**
 * 2026-08-25 P0：格式化成员数量（与 circles/index.vue 一致，规格书 15.6）
 */
function formatMemberCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}w`;
  // R21：对齐理想图（1.2w / 8,932）——千位以下展示精确人数（千分位），不再用英文 k 单位
  if (count >= 1000) return count.toLocaleString("en-US");
  return String(count);
}

/**
 * 卡脚时间戳：与 circle-home.vue:264-275 的 relativeTime 同字面（R11-L04-D04）。
 *
 * 卡的「本页走 formatCircleTime（绝对日期）」不成立：formatCircleTime
 * （stores/circle.ts:270）= formatDateTime(..., "relative")，刚刚/N 分钟前/N 小时前/N 天前，
 * ≥7 天才降级日期（utils/time.ts:265-307）。真差异只在降级那一档的字面：本页共享 formatter
 * 出 "2026/09/09"（zh-CN date），circle-home 的私有副本出 "9-09" ⇒ 同一话题两页读法不同。
 * 这里只把 ≥7 天这一档收敛成 M-DD，其余档仍走共享相对时间（保留 R13 的非法串/未来时间/en-US 处理）。
 */
function formatTopicTime(iso: string): string {
  const ts = Date.parse(iso);
  if (!Number.isNaN(ts) && Date.now() - ts >= 7 * 86_400_000) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return formatCircleTime(iso);
}

/**
 * R11-L04-D01（P0 · 假计数）：原「等 N 位朋友已加入 + 头像组」整行已从本页撤销。
 *
 * 判透的关键不在前端那一半：卡上建议改读的 `circle.friendJoinedCount` 本身也没有真相源。
 *   · CircleController.java:193-194 该字段的注释原文是「暂无独立统计，按成员数推算」；
 *   · RealCircleService.java:187-195 的产出函数就叫 estimateFriendJoinedCount()：
 *     `memberCount / 1000` 四舍五入后夹到 [3, 99]，与「我的好友里有谁加入了这个圈」无关。
 * 也就是说，「改读后端字段」只是把「按圈 id 哈希编」换成「按成员数推算」——§12.4 判死的假数。
 * 现按 §12.4 的合法形态之二处置：没有真相源的内容整行撤下、降级为不承诺（计数与三枚头像一起撤，
 * 因为头像组唯一的语义就是「这些是你的朋友」）。前端不再保留任何哈希/常量推导。
 *
 * 缺列登记（要恢复这一行时需后端新增）：以 viewer 为锚的真实好友-圈子加入统计
 * （friends ⋈ circle_members 的关联计数），而不是由 memberCount 估算的 friendJoinedCount。
 * 注：circle-home.vue:252-258/545 仍在消费同一个估算值，不属本车道写集，未动。
 */

/**
 * 置顶圈规/公告条文案
 *
 * R11-L04-D03（P2 · 冒充本圈公告的固定文案）：改前模板 :535 直接取写死词条
 * `t('circle.home.pinnedNotice')`，不来自任何圈子数据 ⇒ 摄影圈/音乐圈/运动圈进本页都读作
 * 同一条「【圈规】友善交流，尊重原创，分享美好瞬间」，而同域 circle-home.vue:154-156 在 real
 * 模式对该字段恒返回 ""、:591 整条不渲染（MP-R1-CIRCLEHOME-001 在册裁定：real 模式不渲染写死
 * 演示公告）。后端没有圈公告列（circle-home.vue:149 已注明 TODO(后端): 圈公告接口），
 * 按 §12.4 的合法形态之二处置：没有真相源的内容 real 档整条撤下、降级为不承诺，
 * 只在 mock 演示档保留；等后端补列后把 useMock() 分支换成读字段。
 */
const pinnedNotice = computed<string>(() => (useMock() ? t("circle.home.pinnedNotice") : ""));

/**
 * R11-L04-D05（P2 · 位置）：页签行吸顶态。
 * 改前 .topics-page 是 height:100% + overflow:hidden 的定高列，头部（导航带 + 封面卡 + 页签行）
 * 挂在滚动区之外 ⇒ top/bottom 两帧头部位置完全一致，固定带占到 y=242（≈480rpx，屏高 29%），
 * 单屏只剩 2.5 张话题卡。现头部随内滚区一起滚走、只让 .circle-tabs 吸顶。
 * R12-L04-D02（P1）：本页滚动容器是 scroll-view，sticky 在其内不生效（circle-home 的
 * sticky 能吸靠的是 window 滚动），故吸顶改由 onScroll 阈值驱动的 position:fixed 承担——
 * 本 ref 只当阈值状态机用：true ⇒ scroll-view 外的 .circle-tabs--pinned 克隆整带上屏
 * （fixed 顶 y=0 + --statusbar 内衬 + 88rpx 返回槽；R13-L03-D15 起克隆结构，
 * 文档流内的页签行原位不动 ⇒ 无需等高占位）。
 * scroll-view 本身保留：MP-R1-TOPICS-101 定高内滚是 @scrolltolower/refresher 的前提，
 * 且本页在 pages.json 未开 enablePullDownRefresh，故挂 @scroll 而非 onPageScroll。
 */
const tabsPinned = ref(false);
/** 吸顶阈值：优先实测 .circle-tabs 在 scrollTop=0 时的视口 top（= 封面高 + 下边距），
 *  测不到时兜底 220px（375 视口下 hero 440rpx≈220px；circle-home.vue:98-99 同一套「实测优先」） */
const tabsPinTopPx = ref(220);
function measureTabsPinTop(): void {
  const instance = getCurrentInstance();
  const query = instance ? uni.createSelectorQuery().in(instance) : uni.createSelectorQuery();
  query
    .select(".circle-tabs")
    .boundingClientRect((res) => {
      const info = Array.isArray(res) ? res[0] : res;
      const top = info?.top ?? 0;
      if (top > 0) tabsPinTopPx.value = top;
    })
    .exec();
}
onReady(() => {
  nextTick(measureTabsPinTop);
});
// 圈子数据落定后 .circle-hero 才渲染（v-if+异步 fetchCircles），页签 offsetTop 随之变化 ⇒ 复量
watch(circle, () => {
  nextTick(measureTabsPinTop);
});
function onListScroll(e: { detail?: { scrollTop?: number } }) {
  const next = (e?.detail?.scrollTop ?? 0) >= tabsPinTopPx.value;
  if (next !== tabsPinned.value) tabsPinned.value = next;
}

/** 2026-08-25 P0：右上角"写话题 + ···"操作（规格书 15.2） */
function onTopicsMore() {
  // MP-R2-TOPICS-001：收敛为仅「写话题」——原「举报/分享」为无行为死选项
  uni.showActionSheet({
    itemList: ["写话题"],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) goToPostTopic();
    },
  });
}

/** v3 冻结：认识 TA → 他人主页（不直接 like/建聊天） */
function meetAuthor(userId: string) {
  openUserProfile(userId);
}

/** 活动 Tab：复用活动列表 */
const activityStore = useActivityStore();
/** 2026-08-27 兴趣圈修复：详情 Tab 定义（成员 Tab 附带人数，对齐理想图"成员 1.2w"） */
const detailTabs = computed(() => [
  { key: "feed", label: t("circle.detailFeed") },
  { key: "hot", label: t("circle.detailHot") },
  { key: "activities", label: t("circle.detailActivitiesTab") },
  { key: "works", label: t("circle.detailWorks") },
  { key: "members", label: `${t("circle.detailMembersTab")}${circle.value ? ` ${formatMemberCount(circle.value.memberCount)}` : ""}` },
] as const);
function goToActivityDetail(activityId: string | number) {
  openAppPath(`/subpackages/tools/activities/detail?id=${encodeURIComponent(String(activityId))}`);
}
function switchTab(tab: "feed" | "hot" | "works" | "members" | "activities") {
  detailTab.value = tab;
  if (tab === "activities" && activityStore.activities.length === 0) {
    void activityStore.fetchActivities().catch(() => {});
  }
}

/**
 * 返回上一页
 * MP-R1-J20-003/MP-R1-REQ20-007：置顶圈规条点击——栈=1（深链直开）时裸 navigateBack
 * 必 fail 构成死按钮；补栈底 reLaunch 兜底（落点语义待产品确认，现保守回兴趣圈列表）
 */
function goCircleDetail(_id: string) {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.reLaunch({ url: "/subpackages/circles/circles/index" });
  }
}

function goBack() {
  // MP-R2-NAV-001：栈底兜底（分享卡/深链直开栈=1 时裸 navigateBack 静默失败）
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.reLaunch({ url: "/subpackages/circles/circles/index" });
  }
}

onLoad((query) => {
  const q = query || {};
  circleId.value = q.circleId || "";
  // R4-00100：decodeURIComponent 遇 URL 中非法 % 序列会抛 URIError 中断页面渲染，
  // 包 try-catch 兜底（解码失败按原始字符串展示，后续若命中本地圈子再覆盖为真实名称）
  try {
    circleName.value = decodeURIComponent(q.circleName || "");
  } catch (_e) {
    circleName.value = q.circleName || "";
  }

  if (circleId.value) {
    // 修复：先加载圈子列表再读取当前圈子（解决竞态），加 .catch() 防止异常白屏
    void (async () => {
      await circleStore.fetchCircles().catch(() => {});
      const circle = circleStore.circles.find((c) => c.id === circleId.value);
      if (circle) {
        circleName.value = circle.name;
      }
      await circleStore.fetchTopics(circleId.value, 1).catch(() => {});
    })();
  } else {
    // infra R2-00075: circleId 缺失时给出错误态提示，避免直开链接白屏
    uni.showToast({ title: t("storeErrors.circle.circleIdInvalid"), icon: "none" });
    // R6-L04-D19：提示之外还要把页面从「死壳」切到「占位 + 回流」态。
    // 延时 1.2s 是让上面那条 toast 有被读完的时间；redirectTo 失败（栈异常）再退 reLaunch。
    missingCircleContext.value = true;
    setTimeout(() => {
      const url = "/subpackages/circles/circles/index";
      uni.redirectTo({
        url,
        fail: () => {
          uni.reLaunch({ url }).catch(() => {});
        },
      });
    }, 1200);
  }
});

// 修复（严格模式 noUnusedLocals）：goToAuthorProfile 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ goToAuthorProfile });
</script>

<template>
  <view class="topics-page" :style="{ '--statusbar': `${statusBarHeightPx}px` }">
    <!-- R6-L04-D19：无 circleId 时整块话题壳（圈封面 / tab 行 / 列表）不渲染，
         onLoad 已排定 1.2s 后回流兴趣圈列表 ⇒ 这条留在文档流里的实色页头是回流前唯一的返回出口，
         「写话题/更多」两枚按钮在该态点了也只会被 goToPostTopic 的守卫断掉，故不再渲染。
         正常态的导航带不在这里：R11-L04-D02 把它压到封面上（见 .circle-hero 内的 .topics-header）。
         --statusbar 由 JS 实测值注入（已知机制 §4：safe-area 顶内衬在取景档恒 0）。 -->
    <view v-if="missingCircleContext" class="topics-header topics-header--standalone">
      <view class="topics-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="topics-header__title">{{ circleName || t("circle.topicsListTitle") }}</text>
      <!-- R6-L04-D19 回流态不渲染「写话题/更多」（点了只会被 goToPostTopic 守卫断掉）；
           留一条与左侧返回钮等宽的占位，space-between 下页名才仍居中而不是被推到右缘。 -->
      <view class="topics-header__spacer" />
    </view>

    <view v-if="missingCircleContext" class="topics-missing">
      <EmptyState
        type="no-data"
        :image="chatIcon"
        :title="t('storeErrors.circle.circleIdInvalid')"
        hide-sub
      />
    </view>

    <template v-if="!missingCircleContext">
    <!-- R11-L04-D05（位置 P2）：头部（封面 + 页签行）从「滚动区之外的固定带」搬进内滚区，
         随列表一起滚走，只有 .circle-tabs 吸顶（对齐 circle-home.vue:1040-1054 的方案）。
         scroll-view 本身保留：MP-R1-TOPICS-101 定高内滚是 @scrolltolower 翻页与 refresher 的前提，
         且本页在 pages.json 未开 enablePullDownRefresh，换成页面滚会把这两个能力弄没。 -->
    <scroll-view
      class="topics-list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="isRefreshing"
      @scroll="onListScroll"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
    <!-- 兴趣圈详情头部（v3 Nearby 冻结）
         R11-L04-D02（尺寸比例 P2）：改前是「一条纯绿导航带 + padding 撑高的深色圆角卡」，
         帧上封面本体只占 y=120..242（123px≈244rpx），其上还压 y=30..118 的导航带（≈235rpx），
         封面被挤掉近一半高度；同域 circle-home（:754 height:440rpx）同一位置是屏幕 y=0 起的
         全幅封面。现同构图：封面自 y=0 全幅铺满、min-height 440rpx，导航带改为压在封面上，
         封面下沿叠 --c-gradient-mask-strong 渐隐遮罩承托白字。 -->
    <view v-if="circle" class="circle-hero">
      <image v-if="circleCover(circle)" class="circle-hero__bg" :src="resolveMediaUrl(circleCover(circle))" mode="aspectFill" alt="" />
      <!-- 导航带脚下的顶部深色渐隐（同 circle-home.vue:762 .hero-mask 一支）：
           状态栏带只压浅档 .28（黑色系统时间可读），导航控件带压成对令牌
           --c-badge-on-image-bg = rgba(15,23,42,.7)（纯白像素合成 ≈76 ⇒ 页名白字 8.4:1），
           两段之间 16rpx 过渡——详见 .circle-hero__nav-mask。 -->
      <view class="circle-hero__nav-mask" />
      <!-- 封面下沿渐隐遮罩（D02 建议的 --c-gradient-mask-strong = rgba(0,0,0,.6)），
           形状沿用 circle-home.vue:783 .hero-scrim 的已算档（α .62→.86，白字 ≥6.2:1） -->
      <view class="circle-hero__bg-mask" />
      <!-- 顶部导航栏：R11-L04-D02 起压在封面上（2026-09-04 视觉验收的 statusBarHeight 注入
           改由页面根 --statusbar 承担，见 .topics-page 的 :style） -->
      <view class="topics-header">
        <view class="topics-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="topics-header__title">{{ circleName || t("circle.topicsListTitle") }}</text>
        <!-- 2026-08-25 P0：右上"写话题 + ···"（规格书 15.2） -->
        <view class="topics-header__right">
          <view
            class="topics-header__icon-btn press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="'写话题'"
            @tap="goToPostTopic"
          >
            <image class="topics-header__icon-text" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.EDIT)" mode="aspectFit" alt="" />
          </view>
          <view
            class="topics-header__icon-btn press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="'更多'"
            @tap="onTopicsMore"
          >
            <text class="topics-header__icon-text">···</text>
          </view>
        </view>
      </view>
      <view class="circle-hero__row">
      <view class="circle-hero__icon">
        <!-- R21（2026-09-09）：优先真实封面图（此前 📷 emoji 命中相机 SVG，hero 呈灰色相机占位），
             无封面命中再回退分类 SVG 图标 -->
        <image
          v-if="circleCover(circle)"
          class="circle-hero__icon-img circle-hero__icon-img--cover"
          :src="resolveMediaUrl(circleCover(circle))"
          mode="aspectFill"
          alt=""
        />
        <image
          v-else-if="resolveCircleIcon(circle.icon)"
          class="circle-hero__icon-img"
          :src="resolveMediaUrl(resolveCircleIcon(circle.icon))"
          mode="aspectFit"
          alt=""
        />
        <text v-else class="circle-hero__emoji">{{ circle.name.slice(0, 1) }}</text>
      </view>
      <view class="circle-hero__body">
        <view class="circle-hero__name-row">
          <text class="circle-hero__name">{{ circle.name }}</text>
          <!-- R6-L04-D20 同轴补漏（泳道未点名，但同属「字面量未走 t()」）：热门角标改 circle.hotBadge -->
          <text v-if="circle.memberCount >= 7000" class="circle-hero__hot">{{ t('circle.hotBadge') }}</text>
        </view>
        <!-- 2026-08-25 P0：规格书 15.6 格式 "1.2w 人加入 · 362 条动态"
             R6-L04-D20（文案 P2）：改前是硬编码中文字面量，切语言漏网。
             词条 circle.memberUnit（zh-CN.ts:3723「人加入」）/ circle.topicUnit（:3724「条动态」）
             早已存在且被 circle-home.vue:499-500 使用 ⇒ 本页只是没接上，非需新建词条。 -->
        <text class="circle-hero__meta">{{ formatMemberCount(circle.memberCount) }} {{ t('circle.memberUnit') }} · {{ circle.topicCount }} {{ t('circle.topicUnit') }}</text>
        <text class="circle-hero__desc">{{ circle.description }}</text>
        <!-- R11-L04-D01（P0）：原「等 N 位朋友已加入 + 头像组」整行已撤下——后端 friendJoinedCount
             是 estimateFriendJoinedCount()（memberCount/1000，RealCircleService.java:187-195），
             不是好友加入数；没有真相源就不承诺。恢复需真实的好友-圈子加入统计列（见 <script> 说明）。 -->
      </view>
      <!-- R12-L04-D01（P3 文案）：hero 加入钮原读 circle.joinBtn（「+ 加入」），与同域
           circle-home 同一动作的「加入圈子」（circle.home.joinCta）取档不一 ⇒ 统一整句档；
           底栏加入钮（:756/:759）同批换，词条本身不改（circles/index.vue 仍消费「+ 加入」并自行去 +） -->
      <view
        class="circle-hero__join press-feedback"
        :class="{ 'circle-hero__join--joined': circle.isJoined }"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        role="button"
        :aria-label="circle.isJoined ? t('circle.joinedBtn') : t('circle.home.joinCta')"
        @tap.stop="toggleJoin"
      >
        <text class="circle-hero__join-text">{{ circle.isJoined ? t('circle.joinedBtn') : t('circle.home.joinCta') }}</text>
      </view>
      </view>
    </view>

    <!-- 详情 Tab：动态 / 精华 / 活动 / 作品墙 / 成员（2026-08-25 P0 补作品墙，规格书 15.10）
         R12-L04-D02（P1 · 层级遮挡）：本页滚动容器是 scroll-view，position:sticky 在 scroll-view
         内不生效（circle-home 能吸是因为它是 window 滚动、无内层 scroll-view，
         见 circle-home.vue:95 在册注释）——R11-L04-D05 照搬的 sticky 方案在本页是死代码。
         R13-L03-D15（P1 · 上轮修得不对）：R12 的「onScroll 阈值 + 原行 position:fixed」在 real
         深滚帧（real-f0677920/topics__bottom，已滚到第 4 卡）上页签带整条缺席——fixed 元件
         生在 scroll-view 内部，真机档 scroll-view 为其后代建独立包含块，top:0 解不到屏幕 y=0，
         阈值再准也上不了屏（同页 .circle-bottom 的 fixed 生在 scroll-view 外、同一深滚帧正常
         上屏，反证成立）。现改双份结构：文档流内这份页签行永远普通块、随内容滚走；
         过阈值时由 scroll-view 之外的 .circle-tabs--pinned 克隆顶到屏幕 y=0，补 --statusbar
         内衬白底自 y=0 铺满「状态栏带 + 页签行」、88rpx 返回槽只在克隆里（文档流份随 hero
         滚走，不承载返回）；文档流行原位不动 ⇒ 无上跳，R12 的等高占位整个撤掉。 -->
    <view class="circle-tabs" role="tablist" :aria-label="t('circle.detailTabsAria')">
      <view v-for="tab in detailTabs" :key="tab.key"
        class="circle-tab press-feedback"
        :class="{ 'circle-tab--active': detailTab === tab.key }"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        role="tab"
        :aria-selected="detailTab === tab.key ? 'true' : 'false'"
        @tap="switchTab(tab.key as 'feed' | 'hot' | 'works' | 'members' | 'activities')"
      >
        <text class="circle-tab__text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading && currentTopics.length === 0" class="topics-state">
      <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('circle.topicsLoadingAria')" />
      <text class="topics-state__text">{{ t("circle.topicsLoadingText") }}</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="errorMessage && currentTopics.length === 0" class="topics-state">
      <view class="error-icon">
        <image class="error-icon-img" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.WARNING)" mode="aspectFit" alt="" />
      </view>
      <text class="topics-state__text">{{ errorMessage }}</text>
      <view class="topics-state__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="onRefresh">
        <text class="topics-state__btn-text">{{ t("circle.topicsRetryBtn") }}</text>
      </view>
    </view>

    <!-- 话题列表（R11-L04-D05：加载/错误/列表三种状态现在都在同一个内滚区里，
         头部不再随状态切换而消失；列表分支由 v-else 的 scroll-view 改为 template，
         滚动容器上提到本页唯一的 .topics-list） -->
    <template v-else>
      <!-- R6-L04-D22（空态文案 P3）：改前条件只看 tab、不看列表 ⇒ 空态下这条「置顶【圈规】…」
           仍常驻顶部，读起来像「有内容但被折叠」。补 listForTab.length > 0，空列表即收起。
           R6-L04-D20（文案 P2）：整句与「置顶」二字改前都是硬编码中文字面量。
           词条 circle.home.pinnedNotice（zh-CN.ts:3744）/ circle.home.pinnedBadge（:3743）
           已存在且由 circle-home.vue 的置顶公告条使用 ⇒ 接同一 key，两页圈规同源。
           ⚠ 展示句因此从「文明发言，友善交流，共同维护圈子氛围」变为
              「【圈规】友善交流，尊重原创，分享美好瞬间」，若要保留原句需新增 circle.ruleText
              词条（i18n/** 非本车道写集），已在报告里登记待裁。
           R11-L04-D03（文案 P2）：改前 real 模式也照样渲染这条写死词条 ⇒ 任何圈子（摄影/音乐/运动）
           进本页都读作同一条「圈规」，冒充本圈公告，而同域 circle-home.vue:154-156 在 real 档恒返回
           ""、:591 整条不渲染（MP-R1-CIRCLEHOME-001 在册裁定）。后端没有圈公告列（circle-home.vue:149
           已注明 TODO(后端): 圈公告接口）⇒ 按 §12.4 合法形态之二：无真相源的内容 real 档整条撤下，
           只在 mock 演示档保留。改读 pinnedNotice 计算属性（见 <script> 内注释）。 -->
      <view v-if="(detailTab === 'feed' || detailTab === 'hot') && listForTab.length > 0 && pinnedNotice.length > 0" class="topic-rule press-feedback" hover-class="press-feedback--active" hover-stay-time="40" @tap="goCircleDetail(circleId)">
        <text class="topic-rule__pin">{{ t('circle.home.pinnedBadge') }}</text>
        <text class="topic-rule__text">{{ pinnedNotice }}</text>
        <text class="topic-rule__arrow">›</text>
      </view>

      <!-- 空状态 -->
      <EmptyState
        v-if="(detailTab === 'feed' || detailTab === 'hot' || detailTab === 'works') && listForTab.length === 0"
        type="no-data"
        :image="chatIcon"
        :title="detailTab === 'works' ? t('circle.worksEmptyTitle') : t('circle.topicsEmptyTitle')"
        :description="t('circle.topicsEmptyDesc')"
        :action-text="t('circle.topicsEmptyAction')"
        @action="goToPostTopic"
      />

      <!-- 话题卡片 -->
      <view
        v-for="topic in listForTab" :key="topic.id"
        class="topic-card list-item press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        @tap="goToDetail(topic.id)"
      >
        <!-- 话题标题 -->
        <text class="topic-card__title">{{ topic.title }}</text>

        <!-- 话题内容预览 -->
        <text class="topic-card__content">{{ topic.content }}</text>

        <!-- 2026-08-27 兴趣圈修复：话题配图墙（真实渲染 topic.images） -->
        <view v-if="topic.images && topic.images.length > 0" class="topic-card__images" :class="imageWallClass(topic.images.length)">
          <image
            v-for="(img, idx) in topic.images"
            :key="img || idx"
            class="topic-card__image"
            :src="resolveMediaUrl(img)"
            mode="aspectFill"
            lazy-load
            alt=""
            @error="onImageError(`topic-image-${topic.id}-${idx}`)"
          />
        </view>

        <!-- 底部信息 -->
        <view class="topic-card__footer">
          <view class="topic-card__author">
            <view
              class="topic-card__avatar"
  @tap.stop="goToAuthorProfile(topic.author.userId)"
            >
              <image
                v-if="topic.author.avatar && !isImageFailed(`avatar-${topic.id}`)"
                class="topic-card__avatar-img"
                :src="resolveMediaUrl(topic.author.avatar)"
                mode="aspectFill"
                lazy-load alt=""
                @error="onImageError(`avatar-${topic.id}`)"
              />
              <text v-else class="topic-card__avatar-char">{{ initialOf(topic.author.name) }}</text>
            </view>
            <text class="topic-card__name">{{ topic.author.name }}</text>
          </view>
          <view class="topic-card__meta">
            <image class="topic-card__reply-icon" :src="resolveMediaUrl(chatIcon)" mode="aspectFit" alt="" />
            <text class="topic-card__replies">{{ topic.replyCount }}</text>
            <!-- R11-L04-D04（文案 P3）：与 circle-home.vue:264-275 同字面。
                 卡的「本页走 formatCircleTime（绝对日期）」不准：formatCircleTime
                 （stores/circle.ts:270）就是 relative 档，≥7 天才降级日期（utils/time.ts:307）。
                 真差异在降级字面——本页共享 formatter 出 2026/09/09，circle-home 出 9-09。
                 formatTopicTime 把 ≥7 天那一档收敛成 M-DD，其余档仍走共享相对时间。 -->
            <text class="topic-card__time">{{ formatTopicTime(topic.createdAt) }}</text>
          </view>
        </view>
        <view class="topic-card__meet press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('circle.meetAuthor')" @tap.stop="meetAuthor(topic.author.userId)">
          <text class="topic-card__meet-text">{{ t('circle.meetAuthor') }}</text>
        </view>
      </view>

      <!-- 成员 Tab（v3 Nearby 冻结：成员数 + 圈内活跃作者，无成员列表接口） -->
      <view v-if="detailTab === 'members'" class="detail-members">
        <text class="detail-members__count">{{ t('circle.detailMembers', { n: circle?.memberCount ?? 0 }) }}</text>
        <view class="detail-members__avatars">
          <view v-for="author in memberAvatars" :key="author.userId" class="detail-members__avatar">
            <text class="detail-members__avatar-char">{{ initialOf(author.name) }}</text>
            <text class="detail-members__avatar-name">{{ author.name }}</text>
          </view>
          <view v-if="memberAvatars.length === 0" class="detail-members__empty">
            <text class="detail-members__empty-text">{{ t('circle.detailMembersEmpty') }}</text>
          </view>
        </view>
      </view>

      <!-- 活动 Tab（v3 Nearby 冻结：复用活动列表） -->
      <view v-if="detailTab === 'activities'" class="detail-activities">
        <view v-for="act in activityStore.activities.slice(0, 5)" :key="act.id" class="detail-activity press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="act.title" @tap="goToActivityDetail(act.id)">
          <text class="detail-activity__title">{{ act.title }}</text>
          <text class="detail-activity__meta">{{ act.location || act.scheduleText }}</text>
          <text class="detail-activity__arrow">›</text>
        </view>
        <view v-if="activityStore.activities.length === 0" class="detail-activities__empty">
          <text class="detail-activities__empty-text">{{ t('circle.detailActivitiesEmpty') }}</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="isLoadingMore" class="load-more" role="status" aria-live="polite">
<!-- 加载更多 -->
        <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('circle.topicsLoadingAria')" />
        <text class="load-more__text">{{ t("circle.topicsLoadMoreLoading") }}</text>
      </view>
      <view v-else-if="!topicHasMore && currentTopics.length > 0" class="load-more">
        <text class="load-more__text">{{ t("circle.topicsLoadMoreEnd") }}</text>
      </view>

      <!-- 底部留白 -->
      <view class="feed-bottom-spacer" />
    </template>
    </scroll-view>

    <!-- R13-L03-D15：吸顶页签带克隆——必须生在 scroll-view 之外（fixed 在 scroll-view 内
         真机档解不到屏幕 y=0，见上文 .circle-tabs 注释）。onListScroll 过阈值时整带上屏：
         --statusbar 内衬 + 页签行 + 88rpx 返回槽（R12-L04-D03 的返回出口由克隆承接），
         深滚到任意位置页签可切、返回出口不丢；滚回阈值之下整带撤下、露出文档流份。 -->
    <view v-if="tabsPinned" class="circle-tabs circle-tabs--pinned" role="tablist" :aria-label="t('circle.detailTabsAria')">
      <view class="circle-tabs__back press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <text class="circle-tabs__back-icon">‹</text>
      </view>
      <view v-for="tab in detailTabs" :key="tab.key"
        class="circle-tab press-feedback"
        :class="{ 'circle-tab--active': detailTab === tab.key }"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        role="tab"
        :aria-selected="detailTab === tab.key ? 'true' : 'false'"
        @tap="switchTab(tab.key as 'feed' | 'hot' | 'works' | 'members' | 'activities')"
      >
        <text class="circle-tab__text">{{ tab.label }}</text>
      </view>
    </view>
    </template>

    <!-- 2026-08-27 兴趣圈修复：固定底部操作栏（加入圈子 + 发布动态），对齐理想图 -->
    <view v-if="circle" class="circle-bottom">
      <view
        class="circle-bottom__join press-feedback"
        :class="{ 'circle-bottom__join--joined': circle.isJoined }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="circle.isJoined ? t('circle.joinedBtn') : t('circle.home.joinCta')"
        @tap="toggleJoin"
      >
        <text class="circle-bottom__join-text">{{ circle.isJoined ? t('circle.joinedBtn') : t('circle.home.joinCta') }}</text>
      </view>
      <view
        class="circle-bottom__fab press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="'写话题'"
        @tap="goToPostTopic"
      >
        <image class="circle-bottom__fab-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.EDIT)" mode="aspectFit" alt="" />
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.topics-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域。
     MP-R1-TOPICS-101：必须定高（height:100% 而非 min-height:100%）——原容器随内容
     增长，flex:1 的 .topics-list scroll-view 失去高度约束 → 整页滚动，
     @scrolltolower 话题翻页与 refresher 永不触发（对齐 campus/index 定高修复模式） */
  height: 100%;
  background: linear-gradient(180deg, var(--c-bg-brand) 0%, var(--c-bg-page) 20%);
  overflow: hidden;
}

/* ========== 顶部导航带 ==========
   R11-L04-D02（尺寸比例 P2）：改前这条是文档流里的实色绿带（帧上 y=30..118，≈235rpx），
   把封面从屏幕顶挤下去近一半高度。现按卡上建议改为「压在封面上的透明底图标」：
   绝对定位在 .circle-hero（position:relative）内、随封面一起滚走（同 circle-home.vue:804
   .hero-actions 的在册构图），底色撤成透明，可读性交给 .circle-hero__nav-mask 的深色渐隐
   （rgba(15,23,42,.7) 压纯白像素合成 ≈76 ⇒ 白字 8.4:1，本文件 R10-L04-D01 已用同一组值）。
   避让继续走 JS 实测的 --statusbar（已知机制 §4：env(safe-area-inset-top) 取景档恒 0），
   改前那句 inline paddingTop 与 CSS 里的 calc() 是两条同源避让，现收敛成 CSS 一条。
   控件行 88rpx=44px 热区档（R10-L04-D02 同档），上下各 12rpx 内衬 ⇒ 带总高 = 状态栏 + 56px。 */
.topics-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  min-height: calc(var(--statusbar, env(safe-area-inset-top)) + 112rpx);
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 12rpx) var(--sp-8) 12rpx;
  /* R21：右侧避让微信胶囊——「写话题/更多」按钮此前被胶囊压住并被右缘裁切 */
  padding-right: calc(var(--capsule-right, 7px) + 104px);
  background: transparent;
}

/* R6-L04-D19 回流态专用：无 circleId 时话题壳（含封面）整块不渲染，这条页头要回到文档流里
   并保持实色绿底——它是 1.2s 回流前唯一的返回出口，不能跟着封面滚走，也没有封面可压在下面。 */
.topics-header--standalone {
  position: relative;
  background: var(--c-gradient-brand);
}

.topics-header__back {
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-full);
  /* R10-L04-D01（可达性 P1）：页头带是定值 --c-gradient-brand（实测 #49D0A1，不是用户头图），
     改前 rgba(255,255,255,.25) 白胶囊 + 白字 = 1.94:1（文字与边界一起消失）。
     按卡「加同色深色叠层」这一支落到仓内成对令牌 --c-badge-on-image-bg（rgba(15,23,42,.7)）：
     叠后 ≈#214E4D，白字 8.4:1、胶囊压页头 4.78:1，文字 ≥4.5 与非文本 ≥3 同时成立。
     页头渐变底不动（§11.3 在册：mint 页头语言不归本条判点）。 */
  background: var(--c-badge-on-image-bg);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.topics-header__back:active {
  transform: scale(0.96);
  background: var(--c-overlay-stronger);
}
/* #endif */

.back-icon {
  font-size: var(--fs-lg);
  /* R10-L04-D01：成对令牌的另一半（深底白字 rgba(255,255,255,.95)）＝8.4:1 */
  color: var(--c-badge-on-image-text);
  font-weight: 500;
}

.topics-header__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  /* R10-L04-D01（页名「摄影」压 mint 1.94:1）当时取的是「深色前景」这一支：#1A1E1C 压 mint 8.67:1。
     R11-L04-D02 把导航带改成压在封面上 ⇒ 页名脚下换成 .circle-hero__nav-mask 的深色渐隐
     （rgba(15,23,42,.7)，最坏底为纯白像素时合成 ≈76）⇒ 前景改取该遮罩的成对令牌
     --c-badge-on-image-text rgba(255,255,255,.95) = 8.4:1，两档都 ≥4.5。 */
  color: var(--c-badge-on-image-text, rgba(255, 255, 255, 0.95));
}

/* 回流态实色页头下仍是 mint 底 ⇒ 页名回到深色前景（R10-L04-D01 的 8.67:1 档不变） */
.topics-header--standalone .topics-header__title {
  color: var(--c-text-primary);
}

.topics-header__spacer {
  min-width: 80rpx;
}

/* 2026-08-25 P0：右上写话题 + ··· */
.topics-header__right {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 80rpx;
  justify-content: flex-end;
}

.topics-header__icon-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  /* R10-L04-D01：同返回钮——改前 rgba(255,255,255,.22) 白胶囊里放的是 #36C99A 描边的
     铅笔 SVG（static/assets/svg-spec/03-icons/edit.svg，色值写死在素材里、CSS 改不动），
     压半透明白只有 1.3:1。深玻璃档下铅笔 4.41:1、白「···」8.4:1（非文本 ≥3 亦成立）。
     素材按硬规矩 5「只用仓内既有」不动，只换它脚下的叠层。 */
  background: var(--c-badge-on-image-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.topics-header__icon-text {
  font-size: 28rpx;
  color: var(--c-badge-on-image-text);
  font-weight: 600;
  line-height: 1;
}

.topics-header__icon-btn image.topics-header__icon-text {
  width: 32rpx;
  height: 32rpx;
}

/* ===== 2026-08-21 置顶规则条 ===== */
.topic-rule {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  margin-bottom: 20rpx;
  border-radius: 16rpx;
  background: var(--c-bg-brand, #E8FAF3);
  border: 1rpx solid #B8EDDA;
}

.topic-rule__pin {
  flex-shrink: 0;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: var(--c-brand, #36C99A);
  color: var(--c-text-inverse, #FFFFFF);
  font-size: 20rpx;
  font-weight: 700;
}

.topic-rule__text {
  flex: 1;
  font-size: 24rpx;
  color: var(--c-brand-700, #1F8D6A);
  min-width: 0;
}

.topic-rule__arrow {
  font-size: 30rpx;
  color: var(--c-brand, #36C99A);
  flex-shrink: 0;
}

/* ========== 加载/错误/空状态 ========== */
.topics-state {
  /* R11-L04-D05：这条块现在住在 .topics-list 内滚区里，父级不是 flex 容器 ⇒ flex:1 失效
     （已知机制 §3：居中需要宿主有可解析高度）。改给确定高度承接原「撑满余下视口」的观感，
     内容仍由自身 flex + justify-content:center 居中。 */
  min-height: 480rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
  padding: 80rpx 40rpx;
}

.loading-spinner {
  width: 44rpx;
  height: 44rpx;
  border: 4rpx solid var(--c-border-default);
  border-top-color: var(--c-brand-500);
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  font-size: var(--fs-3xl);
  opacity: 0.6;
  color: var(--c-text-tertiary);
}

.topics-state__text {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
  text-align: center;
}

.topics-state__btn {
  padding: 18rpx 48rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  box-shadow: var(--s-brand);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.topics-state__btn:active {
  transform: scale(0.96);
}
/* #endif */

.topics-state__btn-text {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
  font-weight: 600;
}

.topics-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-5);
  padding: 120rpx 40rpx;
}

.topics-empty__icon {
  width: 88rpx;
  height: 88rpx;
  opacity: 0.6;
  color: var(--c-text-tertiary);
}

.topics-empty__title {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.topics-empty__desc {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

/* ========== 话题列表（R11-L04-D05：本页唯一的内滚区，头部也在其中） ========== */
.topics-list {
  flex: 1;
  /* R6-L04-D21（可达性 P1）：.topics-page 是 height:100% + overflow:hidden 的定高 flex 列，
     flex 子项默认 min-height:auto ⇒ 内容超过视口时 .topics-list 会被撑高而不是内滚，
     @scrolltolower（onLoadMore→fetchTopics(page+1)）与 refresher 双双拿不到内滚区。
     与同族根因（campus/index.vue .topic-scroll、campus/certification.vue .cert-body、
     campus/post-topic.vue .post-body、campus/topic-detail.vue .detail-body）同口径补 min-height:0。 */
  min-height: 0;
  overflow-y: auto;
  /* R11-L04-D02：顶部内衬归零——导航带已改成压在封面里，封面必须自屏幕 y=0 起全幅铺满，
     留 var(--sp-5) 就在最上面透出一条页底色带。列表与页签之间的原有留白由
     .circle-tabs 的 margin-bottom 与 .topic-card 的外边距承担，视觉间距不变。 */
  padding: 0 0 var(--sp-5);
}

/* R6-L04-D19：无 circleId 直开时的占位容器——EmptyState 自身只有 padding、不带高度约束，
   居中必须由父级给（同 R6-L05-D02 / R6-L06-D12 的判据），故这里给 flex:1 + 双向居中。 */
.topics-missing {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.topic-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  margin: var(--sp-3) var(--sp-6);
  padding: var(--sp-7);
  background: var(--c-neutral-0);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.topic-card:active {
  transform: scale(0.98);
  box-shadow: var(--s-md);
}
/* #endif */

.topic-card__title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-card__content {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  /* #ifndef H5 */
  /* mp-weixin: -webkit-line-clamp 支持有限，使用 max-height 兜底防止溢出 */
  max-height: 3.2em;
  /* #endif */
}

.topic-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--sp-4);
  border-top: 1rpx solid var(--c-border-default);
}

.topic-card__author {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.topic-card__avatar {
  width: 44rpx;
  height: 44rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.topic-card__avatar-img {
  border-radius: var(--r-full);

  width: 100%;
  height: 100%;
}

.topic-card__avatar-char {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-brand-500);
}

.topic-card__name {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  font-weight: 500;
}

.topic-card__meta {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.topic-card__reply-icon {
  width: 24rpx;
  height: 24rpx;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.topic-card__replies {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.topic-card__time {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* ========== 加载更多 ========== */
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-8) 0;
}

.load-more__text {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

.feed-bottom-spacer {
  height: 260rpx;
}

/* ========== 2026-08-27 话题配图墙 ========== */
.topic-card__images {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.topic-card__image {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 16rpx;
  background: var(--c-bg-page);
}

/* 1 张大图 */
.topic-card__images--single .topic-card__image {
  width: 100%;
  height: 360rpx;
}

/* 2 张并排 */
.topic-card__images--double .topic-card__image {
  width: calc((100% - 12rpx) / 2);
  height: 230rpx;
}

/* 3 张及以上九宫格 */
.topic-card__images--grid .topic-card__image {
  width: calc((100% - 24rpx) / 3);
  height: 200rpx;
}

/* ========== 2026-08-27 固定底部操作栏（加入圈子 + 发布） ========== */
.circle-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom) + 16rpx);
  background: var(--c-neutral-0, #FFFFFF);
  box-shadow: 0 -4rpx 20rpx var(--c-black-shadow-xs, rgba(0, 0, 0, 0.05));
}

.circle-bottom__join {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* R10-L04-D02（尺寸比例 P1）：写死 84rpx=42px，比 88rpx(44px) 热区标准少 4rpx
     （帧上实心 40–42px）。提到 88rpx 达标；.circle-bottom 的 padding 16rpx 与
     .feed-bottom-spacer(260rpx) 已留足避让，不会因为 +4rpx 遮末行。 */
  height: 88rpx;
  border-radius: var(--r-full, 9999rpx);
  /* R10-L04-D02 同档：--c-gradient-float-btn 展开是 135° 的 #36C99A→#36C99A（视觉即实色），
     白字压它 2.05:1 —— 卡里「全页没有达标替代出口」的另一半原因就在这。
     按 §11.3 引的 R9 在册方向（主 CTA 收成 --c-brand-800，白字 6.45:1）同档收口；
     这不是把「共享主 CTA 渐变翻成实色」的回归，值本来就没有双色渐变。 */
  background: var(--c-brand-800, #156B51);
  box-shadow: var(--s-brand-md);
  transition: all var(--d-fast, 120ms) ease;
}

.circle-bottom__join--joined {
  background: var(--c-bg-container, #FFFFFF);
  border: 2rpx solid var(--c-line-strong, #DCE5E2);
  box-shadow: none;
}

/* #ifdef H5 */
.circle-bottom__join:active {
  transform: scale(0.97);
}
/* #endif */

.circle-bottom__join-text {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

.circle-bottom__join--joined .circle-bottom__join-text {
  color: var(--c-text-secondary, #666666);
}

.circle-bottom__fab {
  flex-shrink: 0;
  /* R10-L04-D02（尺寸比例 P1）：卡的「底部 FAB 同步对齐同一档」——84→88rpx，
     与同排 .circle-bottom__join 同高，固定栏两枚动作都到 44px 热区标准。 */
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-circle, 50%);
  /* 同档收口：改前底 = --c-gradient-float-btn（视觉实色 #36C99A），
     而里面的铅笔是 static/assets/svg-spec/03-icons/edit.svg、描边写死 #36C99A
     ⇒ 图标与底色同值几乎不可辨。换 --c-brand-800 后铅笔 3.07:1（非文本 ≥3 成立）。 */
  background: var(--c-brand-800, #156B51);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-float-btn);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.circle-bottom__fab:active {
  transform: scale(0.92);
}
/* #endif */

.circle-bottom__fab-icon {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-neutral-0, #FFFFFF);
}

/* ========== v3 Nearby 冻结：兴趣圈详情头部 + 四 Tab ========== */
/* R11-L04-D02（尺寸比例 P2）：改前是「一条纯绿导航带 + padding 撑高的深色圆角卡」，
   帧上封面本体只有 123px≈244rpx 高、其上还压 235rpx 导航带；现改为同域 circle-home.vue:748-802
   那一套构图：封面自屏幕 y=0 全幅铺满、min-height 440rpx（circle-home.vue:754 同档，
   该档由 R9-L04-D02 按理想图实测 27% 帧高定案），圈名/简介/人数/加入并到封面下沿叠层，
   导航带绝对定位压在封面上（见 .topics-header）。顶部内衬 = 导航带高（状态栏 + 112rpx）+ 12rpx 呼吸。 */
.circle-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  box-sizing: border-box;
  min-height: 440rpx;
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 124rpx) 32rpx 32rpx;
  margin: 0 0 20rpx;
  border-radius: 0;
  overflow: hidden;
  background: var(--c-text-primary, #2A3A34);
  z-index: 0;
}

/* 封面本体：改前 opacity .35（把封面压成深色卡上的一块底纹，是「视觉矮一档」的另一半）；
   全幅档下按 circle-home.vue:757 .hero-img 同档铺满，可读性交给下面两条遮罩。 */
.circle-hero__bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 修复：去掉 blur 防止低端机卡死 */
  filter: none;
  z-index: 0;
}

/* 导航带脚下的顶部深色渐隐（circle-home.vue:762 .hero-mask 同族）：
   R11-L04-D02 把封面铺到 y=0 后，这条遮罩要同时照顾两段文字——
   · 状态栏带（0..--statusbar）：系统时间/电量是黑字（本页 navigationBarTextStyle 未改，
     取景帧可证「3:33」为黑）⇒ 只压浅档 .28，纯白底合成 ≈184、黑字 ≈10.6:1；
   · 导航控件带（--statusbar + 16rpx 起）：页名白字与深色胶囊里的白图标 ⇒ 用成对令牌
     --c-badge-on-image-bg = rgba(15,23,42,.7)，纯白底合成 ≈76、白字 8.4:1（在册档）。
   两段之间 16rpx 过渡；控件带在 +128rpx 处开始渐隐，到 +168rpx 归零，不把封面切成两半。 */
.circle-hero__nav-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: calc(var(--statusbar, env(safe-area-inset-top)) + 168rpx);
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0.28) 0,
    rgba(15, 23, 42, 0.28) var(--statusbar, env(safe-area-inset-top)),
    var(--c-badge-on-image-bg) calc(var(--statusbar, env(safe-area-inset-top)) + 16rpx),
    var(--c-badge-on-image-bg) calc(var(--statusbar, env(safe-area-inset-top)) + 128rpx),
    var(--c-gradient-mask-transparent) 100%
  );
  pointer-events: none;
  z-index: 1;
}

/* 封面下沿叠层承托遮罩：D02 建议的 --c-gradient-mask-strong（rgba(0,0,0,.6)），
   形状沿用 circle-home.vue:783 .hero-scrim 的已算档（α .62→.86，白字 ≥6.2:1）：
   信息行落在遮罩第 ~73% 处 ⇒ α≈.79，底像素即便取纯白，白字仍 ≥8:1。 */
.circle-hero__bg-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, var(--c-gradient-mask-transparent) 0%, var(--c-gradient-mask-strong) 30%, rgba(0, 0, 0, 0.86) 100%);
  pointer-events: none;
  z-index: 1;
}

/* 封面下沿的信息行（图标 + 文案 + 加入钮）：导航带搬进封面后，原来的横向三列由这条行承接 */
.circle-hero__row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  position: relative;
  z-index: 2;
}

/* 圈名：改前本页没有一条 .circle-hero__name 规则 ⇒ 继承全局深色前景，
   压在深色卡上（top 帧「摄影」两字几乎读不出）。叠层改到封面上后必须显式给白字档，
   取 --c-badge-on-image-text rgba(255,255,255,.95)（与页名同一对在册令牌）。 */
.circle-hero__name {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-badge-on-image-text, rgba(255, 255, 255, 0.95));
}

.circle-hero__icon {
  /* R13-L03-D14（P3 · 尺寸比例）：88rpx（44px，约屏宽 11.7%）比同域参考图头像小约四分之一，
     hero 左侧视觉权重弱于理想构图；提到 120rpx 档（60px），圆角保留 22rpx 原档。 */
  width: 120rpx;
  height: 120rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.22);
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.circle-hero__emoji {
  font-size: 48rpx;
}

/* 2026-08-26：圈子图标 SVG（替代 emoji 字符） */
.circle-hero__icon-img {
  width: 48rpx;
  height: 48rpx;
}

/* R21：封面图版本撑满整个圆形头像位 */
.circle-hero__icon-img--cover {
  width: 100%;
  height: 100%;
}

.circle-hero__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
  position: relative;
  z-index: 2;
}

.circle-hero__meta {
  font-size: 22rpx;
  color: rgba(255,255,255,0.85);
}

.circle-hero__desc {
  /* R13-L03-D13（P3 · 字号）：22rpx（11px，规范极小档）低于辅助档 28rpx，读感差；
     提到 var(--fs-lg) 28rpx 档，超长简介仍单行省略号截断（白字压封面遮罩不变）。 */
  font-size: var(--fs-lg, 28rpx);
  color: rgba(255,255,255,0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.circle-hero__join {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  /* R10-L04-D02（尺寸比例 P1）：卡点名「头部另有一枚同样偏小的『+ 加入』」——
     12rpx 内衬 + 24rpx 字≈58rpx 高，也够不到 44px 档。补 min-height:88rpx 并 flex 居中，
     文字视觉位置不变（已知机制 §9 同款口径），热区与底部 CTA 同档。 */
  min-height: 88rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full, 9999rpx);
  /* 改前 linear-gradient(135deg,#36C99A,#36C99A)（视觉实色）压 --c-text-inverse
     rgba(255,255,255,.95) = 2.05:1（卡测 3.2–3.5 是取到边缘的结果，同样不达 4.5）
     ⇒ 收成 --c-brand-800，白字 6.45:1，与底部主 CTA 同档同色，全页有了达标出口。 */
  background: var(--c-brand-800, #156B51);
}

.circle-hero__join--joined {
  background: var(--c-bg-container, #FFFFFF);
  border: 2rpx solid var(--c-line-strong, #DCE5E2);
}

.circle-hero__join-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

.circle-hero__join--joined .circle-hero__join-text {
  color: var(--c-text-secondary, #666666);
}

/* R11-L04-D05（位置 P2）：页签行是本页唯一吸顶的头部元素。
   改前头部三件（导航带 + 封面卡 + 页签行）全挂在滚动区之外 ⇒ top/bottom 两帧头部位置完全一致、
   固定带占到 y=242（≈480rpx，屏高 29%），单屏只剩 2.5 张话题卡；现三件都搬进 .topics-list
   随内容滚走，只有这一行 top:0 吸顶（对齐 circle-home.vue:1040 的 position:sticky 方案）。
   吸顶态补 --statusbar 上内衬 = circle-home.vue:1032-1054 的在册解法（R2b-L05-D06 / R8-L04-D08：
   不补的话 feed 会从状态栏带里透出来与系统时间叠印；R10-L03-D19：这段只在吸顶态补，
   否则顶帧多一条纯白带）。右侧胶囊避让按同一档常量给（circle-home.vue:1043 同式）：
   只在吸顶态给会在跨过阈值时把五个页签横向抖一下。 */
.circle-tabs {
  /* R12-L04-D02（P1）：原 position:sticky top:0 在本页滚动容器（scroll-view）内不生效，
     是死代码（circle-home 能吸靠的是 window 滚动）。吸顶改由 .circle-tabs--pinned 的
     position:fixed 承担，由 onListScroll 的阈值状态驱动；文档流态保持普通块。 */
  z-index: 10;
  box-sizing: border-box;
  display: flex;
  /* V-03（第五轮 QA）：5 个 tab 增加左右留白 + 行距，避免贴边/拥挤 */
  gap: 12rpx;
  padding: 0 calc(var(--capsule-right, 7px) + 104px) 0 24rpx;
  margin-bottom: 20rpx;
  /* 吸顶后必须有同色不透明底，列表内容才不会被看穿（页面底色档） */
  background: var(--c-bg-page, #F5FAF8);
}

/* R13-L03-D15：fixed 吸顶态只由 scroll-view 之外的克隆元素承载（模板见 </scroll-view> 之后的
   v-if="tabsPinned" 分支）——R12 把原行（scroll-view 内部）翻 fixed，真机档 scroll-view 为
   后代建独立包含块，top:0 解不到屏幕 y=0，深滚帧整带缺席。克隆生在页面根下
   （同 .circle-bottom 的 fixed 同层），top:0 恒解到屏幕 y=0；补 --statusbar 内衬
   ⇒ 白底自 y=0 铺满「状态栏带 + 页签行」，feed 从带下穿过、不与系统时间叠印
   （--statusbar 由页面根节点 JS 实测注入，非 env() 恒 0 档）。 */
.circle-tabs--pinned {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin-bottom: 0;
  padding-top: var(--statusbar, env(safe-area-inset-top));
}

/* R12-L04-D03：吸顶带内的返回槽位（仅吸顶态渲染），88rpx 命中区与全站页头返回钮同档 */
.circle-tabs__back {
  flex-shrink: 0;
  min-height: 88rpx;
  min-width: 88rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-tabs__back-icon {
  font-size: 44rpx;
  line-height: 1;
  color: var(--c-text-primary, #1A1E1C);
}

.circle-tab {
  position: relative;
  /* 对齐 circle-home.vue:1056-1059 的 R9-L04-D03 档：等宽 flex:1 在让出胶囊 111px 后
     每个槽只剩 ~46px，「成员 1.2w」会被挤到折行；改成槽宽先按文案定基、再按权重分余量。 */
  flex: 1 1 auto;
  min-width: 0;
  padding: 14rpx 0 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-tab--active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: var(--c-brand-500, #36C99A);
}

.circle-tab__text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-secondary, #666666);
}

.circle-tab--active .circle-tab__text {
  color: var(--c-brand-600, #36C99A);
}

.topic-card__meet {
  display: inline-flex;
  margin-top: 14rpx;
  padding: 10rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  /* R10-L04-D03（可达性 P1）：每条帖子唯一动作胶囊「认识 TA」。
     卡给的改法是「定位该胶囊透明度来源（父级 opacity 或覆盖样式）并去掉」——
     这条查无实据：本文件从 .topics-page → .topics-list → .topic-card → .topic-card__meet
     整条链都没有 opacity/覆盖（只有 .circle-hero__bg:1167、.error-icon、.topics-empty__icon
     三处 opacity，都不在这条祖先链上），R10 编译产物 apps/client/dist/build/mp-weixin/
     subpackages/circles/circles/topics.wxss 里这两条规则也是原样落地、无透明度。
     帧上读到 #A9E7D3 是 22rpx=11px 细笔画 + 2rpx 描边被取样平均的结果，不是淡出。
     判点本身成立且更直接：声明色 #2DB98A 压白卡 = 2.49:1、描边 --c-brand-500 真值 #36C99A = 2.10:1，
     两项都远低于 4.5 / 3 ⇒ 按已知机制 §2 的实算档收成 brand-800 #156B51（6.45:1），
     卡的建议值 brand-600(2.81)/brand-700(4.14) 都不达标，不采纳。 */
  background: #ffffff;
  border: 2rpx solid var(--c-brand-800, #156B51);
}

.topic-card__meet-text {
  font-size: 22rpx;
  font-weight: 700;
  /* R10-L04-D03：同上，字色与描边同档深绿（压白 6.45:1），胶囊读得出「可点」。 */
  color: var(--c-brand-800, #156B51);
}

.detail-members {
  padding: 8rpx 4rpx;
}

.detail-members__count {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
  margin-bottom: 20rpx;
}

.detail-members__avatars {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.detail-members__avatar {
  border-radius: var(--r-full);

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  width: 120rpx;
}

.detail-members__avatar-char {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-brand-100, #D1F5E7);
  color: var(--c-brand-700, #2AAE83);
  font-size: 32rpx;
  font-weight: 800;
}

.detail-members__avatar-name {
  font-size: 20rpx;
  color: var(--c-text-secondary, #666666);
}

.detail-members__empty {
  padding: 40rpx 0;
}

.detail-members__empty-text,
.detail-activities__empty-text {
  font-size: 24rpx;
  color: var(--c-text-tertiary, #666666);
}

.detail-activities {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.detail-activity {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
}

.detail-activity__title {
  flex: 1;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-activity__meta {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.detail-activity__arrow {
  font-size: 28rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}
.circle-hero__name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.circle-hero__hot {
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #FF6B81 0%, #FF9F43 100%);
  color: var(--c-text-inverse, #FFFFFF);
  font-size: 20rpx;
  font-weight: 700;
  line-height: 1.5;
  flex-shrink: 0;
}

/* R11-L04-D01：原 .circle-hero__friends / __friends-avatars / __friends-avatar / __friends-text
   五条规则随整行撤下（该行消费的 friendJoinedCount 是后端按成员数估算的假数，见 <script>）。 */

</style>





