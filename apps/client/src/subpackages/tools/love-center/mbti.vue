<script setup lang="ts">
/**
 * MBTI 人格测试（任务 E3）
 *
 * 支持后台配置 H5 URL：onLoad 读取 contentPageUrls.mbtiUrl，
 * 非空则渲染 <web-view>；为空则展示本地示例内容：
 * 1. MBTI 16 型简介（4 维速览 + 16 型名称）；
 * 2. 简化测试（4 道示例题目，单选），提交后弹层展示结果
 *    （2026-08-13：原 toast 展示升级为结果弹层——类型 + 名称 + 恋爱建议）。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { contentPageUrls } from "../../../config/content-pages";
import { IMAGE_PATHS } from "../../../config/images";
// R10-P1-003：注入 --statusbar/--capsule-right（DevTools env(safe-area-inset-top) 恒 0，标题叠印状态栏）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const { t } = useI18n();

/** 后台配置的 H5 URL（非空时展示 web-view） */
const webUrl = ref("");

/** 返回按钮图标 */
/* R10-L08-D09 同根因、不同页（FXJ 交件时点名「没有对应缺陷卡」而留下的一处）：
   本页页头是 .content-header 的 brand-500→brand-400 亮绿渐变（:295），
   而 ICONS_COMMON.BACK 的折线是 #94A2B7 —— 压亮绿底实测 1.23:1（深端）/1.60:1（浅端），
   低于非文本控件 3:1 线 ⇒ 页内返回出口在画面上找不到（微信胶囊只有「更多/关闭」）。
   与同 lane activities/detail.vue:42、search/index.vue:255 同口径换单色 #333333 的 v2 档：
   #333333 压 #36C99A = 6.00:1、压 #6fe0b0 = 7.80:1。素材三棵树均在盘 ⇒ 硬规矩 7 不适用。 */
const backIcon = IMAGE_PATHS.ICONS_V2.BACK;

onLoad(() => {
  webUrl.value = contentPageUrls.mbtiUrl ?? "";
});

/* ========== MBTI 16 型速览 ========== */

/** 16 型代码列表（名称走 i18n contentPages.mbti.types.<code>） */
const typeCodes = [
  "ENFP", "ENTP", "ENTJ", "ENFJ",
  "INFP", "INTP", "INTJ", "INFJ",
  "ESFP", "ESTP", "ESFJ", "ESTJ",
  "ISFP", "ISTP", "ISFJ", "ISTJ",
] as const;

/** 4 个维度说明（走 i18n） */
const dimensions = [
  { code: "E/I", key: "dimensionEI" },
  { code: "S/N", key: "dimensionSN" },
  { code: "T/F", key: "dimensionTF" },
  { code: "J/P", key: "dimensionJP" },
] as const;

/* ========== 简化测试 ========== */

/** 测试题目：每道题对应一个维度，option 下标映射维度字母（0 → 前一位，1 → 后一位） */
interface MbtiQuestion {
  id: string;
  dimension: "EI" | "SN" | "TF" | "JP";
  textKey: string;
  optionAKey: string;
  optionBKey: string;
}

const questions: MbtiQuestion[] = [
  { id: "q1", dimension: "EI", textKey: "contentPages.mbti.q1.text", optionAKey: "contentPages.mbti.q1.optionA", optionBKey: "contentPages.mbti.q1.optionB" },
  { id: "q2", dimension: "SN", textKey: "contentPages.mbti.q2.text", optionAKey: "contentPages.mbti.q2.optionA", optionBKey: "contentPages.mbti.q2.optionB" },
  { id: "q3", dimension: "TF", textKey: "contentPages.mbti.q3.text", optionAKey: "contentPages.mbti.q3.optionA", optionBKey: "contentPages.mbti.q3.optionB" },
  { id: "q4", dimension: "JP", textKey: "contentPages.mbti.q4.text", optionAKey: "contentPages.mbti.q4.optionA", optionBKey: "contentPages.mbti.q4.optionB" },
];

/** 每题的选项下标（0 = A，1 = B；null = 未作答） */
const answers = ref<Array<number | null>>([null, null, null, null]);

/** 选择答案 */
function selectAnswer(index: number, optionIndex: number) {
  answers.value[index] = optionIndex;
}

