<script setup lang="ts">
/**
 * 权限设置 - 同校推荐开关（Phase Feedback5）
 *
 * - allowSameSchoolRecommend：是否把自己的信息推荐给本校学生（默认关）
 * - receiveSameSchoolInfo：是否接收同校学生的信息（默认开）
 *
 * 注意：允许"接收同校信息"但默认不"推荐给本校"，
 * 符合反馈"是自己的信息推给别人，但可以收到同校的信息，尤其重要"。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useProfileStore } from "../../../stores/profile";
import { designTokens } from "../../../theme/tokens";
// infra R2-00084: 路由路径常量化
import { ROUTES, SUBPACKAGE_ROUTES } from "../../../constants/routes";
// 2026-09-04 视觉验收：statusBarHeight 注入，var(--statusbar, env(safe-area-inset-top)) 模拟器为 0 会压刘海
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";

const { t } = useI18n();
const statusBarHeightPx = useStatusBarHeight();
const profileStore = useProfileStore();

/** 是否允许推荐给本校学生 */
const allowRecommend = computed({
  get: () => profileStore.allowSameSchoolRecommend,
  set: (val: boolean) => {
    profileStore.setAllowSameSchoolRecommend(val);
    // MP-R1-PRIVACY-001：开关当前仅本机持久化（后端偏好接口未接入，服务端推荐行为
    // 暂不受开关控制）——文案如实说明「已在本机保存」，不强化「已同步」假象
    uni.showToast({ title: t("profile.privacySavedLocal"), icon: "none" });
  },
});

/** 是否接收同校信息 */
const receiveInfo = computed({
  get: () => profileStore.receiveSameSchoolInfo,
  set: (val: boolean) => {
    profileStore.setReceiveSameSchoolInfo(val);
    // MP-R1-PRIVACY-001：同上，如实文案
    uni.showToast({ title: t("profile.privacySavedLocal"), icon: "none" });
  },
});

/** switch change 事件处理（允许推荐给本校学生） */
function onAllowRecommendChange(e: Event) {
  const detail = (e as unknown as { detail?: { value?: boolean } }).detail;
  allowRecommend.value = !!detail?.value;
}

/** switch change 事件处理（接收同校信息） */
function onReceiveInfoChange(e: Event) {
  const detail = (e as unknown as { detail?: { value?: boolean } }).detail;
  receiveInfo.value = !!detail?.value;
}

/** 返回上一页 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: ROUTES.TAB.PROFILE }); // infra R2-00084
  }
}

/* R7-L10-D11：三个入口行的跳转，全部走 ROUTES / SUBPACKAGE_ROUTES 常量（infra R2-00084），
   目的地与跳转方式逐条对齐 subpackages/profile-extra/settings/index.vue 已有的同类调用
   （:379+428 → ROUTES.SECURITY、:122 → SUBPACKAGE_ROUTES.LEGAL.PRIVACY），非新建页面。 */
function goSecurity() {
  uni.navigateTo({ url: ROUTES.SECURITY });
}

function goPrivacyPolicy() {
  uni.navigateTo({ url: SUBPACKAGE_ROUTES.LEGAL.PRIVACY });
}

function goLocation() {
  uni.navigateTo({ url: ROUTES.PROFILE.LOCATION });
}

function goHelp() {
  uni.navigateTo({ url: ROUTES.HELP });
}
</script>

