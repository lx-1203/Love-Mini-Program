<script setup lang="ts">


/**
 * 兴趣圈列表页
 * 展示所有兴趣圈，支持加入/退出操作，点击进入话题列表
 */
import { computed, ref, watch } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCircleStore } from "../../../stores/circle";
import { useSessionStore } from "../../../stores/session";
import { openAppPath } from "../../../utils/navigation";
// infra R2-00102: 路由路径常量化
import { ROUTES } from "../../../constants/routes";
import { IMAGE_PATHS } from "../../../config/images";
import { circleCoverFor } from "../../../config/circle-covers";
// R6-L04-D16/D18（规范文档 §1.6 铁律 3「裸 :src 一律包 resolveMediaUrl / SafeImage」）：
// 本页 5 处 :src 此前全部裸绑（含 circleCover() 的封面与好友头像组），
// real 档下 IMAGE_PATHS 已是后端 app-assets 绝对 URL、mock 档是包内 /static 路径，
// 只有经 resolveMediaUrl 才能两档同口径（并覆盖 /uploads/** 鉴权重写与 pexels 本地化兜底）。
import { resolveMediaUrl } from "../../../utils/media";
import AppShell from "../../../components/layout/AppShell.vue";
import PageStateContainer from "../../../components/common/PageStateContainer.vue";
// MP-R2-CIRCLES-INDEX-001（跨轮别名 MP-R1-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-001）：
// 全局 navigationStyle=custom（pages.json:36），右上角搜索钮必须实测微信原生胶囊间隙才不再靠猜值
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
// 2026-08-15：未登录时不发受保护请求，避免冷启动 401 雪崩
import { getToken } from "../../../services/http";
// 修复#3（第五轮 QA）：mock 模式无网络请求，直接加载本地 8 圈（dev-user 登录态可渲染）
import { useMock } from "../../../stores/helpers/use-mock";

const { t } = useI18n();
const circleStore = useCircleStore();
const sessionStore = useSessionStore();
const { circles, loading, errorMessage } = storeToRefs(circleStore);

/** MP-R2-CIRCLES-INDEX-001：--capsule-right（胶囊右缘间隙实测值）注入头部右槽节点，
 *  供 .circles-header__search 做胶囊避让；AppShell 的 .shell__header-right 是子组件私有
 *  节点、页面 scoped 样式命中不了，故注入点放在本页插槽自身的按钮节点上（同 circle-home.vue:46 口径） */
const { styleVars: menuStyleVars } = useMenuButtonRect();

/**
 * Task B2：从圈子 Tab 兴趣分类宫格带入的 category 参数（study/sports/music/movie/travel/game/food/reading）。
 * 携带该参数时，页面标题展示对应兴趣分类名称。
 */
const category = ref("");

/** 分类 ID → i18n key 映射（与圈子 Tab 兴趣分类宫格保持一致） */
const CATEGORY_KEY_MAP: Record<string, string> = {
  study: "circle.catStudy",
  sports: "circle.catSports",
  music: "circle.catMusic",
  movie: "circle.catMovie",
  travel: "circle.catTravel",
  game: "circle.catGame",
  food: "circle.catFood",
  reading: "circle.catReading",
};

/**
 * 分类 ID → 圈子名称关键词（页面级过滤，review #21：category 参数不再只改标题）。
 * TODO(后端): 兴趣圈列表支持按分类服务端过滤后，改由后端查询并移除本映射。
 * R4-00098：en-US 下圈子名（后端返回）不命中中文关键词即回退全量，
 * 现补充 i18n 标签兜底匹配（当前 locale 的分类名），并移除"过滤不中即回退全量"。
 */
const CATEGORY_KEYWORDS: Record<string, string> = {
  study: "读书",
  sports: "运动",
  music: "音乐",
  movie: "电影",
  travel: "旅行",
  game: "游戏",
  food: "美食",
  reading: "读书",
};

onLoad((query) => {
  if (query?.category) {
    category.value = String(query.category);
  }
  // 修复#3（第五轮 QA）：onLoad 直接拉取兴趣圈列表。
  // 未登录时按既有逻辑跳过（getToken 为空且非 mock，避免 401 雪崩）；
  // mock 模式（useMock=true）无网络请求，直接加载本地 8 圈 Style A 封面，
  // 保证 dev-user/mock 登录态下列表可渲染（原 onMounted 的 token 守卫在
  // "已登录但无 token"的 mock 会话下会拦截，导致空态）。
  if (getToken() || useMock()) {
    void circleStore.fetchCircles();
  }
});

// 2026-08-30 韧性修复：onLoad 时 token 尚未就绪（登录竞态/门槛重定向）会跳过拉取，
// 页面永久停在空态。onShow 补拉：已登录但列表为空且不在加载中时自愈。
onShow(() => {
  if ((getToken() || useMock()) && circleStore.circles.length === 0 && !circleStore.loading) {
    void circleStore.fetchCircles();
  }
});

/**
 * 2026-08-25 P0：页面标题在自定义 header slot 中硬编码 "兴趣<under>趣</under>圈"，
 * 此处删除原 pageTitle computed（由 CATEGORY_KEY_MAP 派生，已不再被模板引用）。
 * category / CATEGORY_KEYWORDS 仍由 filteredCircles 消费，保留。
 */

/**
 * 按 category 过滤后的兴趣圈列表（review #21：category 参数用于过滤而非仅改标题）。
 * R4-00098：匹配维度 = 中文关键词 ∪ 当前 locale 分类标签（en-US 下圈子名
 * 含 "Reading"/"Sports" 等英文名可命中）；无关键词映射的未知分类回退全量。
 * 有映射但无匹配时展示空列表（诚实过滤，不再静默回退全量误导用户）。
 */
