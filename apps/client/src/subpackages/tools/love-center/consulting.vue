<script setup lang="ts">
/**
 * 恋爱咨询课程（任务 E3）
 *
 * R10-P1-002（2026-09-17 全站审查）：本页带付费课程与「报名」交易动作，
 * 必须接商业化封存闸 —— commerce.consult（含总闸）为 false 时渲染封存卡，
 * 与 market 三页（ADR-2）表现一致；此前封存态下仍展示 ¥ 课程可报名。
 *
 * 支持后台配置 H5 URL：onLoad 读取 contentPageUrls.consultingUrl，
 * 非空则渲染 <web-view>；为空则展示本地示例课程列表。
 *
 * R10-P2-014：导航从绿色实心渐变头改为全站统一 AppShell（白底 + 居中标题 + 返回），
 * 同时消除该模块的状态栏叠印（R10-P1-003 家族：原 env-only 避让在 DevTools 恒 0）。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import { lightHaptic } from "../../../utils/haptic";
import { contentPageUrls } from "../../../config/content-pages";
import { IMAGE_PATHS } from "../../../config/images";
// R6-L10-D16：封存态次级出口跳「帮助与客服」，路由走全站常量
import { ROUTES } from "../../../constants/routes";
import { useAppConfigStore } from "../../../stores/app-config";
// R4-00976：toast 时长走统一常量（TOAST_DURATION.NORMAL_MS = 2000ms）
import { TOAST_DURATION } from "../../../constants/limits";

const { t } = useI18n();
const appConfig = useAppConfigStore();

/** 后台配置的 H5 URL（非空时展示 web-view） */
const webUrl = ref("");

/**
 * R10-P1-002：咨询/课程属付费项目，commerce.consult 子闸（受总闸管辖）关闭即封存。
 * MP-R1-CONSULTING-001：isCommerceOn 已兼容「commerce.consult / consult」双口径，
 * 传 "consult" 等价读取 commerce.consult，注释与实现口径一致。
 * 缺省封存（=== true 才放行），mock 后端未下发 commerce.* 时恒为封存态。
 */
const commerceSealed = computed(() => !appConfig.isCommerceOn("consult"));

onLoad(() => {
  webUrl.value = contentPageUrls.consultingUrl ?? "";
});

/**
 * R4-00032: 本地示例课程价格（元）集中配置，调价只需改此处。
 * 后续接入真实报名/支付链路后，价格应改由后端课程配置下发，此常量即移除。
 */
const COURSE_PRICES = {
  communication: 99,   // 恋爱沟通课
  dating: 129,         // 脱单攻略课
  intimacyRepair: 159, // 亲密关系修复课
} as const;

/** 本地示例课程（文案走 i18n contentPages.consulting.course*） */
const courses = [
  { id: "c-1", titleKey: "contentPages.consulting.course1.title", lecturerKey: "contentPages.consulting.course1.lecturer", descKey: "contentPages.consulting.course1.desc", price: COURSE_PRICES.communication },
  { id: "c-2", titleKey: "contentPages.consulting.course2.title", lecturerKey: "contentPages.consulting.course2.lecturer", descKey: "contentPages.consulting.course2.desc", price: COURSE_PRICES.dating },
  { id: "c-3", titleKey: "contentPages.consulting.course3.title", lecturerKey: "contentPages.consulting.course3.lecturer", descKey: "contentPages.consulting.course3.desc", price: COURSE_PRICES.intimacyRepair },
] as const;

/** 课程价格文案（¥{price}） */
function priceLabel(price: number): string {
  return t("contentPages.consulting.pricePrefix", { price });
}

/** 报名课程：toast 提示（真实报名/支付链路接入后端） */
function handleSignup() {
  lightHaptic();
  uni.showToast({ title: t("contentPages.consulting.signupSuccess"), icon: "none", duration: TOAST_DURATION.NORMAL_MS });
}

