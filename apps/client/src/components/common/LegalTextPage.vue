<script setup lang="ts">
/**
 * 法律文本页共用组件（R4-00050：agreement / privacy 两页 95% 重复代码收敛于此）
 *
 * 用法：
 *   <LegalTextPage
 *     :legal-type="LegalTextType.USER_AGREEMENT"
 *     i18n-prefix="legal.userAgreement"
 *   />
 *
 * 功能说明：
 * - 通过 getLegalText(legalType) 从后端 CMS 拉取最新法律文本
 * - 后端不可达 / mock 模式 / 返回空时，回退到 i18n 本地 fallback 文案
 * - 顶部展示标题、版本号、最后更新时间
 * - 中部使用 scroll-view 渲染法律正文，支持长文本滚动
 * - 底部"我已阅读"按钮，点击返回上一页
 * - 提供 loading / empty / error 三态处理
 *
 * mp-weixin 兼容性：
 * - 使用 @tap（不使用 @click）
 * - 使用 hover-class（不使用 :hover 伪类）
 * - 不使用 import.meta.env 直读 DEV 标志
 * - 不使用 optional catch binding（catch 必须带参数）
 * - 使用 design tokens（var(--c-*) 等）
 */
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import AppShell from "../../components/layout/AppShell.vue";
import { getLegalText, LegalTextType, type LegalTextView } from "../../config/legal-texts";
import { lightHaptic } from "../../utils/haptic";
import { ROUTES } from "../../constants/routes";

const props = defineProps<{
  /** 法律文本类型（LegalTextType.USER_AGREEMENT / PRIVACY_POLICY） */
  legalType: LegalTextType;
  /** i18n key 前缀（如 "legal.userAgreement" / "legal.privacyPolicy"） */
  i18nPrefix: string;
}>();

/** 加载状态枚举（避免使用魔法字符串） */
type LoadState = "loading" | "success" | "error" | "empty";

const { t } = useI18n();

/** 当前加载状态 */
const loadState = ref<LoadState>("loading");
/** 法律文本数据 */
const legalText = ref<LegalTextView | null>(null);
/** 错误信息（error 状态时展示） */
const errorMessage = ref<string>("");

/** 页面挂载即拉取法律文本 */
onMounted(() => {
  void loadLegalText();
});

/**
 * 拉取法律文本。
 *
 * 调用 getLegalText，内部已封装：
 * - 5 分钟内存缓存
 * - mock 模式直接返回 fallback
 * - 后端不可达时回退到 i18n 本地文案
 * - 永不抛错（最坏情况返回本地 fallback）
 *
 * 但为了向用户明确展示"加载中"→"已加载"的过渡，
 * 这里仍保留 loading 状态切换；若返回的 version 为 local-fallback，
 * 视为后端不可达（仍展示 fallback 文案，不报错）。
 */
async function loadLegalText(): Promise<void> {
  loadState.value = "loading";
  errorMessage.value = "";
  try {
    const result = await getLegalText(props.legalType);
    legalText.value = result;
    // 若正文为空，标记为 empty 状态
    if (!result || !result.content || result.content.trim().length === 0) {
      loadState.value = "empty";
      return;
    }
    loadState.value = "success";
  } catch (error) {
    // getLegalText 内部已兜底，理论上不会抛错；
    // 但保险起见仍捕获，避免 Promise rejection 阻塞 UI
    errorMessage.value =
      error instanceof Error ? error.message : t("legal.loadFailed");
    loadState.value = "error";
  }
}

/** 顶部展示的标题（优先使用后端返回的 title，否则回退到 i18n） */
const displayTitle = computed<string>(() => {
  return legalText.value?.title || t(`${props.i18nPrefix}.title`);
});

/** 交给 AppShell 的页头标题（i18n 口径，与卡片头二选一，见 cardTitle） */
const shellTitle = computed<string>(() => t(`${props.i18nPrefix}.title`));

/**
 * 卡片头标题。
 *
 * R6-L16-D13 / R6-L16-D18（位置 P2）：同一句「隐私政策 / 用户协议」在 43px 内排两次
 * ——页头 AppShell title 实测 y=115..128（44rpx 档），卡片头 legal-header__title 实测
 * y=171..183（--fs-2xl=32rpx 档），读起来像标题被重复印。
 * 缺陷卡给的二选一是「不传 AppShell title」或「卡片头不再重复标题」：
 * 前者会让胶囊下方/导航区失去标题，故取后者 —— 卡片头只在后端标题与页头 i18n
 * 标题**不同文**时才渲染（真档后端 title 与 i18n 逐字相同 ⇒ 卡片头不再出，
 * 元信息行仍在；mock 或后台改过标题时两张脸各自成立，不吞信息）。
 */