const filteredCircles = computed(() => {
  if (!category.value) return circles.value;
  const keyword = CATEGORY_KEYWORDS[category.value];
  const labelKey = CATEGORY_KEY_MAP[category.value];
  if (!keyword && !labelKey) return circles.value;
  const label = labelKey ? t(labelKey) : "";
  const matched = circles.value.filter((c) => {
    if (keyword && c.name.includes(keyword)) return true;
    if (label && c.name.includes(label)) return true;
    // 圈子名同时含分类 ID 时也命中（如后端返回 "Reading Club"）
    if (c.name.toLowerCase().includes(category.value)) return true;
    return false;
  });
  return matched;
});

/**
 * 页面统一状态映射
 * - loading（且列表为空）→ loading
 * - errorMessage（且列表为空）→ error
 * - 列表为空 → empty
 * - 其他 → content
 */
const pageState = computed<"loading" | "error" | "empty" | "content">(() => {
  if (loading.value && circles.value.length === 0) return "loading";
  if (errorMessage.value && circles.value.length === 0) return "error";
  if (circles.value.length === 0) return "empty";
  return "content";
});

/**
 * 错误态展示文案（复用 store 中的 errorMessage，缺失时回退到通用文案）
 */
const errorText = computed(() => errorMessage.value || t("circle.loadFailedRetry"));

/**
 * MP-R2-CIRCLES-INDEX-006：未登录（real）时 onLoad 的登录门不发请求，列表恒空，
 * 空态不得把「未拉取」伪装成「无内容」——给登录引导文案 + 去登录 CTA
 * （同 pages/nearby/index.vue protectedBlocked 口径；mock 模式本地 8 圈可渲染，不引导）。
 */
const isGuest = computed(() => !sessionStore.isLoggedIn && !useMock());
const emptyText = computed(() =>
  isGuest.value ? t("circle.circlesEmptyLogin") : t("circle.circlesEmpty")
);
const emptyActionText = computed(() => (isGuest.value ? t("discover.card.goLogin") : ""));

/**
 * 重试：重新拉取兴趣圈列表
 */
function handleRetry() {
  void circleStore.fetchCircles();
}

/**
 * 点击兴趣圈，跳转到话题列表
 * @param circleId - 兴趣圈 ID
 */
/**
 * 点击兴趣圈，进入圈子主页（2026-09-02 W2 骨架补齐：对照「圈子详情，摄影圈参考.png」，
 * 主页内保留「查看全部话题」链接跳转原话题列表页，旧链路不断）
 * @param circle - 兴趣圈对象
 */
function goToCircleHome(circle: { id: string }) {
  // MP-R2-CIRCLES-INDEX-003：原「校园认证圈未认证拦截」分支为恒假死代码，已删除——
  //  1) 判据无数据源：后端 CircleView 无认证圈字段
  //     （apps/api/src/main/java/com/campuslove/api/discover/CircleController.java:182-196 全字段清单），
  //     interest_circles 表亦无对应列（database/flyway/sql/V2026.05.23.0005__create_interest_circles.sql:1-11，
  //     后续迁移仅补 category：V2026.08.10.0032），CircleItem.campusVerified 全仓零写入点
  //     → mock / real 模式恒 undefined，未认证用户点认证圈照样进入，属「假防护」；
  //  2) 即便有字段，原判据 `!userSession?.campusName`（有校园名）也不是认证口径，
  //     正口径是 guards/campus-gate.ts:51-55 isEducationVerified()。
  // 后端补字段后的接法：`if (circle.requireCampusVerification && !ensureCertified("education")) return;`
  // （浏览类操作本按 campus-gate.ts:60-61「浏览不受门控」的策略，需产品确认是否例外。）
  openAppPath(`${ROUTES.CIRCLES.HOME}?circleId=${circle.id}`); // infra R2-00102
}

/**
 * 2026-08-25 P1：goToDiscover（附近的人快捷入口）随顶部卡片一并移除。
 * 若后续需要"附近的人"入口，请重新接入（规格书 14 无此模块）。
 */

/**
 * 加入/退出兴趣圈
 * @param circleId - 兴趣圈 ID
 * @param isJoined - 当前是否已加入
 */
async function toggleJoin(circleId: string, isJoined: boolean) {
  try {
    if (isJoined) {
      await circleStore.leaveCircle(circleId);
    } else {
      await circleStore.joinCircle(circleId);
    }
  } catch (e) {
    // MP-R1-CIRCLES-001：store 的 joinCircle/leaveCircle 只 set errorMessage 后 rethrow、
    // 从不出 toast——列表非空时 errorMessage 无渲染出口，失败必须在此给用户可见反馈
    uni.showToast({
      title: e instanceof Error && e.message ? e.message : t("apiErrors.operationFailed"),
      icon: "none",
    });
  }
}

/**
 * 格式化成员数量
 */
function formatMemberCount(count: number): string {
  if (count >= 10000) {
    /* Task 28: 万单位中文化保留（中文特有数字单位，无需 i18n） */
    return `${(count / 10000).toFixed(1)}w`;
  }
  // R21：对齐理想图（8,932 精确千分位），不用英文 k 单位
  if (count >= 1000) {
    return count.toLocaleString("en-US");
  }
  return String(count);
}

/** 兴趣圈封面映射统一走 config/circle-covers（2026-09-12 收编本页副本为
 *  单一真相源 circleCoverFor，与圈子主页/首页兴趣推荐共用，杜绝图文不一致） */

/** 热门徽标阈值（成员数达到即显示「热门」） */
const HOT_THRESHOLD = 8000;

/** 2026-08-25 P0：快捷分类 tab（规格书 14.5）
 *  R8-L03-D24（需新建）：原第 7 项 key:"more" 是一枚 keyword:null 的横滚 chip（点它 = 回到全量，
 *  与「全部」重复、无独立功能），且在 bottom 帧被视口右缘裁断只露 26px——理想图 兴趣圈列表.png
 *  行末那枚带绿点的 ☰ 是「按条件筛选」入口，本页此前无落点。现删掉 more chip，改在行尾常驻一枚
 *  不参与横滚的筛选按钮（见模板 .circles-tabs-row + .circles-filter-btn）。 */