/**
 * R6-L10-D14：封存态下课程预览的「报名」——不跳交易链路，只给既有封存提示文案。
 */
function onSealedSignup() {
  lightHaptic();
  uni.showToast({ title: t("commerce.sealedToast"), icon: "none", duration: TOAST_DURATION.NORMAL_MS });
}

/**
 * R6-L10-D16：封存态的次级出口 —— 帮助与客服（本页唯一现在可用的真实出口）。
 */
function goHelpCenter() {
  lightHaptic();
  uni.navigateTo({ url: ROUTES.HELP });
}
</script>

<template>
  <view class="content-page">
    <!-- 后台配置 H5 URL：web-view 加载（封存态优先，不下发外部付费内容） -->
    <web-view v-if="!commerceSealed && webUrl" :src="webUrl" class="content-webview" />

    <!-- R10-P1-002：商业化封存态（commerce.consult=false）→ 封存说明 + 课程预览 -->
    <AppShell v-else-if="commerceSealed" :title="t('contentPages.consulting.title')" show-back>
      <view class="consult-sealed" aria-live="polite">
        <image class="consult-sealed__icon" :src="IMAGE_PATHS.ICONS_COMMON.LOCK_SVG" mode="aspectFit" alt="" />
        <text class="consult-sealed__title">{{ t('commerce.sealedTitle') }}</text>
        <text class="consult-sealed__desc">{{ t('commerce.sealedDesc') }}</text>
        <!-- R6-L10-D16（可达性 P1）：原封存卡只有 lock 图标 + 两行字，整页唯一可交互节点是
             AppShell 返回钮 ⇒ 死端。补既有出口：跳「帮助与客服」（ROUTES.HELP + 既有 i18n 键
             help.navTitle，未新增文案）。卡另建议的「开放提醒订阅」需要订阅链路与新 i18n 键，
             属需新建目标功能，见交件报告。 -->
        <view
          class="consult-sealed__action press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('help.navTitle')"
          @tap="goHelpCenter"
        >
          <text class="consult-sealed__action-text">{{ t('help.navTitle') }}</text>
        </view>
      </view>

      <!-- R6-L10-D14（需新建 P1）：已实现的 3 门课程不再整段藏掉 —— 封存态保留课程预览，
           「报名」置灰、点击给既有 commerce.sealedToast（不接支付、不改 isCommerceOn 语义）。
           同时消掉 D15/D16 的两半：内容补足后卡下不再有 460px（视口 60%）纯页面底，
           页面也第一次有了可滚内容（原 bottom 帧与 top 帧 contentHash 逐字相同）。 -->
      <view class="content-section">
        <text class="content-section__title">{{ t('contentPages.consulting.subtitle') }}</text>
        <view class="course-list" role="list">
          <view v-for="course in courses" :key="course.id" class="course-card">
            <view class="course-card__info">
              <text class="course-card__title">{{ t(course.titleKey) }}</text>
              <text class="course-card__desc">{{ t(course.descKey) }}</text>
              <view class="course-card__meta">
                <text class="course-card__lecturer">{{ t(course.lecturerKey) }}</text>
                <text class="course-card__price">{{ priceLabel(course.price) }}</text>
              </view>
            </view>
            <view
              class="course-card__signup course-card__signup--sealed"
              role="button"
              :aria-disabled="'true'"
              :aria-label="t('contentPages.consulting.signup')"
              @tap="onSealedSignup"
            >
              <text class="course-card__signup-text">{{ t('contentPages.consulting.signup') }}</text>
            </view>
          </view>
        </view>
      </view>
    </AppShell>

    <!-- 本地示例内容 -->
    <AppShell v-else :title="t('contentPages.consulting.title')" show-back>
      <scroll-view scroll-y class="content-scroll" :show-scrollbar="false">
        <view class="content-section">
          <text class="content-section__title">{{ t('contentPages.consulting.subtitle') }}</text>
          <view class="course-list" role="list">
            <view v-for="course in courses" :key="course.id" class="course-card">
              <view class="course-card__info">
                <text class="course-card__title">{{ t(course.titleKey) }}</text>
                <text class="course-card__desc">{{ t(course.descKey) }}</text>
                <view class="course-card__meta">
                  <text class="course-card__lecturer">{{ t(course.lecturerKey) }}</text>
                  <text class="course-card__price">{{ priceLabel(course.price) }}</text>
                </view>
              </view>
              <view class="course-card__signup press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('contentPages.consulting.signup')" @tap="handleSignup">
                <text class="course-card__signup-text">{{ t('contentPages.consulting.signup') }}</text>
              </view>
            </view>
          </view>
        </view>
        <view class="content-footer-space" />
      </scroll-view>
    </AppShell>
  </view>