const cardTitle = computed<string>(() =>
  displayTitle.value && displayTitle.value !== shellTitle.value ? displayTitle.value : ""
);

/**
 * 「最后更新」一行。
 *
 * R6-L16-D12（文案 P1）：帧上放大读出「最后更新：2026-07-26: 2026-10-19」——
 * i18n 值本身自带日期（zh-CN.ts:4739 `"lastUpdated": "最后更新：2026-07-26"`），
 * 模板 :171 又在其后拼 `: {{ displayUpdatedAt }}`（后端 updatedAt=2026-10-19）
 * ⇒ 合规页同时印两个互相矛盾的日期 + 一个多余半角冒号。
 * 单一来源口径按缺陷卡：日期一律由后端 displayUpdatedAt 出。
 * i18n 侧去日期不在本车道可写集（i18n/** 归 F1/文案车道，已登记），
 * 故消费点先兜住：把标签里烘着的日期剥掉再拼真值，i18n 改干净后本逻辑自动等价。
 */
const updatedAtText = computed<string>(() => {
  const raw = t(`${props.i18nPrefix}.lastUpdated`);
  if (!displayUpdatedAt.value) return raw;
  const label = raw
    .replace(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/g, "")
    .replace(/[:：\s]+$/, "")
    .trim();
  return `${label}：${displayUpdatedAt.value}`;
});

/**
 * 是否走「本地兜底文本」分支。
 *
 * R11-L13-D19（P0 · agreement top 帧）：本判定原先只用来把版本号抹成空串，
 * 注释写的理由是「避免误导用户」，实测效果相反 —— 帧上卡片头只剩一行
 * 「最后更新：2026-10-22」（该日期由 config/legal-texts.ts:142 `new Date()` 现造），
 * 唯一能揭穿「这不是后台正式文本」的状态被吞掉 ⇒ 用户把兜底文案当成 CMS 正式文本签署。
 * 现把同一判定翻出来当**披露**用：兜底态出提示药丸（见 .legal-header__fallback），
 * 且不再出日期（见 displayUpdatedAt）。
 */
const isLocalFallback = computed<boolean>(() => legalText.value?.version === "local-fallback");

/** 版本号（仅后端 CMS 返回时展示；兜底态不印假版本号，改由提示药丸披露状态） */
const displayVersion = computed<string>(() => {
  if (!legalText.value?.version) return "";
  if (isLocalFallback.value) return "";
  return legalText.value.version;
});