type QuickTab = "all" | "photo" | "travel" | "music" | "sports" | "food";
const QUICK_TABS: { key: QuickTab; labelKey: string; keyword: string | null }[] = [
  { key: "all", labelKey: "circle.tabAll", keyword: null },
  { key: "photo", labelKey: "circle.catPhoto", keyword: "摄影" },
  { key: "travel", labelKey: "circle.catTravel", keyword: "旅行" },
  { key: "music", labelKey: "circle.catMusic", keyword: "音乐" },
  { key: "sports", labelKey: "circle.catSports", keyword: "运动" },
  { key: "food", labelKey: "circle.catFood", keyword: "美食" },
];
const activeQuickTab = ref<QuickTab>("all");

/**
 * R8-L03-D24：筛选模式。只用既有前端字段（isJoined / memberCount），不向后端要新列——
 * 后端 CircleView 无「排序 / 条件筛选」入参（见 index.vue:177-185 记的字段清单），
 * 故筛选在前端做，避免编造后端数据。
 */
type FilterMode = "all" | "joined" | "popular";
const FILTER_LABELS = ["全部圈子", "只看已加入", "按人数排序"] as const;
const filterMode = ref<FilterMode>("all");
function openFilter() {
  uni.showActionSheet({
    itemList: [...FILTER_LABELS],
    success: (res) => {
      filterMode.value =
        res.tapIndex === 1 ? "joined" : res.tapIndex === 2 ? "popular" : "all";
    },
  });
}

/** 按 quick tab + 筛选模式过滤后的列表（与 category query 互不干扰） */
const tabFilteredCircles = computed(() => {
  let list = filteredCircles.value;
  if (activeQuickTab.value !== "all") {
    const tab = QUICK_TABS.find((t) => t.key === activeQuickTab.value);
    if (tab?.keyword) list = list.filter((c) => (c.name || "").includes(tab.keyword!));
  }
  if (filterMode.value === "joined") {
    list = list.filter((c) => c.isJoined);
  } else if (filterMode.value === "popular") {
    list = [...list].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
  }
  return list;
});


/**
 * 2026-08-25 P0：等 N 位朋友已加入的头像与计数（规格书 14.6）
 *
 * MP-R2-CIRCLES-INDEX-002（矩阵另以 MP-R1-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-002 记同病灶）：
 * 原实现无条件按 circleId 字符哈希推导 5~12，real 模式同样伪造，且与圈子主页不同源
 * → 同一圈子在列表页与主页数字不一致。现统一为「后端字段优先」口径（同 circle-home.vue:207-215，
 * 该口径由 MP-R1-CIRCLEHOME-003 定案）：
 *  1) 后端字段有值即用：CircleView.friendJoinedCount（CircleController.java:182-196 下发，
 *     RealCircleService.estimateFriendJoinedCount 按 memberCount/1000 限定 [3,99]，
 *     经 stores/circle.ts:90 mapToCircleItem 映射进 CircleItem.friendJoinedCount）；
 *  2) real 模式缺字段 → 0 → 整行不渲染：宁缺这行也不展示伪造的社交证明；
 *  3) mock 模式演示集 stores/circle/mock-data.ts 未定义该字段（该文件不在本泳道写集，
 *     已登记「建议为 14 个 mock 圈补 friendJoinedCount」以便 mock 也走字段驱动），
 *     过渡期按圈 id 稳定种子推导 5~12，与主页同式，保证两页 mock 数字始终一致。
 * 头像池与主页同源（IMAGE_PATHS.PEOPLE.AVATAR_1~3 + 同种子规则）：原 AVATARS.AVATAR_1~4
 * 取模与主页是两组不同图，是「两页不同源」的另一半。好友头像本体后端无字段（需契约变更，
 * 见 QA 报告），此处仅作规格书 14.6 的装饰性头像组，不指向任何真实用户。
 */
