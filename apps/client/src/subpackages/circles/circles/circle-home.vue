<script setup lang="ts">
/**
 * 圈子主页（2026-09-02 W2 骨架补齐：对照理想效果图「圈子详情，摄影圈参考.png」）
 *
 * 结构（自上而下，与效果图一一对应）：
 *  1. Hero 头图：圈封面大图 + 返回 / 分享 / 更多（半透明圆底按钮）
 *  2. 圈子信息卡：圈头像 + 名称 + 热门徽章 + 简介 + 「x.xw 人加入 · N 条动态」
 *     + 朋友头像组「等 N 位朋友已加入」+ 绿色「加入圈子」按钮
 *  3. 标签 chips 行（摄影技巧 / 风景拍摄 / 人像写真 / 城市漫游）
 *  4. 多 Tab 栏：动态 / 精华 / 活动 / 作品墙 / 成员（激活态品牌绿下划线）
 *  5. 置顶公告卡（浅绿底 + 置顶徽章）
 *  6. 动态 feed：作者行（头像 + 昵称 + 校徽 pill + 时间）→ 话题标签 + 正文
 *     → 三图网格 → 点赞 / 评论互动行
 *  7. 「查看全部话题」链接（保留原 topics 话题列表链路）
 *  8. 底部固定栏：加入圈子（未加入）主按钮 + 发帖编辑浮动按钮
 *
 * 数据策略：
 *  - 圈子主体数据来自 circleStore（fetchCircles 后按 circleId 匹配），
 *    未命中时回退本地演示数据（骨架可独立渲染，不阻塞验收）；
 *  - 动态 feed / 标签 / 朋友头像为本地 mock —— TODO(后端): 圈内动态分页接口。
 *
 * 视觉纪律：
 *  - 品牌绿 var(--c-brand-500, #36C99A)（#36C99A 系）与 tabBar selectedColor 同源；
 *  - 图标全部使用 static SVG/PNG 资产（红线：禁用 emoji）。
 *
 * 2026-09-12 封面修复：圈名→封面统一走 config/circle-covers（circleCoverFor）。
 */
import { computed, getCurrentInstance, nextTick, ref, watch } from "vue";
import { onLoad, onPageScroll, onReady, onShareAppMessage } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCircleStore, type CircleItem } from "../../../stores/circle";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { IMAGE_PATHS } from "../../../config/images";
import { circleCoverFor } from "../../../config/circle-covers";
import { resolveMediaUrl } from "../../../utils/media";
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
import { useMock } from "../../../stores/helpers/use-mock";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";

const { t } = useI18n();
const circleStore = useCircleStore();
const { circles, loading } = storeToRefs(circleStore);
// 注入 --statusbar：hero 上的返回/分享按钮需避开状态栏（开发者工具 env 恒 0，原按钮被顶进刘海区不可见）
const { styleVars: menuStyleVars } = useMenuButtonRect();

/** 圈子 ID（onLoad 带入） */
const circleId = ref("");
/** 当前激活 Tab（动态/精华/活动/作品墙/成员） */
const activeTab = ref<"posts" | "featured" | "activities" | "works" | "members">("posts");

/** Tab 定义 → i18n key 映射（复用语言包已有圈子详情词条） */
const TAB_KEYS = ["posts", "featured", "activities", "works", "members"] as const;
const TAB_LABEL_KEYS: Record<(typeof TAB_KEYS)[number], string> = {
  posts: "circle.detailFeed",
  featured: "circle.detailHot",
  activities: "circle.detailActivitiesTab",
  works: "circle.detailWorks",
  members: "circle.detailMembersTab",
};

/** 本地演示圈（store 未命中时兜底，字段与 CircleItem 对齐） */
const FALLBACK_CIRCLE: CircleItem = {
  id: "circle-photo",
  name: "摄影圈",
  icon: IMAGE_PATHS.CIRCLE_COVERS.PHOTO,
  description: "用镜头记录生活的美好瞬间",
  memberCount: 12000,
  topicCount: 362,
  isJoined: false,
  friendJoinedCount: 8,
};

/** 传入 ID 的圈优先，未命中回退演示圈（mock 模式骨架不空屏）。
 *  MP-R4-CIRCLEHOME-01（2026-09-13 独立审查 IA-CIRCLEHOME-01）：real 模式下
 *  缺参/无效圈 id 不再静默套用演示圈——isUnknownCircle 标记后走真实空态，
 *  避免用户在 real 包看到成套虚构统计与演示动态且无任何异常标识。 */
const circle = computed<CircleItem>(() => {
  return circles.value.find((c) => c.id === circleId.value) || FALLBACK_CIRCLE;
});

/** real 模式且圈子未被 store 命中（缺参 / 无效 id / 列表拉取失败）。
 *  mock 模式保持原兜底（演示场景骨架不空屏）。
 *  R10-P1-001（2026-09-17 冷启动审查）：深链/冷启动直连时 store 尚未拉取完成，
 *  「未就绪」不能当「不存在」——先走骨架态，拉取落定后才允许判定未知圈，
 *  否则分享卡片直达有效圈子会先闪「圈子不存在或已解散」。 */
const circlesFetchSettled = ref(useMock());

/* R10-L03-D19（间距 P2）：.tabs 就是白 sheet 本身，它把 --statusbar 无条件计进 padding-top。
 * 未吸顶时（顶帧，页签仍在文档流里）这段内衬只是 hero 下沿与页签墨迹之间一条 58px(≈115rpx)
 * 的纯白空带 ≈ 理想图同位 24px 的 2.4 倍；但它又不能在吸顶后删掉——R8-L04-D08（P1 层级遮挡）
 * 正是靠这条内衬把状态栏带铺成同色不透明底，防止 feed 从系统时间/微信胶囊下面透出来。
 * ⇒ 按卡片第一方案改成「仅 sticky 生效时才预留」：滚动越过页签在文档流里的 offsetTop 才补上。
 * 机制与 hub.vue:40-44 的 headerCompact 同款（本页同样是 window 滚动，无内层 scroll-view）。
 * 放在 circlesFetchSettled 之后：骨架期 .tabs 不在文档流里，量不到就得等它落定后复量。 */
const tabsPinned = ref(false);
/** 吸顶阈值：优先实测 .tabs 的 offsetTop；测不到时兜底 = hero 高度 440rpx（见 .hero），375 视口 ≈220px */
const tabsPinTopPx = ref(220);

function measureTabsPinTop(): void {
  const instance = getCurrentInstance();
  const query = instance ? uni.createSelectorQuery().in(instance) : uni.createSelectorQuery();
  query
    .select(".tabs")
    .boundingClientRect((res) => {
      const info = Array.isArray(res) ? res[0] : res;
      const top = info?.top ?? 0;
      if (top > 0) tabsPinTopPx.value = top;
    })
    .exec();
}

onReady(() => {
  measureTabsPinTop();
});
watch(circlesFetchSettled, (settled) => {
  if (settled) nextTick(measureTabsPinTop);
});
onPageScroll((e) => {
  const next = e.scrollTop >= tabsPinTopPx.value;
  if (next !== tabsPinned.value) tabsPinned.value = next;
});

const isUnknownCircle = computed<boolean>(() => {
  if (useMock()) return false;
  if (!circleId.value) return true;
  if (!circlesFetchSettled.value) return false;
  return !circles.value.some((c) => c.id === circleId.value);
});

/** 未命中圈空态吉祥物（mascot_cry.png，与 XunmiMascot sad 态同源） */
const NOT_FOUND_MASCOT = "/static/assets/images/mascot/mascot_cry.png";

