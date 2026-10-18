<script setup lang="ts">


/**
 * 校园圈 Hub（v3 Nearby 冻结 · 04_campus_circle）
 * 加入校园圈引导 + 校园列表（未认证/认证中/已认证/非本校 四态）+ 校园圈推荐。
 * 点击学校：已认证本校 → 私域（campus/index?school=）；其他 → 公开浏览。
 */
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCampusStore } from "../../../stores/campus";
import { useSessionStore } from "../../../stores/session";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { SCHOOLS } from "../../../config/schools";
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
import { IMAGE_PATHS } from "../../../config/images";
// 第五轮 QA（补做）：校园圈卡片统一浅绿背景 + 学校名字，移除每校一色渐变与首字徽标。
// 渲染逻辑支持 coverUrl：coverUrl 非空 → 显示图片；空 → 浅绿背景 + 学校名字。

const { t } = useI18n();
const campusStore = useCampusStore();
const sessionStore = useSessionStore();
const { styleVars: menuStyleVars } = useMenuButtonRect();
const { certificationStatus, certificationInfo, isVerified } = storeToRefs(campusStore);

/** 2026-08-20：校园圈搜索关键词（参考图顶部搜索框对齐） */
const searchKeyword = ref("");

/**
 * 2026-08-27 校园圈修复：校园封面图映射（复用 /static/generated/images/campus 既有素材，
 * 让每个校园圈卡片都有真实封面图，不再只有浅绿背景 + 学校名）。
 */
