<script setup lang="ts">


/**
 * 校园圈 Hub（v3 Nearby 冻结 · 04_campus_circle）
 * 加入校园圈引导 + 校园列表（未认证/认证中/已认证/非本校 四态）+ 校园圈推荐。
 * 点击学校：已认证本校 → 私域（campus/index?school=）；其他 → 公开浏览。
 */
import { ref, computed } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
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

/** 校园圈展示数据（参考图视觉对齐；后续可由后端 campuses 接口扩展提供）
 *  R3：文案精简（位同学→同学、条动态→动态），统计行单行后不再出现「态」字孤行 */
const schoolStats: Record<string, { members: string; posts: string; peers: string }> = {
  pku: { members: "3.2k 同学", posts: "2.8w 动态", peers: "等 342 位同学" },
  thu: { members: "2.6k 同学", posts: "2.1w 动态", peers: "等 256 位同学" },
  ruc: { members: "2.1k 同学", posts: "9.8k 动态", peers: "等 301 位同学" },
  fudan: { members: "1.8k 同学", posts: "1.5w 动态", peers: "等 210 位同学" },
  sjtu: { members: "2.4k 同学", posts: "1.9w 动态", peers: "等 278 位同学" },
  tongji: { members: "1.7k 同学", posts: "1.3w 动态", peers: "等 194 位同学" },
  zju: { members: "1.4k 同学", posts: "1.1w 动态", peers: "等 163 位同学" },
  nju: { members: "1.6k 同学", posts: "1.2w 动态", peers: "等 187 位同学" },
  whu: { members: "1.9k 同学", posts: "1.4w 动态", peers: "等 225 位同学" },
  sysu: { members: "1.3k 同学", posts: "9.5k 动态", peers: "等 152 位同学" },
  szu: { members: "1.2k 同学", posts: "8.6k 动态", peers: "等 138 位同学" },
};

function statsOf(school: { id: string }): { members: string; posts: string; peers: string } {
  const fallback = { members: "约1.0k 同学", posts: "约8k 动态", peers: "约 120 位同学" };
  const stats = schoolStats[school.id];
  // MP-R2-CAMPUS-HUB-007：硬编码统计为演示估算值——统一加「约」语义标注，
  // 避免在 real 模式被当作真实统计（后端 campuses 接口就绪后替换本表）
  if (!stats) return fallback;
  const prefixTilde = (v: string) => (v.startsWith("约") ? v : `约${v}`);
  return { members: prefixTilde(stats.members), posts: prefixTilde(stats.posts), peers: prefixTilde(stats.peers) };
}

/** 我加入的（本校已认证）。
 * MP-R2-CAMPUS-HUB-002：补认证门槛——bindSchool 直写 campusName 不经认证，
 * 未认证但已绑定学校的用户原会看到「未认证」badge + 「进入」CTA 的矛盾组合
 * （进入后被 campus/index 门禁又降级为公开浏览） */
const joinedSchools = computed(() =>
  isVerified.value ? schools.filter((sc) => sc.name === ownSchool.value) : []
);
/** 推荐圈子（其他学校） */
const recommendedSchools = computed(() => schools.filter((sc) => sc.name !== ownSchool.value));

const isPending = computed(() => certificationStatus.value === "pending");
const ownSchool = computed(() => certificationInfo.value?.schoolName || sessionStore.userSession?.campusName || "");

/**
 * MP-R1-CAMPUS-HUB-001：badge 三态（认证通过/审核中/未认证）——
 * 未认证用户不再被谎报为「认证中」，且每个状态都有对应配色修饰类；
 * 推荐 Tab 统一显示「未认证」灰胶囊。
 */
