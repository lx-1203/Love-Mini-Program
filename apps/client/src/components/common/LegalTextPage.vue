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

/** 版本号（后端返回时展示，否则展示本地 fallback 标识） */
const displayVersion = computed<string>(() => {
  if (!legalText.value?.version) return "";
  // 本地 fallback 文案不展示版本号（避免误导用户）
  if (legalText.value.version === "local-fallback") return "";
  return legalText.value.version;
});

/** 最后更新时间（ISO 8601 → YYYY-MM-DD） */
const displayUpdatedAt = computed<string>(() => {
  if (!legalText.value?.updatedAt) return "";
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

/** 是否展示元信息（版本号或更新时间至少一项存在） */
const showMeta = computed<boolean>(() => {
  return displayVersion.value !== "" || displayUpdatedAt.value !== "";
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
     避免滚到文末时最后一段正文被固定条压住（钮高 --btn-height-md 96rpx + 上下内距）。 */
  padding-bottom: 200rpx;
  box-sizing: border-box;
  background: var(--c-bg-page);
}

/* ========== 顶部标题区 ========== */
/* R8-L13-D13：与 .legal-content 连成同一张白卡（上圆角、左右同吃 --page-padding），
   原先它是全宽白条、正文是绿裸文，两截不同底 —— 现两截同色同列。 */
.legal-header {
  margin: var(--sp-4) var(--page-padding, 32rpx) 0;
  padding: var(--sp-6) var(--page-padding, 32rpx) var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  background: var(--c-bg-container);
  border-radius: var(--card-radius, 40rpx) var(--card-radius, 40rpx) 0 0;
  border-bottom: 1rpx solid var(--c-border-light, rgba(15, 23, 42, 0.04));
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
  margin: 0 var(--page-padding, 32rpx);
  padding: var(--page-padding, 32rpx);
  background: var(--c-bg-container);
  border-radius: 0 0 var(--card-radius, 40rpx) var(--card-radius, 40rpx);
  box-shadow: var(--s-card-soft);
  box-sizing: border-box;
}

.legal-content__text {
  display: block;
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  /* R6-L16-D14（字号 P3）之「行高」那一半：规范 §1.3 行高表给法务的是 1.75，
     原写 1.8（实测行距 23-24px 与 :338 一致）。字号一半登记为 NEEDS-RULING，见报告。 */
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
  background: var(--c-bg-container);
  border-top: 1rpx solid var(--c-border-light, rgba(15, 23, 42, 0.04));
}

.legal-footer__btn {
  width: 100%;
  height: var(--btn-height-md, 96rpx);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-float-btn, 0 4rpx 12rpx rgba(61, 201, 148, 0.25));
}

.legal-footer__btn-text {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-inverse, #ffffff);
  letter-spacing: 2rpx;
}
</style>