const CAMPUS_COVER: Record<string, string> = {
  // 2026-09-03 可选缺口清零：头部三校换专属地标封面（AI 生成实景风格，对齐理想效果图）
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

/** 2026-08-27 校园圈修复：展示全部学校圈（不再只取前 6 个），并附加校园封面图
 *  2026-09-12 素材补齐：无地标专属封面的学校兜底改用 campus-circle-cover（摄影级校园场景），
 *  不再回落到「浅绿背景 + 学校名」 */
const schools = SCHOOLS.map((s) => ({
  ...s,
  coverUrl: CAMPUS_COVER[s.id] || s.coverUrl || IMAGE_PATHS.CIRCLE_COVERS.CAMPUS,
}));

/** 校园圈展示数据（对齐理想图 校园圈.png 数据行口径「3.2k 位同学 · 2.8w 条动态」）
 *  R2b-L05-D11（回退上一轮两处偏离理想图的改动）：
 *   1) 回退 R3 的「文案精简（位同学→同学、条动态→动态）」——量词「位/条」是理想图原文，
 *      精简后读作「3.2k 同学」，与理想图不一致；当初的换行动机（「态」字孤行）已由
 *      .campus-school-card__stats 的 white-space: nowrap 单行方案承担，无需再靠删字解决。
 *   2) 删除 R1-L05-D16 引入的 prefixTilde「约」前缀——理想图统计串无「约」，
 *      且该前缀只加在 members/posts 上，peers 不加，同一行内口径不一致。
 *  MP-R2-CAMPUS-HUB-007 的「本表为演示估算值」语义保留在本注释与下方 TODO：
 *  后端 campuses 接口就绪后整表由接口数据替换，届时不再有估算值问题。 */
const schoolStats: Record<string, { members: string; posts: string; peers: string }> = {
  pku: { members: "3.2k 位同学", posts: "2.8w 条动态", peers: "等 342 位同学" },
  thu: { members: "2.6k 位同学", posts: "2.1w 条动态", peers: "等 256 位同学" },
  ruc: { members: "2.1k 位同学", posts: "9.8k 条动态", peers: "等 301 位同学" },
  fudan: { members: "1.8k 位同学", posts: "1.5w 条动态", peers: "等 210 位同学" },
  sjtu: { members: "2.4k 位同学", posts: "1.9w 条动态", peers: "等 278 位同学" },
  tongji: { members: "1.7k 位同学", posts: "1.3w 条动态", peers: "等 194 位同学" },
  zju: { members: "1.4k 位同学", posts: "1.1w 条动态", peers: "等 163 位同学" },
  nju: { members: "1.6k 位同学", posts: "1.2w 条动态", peers: "等 187 位同学" },
  whu: { members: "1.9k 位同学", posts: "1.4w 条动态", peers: "等 225 位同学" },
  sysu: { members: "1.3k 位同学", posts: "9.5k 条动态", peers: "等 152 位同学" },
  szu: { members: "1.2k 位同学", posts: "8.6k 条动态", peers: "等 138 位同学" },
};

function statsOf(school: { id: string }): { members: string; posts: string; peers: string } {
  const fallback = { members: "1.0k 位同学", posts: "8k 条动态", peers: "等 120 位同学" };
  return schoolStats[school.id] ?? fallback;
}

/** R2b-L05-D11：理想图卡片标题为「北京大学圈 / 清华大学圈」带「圈」后缀，
 *  而数据源（config/schools.ts SCHOOLS[].name）是校名本体「北京大学」——后缀属展示层，
 *  在模板侧拼接（endsWith 守卫，避免数据侧将来自带后缀时拼成「北京大学圈圈」）。 */
function schoolTitle(name: string): string {
  if (!name) return "";
  return name.endsWith("圈") ? name : `${name}圈`;
}

/** 我加入的（本校已认证）。
 * MP-R2-CAMPUS-HUB-002：补认证门槛——bindSchool 直写 campusName 不经认证，
 * 未认证但已绑定学校的用户原会看到「未认证」badge + 「进入」CTA 的矛盾组合
 * （进入后被 campus/index 门禁又降级为公开浏览） */
const joinedSchools = computed(() =>
  isVerified.value ? schools.filter((sc) => sc.name === ownSchool.value) : []
);
/** 推荐圈子（其他学校）。
 * MP-R1-CH06-01 / MP-R1-SUBPACKAGES-CAMPUS-CAMPUS-HUB-001/REQ-01：排除本校仅在
 * 已认证时生效——未认证用户的 ownSchool 回退 session.campusName（注册选校即写入），
 * 原实现无条件排除导致本校圈在本页「看不到、搜不到、进不去」（推荐 10 卡无北大、
 * 搜索「北京」空态）；未认证时本校卡应以「未认证」badge + 公开浏览视角出现在推荐列表 */
const recommendedSchools = computed(() =>
  isVerified.value && ownSchool.value ? schools.filter((sc) => sc.name !== ownSchool.value) : schools
);

const isPending = computed(() => certificationStatus.value === "pending");
const ownSchool = computed(() => certificationInfo.value?.schoolName || sessionStore.userSession?.campusName || "");

/**
 * MP-R1-CAMPUS-HUB-001：badge 三态（认证通过/审核中/未认证）——
 * 未认证用户不再被谎报为「认证中」，且每个状态都有对应配色修饰类；
 * 推荐 Tab 统一显示「未认证」灰胶囊。
 */
const joinedBadge = computed<{ text: string; class: string }>(() => {
  if (activeTab.value === "recommend") {
    return { text: t("campus.hub.unverified"), class: "campus-school-card__badge--unverified" };
  }
  if (isVerified.value) {
    return { text: t("campus.hub.certified"), class: "campus-school-card__badge--verified" };
  }
  if (isPending.value) {
    return { text: t("campus.hub.statusPending"), class: "campus-school-card__badge--pending" };
  }
  return { text: t("campus.hub.unverified"), class: "campus-school-card__badge--unverified" };
});

/** 当前选中的 Tab：joined = 我加入的，recommend = 推荐圈子
 * 2026-08-27 校园圈修复：默认落到「推荐圈子」，避免"我加入的"仅有 1 校导致页面大片空白 */
const activeTab = ref<"joined" | "recommend">("recommend");

/**
 * 校园圈封面：2026-08-27 修复后由 CAMPUS_COVER 提供各校封面图（见上方定义），
 * 卡片封面区渲染校园风景图；未命中时回退浅绿背景 + 学校名字。
 * coverUrl 数据模型保留（config/schools.ts School.coverUrl?），未来后端下发时优先使用。
 */

/** Tab 切换过滤列表 */
const filteredSchools = computed(() => {
  const base = activeTab.value === "joined" ? joinedSchools.value : recommendedSchools.value;
  const kw = searchKeyword.value.trim();
  const list = kw
    ? base.filter((sc) => sc.name.includes(kw) || sc.id.includes(kw.toLowerCase()))
    : base;
  return list.map((sc) => ({ ...sc, stats: statsOf(sc) }));
});

/**
 * R2b-L05-D15（需新建 / 列表末尾「查看更多校园圈 ⌄」入口）
 *
 * 理想图 校园圈.png 列表末尾那行是「灰色文字 + 向下箭头」的**可点入口**，且理想图在该行之上
 * 正好排了 6 张卡。原实现（MP-R1-CAMPUS-HUB-003）因为「箭头暗示可展开但点击无响应」是死元素，
 * 把箭头删了、文案换成静态「更多校园圈持续接入中」——那是拿掉入口去迁就坏实现，
 * 方向与理想图相反（R2b-L05-D15 判为「上一轮修得不对」）。
 *
 * 这里把语义补全而不是把内容藏起来做样子：折叠只作用在**已渲染的真实学校列表**上
 * （SCHOOLS / 后端 campuses 接口，无一条伪造条目），箭头方向即当前态，一次点击即可看全。
 * 2026-08-27 那次「展示全部学校圈（不再只取前 6 个）」是为了补偿当时的死控件；
 * 控件真实可用后，恢复理想图的 6 张预览 + 展开语义。
 * 搜索态不折叠（结果本就少，折叠会把命中项藏掉）；不足预览数时该行自动退化为不可点的说明行。
 */
const SCHOOL_PREVIEW = 6;
const schoolsExpanded = ref(false);
const canToggleMore = computed(() => filteredSchools.value.length > SCHOOL_PREVIEW);
const visibleSchools = computed(() => {
  const list = filteredSchools.value;
  if (!canToggleMore.value || schoolsExpanded.value || searchKeyword.value.trim()) return list;
  return list.slice(0, SCHOOL_PREVIEW);
});
function toggleSchools() {
  if (!canToggleMore.value) return;
  schoolsExpanded.value = !schoolsExpanded.value;
}
/** 理想图整句「查看更多校园圈」。locale 无整句词条（只有 common.viewMore + campus.hub.title），
 *  故展示层拼接；拉丁语系两词间补空格，避免 "View moreCampus Circles" 连字。 */
const moreLabel = computed(() => {
  const head = t("common.viewMore");
  const tail = t("campus.hub.title");
  return /[一-鿿]$/.test(head) ? `${head}${tail}` : `${head} ${tail}`;
});

// MP-R2-CAMPUS-HUB-003：onLoad 原读取 ?school= 写入 selectedSchool 死状态（全页零消费），
// 参数消费语义由 goSchool 链路承接；死 ref 已删除

// MP-R2-CAMPUS-HUB-004：认证状态拉取失败可感知（原空 catch + errorMessage 零消费，
// 非 404 失败静默按「未认证」渲染）——错误条 + 重试入口
const certLoadFailed = ref(false);
async function refreshCertification(): Promise<void> {
  certLoadFailed.value = false;
  try {
    await campusStore.fetchCertificationStatus();
  } catch (_e) {
    certLoadFailed.value = true;
    return;
  }
  if (campusStore.errorMessage) certLoadFailed.value = true;
}
onShow(() => {
  void refreshCertification();
});

function goSchool(schoolName: string) {
  openAppPath(`${ROUTES.CAMPUS.INDEX}?school=${encodeURIComponent(schoolName)}`);
}

function goCertification() {
  openAppPath(ROUTES.CAMPUS.CERTIFICATION);
}

// MP-R2-CAMPUS-HUB-006：栈底兜底（分享/编译直达栈=1 时裸 navigateBack 静默失败），
// 与 campus/index.vue:98-106 同口径
function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: "/pages/nearby/index" });
  }
}
</script>