/** 最后更新时间（ISO 8601 → YYYY-MM-DD） */
const displayUpdatedAt = computed<string>(() => {
  if (!legalText.value?.updatedAt) return "";
  // R11-L13-D16（P0 · privacy top 帧）：`local-fallback` 时 updatedAt 是
  // config/legal-texts.ts:142 在渲染当天现造的 `new Date().toISOString()`，
  // 不是这份政策的修订日期 —— 帧上读数 2026-10-22 与本批取景日逐字相同。
  // 合规文本的时间戳不许由前端自造 ⇒ 兜底支一律不印日期（模板 .legal-header__updated
  // 的 v-if 随之不出，整行不留空带），
  // 正式口径只认后端 CMS 的 updatedAt 单点供给；缺列登记见交件「缺列 / 移交登记」。
  if (isLocalFallback.value) return "";
  try {
    const date = new Date(legalText.value.updatedAt);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (_e) {
    return "";
  }
});

/** 是否展示元信息（版本号 / 更新时间 / 兜底态提示，任一即出） */
const showMeta = computed<boolean>(() => {
  return displayVersion.value !== "" || displayUpdatedAt.value !== "" || isLocalFallback.value;
});

/** 卡片头整体是否还有内容可渲染（标题 + 版本 + 更新时间全空时不留一条空带） */
const showHeader = computed<boolean>(() => !!cardTitle.value || showMeta.value);

/**
 * 点击"我已阅读"按钮：轻触反馈 + 返回上一页。
 *
 * 使用 uni.navigateBack 而非 replaceAppPath，因为法律文本页通常
 * 是从登录页 / 设置页 navigateTo 进入，返回上一页符合用户预期。
 * 若页面栈为空（如冷启动直达），fallback 到 discover 首页。
 */
function handleAcknowledge(): void {
  lightHaptic();
  // #ifdef MP-WEIXIN
  uni.navigateBack({
    fail: () => {
      // 页面栈为空时 fallback 到首页
      uni.switchTab({ url: ROUTES.TAB.DISCOVER });
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.navigateBack().catch(() => {
    uni.switchTab({ url: ROUTES.TAB.DISCOVER }).catch(() => {
      // 静默处理
    });
  });
  // #endif
}

/**
 * 点击重试：重新拉取法律文本。
 */
function handleRetry(): void {
  lightHaptic();
  void loadLegalText();
}
</script>

<template>
  <!-- MP-R1-APPSHELL-101：传 fixed 吸顶（滚动时正文不入状态栏区） -->
  <AppShell :title="shellTitle" :show-tab-bar="false" show-back fixed>
    <view class="legal-page">
      <!-- 顶部标题区：R6-L16-D13/D18 —— 卡片头标题与页头同文时不再重排（见 cardTitle 注释） -->
      <view v-if="showHeader" class="legal-header">
        <text v-if="cardTitle" class="legal-header__title">{{ cardTitle }}</text>
        <view v-if="showMeta" class="legal-header__meta">
          <!-- R11-L13-D19：兜底态必须上屏披露（原文案走 i18n，本行是状态标识、
               非业务文案；i18n 键抽取登记给文案车道，见交件） -->
          <text v-if="isLocalFallback" class="legal-header__fallback">
            本地兜底文本 · 非正式版本
          </text>
          <text v-if="displayVersion" class="legal-header__version">
            {{ displayVersion }}
          </text>
          <text v-if="displayUpdatedAt" class="legal-header__updated">
            {{ updatedAtText }}
          </text>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-if="loadState === 'loading'" class="legal-state legal-state--loading">
        <view class="legal-state__spinner" />
        <text class="legal-state__text">{{ t("common.loading") }}</text>
      </view>

      <!-- 加载错误 -->
      <view v-else-if="loadState === 'error'" class="legal-state legal-state--error">
        <text class="legal-state__text">{{ errorMessage || t("legal.loadFailed") }}</text>
        <view
          class="legal-state__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleRetry"
        >
          <text class="legal-state__btn-text">{{ t("common.retry") }}</text>
        </view>
      </view>

      <!-- 空内容 -->
      <view v-else-if="loadState === 'empty'" class="legal-state legal-state--empty">
        <text class="legal-state__text">{{ t("legal.loadFailed") }}</text>
        <view
          class="legal-state__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleRetry"
        >
          <text class="legal-state__btn-text">{{ t("common.retry") }}</text>
        </view>
      </view>

      <!-- 正文（成功加载） -->
      <scroll-view
        v-else
        class="legal-content"
        scroll-y
        :enhanced="true"
        :show-scrollbar="false"
      >
        <text class="legal-content__text" user-select>{{ legalText?.content }}</text>
      </scroll-view>

      <!-- 底部"我已阅读"按钮（loading/error/empty 状态也保留，确保用户可返回） -->
      <view class="legal-footer">
        <view
          class="legal-footer__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleAcknowledge"
        >
          <text class="legal-footer__btn-text">
            {{ t(`${i18nPrefix}.accept`) }}
          </text>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.legal-page {
  display: flex;
  flex-direction: column;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
  /* R8-L13-D12/D16：.legal-footer 出流吸底后按等高占位补白，
     避免滚到文末时最后一段正文被固定条压住（钮高 --btn-height-md 96rpx + 上下内距）。
     R9-L13-D08/D10（间距 P2 · privacy + agreement 同根因）：上一版占位写死 200rpx，
     而吸底条实高 = --sp-4(16) + --btn-height-md(96) + --sp-6(24)（当时另加 1rpx 上描边）
     = 137rpx（design-variables.scss:550/552/666 三枚令牌真值，env=0 档）
     ⇒ 滚到底时白卡圆角底与白底吸底条之间露出 200−137 = 63rpx(~32px) 的
     --c-bg-page 绿带，把「一张白卡」切成两截（bottom 帧实测）。
     现改为与吸底条同源算式（含真机安全区，两侧同步增长），占位恒等于条高，
     差值 0 ⇒ 绿缝消失；不再出现「补多/补少」两轮来回。
     R11-L13-D18/D21 把吸底条底色改成 --c-bg-page 并删掉那条 1rpx 上描边 ⇒ 算式同步去掉
     +1rpx，占位仍恒等于条高（136rpx + env）。
     直接写 calc（与本文件 .legal-footer 的 padding 同一种写法，env/var 均为已在跑的组合），
     不经自定义属性中转，避免中转变量在 WXSS 里解析失败时整条 padding 退化成 0。 */
  padding-bottom: calc(
    var(--btn-height-md, 96rpx) + var(--sp-4) + var(--sp-6) +
      env(safe-area-inset-bottom)
  );
  box-sizing: border-box;
  background: var(--c-bg-page);
}

/* ========== 顶部标题区 ========== */
/* R8-L13-D13：与 .legal-content 连成同一张白卡（上圆角、左右同吃 --page-padding），
   原先它是全宽白条、正文是绿裸文，两截不同底 —— 现两截同色同列。
   R10-L13-D08（颜色token P3）：这一段此前是唯一没有投影的一段——上半无阴影、下半有阴影，
   一张卡被"有没有影子"从中间分成两截，且两段都不吃 §1.4 的 --card-shadow。
   现两段共用同一枚 --card-shadow（design-variables.scss:424），与 SectionCard.vue:48 同族，
   本域卡片投影收口成单一来源。
   R10-L13-D10（间距 P3 · agreement bottom 帧）：header 与 content 已合成一张白卡
   （同底色、上下圆角相接），这里保留的 border-bottom:1rpx 等于在「最后更新」元信息行与
   正文之间画一条内部分隔线，把连卡从中间切成两截、与 R8-L13-D13 的连卡口径自相矛盾 ⇒ 删线。
   删线后元信息与正文的间距改由 header 的 padding-bottom 承担：原 --sp-4(16rpx=8px)
   + content 的 padding-top --page-padding(32rpx=16px) = 24px 偏紧，padding-bottom 提到
   --sp-6(24rpx=12px) ⇒ 间距 28px，读起来仍是"同一段落前的呼吸位"而不是两个区块。 */
.legal-header {
  /* R11-L13-D17（位置 P2 · privacy top 帧）：与 .legal-content 同步去掉左右 margin。
     两段是「同一张白卡」的上下两截（R8-L13-D13 连卡口径），只改下半截会把卡从中间
     错开成两个宽度 ⇒ 一并归零，宽度交给外层内容列（AppShell 已给 --page-padding）。 */
  margin: var(--sp-4) 0 0;
  padding: var(--sp-6) var(--page-padding, 32rpx) var(--sp-6);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  background: var(--c-bg-container);
  border-radius: var(--card-radius, 40rpx) var(--card-radius, 40rpx) 0 0;
  box-shadow: var(--card-shadow);
}

.legal-header__title {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1.4;
}

.legal-header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  align-items: center;
}

.legal-header__version {
  font-size: var(--fs-xs);
  padding: 2rpx 12rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-brand);
  color: var(--c-brand-700);
}

/* R11-L13-D19（文案 P0 · agreement top 帧）：本地兜底态的披露药丸。
   卡上建议「走 --c-warning 档」——按 §2 的算法否掉：--c-warning #F59E0B 压白只有 2.15:1
   （StatusState.vue 的 .pill--heat 注释里 R9-L13-D03 同一条实测已记），
   故取仓内既有的 warning 深档文字令牌 --c-text-warning-dark #92400E（design-variables.scss:820）
   压 --c-warning-bg-tint（:838 = rgba(245,158,11,0.1)，叠白 #FEF5E6）= 6.57:1 ≥ 4.5:1，
   与 StatusState.vue 的 .pill--heat 同一把尺，不新造色。 */
.legal-header__fallback {
  font-size: var(--fs-xs);
  padding: 2rpx 12rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-warning-bg-tint, rgba(245, 158, 11, 0.1));
  color: var(--c-text-warning-dark, #92400e);
}

.legal-header__updated {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* ========== 三态：loading / error / empty ========== */
.legal-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  padding: var(--sp-8) var(--sp-6);
}

.legal-state__spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid var(--c-border-default, rgba(15, 23, 42, 0.08));
  border-top-color: var(--c-brand);
  border-radius: var(--r-circle, 50%);
  animation: legal-spinner var(--d-spinner, 800ms) linear infinite;
}

@keyframes legal-spinner {
  to {
    transform: rotate(360deg);
  }
}

.legal-state__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  text-align: center;
  line-height: 1.6;
}