/** 2026-08-13：结果弹层状态（替换原 toast 展示——R4-00033 MBTI 结果 toast-only 遗留修复） */
const showResult = ref(false);
/** 结果类型代码（如 ENFP） */
const resultType = ref("");

/** 计算测试结果并弹出结果面板（16 型名称 + 4 维度恋爱建议） */
function submitTest() {
  const unanswered = answers.value.some((a) => a === null);
  if (unanswered) {
    uni.showToast({ title: t("contentPages.mbti.pleaseComplete"), icon: "none" });
    return;
  }
  const letters: string[] = [];
  questions.forEach((q, i) => {
    // 选项下标 0 → 维度前一位字母，1 → 后一位字母
    // charAt 避免 noUncheckedIndexedAccess 下字符串索引返回 string | undefined
    const choice = answers.value[i] as number;
    letters.push(q.dimension.charAt(choice));
  });
  resultType.value = letters.join("");
  showResult.value = true;
}

/** 结果弹层：按类型字母拼接恋爱建议（如 ENFP → adviceE + adviceN + adviceF + adviceP） */
const resultAdvice = computed(() => {
  if (resultType.value.length !== 4) return [];
  const letters = resultType.value.split("");
  const dimensionKeys = ["E", "I", "S", "N", "T", "F", "J", "P"];
  return letters
    .filter((l) => dimensionKeys.includes(l))
    .map((l) => t(`contentPages.mbti.advice${l}`));
});

/** 关闭结果弹层 */
function closeResult() {
  showResult.value = false;
}

/** 重新测试：关闭弹层并清空答案 */
function retakeTest() {
  showResult.value = false;
  answers.value = [null, null, null, null];
}

/** 返回上一页（右上角固定按钮） */
function goBack() {
  // MP-R2-LNEARBY-001：栈底兜底
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: "/pages/home/index" });
  }
}
</script>