<template>
  <view class="privacy-page">
    <!-- 顶部栏（statusBarHeight 注入，避免模拟器 env()=0 压刘海） -->
    <view class="privacy-page__header" :style="{ paddingTop: `calc(var(--sp-4) + ${statusBarHeightPx}px)` }">
      <!-- R7-L10-D13（可达性 P3，同域 album.vue R6-B55/D17 配方）：热区 64rpx→88rpx
           （AppShell.vue:334 口径；帧实测圆底 x≈16..36/y≈58..90 仅 20px 见方），
           64rpx 视觉圆底移进 __back-circle，尺寸一格不动；圆底浓度按建议提档——
           但方向取深色遮罩档 --c-overlay-strong(0.7) 而不是更浓的白：原 20% 白圆底实测
           只比绿头亮约 (37,10,19)，而按"白底提到 0.5/0.6"再配白 ‹ 字形会让字形和芯片
           同色相撞（≈1.2:1）；深芯片 + 白字形在白 ‹ 与绿头之间同时拉开两级对比。 -->
      <view class="privacy-page__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <view class="privacy-page__back-circle">
          <text class="privacy-page__back-text">‹</text>
        </view>
      </view>
      <!-- R6-B59/D14（需新建 P2）：页头信息层补上 locale 里早已配好、但全页无消费方的
           副标题 profile.privacyPermissionDesc（zh-CN.ts:1732「控制你的信息展示范围」/
           en-US.ts:1681），未新增任何文案。 -->
      <view class="privacy-page__titles">
        <text class="privacy-page__title">{{ t('profile.privacyPermission') }}</text>
        <text class="privacy-page__subtitle">{{ t('profile.privacyPermissionDesc') }}</text>
      </view>
      <view class="privacy-page__header-spacer" />
    </view>

    <!-- 开关列表 -->
    <view class="privacy-page__section">
      <view class="privacy-item">
        <view class="privacy-item__info">
          <text class="privacy-item__title">{{ t('profile.allowSameSchoolRecommend') }}</text>
          <text class="privacy-item__desc">{{ t('profile.allowSameSchoolRecommendDesc') }}</text>
        </view>
        <!-- R7-L10-D12：本枚是帧上 OFF 态的那一枚（「允许推荐给本校学生」默认关），
             与第二枚同样套品牌描边芯片，OFF/ON 两态都在白卡上可辨。 -->
        <view class="privacy-item__switch-chip">
          <switch
            class="privacy-item__switch privacy-item__switch--allow"
            :checked="allowRecommend"
            :color="designTokens.color.brand[500]"
            @change="onAllowRecommendChange"
          />
        </view>
      </view>

      <view class="privacy-item">
        <view class="privacy-item__info">
          <text class="privacy-item__title">{{ t('profile.receiveSameSchoolInfo') }}</text>
          <text class="privacy-item__desc">{{ t('profile.receiveSameSchoolInfoDesc') }}</text>
        </view>
        <!-- R7-L10-D12（可达性 P2）：原生 switch 的 OFF 态轨道色由平台写死（`color` prop
             只作用于 ON 态），实测 x=296..330/y=138..146 轨道仅 (243..246) 灰、白滑块压白卡，
             整控件与背景 Δlum≤12 ⇒ 按建议改法「给 OFF 态加品牌化轨道底色/描边」在页面侧
             套一层品牌绿描边的薄荷底芯片，任意状态都能在白卡上读成"这里有枚可点开关"。 -->
        <view class="privacy-item__switch-chip">
          <switch
            class="privacy-item__switch privacy-item__switch--receive"
            :checked="receiveInfo"
            :color="designTokens.color.brand[500]"
            @change="onReceiveInfoChange"
          />
        </view>
      </view>
    </view>

    <!-- R7-L10-D11（空态文案 P2）：开关卡以下 y=250..800 整屏空薄荷底（550px≈1100rpx），
         页面只有两枚开关 + 120rpx footer-space，靠 min-height:100vh 撑白 ⇒ 半成品观感。
         按建议改法第一条补「既有后域能力入口行」，三条全部指向仓内真实路由、全部复用
         locale 里已有的键（除第三行目的地标题——它沿用 location.vue:174 自己页头的
         「我的位置」字面量，本页无对应键、不新增 locale）：
         ① profile.safetyCenter → ROUTES.SECURITY（subpackages/tools/security/index：
            登录设备下线 + 第三方账号解绑，均为已上线真实能力）；
         ② security.privacyPolicy → SUBPACKAGE_ROUTES.LEGAL.PRIVACY（legal 分包真实页）；
         ③ 我的位置 → ROUTES.PROFILE.LOCATION（重新定位 / 地图选点真实链路）。
         下方说明块只陈述代码里已写明的事实（MP-R1-PRIVACY-001：开关当前仅本机持久化，
         后端偏好接口未接入），不承诺尚不存在的服务端行为、不编造数据。 -->
    <text class="privacy-page__group-title">{{ t('settings.privacySection') }}</text>
    <view class="privacy-page__section privacy-page__section--entries">
      <view
        class="privacy-entry press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('profile.safetyCenter')"
        @tap="goSecurity"
      >
        <view class="privacy-entry__info">
          <text class="privacy-entry__title">{{ t('profile.safetyCenter') }}</text>
          <text class="privacy-entry__desc">{{ t('profile.safetyCenterDesc') }}</text>
        </view>
        <text class="privacy-entry__arrow">›</text>
      </view>
      <view
        class="privacy-entry press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('security.privacyPolicy')"
        @tap="goPrivacyPolicy"
      >
        <view class="privacy-entry__info">
          <text class="privacy-entry__title">{{ t('security.privacyPolicy') }}</text>
          <text class="privacy-entry__desc">{{ t('security.privacyPolicyDesc') }}</text>
        </view>
        <text class="privacy-entry__arrow">›</text>
      </view>
      <view
        class="privacy-entry press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        aria-label="我的位置"
        @tap="goLocation"
      >
        <view class="privacy-entry__info">
          <text class="privacy-entry__title">我的位置</text>
          <text class="privacy-entry__desc">调整定位与地图选点</text>
        </view>
        <text class="privacy-entry__arrow">›</text>
      </view>
      <view
        class="privacy-entry press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('profile.helpSupport')"
        @tap="goHelp"
      >
        <view class="privacy-entry__info">
          <text class="privacy-entry__title">{{ t('profile.helpSupport') }}</text>
          <text class="privacy-entry__desc">{{ t('profile.helpSupportDesc') }}</text>
        </view>
        <text class="privacy-entry__arrow">›</text>
      </view>
    </view>

    <view class="privacy-page__note">
      <text class="privacy-page__note-text">两项开关目前仅在本机保存，后端同校推荐策略接入后才会改变实际推荐结果；位置与账号设备权限请从上方入口分别管理。</text>
    </view>

    <!-- 底部留白 -->
    <view class="privacy-page__footer-space" />
  </view>