const FRIEND_AVATAR_POOL = [
  IMAGE_PATHS.PEOPLE.AVATAR_1,
  IMAGE_PATHS.PEOPLE.AVATAR_2,
  IMAGE_PATHS.PEOPLE.AVATAR_3,
];
/** 圈 id → 稳定种子（与 circle-home.vue:199/213 同式，保证两页 mock 取到同头像同数字） */
function circleIdSeed(circleId: string): number {
  return (circleId || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}
function friendAvatars(circleId: string): string[] {
  const seed = circleIdSeed(circleId);
  return [
    FRIEND_AVATAR_POOL[seed % 3] ?? IMAGE_PATHS.DEFAULT_AVATAR,
    FRIEND_AVATAR_POOL[(seed + 1) % 3] ?? IMAGE_PATHS.DEFAULT_AVATAR,
    FRIEND_AVATAR_POOL[(seed + 2) % 3] ?? IMAGE_PATHS.DEFAULT_AVATAR,
  ];
}
function friendJoinedCount(circle: { id: string; friendJoinedCount?: number }): number {
  const raw = circle.friendJoinedCount;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (!useMock()) return 0;
  return 5 + (circleIdSeed(circle.id) % 8);
}

/** 2026-08-25 P0：返回上一页（自定义 header slot 使用） */
function goBack() {
  uni.navigateBack({ delta: 1 }).catch(() => {
    uni.switchTab({ url: "/pages/home/index" }).catch(() => {
      uni.reLaunch({ url: "/pages/home/index" });
    });
  });
}

/** 点击搜索 → 跳搜索页（规格书 14.4 目标）。
 * MP-R1-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-REQ1：原实现是 toast 占位死胡同——
 * 与 nearby/village 入口的 ROUTES.SEARCH 接线口径对齐，搜索目标闭环 */
function goSearch() {
  openAppPath(ROUTES.SEARCH);
}

/** 未登录引导：跳登录页（MP-R2-CIRCLES-INDEX-006，同 pages/nearby/index.vue:238 口径） */
function goLogin() {
  openAppPath(ROUTES.LOGIN);
}

const circleCover = circleCoverFor;

/**
 * R2b-L04-D11（文案）：理想图 兴趣圈列表.png 卡片标题为「摄影圈 / 旅行圈 / 音乐圈 / 运动圈 /
 * 美食圈 / 天文圈」，一律带「圈」后缀；数据源（CircleView.name）是「摄影 / 旅行 …」本体名，
 * 于是真机六张卡全部读作分类名而非圈子名。
 * 上一轮批次 R1-B29 记过这条文案轴（R1-L04-D11），但模板仍是 `{{ circle.name }}`，
 * 帧上无变化 ⇒ 判为「上一轮修得不对」，本轮在展示层真正落地。
 * 走展示层拼接而非改数据：圈子名是后端字段，改名会同时改到加入/搜索/主页等所有消费方。
 * endsWith 守卫，避免数据侧将来自带后缀时拼成「摄影圈圈」。
 */
function circleTitle(name: string): string {
  if (!name) return "";
  return name.endsWith("圈") ? name : `${name}圈`;
}

/**
 * R2b-L04-D19（文案）：理想图每张卡右侧描边胶囊内只有「加入」二字，
 * 词条 circle.joinBtn 值是「+ 加入」，多出的「+ 」把按钮撑得比理想图胖。
 * 词条文件不在本车道写集内，故在展示层剥除加号前缀（半角 + / 全角 ＋ 都覆盖）。
 */
function joinLabel(isJoined: boolean): string {
  if (isJoined) return t("circle.joinedBtn");
  return t("circle.joinBtn").replace(/^\s*[+＋]\s*/, "");
}

// 修复#3（第五轮 QA）：拉取逻辑已移入 onLoad（含 mock 放行），
// 原 onMounted 的 token 守卫在 mock 会话下会拦截导致空态，已移除避免重复请求。

// 2026-08-15：登录态变化后自动补拉（真实模式登录成功后兜底）
watch(
  () => sessionStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn && circles.value.length === 0) {
      void circleStore.fetchCircles();
    }
  }
);

// R4-00099：toggleJoin 已改为 @tap.stop 绑定（vue-tsc 可识别），
// 保留 defineExpose 无副作用，避免将来模板绑定方式变化导致 noUnusedLocals。
defineExpose({ toggleJoin });
</script>

