<script setup lang="ts">


/**
 * 附近首页（v3 Nearby 冻结 · 01_nearby_home）
 * 分区顺序严格冻结：附近的人（含同城）→ 热门兴趣圈 → 校园圈 → 活动 → 附近动态。
 * 附近 = Explore：不出现速配入口、不使用滑动卡片核心交互。
 */
import { ref, computed, watch, onUnmounted } from "vue";
import { onLoad, onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import PostCard from "../../components/village/PostCard.vue";
import SkeletonBlock from "../../components/common/SkeletonBlock.vue";
import NearbySection from "../../components/nearby/NearbySection.vue";
// R8-L02-D04（需新建）：分区①「附近的人」在两张入口条下方补 §3.5 要求的距离/同城分段 + 人卡横滑。
// 人卡数据不另立真相源：取二级页 subpackages/discover-extra/nearby/people.vue:74 同一条路径
// （clientApi.getRecommendations + mapToDiscoverCard，距离口径 NEARBY_MAX_DISTANCE_KM=20），
// 头像走共享件 SafeImage（失败兜底默认头像），与 people.vue:224 同一口径。
import SafeImage from "../../components/common/SafeImage.vue";
// 2026-10-26（goal-2026-10-26 视觉对样·缺陷4-6）：右下角绿色「＋」发帖 FAB。
// 理想图 附近的首页.png 右下角有绿色圆形悬浮发布钮，本页此前只有页头「发动态」药丸一个入口。
// 复用既有全局组件 GlobalPublishFab（自述「全局发帖悬浮按钮」，此前仅 profile 页挂载；
// 组件内部自带 isPostPublishOpen 配置闸与展开动画），跳转走本页既有 goToPublishPost
// （与页头药丸同一落点 /subpackages/village/village/post），不新造链路。
import GlobalPublishFab from "../../components/common/GlobalPublishFab.vue";
import { clientApi } from "../../services/api";
import { mapToDiscoverCard, NEARBY_MAX_DISTANCE_KM } from "../../stores/discover/utils";
import type { DiscoverCard } from "../../stores/discover/types";
import { useVillageStore, type PostItem } from "../../stores/village";
import { useCircleStore } from "../../stores/circle";
import { circleCoverFor } from "../../config/circle-covers";
import { useSessionStore } from "../../stores/session";
import { useActivityStore } from "../../stores/activity";
// MP-R1-PAGES-NEARBY-INDEX-002：删除死链 peoplePreview/loadPeoplePreview 后，
// clientApi / mapToDiscoverCard / DiscoverCard / NEARBY_MAX_DISTANCE_KM 无引用，一并移除
import { useMock } from "../../stores/helpers/use-mock";
import { openAppPath, openUserProfile } from "../../utils/navigation";
import { showErrorToast } from "../../utils/error-toast";
import { ROUTES, SUBPACKAGE_ROUTES } from "../../constants/routes";
// MP-R1-PUBLISH-006：定位成功解析的城市持久化（publish 页「添加位置」读取展示）
import { STORAGE_KEYS } from "../../constants/storage-keys";
import { SCHOOLS, loadSchools, type School } from "../../config/schools";
// 第五轮：校园圈卡片统一浅绿背景 + 名字（coverUrl 上传后显示图片），不再使用渐变底色
import { useTabBar } from "../../composables/useTabBar";
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
import { IMAGE_PATHS } from "../../config/images";
// 2026-08-15：未登录时不发受保护请求，避免冷启动 401 雪崩
import { getToken } from "../../services/http";

// MP-R4-CONSOLE-02（2026-09-13 独立审查 IA-CONSOLE-02）：92 行调用 reportLocation
// 但本 import 漏了它 → 运行时 ReferenceError（用户授权定位后必现，定位上报链路断裂）
import { fetchCurrentLocation, buildLocationText, reportLocation } from "../../utils/location";
// R20（2026-09-08）：var(--statusbar, env(safe-area-inset-top)) 在模拟器为 0，标题行顶进状态栏
// （「发动态」与系统时间/胶囊同排叠压）→ JS 注入 statusBarHeight
import { useStatusBarHeight } from "../../composables/useStatusBarHeight";
// R9-L02-D01：胶囊实测矩形的底缘（getMenuButtonRect 是 useMenuButtonRect 内部同一个 API），
// 页头纵向避让必须按「胶囊底缘 + 12px」算，只按状态栏算会让 88rpx 页头行整条压进胶囊带。
import { getMenuButtonRect } from "../../compat";
// 同步自定义 TabBar 选中状态（tab 顺序：首页0/附近1/匹配2/消息3/我的4）
useTabBar(1);

const statusBarHeightPx = useStatusBarHeight();

/**
 * R9-L02-D01（层级遮挡）：页头行的纵向起点。
 *
 * 帧实测（real-f0677920 / pages__nearby__index__top）：胶囊 y≈48-74、x≈292-368；
 * 「发动态」药丸被同一条轴压进胶囊带——药丸上沿 y≈63 落在胶囊底缘 74 之上，白字顶部笔画
 * 被胶囊吃掉。原口径 paddingTop = statusBar + 12 ⇒ 页头行（88rpx=44px 高）从 statusBar+12
 * 起排、药丸垂直居中正好停在胶囊带上。:997 注释里「页头已在胶囊下方、横向缓冲属重复让位」
 * 的前提被本帧推翻：删掉的是横向 104px，纵向避让从未补上。
 *
 * 正确口径 = 胶囊实测底缘 + 12px（取不到胶囊时退标准胶囊：statusBar + 4 + 32）。
 * 底缘由 getMenuButtonRect() 实测；statusBar 由 useStatusBarHeight() 注入（env()/--statusbar
 * 在本运行档恒 0，不能写 CSS 变量）。
 */
const capsuleBottomPx = (() => {
  try {
    const rect = getMenuButtonRect();
    if (rect && rect.bottom > 0) return rect.bottom;
  } catch (_e) {
    // 低版本基础库无胶囊 API，走下面的标准胶囊兜底
  }
  return statusBarHeightPx.value + 4 + 32;
})();
const headerTopPadPx = computed(() => Math.max(statusBarHeightPx.value + 12, capsuleBottomPx + 12));

const { t } = useI18n();
const sessionStore = useSessionStore();
const activityStore = useActivityStore();
const circleStore = useCircleStore();
const villageStore = useVillageStore();
const { styleVars: menuStyleVars } = useMenuButtonRect();

// MP-R1-PAGES-NEARBY-INDEX-002：删除「附近的人」预览死链（peoplePreview/peopleLoading/
// peopleError/lastPeopleLoadFailedAt/loadPeoplePreview）——三个状态与加载函数仅在 script
// 内被引用，模板零渲染（分区①为静态入口卡），每次 onLoad/onShow/下拉刷新白发一次
// getRecommendations 请求、结果无人消费。分区①保持 v3 冻结版式的入口卡形态。

/**
 * MP-R1-PAGES-NEARBY-INDEX-001：受保护数据源拉取门。
 * real 模式下 /circles 与 /posts 均要求鉴权（SecurityConfig /api/v1/** authenticated），
 * 未登录发起必 401 → http 层 redirectToLogin 强踢登录页。mock 模式登录为本地模拟
 * 会话（getToken 恒空），需放行。与 32 行「未登录不发受保护请求」口径收敛为同一守卫。
 */
function canFetchProtected(): boolean {
  return useMock() || getToken().length > 0;
}

/** MP-R1-PAGES-NEARBY-INDEX-018：校园圈入口此前恒用静态 SCHOOLS，本页一次都没调用过
 *  config/schools.ts 的 loadSchools()（契约是「后端 /config/campuses 动态列表 + 本地静态只作初始渲染兜底」）。
 *  现在按该契约把列表放进 ref：静态表只当首帧兜底，onLoad/onShow 静默重拉，
 *  拉回空表或失败都保持现有值（loadSchools 内部已回退 SCHOOLS，这里再挡一层"空列表把入口打掉"）。 */
const schoolPool = ref<School[]>(SCHOOLS);
function refreshSchools(): void {
  void loadSchools().then((list) => {
    if (list.length > 0) schoolPool.value = list;
  });
}

/** R2b-L02-D06：校园圈封面兜底——coverUrl 缺失时改用真实校园实景素材（与 campus/hub 同引
 *  config/images.ts 的 IMAGE_PATHS.GENERATED 单一来源），不再退化为「白底 + 校名」空占位。
 *  仅引用已确认存在的既有素材常量，未新增/硬编码 /static 路径。 */
const CAMPUS_COVER: Record<string, string> = {
  pku: IMAGE_PATHS.GENERATED.CAMPUS_GATE_LANDMARK,
  thu: IMAGE_PATHS.GENERATED.CAMPUS_ARCH_LANDMARK,
  ruc: IMAGE_PATHS.GENERATED.CAMPUS_LAKE_PAVILION,
  fudan: IMAGE_PATHS.GENERATED.CAMPUS_PLAYGROUND,
  sjtu: IMAGE_PATHS.GENERATED.CAMPUS_NIGHT,
  tongji: IMAGE_PATHS.GENERATED.CAMPUS_CLASSROOM,
  zju: IMAGE_PATHS.GENERATED.CAMPUS_CAFETERIA,
  nju: IMAGE_PATHS.GENERATED.CAMPUS_RAIN,
  whu: IMAGE_PATHS.GENERATED.CAMPUS_GATE,
  sysu: IMAGE_PATHS.GENERATED.CAMPUS_LIBRARY,
  szu: IMAGE_PATHS.GENERATED.CAMPUS_LAKE,
};
function campusCoverFor(school: School): string {
  return school.coverUrl || CAMPUS_COVER[school.id] || IMAGE_PATHS.CIRCLE_COVERS.CAMPUS;
}

/** 校园入口（前 4 所）。R3：用户本校置顶（原固定取前 4 所，本校不在首屏，与定位文案自相矛盾）
 *  R2b-L02-D06：为每所兜底真实封面（coverUrl 缺失 → 本地校园实景）。 */
const schoolEntries = computed(() => {
  const pool = schoolPool.value;
  const myCampus = sessionStore.userSession?.campusName?.trim();
  let base: School[];
  if (!myCampus) {
    base = pool.slice(0, 4);
  } else {
    const mine = pool.find((s) => s.name === myCampus);
    const rest = pool.filter((s) => s.name !== myCampus);
    const mineEntry: School = mine ?? { id: `session-${myCampus}`, name: myCampus };
    base = [mineEntry, ...rest].slice(0, 4);
  }
  return base.map((s) => ({ ...s, coverUrl: campusCoverFor(s) }));
});

// 第五轮 QA（补做）：校园圈入口卡片统一浅绿背景 + 学校名字（移除 school-main.png 封面插图、
// 渐变底色与首字徽标）。coverUrl 数据模型保留：非空 → 显示图片；空 → 浅绿背景 + 名字。

/** 热门兴趣圈（8 个标准圈） */
const { circles: circleList } = storeToRefs(circleStore);
const hotCircles = computed(() => circleList.value.slice(0, 8));

/** 附近动态（2026-08-26 R2：独立维度数据源 villageStore.nearbyPosts，不复用全局 posts） */
const circlePosts = computed<PostItem[]>(() => villageStore.nearbyPosts.slice(0, 6));

/** 当前城市（fetchNearbyPosts 城市过滤用；来自定位，定位失败则空） */
const currentCity = ref("");

// MP-R1-PAGES-NEARBY-INDEX-904（2026-09-24）：头部回归理想图《附近的首页》——
// 右上角仅放大镜图标（关键词输入由搜索页承接），原整行输入框与其绑定的
// searchKeyword 一并移除（R16 的「输入无法绑定」根因随输入框退场一并消解）。

/**
 * MP-R1-PAGES-NEARBY-INDEX-903：未登录（real）且受保护数据源被 66 行守卫拦下时，
 * 分区②/④ 拿到的永远是「空列表」——原样渲染 hotCirclesEmpty / activitiesEmpty
 * 会把「未拉取」伪装成「无内容」（同 MP-R1-PAGES-NEARBY-INDEX-006「失败/未取态被伪装成空态」家族）。
 * 此处显式区分两态：受保护源被门挡住 → 登录引导文案；真实拉取后为空 → 空态文案。
 * 依赖 sessionStore.isLoggedIn（响应式）保证登录/登出后即时翻转。
 */
const protectedBlocked = computed(() => !sessionStore.isLoggedIn && !canFetchProtected());

/** 首页子标题：北京大学 · 3km */

/**
 * R8-L02-D03（空态文案）：定位行两态的可恢复出口。
 * 空态判定按 buildLocationText（utils/location.ts:237）的取值顺序来：
 * city → 有城市；campusName → 有本校名；两者都无 → 落到 locationPage.locationEmpty
 * 「暂无位置信息」——帧上 y≈113-128 那行就是这一支，此前右侧什么都没有、
 * 整行也不是可点件，用户无法从这一行恢复定位或换城市。
 * locationCity 只在定位真的拿到城市时写入，绝不用前端默认值冒充（红线：不编后端数据）。
 */
const locationCity = ref("");
const ownCampusName = computed(() => sessionStore.userSession?.campusName?.trim() || "");
const locationIsEmpty = computed(() => !locationCity.value && !ownCampusName.value);

/** 定位行整行可点：空态→重走定位授权与逆地理（fetchCurrentLocation 内部即授权链路）；
 *  有值→进「我的位置」页换城市（与 pages/home/index.vue:271 同一 ROUTES.PROFILE.LOCATION 出口）。 */
function onLocationRowTap() {
  if (locationIsEmpty.value) {
    void initLocation();
    return;
  }
  openAppPath(ROUTES.PROFILE.LOCATION);
}

const homeSubtitle = ref(buildLocationText("", sessionStore.userSession?.campusName));

async function initLocation() {
  const loc = await fetchCurrentLocation();
  if (loc) {
    locationCity.value = loc.city || "";
    // MP-R6-F1-NEARBY-IP-CITY-001：citySource==="ip" 时，城市是后端按**请求方 IP 归属地**推断的
    // （逆地理拿不到城市时的兜底，见 utils/location.ts:44-56），与用户真实所在城市可能差出一个省。
    // 这样的城市只够用来标注，不能当同城过滤键，也不能写进 NEARBY_CITY——
    // publish 页的「添加位置 · 自动定位」正把那个缓存当用户所在城市用。
    const ipSourced = loc.citySource === "ip";
    homeSubtitle.value =
      buildLocationText(loc.city, sessionStore.userSession?.campusName) +
      (ipSourced && loc.city ? ` · ${t("locationPage.serverCityTag")}` : "");
    // R16（2026-09-07）：定位成功立即上报坐标（force 跳过节流）——
    // 此前 nearby 页只取城市不上报，后端推荐距离仍按旧坐标/默认点计算，
    // 出现「1893km」级异常距离与区域错乱
    void reportLocation(loc.latitude, loc.longitude, true).catch(() => {});
    // 2026-08-27 修复：定位成功后用真实城市刷新附近动态（不再仅登录态）。
    // MP-R1-PAGES-NEARBY-INDEX-001：城市变化强制重拉（绕过 30s TTL），但仍受登录门约束
    if (loc.city && loc.city !== currentCity.value) {
      if (!ipSourced) {
        currentCity.value = loc.city;
        // MP-R1-PUBLISH-006：持久化城市（publish 页「添加位置 · 自动定位」的数据源，
        // 原全库无写入方导致其恒显示缺省「北京市」）
        try {
          uni.setStorageSync(STORAGE_KEYS.NEARBY_CITY, loc.city);
        } catch (_e) { /* storage 失败不影响主流程 */ }
      }
      if (canFetchProtected()) {
        void loadCirclePosts(true);
      }
    }
  }
}

/**
 * R8-L02-D04（需新建）：分区①的「距离 / 同城」分段 + 人卡横滑预览。
 * - 数据只走二级页同一条受保护端点（getRecommendations），并按本页既有守卫
 *   canFetchProtected()（:66，real 未登录一律不发，避免 401 → http 层强踢登录页）；
 *   被门挡住的分支渲染登录引导空态（同分区②/④的 nearby-home__empty--guide 口径），
 *   而不是把「未取」伪装成「无内容」，更不是捏造人卡。
 * - 预览上限 8 张（横滑一屏 3.5 张的口径）；整屏列表仍由 goPeople 的二级页承接，
 *   入口条与导航出口一条都不删，功能不丢。
 */
const peopleScope = ref<"nearby" | "city">("nearby");
const peoplePreview = ref<DiscoverCard[]>([]);
const peopleLoading = ref(false);
const peopleFailed = ref(false);
/** 竞态 token：切段时旧响应不得覆盖新列表（同 people.vue:66 loadToken 口径） */
let peopleToken = 0;

async function loadPeoplePreview(scope: "nearby" | "city" = peopleScope.value) {
  if (!canFetchProtected()) {
    peoplePreview.value = [];
    peopleLoading.value = false;
    peopleFailed.value = false;
    return;
  }
  const token = ++peopleToken;
  peopleLoading.value = true;
  peopleFailed.value = false;
  try {
    const people = await clientApi.getRecommendations(
      scope === "nearby" ? { distanceMax: NEARBY_MAX_DISTANCE_KM } : {},
    );
    if (token !== peopleToken) return;
    const seen = new Set<string>();
    const cards: DiscoverCard[] = [];
    for (const p of people) {
      const card = mapToDiscoverCard(p);
      const key = card.userId ? String(card.userId) : `name:${card.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push(card);
    }
    peoplePreview.value = cards.slice(0, 8);
  } catch (e) {
    if (token !== peopleToken) return;
    peopleFailed.value = true;
    peoplePreview.value = [];
  } finally {
    if (token === peopleToken) peopleLoading.value = false;
  }
}

function switchPeopleScope(scope: "nearby" | "city") {
  if (peopleScope.value === scope) return;
  peopleScope.value = scope;
  void loadPeoplePreview(scope);
}

/** 人卡次行：距离段展示后端 distanceText（口径同 people.vue:129 formatDistance），
 *  同城段优先展示后端 campusName；后端没给的就留空，不拼假值。 */
function formatDistanceText(raw?: string): string {
  if (!raw) return "";
  return /^\d+(\.\d+)?$/.test(raw) ? `${raw}km` : raw;
}
function personMetaText(person: DiscoverCard): string {
  if (peopleScope.value === "nearby") return formatDistanceText(person.distanceText);
  return person.campusName || formatDistanceText(person.distanceText);
}
function openPersonProfile(userId: string) {
  openUserProfile(userId);
}

/**
 * R8-L02-D05（层级遮挡）：状态栏 + 胶囊带等高的固定导航底板高度。
 * 本页页头写在 scroll-view 内、且 scroll-view 没有可解析的固定高度
 * （.nearby-home__scroll 只有 flex:1 + min-height:0，根容器只有 min-height:100%）
 * ⇒ 实际滚动发生在页面级：滚到底时第 4 张兴趣圈卡升入胶囊带（帧上圈名与「6,533 人加入」
 * 落在 x≈262-345 / y≈20-40，胶囊占 x≈272-370 / y≈28-60），文字右半被胶囊压住不可读。
 * 高度按实测胶囊口径 = 状态栏 + 胶囊上间距 4 + 胶囊高 32 + 4 呼吸 = statusBar + 40px；
 * 值取 JS 注入的 useStatusBarHeight()（本仓已证实 env()/--statusbar 在模拟档恒 0，见 :40）。
 */
const navBandStyle = computed(() => ({
  height: `${statusBarHeightPx.value + 40}px`,
}));

onLoad(() => {
  loadNearbyData();
  void initLocation();
  // MP-R1-PAGES-NEARBY-INDEX-018：校区列表走后端，静态表只作首帧兜底
  refreshSchools();
  // R8-L02-D04：分区①人卡预览随首屏一起取数（内部按登录门自决，未登录不发受保护请求）
  void loadPeoplePreview();
});

onShow(() => {
  // MP-R1-PAGES-NEARBY-INDEX-002/004：原 onShow 仅刷新本页从不渲染的 peoplePreview
  // 死链；现按 TTL 刷新页面真实可见数据源（附近动态 30s / 活动 store 内 30s TTL），
  // 未登录（real）不发受保护请求，登录后由 watch(isLoggedIn) 补拉。
  refreshSchools();
  if (canFetchProtected()) {
    void loadCirclePosts();
    void loadActivities();
  }
});

onPullDownRefresh(() => {
  // MP-R1-PAGES-NEARBY-INDEX-003：下拉刷新并行重拉全部可见数据源（force 绕过
  // 「空列表才拉取」与 30s TTL 短路），完成后才停止下拉动画。
  // MP-R1-PAGES-NEARBY-INDEX-018：校区列表是公开端点、不进 canFetchProtected 那一组，
  // 但它同样是本页可见数据源 ⇒ 下拉也要重拉（失败由 loadSchools 内部回退静态表，不阻塞下拉动画）。
  refreshSchools();
  // MP-R2-PAGES-NEARBY-INDEX-002：三个 store 的 fetch 内部吞错不 rethrow，
  // Promise.catch 是死路径——改为完成后统一检查各 store 错误字段给 toast。
  const tasks: Promise<unknown>[] = [];
  if (canFetchProtected()) {
    tasks.push(circleStore.fetchCircles(), loadCirclePosts(true), loadActivities(true));
  }
  Promise.all(tasks)
    .then(() => {
      if (circleStore.errorMessage || villageStore.nearbyError || activityStore.errorMessage) {
        uni.showToast({ title: t("nearby.loadFailed"), icon: "none" });
      }
    })
    .catch(() => {
      uni.showToast({ title: t("nearby.loadFailed"), icon: "none" });
    })
    .finally(() => uni.stopPullDownRefresh());
});

onUnmounted(() => {
  // 页面共享 store，无需清理
});

/**
 * 加载附近数据（MP-R1-PAGES-NEARBY-INDEX-001：real 模式下兴趣圈/附近动态均为
 * 受保护端点，未登录一律不发起——原 onLoad 108/110 行的无条件调用会触发
 * 401 → redirectToLogin 强跳登录页；登录后由 watch(isLoggedIn) 补拉）。
 */
function loadNearbyData(): void {
  if (!canFetchProtected()) return;
  // 2026-08-27：兴趣圈列表在 onLoad 直接触发，热门兴趣圈横滑区按理想图始终可见
  void circleStore.fetchCircles().catch(() => {});
  void loadActivities();
  void loadCirclePosts();
}

// 2026-08-15：登录态变化后自动补拉（登录成功即刷新数据）。
// MP-R1-PAGES-NEARBY-INDEX-004：登录后维度变化（未登录拉到的列表可能缺城市参数），
// force 重拉附近动态，绕过「列表非空即跳过」守卫。
watch(
  () => sessionStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      void circleStore.fetchCircles().catch(() => {});
      void loadActivities(true);
      void loadCirclePosts(true);
    }
  }
);

/** 拉取附近活动（复用 activity store；force=true 绕过 store 内 30s TTL 与空列表短路） */
async function loadActivities(force = false) {
  if (force) {
    await activityStore.fetchActivities(true);
    return;
  }
  if (activityStore.loading) return;
  if (activityStore.activities.length === 0) {
    await activityStore.fetchActivities();
  }
}

/** 附近动态刷新 TTL（MP-R1-PAGES-NEARBY-INDEX-004，对齐首页 feed 30s 陈旧阈值） */
const NEARBY_POSTS_TTL_MS = 30_000;
let lastNearbyFetchAt = 0;

/**
 * 拉取附近动态（2026-08-26 R2：独立维度 fetchNearbyPosts，按当前城市过滤）。
 * MP-R1-PAGES-NEARBY-INDEX-004：原「列表非空即跳过」守卫使数据整会话不更新——
 * 现按 TTL 刷新（30s 内且非 force 不重拉）；force 路径（登录补拉/下拉刷新/城市变化）
 * 无条件重拉。失败不更新时间戳（错误态可立即重试）。
 */
async function loadCirclePosts(force = false) {
  if (villageStore.loadingNearbyPosts) return;
  if (
    !force &&
    villageStore.nearbyPosts.length > 0 &&
    Date.now() - lastNearbyFetchAt < NEARBY_POSTS_TTL_MS
  ) {
    return;
  }
  await villageStore.fetchNearbyPosts(currentCity.value || undefined);
  if (!villageStore.nearbyError) {
    lastNearbyFetchAt = Date.now();
  }
}

/** 未登录引导：跳登录页（文案复用 apiErrors.loginRequired） */
function goLogin() {
  openAppPath(ROUTES.LOGIN);
}

/** 搜索（附近内容）：MP-R1-PAGES-NEARBY-INDEX-904 头部为放大镜图标，直接进搜索页
 *  （搜索页 onLoad 自持关键词输入，本页不再代持关键词） */
function goSearch() {
  openAppPath(ROUTES.SEARCH);
}

/** 附近的人 / 同城的人 */
function goPeople(scope: "nearby" | "city") {
  openAppPath(`${ROUTES.NEARBY.PEOPLE}?scope=${scope}`);
}

/** 兴趣圈（2026-09-12：入口改跳理想图版圈子主页 circle-home，旧 topics 列表由其「查看全部话题」承接） */
function goCircleDetail(circleId: string) {
  openAppPath(`${ROUTES.CIRCLES.HOME}?circleId=${encodeURIComponent(circleId)}`);
}
function goCircleList() {
  openAppPath(ROUTES.CIRCLES.INDEX);
}

/** 校园圈 */
function goCampusHub(school?: string) {
  openAppPath(school ? `${ROUTES.CAMPUS.HUB}?school=${encodeURIComponent(school)}` : ROUTES.CAMPUS.HUB);
}

/** 活动 */
function goActivityList() {
  openAppPath(SUBPACKAGE_ROUTES.DISCOVER_FEED.ACTIVITIES);
}
function goActivityDetail(id: string) {
  openAppPath(`${ROUTES.ACTIVITY_DETAIL}?id=${encodeURIComponent(id)}`);
}

/** 帖子详情 / 作者 */
function onPostDetail(postId: string) {
  openAppPath(`/subpackages/village/village/detail?id=${encodeURIComponent(postId)}`);
}
function onPostAuthor(userId: string) {
  openUserProfile(userId);
}

/** MP-R1-NEARBY-002（2026-09-20）：帖子点赞/收藏/关注——此前 PostCard 只绑了
 * open-detail/author/tag/activity 四事件，互动无任何反馈。接入 village store
 * （与村口页 handleLike/handleFavorite/handleFollow 同口径，store 会同步 nearbyPosts）。 */
async function onPostLike(postId: string) {
  try {
    await villageStore.likePost(postId);
  } catch (error) {
    showErrorToast(error, t("village.likeFailed"));
  }
}

async function onPostFavorite(postId: string) {
  try {
    await villageStore.toggleFavorite(postId);
  } catch (error) {
    showErrorToast(error, t("village.favoriteFailed"));
  }
}

async function onPostFollow(userId: string) {
  try {
    await villageStore.followUser(userId);
  } catch (error) {
    showErrorToast(error, t("village.followFailed"));
  }
}

/** v3 冻结：认识 TA 入口已并入 PostCard 作者行「关注」芯片（R20 移除独立按钮） */

/** 帖子标签/关联活动 */
function onPostTag(tagName: string) {
  openAppPath(`/subpackages/village/village/tag-posts?tagName=${encodeURIComponent(tagName)}`);
}
function onPostActivity(activityId: number | string) {
  openAppPath(`/subpackages/tools/activities/detail?id=${encodeURIComponent(String(activityId))}`);
}

/** 发帖（动态/找搭子/活动 三段式入口） */
function goToPublishPost() {
  openAppPath("/subpackages/village/village/post");
}

/** 查看全部动态 */
function goAllPosts() {
  openAppPath("/subpackages/village/village/index");
}

/** MP-R1-PAGES-NEARBY-INDEX-901：「我的人脉」接既有关系页（喜欢我的人/我的访客）——
 *  原落点为村口帖子列表，标签承诺的关系功能缺失并误导导航 */
function goConnections() {
  openAppPath(ROUTES.LIKES.VISITORS_LIKES);
}

/** MP-R1-PAGES-NEARBY-INDEX-902：校园圈入口 chip 双态——本校已认证「已加入」、
 *  本校未认证「去认证」、其他学校保持「公开浏览」（原恒为「公开浏览」，
 *  campus store 的认证四态在本页零消费） */
function campusChipKey(schoolName: string): string {
  const session = sessionStore.userSession;
  if (!sessionStore.isLoggedIn || !session) return "nearby.campusBrowse";
  const own = session.campusName || "";
  if (schoolName !== own) return "nearby.campusBrowse";
  return session.campusVerified ? "nearby.campusJoined" : "nearby.campusVerify";
}

/** 2026-09-12 全站验收 Round-1（MP-R1-NEARBY-001）：本页曾保留一份本地
 * 「圈名 → 封面」副本（旧插画 circle-photo.png 等），导致同一圈子在附近页与
 * 圈子列表页/圈子主页显示不同封面（上轮 single-source 收编的漏网页面）。
 * 现收编进 config/circle-covers 单一真相源 circleCoverFor，与列表页/
 * 圈子主页/首页兴趣推荐共用；其关键词覆盖（篮球/萌宠/桌游/考研/学习搭子/
 * 天文星空）为本地副本的超集，兜底同为摄影封面。 */

/** 成员数格式化 */
function formatMemberCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}w`;
  // R8-L02-D02（文案）：撤销 R21 的千分位。同排四张卡因此出现「1.2w / 8,932 / 8,123 / 6,533」
  // 两种量纲混排——理想图的精确值写作 8602（不带分隔符），R21 以「对齐理想图」为名加的
  // toLocaleString("en-US") 恰好把理想图没有的逗号加了进来，同一条轴修反了。
  // ≥1w 折「w」的口径保留（那是理想图自身的写法），千位段回到裸数字。
  return String(count);
}
</script>

<template>
  <view
    class="nearby-home page-bottom-safe"
    :style="[{ paddingTop: headerTopPadPx + 'px' }, menuStyleVars]"
  >
    <!-- R8-L02-D05（层级遮挡）：与状态栏+胶囊带等高的固定导航底板（高度口径见 script 的 navBandStyle）。
         本页页头在 scroll-view 内且滚动发生在页面级 ⇒ 滚到底时兴趣圈卡升入胶囊带被胶囊压住；
         这块实色底板吃掉 y=0 → 胶囊底缘，让正文永远停在胶囊带下方；页头自身再抬到它之上
         （.nearby-home__header 的 position/z-index），故首屏页头不被遮挡、两态互不打架。
         pointer-events:none ⇒ 不吃走其下任何可点件的热区。 -->
    <view class="nearby-home__nav-band" :style="navBandStyle" />
    <scroll-view scroll-y class="nearby-home__scroll" :show-scrollbar="false">
      <!-- 顶部：绿定位针 + 附近 + 放大镜 + 发帖
           MP-R1-PAGES-NEARBY-INDEX-904：回归理想图形态（右上仅放大镜图标，
           标题与定位小字各带一枚绿色定位针），移除 2026-09-06 的整行搜索框 -->
      <view class="nearby-home__header">
        <view class="nearby-home__title-row">
          <view class="nearby-home__title-group">
            <image class="nearby-home__pin" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
            <text class="nearby-home__title">{{ t('nearby.title') }}</text>
          </view>
          <view class="nearby-home__actions">
            <view class="nearby-home__search-btn press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.searchPlaceholder')" @tap="goSearch">
              <image class="nearby-home__search" :src="IMAGE_PATHS.ICONS_COMMON.SEARCH" mode="aspectFit" alt="" />
            </view>
            <view class="nearby-home__publish press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.publishToday')" @tap="goToPublishPost">
              <text class="nearby-home__publish-text">{{ t('nearby.publishToday') }}</text>
            </view>
          </view>
        </view>
        <!-- R8-L02-D03（空态文案）：定位行升级为整行可点件（热区口径同本页 goSearch
             那颗 .nearby-home__search-btn 的 88rpx 最小可点件），右侧补一个动作值：
             空态「· 重试 ›」重走定位授权与逆地理，有城市/本校名时「· 切换城市 ›」进
             「我的位置」页。两枚动作文案都取既有键（common.retry / village.sameCityChange，
             zh/en 双语都已存在，0 新增词条），定位值本身仍只显后端/系统真给的 city 或 campus。 -->
        <view
          class="nearby-home__subtitle-row"
          role="button"
          :aria-label="locationIsEmpty ? t('common.retry') : t('village.sameCityChange')"
          hover-class="press-feedback--active"
          hover-stay-time="40"
          @tap="onLocationRowTap"
        >
          <image class="nearby-home__pin nearby-home__pin--sm" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
          <text class="nearby-home__subtitle">{{ homeSubtitle }}</text>
          <text v-if="locationIsEmpty" class="nearby-home__location-action">· {{ t('common.retry') }} ›</text>
          <text v-else class="nearby-home__location-action">· {{ t('village.sameCityChange') }} ›</text>
        </view>
      </view>

      <!-- 功能入口：5 圆形图标（参考图对齐） -->
      <view class="nearby-entries">
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.peopleTitle')" @tap="goPeople('nearby')">
          <view class="nearby-entry__icon nearby-entry__icon--people">
            <image class="nearby-entry__img" :src="IMAGE_PATHS.NEARBY_ICONS.PEOPLE" mode="aspectFit" alt="" />
          </view>
          <text class="nearby-entry__label">{{ t('nearby.peopleTitle') }}</text>
        </view>
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.hotCircles')" @tap="goCircleList">
          <view class="nearby-entry__icon nearby-entry__icon--circle">
            <!-- R12-L02-D02（素材语义）：原 NEARBY_ICONS.CIRCLE（group.svg 双人像）与「兴趣圈」
                 语义错位，理想图此位是盾形对勾——换绑既有 REGISTER_ICONS.SHIELD
                 （register/shield.svg，盾形+对勾，本地 /static 固定路径，不随 real 档切基址）。
                 字形色仍由 :1733 的 filter 链统一烘成 #36C99A，五宫格底板/布局/其余三枚不动。 -->
            <image class="nearby-entry__img" :src="IMAGE_PATHS.REGISTER_ICONS.SHIELD" mode="aspectFit" alt="" />
          </view>
          <!-- R2b-L02-D02：入口标签用理想图短词「兴趣圈」（nearby.tabCircles），
               长词「热门兴趣圈」仅留给下方分区②标题（:485 的 nearby.hotCircles 不动）。 -->
          <text class="nearby-entry__label">{{ t('nearby.tabCircles') }}</text>
        </view>
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.campusCircles')" @tap="goCampusHub()">
          <view class="nearby-entry__icon nearby-entry__icon--campus">
            <image class="nearby-entry__img" :src="IMAGE_PATHS.NEARBY_ICONS.CAMPUS" mode="aspectFit" alt="" />
          </view>
          <text class="nearby-entry__label">{{ t('nearby.campusCircles') }}</text>
        </view>
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.activitiesTitle')" @tap="goActivityList">
          <view class="nearby-entry__icon nearby-entry__icon--activity">
            <!-- R12-L02-D02（素材语义）：原 NEARBY_ICONS.ACTIVITY（common/schedule.svg 日历）
                 读作「日程」而非「活动」，理想图此位是礼盒——换绑既有 ICONS_EMOJI.GIFT
                 （assets/icons/gift.svg 礼盒，已走 :238 ICONS_GIFT_SVG 的 pkg+tail 双登记，
                 与同组 GROUP/LOCATION 同一已验证可渲染路径）。字形色仍由 filter 链烘成
                 #F97316 橙（同原日历色），布局不动。 -->
            <image class="nearby-entry__img" :src="IMAGE_PATHS.ICONS_EMOJI.GIFT" mode="aspectFit" alt="" />
          </view>
          <!-- R2b-L02-D02：入口标签用理想图短词「活动」（nearby.tabActivities），
               长词「附近活动」仅留给下方分区④标题（:572 的 nearby.activitiesTitle 不动）。 -->
          <text class="nearby-entry__label">{{ t('nearby.tabActivities') }}</text>
        </view>
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.myConnections')" @tap="goConnections">
          <!-- 2026-08-25 P0：第 5 项改为"我的人脉"。
               R3 修正：原 LOGIN_SPLIT['r10_c02'] 素材实为 WiFi 图标（切图错位），改用 social/follow（人物+加号）
               MP-R1-PAGES-NEARBY-INDEX-901：原 @tap=goAllPosts 使「我的人脉」与分区⑤「全部」
               同落村口帖子列表（语义欺骗）；全库无人脉页，改接既有关系页（喜欢我的人/我的访客） -->
          <view class="nearby-entry__icon nearby-entry__icon--dynamic">
            <image class="nearby-entry__img" :src="IMAGE_PATHS.ICONS_PROFILE.NETWORK" mode="aspectFit" alt="" />
          </view>
          <text class="nearby-entry__label">{{ t('nearby.myConnections') }}</text>
        </view>
      </view>

      <!-- ① 附近的人（含同城）
           规范 §3.5 给这一分区的分段口径是「按距离 / 同城」——分段项只描述范围，
           不再复述分区名；整屏列表出口由分区头「全部」承担（带当前分段）。
           四态齐备（同分区②/④既有三态口径）：登录门 → 引导空态、加载中 → SkeletonBlock、
           取回但为空/失败 → 空态文案 + 重试、有数据 → 人卡横滑。 -->
      <NearbySection :title="t('nearby.peopleTitle')" :more-text="t('nearby.viewAll')" @more="goPeople(peopleScope)">
        <view class="people-segment" role="tablist" :aria-label="t('nearby.peopleScopeTabsAria')">
          <view
            class="people-segment__item"
            :class="{ 'people-segment__item--active': peopleScope === 'nearby' }"
            role="tab"
            :aria-selected="peopleScope === 'nearby'"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            @tap="switchPeopleScope('nearby')"
          >
            <text class="people-segment__text">{{ t('nearby.peopleScopeNearby') }}</text>
          </view>
          <view
            class="people-segment__item"
            :class="{ 'people-segment__item--active': peopleScope === 'city' }"
            role="tab"
            :aria-selected="peopleScope === 'city'"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            @tap="switchPeopleScope('city')"
          >
            <text class="people-segment__text">{{ t('nearby.peopleScopeCity') }}</text>
          </view>
        </view>

        <view v-if="protectedBlocked" class="nearby-home__empty nearby-home__empty--guide">
          <text class="nearby-home__empty-text">{{ t('nearby.loginToView') }}</text>
          <view
            class="nearby-home__empty-action press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('discover.card.goLogin')"
            @tap="goLogin"
          >
            <text class="nearby-home__empty-action-text">{{ t('discover.card.goLogin') }}</text>
          </view>
        </view>
        <view v-else-if="peopleLoading && peoplePreview.length === 0" class="nearby-home__empty">
          <SkeletonBlock variant="list" :rows="1" :label="t('nearby.loading')" />
        </view>
        <view v-else-if="peoplePreview.length === 0" class="nearby-home__empty nearby-home__empty--guide">
          <text class="nearby-home__empty-text">{{ peopleFailed ? t('nearby.loadFailed') : t('nearby.peopleEmpty') }}</text>
          <view
            class="nearby-home__empty-action press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('common.retry')"
            @tap="loadPeoplePreview(peopleScope)"
          >
            <text class="nearby-home__empty-action-text">{{ t('common.retry') }}</text>
          </view>
        </view>
        <scroll-view v-else scroll-x class="people-scroll" :show-scrollbar="false">
          <view class="people-scroll__list">
            <view
              v-for="person in peoplePreview"
              :key="person.id"
              class="person-mini press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="40"
              role="button"
              :aria-label="person.name"
              @tap="openPersonProfile(person.userId)"
            >
              <!-- 头像尺寸落在本页自有节点 .person-mini__avatar-wrap 上，SafeImage 靠
                   宿主 :host 的 100%/100% 填满（共享件车道 FXA 已证：custom-class 传的类名
                   落在组件内部节点、不带宿主页 data-v ⇒ 宿主 scoped 规则永不命中，
                   故本页一律用「宿主盒定尺寸 + 组件填满」这条运行时真正生效的路径）。 -->
              <view class="person-mini__avatar-wrap">
                <SafeImage :src="person.avatar" mode="aspectFill" :lazy-load="false" alt="" />
              </view>
              <text class="person-mini__name">{{ person.name }}</text>
              <text class="person-mini__meta">{{ personMetaText(person) }}</text>
            </view>
          </view>
        </scroll-view>
      </NearbySection>

      <!-- ② 热门兴趣圈（开放加入，无需校园认证） -->
      <NearbySection :title="t('nearby.hotCircles')" :more-text="t('nearby.viewAll')" @more="goCircleList">
        <!-- MP-R2-PAGES-NEARBY-INDEX-003：分区②补三态（原彻底无状态：失败后只剩标题） -->
        <view v-if="circleStore.loading && hotCircles.length === 0" class="nearby-home__empty">
          <SkeletonBlock variant="list" :rows="2" :label="t('common.loading')" />
        </view>
        <view v-else-if="hotCircles.length === 0 && protectedBlocked" class="nearby-home__empty nearby-home__empty--guide">
          <!-- MP-R1-PAGES-NEARBY-INDEX-903：受保护源被 66 行登录门拦下 → 明示「登录后看」，
               不再用「暂无热门兴趣圈」把「未拉取」伪装成「无内容」 -->
          <text class="nearby-home__empty-text">{{ t('nearby.loginToView') }}</text>
          <view
            class="nearby-home__empty-action press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('discover.card.goLogin')"
            @tap="goLogin"
          >
            <text class="nearby-home__empty-action-text">{{ t('discover.card.goLogin') }}</text>
          </view>
        </view>
        <view v-else-if="hotCircles.length === 0" class="nearby-home__empty">
          <text v-if="circleStore.errorMessage" class="nearby-home__empty-text">{{ circleStore.errorMessage }}</text>
          <text v-else class="nearby-home__empty-text">{{ t('nearby.hotCirclesEmpty') }}</text>
        </view>
        <scroll-view v-else scroll-x class="circle-scroll" :show-scrollbar="false">
          <view class="circle-scroll__list">
            <view
              v-for="circle in hotCircles"
              :key="circle.id"
              class="circle-mini press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="40"
              role="button"
              :aria-label="circle.name"
              @tap="goCircleDetail(circle.id)"
            >
              <!-- R20（2026-09-08）：封面恒满铺（circleCoverFor 已兜底默认封面），
                   不再回退 SVG 图标位，消除卡片周围空白 -->
              <image class="circle-mini__cover" :src="circleCoverFor(circle.name)" mode="aspectFill" alt="" />
              <view class="circle-mini__overlay" />
              <view class="circle-mini__info">
                <text class="circle-mini__name">{{ circle.name }}</text>
                <text class="circle-mini__count">{{ formatMemberCount(circle.memberCount) }} 人加入</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </NearbySection>

      <!-- ③ 校园圈（公开可看、认证进私域）
           MP-R1-PAGES-NEARBY-INDEX-906：由整宽横排行改为理想图的 4 联竖版卡
           （封面 + 校名 + 次行 + 状态 chip，flex 行排布，小程序端不用 grid）。
           次行原为 campusPublicHint 长文案（理想图此处是「N 位同学」）——全站无该
           数据源：config/schools.ts 的 School 接口无成员数字段，
           subpackages/campus/campus/hub.vue:62-73 schoolStats 是带「约」标注的硬编码
           演示表（其注释 MP-R2-CAMPUS-HUB-007 自述「后端 campuses 接口就绪后替换」），
           复制到本页即成第二真相源 → 暂展示真实的 school.city，同学数待后端补字段。
           R8-L02-D07（文案）复核并登记为「未修（缺列）」：本页取数路径 config/schools.ts:13
           的 School 与后端 services/config.ts:36 的 CampusView 都只有 id/name/city 三键，
           /api/v1/config/campuses 没有任何学校维度的成员数（全库 memberCount 只挂在
           InterestCircleSummary / 兴趣圈 schema 上，见 api-types.ts:1081）⇒
           缺的是后端列 campuses.member_count（或 /config/campuses 的 studentCount），
           前端不拿 city 冒充、也不捏一个「N 位同学」。city 行按现状保留（它是后端真给的值，
           删掉换成空白会把真信息换成空槽，属另一条轴的裁决）。 -->
      <NearbySection :title="t('nearby.campusCircles')" :more-text="t('nearby.viewAll')" @more="goCampusHub()">
        <view class="campus-cards">
          <view
            v-for="school in schoolEntries"
            :key="school.id"
            class="campus-entry press-feedback"
            :class="{ 'campus-entry--img': school.coverUrl }"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="school.name"
            @tap="goCampusHub(school.name)"
          >
            <!-- 封面：coverUrl 已上传则出图，否则浅绿底 + 校名（不引入 hub 的硬编码封面表） -->
            <image v-if="school.coverUrl" class="campus-entry__cover-img" :src="school.coverUrl" mode="aspectFill" alt="" />
            <view v-else class="campus-entry__badge">
              <text class="campus-entry__badge-text">{{ school.name }}</text>
            </view>
            <text class="campus-entry__name">{{ school.name }}</text>
            <text class="campus-entry__desc">{{ school.city }}</text>
            <view class="campus-entry__status" :class="{ 'campus-entry__status--verify': campusChipKey(school.name) === 'nearby.campusVerify' }">
              <!-- MP-R1-PAGES-NEARBY-INDEX-902：认证状态双态——本校已认证「已加入」、
                   本校未认证「去认证」、其余「公开浏览」。
                   2026-10-26：补「去认证」态浅紫胶囊样式（对齐理想图 附近的首页.png），
                   状态判定逻辑（campusChipKey）不动。 -->
              <text class="campus-entry__status-text">{{ t(campusChipKey(school.name)) }}</text>
            </view>
          </view>
        </view>
      </NearbySection>

      <!-- ④ 活动（复用现有活动体系） -->
      <NearbySection :title="t('nearby.activitiesTitle')" :more-text="t('nearby.viewAll')" @more="goActivityList">
        <view
          v-for="activity in activityStore.activities.slice(0, 3)"
          :key="activity.id"
          class="activity-entry press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="40"
          role="button"
          :aria-label="activity.title"
          @tap="goActivityDetail(String(activity.id))"
        >
          <view class="activity-entry__icon-wrap">
            <!-- R7-L02-D03【R6 已批过、帧上未落地】：原取 ICONS_EMOJI.FIRE，该键在
                 config/images.ts:720 由 ICONS_BASE 拼成 `/static/assets/icons/fire.svg`（icons **根目录**）。
                 根目录既不在 cdn-buckets.json 的 cdnPrefixes 也不在 localPrefixes，且 R6/F7 的
                 pkg/tail 双登记（images.ts:204-209）只补了 gift/chat/group/search/heart/location 六枚，
                 fire.svg 正是同注释点名的「其余 8 枚同型待接」之一 ⇒ 盘上 src/static 有、产物
                 dist/build/mp-weixin-real/static/assets/icons/ 实测只剩 chat/gift/group/heart/location/search.svg
                 + common/register/tabbar 三个子目录，根级 fire.svg 不存在 → <image> 404，
                 三行 72rpx 杏色底板全空。改指同图形的已出包件 NEARBY_ICONS.DYNAMIC
                 （= `/static/assets/icons/common/fire.svg`，localPrefixes 命中，产物实测在包，
                 real 档与 mock 档求值逐字相同），两档都出图。 -->
            <image class="activity-entry__icon" :src="IMAGE_PATHS.NEARBY_ICONS.DYNAMIC" mode="aspectFit" alt="" />
          </view>
          <view class="activity-entry__body">
            <text class="activity-entry__title">{{ activity.title }}</text>
            <text class="activity-entry__desc">{{ activity.location || activity.scheduleText }}</text>
          </view>
          <text class="activity-entry__arrow">›</text>
        </view>
        <view v-if="activityStore.loading && activityStore.activities.length === 0" class="nearby-home__empty">
          <SkeletonBlock variant="list" :rows="2" :label="t('common.loading')" />
        </view>
        <!-- MP-R2-PAGES-NEARBY-INDEX-003：失败优先于空态（原失败伪装「暂无活动」） -->
        <view v-else-if="activityStore.errorMessage && activityStore.activities.length === 0" class="nearby-home__empty">
          <text class="nearby-home__empty-text">{{ activityStore.errorMessage }}</text>
        </view>
        <!-- MP-R1-PAGES-NEARBY-INDEX-903：同分区②——未登录（real）时活动源未拉取，
             不得伪装成「附近暂无活动」 -->
        <view v-else-if="activityStore.activities.length === 0 && protectedBlocked" class="nearby-home__empty nearby-home__empty--guide">
          <text class="nearby-home__empty-text">{{ t('nearby.loginToView') }}</text>
          <view
            class="nearby-home__empty-action press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('discover.card.goLogin')"
            @tap="goLogin"
          >
            <text class="nearby-home__empty-action-text">{{ t('discover.card.goLogin') }}</text>
          </view>
        </view>
        <view v-else-if="activityStore.activities.length === 0 && !activityStore.loading" class="nearby-home__empty">
          <text class="nearby-home__empty-text">{{ t('nearby.activitiesEmpty') }}</text>
        </view>
      </NearbySection>

      <!-- ⑤ 附近动态（2026-08-26 R2：独立维度 nearbyPosts；最多 1 个显式「认识 TA」） -->
      <NearbySection :title="t('nearby.nearbyPosts')" :more-text="t('nearby.viewAll')" @more="goAllPosts">
        <!-- 未登录：登录引导卡片（文案复用 apiErrors.loginRequired） -->
        <view v-if="!sessionStore.isLoggedIn" class="nearby-login-guide">
          <text class="nearby-login-guide__text">{{ t('apiErrors.loginRequired') }}</text>
          <view
            class="nearby-login-guide__btn press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('discover.card.goLogin')"
            @tap="goLogin"
          >
            <text class="nearby-login-guide__btn-text">{{ t('discover.card.goLogin') }}</text>
          </view>
        </view>
        <view v-else-if="circlePosts.length === 0 && villageStore.loadingNearbyPosts" class="nearby-home__empty">
          <SkeletonBlock variant="list" :rows="2" :label="t('common.loading')" />
        </view>
        <!-- MP-R2-PAGES-NEARBY-INDEX-003：失败优先于空态（原失败伪装「暂无动态」） -->
        <view v-else-if="villageStore.nearbyError && circlePosts.length === 0" class="nearby-home__empty">
          <text class="nearby-home__empty-text">{{ villageStore.nearbyError }}</text>
        </view>
        <view v-else-if="circlePosts.length === 0" class="nearby-home__empty">
          <text class="nearby-home__empty-text">{{ t('nearby.postsEmpty') }}</text>
        </view>
        <!-- MP-R1-PAGES-NEARBY-INDEX-013：帖子列表收进已登录分支（v-else-if 链末尾）——
             登出/换号后 villageStore.nearbyPosts 不清理，未登录态原会在引导卡下方
             渲染上一账号的旧帖（跨账号数据残留） -->
        <template v-else>
          <view v-for="post in circlePosts.slice(0, 3)" :key="post.id" class="nearby-post-item">
            <PostCard
              :post="post"
              @like="onPostLike"
              @favorite="onPostFavorite"
              @follow="onPostFollow"
              @open-detail="onPostDetail"
              @open-author="onPostAuthor"
              @open-tag="onPostTag"
              @open-activity="onPostActivity"
              @enroll="onPostActivity"
            />
            <!-- R20（2026-09-08）：移除仅首帖出现的粉色「认识 TA」按钮——
                 规则不可感知（为何只有第一条？）导致功能感知混乱；
                 作者互动统一由 PostCard 作者行的「关注」芯片承接（与理想图一致） -->
          </view>
        </template>
      </NearbySection>

      <view class="nearby-home__footer-space" />
    </scroll-view>
    <!-- 缺陷4-6：右下角发帖 FAB（理想图 附近的首页.png 有；fixed 定位不吃滚动层热区，
         组件自身按 isPostPublishOpen 配置闸显隐，跳转与页头「发动态」药丸同落点） -->
    <GlobalPublishFab @publish="goToPublishPost" />
  </view>
</template>

<style scoped lang="scss">
.nearby-home {
  min-height: 100%;
  background: var(--c-bg-page, #EEF7F2);
  /* R2b-L02-D08：原 `padding: 24rpx 32rpx 0` 简写把底部归零，scoped 权重高于根节点
     共用类 .page-bottom-safe（App.vue 给 112rpx+安全区），导致固定 TabBar 永久压住末屏
     内容（第 3 张活动卡下缘 + 分区⑤「附近动态」整块不可见）。拆成 top/left/right，
     底部单独避让，口径同 messages/index.vue:671（读 --tabbar-height + 呼吸位）。
     仅改本页规则，未触碰共用类 .page-bottom-safe（其归属另一泳道）。
     R7-L02-D05：避让口径由 --tabbar-height（App.vue:751 = 112rpx + 单 env）改读单一来源
     避让令牌 --tab-bar-total-h（theme/design-variables.scss:491 = 184rpx + 双 env，源头是
     custom-tab-bar/index.wxss:17-19 的 height:160rpx+env 配 content-box padding-bottom:env+24rpx）。
     原口径比真实 tabBar 实占少让 72rpx + 一个安全区 ⇒ 底部帧分区⑤首张帖卡被固定条压到只剩
     一条上缘、滚到底也抬不出来。+24rpx 呼吸位保留，写法同 discover/index.vue:406。 */
  padding-top: 24rpx;
  padding-left: 32rpx;
  padding-right: 32rpx;
  padding-bottom: calc(var(--tab-bar-total-h, 184rpx + env(safe-area-inset-bottom) + env(safe-area-inset-bottom)) + 24rpx);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.nearby-home__scroll {
  flex: 1;
  min-height: 0;
}

/* R8-L02-D05（层级遮挡）：状态栏 + 胶囊带等高的固定导航底板（高度由 script 的
   navBandStyle 以 JS 实测值注入，写在标签 style 上 ⇒ 走的是运行时真正生效的那条路径，
   不依赖 env()/CSS 变量——本仓已证实两者在模拟档恒 0，见 :40 的 R20 记录）。
   实色取页面底 --c-bg-page：首屏这块带的底色本来就是它，故 top 态逐像素不变；
   底态滚进来的正文被它整块吃掉，不再与系统胶囊（x≈272-370 / y≈28-60）叠压。
   pointer-events:none ⇒ 热区全部留给其下的可点件。 */
.nearby-home__nav-band {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
  background: var(--c-bg-page, #EEF7F2);
  pointer-events: none;
}

/* 修复图片过大问题：全局约束附近页所有图片容器 */
.nearby-home image {
  max-width: 100%;
  max-height: 400rpx;
}

/* R8-L02-D05：页头抬到固定导航底板（.nearby-home__nav-band，z-index:5）之上——
   静态元素不参与 z-index 竞争，故必须先给 position:relative。 */
.nearby-home__header {
  position: relative;
  z-index: 6;
  margin-bottom: 8rpx;
  /* R8-L02-D01（位置）：删除 `padding-right: calc(var(--capsule-right, 7px) + 120px)`。
     页头行的顶缘由根节点 :419 的 paddingTop（statusBar+12）+ .nearby-home 的 24rpx 决定，
     实测落在 y≈70-95，而系统胶囊实测 y≈28-66 —— 页头整体已在胶囊下方，横向再让 120px
     是第二次让位：把「发动态」右缘顶到 x≈228（帧宽 378 的 60%），右侧空出约 124px≈246rpx。
     回到根容器的 32rpx 页边距口径（.nearby-home :729 padding-right:32rpx），
     「发动态」即右对齐到页面右缘 x≈352，与理想图一致。胶囊避让由 padding-top（纵向）承担。 */
}

.nearby-home__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nearby-home__title {
  font-size: 48rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

/* MP-R1-PAGES-NEARBY-INDEX-904：标题组（绿针 + 「附近」）与右侧操作组（放大镜 + 发动态） */
.nearby-home__title-group {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}

.nearby-home__actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

/* 定位针（标题 40rpx / 副标题 24rpx），品牌绿 SVG 素材，非 emoji */
.nearby-home__pin {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.nearby-home__pin--sm {
  width: 24rpx;
  height: 24rpx;
}

/* 放大镜按钮：R7-L02-D02 热区由 80rpx 抬到全站 88rpx 最小可点件口径
   （同行「发动态」胶囊与五宫格底板 :1257 均为 88rpx，本枚是页头唯一低于口径的可点件）。
   44rpx 字形尺寸不动，只放大热区。 */
.nearby-home__search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
}

/* MP-R1-PAGES-NEARBY-INDEX-904：原为整行搜索框遗留的死样式（MP-R2-PAGES-NEARBY-INDEX-005
   挂账项），现由放大镜图标复用；删除对 <image> 无效的 color 声明（同 MP-R1-PAGES-DISCOVER-INDEX-011 口径） */
.nearby-home__search {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
}

.nearby-home__publish {
  /* R9-L02-D03（尺寸比例）：原 24rpx 文字（行高≈34rpx）+ 上下 12rpx padding ≈ 58rpx，
     帧实测药丸总高 30px≈60rpx（上沿 11px 被胶囊吃掉），低于本页 :1044 自述的 88rpx
     最小可点件口径。改 flex 居中 + min-height:88rpx，胶囊与同行 88rpx 的
     .nearby-home__search-btn 等高，热区补齐 30rpx（≈34%）。 */
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88rpx;
  padding: 0 28rpx;
  border-radius: var(--r-full, 9999rpx);
  /* R9-L02-D02（可达性）：白字压 --c-brand #36C99A 实测 2.08:1（L=0.4501 对白 1.0），
     远低于正文 4.5:1。钮面升 --c-brand-800 #156B51：白字 6.45:1，
     与 LockScreen 主 CTA 同档（同仓既有裁决）。 */
  background: var(--c-brand-800, #156B51);
}

.nearby-home__publish-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

/* R8-L02-D03：定位行改可点件——热区抬到本页 goSearch 那颗 .nearby-home__search-btn
   （:800 起）同级的 88rpx 最小可点件口径，内容仍靠左、视觉位置只随热区下移居中。 */
.nearby-home__subtitle-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
  min-height: 88rpx;
}

.nearby-home__subtitle {
  font-size: 24rpx;
  color: var(--c-text-secondary, #666666);
}

/* 定位行动作值（空态「重试」/有值「切换城市」）：24rpx 同正文字号、加粗以区别于只读正文。
   色取 --c-text-secondary #4A524E —— 相对亮度 0.0803：压页面底 --c-bg-page #EEF7F2（0.8957）
   = 7.26:1，压白底 = 8.06:1，两档都过 4.5:1。不取 --c-text-tertiary #6B7571（0.1704）：
   它对 #EEF7F2 只有 4.29:1、对白底 4.76:1，跨两种底色时低于门槛。
   也不用品牌绿：本页的绿色只留给既有品牌件（.nearby-home__publish 那颗实色胶囊）。 */
.nearby-home__location-action {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-secondary, #4A524E);
}

/* ========== R8-L02-D04：分区①「距离/同城」分段控件 + 人卡横滑 ========== */
.people-segment {
  display: flex;
  gap: 12rpx;
}

/* 热区 88rpx = 本页既有最小可点件口径（同 .nearby-home__search-btn 的 88rpx） */
.people-segment__item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
}

.people-segment__text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-secondary, #4A524E);
}

/* 选中态：白字压 --c-brand-800 #156B51（相对亮度 0.1127）⇒ 1.05/0.1627 = 6.45:1，
   过 4.5:1；不压 --c-brand #36C99A / --c-brand-600 #2AAE83（白字分别只有 1.9/2.8:1）。
   本页品牌绿实色底一律取 brand-800 这一档。 */
.people-segment__item--active {
  background: var(--c-brand-800, #156B51);
  border-color: var(--c-brand-800, #156B51);
}

.people-segment__item--active .people-segment__text {
  color: var(--c-text-inverse, #FFFFFF);
}

.people-scroll {
  width: 100%;
  margin-top: 16rpx;
}

.people-scroll__list {
  display: flex;
  gap: 16rpx;
  padding: 0 0 8rpx;
}

.person-mini {
  width: 200rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8rpx;
  padding: 16rpx;
  border-radius: 20rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
  box-sizing: border-box;
}

/* 头像尺寸写在本页自有节点上，SafeImage 靠宿主 :host 的 100%/100% 填满
   （200 − 2×16 内衬 = 168rpx）——custom-class 那条路在本仓被证伪：类名落在组件内部节点、
   不带宿主页 data-v，宿主 scoped 规则永不命中。 */
.person-mini__avatar-wrap {
  width: 168rpx;
  height: 168rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--c-bg-surface, #EEF7F2);
}

.person-mini__name {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-mini__meta {
  font-size: 22rpx;
  color: var(--c-text-secondary, #4A524E);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 热门兴趣圈 */
.circle-scroll {
  width: 100%;
}

.circle-scroll__list {
  display: flex;
  /* R2b-L02-D09：可用宽 = 750 − 2×32(.nearby-home 左右内边距) = 686rpx。
     原 gap:12 + 卡宽 160 → 4 卡右缘 676（余 10rpx），第 5 卡左缘 688 仅越界 2rpx，
     rpx 取整后在视口右缘露出约 4px 残影。改 gap:24 + 卡宽 150：
     4×150 + 3×24 = 672（第 4 卡右缘留 14rpx 余量，完整可见），
     第 5 卡左缘 = 672 + 24 = 696 ≥ 686 + 10 → 静止位第 5 卡完全落在裁剪框外，无残影。 */
  gap: 24rpx;
  padding: 0 0 8rpx;
}

.circle-mini {
  /* 第五轮 R5：对齐理想图《附近的首页》——竖版 3:4 小海报卡
   * MP-R1-PAGES-NEARBY-INDEX-905 / MP-R2-PAGES-NEARBY-INDEX-003：尺寸按理想图实测
   * （素材/理想效果图/附近的首页.png 宽 852px，750rpx/852px=0.88rpx/px，
   *  首行 4 卡实测 185×295px ≈ 163×260rpx）取 150×256rpx（R2b-L02-D09：由 160 收窄到 150，
   *  配合 gap 24 让第 5 卡完全落在裁剪框外，见 .circle-scroll__list 算术），高度保竖版海报比例。 */
  position: relative;
  width: 150rpx;
  height: 256rpx;
  flex-shrink: 0;
  border-radius: 28rpx;
  overflow: hidden;
  background: var(--c-line, #EEF2F0);
}

.circle-mini__cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.circle-mini__emoji {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 88rpx;
}

/* 2026-08-26：圈子图标 SVG（替代 emoji 字符，视觉尺寸与原 emoji 一致） */
.circle-mini__icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 88rpx;
  height: 88rpx;
}

.circle-mini__overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  /* MP-R1VIS-PAGES-NEARBY-INDEX-002：加强压暗 scrim——浅色插画封面上白字对比度
     实测仅 2.22~2.67:1（WCAG 大字 3:1 / 正文 4.5:1 均不达标）；渐变提高至 60% 高、
     末端 alpha 0.72，目标文字带实测 ≥4.5:1（理想图实测 10.44:1） */
  height: 60%;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.72) 100%);
}

.circle-mini__info {
  position: absolute;
  left: 16rpx;
  right: 16rpx;
  bottom: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  z-index: 2;
}

.circle-mini__name {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.circle-mini__count {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
}

/* 校园圈（MP-R1-PAGES-NEARBY-INDEX-906：理想图的 4 联竖版封面卡，flex 行排布，小程序端不用 grid） */
.campus-cards {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
}

/* R8-L02-D06（颜色token）：校园圈卡按理想图归一为「白底 + 近黑标题 + 灰副标」，
   品牌绿只留给状态胶囊这一枚（原卡底 --c-brand-50 / 校名 --c-brand-600 / 次行 --c-brand-700
   三层同色系绿压在一张卡上，层级读不出来）。
   注：卡底在本帧实走 .campus-entry--img 那一条（campusCoverFor 恒给非空 coverUrl），
   缺陷行读 :1011 记的 --c-brand-50 是被 --img 覆盖的那一半——两条一并改成白底，
   不论 coverUrl 有没有值都不会再出现绿底卡。 */
.campus-entry {
  position: relative;
  /* R12-L02-D03（尺寸比例）：原 flex:1 把四张卡均分压到 ~163rpx 宽，封面仅 132rpx，
     卡内纵向三段（封面/校名+次行/状态胶囊）被压扁，与理想图（单卡约 250rpx 宽、
     卡图约 260rpx 高、一屏约 3.5 张、末张被右缘裁切）不符。改定宽 248rpx（flex 不再均分、
     不收缩），一行放不下四张 ⇒ 第 3/4 张溢出由 scroll-view 视口右缘裁切（本页滚动发生在
     scroll-view 内、x 向不可滚 ⇒ 溢出即裁切，无横向滚动条）。 */
  flex: 0 0 248rpx;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8rpx;
  padding: 12rpx 12rpx 16rpx;
  border-radius: 20rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
  overflow: hidden;
}

.campus-entry--img {
  background: var(--c-bg-container, #FFFFFF);
}

.campus-entry__cover-img {
  width: 100%;
  /* R12-L02-D03：封面高随卡宽同步 132→260rpx（理想图卡图比例），flex-shrink 不变 */
  height: 260rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
}

/* 浅绿底卡上的白底封面位展示学校名字（coverUrl 未上传时的诚实兜底，
   不复用 hub.vue 的硬编码封面表，避免第二真相源） */
.campus-entry__badge {
  /* R12-L02-D03：与 __cover-img 同一封面槽位（coverUrl 缺失时的兜底形态），高度同步 260rpx */
  height: 260rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-surface, #EEF7F2);
  flex-shrink: 0;
  overflow: hidden;
  padding: 0 6rpx;
  box-sizing: border-box;
}

/* R8-L02-D06：封面位兜底的校名同样退出品牌绿（原 --c-brand-600 实值 #2AAE83 压白底 2.81:1、
   压浅绿底更低，本就不到 4.5:1），改近黑正文色；白底兜底位也随之换成页面浅绿底，
   避免「白卡上贴一块白」读不出边界。 */
.campus-entry__badge-text {
  font-size: 20rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  line-height: 1.3;
  text-align: center;
  white-space: nowrap;
}

/* 校名 / 次行（同学数无全站数据源，次行仍由真实 city 字段占位——见模板注释与 R8-L02-D07 登记）
   R8-L02-D06：两层文字退出品牌绿系，改「近黑标题 + 灰副标」。
   --c-text-primary #1A1E1C 相对亮度 0.0123 ⇒ 压白底 16.85:1；
   --c-text-secondary #4A524E 相对亮度 0.0803 ⇒ 压白底 8.06:1。
   次行不取 --c-text-tertiary #6B7571：它压白底 4.76:1 勉强过线、压本卡兜底浅绿底
   #EEF7F2（0.8957）只有 4.29:1 ⇒ 低于 4.5:1，按「算不过就换档」的口径取 secondary。 */
.campus-entry__name {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.campus-entry__desc {
  font-size: 20rpx;
  color: var(--c-text-secondary, #4A524E);
  min-height: 26rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 状态胶囊＝本卡唯一的绿色位：浅绿底 + 深绿字。
   --c-brand-800 #156B51（0.1127）压 --c-brand-50 #E8FAF3（0.9200）
   = 0.9700/0.1627 = 5.96:1 ≥ 4.5:1；原 --c-brand-600 #2AAE83（0.3240）压白底只有 2.81:1、
   压浅绿底 2.59:1，两档都不达标，故胶囊字色一并降到 brand-800。 */
.campus-entry__status {
  flex-shrink: 0;
  align-self: flex-start;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: var(--c-brand-50, #E8FAF3);
}

/* 2026-10-26 对齐理想图：未认证本校的「去认证」为浅紫胶囊（逻辑仍走 campusChipKey 三态） */
.campus-entry__status--verify {
  background: var(--c-lavender-50, #F5F3FF);
}

.campus-entry__status--verify .campus-entry__status-text {
  color: var(--c-lavender-500, #8B5CF6);
}

.campus-entry__status-text {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--c-brand-800, #156B51);
}

/* R7-L02-D04：分区④三张活动卡在帧上是直角矩形，而同页同族的 .campus-entry 是
   20rpx 圆角 + 卡片阴影——同页同族两套口径。此处对齐同族的两键。 */
.activity-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  color: var(--c-text-inverse, #FFFFFF);
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  border-radius: 20rpx;
  box-shadow: var(--c-shadow-card, 0 4px 16px rgba(30, 80, 65, 0.08));
  margin-bottom: 16rpx;
}
.activity-entry__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  position: relative;
  z-index: 1;
  /* R7-L02-D03：align-items/justify-content 此前挂在非 flex 容器上（整条规则无
     display:flex），出包后 40rpx 图标不会在 72rpx 杏色底板里居中。补容器声明，
     与本页其它图标底板同一居中口径。 */
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-apricot-100, #FFEDD5);
  flex-shrink: 0;
}
.activity-entry__icon {
  width: 40rpx;
  height: 40rpx;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.activity-entry__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.activity-entry__desc {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.activity-entry__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.activity-entry__arrow {
  font-size: 30rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}

/* 附近动态 */
.nearby-post-item {
  margin-bottom: 16rpx;
}

.nearby-home__empty {
  padding: 40rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nearby-home__empty-text {
  font-size: 24rpx;
  color: var(--c-text-tertiary, #666666);
}

/* MP-R1-PAGES-NEARBY-INDEX-903：受保护源被登录门拦下 → 「登录后看 + 登录入口」空态行
   （与分区⑤的 nearby-login-guide 卡片同口径，横滑/列表区用轻量行态避免三张引导卡堆叠） */
.nearby-home__empty--guide {
  gap: 20rpx;
}

.nearby-home__empty-action {
  flex-shrink: 0;
  padding: 10rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand, #36C99A);
}

.nearby-home__empty-action-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

/* 2026-08-26 R2：未登录「附近动态」登录引导卡片 */
.nearby-login-guide {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  box-shadow: var(--c-shadow-card, 0 4px 16px rgba(30, 80, 65, 0.08));
}

.nearby-login-guide__text {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: var(--c-text-secondary, #666666);
  line-height: 1.5;
}

.nearby-login-guide__btn {
  flex-shrink: 0;
  /* R9-L02-D06（可达性/尺寸）：原 24rpx 文字 + 12rpx 上下 padding ≈ 53rpx（帧实测 24px≈48rpx）
     低于 88rpx 口径，且白字压 --c-brand #36C99A = 2.08:1。与 D02/D03 一并归一：
     热区抬到 min-height:88rpx，钮面升 --c-brand-800 #156B51（白字 6.45:1）。 */
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88rpx;
  padding: 0 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand-800, #156B51);
}

.nearby-login-guide__btn-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

.nearby-tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 8rpx;
  overflow-x: auto;
  white-space: nowrap;
}

.nearby-tabs__item {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.nearby-tabs__item--active {
  background: var(--c-bg-brand, #E8F8F1);
  border-color: var(--c-brand, #36C99A);
}


.nearby-tabs__icon {
  width: 30rpx;
  height: 30rpx;
  flex-shrink: 0;
}

.nearby-tabs__text {
  font-size: 24rpx;
  color: var(--c-text-primary, #222222);
}

.nearby-tabs__item--active .nearby-tabs__text {
  color: var(--c-brand, #36C99A);
  font-weight: 700;
}

.nearby-home__footer-space {
  height: 48rpx;
}
/* 2026-10-26 对齐理想图（附近的首页.png）：五宫格为 5 个独立浅色圆角方块、块间留白、
   图标各带底板——拆掉整体浅色横板（白底/阴影/内边距归零），底板保留在各枚图标上 */
.nearby-entries {
  display: flex;
  justify-content: space-between;
  gap: 8rpx;
  margin: 8rpx 0 24rpx;
  padding: 0;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}

.nearby-entry {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}

.nearby-entry__icon {
  width: 88rpx;
  height: 88rpx;
  /* R2b-L02-D01：理想图五宫格底板是圆角方形（实测≈25px 半径），非正圆。
     取 24rpx 圆角档（--r-xl）。 */
  border-radius: var(--r-xl, 24rpx);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* V-08（第五轮 QA）：5 功能入口 icon 底色五色系对齐（粉/绿/蓝/橙/紫），
   原 people/circle 同为绿色系易混淆，people 改暖粉珊瑚色。
   R9-L02-D04（颜色token）：五枚底板统一为中性 --c-bg-surface #F3FAF6——帧上五块彩色底板并排，
   色彩层级被底板抢掉、读不出「同一组入口」；色系语义保留在下方按枚烘色的图标滤镜里
   （:1685-1697 的 filter 链，逐枚仍是绿/绿/蓝/橙/紫）。 */
.nearby-entry__icon--people { background: var(--c-bg-surface, #F3FAF6); }
.nearby-entry__icon--circle { background: var(--c-bg-surface, #F3FAF6); }
.nearby-entry__icon--campus { background: var(--c-bg-surface, #F3FAF6); }
.nearby-entry__icon--activity { background: var(--c-bg-surface, #F3FAF6); }
.nearby-entry__icon--dynamic { background: var(--c-bg-surface, #F3FAF6); }

.nearby-entry__img {
  width: 44rpx;
  height: 44rpx;
}

/* R7-L02-D01：五宫格五枚字形在帧上全是同一支中性灰描线（源文件 stroke：common/user.svg、
   common/school.svg、common/schedule.svg、common/fire.svg 均 #94A3B8，只有 group.svg #36C99A），
   坐在各自 pastel 底板（:1269-1273）上对比度实测 2.08:1，理想图的四色语义分层整块丢失。
   素材文件不在本车道可改清单内（烘 stroke 需动 static/assets/icons/**.svg 或 images.ts 的
   pkg/tail 登记），故在消费侧按理想图逐枚烘语义色：先 brightness(0) 把任意源色归一成纯黑剪影
   （字形/尺寸/透明度不变），再走 invert→sepia→saturate→hue-rotate→brightness 链解到目标色。
   四条链是用 CSS 滤镜矩阵（sRGB、逐级 8bit 截断）对目标色解出来的，逐条实测残差 0：
     PEOPLE/CIRCLE → #36C99A、CAMPUS → #0EA5E9、ACTIVITY → #F97316、DYNAMIC(我的人脉) → #4F6EF7
   与卡片建议改法给定的五支色逐枚一致；mock / real 两档同一份 CSS，不引新素材、不改引用路径。 */
.nearby-entry__icon--people .nearby-entry__img,
.nearby-entry__icon--circle .nearby-entry__img {
  filter: brightness(0) invert(72.8%) sepia(100%) saturate(297%) hue-rotate(97.3deg) brightness(78.8%);
}
.nearby-entry__icon--campus .nearby-entry__img {
  filter: brightness(0) invert(47.1%) sepia(100%) saturate(491%) hue-rotate(155.7deg) brightness(93.6%);
}
.nearby-entry__icon--activity .nearby-entry__img {
  filter: brightness(0) invert(28.8%) sepia(100%) saturate(585%) hue-rotate(347.2deg) brightness(149.6%);
}
.nearby-entry__icon--dynamic .nearby-entry__img {
  filter: brightness(0) invert(35%) sepia(100%) saturate(991%) hue-rotate(209.7deg) brightness(96.9%);
}

.nearby-entry__label {
  font-size: 22rpx;
  color: var(--c-text-secondary, #4A524E);
  text-align: center;
  white-space: nowrap;
}

</style>