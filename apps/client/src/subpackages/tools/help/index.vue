<script setup lang="ts">
/**
 * 帮助与客服页（Phase Feedback5 P2.6）
 *
 * 功能：
 * - 常见问题 FAQ（可展开折叠）
 * - 客服入口：在线客服（官方号恋爱助手会话）/ 意见反馈
 * - 客服联系方式（复制邮箱）
 */
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import { IMAGE_PATHS } from "../../../config/images";
// MP-R1-HELP-101：客服邮箱真实地址常量
import { APP_CONFIG } from "../../../config/app";
import { lightHaptic } from "../../../utils/haptic";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { usePageAccess } from "../../../composables/usePageAccess";
import { helpPageRequirements } from "../../../config/page-access";

/**
 * 帮助页访问要求：免登录可看（R7 裁定「页面放开、点击时再拦」）。
 *
 * 本页内容是 6 组静态 i18n FAQ + 常量客服邮箱，零用户数据，不该要求登录。
 * 这里刻意使用**独立**的 helpPageRequirements，不复用聊天页那枚 ——
 * 复用（原实现 `usePageAccess(chatPageRequirements)`）把「需要登录」这一项带了进来，
 * 使帮助页被当成受保护页，R6 实测两帧 landingMismatch。
 * 两个 CTA（在线客服 / 意见反馈）的目标页各自有门槛，未登录点击时仍会被拦到登录。
 *
 * ⚠ 本注释里不许出现「requiresAuth 紧跟冒号再跟 true」那种写法（冒号后有无空格都算命中）：
 * scripts/qa/derive-baseline-ledger.mjs:196 是对着**本页 .vue 源码全文**正则派生取景身份档的，
 * 命中就把这页钉成 A（登录态取景）。改前实测：本文件里写过那个字面量时，
 * 该页 identityAxis 由 A?（未声明门槛）被误判成 A。
 */
usePageAccess(helpPageRequirements);

const { t } = useI18n();

/** 当前展开的 FAQ 索引（null 表示全部收起） */
const expandedIndex = ref<number | null>(null);

/** 常见问题列表（i18n 文案键） */
const faqItems = [
  { q: "help.faqVerifyQ", a: "help.faqVerifyA" },
  { q: "help.faqCoinsQ", a: "help.faqCoinsA" },
  { q: "help.faqUnlockQ", a: "help.faqUnlockA" },
  { q: "help.faqVoiceQ", a: "help.faqVoiceA" },
  { q: "help.faqReportQ", a: "help.faqReportA" },
  { q: "help.faqVipQ", a: "help.faqVipA" },
] as const;

/** 展开/折叠 FAQ 项 */
function toggleFaq(index: number): void {
  lightHaptic();
  expandedIndex.value = expandedIndex.value === index ? null : index;
}

/** 在线客服：跳转官方号「恋爱助手」会话 */
function goOnlineService(): void {
  lightHaptic();
  openAppPath("/subpackages/chat/official-chat/index?accountId=official-assistant");
}

/** 意见反馈：跳转反馈历史页（含提交通道） */
function goFeedback(): void {
  lightHaptic();
  openAppPath(ROUTES.FEEDBACK_HISTORY);
}

/** 复制客服邮箱到剪贴板 */
function copyEmail(): void {
  lightHaptic();
  // MP-R1-HELP-101：复制真实邮箱地址（APP_CONFIG.SUPPORT_EMAIL）——原实现复制
  // t("help.contactEmail")，该 i18n 键是展示文案标签（"客服邮箱"/"Support Email"），
  // 全 locales 无任何邮箱地址字面量，剪贴板产物恒为标签文本
  uni.setClipboardData({
    data: APP_CONFIG.SUPPORT_EMAIL,
    success: () => {
      uni.showToast({ title: t("help.emailCopied"), icon: "success" });
    },
  });
}
</script>