<template>
  <AppShell
    variant="standard"
    bg-variant="gradient"
    :show-back="false"
    :tab-bar-safe="false"
    :fixed="true"
  >
    <!-- 2026-08-25 P0：自定义头部（返回 + 标题"趣"下划线 + 搜索）
         R2b-L04-D16（位置）：理想图 兴趣圈列表.png 顶部区里，副标题与分类 chip 行「与标题同属
         页头固定区」。原实现把 banner + tabs 写在 .circles-list 这个 scroll-view 内部
         （旧 index.vue:386 起），而 AppShell 的 .shell__header 才是唯一吸顶的那一层 ⇒
         bottom 帧里 ‹ 兴趣圈 🔍 还钉在顶上、分类行已整行滚出视口，滚动后无法切换分类，
         页头与筛选行被拆成两套吸顶行为。
         现把 banner + tabs 并入 #header 插槽（AppShell 已有 position:sticky + 状态栏内衬 +
         通栏底色），页头固定区一次到位，不需要再给 tabs 单独算一条 sticky top 魔数。
         搜索钮原在 #header-right 槽，槽体宽度会把并入的 chip 行挤窄，故一并移进标题行内，
         胶囊避让（margin-right）随节点一起搬过来。 -->
    <template #header>
      <view class="circles-header" :style="menuStyleVars">
        <view class="circles-header__row">
          <view
            class="circles-header__back press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('common.back')"
            @tap="goBack"
          >
            <text class="circles-header__back-icon">‹</text>
          </view>
          <text class="circles-header__title">兴<text class="circles-header__under">趣</text>圈</text>
          <view
            class="circles-header__search press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="'搜索'"
            @tap="goSearch"
          >
            <image class="circles-header__search-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.SEARCH)" mode="aspectFit" alt="" />
          </view>
        </view>
        <!-- 推荐提示（对齐理想图：标题下灰字副标题，无卡片/emoji 装饰） -->
        <view class="circles-banner">
          <text class="circles-banner__title">{{ t("circle.circlesSubtitle") }}</text>
        </view>
        <!-- 2026-08-25 P0：快捷分类 tab（规格书 14.5）
             R8-L03-D24：横滚 chips 与行末常驻筛选按钮并成一行——scroll-view 占 flex:1 横滚，
             按钮 flex-shrink:0 固定在行尾、不参与横滚（对齐理想图 兴趣圈列表.png 行末 ☰）。 -->
        <view class="circles-tabs-row">
          <scroll-view class="circles-tabs" scroll-x :show-scrollbar="false">
            <view class="circles-tabs__list">
              <view
                v-for="tab in QUICK_TABS"
                :key="tab.key"
                class="circles-tab"
                :class="{ 'circles-tab--active': activeQuickTab === tab.key }"
                role="tab"
                :aria-selected="activeQuickTab === tab.key ? 'true' : 'false'"
                @tap="activeQuickTab = tab.key"
              >
                <text class="circles-tab__text">{{ t(tab.labelKey) }}</text>
              </view>
            </view>
          </scroll-view>
          <!-- R8-L03-D24：按条件筛选入口（吸顶头内、行尾常驻）。已启用非「全部」筛选时右上角绿点提示。 -->
          <view
            class="circles-filter-btn press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="'筛选'"
            @tap="openFilter"
          >
            <image class="circles-filter-btn__icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.LIST)" mode="aspectFit" alt="" />
            <view v-if="filterMode !== 'all'" class="circles-filter-btn__dot" />
          </view>
        </view>

      </view>
    </template>
    <!-- 统一页面状态容器：loading / error / empty / content 四态切换 -->
    <PageStateContainer
      :state="pageState"
      :empty-text="emptyText"
      :empty-action-text="emptyActionText"
      :error-text="errorText"
      @retry="handleRetry"
      @empty-action="goLogin"
    >
      <template #default>
        <!-- 兴趣圈列表（R2b-L04-D16：banner + tabs 已上移到固定页头，这里只剩卡片流） -->
        <scroll-view class="circles-list" scroll-y :enhanced="true" :bounces="true" :show-scrollbar="false">
          <!-- 2026-08-25 P1：移除顶部"附近的人"绿色头部卡（规格书 14 无此模块，QA 反馈位置错误） -->

          <!-- 兴趣圈卡片 -->
          <view class="circles-card-list" role="list">
            <view
              v-for="(circle, index) in tabFilteredCircles" :key="circle.id"
              class="circle-card"
              :style="{ animationDelay: index * 60 + 'ms' }"
              @tap="goToCircleHome(circle)"
            >
              <!-- R6-L04-D16/D18：改前此处是裸绑 circleCover(circle.name)（未经 resolveMediaUrl）。
                   素材侧实测：摄影/旅行/音乐/运动命中的是 covers/circle-cover-*.jpg 四张，
                   盘上存在且后端 200（curl 实测），PIL 量得 meanS=0.112–0.142、meanLum=208–219，
                   而美食/阅读/宠物等走 circle-*.png，meanS=0.34–0.60、meanLum=69–147
                   ⇒ 帧上「前四张发白」不是没加载，是这四张素材本身是淡彩占位插画、与理想图
                   同位实拍图不对题。圈名→封面的映射在 config/circle-covers.ts（非本车道写集）。 -->
              <view class="circle-card__cover-wrap">
                <image class="circle-card__cover" :src="resolveMediaUrl(circleCover(circle.name))" mode="aspectFill" lazy-load alt="" />
              </view>

              <view class="circle-card__body">
                <view class="circle-card__name-row">
                  <!-- R2b-L04-D11：标题按理想图补「圈」后缀（展示层拼接，见 script 的 circleTitle） -->
                  <text class="circle-card__name">{{ circleTitle(circle.name) }}</text>
                  <view v-if="circle.memberCount >= HOT_THRESHOLD" class="circle-card__hot-badge">
                    <text class="circle-card__hot-text">{{ t("circle.hotBadge") }}</text>
                  </view>
                </view>
                <text class="circle-card__desc">{{ circle.description }}</text>
                <view class="circle-card__meta">
                  <image class="circle-card__meta-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.GROUP)" mode="aspectFit" alt="" />
                  <!-- R6-L04-D15（文案 P3）：理想图逐字为「1.2w 人加入 · 362 条动态」，
                       R3 那轮为了躲省略号把动词删成「1.2w 人」，语义丢失（"人"≠"已加入的人"）。
                       词条 circle.cardStats（zh-CN.ts:3755）值里就没有「加入」二字，而 i18n/** 不在
                       本车道写集内 ⇒ 改用同包 circle-home.vue:499-500 已在用的 memberUnit+topicUnit
                       组合口径（同字段两页同构），宽度由 .circle-card__count 的 ellipsis 兜底，
                       不再靠删文案让位。 -->
                  <text class="circle-card__count">{{ formatMemberCount(circle.memberCount) }} {{ t("circle.memberUnit") }} · {{ circle.topicCount }} {{ t("circle.topicUnit") }}</text>
                </view>
                <!-- 2026-08-25 P0：等 N 位朋友已加入 + 头像组（规格书 14.6）
                     MP-R2-CIRCLES-INDEX-002：数字改由后端 friendJoinedCount 驱动；
                     real 模式取不到值时整行不渲染（原无条件展示哈希伪造数） -->
                <view v-if="friendJoinedCount(circle) > 0" class="circle-card__friends">
                  <view class="circle-card__friends-avatars">
                    <image
                      v-for="(av, i) in friendAvatars(circle.id)"
                      :key="i"
                      class="circle-card__friends-avatar"
                      :src="resolveMediaUrl(av)"
                      mode="aspectFill"
                      alt=""
                    />
                  </view>
                  <text class="circle-card__friends-text">{{ t("circle.friendsJoined", { count: friendJoinedCount(circle) }) }}</text>
                </view>
              </view>

              <!-- R4-00099：catchtap 在 H5 端不生效（点击"加入"会冒泡到卡片触发
                   goToTopics 进话题列表），改用 @tap.stop 阻止冒泡，全端一致 -->
              <view
                class="circle-card__action"
                :class="{ 'circle-card__action--joined': circle.isJoined }"
                role="button"
                :aria-label="joinLabel(circle.isJoined)"
                @tap.stop="toggleJoin(circle.id, circle.isJoined)"
              >
                <text class="circle-card__action-text">
                  {{ joinLabel(circle.isJoined) }}
                </text>
              </view>
            </view>
          </view>

          <view class="list-bottom-spacer" />
        </scroll-view>
      </template>
    </PageStateContainer>
  </AppShell>
</template>

<style scoped lang="scss">
/* MP-R2-CIRCLES-INDEX-008：原 .circles-state 族、.loading-spinner、.error-icon、
   .circles-empty 族、.discover-entry 族五段死样式已删（模板 0 命中；加载/错误/空三态
   由 PageStateContainer 自带样式渲染，「附近的人」头部卡已于 2026-08-25 P1 移除）。
   .circle-card__badge 认证徽标族按台账条件保留——是否接通属未决项。 */