</template>

<style scoped lang="scss">
.content-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--c-bg-page, #f4f6fa);
}

.content-webview {
  flex: 1;
}

.content-scroll {
  flex: 1;
  height: 0;
}

.content-section {
  /* R6-L10-D10 同族：左右外边距取规范页边距 --page-padding(32rpx)，不用 --sp-4(16rpx)。
     R8-L09-D01（位置 P1）：本页在 AppShell 自带的 32rpx gutter（AppShell.vue:297
     `.shell--standard { padding: 0 32rpx }`）之外又叠了一次 --page-padding ⇒ 双重页边距，
     实帧封存卡/课程卡列左缘 x=32 而 AppShell 大标题墨迹左缘 x=17，整列右移 15px、
     左右留白 32/31px 是规范页边距的两倍 ⇒ 水平 gutter 归零交回 AppShell 单一来源。 */
  margin: var(--sp-5) 0;
}

.content-section__title {
  display: block;
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
  margin-bottom: var(--sp-4);
}

/* ========== R10-P1-002：商业化封存卡（对齐 market/ADR-2 表现） ========== */
.consult-sealed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  /* R8-L09-D01（位置 P1）：同上，水平 32rpx 由 AppShell gutter 唯一提供，此处只留纵向间距 */
  margin: var(--sp-6) 0;
  padding: calc(var(--sp-8) + var(--sp-4)) var(--sp-5);
  /* R6-L10-D17（圆角 P2）：卡片语义令牌 --card-radius(40rpx=20px)，原 --r-xl=24rpx 实测 12px 只有一半 */
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

