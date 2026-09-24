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
import { SCHOOLS, type School } from "../../config/schools";
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
// 同步自定义 TabBar 选中状态（tab 顺序：首页0/附近1/匹配2/消息3/我的4）
useTabBar(1);

const statusBarHeightPx = useStatusBarHeight();

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

/** 校园入口（前 4 所）。R3：用户本校置顶（原固定取前 4 所，本校不在首屏，与定位文案自相矛盾） */
const schoolEntries = computed(() => {
  const myCampus = sessionStore.userSession?.campusName?.trim();
  if (!myCampus) return SCHOOLS.slice(0, 4);
  const mine = SCHOOLS.find((s) => s.name === myCampus);
  const rest = SCHOOLS.filter((s) => s.name !== myCampus);
  const mineEntry: School = mine ?? { id: `session-${myCampus}`, name: myCampus };
  return [mineEntry, ...rest].slice(0, 4);
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

/** R16（2026-09-07）：附近页搜索关键词——此前未声明导致输入无法绑定（搜索失效根因） */
const searchKeyword = ref("");

/** 首页子标题：北京大学 · 3km */

const homeSubtitle = ref(buildLocationText("", sessionStore.userSession?.campusName));

async function initLocation() {
  const loc = await fetchCurrentLocation();
  if (loc) {
    homeSubtitle.value = buildLocationText(loc.city, sessionStore.userSession?.campusName);
    // R16（2026-09-07）：定位成功立即上报坐标（force 跳过节流）——
    // 此前 nearby 页只取城市不上报，后端推荐距离仍按旧坐标/默认点计算，
    // 出现「1893km」级异常距离与区域错乱
    void reportLocation(loc.latitude, loc.longitude, true).catch(() => {});
    // 2026-08-27 修复：定位成功后用真实城市刷新附近动态（不再仅登录态）。
    // MP-R1-PAGES-NEARBY-INDEX-001：城市变化强制重拉（绕过 30s TTL），但仍受登录门约束
    if (loc.city && loc.city !== currentCity.value) {
      currentCity.value = loc.city;
      // MP-R1-PUBLISH-006：持久化城市（publish 页「添加位置 · 自动定位」的数据源，
      // 原全库无写入方导致其恒显示缺省「北京市」）
      try {
        uni.setStorageSync(STORAGE_KEYS.NEARBY_CITY, loc.city);
      } catch (_e) { /* storage 失败不影响主流程 */ }
      if (canFetchProtected()) {
        void loadCirclePosts(true);
      }
    }
  }
}

onLoad(() => {
  loadNearbyData();
  void initLocation();
});

onShow(() => {
  // MP-R1-PAGES-NEARBY-INDEX-002/004：原 onShow 仅刷新本页从不渲染的 peoplePreview
  // 死链；现按 TTL 刷新页面真实可见数据源（附近动态 30s / 活动 store 内 30s TTL），
  // 未登录（real）不发受保护请求，登录后由 watch(isLoggedIn) 补拉。
  if (canFetchProtected()) {
    void loadCirclePosts();
    void loadActivities();
  }
});

onPullDownRefresh(() => {
  // MP-R1-PAGES-NEARBY-INDEX-003：下拉刷新并行重拉全部可见数据源（force 绕过
  // 「空列表才拉取」与 30s TTL 短路），完成后才停止下拉动画。
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

/** 搜索（附近内容）：R16 带关键词跳搜索页（搜索页 onLoad 支持 keyword 自动搜索） */
function goSearch() {
  const kw = searchKeyword.value.trim();
  openAppPath(kw ? `${ROUTES.SEARCH}?keyword=${encodeURIComponent(kw)}` : ROUTES.SEARCH);
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
  // R21：对齐理想图（1.2w / 8,932）——千位以下展示精确人数（千分位），不再用英文 k 单位
  if (count >= 1000) return count.toLocaleString("en-US");
  return String(count);
}
</script>

<template>
  <view
    class="nearby-home page-bottom-safe"
    :style="[{ paddingTop: statusBarHeightPx + 12 + 'px' }, menuStyleVars]"
  >
    <scroll-view scroll-y class="nearby-home__scroll" :show-scrollbar="false">
      <!-- 顶部：附近 + 子标题 + 发帖 -->
      <view class="nearby-home__header">
        <view class="nearby-home__title-row">
          <text class="nearby-home__title">{{ t('nearby.title') }}</text>
          <view class="nearby-home__publish press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.publishToday')" @tap="goToPublishPost">
            <text class="nearby-home__publish-text">{{ t('nearby.publishToday') }}</text>
          </view>
        </view>
        <!-- 2026-09-06：搜索由图标改为真实输入框（确认后带关键词进搜索页） -->
        <view class="nearby-home__search-box">
          <image class="nearby-home__search-icon" :src="IMAGE_PATHS.ICONS_COMMON.SEARCH" mode="aspectFit" alt="" />
          <input
            v-model="searchKeyword"
            class="nearby-home__search-input"
            :placeholder="t('nearby.searchPlaceholder')"
            placeholder-class="nearby-home__search-placeholder"
            confirm-type="search"
            :aria-label="t('nearby.searchPlaceholder')"
            @confirm="goSearch"
          />
        </view>
        <text class="nearby-home__subtitle">{{ homeSubtitle }}</text>
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
            <image class="nearby-entry__img" :src="IMAGE_PATHS.NEARBY_ICONS.CIRCLE" mode="aspectFit" alt="" />
          </view>
          <text class="nearby-entry__label">{{ t('nearby.hotCircles') }}</text>
        </view>
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.campusCircles')" @tap="goCampusHub()">
          <view class="nearby-entry__icon nearby-entry__icon--campus">
            <image class="nearby-entry__img" :src="IMAGE_PATHS.NEARBY_ICONS.CAMPUS" mode="aspectFit" alt="" />
          </view>
          <text class="nearby-entry__label">{{ t('nearby.campusCircles') }}</text>
        </view>
        <view class="nearby-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.activitiesTitle')" @tap="goActivityList">
          <view class="nearby-entry__icon nearby-entry__icon--activity">
            <image class="nearby-entry__img" :src="IMAGE_PATHS.NEARBY_ICONS.ACTIVITY" mode="aspectFit" alt="" />
          </view>
          <text class="nearby-entry__label">{{ t('nearby.activitiesTitle') }}</text>
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

      <!-- ① 附近的人（含同城） -->
      <NearbySection :title="t('nearby.peopleTitle')">
        <view class="people-entry-list">
          <view class="people-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.peopleNearby')" @tap="goPeople('nearby')">
            <view class="people-entry__icon-wrap">
              <image class="people-entry__icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCATION" mode="aspectFit" alt="" />
            </view>
            <view class="people-entry__body">
              <text class="people-entry__title">{{ t('nearby.peopleNearby') }}</text>
              <text class="people-entry__desc">{{ t('nearby.peopleNearbyDesc') }}</text>
            </view>
            <text class="people-entry__arrow">›</text>
          </view>
          <view class="people-entry press-feedback" hover-class="press-feedback--active" hover-stay-time="40" role="button" :aria-label="t('nearby.peopleCity')" @tap="goPeople('city')">
            <view class="people-entry__icon-wrap people-entry__icon-wrap--city">
              <image class="people-entry__icon" :src="IMAGE_PATHS.ICONS_EMOJI.GROUP" mode="aspectFit" alt="" />
            </view>
            <view class="people-entry__body">
              <text class="people-entry__title">{{ t('nearby.peopleCity') }}</text>
              <text class="people-entry__desc">{{ t('nearby.peopleCityDesc') }}</text>
            </view>
            <text class="people-entry__arrow">›</text>
          </view>
        </view>
      </NearbySection>

      <!-- ② 热门兴趣圈（开放加入，无需校园认证） -->
      <NearbySection :title="t('nearby.hotCircles')" :more-text="t('nearby.viewAll')" @more="goCircleList">
        <!-- MP-R2-PAGES-NEARBY-INDEX-003：分区②补三态（原彻底无状态：失败后只剩标题） -->
        <view v-if="circleStore.loading && hotCircles.length === 0" class="nearby-home__empty">
          <SkeletonBlock variant="list" :rows="2" :label="t('common.loading')" />
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

      <!-- ③ 校园圈（公开可看、认证进私域） -->
      <NearbySection :title="t('nearby.campusCircles')" :more-text="t('nearby.viewAll')" @more="goCampusHub()">
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
          <!-- 第五轮 QA（补做）：统一浅绿背景 + 名字；coverUrl 上传后显示图片（保留上传能力） -->
          <image v-if="school.coverUrl" class="campus-entry__cover-img" :src="school.coverUrl" mode="aspectFill" alt="" />
          <view v-else class="campus-entry__badge">
            <text class="campus-entry__badge-text">{{ school.name }}</text>
          </view>
          <view class="campus-entry__body">
            <text class="campus-entry__name">{{ school.name }}</text>
            <text class="campus-entry__desc">{{ t('nearby.campusPublicHint') }}</text>
          </view>
          <view class="campus-entry__status">
            <!-- MP-R1-PAGES-NEARBY-INDEX-902：接入认证状态双态——本校已认证「已加入」、
                 本校未认证「去认证」、其余「公开浏览」（原恒为「公开浏览」） -->
            <text class="campus-entry__status-text">{{ t(campusChipKey(school.name)) }}</text>
          </view>
          <text class="campus-entry__arrow">›</text>
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
            <image class="activity-entry__icon" :src="IMAGE_PATHS.ICONS_EMOJI.FIRE" mode="aspectFit" alt="" />
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
  </view>
</template>

<style scoped lang="scss">
.nearby-home {
  min-height: 100%;
  background: var(--c-bg-page, #EEF7F2);
  /* R20：padding-top 注入状态栏高度（env() 在模拟器为 0 会顶进状态栏）；
     R10-P1-003：收敛自造变量 --statusbar-height → 统一 var(--statusbar, env(...)) 兜底链 */
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 20px + 24rpx) 32rpx 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.nearby-home__scroll {
  flex: 1;
  min-height: 0;
}

/* 修复图片过大问题：全局约束附近页所有图片容器 */
.nearby-home image {
  max-width: 100%;
  max-height: 400rpx;
}

.nearby-home__header {
  margin-bottom: 8rpx;
  /* 右侧避让微信胶囊（--capsule-right≈7px 间隙 + 胶囊 87px + 120px 缓冲），
     「发动态」胶囊与系统胶囊保持充足间距 */
  padding-right: calc(var(--capsule-right, 7px) + 120px);
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

.nearby-home__search {
  width: 40rpx;
  height: 40rpx;
  margin-right: 12rpx;
  color: var(--c-text-tertiary, #999999);
  flex-shrink: 0;
}

.nearby-home__publish {
  padding: 12rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand, #36C99A);
}

.nearby-home__publish-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

.nearby-home__search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 16rpx;
  padding: 16rpx 24rpx;
  border-radius: var(--r-full, 9999rpx);
  background: rgba(255, 255, 255, 0.9);
  border: 1rpx solid var(--c-line, #E3EDE8);
}

.nearby-home__search-icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.nearby-home__search-input {
  flex: 1;
  height: 40rpx;
  font-size: 26rpx;
  color: var(--c-text-primary, #222222);
}

.nearby-home__search-placeholder {
  color: var(--c-text-tertiary, #999999);
}

.nearby-home__subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--c-text-secondary, #666666);
}

/* 附近的人 */
.people-entry-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.people-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  box-shadow: var(--c-shadow-card, 0 4px 16px rgba(30, 80, 65, 0.08));
}

.people-entry__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-brand-50, #E8FAF3);
  flex-shrink: 0;
}

.people-entry__icon-wrap--city {
  background: var(--c-romance-100, #FFD9DF);
}

.people-entry__icon {
  width: 40rpx;
  height: 40rpx;
}

.people-entry__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.people-entry__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.people-entry__desc {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.people-entry__arrow {
  font-size: 30rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}

/* 热门兴趣圈 */
.circle-scroll {
  width: 100%;
}

.circle-scroll__list {
  display: flex;
  gap: 12rpx;
  /* R21：卡片收窄后右内边距同步收敛，避免末卡之后留白突兀
     MP-R1-PAGES-NEARBY-INDEX-905：按 750rpx-页边距-3×gap 计算联排，4 卡恰好满宽 */
  padding: 0 16rpx 8rpx 16rpx;
}

.circle-mini {
  /* 第五轮 R5：对齐理想图《附近的首页》——竖版 3:4 小海报卡
   * R21：166→150rpx 收窄，保证 4 张卡完整落在视口内（此前第 4 张被右缘裁切约 1/3）
   * MP-R1-PAGES-NEARBY-INDEX-905：恢复理想图竖版海报比例（约 170×290rpx），
   * 收敛 gap/padding 使 4 卡完整落视口、无第 5 卡残影 */
  position: relative;
  width: 170rpx;
  height: 290rpx;
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

/* 校园圈（第五轮 QA 补做：统一浅绿背景 + 学校名字；coverUrl 上传后显示图片） */
.campus-entry {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  /* 统一浅绿背景（不再每校一色渐变） */
  background: var(--c-brand-50, #E6F6EF);
  border: 1rpx solid var(--c-brand-100, #D3EDE0);
  margin-bottom: 16rpx;
  overflow: hidden;
}

.campus-entry--img {
  background: var(--c-neutral-100, #F2F4F3);
}

.campus-entry__cover-img {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
}

/* 浅绿底圆角方块展示学校名字（替代原首字徽标）
   R21：4 字校名一行完整显示（此前硬换行成「北京大/学」半裁切观感） */
.campus-entry__badge {
  width: 84rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  flex-shrink: 0;
  overflow: hidden;
}

.campus-entry__badge-text {
  font-size: 16rpx;
  font-weight: 700;
  color: var(--c-brand-600, #1F9A75);
  line-height: 1.3;
  text-align: center;
  white-space: nowrap;
  letter-spacing: -0.5rpx;
}

.campus-entry__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

/* 第五轮 QA（补做）：浅绿底上文字用深绿系，保证可读性 */
.campus-entry__name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-brand-600, #1F9A75);
}

.campus-entry__desc {
  font-size: 22rpx;
  color: var(--c-brand-700, #2E8B6A);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.campus-entry__status {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  /* 第五轮 QA（补做）：浅绿底上状态胶囊用白底 + 深绿字 */
  background: #FFFFFF;
  align-self: center;
}

.campus-entry__status-text {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--c-brand-600, #1F9A75);
}

.campus-entry__arrow {
  font-size: 30rpx;
  color: var(--c-brand-600, #1F9A75);
  opacity: 0.85;
  font-weight: 600;
  align-self: center;
}

.activity-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  color: var(--c-text-inverse, #FFFFFF);
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  margin-bottom: 16rpx;
}
.activity-entry__icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
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
  padding: 12rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand, #36C99A);
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
.nearby-entries {
  display: flex;
  justify-content: space-between;
  gap: 8rpx;
  margin: 8rpx 0 24rpx;
  padding: 24rpx 12rpx;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
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
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* V-08（第五轮 QA）：5 功能入口 icon 底色五色系对齐（粉/绿/蓝/橙/紫），
   原 people/circle 同为绿色系易混淆，people 改暖粉珊瑚色 */
.nearby-entry__icon--people { background: var(--c-tint-pink-soft, #FFF0F3); }
.nearby-entry__icon--circle { background: var(--c-bg-brand, #E8F5E4); }
.nearby-entry__icon--campus { background: var(--c-tint-blue-soft, #EEF3FF); }
.nearby-entry__icon--activity { background: var(--c-tint-cream-50, #FFF5E6); }
.nearby-entry__icon--dynamic { background: var(--c-lavender-100, #F0EEFF); }

.nearby-entry__img {
  width: 44rpx;
  height: 44rpx;
}

.nearby-entry__label {
  font-size: 22rpx;
  color: var(--c-text-secondary, #4A524E);
  text-align: center;
  white-space: nowrap;
}

</style>