</template>

<style scoped lang="scss">
.privacy-page {
  min-height: 100vh;
  background: var(--c-bg-page, #f4f6fa);
  padding-bottom: env(safe-area-inset-bottom);
}

.privacy-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--sp-4) + var(--statusbar, env(safe-area-inset-top))) var(--sp-4) var(--sp-3);
  background: linear-gradient(135deg, var(--c-brand-500, #36C99A) 0%, var(--c-brand-400, #6fe0b0) 100%);
}

/* R6-B59/D13（颜色token P3，2026-10-20）：返回钮圆底原引 --c-overlay-white-bg-tint，
   该令牌真值是 rgba(255,255,255,0.08)（design-variables.scss:914），而这里写的兜底 0.2
   永不生效 ⇒ 实测圆底 #4ACFA4 vs 头图 #3ACA9C 只差 Δ(16,5,8)，"可点圆钮"压成脏印。
   改引同域 other.vue:479 已用的 --c-overlay-bg-light（0.2 档，:739），不改 theme/**、
   不提浓度、不留假兜底。 */
.privacy-page__back {
  /* R7-L10-D13：热区 88rpx（AppShell.vue:334 口径），圆底移入 __back-circle */
  width: 88rpx;
  height: 88rpx;
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.privacy-page__back-circle {
  width: 64rpx;
  height: 64rpx;
  box-sizing: border-box;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-strong);
  border: 2rpx solid var(--c-overlay-border-stronger);
  display: flex;
  align-items: center;
  justify-content: center;
}

.privacy-page__back-text {
  font-size: var(--fs-3xl, 40rpx);
  color: var(--c-text-inverse, #ffffff);
  line-height: 1;
}

.privacy-page__titles {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  min-width: 0;
}

/* R6-B57/D10 同族顺手项：同域三页页头标题原为 44/36/30rpx 三档，按建议统一到 var(--fs-4xl)；
   顺带修掉原 `var(--fs-xl, 34rpx)` 的假兜底（--fs-xl 真值是 30rpx，兜底却写 34rpx）。 */
.privacy-page__title {
  font-size: var(--fs-4xl);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
}

.privacy-page__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse, #ffffff);
  opacity: 0.85;
}

.privacy-page__header-spacer {
  /* R7-L10-D13 同批：与 88rpx 返回热区同宽，标题组仍在绿色页头里居中 */
  width: 88rpx;
}

/* R6-B59/D11（间距 P2，2026-10-20）：卡横向 margin 原取 --sp-4（真值 16rpx），
   实测白卡 x=9..369 ⇒ 左右各 18/16rpx，是同域 location(34rpx)/album(32rpx) 的一半，
   规范 §1.4 页边距是 --page-padding=32rpx ⇒ 横向换成该令牌，纵向保留 --sp-5。 */
.privacy-page__section {
  margin: var(--sp-5) var(--page-padding);
  background: var(--c-bg-container, #ffffff);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
  overflow: hidden;
}

.privacy-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-5);
  border-bottom: 1rpx solid var(--c-divider-light, #f0f0f0);
}

.privacy-item:last-child {
  border-bottom: none;
}

.privacy-item__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

/* R6-B59/D12（字号 P2，2026-10-20）：设置行主文字原落 --fs-base=24rpx(12px)「标签/时间戳」档、
   说明行 --fs-xs=20rpx(10px)「角标/法务」档（实测字形带高 11px / 9px），列表行主文字按规范
   §1.3 该走 30/28rpx；同时 :188 那条 `var(--fs-xs, 24rpx)` 的兜底 24rpx 与令牌真值 20rpx
   不符（实际渲的是真值），属假兜底 ⇒ 一并去掉。 */
.privacy-item__title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary, #333A37);
}