/* R6-L10-D16：封存卡内的次级出口（帮助与客服） */
.consult-sealed__action {
  min-height: 88rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: var(--sp-3);
  padding: 0 var(--sp-6);
  border-radius: var(--r-full);
  border: 2rpx solid var(--c-brand-500, #36C99A);
}

.consult-sealed__action-text {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: var(--c-brand-700, #1f8d6a);
}

.consult-sealed__icon {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: var(--sp-2);
  /* R8-L09-D04（颜色token P2）：锁描边烘焙色 #94A3B8（static/assets/icons/common/lock.svg:1）
     是 §1.2 之外的 slate 蓝灰，再被 opacity:0.85 压到白底上实测 #A2AFC2、对比只剩 2.3:1。
     mp 的 <image> 不响应 CSS color，故按全站既有做法对已渲染位图做「去饱和 + 压暗」落到
     --c-text-tertiary 档：saturate(0) → 161 灰阶，×0.71 → ≈#737373（对白底 4.74:1，过 4.5:1），
     并去掉 :243 那条 opacity 补偿（它就是被用来「显淡」的，留着会把压暗又拉回去）。
     素材本身描边改走令牌属资产车道，见交件 HANDOFF。
     （原 opacity: 0.85 一行已删除 —— 它只负责把图标压淡，留着会把上面的压暗又拉回去。） */
  filter: saturate(0) brightness(0.71);
}

.consult-sealed__title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.consult-sealed__desc {
  font-size: var(--fs-sm, 26rpx);
  color: var(--c-text-secondary, #5b6470);
  text-align: center;
  line-height: 1.6;
}

/* ========== 课程列表 ========== */
.course-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.course-card {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  /* R8-L09-D03（间距 P2）：卡内水平内衬原 var(--sp-5)=20rpx(10px)，只有规范
     --card-padding(32rpx=16px) 的 62.5% ⇒ 实帧卡白底左缘 x=32、首行标题墨迹左缘 x=42
     （卡内文字贴边），「报名」胶囊右缘 x=336 距卡缘 346 同样只剩 10px。换成 --card-padding。 */
  padding: var(--sp-4) var(--card-padding, 32rpx);
  /* R6-L10-D17：卡内其余卡同口径（缺陷卡原话「同页课程卡也是同一个 24rpx，一旦解封将整页同偏」） */
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.course-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.course-card__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.course-card__desc {
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-text-secondary, #5b6470);
  line-height: 1.5;
}

.course-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.course-card__lecturer {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary, #9aa1ab);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-card__price {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  /* R8-L09-D02（颜色token P1）：价格原直接命中 --c-error(#E5454D) ⇒ 全站错误红被当作商品价色，
     与 §1.2 的角色定义冲突（同页真错误提示会失去辨识度）。价格不是错误态，改走商品/金额语义
     的浪漫色系令牌。缺陷卡给的两档实测白底对比都不够正文用（--c-romance-500 #FF6B81 = 2.73:1、
     --c-brand-600 #2AAE83 = 2.81:1，28rpx=14px 不享大字号豁免），故取同族最深的 --c-romance-700
     #CC4A5F = 4.46:1（对白卡 #FFF 计算 L=0.1856），既退出 --c-error 角色又保住可读性。 */
  color: var(--c-romance-700, #CC4A5F);
  flex-shrink: 0;
}

.course-card__signup {
  flex-shrink: 0;
  background: var(--c-gradient-brand, linear-gradient(135deg, #36C99A, #6fe0b0));
  /* R8-L09-D05（可达性 P1）：原只有 padding: 12rpx var(--sp-5)，实帧「报名」胶囊 41×29px
     （高 29px≈58rpx），比全站 88rpx=44px 最小触摸目标矮 15px，而同页封存卡的「帮助与客服」
     在 :222 已是 min-height:88rpx ⇒ 同页两枚按钮热区不一致。按 :222 同口径补齐热区并居中。 */
  min-height: 88rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx var(--sp-5);
  border-radius: var(--r-full);
}

/* R6-L10-D14：封存态课程预览的报名件 —— 保留形状、去掉行动色，明示「不可点进交易」 */
.course-card__signup--sealed {
  background: var(--c-bg-surface, #F3FAF6);
  /* R8-L09-D06（颜色token P2）连带：补控件轮廓，避免封存件只靠字色表达状态 */
  border: 2rpx solid var(--c-border-default, #DDE3E0);
}

.course-card__signup--sealed .course-card__signup-text {
  /* R8-L09-D06（颜色token P2）：封存态「报名」二字原声明走 --c-text-tertiary（回退值写成 #9aa1ab），
     实帧墨迹众数 #9AA39F —— 正是 §1.2 的 placeholder 专用档 --c-text-quaternary 同值，
     在 --c-bg-surface #F3FAF6 上只有 2.4:1（连 --c-text-tertiary 真值 #6B7571 同底也只有 4.50:1，
     贴着下限）⇒ 一个仍可点（@tap 给 sealedToast）的控件被画成占位符灰。
     提到 --c-text-secondary #4A524E 后同底 = 7.60:1，封存状态改由「浅底 + 描边 + 无行动色」表达。 */
  color: var(--c-text-secondary, #4A524E);
  font-weight: 500;
}

.course-card__signup-text {
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  color: var(--c-text-inverse, #ffffff);
}

.content-footer-space {
  height: calc(120rpx + env(safe-area-inset-bottom));
}
</style>