.legal-state__btn {
  padding: var(--sp-3) var(--sp-6);
  border-radius: var(--r-md, 12rpx);
  background: var(--c-brand);
}

.legal-state__btn-text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse, #ffffff);
  font-weight: 600;
}

/* ========== 正文 scroll-view ========== */
/* R8-L13-D13（颜色token P2）+ R8-L13-D14（间距 P2）：
   原规则只有 flex/padding/box-sizing，没有 background ⇒ 正文直接摊在页面底 --c-bg-page
   (#EEF7F2) 上，夹在白色 .legal-header 与白色 .legal-footer 之间成「白条+绿裸文+白条」三明治
   （实测 y=200..814 三点同证 #EEF7F2）。补 --c-bg-container 与 header 连成一张白卡，
   并按 §1.4 上 --card-radius/--card-shadow，与全站「浅绿底 + 白卡」同构。
   左右内距原写 var(--sp-6)=24rpx=12px（design-variables.scss:552），比全站标准内容列
   x=33..345 各宽 4px ⇒ 页边距必须吃页面令牌 --page-padding（:575，32rpx=16px），不是间距阶梯。 */
.legal-content {
  flex: 1;
  /* R11-L13-D17（位置 P2 · privacy top 帧）：原写 `margin: 0 var(--page-padding)`。
     本元素是模板里 class="legal-content" 那个 `scroll-view`，其宽度按父容器 100% 解析、**不随右边距收缩**
     ⇒ 左缘被外层内容列的 16px 与自身 16px 叠成 32px，整张卡右移 16px、右侧页边距归零。
     帧上实测白卡 x=33..376（y=250/400/550/700 四行同读，右缘只剩 2px 内缩），
     而同批另三页的卡片列是 x=17..361（左右各 16px）⇒ 本卡脱离站点内容列并贴出屏外，
     本规则下方的 40rpx 下圆角与 --card-shadow 被推到屏外没有落点。
     改法取卡上第一条：去掉左右 margin，宽度交给外层内容列；内距仍吃 --page-padding，
     于是墨列回到 x=32..343（站点标准内容列 x=33..345），卡片列与同批三页同宽。 */
  margin: 0;
  padding: var(--page-padding, 32rpx);
  background: var(--c-bg-container);
  border-radius: 0 0 var(--card-radius, 40rpx) var(--card-radius, 40rpx);
  /* R10-L13-D08：与 .legal-header 改用同一枚 §1.4 --card-shadow（原 --s-card-soft 是
     第三套卡片投影档，与 header「无阴影」、SectionCard「--c-elevation-1」并存取档不一）。
     两段同 token ⇒ 「一张卡上半无投影、下半有投影」消失，投影只有一把尺。 */
  box-shadow: var(--card-shadow);
  box-sizing: border-box;
}