<template>
  <AppShell :title="t('help.navTitle')" :subtitle="t('help.subtitle')" show-back>
    <!-- 常见问题 -->
    <SectionCard :title="t('help.faqTitle')" compact>
      <view class="help-faq" role="list">
        <view
          v-for="(item, idx) in faqItems"
          :key="item.q"
          class="help-faq__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-expanded="expandedIndex === idx"
          :aria-label="t(item.q)"
          @tap="toggleFaq(idx)"
        >
          <view class="help-faq__question">
            <text class="help-faq__question-text">{{ t(item.q) }}</text>
            <text class="help-faq__chevron" :class="{ 'help-faq__chevron--open': expandedIndex === idx }">›</text>
          </view>
          <view v-if="expandedIndex === idx" class="help-faq__answer">
            <text class="help-faq__answer-text">{{ t(item.a) }}</text>
          </view>
        </view>
      </view>
    </SectionCard>

    <!-- 联系客服 -->
    <SectionCard :title="t('help.contactTitle')" compact>
      <view class="help-contact">
        <view
          class="help-contact__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('help.onlineService')"
          @tap="goOnlineService"
        >
          <view class="help-contact__icon-wrap" :style="{ background: 'var(--c-tint-pink-soft, #FFF0F5)' }">
            <image class="help-contact__icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" alt="" />
          </view>
          <view class="help-contact__info">
            <text class="help-contact__label">{{ t('help.onlineService') }}</text>
            <text class="help-contact__desc">{{ t('help.onlineServiceDesc') }}</text>
          </view>
          <text class="help-contact__arrow">›</text>
        </view>

        <view
          class="help-contact__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('help.feedbackEntry')"
          @tap="goFeedback"
        >
          <view class="help-contact__icon-wrap" :style="{ background: 'var(--c-tint-blue-soft, #E8F4FF)' }">
            <image class="help-contact__icon" :src="IMAGE_PATHS.ICONS_EMOJI.CLIPBOARD" mode="aspectFit" alt="" />
          </view>
          <view class="help-contact__info">
            <text class="help-contact__label">{{ t('help.feedbackEntry') }}</text>
            <text class="help-contact__desc">{{ t('help.feedbackDesc') }}</text>
          </view>
          <text class="help-contact__arrow">›</text>
        </view>

        <view
          class="help-contact__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('help.contactEmail')"
          @tap="copyEmail"
        >
          <view class="help-contact__icon-wrap" :style="{ background: 'var(--c-bg-brand)' }">
            <image class="help-contact__icon" :src="IMAGE_PATHS.ICONS_EMOJI.MAIL" mode="aspectFit" alt="" />
          </view>
          <view class="help-contact__info">
            <text class="help-contact__label">{{ t('help.contactEmail') }}</text>
            <!-- R14-L07-D11（文案 P1）：原副行只绑 help.serviceHours，邮箱地址一个字符都不上屏，
                 地址仅存在于 :79 copyEmail 静默写进剪贴板 ⇒ 用户既看不到、也无法核对自己复制到什么。
                 §12 铁律「画面上不许出现没有真相源的承诺」的合法形态之一 = 接真值：
                 这里把同一个 APP_CONFIG.SUPPORT_EMAIL（与 :79 剪贴板产物同一真相源，非前端编造）
                 直接渲染成明文一行 + selectable 可选中，服务时间挪到其后第三档，「复制」保留为快捷出口。 -->
            <text class="help-contact__email" selectable>{{ APP_CONFIG.SUPPORT_EMAIL }}</text>
            <text class="help-contact__desc">{{ t('help.serviceHours') }}</text>
          </view>
          <text class="help-contact__copy">{{ t('help.copy') }}</text>
        </view>
      </view>
    </SectionCard>

    <!-- 服务说明 -->
    <view class="help-footer">
      <text class="help-footer__text">{{ t('help.footerTip') }}</text>
    </view>
  </AppShell>
</template>