<template>
  <view class="campus-hub" :style="menuStyleVars">
    <!-- MP-R2-CAMPUS-HUB-004：认证状态拉取失败错误条 + 重试（原全链路静默） -->
    <view v-if="certLoadFailed" class="campus-hub__cert-error">
      <text class="campus-hub__cert-error-text">{{ campusStore.errorMessage || t('common.networkError') }}</text>
      <view class="campus-hub__cert-error-retry press-feedback" role="button" @tap="refreshCertification">
        <text class="campus-hub__cert-error-retry-text">{{ t('common.retry') }}</text>
      </view>
    </view>
    <view class="campus-hub__header">
      <view class="campus-hub__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.back')" @tap="goBack">
        <text class="campus-hub__back-text">&#x2039;</text>
      </view>
      <view class="campus-hub__title-col">
        <text class="campus-hub__title">{{ t('campus.hub.title') }}</text>
        <text class="campus-hub__subtitle">{{ t('campus.hub.subtitle') }}</text>
      </view>
      <!-- 页头不再放重复的认证入口（MP-R2VIS-SUBPACKAGES-CAMPUS-CAMPUS-HUB-002）：
           认证动作只保留下方引导横幅那一处；这里只在已认证时挂状态标记。 -->
      <view v-if="isVerified" class="campus-hub__cert-badge">
        <text class="campus-hub__cert-badge-text">{{ t('campus.hub.certified') }}</text>
      </view>
    </view>

    <!-- 加入引导 -->
    <view class="campus-guide card-base">
      <view class="campus-guide__icon">
        <image class="campus-guide__icon-img" :src="IMAGE_PATHS.ICONS_COMMON.GRADUATION_CAP_SVG" mode="aspectFit" alt="" />
      </view>
      <view class="campus-guide__body">
        <text class="campus-guide__title">{{ t('campus.hub.guideTitle') }}</text>
        <text class="campus-guide__desc">{{ t('campus.hub.guideDesc') }}</text>
      </view>
      <view
        v-if="!isVerified"
        class="campus-guide__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('campus.hub.goCertify')"
        @tap="goCertification"
      >
        <text class="campus-guide__btn-text">{{ isPending ? t('campus.hub.viewProgress') : t('campus.hub.goCertify') }}</text>
      </view>
      <view v-else class="campus-guide__badge">
        <text class="campus-guide__badge-text">{{ t('campus.hub.certified') }}</text>
      </view>
    </view>

    <!-- 2026-08-20：搜索框（参考图对齐） -->
    <view class="campus-search">
      <view class="campus-search__icon">
        <image class="campus-search__icon-text" :src="IMAGE_PATHS.ICONS_EMOJI.SEARCH" mode="aspectFit" alt="" />
      </view>
      <input
  cursor-spacing="20"
        v-model="searchKeyword"
        class="campus-search__input"
        :placeholder="t('campus.hub.searchPlaceholder')"
        placeholder-class="campus-search__placeholder"
        confirm-type="search"
        :aria-label="t('campus.hub.searchAria')"
      />
      <text v-if="searchKeyword" class="campus-search__clear" role="button" :aria-label="t('campus.hub.clearAria')" @tap="searchKeyword = ''">×</text>
    </view>

    <!-- Tab 切换 -->
    <view class="campus-hub__tabs">
      <view
        class="campus-hub__tab"
        role="tab"
        :aria-selected="activeTab === 'joined'"
        @tap="activeTab = 'joined'"
      >
        <text class="campus-hub__tab-text" :class="{ 'campus-hub__tab-text--active': activeTab === 'joined' }">{{ t('campus.hub.joinedTitle') }}</text>
        <view v-if="activeTab === 'joined'" class="campus-hub__tab-indicator" />
      </view>
      <view
        class="campus-hub__tab"
        role="tab"
        :aria-selected="activeTab === 'recommend'"
        @tap="activeTab = 'recommend'"
      >
        <text class="campus-hub__tab-text" :class="{ 'campus-hub__tab-text--active': activeTab === 'recommend' }">{{ t('campus.hub.recommendTitle2') }}</text>
        <view v-if="activeTab === 'recommend'" class="campus-hub__tab-indicator" />
      </view>
    </view>

    <!-- R1-L05-D19：原内层 scroll-view(scroll-y)+外层 height:100%/overflow:hidden 吞掉页面滚动，
         末卡在屏幕底边被硬裁、bottom 帧与 top 帧逐像素相同。改为普通 view 走页面级滚动；
         该 scroll-view 未绑任何事件（无 @scrolltolower / scroll-top / scroll-into-view），
         去掉后滚动语义与交互不变，仅高度约束交回页面 -->
    <view class="campus-hub__feed">
    <!-- 空状态 -->
    <view v-if="filteredSchools.length === 0" class="campus-hub__empty">
      <text class="campus-hub__empty-text">{{ activeTab === 'joined' ? t('campus.hub.emptyJoined') : t('campus.hub.emptyRecommend') }}</text>
    </view>

    <!-- 圈子卡片列表 -->
    <view
      v-for="school in visibleSchools"
      :key="school.id"
      class="campus-school-card press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      role="button"
      :aria-label="schoolTitle(school.name)"
      @tap="goSchool(school.name)"
    >
      <!-- 封面恒有兜底 URL（script 里 schools 的第三层兜底是常量），所以「无封面」分支永远进不去；
           原来的 v-else 校名文本 + 那条条件类一起删掉，渲染结果与删前逐像素相同（--img 类此前恒为真）。 -->
      <view class="campus-school-card__cover campus-school-card__cover--img">
        <image class="campus-school-card__cover-img" :src="school.coverUrl" mode="aspectFill" alt="" />
      </view>

      <!-- 内容 -->
      <view class="campus-school-card__body">
        <view class="campus-school-card__name-row">
          <!-- R2b-L05-D11：理想图标题带「圈」后缀（北京大学圈），数据源是校名本体，展示层拼接 -->
          <text class="campus-school-card__name">{{ schoolTitle(school.name) }}</text>
          <view
            class="campus-school-card__badge"
            :class="joinedBadge.class"
          >
            <text class="campus-school-card__badge-text">{{ joinedBadge.text }}</text>
          </view>
        </view>
        <text class="campus-school-card__stats">{{ school.stats.members }} · {{ school.stats.posts }}</text>
        <!-- 成员头像预览 -->
        <view class="campus-school-card__members">
          <view class="campus-school-card__avatar-stack">
            <image class="campus-school-card__avatar" :src="IMAGE_PATHS.AVATARS.AVATAR_1" mode="aspectFill" />
            <image class="campus-school-card__avatar campus-school-card__avatar--2" :src="IMAGE_PATHS.AVATARS.AVATAR_2" mode="aspectFill" />
            <image class="campus-school-card__avatar campus-school-card__avatar--3" :src="IMAGE_PATHS.AVATARS.AVATAR_3" mode="aspectFill" />
          </view>
          <text class="campus-school-card__peers">{{ school.stats.peers }}</text>
        </view>
      </view>

      <!-- 操作按钮（描边样式） -->
      <view class="campus-school-card__cta" :class="{ 'campus-school-card__cta--outline': activeTab !== 'joined' }">
        <text class="campus-school-card__cta-text">{{ activeTab === 'joined' ? t('campus.hub.enter') : t('campus.hub.join') }}</text>
      </view>
    </view>

    <!-- 2026-08-27：底部"查看更多校园圈"（对齐理想图 校园圈.png 底部提示）
         R2b-L05-D15：恢复理想图的「灰字 + 向下箭头」可点入口——箭头节点重新挂上此前零引用的
         .campus-hub__more-arrow（孤儿规则），@tap 绑定列表折叠/展开，role="button" + aria-label
         补可访问语义。MP-R1-CAMPUS-HUB-003 当年删箭头是因为它是死元素，现元素已绑真实动作。 -->
    <view
      class="campus-hub__more"
      :class="{ 'campus-hub__more--static': !canToggleMore }"
      role="button"
      :aria-label="moreLabel"
      :aria-expanded="canToggleMore ? String(schoolsExpanded) : undefined"
      @tap="toggleSchools"
    >
      <text class="campus-hub__more-text">{{ canToggleMore ? moreLabel : t('campus.hub.moreHint') }}</text>
      <text v-if="canToggleMore" class="campus-hub__more-arrow" :class="{ 'campus-hub__more-arrow--up': schoolsExpanded }">&#x2304;</text>
    </view>
    <view class="campus-hub__footer" />
    </view>
  </view>