/** 圈封面：统一走 config/circle-covers 单一映射（2026-09-12 修复图文不一致：
 *  本页原副本缺 阅读/宠物/考研/天文/篮球 等关键词，列表页显示专属封面、
 *  进主页却回退默认摄影图；现与列表页/首页兴趣推荐共用 circleCoverFor） */
const coverImage = computed<string>(() => circleCoverFor(circle.value.name));

/** 是否已加入（控制底部栏按钮态） */
const joined = computed(() => circle.value.isJoined);

/** 圈子 meta（标签 + 公告），2026-10-28 起由后端 /circles/{id}/meta 下发。 */
const circleMeta = ref<{ tags: string[]; announcement: string }>({ tags: [], announcement: "" });

/** 圈标签：mock 保留演示标签，real 用后端 meta。 */
const circleTags = computed<string[]>(() =>
  useMock() ? ["摄影技巧", "风景拍摄", "人像写真", "城市漫游"] : circleMeta.value.tags
);

/** 置顶公告（本地 mock —— TODO(后端): 圈公告接口）。
 *  MP-R1-CIRCLEHOME-001：real 模式不渲染写死演示公告
 *  MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-002（2026-09-27）：演示文案不再
 *  写死中文字面量，改走本页其余文案同一套 useI18n().t()（circle.home.* 命名，
 *  与相邻 circle.home.pinnedBadge 成对）；文案内容原样入词条，视觉零变化。 */
const pinnedNotice = computed<string>(() =>
  useMock() ? t("circle.home.pinnedNotice") : circleMeta.value.announcement
);

/** 动态 feed 项（2026-09-12：真实数据来自 circleStore.fetchTopics，mock 仅兜底） */
interface FeedItem {
  id: string;
  nickname: string;
  /** 作者头像（MP-R1-CIRCLE-001：后端透传 users.avatar_url，空则回退默认头像） */
  avatar?: string;
  /** 后端话题无学校字段，真实数据为空则不渲染校徽 pill */
  school?: string;
  timeText: string;
  /** 话题标签（mock 专属；真实数据无该字段） */
  tag?: string;
  /** 话题标题（真实数据） */
  title?: string;
  content: string;
  images: string[];
  /** R11-L04-D14：后端 CircleTopicView 无 likeCount/likedByMe 列 ⇒ 真实数据这两个字段缺省，
   *  互动栏不渲染点赞位；只有 mock 演示数据带真实写的数字。 */
  likes?: number;
  comments: number;
  liked?: boolean;
}

const feedItems = ref<FeedItem[]>([
  {
    id: "f1",
    nickname: "阿辰",
    school: "北京大学",
    timeText: "30 分钟前",
    tag: "校园风光",
    content: "周末去爬山拍到了云海，太震撼了！",
    images: [
      // R4：post-5 海岸悬崖山感不足，换 post-2 暗色云雾海岸（更贴近「爬山云海」语义）
      // 2026-09-29 主包体积车道：三条完整 /static/** 字面量（119,739B 的本地随包保留量）
      // 收敛到 IMAGE_PATHS.POSTS.*（本文件下方 f2 已是这同一写法）——
      // mock/dev 运行时取值逐字不变（IMAGE_PATHS 在 mock 档基址就是 /static/assets/images），
      // real 档改指后端 /api/v1/media/app-assets（三张均已托管、字节一致）→ 发布主包不再带这三张。
      IMAGE_PATHS.POSTS.POST_PLACEHOLDER,
      IMAGE_PATHS.POSTS.POST_2,
      IMAGE_PATHS.POSTS.POST_8,
    ],
    likes: 256,
    comments: 32,
    liked: false,
  },
  {
    id: "f2",
    nickname: "光影捕手",
    school: "清华大学",
    timeText: "2 小时前",
    tag: "人像写真",
    content: "夕阳下的校园，氛围感拉满～",
    images: [
      IMAGE_PATHS.CIRCLE_COVERS.PHOTO,
      IMAGE_PATHS.CIRCLE_COVERS.MUSIC,
      IMAGE_PATHS.CIRCLE_COVERS.TRAVEL,
    ],
    likes: 128,
    comments: 18,
    liked: true,
  },
  {
    id: "f3",
    nickname: "老鹰视觉",
    school: "复旦大学",
    timeText: "3 小时前",
    tag: "器材交流",
    content: "最近入手了新镜头，分享一下使用感受～",
    images: [
      IMAGE_PATHS.CIRCLE_COVERS.PHOTO,
      IMAGE_PATHS.CIRCLE_COVERS.FOOD,
      IMAGE_PATHS.CIRCLE_COVERS.READING,
    ],
    likes: 89,
    comments: 12,
    liked: false,
  },
]);

/**
 * R12-L04-D08（P0 · 假好友计数行）：原 FRIEND_AVATAR_POOL + friendAvatars（按圈 id
 * 字符码对 3 张公共头像取模，无门控的「编造好友脸」）与 friendJoinedCount（读
 * friendJoinedCount 估算列；real 无真值时才退 0，mock 按 id 哈希编 5~12）已整块删除，
 * 模板 :551 起的展示行同批撤下——与 topics.vue:556-558（R11-L04-D01）同口径。
 * 该字段真身是 estimateFriendJoinedCount()（memberCount/1000 四舍五入夹 [3,99]，
 * RealCircleService.java:187-195），与「我的好友里有谁加入了这个圈」无关；
 * 按 §12.4 合法形态之二处置：没有真相源的内容整块撤下、降级为不承诺，不接替代表达式。
 *
 * 缺列登记（沿用 topics.vue:269-283 在册项，要恢复这一行时需后端新增）：
 * 以 viewer 为锚的真实好友-圈子加入统计（friends ⋈ circle_members 关联计数）
 * + 好友头像 id 列；而不是由 memberCount 估算的 friendJoinedCount。
 */

/**
 * ISO 时间 → 相对时间文案（x 分钟前 / x 小时前 / x 天前 / 日期）。
 * 后端 createdAt 为 "yyyy-MM-ddTHH:mm:ss"，无时区后缀按本地时区解析。
 */
function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
  if (diff < MIN) return "刚刚";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} 分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 圈内真实话题 → 动态 feed（2026-09-12：对齐理想图信息结构，替换原纯 mock）。
 *  MP-R1-CIRCLEHOME-001（2026-09-20）：改存响应式 ref —— 原 computed 每次重映射生成
 *  非响应式普通对象，toggleLike 原地修改不触发重渲染（点赞后计数不变、爱心不变色）。 */
const { currentTopics } = storeToRefs(circleStore);
const realFeed = ref<FeedItem[]>([]);
watch(
  [currentTopics, circleId],
  () => {
    realFeed.value = currentTopics.value
      .filter((tp) => !circleId.value || tp.circleId === circleId.value)
      .map((tp) => ({
        id: tp.id,
        nickname: tp.author?.name || "圈友",
        avatar: resolveMediaUrl(tp.author?.avatar || ""),
        timeText: relativeTime(tp.createdAt),
        title: tp.title,
        content: tp.content,
        images: (tp.images ?? []).slice(0, 3).map((img) => resolveMediaUrl(img)),
        // 2026-10-28：后端已补 likeCount/likedByMe，真实 feed 恢复点赞位；
        // 旧数据/未下发时仍为 undefined，模板据此隐藏。
        likes: tp.likeCount,
        liked: tp.likedByMe,
        comments: tp.replyCount ?? 0,
      }));
  },
  { immediate: true }
);