/* ========== 推荐副标题（对齐理想图"找到与你志趣相投的人"） ========== */
/* MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-001（页内侧）：本页根节点是 AppShell，
   水平 gutter 由 .shell--standard 单源承担（AppShell.vue 现为判据裁定的 32rpx，
   = 令牌 --page-padding 实值；旧值 28rpx 与令牌差 4rpx，已由同一条判据收掉）。
   页面自身再叠 var(--sp-6)=24rpx → 正文实际缩进 52rpx，而自定义头部只有壳的 gutter，
   同页双基线。台账口径「水平内边距单一来源：由 AppShell 承担，页内层水平 padding 归零」，
   故 banner / card-list / tabs 三处活的横向内缩一并归零（纵向值不动）。
   理想图 素材/理想效果图/兴趣圈列表.png 实测卡框左缘约 25rpx、副标题与首枚 chip 约 37rpx，
   单源 gutter（原 28rpx／现判据裁定的 32rpx）落在这两点之间；原 52rpx 两处都偏宽。 */
.circles-banner {
  display: flex;
  align-items: center;
  margin: var(--sp-5) 0 0;
}

.circles-banner__title {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
}

/* ========== 兴趣圈列表 ========== */
.circles-list {
  flex: 1;
  overflow-y: auto;
}

