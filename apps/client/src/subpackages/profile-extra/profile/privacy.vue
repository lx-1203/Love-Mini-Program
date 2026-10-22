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

/**
 * R11-L10-D11：自绘开关的点击切换。
 * 仍走上面的 computed setter（本机持久化 + 「已在本机保存」提示口径完全不变），
 * 只替换原生 switch 的不可控 OFF 轨道，不改任何数据来源。
 */
function toggleAllowRecommend(): void {
  allowRecommend.value = !allowRecommend.value;
}

/** switch 点击切换（接收同校信息） */
function toggleReceiveInfo(): void {
  receiveInfo.value = !receiveInfo.value;
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
        <!-- R7-L10-D12：本枚是帧上 OFF 态的那一枚（「允许推荐给本校学生」默认关）。
             R11-L10-D11（可达性 P2）：原生 switch 的 OFF 轨道由平台写死（color 只作用 ON 态），
             芯片环改变不了轨道/滑块同为近白；改自绘开关——OFF 轨道 #DCE5E2 + 深描边、
             白滑块同描边，ON 轨道 --c-brand-800 + 白滑块，边界均 ≥3:1。 -->
        <view
          class="privacy-item__switch privacy-item__switch--allow"
          role="switch"
          :aria-checked="allowRecommend ? 'true' : 'false'"
          :aria-label="t('profile.allowSameSchoolRecommend')"
          @tap="toggleAllowRecommend"
        >
          <view class="privacy-item__switch-chip">
            <view class="privacy-toggle" :class="{ 'privacy-toggle--on': allowRecommend }">
              <view class="privacy-toggle__knob" />
            </view>
          </view>
        </view>
      </view>

      <view class="privacy-item">
        <view class="privacy-item__info">
          <text class="privacy-item__title">{{ t('profile.receiveSameSchoolInfo') }}</text>
          <text class="privacy-item__desc">{{ t('profile.receiveSameSchoolInfoDesc') }}</text>
        </view>
        <!-- R7-L10-D12（可达性 P2）：原生 switch 的 OFF 态轨道色由平台写死（`color` prop
             只作用于 ON 态），实测 x=296..330/y=138..146 轨道仅 (243..246) 灰、白滑块压白卡，
             整控件与背景 Δlum≤12。
             R11-L10-D11：按卡「弃用原生 switch、改自绘轨道」落地，两枚同款。 -->
        <view
          class="privacy-item__switch privacy-item__switch--receive"
          role="switch"
          :aria-checked="receiveInfo ? 'true' : 'false'"
          :aria-label="t('profile.receiveSameSchoolInfo')"
          @tap="toggleReceiveInfo"
        >
          <view class="privacy-item__switch-chip">
            <view class="privacy-toggle" :class="{ 'privacy-toggle--on': receiveInfo }">
              <view class="privacy-toggle__knob" />
            </view>
          </view>
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
  /* R11-L10-D13（颜色token P3）：清掉写成蓝灰 #f4f6fa 的假兜底（--c-bg-page 真值 #EEF7F2） */
  background: var(--c-bg-page);
  padding-bottom: env(safe-area-inset-bottom);
}