/* R10-L13-D07（字号 P3 · privacy top 帧）：法务正文原取 --fs-md=26rpx=13px，
   §1.3 两档都不贴（极小档 10/11px 只给「角标·法务」脚注、正文/数据行 15/16px）。
   卡给的两个方向里，11px 那一档是给页脚一行免责小字的，而本页正文是用户签署同意前
   必须通读的整篇政策（2000px 长文、唯一可读内容、--fs-md 已连吃三轮 NEEDS-RULING），
   按「可读正文」定档取 --fs-xl=30rpx=15px（design-variables.scss:565），
   颜色不动（--c-text-primary #1A1E1C 压白卡本就达标，本条是纯字号轴）；
   行高保持 R6-L16-D14 已裁的 1.75，
   长文仍随页滚动（.legal-content flex:1 + 页面滚动，R8-L13-D12 已定），不新增裁切。 */
.legal-content__text {
  display: block;
  font-size: var(--fs-xl);
  color: var(--c-text-primary);
  /* R6-L16-D14（字号 P3）之「行高」那一半：规范 §1.3 行高表给法务的是 1.75，
     原写 1.8（实测行距 23-24px 与 :338 一致）。
     当年登记为 NEEDS-RULING 的「字号」一半已由 R10-L13-D07 在本文件 :420-430 定档（--fs-xl 15px）。 */
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ========== 底部"我已阅读"按钮 ========== */
/* R8-L13-D12 / R8-L13-D16（可达性 P1×2 · privacy + agreement 两页同根因）：
   原 .legal-footer 只有 padding，没有任何吸底约束 ⇒ 它排在文档流末尾；
   而 .legal-page 的 min-height:100% 在本运行时无可解析的确定父高（退化成 auto），
   于是子级 .legal-content{flex:1} 不参与剩余空间分配、scroll-view 被 2000px 正文撑高，
   footer 被顶到最后一屏 ⇒ 首屏（top 帧）整张 378×814 品牌绿像素只有 2 个（返回箭头），
   「我已阅读并同意」0 像素可见，用户必须逐屏滚完全文才碰得到唯一确认出口。
   改法走缺陷卡给的第一条：出流吸底（不依赖 flex:1 是否解析，确定性强）。
   R8-L13-D17（颜色token P3）：同一改动顺带消掉「不贴边的白色横带」——
   left:0/right:0 让白底满宽（原来 x=1..15 与 x=363..376 各留 16px 浅绿缝、两端锯齿断层），
   内距改吃 --page-padding 使按钮列与全站标准内容列 x=33..345 对齐。 */
.legal-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  padding: var(--sp-4) var(--page-padding, 32rpx)
    calc(env(safe-area-inset-bottom) + var(--sp-6));
  /* R11-L13-D18 / R11-L13-D21（圆角 P2 · privacy + agreement 两条同根因）：
     吸底条底色原取 --c-bg-container（白），与上方白卡无缝相接 ——
     帧上实测（privacy bottom，x=200 逐像素）白卡内容到 y=711 为止，y=714..718 是
     本规则此前那条 1rpx border-top，其下仍是白，品牌绿按钮 y=722..768：卡底与条之间
     0 个 --c-bg-page 像素 ⇒ 本文件 .legal-content 的 40rpx 下圆角与它的 --card-shadow 没有落点，
     这份 2000px 长文在屏幕上没有可见的结尾。
     取卡上第一条改法：底色改回 --c-bg-page，与 BottomActionBar.vue:89 的吸底变体同口径
     （那条本来就是 `background: var(--c-bg-page, #EEF7F2)`，全站吸底动作条一把尺）。
     不取第二条（padding-bottom 追加 --section-gap 留绿缝）：那正是 R9-L13-D08/D10
     上一轮按「63rpx 绿带把一张白卡切成两截」判掉的东西，再加回去是两轮来回。
     描边随之删除：底面与页面同色后它是一条悬空发丝线，BottomActionBar 亦无描边。
     钮底 brand-800 压 --c-bg-page #EEF7F2 实算 5.91:1（L 0.11271 / 0.91110）≥ 非文本 3:1。 */
  background: var(--c-bg-page, #EEF7F2);
}

.legal-footer__btn {
  width: 100%;
  height: var(--btn-height-md, 96rpx);
  border-radius: var(--r-xl, 24rpx);
  /* R9-L13-D07/D09（可达性 P2 · privacy + agreement 同根因）：钮底原取 --c-brand #36C99A，
     文字取 --c-text-inverse（= --c-overlay-text-primary，rgba(255,255,255,.95)，
     design-variables.scss:369）⇒ #36C99A L=0.44896，白 L=1 ⇒ 1.05/0.49896 = 2.10:1，
     28rpx(=--fs-lg 14px) 粗体不享大字号豁免，差 4.5:1 一倍多；
     且 --c-text-inverse 的语义是「图片遮罩白字」，用作按钮前景属令牌误配。
     实算同族深档：白压 brand-600 #2AAE83 = 2.81:1、brand-700 #1F8D6A = 4.14:1 均不达标，
     brand-800 #156B51（:18）L=0.11271 ⇒ 1.05/0.16271 = 6.45:1 ≥ 4.5:1，采用；
     与 LockScreen.vue:717 的白字深档主 CTA 同一结论（那里 6.45:1 已落地）。
     前景同时归位到 --c-neutral-0（#FFFFFF，LockScreen.vue:733 同口径），
     不再借用图片遮罩档。 */
  background: var(--c-brand-800);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-float-btn, 0 4rpx 12rpx rgba(61, 201, 148, 0.25));
}

.legal-footer__btn-text {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-neutral-0, #ffffff);
  letter-spacing: 2rpx;
}
</style>