.circles-card-list {
  /* MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-001：横向内缩归零，见 .circles-banner 上方说明 */
  padding: var(--sp-5) 0 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

@keyframes card-slide-up {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.circle-card {
  display: flex;
  align-items: center;
  /* MP-R1-CIRCLE-005（2026-09-20）：375px 下统计行被省略号截断——收窄卡内水平
     内边距（sp-7→sp-5）与列间距（sp-5→sp-4），让出统计行宽度 */
  gap: var(--sp-4);
  padding: var(--sp-6) var(--sp-5);
  /* MP-R1-CIRCLES-INDEX-002：--c-neutral-0 仅浅色主题定义（dark mixin 未覆盖），
     深色下卡底仍纯白而卡内文字 token 翻转为浅色 → 白底白字（对比度≈1.1:1）；
     改主题感知 token */
  background: var(--c-bg-container, #FFFFFF);
  border-radius: var(--r-lg);
  box-shadow: var(--s-card-soft);
  animation: card-slide-up var(--d-bounce, 400ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transition: transform var(--d-normal, 200ms) ease;
}

/* #ifdef H5 */
.circle-card:active {
  transform: scale(0.98);
}
/* #endif */

.circle-card__cover-wrap {
  position: relative;
  /* 2026-08-27：封面改为 1:1 定比容器（理想图正方形缩略），overflow 裁剪 + aspectFill 填满 */
  /* 贴合 素材/理想效果图/兴趣圈列表.png 的缩略图实测宽（PIL 量得 142.6rpx → 取 144rpx = 2×72）。
     注意这条不是布局修复：卡片是 align-items:center，正文高 ≈202rpx 已 ≥ 旧封面 200rpx，
     缩到 144 不带来任何行高收益，唯一效果是缩略图变小 —— 只为对参考图。 */
  width: 144rpx;
  height: 144rpx;
  border-radius: var(--r-md);
  overflow: hidden;
  flex-shrink: 0;
}

.circle-card__cover {
  width: 100%;
  height: 100%;
  display: block;
  /* mp-audit: R2 2026-09-03 —— object-fit 已删除（mp <image> 不响应），等比裁切由模板 mode="aspectFill" 承担 */
}

.circle-card__hot-badge {
  /* 就近成对声明（裁决 MP-R2-CIRCLES-INDEX-007）：不收编语义不同的 --c-badge-on-image-*，也不自造暗色令牌 */
  /* R6-L04-D14（P1）：深浅关系整个做反了。改前 bg=rgba(255,77,92,.92)（帧上实测填充 #FF5967）
     + 白字，是「高饱和红块压白字」；理想图 兴趣圈列表.png 同位角标实测底 #FEF0F1、字色 #F73C4F，
     即「浅粉底 + 红字」。现按理想图的反色关系落到 romance 色阶：
     --c-romance-50=#FFECEF（≈理想图 #FEF0F1）、--c-romance-700=#CC4A5F。
     字色取 700 而非 500（#FF6B81 压 #FFECEF 只有 2.41:1），实测 3.93:1，
     优于理想图自带的 #F73C4F/3.32:1，角标是 22rpx 小字、不该反向掉档。
     深色档 --c-romance-50 由 styles/tokens.scss:276 覆为 #2D1F24，成对关系仍成立。 */
  --hot-badge-bg: var(--c-romance-50, #FFECEF);
  --hot-badge-text: var(--c-romance-700, #CC4A5F);
  padding: 2rpx 14rpx;
  border-radius: 999rpx;
  background: var(--hot-badge-bg);
  border: 1rpx solid var(--c-romance-100, #FFD9DF);
  flex-shrink: 0;
}

.circle-card__hot-text {
  font-size: var(--fs-xs, 22rpx);
  color: var(--hot-badge-text);
  font-weight: 600;
}

.circle-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.circle-card__name {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 收尾轮：校园认证徽标 */
.circle-card__name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}

/* R8-L03-D19（位置）：改前 flex:1 让圈名吃掉整行剩余宽度，把「热门」角标推到行尾——
   实测圈名墨迹 x96..146、角标 x271..296，中间空出 125px(248rpx)，角标改与右侧「加入」按钮
   成一组，脱离圈名。理想图角标紧贴圈名右缘。改 flex:0 1 auto + max-width：
   角标按 .circle-card__name-row 的 gap:10rpx 紧跟圈名；圈名过长时才收缩并省略（min-width:0 生效前提）。 */
.circle-card__name-row .circle-card__name {
  flex: 0 1 auto;
  max-width: 320rpx;
  min-width: 0;
}

.circle-card__badge {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: var(--c-tint-green-soft, #E8F7EF);
  flex-shrink: 0;
}

.circle-card__badge-icon {
  width: 24rpx;
  height: 24rpx;
}

.circle-card__badge-text {
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-brand-700, #15803D);
  font-weight: 500;
}

.circle-card__desc {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  line-height: 1.5;
  /* R8-L03-D23（尺寸比例）：2026-08-27 改的两行截断让「描述占两行」的卡比邻居高出一截——
     bottom 帧实测五张卡 122/104/108/103/104px（首卡比邻卡高 18px=36rpx），列表节奏不齐。
     恢复单行 ellipsis：所有卡的描述行恒为一行文本高，卡高由「封面 144rpx / 正文四行」取大决定，
     逐卡一致。长描述退化为省略号（列表页本就只作预览，完整简介在圈子主页 .info-desc 两行展示）。 */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.circle-card__meta {
  display: flex;
  align-items: center;
  /* MP-R1-CIRCLE-005：间距 sp-2，配合缩小字号，375px 下统计行完整展示 */
  gap: var(--sp-2);
  /* 统计行恒单行（修复「2 条动/态」逐字断行，2026-08-29 视觉验收）
     R20：超宽时优雅省略，不再被「加入」按钮区硬裁切 */
  flex-wrap: nowrap;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.circle-card__meta-icon {
  width: 24rpx;
  height: 24rpx;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.circle-card__count {
  /* MP-R1-CIRCLE-005：fs-sm→fs-xs，375px 下「N 人 · N 条动态」不再被省略号截断 */
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  /* R21：省略号必须落在文本节点自身（meta 容器上的 text-overflow 对 flex 子项无效），
     否则统计行在「加入」按钮列被硬裁成半字 */
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.circle-card__divider {
  font-size: var(--fs-sm);
  color: var(--c-border-default);
}

.circle-card__action {
  /* MP-R1-CIRCLE-005：水平内边距 sp-5→sp-4，再让出统计行宽度 */
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-full);
  /* 理想图：浅绿描边胶囊按钮（背景透明、绿字），简洁清爽
     MP-R1-CIRCLES-INDEX-002：底色随主题翻转 */
  background: var(--c-bg-container, #FFFFFF);
  border: 2rpx solid var(--c-brand-500, #2DB98A);
  color: var(--c-brand-500, #2DB98A);
  flex-shrink: 0;
  transition: all var(--d-normal, 200ms) ease;
}

/* #ifdef H5 */
.circle-card__action:active {
  transform: scale(0.95);
}
/* #endif */

.circle-card__action--joined {
  background: var(--c-tint-green-soft, #E8F7EF);
  border: 2rpx solid var(--c-brand-light, #D1F5E7);
  color: var(--c-text-tertiary);
}

.circle-card__action-text {
  font-size: var(--fs-md);
  color: inherit;
  font-weight: 600;
  white-space: nowrap;
}

.circle-card__action--joined .circle-card__action-text {
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.list-bottom-spacer {
  height: 60rpx;
}

/* ===== 2026-08-25 P0：自定义头部（兴趣<under>趣</under>圈 + 搜索） ===== */
/* R6-L04-D12（P0）：原实现是「行 flex + align-items:center」，把 #header 插槽里的
   三个块（标题行 / 副标题 .circles-banner / chip 行 .circles-tabs）并排成一行。
   三个子项都没有显式宽度，于是各自被压到 min-content：CJK 文本可在字间断行，
   副标题「找到与你志趣相投的人」在帧上排成 x=163–175px（≈24rpx 一个字的列宽）、
   y≈95–214px 的竖排单字列；chip 行整体右移到 x=361rpx 起、只剩 3/7 枚可见。
   页头固定区的正确语义是「自上而下三段」，故改列方向并让子项撑满。 */
.circles-header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  flex: 1;
  min-width: 0;
}

/* R6-L04-D12 同因第二处：.circles-header__row 在改前**没有任何样式**
   （全文件仅模板 :382 引用它一次），三个子节点按块级流竖排
   （back 与 search 都是 display:flex 的块），于是搜索钮掉到标题下一行左侧；
   理想图 兴趣圈列表.png 是「‹ 兴趣圈 …………… 🔍」同一行、搜索钮在行右端。 */
.circles-header__row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  width: 100%;
  min-width: 0;
}

.circles-header__back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.circles-header__back-icon {
  font-size: 44rpx;
  /* MP-R1-CIRCLES-INDEX-002：硬编码 #333A37 在深色（--c-bg-container→#1A1F26）上
     对比度≈1.6:1 视觉消失，随主题 token 翻转 */
  color: var(--c-text-primary, #333A37);
  line-height: 1;
  font-weight: 500;
}

.circles-header__title {
  font-size: 44rpx;
  font-weight: 800;
  color: var(--c-text-primary, #1A1E1C);
  letter-spacing: 2rpx;
}

.circles-header__under {
  /* 2026-08-26 P1：V-06 趣下划线视觉重叠修复（P2 残留二次调优）。
     收窄下划线（6rpx → 3rpx）避免与"趣"字底画重叠；
     增加 padding-bottom 给下划线留出"漂浮"空间；
     字重 800 → 600 让"趣"字底部留白更清晰，避免与下划线连笔；
     第五轮 V-06：字距 0 → 2rpx + 左右 padding 2rpx，与"兴/圈"整体字距更协调。 */
  display: inline-block;
  border-bottom: 3rpx solid var(--c-brand, #36C99A);
  padding: 0 2rpx 8rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.circles-header__search {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--c-bg-surface, #F3FAF6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  /* MP-R2-CIRCLES-INDEX-001（跨轮别名 MP-R1-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-001）：
     全局 navigationStyle=custom，原生胶囊常驻右上（右缘间隙 --capsule-right≈7px + 本体 87px，
     纵向 statusBar+4 ~ +36px）。避让是必须的（此前无避让时放大镜被胶囊整体压住不可点），
     但避让量此前算多了 ⇒ R8-L03-D22（位置）：改前 margin-right = --capsule-right + 104px，
     104 = 胶囊本体 87 + 间隙 7 + 呼吸 10，而 --capsule-right 本身已是那 7px 间隙 ⇒ 间隙被计了两次，
     再加页头 gutter，实测按钮右缘距胶囊左缘 33~57px，落在导航带中段成为悬空元素（既不对齐标题左基线、
     也不贴右缘）。理想图 兴趣圈列表.png 放大镜在页头最右端。现把预留量收敛为胶囊本体足迹（87px）一份，
     不再叠加重复的间隙/呼吸 ⇒ 按钮右缘紧贴胶囊左缘（净空约 16px），锚定到右侧、不再悬空。
     --capsule-right 由 useMenuButtonRect 在本节点 :style 实测注入，测量前/非小程序端回退 7px。
     R6-L04-D12：本钮与 ‹/标题同处 .circles-header__row 一行，margin-left:auto 把它推到行右端。 */
  margin-left: auto;
  margin-right: calc(var(--capsule-right, 7px) + 87px);
}

.circles-header__search-icon {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-tertiary, #6B7571);
}

/* ===== 2026-08-25 P0：快捷分类 tab + 行尾筛选按钮 ===== */
/* R8-L03-D24：横滚 chips（flex:1）+ 常驻筛选按钮（flex-shrink:0）并成一行 */
.circles-tabs-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: var(--sp-2);
}

.circles-tabs {
  flex: 1;
  min-width: 0;
  /* MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-001：横向内缩归零（首枚 chip 与卡框同基线，
     尾部间距由 .circles-tabs__list 的 padding-right 承担），见 .circles-banner 上方说明 */
  padding: 0;
  margin-top: 0;
}

/* R8-L03-D24：行尾常驻筛选按钮（对齐理想图 兴趣圈列表.png 的 ☰ 圆钮 + 绿点）。
   尺寸/底色沿用同页 .circles-header__back 的圆形按钮口径（64rpx 圆 + 卡面底 + 细描边），
   不新造令牌。启用筛选时右上角一枚品牌绿实心点作状态提示。 */
.circles-filter-btn {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.circles-filter-btn__icon {
  width: 34rpx;
  height: 34rpx;
}

.circles-filter-btn__dot {
  position: absolute;
  top: 2rpx;
  right: 2rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: var(--c-brand-500, #36C99A);
  border: 2rpx solid var(--c-bg-container, #FFFFFF);
}

.circles-tabs__list {
  display: inline-flex;
  /* R6-L04-D13：改列方向后本行独占一行、自左 gutter 起（原被行 flex 挤到 x=361rpx 起、
     只露 3/7 枚）。间距与内衬各收 4rpx，使 6 枚文字 chip 在 750rpx 屏宽内
     （AppShell gutter 2×32rpx ⇒ 可用 686rpx）首屏全部露出，第 7 枚「更多」起横滚。 */
  gap: 12rpx;
  padding-right: 16rpx;
}

.circles-tab {
  flex-shrink: 0;
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  /* 非活跃分类 chips 浅灰胶囊底（对齐理想图，避免白底融入页面）
     R13：原取 --c-bg-page 与页面同色，胶囊完全不可见——改用卡片面底色
     R8-L03-D21（颜色token）：R13 选的 --c-bg-container 实测 #FFFFFF，与卡片底色逐字同值
     （色差 0，帧上仅靠 1rpx 边框区分）。改 --c-bg-surface：浅色档实测 #F3FAF6（R243 G250 B246），
     相对卡面 #FFFFFF 拉开一档浅灰绿（理想图同位实测 #F5F6F6 vs #FEFEFE，明度差约 10 级，同量级）；
     深色档由 tokens.scss:271 覆为 #222831，仍比卡面 --c-bg-container #1A1F26 亮一档，成对关系不反。 */
  background: var(--c-bg-surface, #F3FAF6);
  border: 1rpx solid var(--c-line, #EEF2F0);
  display: flex;
  align-items: center;
  justify-content: center;
}

.circles-tab--active {
  background: var(--c-brand, #36C99A);
  border-color: var(--c-brand, #36C99A);
}

.circles-tab__text {
  font-size: 26rpx;
  color: var(--c-text-primary, #222222);
  white-space: nowrap;
}

.circles-tab__icon {
  width: 30rpx;
  height: 30rpx;
  color: var(--c-text-primary, #222222);
}

.circles-tab--active .circles-tab__text {
  color: var(--c-neutral-0, #FFFFFF);
  font-weight: 700;
}

/* ===== 2026-08-25 P0：等 N 位朋友已加入 + 头像组 ===== */
.circle-card__friends {
  flex-wrap: nowrap;
  white-space: nowrap;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 6rpx;
  /* R20：行内文本省略生效前提（行自身宽度约束） */
  min-width: 0;
}

.circle-card__friends-avatars {
  display: flex;
  align-items: center;
}

.circle-card__friends-avatar {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  /* MP-R1-CIRCLES-INDEX-002：头像描边/占位底随主题翻转（原纯白描边+浅灰底深色下突兀） */
  border: 2rpx solid var(--c-bg-container, #FFFFFF);
  background: var(--c-neutral-100, #EEF2F0);
  margin-left: -10rpx;
  flex-shrink: 0;
}

.circle-card__friends-avatar:first-child {
  margin-left: 0;
}

.circle-card__friends-text {
  font-size: 22rpx;
  color: var(--c-text-tertiary, #9AA39F);
  /* R20：好友行单行省略，防止「等 N 位朋友已加入」被硬裁切 */
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