.privacy-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--sp-4) + var(--statusbar, env(safe-area-inset-top))) var(--sp-4) var(--sp-3);
  /* R10-L10-D12（可达性 P1）：原 brand-500→brand-400 浅绿头，副标题（0.85 白 #E1F7EF）压上
     实算 1.88:1、帧上几乎糊成一条绿底浅痕。按卡上第一条改法把页头渐变换成同族深档
     --c-brand-700 #1F8D6A → --c-brand-800 #156B51（design-variables.scss:17/18），
     白字 4.14:1 / 6.45:1；副标题落在渐变下半（brand-800 一侧）实测 ≈6:1，主标题（--fs-4xl
     粗体，大字号 3:1 地板）即便落在 brand-700 上半也过线。这是页头渐变、非共享主 CTA ⇒ 不触 §11.3。 */
  background: linear-gradient(135deg, var(--c-brand-700, #1F8D6A) 0%, var(--c-brand-800, #156B51) 100%);
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
   顺带修掉原 `var(--fs-xl, 34rpx)` 的假兜底（--fs-xl 真值是 30rpx，兜底却写 34rpx）。
   R11-L10-D12（字号 P2）：40rpx=20px 仍是区块标题档，比页头 26–28px 低 6–8px；
   按卡升到页头档 --fs-7xl=56rpx（与 AppShell .shell__title 同值），副标题留 --fs-lg。 */
.privacy-page__title {
  font-size: var(--fs-7xl);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
}

.privacy-page__subtitle {
  /* R10-L10-D12（可达性 P1）：去掉 opacity:0.85（正是它把白字压成 0.85 混色 → 1.88:1 不可读），
     字号从 --fs-sm(22rpx) 提到 --fs-lg(28rpx)。纯白 --c-text-inverse 落在深绿头的下半档
     （--c-brand-800 一侧 6.45:1）即可读。 */
  font-size: var(--fs-lg);
  color: var(--c-text-inverse);
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
  /* R10-L10-D14（圆角 P2）：var(--r-xl,24rpx)=12px 比同分包他人主页那批卡"方"一档，
     低于 §1.4 卡片圆角 40rpx(20px) ⇒ 与 .privacy-page__note 一并归 var(--card-radius,40rpx)。 */
  border-radius: var(--card-radius, 40rpx);
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
  /* R11-L10-D13（颜色token P3）：原兜底 #9AA39F 是 quaternary 档（tertiary 真值 #6B7571），
     删除假兜底，与 location.vue:386/:400/:444 已清口径一致。 */
  color: var(--c-text-tertiary);
  line-height: 1.5;
}

/* R11-L10-D11（可达性 P2）：触控外圈 min 88rpx（视觉芯片仍 56rpx 高，热区不外扩观感），
   点芯片/轨道任意位置都命中。 */
.privacy-item__switch {
  flex-shrink: 0;
  min-width: 88rpx;
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
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

/* R11-L10-D11：自绘轨道。OFF：#DCE5E2 底 + --c-text-tertiary 描边（压芯片 4.4:1、
   压白卡 4.76:1）；滑块白底 + 同色描边（与轨道底 3.7:1）。ON：--c-brand-800 底/描边，
   白滑块与轨道 6.45:1。卡上建议的「--c-status-disabled 底 + --c-border-default 描边」
   实算描边只有 1.3:1（--c-border-default 是 12% 黑），故描边取 tertiary 深档。 */
.privacy-toggle {
  position: relative;
  width: 88rpx;
  height: 48rpx;
  box-sizing: border-box;
  border-radius: var(--r-full);
  background: var(--c-status-disabled);
  border: 2rpx solid var(--c-text-tertiary);
  transition: background-color var(--d-normal, 200ms), border-color var(--d-normal, 200ms);
}

.privacy-toggle__knob {
  position: absolute;
  top: 50%;
  left: 4rpx;
  width: 34rpx;
  height: 34rpx;
  box-sizing: border-box;
  transform: translateY(-50%);
  border-radius: 50%;
  background: var(--c-bg-container);
  border: 2rpx solid var(--c-text-tertiary);
  transition: left var(--d-normal, 200ms), border-color var(--d-normal, 200ms);
}

.privacy-toggle--on {
  background: var(--c-brand-800);
  border-color: var(--c-brand-800);
}

.privacy-toggle--on .privacy-toggle__knob {
  left: calc(100% - 38rpx);
  border-color: var(--c-brand-800);
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
  /* R10-L10-D14（圆角 P2）：var(--r-xl,24rpx)=12px 低于 §1.4 卡片 40rpx ⇒ 归 --card-radius(40rpx) */
  border-radius: var(--card-radius, 40rpx);
  /* R10-L10-D13（颜色token P2）：原底 --c-brand-50 #E8FAF3 与页面底 --c-bg-page #EEF7F2
     ΔR6/ΔG3/ΔB1 肉眼不可辨 ⇒ 这圈"说明卡"在画面上等于不存在，四行灰字像直接浮在薄荷底上。
     按卡上第一条改法与上方两张真白卡取同一容器配方：白底 + 卡片阴影，容器边界立刻立起来。 */
  background: var(--c-bg-container);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
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