/** 展示列表：真实话题优先，空/失败回退本地演示数据（骨架不空屏）。
 *  MP-R4-CIRCLEHOME-01：real 模式未知圈不回退演示动态（见 isUnknownCircle）。
 *  MP-R1-CIRCLEHOME-001：real 模式已知圈子暂无话题时同样不回退演示动态
 *  （原 IA-CIRCLEHOME-01 只修未知圈一半——真实圈空 feed 也渲染假校名/假点赞），
 *  空 feed 走空态；演示回退仅 mock 模式保留。 */
const displayFeed = computed<FeedItem[]>(() => {
  if (isUnknownCircle.value) return [];
  if (realFeed.value.length > 0) return realFeed.value;
  return useMock() ? feedItems.value : [];
});

/** R13-L04-D07：hero 话题直达 chips——displayFeed（真实话题优先）里取前 4 条有标题的话题，
 *  标题截 12 字防 chips 行被超长话题名撑爆；无标题/无数据 ⇒ 空数组 ⇒ 整行不渲染。 */
const heroTopicChips = computed<FeedItem[]>(() =>
  displayFeed.value
    .filter((item) => Boolean(item.title))
    .slice(0, 4)
    .map((item) => ({
      ...item,
      title: item.title && item.title.length > 12 ? `${item.title.slice(0, 12)}…` : item.title,
    })),
);

onLoad((query) => {
  if (query?.circleId) {
    circleId.value = String(query.circleId);
  }
  // store 为空时补拉（复用列表页韧性逻辑：登录态/mock 判定由 store 内部处理）。
  // R10-P1-001：落定前 isUnknownCircle 恒 false（骨架态），防止冷启动误判「圈子不存在」。
  if (circles.value.length === 0 && !circleStore.loading) {
    circleStore
      .fetchCircles()
      .catch(() => {
        // 拉取失败：落定后走未知圈空态（与既有失败表现一致），不阻塞渲染
      })
      .finally(() => {
        circlesFetchSettled.value = true;
      });
  } else if (circleStore.loading) {
    // 列表页等前置页已在拉取：等本次拉取落定再判定，避免空列表窗口期误判
    const stopWatch = watch(loading, (pending) => {
      if (!pending) {
        circlesFetchSettled.value = true;
        stopWatch();
      }
    });
  } else {
    circlesFetchSettled.value = true;
  }
  // 动态 feed：真实圈内话题（失败/空回退本地演示数据，不阻塞渲染）
  // 分享直达时 circleId 可能为空——仅在有真实圈 id 时拉取，避免 mock 圈 id 打到后端 404
  if (circleId.value) {
    circleStore.fetchTopics(circleId.value, 1).catch(() => {
      // store 内部已置 errorMessage；本页静默回退 mock feed
    });
    circleStore.fetchCircleMeta(circleId.value)
      .then((meta) => { circleMeta.value = meta; })
      .catch(() => { /* meta 失败时标签/公告不渲染，不影响 feed */ });
  }
});

// 分享卡片：圈名 + 封面
onShareAppMessage(() => ({
  title: circle.value.name,
  path: `${ROUTES.CIRCLES.HOME}?circleId=${circle.value.id}`,
}));

/**
 * 成员数格式化（1.2w / 3.4k / 原值，与兴趣圈列表页同规则）
 */
function formatMemberCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}w`;
  }
  // R21：对齐理想图（8,932 精确千分位），不用英文 k 单位
  if (count >= 1000) {
    return count.toLocaleString("en-US");
  }
  return String(count);
}

/** 热门徽章：成员数 ≥ 1w 展示（与列表页阈值一致） */
const isHot = computed(() => circle.value.memberCount >= 10000);

/**
 * 返回上一页；无栈时（分享直达）回兴趣圈列表
 */
function goBack(): void {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    openAppPath(ROUTES.CIRCLES.INDEX);
  }
}

/**
 * 加入 / 退出圈子（复用 store 真实接口）
 * MP-R1-REQ20-006：补 isJoining 防连点守卫——mock 毫秒级返回下快击×5 会交替
 * join/leave 造成成员数与按钮态抖动，real 下对 POST/DELETE 连发 5 次请求
 * （对齐全站 isSubmitting 惯例）
 */
const isJoining = ref(false);
async function toggleJoin(): Promise<void> {
  if (isJoining.value) return;
  isJoining.value = true;
  try {
    if (joined.value) {
      await circleStore.leaveCircle(circle.value.id);
    } else {
      await circleStore.joinCircle(circle.value.id);
    }
  } catch (e) {
    // MP-R1-CIRCLES-001：store 只置 errorMessage 后 rethrow，从不出 toast——补用户可见反馈
    uni.showToast({
      title: e instanceof Error && e.message ? e.message : t("apiErrors.operationFailed"),
      icon: "none",
    });
  } finally {
    isJoining.value = false;
  }
}

/**
 * 查看全部话题（保留原话题列表链路）
 */
function goToTopics(): void {
  openAppPath(`${ROUTES.CIRCLES.TOPICS}?circleId=${circle.value.id}`);
}

/**
 * 去圈内发帖（跳发布话题页）
 */
function goToPostTopic(): void {
  openAppPath(`${ROUTES.CIRCLES.POST_TOPIC}?circleId=${circle.value.id}`);
}

/**
 * 点赞（本地态翻转 —— TODO(后端): 点赞接口回填）
 * R11-L04-D14：真实数据没有点赞列，item.likes 缺省时点赞位不渲染，本函数也不会被调到；
 * 这里保留守卫，避免将来接线时对 undefined 做 += 得到 NaN。
 */
async function toggleLike(item: FeedItem): Promise<void> {
  if (item.likes === undefined) return;
  const nextLiked = !item.liked;
  const previousLikes = item.likes;
  item.liked = nextLiked;
  item.likes += nextLiked ? 1 : -1;
  try {
    const result = await circleStore.toggleTopicLike(item.id, nextLiked);
    item.liked = result.liked;
    item.likes = result.likeCount;
  } catch (_e) {
    item.liked = !nextLiked;
    item.likes = previousLikes;
    uni.showToast({ title: t("apiErrors.operationFailed"), icon: "none" });
  }
}

/**
 * 动态卡 more 图标操作菜单。
 * MP-R1-J20-004/MP-R1-REQ20-004：该图标此前无任何 @tap 处理器，点击零反馈（死按钮）；
 * 补 ActionSheet（复用页内既有链路：查看全部话题 / 去圈内发帖）。
 */
function onFeedMore(): void {
  uni.showActionSheet({
    itemList: [t("circle.home.viewAllTopics"), t("circle.home.postInCircle")],
    success: (res) => {
      if (res.tapIndex === 0) goToTopics();
      else if (res.tapIndex === 1) goToPostTopic();
    },
    fail: () => {
      // 用户取消：无需处理
    },
  });
}

/**
 * 动态卡点击 → 话题详情（2026-09-12：真实话题可进入详情互动）。
 * MP-R1-CIRCLEHOME-002（2026-09-20）：去掉「纯数字 id」白名单——原白名单把
 * mock 标准圈话题 id（如 "photo-topic-1"）与数字后端 id 之外的一切都静默拦下，
 * 卡片点击无响应。现对齐 topics.vue goToDetail：非空 id 直接跳详情
 * （详情页有完整的「话题不存在」降级态兜底）。
 */
function openFeedDetail(item: FeedItem): void {
  if (!item.id) return;
  openAppPath(`${ROUTES.CIRCLES.TOPIC_DETAIL}?topicId=${encodeURIComponent(item.id)}`);
}

/**
 * Tab 文案（成员 tab 拼接人数）
 */
/**
 * Tab 文案（成员 tab 拼接人数，与效果图「成员 1.2w」一致）
 */
function tabLabel(key: (typeof TAB_KEYS)[number]): string {
  if (key === "members") {
    return `${t(TAB_LABEL_KEYS.members)} ${formatMemberCount(circle.value.memberCount)}`;
  }
  return t(TAB_LABEL_KEYS[key]);
}
</script>

<template>
  <!-- MP-R4-CIRCLEHOME-01：real 模式缺参/无效圈 id → 真实空态（不再静默渲染演示圈+演示动态） -->
  <view v-if="isUnknownCircle" class="circle-home" :style="menuStyleVars">
    <view class="circle-notfound">
      <image class="circle-notfound__mascot" :src="resolveMediaUrl(NOT_FOUND_MASCOT)" mode="aspectFit" />
      <text class="circle-notfound__title">圈子不存在或已解散</text>
      <text class="circle-notfound__desc">去看看别的圈子吧</text>
      <!-- R1-L05-D07：补 role/aria-label（对齐同包 tag-posts.vue:302 等返回按钮写法） -->
      <view
        class="circle-notfound__btn press-feedback"
        hover-class="press-feedback--active"
        role="button"
        :aria-label="t('common.backAria')"
        @tap="goBack"
      >
        <!-- R1-L05-D04：「返回」走既有 common.back（标题/描述两条仍缺词条） -->
        <text class="circle-notfound__btn-text">{{ t("common.back") }}</text>
      </view>
    </view>
  </view>
  <!-- R10-P1-001：冷启动/深链拉取未落定 → 骨架态，禁止提前渲染演示圈或误判未知圈 -->
  <view v-else-if="!circlesFetchSettled" class="circle-home" :style="menuStyleVars">
    <view class="circle-home-loading">
      <SkeletonBlock variant="list" :rows="4" :label="t('common.loading')" />
    </view>
  </view>
  <view v-else class="circle-home" :style="menuStyleVars">
    <!-- 1. Hero 头图 -->
    <view class="hero">
      <image class="hero-img" :src="resolveMediaUrl(coverImage)" mode="aspectFill" />
      <view class="hero-actions">
        <view class="hero-btn" hover-class="hero-btn--active" @tap="goBack">
          <!-- R3：灰 chevron 在深色封面上不可见，改白色粗 chevron 文字 -->
          <text class="hero-btn-chevron">‹</text>
        </view>
        <view class="hero-actions-right">
          <!-- MP-R1-CIRCLEHOME-004（2026-09-20）：「分享」接通原生分享
               （button open-type="share" 触发本页 onShareAppMessage），不再是无事件死按钮 -->
          <button class="hero-btn hero-btn--share" open-type="share" hover-class="hero-btn--active" aria-label="分享圈子">
            <image class="hero-btn-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_SOCIAL.SHARE)" mode="aspectFit" />
          </button>
        </view>
      </view>
      <!-- 顶部渐隐遮罩（保证白色按钮可读） -->
      <view class="hero-mask" />
      <!-- R8-L04-D07（位置/构图）：理想图 圈子详情，摄影圈参考.png 实测封面（含叠字区）落在帧高
           27%（PIL 扫列：白 sheet 顶缘 y=504/1844），本页 hero 440rpx=222px/814px 同比例，
           缺陷卡「封面约占帧高 55%」是把 mockup 目测当实测（详见报告）。真正的病灶不是高度，
           而是圈名/简介/人数/加入被放进封面下方一张独立白卡、白 sheet 顶缘被抬到 y=174（21%）
           ⇒ 顶部构图与理想图相反。现补一条底部渐隐遮罩，把信息整体叠回封面下沿。
           遮罩取 rgba(0,0,0,.55→.82)：即便落在纯白像素上，合成值 ≤115/166 ⇒ 白字对比度
           4.75:1 ~ 7.2:1，恒 ≥4.5:1（不是目测，是按 0.45/0.28 反算）。 -->
      <view class="hero-scrim" />
      <!-- R8-L04-D07：圈子信息 + 标签 chips 并入 hero 作为封面底部叠层（原独立白卡 .info-card 移除，
           白 sheet 改由下方 .tabs 承担） -->
      <view class="hero-info">
        <view class="info-main">
          <image class="info-avatar" :src="resolveMediaUrl(coverImage)" mode="aspectFill" />
          <view class="info-body">
            <view class="info-title-row">
              <text class="info-name">{{ circle.name }}</text>
              <text v-if="isHot" class="info-hot">{{ t("circle.hotBadge") }}</text>
            </view>
            <text class="info-desc">{{ circle.description }}</text>
            <text class="info-meta">
              {{ formatMemberCount(circle.memberCount) }} {{ t("circle.memberUnit") }}
              · {{ circle.topicCount }} {{ t("circle.topicUnit") }}
            </text>
            <!-- R12-L04-D08（P0）：原「好友头像组 + 等 N 位朋友已加入」整行撤下，与
                 topics.vue:556-558（R11-L04-D01）同口径——头像组原由圈 id 字符码对 3 张
                 公共头像取模拼出（无 mock/real 门控），计数读 friendJoinedCount，而该字段
                 是 estimateFriendJoinedCount()（memberCount/1000 夹 [3,99]，
                 RealCircleService.java:187-195），不是好友加入数。没有真相源就不承诺，
                 不接任何替代表达式。恢复需后端新增「以 viewer 为锚的好友-圈子加入统计
                 + 好友头像 id 列」（缺列登记沿用 topics.vue:269-283 在册项）。 -->
          </view>
          <view class="info-join" hover-class="info-join--active" @tap="toggleJoin">
            <text class="info-join-text">
              {{ joined ? t("circle.joinedBtn") : t("circle.home.joinCta") }}
            </text>
          </view>
        </view>

        <!-- 3. 标签 chips（real 模式无圈标签数据时不渲染空容器，避免叠层下方留白块） -->
        <view v-if="circleTags.length" class="tag-row">
          <view v-for="tag in circleTags" :key="tag" class="tag-chip">
            <text class="tag-chip-text">{{ tag }}</text>
          </view>
        </view>

        <!-- R13-L04-D07（P1 · 需新建）：理想图要求的圈子话题直达 chips 行——原话题入口只收在
             feed 尾部「查看全部话题」，首屏（hero+页签）零话题入口，必须滚完整个 feed 才能进话题列表。
             数据接既有 circleStore.fetchTopics 真话题（与下方 feed 同源 displayFeed），取前 4 条
             有标题的；接口无数据 ⇒ 空数组 ⇒ 整行不渲染，不编常量话题名。点击走 openFeedDetail
             既有链路直达话题详情（非空 id 直跳，详情页有不存在降级态）。 -->
        <view v-if="heroTopicChips.length" class="topic-chip-row">
          <view
            v-for="chip in heroTopicChips"
            :key="chip.id"
            class="topic-chip"
            hover-class="topic-chip--active"
            hover-stay-time="120"
            @tap="openFeedDetail(chip)"
          >
            <text class="topic-chip-text"># {{ chip.title }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 4. 多 Tab 栏（R10-L03-D19：状态栏内衬只在吸顶后出现，见 script 的 tabsPinned） -->
    <view class="tabs" :class="{ 'tabs--pinned': tabsPinned }">
      <view
        v-for="key in TAB_KEYS"
        :key="key"
        class="tab-item"
        :class="{ 'tab-item--active': activeTab === key, 'tab-item--wide': key === 'members' }"
        @tap="activeTab = key"
      >
        <text class="tab-text">{{ tabLabel(key) }}</text>
        <view v-if="activeTab === key" class="tab-indicator" />
      </view>
    </view>

    <!-- 5. 置顶公告（real 模式无公告数据时整条不渲染，避免只剩空绿带） -->
    <view v-if="pinnedNotice" class="pinned-card">
      <text class="pinned-badge">{{ t("circle.home.pinnedBadge") }}</text>
      <text class="pinned-text">{{ pinnedNotice }}</text>
      <image class="pinned-arrow" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.ARROW_RIGHT)" mode="aspectFit" />
    </view>

    <!-- 6. 动态 feed（仅动态 tab；其余 tab 骨架空态） -->
    <template v-if="activeTab === 'posts'">
      <view v-if="displayFeed.length === 0" class="tab-empty">
        <text class="tab-empty-text">{{ t("circle.home.emptyTab") }}</text>
      </view>
      <view v-for="item in displayFeed" :key="item.id" class="feed-card" hover-class="feed-card--hover" @tap="openFeedDetail(item)">
        <view class="feed-author">
          <image class="feed-avatar" :src="resolveMediaUrl(item.avatar || IMAGE_PATHS.DEFAULT_AVATAR)" mode="aspectFill" />
          <view class="feed-author-body">
            <view class="feed-author-row">
              <text class="feed-nickname">{{ item.nickname }}</text>
              <view v-if="item.school" class="feed-school">
                <image class="feed-school-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG)" mode="aspectFit" />
                <text class="feed-school-text">{{ item.school }}</text>
              </view>
            </view>
            <text class="feed-time">{{ item.timeText }}</text>
          </view>
          <!-- MP-R1-J20-004/REQ20-004：补 @tap（原死按钮零反馈），.stop 防止冒泡到卡片 openFeedDetail 双触发 -->
          <image class="feed-more" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_V2.MORE_SVG)" mode="aspectFit" @tap.stop="onFeedMore" />
        </view>

        <view class="feed-content">
          <text v-if="item.tag" class="feed-tag"># {{ item.tag }}</text>
          <text v-if="item.title" class="feed-title">{{ item.title }}</text>
          <text class="feed-text">{{ item.content }}</text>
        </view>

        <view v-if="item.images.length > 0" class="feed-images">
          <image
            v-for="(img, idx) in item.images"
            :key="idx"
            class="feed-image"
            :src="resolveMediaUrl(img)"
            mode="aspectFill"
          />
        </view>

        <view class="feed-actions">
          <!-- R11-L04-D14（层级遮挡/假计数同族）：后端无点赞列 ⇒ 真实话题不再渲染「♥ 0」，
               只有 mock 演示数据（likes 有值）保留点赞位 -->
          <view v-if="item.likes !== undefined" class="feed-action" @tap="toggleLike(item)">
            <image
              class="feed-action-icon"
              :src="resolveMediaUrl(item.liked ? IMAGE_PATHS.ICONS_SOCIAL.LIKE_FILLED : IMAGE_PATHS.ICONS_SOCIAL.LIKE)"
              mode="aspectFit"
            />
            <text class="feed-action-text" :class="{ 'feed-action-text--active': item.liked }">
              {{ item.likes }}
            </text>
          </view>
          <!-- MP-R1-J20-004/REQ20-004：评论 action 补 @tap（原死按钮零反馈）——跳话题详情互动 -->
          <view class="feed-action" @tap.stop="openFeedDetail(item)">
            <image class="feed-action-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_SOCIAL.COMMENT)" mode="aspectFit" />
            <text class="feed-action-text">{{ item.comments }}</text>
          </view>
        </view>
      </view>

      <!-- 7. 查看全部话题（保留原 topics 链路） -->
      <view class="topics-link" hover-class="topics-link--active" @tap="goToTopics">
        <text class="topics-link-text">{{ t("circle.home.viewAllTopics") }}</text>
        <!-- R10-L03-D20：箭头原为 ICONS_COMMON.ARROW_RIGHT 位图（颜色写死在素材里，
             本车道不能改素材），卡片要求「箭头同色」⇒ 改用与文案同墨色的 CSS 字形 › ，
             与本页 hero 返回 ‹（:474）、hub.vue:254 同口径。 -->
        <text class="topics-link-chevron">&#x203A;</text>
      </view>
    </template>

    <view v-else class="tab-empty">
      <text class="tab-empty-text">{{ t("circle.home.emptyTab") }}</text>
    </view>

    <!-- 底部安全区占位（固定栏高度） -->
    <view class="bottom-placeholder" />

    <!-- 8. 底部固定栏 -->
    <view class="bottom-bar">
      <view v-if="!joined" class="bottom-join" hover-class="bottom-join--active" @tap="toggleJoin">
        <text class="bottom-join-text">{{ t("circle.home.joinCta") }}</text>
      </view>
      <view v-else class="bottom-post" hover-class="bottom-post--active" @tap="goToPostTopic">
        <text class="bottom-post-text">{{ t("circle.home.postInCircle") }}</text>
      </view>
      <view class="bottom-fab" hover-class="bottom-fab--active" @tap="goToPostTopic">
        <image class="bottom-fab-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.EDIT)" mode="aspectFit" />
      </view>
    </view>

    <!-- 加载态（store 拉取中且无数据） -->
    <view v-if="loading && circles.length === 0" class="loading-tip">
      <SkeletonBlock variant="list" :rows="3" :label="t('common.loading')" />
    </view>
  </view>
</template>

<style lang="scss" scoped>

.circle-home {
  min-height: 100vh;
  /* R1-L05-D03：删掉第二套硬编码底色，与内层空态同一 token */
  background-color: var(--c-bg-page, #eef7f2);
}

/* ===== MP-R4-CIRCLEHOME-01：未知圈空态 ===== */
.circle-notfound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* R1-L05-D10：100vh 未扣状态栏带（--statusbar 由本页根节点 menuStyleVars 注入） */
  min-height: calc(100vh - var(--statusbar, env(safe-area-inset-top)));
  /* R1-L05-D11：上下内衬受控对称，底部让开安全区（view 全局 border-box） */
  padding: 96rpx 96rpx calc(96rpx + env(safe-area-inset-bottom));
  background: var(--c-bg-page, #eef7f2);
}

.circle-notfound__mascot {
  /* R1-L05-D06：插画体量提到 280rpx（理想图 Hero 档） */
  width: 280rpx;
  height: 280rpx;
  /* R1-L05-D05：插画→标题落到 24rpx 档 */
  margin-bottom: 24rpx;
}

.circle-notfound__title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1a1e1c);
  margin-bottom: 12rpx;
}

.circle-notfound__desc {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #6b7571);
  /* R1-L05-D05：描述→按钮 40rpx 不成档，提到 48rpx（与组内 12rpx 拉开） */
  margin-bottom: 48rpx;
}

.circle-notfound__btn {
  /* R1-L05-D06：实高约 62rpx → 24rpx 上下内衬，落到主 CTA 档 88rpx */
  padding: 24rpx 72rpx;
  border-radius: 999rpx;
  background: var(--c-brand, #36c99a);
}

.circle-notfound__btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}

/* ===== 1. Hero ===== */
.hero {
  position: relative;
  /* R9-L04-D02（尺寸比例 P2）：520rpx=262px 时白 sheet 顶缘在帧高 814px 的 32.2%（实测帧
     subpackages__circles__circles__circle-home__top.png），理想图实测 27%（≈220px≈436rpx）
     ⇒ 上一轮为塞两行简介把封面抬高是过修正。本轮回落到 440rpx=220px=27.0%，与理想图同位；
     叠层可读性改由 .hero-scrim 加深承担，不再靠抬高整块封面给它腾地方。 */
  height: 440rpx;
}

.hero-img {
  width: 100%;
  height: 100%;
}

.hero-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 160rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
}

/* R8-L04-D07 / R9-L04-D01：封面底部渐隐遮罩，为叠层白字提供可读底。
   R9-L04-D01（可达性 P1）改前：高 360rpx=180px、α 在 42% 才到 .55，叠层顶端（帧 y≈153，
   即遮罩内 60/180=33% 处）只有 α≈0.44 ⇒ 白字对亮封面 3.0~3.4:1，圈名/首行简介 <4.5:1。
   现遮罩铺满整块封面（440rpx=220px，顶端 α=0 不压最亮部），并加陡：α 到 30%（y≈66）即 .62。
   叠层文字顶端在第 47.3%（220-116=104px / 220）⇒ α = .62+.24×(47.3-30)/70 = .679；
   即便叠层再长两行（顶端落到第 30% 处）α 仍 = .62。
   最坏底取纯白 255 像素：合成 255×(1-.679)=81.9≈82（L=0.08427）——
     圈名 #fff            ⇒ (1.05)/(0.13427) = 7.82:1
     简介 rgba(255,255,255,.92) 合成 241 ⇒ (0.9296)/(0.13427) = 6.92:1
     人数 rgba(255,255,255,.85) 合成 229 ⇒ (0.8335)/(0.13427) = 6.21:1
   全段 ≥6.2:1（实测封面底 130–143 时更高，>10:1）。 */
.hero-scrim {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 440rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.62) 30%, rgba(0, 0, 0, 0.86) 100%);
  pointer-events: none;
}

/* R8-L04-D07：原 .info-card 白卡改为贴在封面下沿的叠层（白底/圆角/投影全部去掉，
   通栏横向内衬 32rpx 与理想图一致）。 */
.hero-info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  padding: 0 32rpx 32rpx;
}

.hero-actions {
  position: absolute;
  /* R3：env 兜底改 --statusbar（开发者工具 env 恒 0，按钮被顶进状态栏/刘海） */
  top: calc(var(--statusbar, env(safe-area-inset-top)) + 16rpx);
  left: 24rpx;
  right: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 2;
}

.hero-actions-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-right: calc(var(--capsule-right, 7px) + 104px);
}

.hero-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-btn--active {
  background: rgba(0, 0, 0, 0.45);
}

.hero-btn-icon {
  width: 36rpx;
  height: 36rpx;
}

/* MP-R1-CIRCLEHOME-004：分享为原生 button（open-type="share"），复位默认样式以对齐 hero-btn */
.hero-btn--share {
  margin: 0;
  padding: 0;
  border: none;
  line-height: 1;
  font-size: 0;
}

.hero-btn--share::after {
  border: none;
}

/* R3：返回按钮白色 chevron（原灰色 back.svg 在深色封面上对比度不足） */
.hero-btn-chevron {
  font-size: 44rpx;
  line-height: 1;
  color: #ffffff;
  font-weight: 600;
  /* 视觉居中：chevron 字形偏上 */
  transform: translateY(-2rpx);
}

/* ===== 2. 信息叠层（R8-L04-D07：原 .info-card 白卡已并入 .hero-info 叠层，此段死样式随之删除） ===== */
.info-main {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}

.info-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 24rpx;
  /* R8-L04-D07：叠在封面上，加一圈半透明白描边把缩略图从照片里分出来（理想图同位白描边） */
  border: 3rpx solid rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
}

.info-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.info-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.info-name {
  font-size: 34rpx;
  font-weight: 600;
  /* R8-L04-D07：叠在封面上，圈名走白字（理想图「摄影圈」为纯白） */
  color: #ffffff;
}

.info-hot {
  font-size: 20rpx;
  color: #e6731c;
  background: #fdf0e3;
  border-radius: 8rpx;
  padding: 2rpx 12rpx;
}

.info-desc {
  font-size: 26rpx;
  /* R8-L04-D07：封面叠层，简介走白字 */
  color: rgba(255, 255, 255, 0.92);
  /* R2b-L05-D04（尺寸比例）：原 nowrap + ellipsis 把整句简介吃成一个省略号——
     理想图「用镜头记录生活的美好瞬间」是 12 字整句单行完整显示，而 real 档圈子简介
     普遍 15~20 字（如「分享光影与构图，一起扫街、看展、记录生活」），单行必然截断。
     改两行截断：短简介仍按理想图单行完整显示，长简介不再丢半句。
     （另一条建议「把简介压到 12 字内」属改数据文案，不在本页写集内。） */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  word-break: break-all;
}

.info-meta {
  font-size: 24rpx;
  /* R8-L04-D07：封面叠层，人数/动态行走白字 */
  color: rgba(255, 255, 255, 0.85);
}

/* R12-L04-D08：.info-friends / .info-friend-avatars / .info-friend-avatar /
   .info-friend-text 四条死样式随展示行整块删除（R12-L04-D08 P0 撤除，见模板注释） */

.info-join {
  flex-shrink: 0;
  align-self: center;
  /* R2b-L05-D03（颜色token）：实心主 CTA 底色不再取 --c-brand-500(#36C99A)。
     理想图 圈子详情，摄影圈参考.png 右上「加入圈子」取色实测 rgb(51,160,110)=#33A06E
     （缺陷卡记的 #30A070 同档），对品牌色阶做 CIE L*a*b* 距离：
     600(#2AAE83) dE=7.3 ｜ 700(#1F8D6A) dE=10.5 ｜ 500(#36C99A) dE=16.0 ｜ 800 dE=24.1
     ⇒ 单一来源档位是 --c-brand-600，500 档明度高、饱和度低一整档（整页 CTA 偏薄荷）。
     缺陷建议的「在 --c-brand-700 与 --c-brand-800 之间新增档位」不可执行（theme/ 为只读集），
     且按实测 700/800 都比 600 更远，故映射到既有最近档位令牌。按压态同步下移一档到 700。
     —— R10-L03-D17 / R10-L04-D12 覆盖（P1 · 颜色token ×2）：上面这条是「贴理想图取色」的
     色彩保真裁定，但 600 压白字只有 2.81:1（帧上 hero 钮实测 (42,174,131)），
     底部同色主 CTA 同值，两个主行动按钮的文案都不达标。可达性优先于取色保真，
     且 R9 已把全站共享主 CTA（BottomActionBar.vue:104）收进 --c-brand-800（白字 6.45:1），
     ⇒ 本页 hero 与底栏两处一起同步到 800，按压态随之从 700 下移到 900。
     卡里建议的 700（4.14:1）按已知机制 §2 仍不达 4.5，不采纳。 */
  background: var(--c-brand-800, #156B51);
  border-radius: 999rpx;
  padding: 18rpx 32rpx;
}

.info-join--active {
  background: var(--c-brand-900, #0B4A38);
}

.info-join-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #ffffff;
}

/* ===== 3. 标签 chips ===== */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 28rpx;
}

.tag-chip {
  /* R2b-L05-D01（样式半）：理想图这排胶囊是压在 Hero 实景照上的深色半透明描边玻璃片——
     PIL 量 圈子详情，摄影圈参考.png：胶囊底 rgb(29,40,39)、字为纯白。
     原 #f1f4f3 浅灰底 + #5d6c7b 深灰字是「白卡上的浅灰标签」口径，与理想图色彩层级相反。
     不自造色值，收进既有「图上徽标」成对令牌 --c-badge-on-image-bg / --c-badge-on-image-text
     （design-variables.scss:751-752，即 --c-overlay-strong + --c-overlay-text-primary），
     描边取同族 --c-overlay-border-light。
     注：本行数据侧仍受 real 档无圈标签字段限制（见 script 的 circleTags），此处只对齐样式。 */
  background: var(--c-badge-on-image-bg, rgba(15, 23, 42, 0.7));
  border: 1rpx solid var(--c-overlay-border-light, rgba(255, 255, 255, 0.18));
  border-radius: 999rpx;
  padding: 10rpx 24rpx;
}

.tag-chip-text {
  font-size: 24rpx;
  color: var(--c-badge-on-image-text, rgba(255, 255, 255, 0.95));
}

/* ===== 3b. 话题直达 chips（R13-L04-D07，压 hero 遮罩）===== */
.topic-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  /* 紧跟圈标签 chips 行之后，留一半行距区隔两组 */
  margin-top: 16rpx;
}

.topic-chip {
  /* 与上方 .tag-chip 同族「图上玻璃片」成对令牌（R2b-L05-D01 口径）：底
     --c-badge-on-image-bg（深色半透明）+ 白字 --c-badge-on-image-text，压遮罩仍 ≥4.5:1；
     不自造色值。 */
  background: var(--c-badge-on-image-bg, rgba(15, 23, 42, 0.7));
  border: 1rpx solid var(--c-overlay-border-light, rgba(255, 255, 255, 0.18));
  border-radius: 999rpx;
  padding: 10rpx 24rpx;
  max-width: 100%;
  transition: all var(--d-fast, 120ms) ease;
}

.topic-chip--active {
  background: var(--c-overlay-stronger, rgba(15, 23, 42, 0.85));
}

.topic-chip-text {
  font-size: 24rpx;
  color: var(--c-badge-on-image-text, rgba(255, 255, 255, 0.95));
}

/* ===== 4. Tab 栏 ===== */
.tabs {
  display: flex;
  align-items: center;
  background: #ffffff;
  /* R8-L04-D07：原「上方那块圆角面板」= 已删除的 .info-card 白卡，页签行现在就是白 sheet 本身
     ⇒ 大圆角与投影从 info-card 迁移到这里（理想图：白 sheet 顶缘两头上角为大圆角，压在封面叠层下方）。 */
  border-radius: var(--r-xxl, 32rpx) var(--r-xxl, 32rpx) 0 0;
  box-shadow: 0 -8rpx 32rpx rgba(31, 42, 37, 0.06);
  margin-top: 0;
  /* R2b-L05-D06 + R8-L04-D08（层级遮挡，P1）：吸顶此前 top 只扣 --statusbar，页签白底从 y=--statusbar
     起，其上方状态栏带（0..--statusbar）没有任何同色不透明底 ⇒ bottom 帧里帖子标题「微单镜头…」
     正文「预算 2000…」从该带透出、与系统时间「0:53」同高叠印。
     现把吸顶点位改到 top:0，并把状态栏高度收进 padding-top ⇒ 白底自屏幕 y=0 起铺满「状态栏带 + 页签行」，
     feed 恒从这条同色不透明头部带下方穿过，状态栏带不留裸内容。padding-top 在 top 帧（未吸顶、走文档流）
     只多出一段与页签同色的白内衬，不产生异色缝。
     R10-L03-D19 补充：这段状态栏内衬改为「只在吸顶态补」（见下方 .tabs--pinned）——
     顶帧未吸顶时它就是 hero 与页签之间一条多余的白空带。
     R12-L04-D09（P2 间距）：右侧胶囊预留（capsule-right + 104px ≈ 111px）同理拆到吸顶态——
     未吸顶时页签行在文档流里、位于 hero 下方，胶囊根本压不到它，恒定预留把五签压进左半边
     （real 帧「成员 1.2w」右缘只到 ≈71% 帧宽，理想图 ≈94%）。基态右衬回到与左衬对称的
     24rpx，吸顶后（页签带顶到屏幕顶、与胶囊同带）再补回预留 ⇒ 两态互不越界。 */
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 0 24rpx;
  box-sizing: border-box;
}

/* R10-L03-D19（间距 P2）：状态栏内衬从上面的 padding 里挪出来，只在吸顶态补。
 * 未吸顶时页签回到离白 sheet 顶缘 ≈48rpx（只剩 .tab-item 的 24rpx 上内衬 + 文案行高），
 * 顶帧那条 58px 纯白带（理想图同位 24px 的 2.4 倍）随之收回；
 * 吸顶后 padding-top = --statusbar 原样恢复 ⇒ R8-L04-D08 的状态栏带遮盖不受影响。
 * 本页 --statusbar 由 useMenuButtonRect 注入（:45），不是 env() 的 0（已知机制 §4）。
 * R12-L04-D09：右侧胶囊预留同批挪进吸顶态（见 .tabs 注释），未吸顶不再恒吃 111px。 */
.tabs--pinned {
  padding-top: var(--statusbar, env(safe-area-inset-top));
  padding-right: calc(var(--capsule-right, 7px) + 104px);
}

.tab-item {
  position: relative;
  /* R9-L04-D03：由 flex:1(=1 1 0% 等宽) 改为 1 1 auto，槽宽先按文案内容定基、再按权重分余量 */
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0 20rpx;
}

/* R9-L04-D03（位置 P2）：改前 5 个 flex:1(=1 1 0%) 等宽槽，页签行可用宽
   378 − 24rpx(12px 左) − (capsule-right 7px + 104px) ≈ 255px ⇒ 每槽 51px(≈101rpx)；
   末位「成员 1.2w」28rpx 下约 122rpx ⇒ 折行，该 tab 比其余四项高一整行、基线不齐。
   修法两件：①文案 nowrap；②.flex-basis 由 0 改 auto（先按内容定基），
   成员槽再给 flex-grow:2 ⇒ 基准宽合计≈188px、余量≈67px 按 1:1:1:1:2 分，
   成员槽≈62+22=84px(168rpx) > 122rpx 需求，其余四槽≈41px 仍容得下两字 56rpx。 */
.tab-item--wide {
  /* 注意必须写 2 1 auto：裸 flex:2 会同时把 basis 归 0，本槽又退回 min-content(62px) 贴死 */
  flex: 2 1 auto;
}

.tab-text {
  font-size: 28rpx;
  color: #5d6c7b;
  white-space: nowrap;
}

.tab-item--active .tab-text {
  /* R10-L03-D18 + R10-L04-D15（同一病灶的两条卡，P1 · 颜色token）：改前 --c-brand-500
     #36C99A 压白 = 2.06:1（帧上实测 (53,201,154)），而未选中项 #5d6c7b 反而已到 5.36:1
     ⇒ 选中态比未选还淡，第一眼分不出当前在哪个 tab。
     卡里建议的 brand-600（2.81）/brand-700（4.14）按已知机制 §2 的白底算档都到不了 4.5:1，
     故与 R9（BottomActionBar.vue:104）同口径取 --c-brand-800 #156B51 = 6.45:1；
     未选中 #5d6c7b（5.36:1）按卡要求保持不动。 */
  color: var(--c-brand-800, #156B51);
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  /* R10-L03-D18：下划线同色（非文本对比同样 2.06 → 6.45）。 */
  background: var(--c-brand-800, #156B51);
}

/* ===== 5. 置顶公告 ===== */
.pinned-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 24rpx 24rpx 0;
  background: var(--c-brand-50, #E8FAF3);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}

.pinned-badge {
  flex-shrink: 0;
  font-size: 20rpx;
  color: var(--c-brand-600, #2AAE83);
  background: #ffffff;
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}

.pinned-text {
  flex: 1;
  font-size: 24rpx;
  color: #1f8d6a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pinned-arrow {
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
}

/* ===== 6. 动态 feed ===== */
.feed-card {
  margin: 24rpx 24rpx 0;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
}

.feed-card--hover {
  background: #f9fbfa;
}

.feed-author {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.feed-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.feed-author-body {
  flex: 1;
  min-width: 0;
}

.feed-author-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.feed-nickname {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2a25;
}

.feed-school {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: var(--c-brand-50, #E8FAF3);
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}

.feed-school-icon {
  width: 22rpx;
  height: 22rpx;
}

.feed-school-text {
  font-size: 20rpx;
  color: var(--c-brand-600, #2AAE83);
}

.feed-time {
  display: block;
  margin-top: 6rpx;
  /* R2b-L05-D09（字号）：理想图时间行字高为昵称的 0.85 倍——PIL 量 圈子详情，摄影圈参考.png：
     昵称「阿辰」墨迹高 21px、时间「30 分钟前」18px，比值 0.857。
     本页昵称 .feed-nickname = 28rpx ⇒ 28 × 0.85 = 23.8rpx，落最近档位令牌 --fs-base(24rpx)。
     原写死 22rpx(≈11px CSS) 使「9-09」这行灰字明显小于昵称一档、接近不可读。
     缺陷建议的 var(--fs-sm, 26rpx) 不可照抄：--fs-sm 实值就是 22rpx（design-variables.scss:532），
     写了等于没写，26rpx 是 --fs-md，两者都不是 0.85 档。
     颜色同时从硬编码 #8595a4 收进 --c-text-tertiary，与同包 hub.vue 次级文字同一档。 */
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #6B7571);
}

.feed-more {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.feed-content {
  margin-top: 20rpx;
}

.feed-tag {
  display: block;
  font-size: 26rpx;
  color: var(--c-brand-500, #36C99A);
  font-weight: 600;
}

/* 2026-09-12：真实话题标题行（加粗深色，对齐理想图 feed 信息层级） */
.feed-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2a25;
}

.feed-text {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: #1f2a25;
}

.feed-images {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}

.feed-image {
  flex: 1;
  height: 190rpx;
  border-radius: 16rpx;
  background: #f1f4f3;
}

.feed-actions {
  display: flex;
  align-items: center;
  gap: 48rpx;
  margin-top: 24rpx;
}

.feed-action {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.feed-action-icon {
  width: 36rpx;
  height: 36rpx;
}

.feed-action-text {
  font-size: 24rpx;
  /* R10-L03-D21（P2 · 颜色token）：改前写死私有 #8595a4，压白 3.08:1（帧上字心 (158,172,191)），
     24rpx 次级数据低于 4.5:1。同页时间行（.feed-time）早已走 --c-text-tertiary，互动行是漏改项
     ⇒ 按卡片口径统一到同一条令牌 #6B7571（design-variables.scss:364 = $text-tertiary）= 4.76:1。 */
  color: var(--c-text-tertiary, #6B7571);
}

.feed-action-text--active {
  color: var(--c-brand-500, #36C99A);
}

/* ===== 7. 查看全部话题 ===== */
.topics-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin: 24rpx 24rpx 0;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
}

.topics-link--active {
  background: #f9fbfa;
}

.topics-link-text {
  font-size: 26rpx;
  /* R10-L03-D20 + R10-L04-D16（同一病灶两条卡，P1/P2 · 颜色token）：改前 --c-brand-500
     #36C99A 压白 = 2.06:1，入口淡到像说明文字，而它是该 tab 下唯一的「查看更多」出口。
     卡里建议的 600/700（2.81 / 4.14）按已知机制 §2 都不到 4.5:1 ⇒ 取 --c-brand-800 = 6.45:1。 */
  color: var(--c-brand-800, #156B51);
  font-weight: 600;
}

.topics-link-chevron {
  font-size: 28rpx;
  line-height: 1;
  color: var(--c-brand-800, #156B51);
}

/* 空 tab 骨架空态 */
.tab-empty {
  margin: 24rpx;
  padding: 96rpx 0;
  background: #ffffff;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-empty-text {
  font-size: 26rpx;
  color: #8595a4;
}

/* ===== 8. 底部固定栏 ===== */
.bottom-placeholder {
  height: calc(140rpx + env(safe-area-inset-bottom));
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  box-shadow: 0 -4rpx 16rpx rgba(31, 42, 37, 0.06);
}

.bottom-join,
.bottom-post {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 999rpx;
  /* R2b-L05-D03：底部同色主 CTA 与头部「加入圈子」同档（推导见 .info-join）。
     R10-L03-D17 / R10-L04-D12：与 hero 一起从 600（白字 2.81:1）下沉到 800（6.45:1），
     底栏这颗是该页唯一常驻主操作，同帧两处同步，视觉语义不变。 */
  background: var(--c-brand-800, #156B51);
}

.bottom-join--active,
.bottom-post--active {
  background: var(--c-brand-900, #0B4A38);
}

.bottom-join-text,
.bottom-post-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #ffffff;
}

.bottom-fab {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  /* R10-L04-D13（P2 · 可达性）：改前淡薄荷圆底 --c-brand-50 #E8FAF3 + 40rpx 铅笔，
     帧上铅笔最暗只到 #9AAABD，非文本对比仅 2.19:1 ⇒ 发帖入口找不到。
     卡里两条建议在本车道都落不了地：① 「换品牌绿线性铅笔」——仓内没有品牌绿铅笔素材，
     common/edit.png、common/pencil.svg、svg-spec/03-icons/edit.svg 的线色全是 #94A3B8
     （压 #E8FAF3 只有 2.37:1，压 brand-600 更糊），且硬规矩 5 不许造图；
     ② 「给 image 加 filter/蒙层」——mp-weixin 的 <image> 不吃 CSS filter，
     且 check-mp-image-styles 这类平台规则本就禁止在这类节点上堆渲染技巧。
     ⇒ 取等效可达方案：把圆底翻成深墨绿 --c-brand-900 #0B4A38，让既有浅色铅笔
     对底达到 (0.442922+0.05)/(0.052525+0.05) = 4.32:1 ≥ 3:1，图标形状与语义都不动。 */
  background: var(--c-brand-900, #0B4A38);
  border: 2rpx solid var(--c-brand-900, #0B4A38);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-fab--active {
  /* 按压态再深一档（--c-neutral-900 #1A1E1C），铅笔对底升到 7.11:1，
     保持「按下比常驻更深」的既有反馈语义。 */
  background: var(--c-neutral-900, #1A1E1C);
  border-color: var(--c-neutral-900, #1A1E1C);
}

.bottom-fab-icon {
  width: 40rpx;
  height: 40rpx;
}

/* 加载提示 */
.loading-tip {
  padding: 24rpx;
  display: flex;
  justify-content: center;
}

/* R10-P1-001：冷启动骨架整页容器 */
.circle-home-loading {
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 24rpx) 24rpx 24rpx;
}

.loading-tip-text {
  font-size: 24rpx;
  color: #8595a4;
}
</style>