const joinedBadge = computed<{ text: string; class: string }>(() => {
  if (activeTab.value === "recommend") {
    return { text: t("campusHub.unverified"), class: "campus-school-card__badge--unverified" };
  }
  if (isVerified.value) {
    return { text: t("campusHub.certified"), class: "campus-school-card__badge--verified" };
  }
  if (isPending.value) {
    return { text: t("campusHub.statusPending"), class: "campus-school-card__badge--pending" };
  }
  return { text: t("campusHub.unverified"), class: "campus-school-card__badge--unverified" };
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
  if (!kw) return base;
  return base.filter((sc) => sc.name.includes(kw) || sc.id.includes(kw.toLowerCase()));
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
        <text class="campus-hub__title">{{ t('campusHub.title') }}</text>
        <text class="campus-hub__subtitle">{{ t('campusHub.subtitle') }}</text>
      </view>
      <view
        v-if="!isVerified"
        class="campus-hub__cert-btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('campusHub.goCertify')"
        @tap="goCertification"
      >
        <text class="campus-hub__cert-btn-text">{{ t('campusHub.goCertify') }}</text>
      </view>
      <view v-else class="campus-hub__cert-badge">
        <text class="campus-hub__cert-badge-text">{{ t('campusHub.certified') }}</text>
      </view>
    </view>

    <!-- 加入引导 -->
    <view class="campus-guide card-base">
      <view class="campus-guide__icon">
        <image class="campus-guide__icon-img" :src="IMAGE_PATHS.ICONS_COMMON.GRADUATION_CAP_SVG" mode="aspectFit" alt="" />
      </view>
      <view class="campus-guide__body">
        <text class="campus-guide__title">{{ t('campusHub.guideTitle') }}</text>
        <text class="campus-guide__desc">{{ t('campusHub.guideDesc') }}</text>
      </view>
      <view
        v-if="!isVerified"
        class="campus-guide__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('campusHub.goCertify')"
        @tap="goCertification"
      >
        <text class="campus-guide__btn-text">{{ isPending ? t('campusHub.viewProgress') : t('campusHub.goCertify') }}</text>
      </view>
      <view v-else class="campus-guide__badge">
        <text class="campus-guide__badge-text">{{ t('campusHub.certified') }}</text>
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
        :placeholder="t('campusHub.searchPlaceholder')"
        placeholder-class="campus-search__placeholder"
        confirm-type="search"
        :aria-label="t('campusHub.searchAria')"
      />
      <text v-if="searchKeyword" class="campus-search__clear" role="button" :aria-label="t('campusHub.clearAria')" @tap="searchKeyword = ''">×</text>
    </view>

    <!-- Tab 切换 -->
    <view class="campus-hub__tabs">
      <view
        class="campus-hub__tab"
        role="tab"
        :aria-selected="activeTab === 'joined'"
        @tap="activeTab = 'joined'"
      >
        <text class="campus-hub__tab-text" :class="{ 'campus-hub__tab-text--active': activeTab === 'joined' }">{{ t('campusHub.joinedTitle') }}</text>
        <view v-if="activeTab === 'joined'" class="campus-hub__tab-indicator" />
      </view>
      <view
        class="campus-hub__tab"
        role="tab"
        :aria-selected="activeTab === 'recommend'"
        @tap="activeTab = 'recommend'"
      >
        <text class="campus-hub__tab-text" :class="{ 'campus-hub__tab-text--active': activeTab === 'recommend' }">{{ t('campusHub.recommendTitle2') }}</text>
        <view v-if="activeTab === 'recommend'" class="campus-hub__tab-indicator" />
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="filteredSchools.length === 0" class="campus-hub__empty">
      <text class="campus-hub__empty-text">{{ activeTab === 'joined' ? t('campusHub.emptyJoined') : t('campusHub.emptyRecommend') }}</text>
    </view>

    <!-- 圈子卡片列表 -->
    <view
      v-for="school in filteredSchools"
      :key="activeTab + '-' + school.id"
      class="campus-school-card press-feedback"
      hover-class="press-feedback--active"
      hover-stay-time="120"
      role="button"
      :aria-label="school.name"
      @tap="goSchool(school.name)"
    >
      <!-- 封面区：浅绿背景 + 学校名字（第五轮：移除校园风景插图与首字徽标，统一浅绿风格） -->
      <!-- 保留上传能力：coverUrl 非空时渲染图片，为空时渲染浅绿背景 + 学校名字 -->
      <view class="campus-school-card__cover" :class="{ 'campus-school-card__cover--img': school.coverUrl }">
        <image v-if="school.coverUrl" class="campus-school-card__cover-img" :src="school.coverUrl" mode="aspectFill" alt="" />
        <text v-else class="campus-school-card__cover-name">{{ school.name }}</text>
      </view>

      <!-- 内容 -->
      <view class="campus-school-card__body">
        <view class="campus-school-card__name-row">
          <text class="campus-school-card__name">{{ school.name }}</text>
        </view>
        <view class="campus-school-card__meta-row">
          <!-- MP-R1-CAMPUS-HUB-001：badge 三态（已认证/认证中/未认证）——原实现未认证用户
               在「我加入的」Tab 谎报「认证中」且无配色类，现按状态映射文案与修饰类，
               对齐推荐 Tab 的「未认证」胶囊样式 -->
          <view
            class="campus-school-card__badge"
            :class="joinedBadge.class"
          >
            <text class="campus-school-card__badge-text">{{ joinedBadge.text }}</text>
          </view>
          <text class="campus-school-card__stats">{{ statsOf(school).members }} · {{ statsOf(school).posts }}</text>
        </view>
        <!-- 成员头像预览 -->
        <view class="campus-school-card__members">
          <view class="campus-school-card__avatar-stack">
            <image class="campus-school-card__avatar" :src="IMAGE_PATHS.AVATARS.AVATAR_1" mode="aspectFill" />
            <image class="campus-school-card__avatar campus-school-card__avatar--2" :src="IMAGE_PATHS.AVATARS.AVATAR_2" mode="aspectFill" />
            <image class="campus-school-card__avatar campus-school-card__avatar--3" :src="IMAGE_PATHS.AVATARS.AVATAR_3" mode="aspectFill" />
          </view>
          <text class="campus-school-card__peers">{{ statsOf(school).peers }}</text>
        </view>
      </view>

      <!-- 操作按钮（描边样式） -->
      <view class="campus-school-card__cta" :class="{ 'campus-school-card__cta--outline': activeTab !== 'joined' }">
        <text class="campus-school-card__cta-text">{{ activeTab === 'joined' ? t('campusHub.enter') : t('campusHub.join') }}</text>
      </view>
    </view>

    <!-- 2026-08-27：底部"查看更多校园圈"（对齐理想图 校园圈.png 底部提示）
         MP-R1-CAMPUS-HUB-003：原「查看更多校园圈 ⌄」是无可绑动作的死元素（箭头暗示可展开但点击无响应），
         按审计建议移除箭头改为静态说明文案 -->
    <view class="campus-hub__more">
      <text class="campus-hub__more-text">{{ t('campusHub.moreHint') }}</text>
    </view>
    <view class="campus-hub__footer" />
  </view>
</template>

<style scoped lang="scss">
/* MP-R2-CAMPUS-HUB-004：认证状态错误条 */
.campus-hub__cert-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin: 16rpx 32rpx 0;
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
  min-height: 100%;
  background: var(--c-bg-page, #EEF7F2);
  padding: calc(calc(var(--statusbar, env(safe-area-inset-top)) + 20px) + 20rpx) 32rpx 0;
  box-sizing: border-box;
}

/* ===== Header ===== */
.campus-hub__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  /* 状态栏高度 + 右侧避让微信胶囊（--capsule-right/--statusbar 由 useMenuButtonRect 注入）
     R4：原 padding-right = capsule-right(7px)+8px 漏加胶囊本体 87px，认证按钮被胶囊压住 85%；
     MP-R1-CAMPUS-HUB-004：删除 margin-top 中的第二份 --statusbar——页面容器
     .campus-hub 的 padding-top 已含一份状态栏高度（.campus-hub 为 padding-top 定位，
     子元素 margin 不发生塌陷，两段位移相加使 header 顶部 = 2×状态栏 + 偏移），
     顶部偏移统一由页面 padding 承担，与同分包 index.vue/certification.vue 一致 */
  padding-right: calc(var(--capsule-right, 7px) + 104px);
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
  font-size: 36rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.campus-hub__subtitle {
  font-size: 24rpx;
  font-weight: 400;
  color: var(--c-text-tertiary, #8A9694);
}

.campus-hub__cert-btn {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: var(--c-brand, #36C99A);
  box-shadow: 0 6rpx 16rpx rgba(54, 201, 154, 0.32);
}

.campus-hub__cert-btn-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--c-text-inverse, #FFFFFF);
}

.campus-hub__cert-badge {
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
  background: linear-gradient(135deg, var(--c-brand, #36C99A) 0%, var(--c-brand, #36C99A) 100%);
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
  color: var(--c-text-primary, #222222);
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
  width: 200rpx;
  height: 150rpx;
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

.campus-school-card__cover-name {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-brand-600, #1F9A75);
  line-height: 1.3;
  text-align: center;
  padding: 0 8rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
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

/* R10-P2-007：badge 下沉到统计行，校名独占整行——「中国人民大学/上海交通大学」不再被挤成省略号 */
.campus-school-card__meta-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;
  min-width: 0;
}

.campus-school-card__meta-row .campus-school-card__badge {
  flex-shrink: 0;
}

.campus-school-card__meta-row .campus-school-card__stats {
  margin-top: 0;
}

.campus-school-card__name {
  font-size: 30rpx;
  font-weight: 700;
  /* 2026-08-27：白卡上名称用正文主色 */
  color: var(--c-text-primary, #222222);
  /* MP-R8-CAMPUS-001（2026-09-16）：「中国人民大学/上海交通大学」被 badge 挤压折行（人民大/学）。
     名称占满剩余宽度 + 禁止折行（超长省略），badge 不参与收缩。 */
  flex: 1;
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
  /* 理想图：未认证 = 灰色圆角标签 + 白色字体 */
  background: #9AA39F;
}

.campus-school-card__badge--unverified .campus-school-card__badge-text {
  color: var(--c-text-inverse, #FFFFFF);
}

.campus-school-card__badge-text {
  font-size: 20rpx;
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
  font-size: 22rpx;
  color: var(--c-text-tertiary, #9AA39F);
}

/* ===== CTA (Green Filled) ===== */
/* 推荐 tab「申请加入」= 白底绿描边绿字（对齐理想图层级：仅「去认证」实心） */
.campus-school-card__cta--outline {
  background: var(--c-neutral-0, #FFFFFF) !important;
  border: 2rpx solid var(--c-brand, #36C99A) !important;
  box-shadow: none !important;
}

.campus-school-card__cta--outline .campus-school-card__cta-text {
  color: var(--c-brand, #36C99A);
}

.campus-school-card__cta {
  flex-shrink: 0;
  align-self: center;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  /* 理想图：绿色圆角矩形按钮（进入 / 申请加入） */
  background: var(--c-brand, #36C99A);
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
}

.campus-hub__footer {
  height: 48rpx;
}

/* ===== 2026-08-20 校园圈搜索框（参考图对齐） ===== */
.campus-search {
  margin: 0 40rpx 20rpx;
  height: 76rpx;
  border-radius: 999rpx;
  background: var(--c-bg-page, #F0F4F2);
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