<style lang="scss" scoped>
.help-faq {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.help-faq__item {
  /* R14-L07-D09（颜色token P2）：原底色 --c-neutral-0(#FFFFFF) 与 SectionCard 容器
     --c-bg-container(#FFFFFF, SectionCard.vue:38) 同色，条目间 gap 只有 2rpx(1px)
     ⇒ top 帧 y=248..476 六行之间零像素分隔，6 个独立可点条目读成一整段连续文字。
     改引一档浅底 --c-bg-surface（design-variables.scss:129 真值 #F3FAF6），
     使每个条目成为可辨的浅绿卡块、1px 白缝显形，「一行一个可点条目」在帧上读得出来。 */
  background: var(--c-bg-surface);
  border-radius: var(--r-md);
  padding: 24rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.help-faq__question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.help-faq__question-text {
  /* R7-L07-D06/D07（字号 P3）：FAQ 主问句是可点主内容（整卡 role=button），原来落
     var(--f-md)（tokens.scss:146 → --fs-md=26rpx=13px），而规范 §1.3 把 13px 档指定给
     「标签 · 时间戳」，正文/列表主文字应为 --fs-xl/2xl=15/16px ⇒ 主问句升到 --fs-xl(30rpx=15px)，
     与答案 --f-sm(22rpx=11px) 拉开一档层级；同时改用标准令牌名 --fs-*，不再走 --f-* 短名族。 */
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
  flex: 1;
}

.help-faq__chevron {
  /* R14-L07-D10（字号 P3）：同一次字号归位只落到 :208，本行仍吃短名族 var(--f-lg)
     （tokens.scss:147 只是 --fs-lg 别名，值不变）⇒ 同页两套命名并存。换成标准名。 */
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
  transform: rotate(90deg);
  transition: transform 0.2s ease;
}

.help-faq__chevron--open {
  transform: rotate(270deg);
}

.help-faq__answer {
  padding-top: 8rpx;
  border-top: 1rpx solid var(--c-border, #eef0f4);
}

.help-faq__answer-text {
  /* R14-L07-D10：短名 --f-sm → 标准 --fs-sm（值不变，同页命名归口） */
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  line-height: 1.7;
}

.help-contact {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.help-contact__item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 8rpx;
  border-radius: var(--r-md);
}

.help-contact__icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.help-contact__icon {
  width: 40rpx;
  height: 40rpx;
}

.help-contact__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.help-contact__label {
  /* R11-L07-D20（字号 P2）：「在线客服/意见反馈/客服邮箱」三行列表主标题原取 var(--f-md)
     （tokens.scss:146 → --fs-md 26rpx=13px，§1.3 的「标签·时间戳」档），比同页已升档的
     FAQ 问句（:208 --fs-xl 15px）矮一档 ⇒ 同类控件两档并存。改与 FAQ 问句同档。 */
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.help-contact__desc {
  /* R11-L07-D24（字号 P2）：三条说明行原取 var(--f-xs)=20rpx=10px（§1.3 只授给角标/法务的
     极小档，比说明档下限 14px 小 4px），bottom 帧上读不出。升到 --fs-lg(28rpx=14px) 说明档。 */
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

.help-contact__arrow {
  /* R14-L07-D10：短名 --f-lg → 标准 --fs-lg（值不变） */
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

.help-contact__copy {
  /* R11-L07-D21（可达性 P1）：「复制」控件原 font-size --f-xs(20rpx=10px) + 墨色 --c-brand-600
     #2AAE83 压 --c-tint-brand 兜底私值 #E8FAF3，实测 2.59:1（低于 4.5:1，也低于非文本 3:1）
     ⇒ 用户看不清这枚控件写的是什么。字号提到 --fs-sm(22rpx)，墨色取 --c-brand-800 #156B51：
       L(#156B51)=0.11269、L(#E8FBF2)=0.92559 ⇒ 0.97559/0.16269 = 6.00:1 ≥4.5:1。
  R11-L07-D22（颜色token P3）：底色原引未注册的 --c-tint-brand（令牌侧无定义，帧上由私值
     #E8FAF3 渲染）⇒ 改引已注册的 --c-bg-brand（design-variables.scss:379，#E8FBF2）并去掉
     行内十六进制兜底；令牌侧补 --c-tint-brand 定义属 theme/ 车道，见交件偏离说明。 */
  font-size: var(--fs-sm);
  color: var(--c-brand-800);
  background: var(--c-bg-brand);
  padding: 8rpx 20rpx;
  border-radius: var(--r-full);
  /* R14-L07-D12（可达性 P2）：「复制」胶囊实测 78×42rpx（39×21px），两向都低于全站
     88rpx 最小热区（只有下限 48%），是全页最小可点控件。补 min-height/min-width:88rpx
     撑到热区下限，box-sizing:border-box + flex 居中保住胶囊观感（border-radius:full 不变）。 */
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 88rpx;
  min-height: 88rpx;
}

.help-footer {
  /* R11-L07-D23（间距 P2）：页脚原 padding 底部只有 16rpx(8px) 且不含 safe-area，
     而本页 AppShell 未开 tabBarSafe（容器底距为 0）⇒ bottom 帧上页脚一行被 home indicator
     压住并裁掉半截字高。底部改 calc(env(safe-area-inset-bottom) + var(--sp-6))：
     取景档 env()=0 时仍兑现 --sp-6(24rpx=12px)，比原 8px 抬 4px；真机再叠加安全区。 */
  padding: 32rpx 24rpx calc(env(safe-area-inset-bottom) + var(--sp-6));
  display: flex;
  justify-content: center;
}

.help-footer__text {
  /* R14-L07-D13（字号 P2）：页脚是一整句说明文案（非角标/法务），原吃 --f-xs(20rpx=10px)
     落进只该给极小档的尺寸，且 --c-text-tertiary #6B7571 压页底 #EEF7F2 实测 4.36:1
     落 3:1–4.5:1 次级带、不达正文线。与同页 :285（R11-L07-D24）同口径升到 --fs-lg(28rpx=14px)
     说明档；14px 不享大字号豁免仍要 ≥4.5:1，故一并把色档提到 --c-text-secondary #4A524E
     压 #EEF7F2 实算 (0.9608/0.13202)=7.28:1 ≥4.5:1。 */
  font-size: var(--fs-lg);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.6;
}

/* R14-L07-D11：明文邮箱行样式，压在白色 SectionCard 容器（--c-bg-container #FFFFFF）上。
   --c-text-secondary #4A524E 白底实算 (1.05/0.13202)=7.95:1 ≥4.5:1；可选中便于跨设备手输。 */
.help-contact__email {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  word-break: break-all;
}
</style>