</template>

<style scoped lang="scss">
/* MP-R2-CAMPUS-HUB-004：认证状态错误条 */
.campus-hub__cert-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  /* R2b-L05-D14 连带：状态栏避让已从 .campus-hub 的 padding-top 迁入吸顶导航带后，
     本条是容器首个子节点、排在吸顶带之上，须自带一份状态栏内衬，否则错误文案压在状态栏上 */
  margin: calc(var(--statusbar, env(safe-area-inset-top)) + 16rpx) 32rpx 0;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: var(--c-error-bg-tint, rgba(229, 69, 77, 0.1));
}
.campus-hub__cert-error-text {
  flex: 1;
  font-size: 24rpx;
  color: var(--c-error, #E5454D);
}
.campus-hub__cert-error-retry {
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
  background: var(--c-brand, #36C99A);
}
.campus-hub__cert-error-retry-text {
  font-size: 24rpx;
  color: var(--c-neutral-0, #FFFFFF);
}

.campus-hub {
  display: flex;
  flex-direction: column;
  /* R1-L05-D19：原 height:100% + overflow:hidden 把滚动锁死在内层 scroll-view 里
     （全局无 page{height:100%}，页面级滚动带不动内层容器 ⇒ bottom 帧=top 帧、末卡被屏底硬裁）。
     列表已改为页面级滚动，容器随内容增长，只保留最小视口高度铺满底色 */
  min-height: 100vh;
  /* R2b-L05-D10（颜色token）：页面底从 --c-bg-page(#EEF7F2 薄荷) 改纯白。
     理想图 校园圈.png 页面底取色实测 rgb(254,254,254)=#FEFEFE，卡片同为白底、
     靠 1rpx 描边 + 投影分层；原整页薄荷使卡内白卡与页面几乎同色、卡边界只能靠阴影勉强看出。
     薄荷档保留给引导卡（.campus-guide 的 --c-brand-50 渐变）与徽标底色（--c-brand-50）。
     与同文件 .campus-school-card 的 --c-neutral-0 取同一令牌，保持本页白档单一来源。 */
  background: var(--c-neutral-0, #FFFFFF);
  /* R2b-L05-D14（层级遮挡）：状态栏避让不再写在容器 padding-top 上——页面级滚动会把这段
     内衬连同吸顶内容一起推走，bottom 帧首卡封面直接压在状态栏时间上、微信胶囊叠在卡片
     徽标/按钮区。避让改由下方 .campus-hub__header 这条吸顶导航带承担（高度 = 状态栏 + 胶囊带），
     容器顶部只留常规呼吸间距，滚动内容恒从该带下方穿过。 */
  padding: 0 32rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.campus-hub__feed {
  /* R1-L05-D19：不再是定高滚动容器 ⇒ flex:1 0 auto（内容不足一屏时铺底色，超出时不收缩不被裁） */
  flex: 1 0 auto;
}

/* ===== Header ===== */
/* R2b-L05-D14（层级遮挡，P1）：页头改为吸顶导航带。
   原状态栏避让只写在容器 .campus-hub 的 padding-top 上，页面级滚动一滚这段内衬就被推走，
   bottom 帧里第一张卡的封面图直接压在状态栏时间上、微信胶囊叠在「同济大学」这行的徽标/按钮区。
   现由本带承担避让：top:0 吸顶 + padding-top = 状态栏 + 胶囊带高度 + 同色不透明底，
   滚动内容恒从带下方穿过，顶部不留裸内容带（理想图：滚动后列表内容始终从状态栏/胶囊之下穿过）。
   左右 -32rpx 负衬破出容器 gutter 让底色铺满整行，再由 padding 把内容送回原栅格，
   与 AppShell .is-fixed .shell__header 的吸顶口径一致。 */
.campus-hub__header {
  display: flex;
  align-items: center;
  /* R1-L05-D12：原 space-between + 整行 padding-right 让标题列被顶到屏宽约 26% 处悬空
     （理想图：大标题贴左栅格起排）。改为从左往右排、右侧状态标记自己吸右，
     padding-right 只作用到被 margin-left:auto 推到右侧的那一档 */
  justify-content: flex-start;
  gap: 16rpx;
  position: sticky;
  top: 0;
  z-index: var(--z-header, 10);
  background: var(--c-neutral-0, #FFFFFF);
  margin: 0 -32rpx 24rpx;
  /* 上：状态栏 + 胶囊带（20px 为原容器内衬里的胶囊呼吸量）+ 20rpx 呼吸
     右：避让微信胶囊（--capsule-right/--statusbar 由 useMenuButtonRect 注入）
     R4：原 padding-right = capsule-right(7px)+8px 漏加胶囊本体 87px，认证按钮被胶囊压住 85%
     MP-R1-CAMPUS-HUB-004：状态栏只计一份——避让位已从容器 padding-top 迁入本带，不再叠加 */
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 20px + 20rpx)
    calc(var(--capsule-right, 7px) + 104px) 20rpx 32rpx;
  box-sizing: border-box;
}

.campus-hub__back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
}

.campus-hub__back-text {
  font-size: 40rpx;
  color: var(--c-text-primary, #222222);
  line-height: 1;
}

.campus-hub__title-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
}

.campus-hub__title {
  /* R1-L05-D13：主标题 36rpx 比理想图（≈48rpx）低一档，且与卡片校名 30rpx 只差 6rpx、层级被压平 */
  font-size: var(--fs-6xl, 48rpx);
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.campus-hub__subtitle {
  /* R1-L05-D13：副标题 24rpx → 28rpx（理想图约 28rpx） */
  font-size: var(--fs-lg, 28rpx);
  font-weight: 400;
  color: var(--c-text-tertiary, #8A9694);
}

.campus-hub__cert-badge {
  /* R1-L05-D12：header 改左对齐后，右侧状态标记由 margin-left:auto 吸右，
     仍落在 padding-right 预留的胶囊避让区内 */
  margin-left: auto;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: var(--c-bg-brand, #E8FAF3);
}

.campus-hub__cert-badge-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--c-brand, #36C99A);
}

/* ===== Certification Guide ===== */
.campus-guide {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, var(--c-brand-50, #EAF8F2) 0%, #FFFFFF 100%);
  border: 1rpx solid var(--c-line, #EEF2F0);
  margin-bottom: 32rpx;
}

.campus-guide__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #FFFFFF);
  flex-shrink: 0;
}

.campus-guide__icon-img {
  width: 40rpx;
  height: 40rpx;
}

.campus-guide__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.campus-guide__title {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.campus-guide__desc {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.campus-guide__btn {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  /* R2b-L05-D16：实心 CTA 底色从 --c-brand(#36C99A) 收敛到深一档品牌绿 --c-brand-600(#2AAE83)。
     理想图 校园圈.png「去认证」取色实测 rgb(4,186,116)=#04BA74（本车道 PIL 复量，
     缺陷卡记的 #08B870 同档）；对品牌色阶做 CIE L*a*b* 距离：600 档 dE=16.7、
     500 档 dE=15.0、700 档 dE=26.8 —— 500/600 近乎并列，但 500 正是被诉「偏薄荷、淡一档」
     的当前值，且 R2b-L05-D03 的 circle-home 主 CTA（理想 #33A06E）唯一收敛解是 600 档
     （dE=7.3），两条缺陷要求「与 circle-home 的 CTA 一起收敛到同一档」⇒ 取 --c-brand-600。
     缺陷建议的「在 design-variables.scss 增设 --c-brand-action」不可执行：theme/ 为只读集，
     故映射到既有最近档位令牌。渐变两端同色＝纯色，保留写法不动结构。 */
  background: linear-gradient(135deg, var(--c-brand-600, #2AAE83) 0%, var(--c-brand-600, #2AAE83) 100%);
}

.campus-guide__btn-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

.campus-guide__badge {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand-50, #E8FAF3);
}

.campus-guide__badge-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-brand-600, #36C99A);
}

/* ===== Tab Bar ===== */
.campus-hub__tabs {
  display: flex;
  gap: 0;
  margin-bottom: 28rpx;
  border-bottom: 2rpx solid var(--c-line, #EEF2F0);
}

.campus-hub__tab {
  position: relative;
  padding: 20rpx 0;
  margin-right: 48rpx;
}

.campus-hub__tab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--c-text-tertiary, #8A9694);
}

.campus-hub__tab-text--active {
  font-weight: 700;
  color: var(--c-brand, #36C99A);
}

.campus-hub__tab-indicator {
  position: absolute;
  bottom: -2rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: var(--c-brand, #36C99A);
}

/* ===== Empty State ===== */
.campus-hub__empty {
  padding: 80rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.campus-hub__empty-text {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #8A9694);
}

/* ===== School Card ===== */
.campus-school-card {
  display: flex;
  align-items: stretch;
  gap: 20rpx;
  margin-top: 20rpx;
  padding: 20rpx;
  border-radius: 28rpx;
  /* 2026-08-27 校园圈修复：卡片统一白色圆角卡 + 校园封面图（对齐理想图 校园圈.png） */
  background: var(--c-neutral-0, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  box-shadow: 0 6rpx 24rpx rgba(26, 55, 48, 0.06);
  overflow: hidden;
}

.campus-school-card__cover {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-brand, #E6F6EF);
}

.campus-school-card__cover--img {
  background: var(--c-neutral-100, #F2F4F3);
}

.campus-school-card__cover-img {
  width: 100%;
  height: 100%;
}

.campus-school-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.campus-school-card__name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

/* R10-P2-007：校名行禁折行（超长省略），badge 不参与收缩 */
.campus-school-card__name-row .campus-school-card__badge {
  flex-shrink: 0;
}

.campus-school-card__name {
  font-size: 30rpx;
  font-weight: 700;
  /* 2026-08-27：白卡上名称用正文主色 */
  color: var(--c-text-primary, #222222);
  /* MP-R8-CAMPUS-001（2026-09-16）：「中国人民大学/上海交通大学」被 badge 挤压折行（人民大/学）。
     名称按内容收缩 + 禁止折行（超长省略），badge 不参与收缩。 */
  flex: 0 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== Badge ===== */
.campus-school-card__badge {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  /* MP-R8-CAMPUS-001：badge 固定不收缩，宽度让给校名 */
  flex-shrink: 0;
  flex-shrink: 0;
}

.campus-school-card__badge--verified {
  /* 理想图：已认证 = 绿色圆角标签 + 白色字体 */
  background: var(--c-brand, #36C99A);
}

.campus-school-card__badge--verified .campus-school-card__badge-text {
  color: var(--c-text-inverse, #FFFFFF);
}

.campus-school-card__badge--pending {
  background: var(--c-warning-bg-tint, #FFF4E5);
}

.campus-school-card__badge--pending .campus-school-card__badge-text {
  color: var(--c-warning, #FF9F43);
}

.campus-school-card__badge--unverified {
  /* R1-L05-D15：理想图未认证 = 淡紫底 + 紫字。原 background 写成硬编码 #9AA39F（同组 verified/pending
     都走 var()），既脱离 token 体系、又把紫档整体落到中灰档；灰底白字对比度不足。
     改取既有 lavender 档位令牌（--c-lavender-50 #F5F3FF / --c-lavender-500 #8B5CF6）；
     卡里建议的 --c-accent-50/--c-accent 在 design-variables.scss 中并不存在，故用同值既有令牌 */
  background: var(--c-lavender-50, #F5F3FF);
}

.campus-school-card__badge--unverified .campus-school-card__badge-text {
  color: var(--c-lavender-500, #8B5CF6);
}

.campus-school-card__badge-text {
  /* R1-L05-D20：20rpx(≈10.8px CSS) 低于可读下限 ⇒ 提到 24rpx */
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
}

/* ===== Stats & Members ===== */
.campus-school-card__stats {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  /* 2026-08-27：白卡上数据行用次要文字色
     R3：单行省略——原文案换行把「态」字折成孤字（judged 证据） */
  color: var(--c-text-secondary, #666666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.campus-school-card__members {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
}

.campus-school-card__avatar-stack {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.campus-school-card__avatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid var(--c-neutral-0, #FFFFFF);
  display: block;
}

.campus-school-card__avatar--2 {
  border-radius: var(--r-full);

  margin-left: -10rpx;
}

.campus-school-card__avatar--3 {
  border-radius: var(--r-full);

  margin-left: -10rpx;
}

.campus-school-card__peers {
  /* R1-L05-D20：22rpx 与徽标同样偏小、帧内糊成灰点 ⇒ 提到 26rpx */
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-tertiary, #9AA39F);
}

/* ===== CTA (Green Filled) ===== */
/* 推荐 tab「申请加入」= 白底绿描边绿字（对齐理想图层级：仅「去认证」实心）
   R2b-L05-D16：描边/文字与实心档同步收敛到 --c-brand-600（见 .campus-guide__btn 的取色推导） */
.campus-school-card__cta--outline {
  background: var(--c-neutral-0, #FFFFFF) !important;
  border: 2rpx solid var(--c-brand-600, #2AAE83) !important;
  box-shadow: none !important;
}

.campus-school-card__cta--outline .campus-school-card__cta-text {
  color: var(--c-brand-600, #2AAE83);
}

.campus-school-card__cta {
  flex-shrink: 0;
  align-self: center;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  /* 理想图：绿色圆角矩形按钮（进入 / 申请加入）；R2b-L05-D16 取深一档品牌绿 */
  background: var(--c-brand-600, #2AAE83);
  box-shadow: 0 4rpx 12rpx var(--c-brand-border-tint-stronger, rgba(54, 201, 154, 0.32));
}

.campus-school-card__cta-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-text-inverse, #FFFFFF);
}

/* ===== Footer ===== */
.campus-hub__more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  /* R2b-L05-D15：该行现为可点入口，命中区上下各留够呼吸（合计 ≥88rpx 高） */
  padding: 32rpx 0 20rpx;
}

/* 列表不足预览档时没有可展开的内容，该行退回静态说明文案，不再给出可点暗示 */
.campus-hub__more--static {
  padding: 32rpx 0 8rpx;
}

.campus-hub__more-text {
  font-size: 24rpx;
  color: var(--c-text-tertiary, #9AA39F);
}

.campus-hub__more-arrow {
  font-size: 28rpx;
  color: var(--c-text-tertiary, #9AA39F);
  line-height: 1;
  transition: transform var(--d-normal, 200ms) ease;
}

/* 展开态箭头翻向上方，读作「收起」，与 aria-expanded 同步 */
.campus-hub__more-arrow--up {
  transform: rotate(180deg);
}

.campus-hub__footer {
  height: 48rpx;
}

/* ===== 2026-08-20 校园圈搜索框（参考图对齐） ===== */
.campus-search {
  /* R2b-L05-D13：原 `margin: 0 40rpx 20rpx` 在 .campus-hub 已有的 32rpx 页面内衬之外
     又叠一层左右缩进，搜索胶囊比卡片多缩 40rpx，三条左边缘不成一条线（理想图搜索/引导卡/
     列表卡共用同一栅格边线）。左右归零，栅格统一由容器 padding: 0 32rpx 承担；
     需要更窄时改自身高度/圆角，不改左右。 */
  margin: 0 0 20rpx;
  height: 76rpx;
  border-radius: 999rpx;
  /* R1-L05-D14：原底色取 --c-bg-page，与页面容器（.campus-hub）同色 ⇒ 胶囊在帧里完全看不见、
     999rpx 圆角等于没生效。改取容器白底并补 1rpx 描边，与页面底拉开一档 */
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  display: flex;
  align-items: center;
  padding: 0 28rpx;
  box-sizing: border-box;
  gap: 12rpx;
}

.campus-search__icon {
  flex-shrink: 0;
}

.campus-search__icon-text {
  width: 30rpx;
  height: 30rpx;
  color: var(--c-text-tertiary, #9AA39F);
}

.campus-search__input {
  flex: 1;
  height: 100%;
  font-size: 28rpx;
  color: var(--c-text-primary, #333A37);
}

.campus-search__placeholder {
  color: #9AA39F;
}

.campus-search__clear {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--c-border-light, #D8E0DC);
  color: var(--c-text-tertiary, #6B7571);
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

</style>