.privacy-item__desc {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary, #9AA39F);
  line-height: 1.5;
}

/* R7-L10-D12（可达性 P2）：OFF 态原生开关轨道是平台写死的近白色，压白卡 Δlum≤12 不可辨，
   页面侧套一层品牌档芯片（薄荷底 + 品牌绿描边），ON/OFF 两态都在白卡上立得住。 */
.privacy-item__switch-chip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--r-full);
  background: var(--c-brand-50);
  border: 2rpx solid var(--c-brand-300);
  box-sizing: border-box;
}

/* R7-L10-D11（空态文案 P2）：补充入口分组 */
.privacy-page__group-title {
  margin: var(--sp-6) var(--page-padding) var(--sp-3);
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-secondary);
}

.privacy-page__section--entries {
  /* 上方分组标题已带 --sp-3 下边距，这里不再叠 .privacy-page__section 的 --sp-5 上边距 */
  margin-top: 0;
}

.privacy-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-5);
  border-bottom: 1rpx solid var(--c-divider-light, #f0f0f0);
}

.privacy-entry:last-child {
  border-bottom: none;
}

.privacy-entry__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.privacy-entry__title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.privacy-entry__desc {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
  line-height: 1.5;
}

.privacy-entry__arrow {
  flex-shrink: 0;
  font-size: var(--fs-3xl);
  color: var(--c-text-tertiary);
  line-height: 1;
}

/* R7-L10-D11：说明块——陈述代码里已写明的事实（MP-R1-PRIVACY-001 仅本机持久化），
   同时消解 y=250 以下的整屏空薄荷底。 */
.privacy-page__note {
  margin: var(--sp-5) var(--page-padding) 0;
  padding: var(--sp-5);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-brand-50);
}

.privacy-page__note-text {
  font-size: var(--fs-lg);
  line-height: 1.6;
  color: var(--c-text-secondary);
}

.privacy-page__footer-space {
  height: 120rpx;
}
</style>