<template>
  <view class="content-page" :style="menuStyleVars">
    <!-- 后台配置 H5 URL：web-view 加载 -->
    <web-view v-if="webUrl" :src="webUrl" class="content-webview" />

    <!-- 本地示例内容 -->
    <template v-else>
      <view class="content-header">
        <!-- MP-R1-LMBTI-101：返回键移到标题左侧——原固定右上角（right:8px、32×32px）
             与微信胶囊（87×32px、距右缘 7px、top≈statusbar+4px）矩形几乎完全重叠 -->
        <view class="content-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
          <image class="content-header__back-icon" :src="backIcon" mode="aspectFit" alt="" />
        </view>
        <text class="content-header__title">{{ t('contentPages.mbti.title') }}</text>
      </view>

      <scroll-view scroll-y class="content-scroll" :show-scrollbar="false">
        <!-- 16 型简介 -->
        <view class="content-section">
          <text class="content-section__title">{{ t('contentPages.mbti.typesTitle') }}</text>
          <text class="content-section__desc">{{ t('contentPages.mbti.typesDesc') }}</text>

          <!-- 4 维度说明 -->
          <view class="dimension-row">
            <view v-for="dim in dimensions" :key="dim.code" class="dimension-chip">
              <text class="dimension-chip__code">{{ dim.code }}</text>
              <text class="dimension-chip__label">{{ t(`contentPages.mbti.${dim.key}`) }}</text>
            </view>
          </view>

          <!-- 16 型速览网格 -->
          <view class="type-grid" role="list">
            <view
              v-for="code in typeCodes"
              :key="code"
              class="type-cell"
              role="listitem"
            >
              <text class="type-cell__code">{{ code }}</text>
              <text class="type-cell__name">{{ t(`contentPages.mbti.types.${code}`) }}</text>
            </view>
          </view>
        </view>

        <!-- 简化测试 -->
        <view class="content-section">
          <text class="content-section__title">{{ t('contentPages.mbti.testTitle') }}</text>
          <view class="quiz-list">
            <view v-for="(q, index) in questions" :key="q.id" class="quiz-item">
              <text class="quiz-item__question">{{ t(q.textKey) }}</text>
              <view class="quiz-item__options">
                <view
                  class="quiz-option press-feedback"
                  :class="{ 'quiz-option--selected': answers[index] === 0 }"
                  hover-class="press-feedback--active"
                  hover-stay-time="120"
                  role="radio"
                  :aria-checked="answers[index] === 0"
                  :aria-label="t(q.optionAKey)"
                  @tap="selectAnswer(index, 0)"
                >
                  <text class="quiz-option__text">{{ t(q.optionAKey) }}</text>
                </view>
                <view
                  class="quiz-option press-feedback"
                  :class="{ 'quiz-option--selected': answers[index] === 1 }"
                  hover-class="press-feedback--active"
                  hover-stay-time="120"
                  role="radio"
                  :aria-checked="answers[index] === 1"
                  :aria-label="t(q.optionBKey)"
                  @tap="selectAnswer(index, 1)"
                >
                  <text class="quiz-option__text">{{ t(q.optionBKey) }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 提交按钮 -->
          <view class="quiz-submit press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('contentPages.mbti.submit')" @tap="submitTest">
            <text class="quiz-submit__text">{{ t('contentPages.mbti.submit') }}</text>
          </view>
        </view>

        <view class="content-footer-space" />
      </scroll-view>

      <!-- 2026-08-13：测试结果弹层（替换 toast-only 展示） -->
      <view
        v-if="showResult"
        class="mbti-result-mask"
        role="dialog"
        aria-modal="true"
        :aria-label="t('contentPages.mbti.resultTitle')"
        @tap="closeResult"
      >
        <view class="mbti-result-panel" @tap.stop>
          <text class="mbti-result-panel__title">{{ t('contentPages.mbti.resultTitle') }}</text>
          <view class="mbti-result-panel__type">
            <text class="mbti-result-panel__type-code">{{ resultType }}</text>
            <text class="mbti-result-panel__type-name">{{ t(`contentPages.mbti.types.${resultType}`) }}</text>
          </view>
          <text class="mbti-result-panel__tip-title">{{ t('contentPages.mbti.resultTipPrefix') }}</text>
          <view class="mbti-result-panel__advice">
            <view v-for="(advice, idx) in resultAdvice" :key="idx" class="mbti-result-panel__advice-item">
              <view class="mbti-result-panel__advice-dot" />
              <text class="mbti-result-panel__advice-text">{{ advice }}</text>
            </view>
          </view>
          <view class="mbti-result-panel__actions">
            <view
              class="mbti-result-panel__btn mbti-result-panel__btn--ghost press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('contentPages.mbti.retake')"
              @tap="retakeTest"
            >
              <text class="mbti-result-panel__btn-text">{{ t('contentPages.mbti.retake') }}</text>
            </view>
            <view
              class="mbti-result-panel__btn mbti-result-panel__btn--primary press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('contentPages.mbti.resultClose')"
              @tap="closeResult"
            >
              <text class="mbti-result-panel__btn-text">{{ t('contentPages.mbti.resultClose') }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.content-page {
  display: flex;
  flex-direction: column;
  /* R6-L10-D13（可达性 P1）：原 `min-height: 100%` 不锁视口高 ⇒ 内部 scroll-view 的
     `flex:1; height:0`（:314-317）失去约束，整页转为**页面级滚动**：绿色导航条（含返回键）
     随内容一起滚出视口，16 格网格第 1 行顶到状态栏「22:52」同一水平线、第 2 行第 4 格被微信
     胶囊压住，且滚到底后页内没有任何返回出口。改固定视口高（同 nearby.vue:221 形态），
     导航与返回键常驻、滚动锁在 scroll-view 内部。 */
  height: 100vh;
  overflow: hidden;
  background: var(--c-bg-page, #f4f6fa);
}

.content-webview {
  flex: 1;
}

/* ========== 顶部栏（MP-R1-LMBTI-101：[返回键][标题] 左对齐行布局，
   原右上角 absolute 返回键与微信胶囊矩形几乎完全重叠） ========== */
.content-header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: calc(var(--sp-4) + var(--statusbar, env(safe-area-inset-top))) var(--sp-4) var(--sp-3);
  background: linear-gradient(135deg, var(--c-brand-500, #36C99A) 0%, var(--c-brand-400, #6fe0b0) 100%);
}

.content-header__title {
  /* R10-L08-D17（字号 P2）：本页导航标题原取 --fs-xl(30rpx=15px)，且兜底字面量写成 34rpx
     （--fs-xl 真值是 30rpx，design-variables.scss:565）——同角色标题在 activities/detail.vue:511
     是 --fs-5xl(44rpx)，两页差 7px，且都低于 §1.3 的 26-28px 主标题档。
     与 detail.vue 同口径提到 --fs-5xl，兜底字面量同时改回该令牌真值 44rpx。
     R10-L08-D16（颜色 token P1）：标题原 --c-text-inverse 白字压本栏 brand-500→brand-400
     渐变（实测 #49D0A2）= 1.89:1，连大字号 3:1 线都不到。与 detail.vue:513 完全同口径改深墨
     --c-brand-900(#0B4A38，L=0.05254)：
       压深端 #36C99A(L=0.44891) ⇒ 0.49891/0.10254 = 4.87:1
       压浅端 #55D5A7(L=0.52310) ⇒ 0.57310/0.10254 = 5.59:1
     44rpx(22px)/700 享大字号豁免（门槛 3:1），两档同时过正文线 4.5:1。
     栏底不压深（那会把 pages.json:52 navigationBarTextStyle=black 的系统黑字拖到 3.26:1 以下，
     也会糊掉微信胶囊）——理由与算式见 detail.vue:466-472 的同一条裁定。 */
  font-size: var(--fs-5xl, 44rpx);
  font-weight: 700;
  color: var(--c-brand-900, #0B4A38);
}

.content-header__back {
  /* R11-L08-D23（可达性 P1）：本域 navigationStyle=custom，页内没有第二个返回出口，
     而这枚钮原写死 64rpx(32.3px)——帧上实测半透明白圆底 31×31px(62rpx)，比 88rpx 下限少 26rpx，
     比同帧底部「提交并查看结果」钮（:494 的 88rpx，实测 44px 高）矮 1.4 倍。
     补到 88rpx 并写死 min-*，与 nearby.vue:279 同档；图标同步 36→40rpx（40/88 视觉占比）。 */
  width: 88rpx;
  height: 88rpx;
  min-width: 88rpx;
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.2));
}

.content-header__back-icon {
  width: 40rpx;
  height: 40rpx;
  /* R11-L08-D26（颜色token P3）：此处原挂 `color: var(--c-text-inverse, #ffffff)`，
     但节点是裸 <image>（src=IMAGE_PATHS.ICONS_V2.BACK，单色 #333333 位图），CSS color 对位图
     无效 ⇒ 声明与实际渲染不符（帧上折线为深墨）。同一条孤儿声明在 activities/detail.vue 已由
     R10-L08-D09 删除。删掉不产生任何像素变化（删前删后都是深墨），故按硬规矩 4 登记为「未修」，
     见交件 R11-L08-D26：处置建议放在源码卫生批次，不在本轮虚计为已修。 */
  color: var(--c-text-inverse, #ffffff);
}

.content-scroll {
  flex: 1;
  height: 0;
}

.content-section {
  /* R6-L10-D10（间距 P2）：左右外边距 16rpx(--sp-4) → 规范页边距 --page-padding(32rpx)。
     实测标题左缘/网格首列左缘/题目卡左缘全部落在 x≈8px，只有规范 16.6px 的一半；
     且右侧末枚维度 chip 已顶到屏幕边缘（x≈390、0 留白），左右不对称。 */
  margin: var(--sp-5) var(--page-padding, 32rpx);
}

.content-section__title {
  display: block;
  /* R11-L08-D24（字号 P2）：「16 型人格速览」「简化测试（4 题）」两个区块标题原取 --fs-lg
     （真值 28rpx=14.1px；兜底字面量另写 32rpx，与真值不符），帧上墨迹带高仅 12-13px，
     与下面类型卡代码行（--fs-base 12.1px）只差 2px ⇒ 区块级与卡内标签几乎不分层。
     升到 §1.3 区块标题档 --fs-3xl(36rpx=18px)，兜底字面量同步改成令牌真值 36rpx。 */
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  margin-bottom: var(--sp-2);
}

.content-section__desc {
  display: block;
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary, #4A524E);
  line-height: 1.6;
  margin-bottom: var(--sp-4);
}

/* ========== 4 维度说明 ========== */
.dimension-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
}

.dimension-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: var(--c-bg-brand, #e8f8f0);
  padding: 6rpx var(--sp-3);
  border-radius: var(--r-full);
}

.dimension-chip__code {
  font-size: var(--fs-base, 24rpx);
  font-weight: 700;
  color: var(--c-brand-700);
}

.dimension-chip__label {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-secondary, #4A524E);
}

/* ========== 16 型速览网格 ========== */
.type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.type-cell {
  width: calc(25% - var(--sp-2) * 3 / 4);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: var(--sp-3) 0;
  /* R11-L08-D25（圆角 P2）：同一屏两批白底容器取两档——类型卡原用 --r-lg(20rpx=10px)，
     而下方四张问题卡 :441 已按 §1.4 收敛到 --card-radius(40rpx=20px) ⇒ 同页同角色两种圆角。
     统一引用 §1.4 的卡片圆角令牌（两页同改，不留一页两档）。 */
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.type-cell__code {
  font-size: var(--fs-base, 24rpx);
  font-weight: 700;
  color: var(--c-brand-700);
}

.type-cell__name {
  /* R6-L10-D12（字号 P2）：18rpx=9.4px 比全站最小令牌 --fs-xs(20rpx=10.4px) 还小 1px，
     属未登记字号；而这 16 个中文人格名是网格内唯一的语义承载 ⇒ 归到 --fs-xs 档 */
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-secondary, #4A524E);
  text-align: center;
  line-height: 1.3;
}

/* ========== 简化测试 ========== */
.quiz-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.quiz-item {
  padding: var(--sp-4);
  /* R10-L08-D20（圆角 P2）：四张白底问题卡原吃 --r-xl(24rpx=12px，帧上实测曲率约 8px)，
     而 §1.4 给白卡的圆角令牌是 --card-radius(40rpx=20px，design-variables.scss:699)，
     同 lane activities/detail.vue:575 的白卡已取该档 ⇒ 同角色两页取档不一。改引卡片档令牌。 */
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.quiz-item__question {
  display: block;
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary, #1A1E1C);
  margin-bottom: var(--sp-3);
}

.quiz-item__options {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.quiz-option {
  /* R6-L10-D11（可达性 P1）：8 个单选项是测试主流程的必经点击点，实测行高只有
     31px=60rpx（上下 padding 12rpx + 24rpx 文字行 + 2rpx 边框），比组件规范最小按钮
     --btn-height-sm(80rpx) 还矮 20rpx、比同页提交按钮 88rpx 矮 28rpx ⇒ 补 min-height 并垂直居中 */
  min-height: 88rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-lg, 20rpx);
  border: 2rpx solid var(--c-border-light, #eef0f4);
  background: var(--c-bg-surface, #fafbfc);
}

.quiz-option--selected {
  border-color: var(--c-brand-700);
  background: var(--c-bg-brand, #e8f8f0);
}

.quiz-option__text {
  /* R11-L08-D27（字号 P2）：8 个单选项是测试唯一的决策输入，文字原取 --fs-base（真值 24rpx=12.1px，
     低于 §1.3 正文线），帧上 8 行墨迹带高全部 11px，落进「标签·时间戳」档；88rpx 行高与 12px 字
     留白过大，读起来像占位框。提到 --fs-xl(30rpx=15px)，与题干 --fs-lg(14px) 拉开层级。 */
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-primary, #1A1E1C);
}

.quiz-option--selected .quiz-option__text {
  color: var(--c-brand-700);
  font-weight: 600;
}

/* ========== 提交按钮 ========== */
.quiz-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--r-full);
  /* R10-L08-D19（颜色 token P1）：本页唯一主操作「提交并查看结果」，标签 .quiz-submit__text
     是 --c-text-inverse(rgba(255,255,255,.95))/--fs-xl 15px/600 ⇒ 不享大字号豁免，门槛 4.5:1。
     原钮面 --c-gradient-brand（design-variables.scss:171 = linear-gradient(135deg,#36C99A,#55D5A7)），
     帧上实测钮面 #4ED2A4 ⇒ 白字 1.73:1，比同 lane 两页 CTA 低 4 倍。
     收成同族深档 --c-brand-800(#156B51，:18，L=0.11276)：纯白 1.05/0.16276=6.45:1、
     按 .95 实际标签色合成 6.01:1 —— 与 R9 收敛后的 BottomActionBar.vue:104、
     activities/detail.vue 报名钮、本批 daily-question 去签到钮同档。
     这不是「把渐变翻成实色」的回归：任务书 §11.3 否掉的是反向操作（把已收成实色的共享主 CTA
     再翻回渐变），本条正是 §11.3 记录的同一收敛方向（--c-gradient-brand 在 12 处消费者上全部 <4.5:1）。 */
  background: var(--c-brand-800, #156B51);
  margin-top: var(--sp-4);
}

.quiz-submit__text {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 600;
  color: var(--c-text-inverse, #ffffff);
}

.content-footer-space {
  /* R11-L08-D28（间距 P2）：原 height: calc(120rpx + env(...)) —— 模拟器 env()=0 时兑现 60px，
     与 :506 的 margin-top(var(--sp-4)) 和滚动容器尾部凑成钮下 89px 无令牌归属的空段；
     真机上这 60px 还会与 safe-area 叠加成 96px 的另一档。收成单一定义
     calc(var(--sp-8) + env(safe-area-inset-bottom, 0px))：--sp-8=32rpx(16px)，
     取景档兑现 16px、真机叠加安全区，钮下不再有阶梯外的空段。 */
  height: calc(var(--sp-8) + env(safe-area-inset-bottom, 0px));
}

/* ========== 2026-08-13：测试结果弹层 ========== */
.mbti-result-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-overlay-strong, rgba(15, 23, 42, 0.7));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  padding: 40rpx;
  animation: overlay-fade-in var(--d-slow, 250ms) cubic-bezier(0.4, 0, 0.2, 1) both;
}

.mbti-result-panel {
  width: 100%;
  max-width: 640rpx;
  background: var(--c-bg-container, #ffffff);
  border-radius: var(--r-xl, 28rpx);
  padding: var(--sp-6) var(--sp-7);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: var(--s-modal, 0 24rpx 60rpx rgba(15, 23, 42, 0.18));
  animation: modal-scale-in var(--d-fade, 300ms) cubic-bezier(0.25, 0.1, 0.25, 1) both;
}

.mbti-result-panel__title {
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary);
  margin-bottom: var(--sp-4);
}

.mbti-result-panel__type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  margin-bottom: var(--sp-4);
}

.mbti-result-panel__type-code {
  font-size: 72rpx;
  font-weight: 800;
  letter-spacing: 0.06em;
  background: var(--c-gradient-brand, linear-gradient(135deg, #36C99A, #6fe0b0));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1.1;
}

.mbti-result-panel__type-name {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: var(--c-brand-700);
}

.mbti-result-panel__tip-title {
  font-size: var(--fs-base, 28rpx);
  font-weight: 600;
  color: var(--c-text-secondary);
  align-self: flex-start;
  margin-bottom: var(--sp-2);
}

.mbti-result-panel__advice {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-bottom: var(--sp-5);
}

.mbti-result-panel__advice-item {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md, 12rpx);
  background: var(--c-bg-surface, #fafbfc);
}

.mbti-result-panel__advice-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--c-brand-500, #36C99A);
  margin-top: 12rpx;
  flex-shrink: 0;
}

.mbti-result-panel__advice-text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-primary);
  line-height: 1.6;
}

.mbti-result-panel__actions {
  width: 100%;
  display: flex;
  gap: var(--sp-3);
}

.mbti-result-panel__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  border-radius: var(--r-full);
}

.mbti-result-panel__btn--ghost {
  background: var(--c-bg-surface, #fafbfc);
  border: 1rpx solid var(--c-overlay-border-light, #DDE3E0);
}

.mbti-result-panel__btn--primary {
  background: var(--c-gradient-brand, linear-gradient(135deg, #36C99A, #6fe0b0));
}

.mbti-result-panel__btn-text {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: var(--c-text-primary);
}

.mbti-result-panel__btn--primary .mbti-result-panel__btn-text {
  color: var(--c-text-inverse, #ffffff);
}
</style>

