<script setup lang="ts">
/**
 * 恋爱中心 - 恋爱咨询（4 板块）+ 恋爱测试入口
 *
 * Phase Feedback2：首页精简后，恋爱咨询（恋爱咨询/恋爱课程/社交咨询/社交课程）
 * 与恋爱测试（MBTI 等）统一收敛到本页，避免首页功能堆砌。
 *
 * 商业定位：为后续"情感内容付费/课程变现"预留入口位。
 * 2026-08-07 已落地真实内容源：四板块 → 咨询课程页 / 帮助客服页，测试 → MBTI 页。
 */
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import { computed } from "vue";
import { onShareAppMessage } from "@dcloudio/uni-app";
import { lightHaptic } from "../../../utils/haptic";
import { IMAGE_PATHS } from "../../../config/images";
// 任务 E3：三个内容页（附近的人 / MBTI / 恋爱咨询课程）路由常量
import { ROUTES } from "../../../constants/routes";
import { useSessionStore } from "../../../stores/session";
// 批次 A5：商业化封存开关
import { useAppConfigStore } from "../../../stores/app-config";
const { t } = useI18n();
const sessionStore = useSessionStore();
const appConfig = useAppConfigStore();

/** 恋爱咨询四板块 */
const consultingBoards = [
  { id: "love-consulting", icon: IMAGE_PATHS.ICONS_EMOJI.DOUBLE_HEART, titleKey: "home.loveConsulting", descKey: "home.loveConsultingDesc" },
  { id: "love-course", icon: IMAGE_PATHS.ICONS_EMOJI.BOOK, titleKey: "home.loveCourse", descKey: "home.loveCourseDesc" },
  { id: "social-consulting", icon: IMAGE_PATHS.ICONS_EMOJI.SPEECH, titleKey: "home.socialConsulting", descKey: "home.socialConsultingDesc" },
  { id: "social-course", icon: IMAGE_PATHS.ICONS_EMOJI.GRAD_CAP, titleKey: "home.socialCourse", descKey: "home.socialCourseDesc" },
] as const;

/** 恋爱测试入口 */
const testEntries = [
  { id: "mbti", icon: IMAGE_PATHS.ICONS_EMOJI.PUZZLE, titleKey: "home.mbtiTest" },
] as const;

/** 任务 E3：快捷入口（附近的人 / MBTI 人格测试 / 恋爱咨询课程）；批次 A5：consulting 受商业化开关控制 */
const quickEntries = computed(() => {
  const entries: Array<{ id: string; icon: string; titleKey: string; url: string }> = [
    // R6-L09-D01（素材缺失 P1）：原绑 ICONS_EMOJI.LOCATION = `/static/assets/icons/location.svg`，
    // 该根目录既不在 cdn-buckets.json 的 cdnPrefixes（只登记 icons/home|match|v2|emoji|login|social|nearby/）
    // 也不在 localPrefixes（只登记 icons/tabbar|register|common/）⇒ real 档发布链按引用裁剪后包内无此文件
    // （实测 apps/client/dist/build/mp-weixin-real/static/assets/icons/ 只剩 common/register/tabbar 三目录，
    // 且 common/ 下只有 location.png、无 location.svg），裸绑必出 0 墨迹空槽。
    // 改指同族在包内的 ICONS_COMMON.LOCATION（common/location.png：PNG 自带内在尺寸，
    // 不依赖 SVG 缺 width/height 那条渲染路径，实测包内 108/111 枚在盘）。
    { id: "nearby", icon: IMAGE_PATHS.ICONS_COMMON.LOCATION, titleKey: "contentPages.entries.nearby", url: ROUTES.LOVE_CENTER.NEARBY },
    // R10-P2-014：MBTI 与下方「恋爱测试」区重复，仅保留后者
  ];
  if (appConfig.isCommerceOn("course")) {
    entries.push({ id: "consulting", icon: IMAGE_PATHS.ICONS_EMOJI.DOUBLE_HEART, titleKey: "contentPages.entries.consulting", url: ROUTES.LOVE_CENTER.CONSULTING as string });
  }
  return entries;
});

/** 任务 E3：跳转快捷入口对应内容页 */
function goToQuickEntry(entry: { url: string }) {
  lightHaptic();
  uni.navigateTo({ url: entry.url });
}

/**
 * R6-L09-D06（需新建 P1）：课程两板块的封存判定。
 *
 * 缺陷实况：real 档后端未下发 commerce.course / commerce.consult ⇒ 原 `v-if` 让整块
 * 「恋爱咨询 4 板块」（本页标题承诺的主体内容，index.vue:3 页面自述）一帧画面都不出，
 * 页名与画面互相矛盾、滚到底只剩两张白卡。
 * 处置（页面侧降级，不动开关语义、不改判据）：4 板块恒渲染 ——
 * 恋爱咨询 / 社交咨询 指向帮助与客服页（ROUTES.HELP，与商业化开关无关）⇒ 保持可点；
 * 恋爱课程 / 社交课程 指向咨询课程页（该页自身按 isCommerceOn("consult") 封存）⇒
 * 开关未开时置灰 + 打「功能封存中」标记，点击给既有 commerce.sealedToast，不再整段消失。
 */
function isBoardSealed(boardId: string): boolean {
  return (boardId === "love-course" || boardId === "social-course") && !appConfig.isCommerceOn("consult");
}

/**
 * 点击四板块（2026-08-07 落地真实内容源）：
 * - 恋爱课程 / 社交课程 → 咨询课程页（web-view 加载国家高等教育智慧教育平台《爱情心理学》）
 * - 恋爱咨询 / 社交咨询 → 帮助与客服页（在线咨询：AI 恋爱助手 + 人工客服入口）
 */
function onBoardTap(boardId: string) {
  lightHaptic();
  if (boardId === "love-consulting" || boardId === "social-consulting") {
    uni.navigateTo({ url: ROUTES.HELP });
    return;
  }
  // R6-L09-D06：封存态课程板块不再跳进一个只有封存卡的页面，直接给封存提示
  if (isBoardSealed(boardId)) {
    uni.showToast({ title: t("commerce.sealedToast"), icon: "none" });
    return;
  }
  uni.navigateTo({ url: ROUTES.LOVE_CENTER.CONSULTING });
}

/** 点击测试：进入 MBTI 人格测试页（web-view 加载十六型本土化测试） */
function onTestTap(_testId: string) {
  lightHaptic();
  uni.navigateTo({ url: ROUTES.LOVE_CENTER.MBTI });
}

/** 恋爱中心分享（2026-08-10 A3 补齐）：分享自己的个人主页 */
onShareAppMessage(() => {
  const name = sessionStore.userSession?.displayName || t("chat.privateMessageTitle");
  return {
    title: t("profile.shareProfileTitle", { name }),
    path: "/pages/profile/index",
  };
});
</script>

<template>
  <AppShell :title="t('showcase.groups.home.items.loveCenter.title')" show-back>
    <!-- R7-L07-D05（文案 P2）：页头标题原引 home.loveConsulting=「恋爱咨询」，与下方第二个板块
         标题(:141 同键）逐字重复，且本页实为「恋爱中心」聚合页（快捷入口/恋爱咨询/恋爱测试）
         ⇒ 页头改走既有「恋爱中心」键（showcase.groups.home.items.loveCenter.title，zh-CN.ts:2344
         「恋爱中心」/ en-US.ts:2251 "Love Center"，非新增键），板块标题保留「恋爱咨询」 -->
    <view class="love-center">
    <!-- 任务 E3：快捷入口（附近的人 / MBTI 人格测试 / 恋爱咨询课程） -->
    <view class="love-center__section">
      <text class="love-center__section-title">{{ t('contentPages.entries.sectionTitle') }}</text>
      <view class="love-center__quick-grid">
        <view
          v-for="entry in quickEntries"
          :key="entry.id"
          class="love-center__quick press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t(entry.titleKey)"
          @tap="goToQuickEntry(entry)"
        >
          <!-- R6-L09-D01：lazy-load 只在 scroll-view 内生效（本页是普通 view），去掉无效属性 -->
          <image class="love-center__quick-icon" :src="entry.icon" mode="aspectFit" alt="" />
          <text class="love-center__quick-title">{{ t(entry.titleKey) }}</text>
          <text class="love-center__quick-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 恋爱咨询 4 板块（R6-L09-D06：不再整段 v-if 消失，未开放的课程板块降级为置灰 + 封存标记） -->
    <view class="love-center__section">
      <text class="love-center__section-title">{{ t('home.loveConsulting') }}</text>
      <view class="love-center__board-grid">
        <view
          v-for="board in consultingBoards"
          :key="board.id"
          class="love-center__board press-feedback"
          :class="{ 'love-center__board--sealed': isBoardSealed(board.id) }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t(board.titleKey)"
          :aria-disabled="isBoardSealed(board.id) ? 'true' : 'false'"
          @tap="onBoardTap(board.id)"
        >
          <image class="love-center__board-icon" :src="board.icon" mode="aspectFit" alt="" />
          <text class="love-center__board-title">{{ t(board.titleKey) }}</text>
          <text class="love-center__board-desc">{{ t(board.descKey) }}</text>
          <text v-if="isBoardSealed(board.id)" class="love-center__board-sealed">{{ t('commerce.sealedTitle') }}</text>
        </view>
      </view>
    </view>

    <!-- 恋爱测试 -->
    <view class="love-center__section">
      <text class="love-center__section-title">{{ t('home.loveTestEntry') }}</text>
      <view class="love-center__test-list">
        <view
          v-for="test in testEntries"
          :key="test.id"
          class="love-center__test press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t(test.titleKey)"
          @tap="onTestTap(test.id)"
        >
          <image class="love-center__test-icon" :src="test.icon" mode="aspectFit" alt="" />
          <text class="love-center__test-title">{{ t(test.titleKey) }}</text>
          <text class="love-center__test-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- R6-L09-D07①：删掉 120rpx 固定留白 —— 页底留白由 AppShell 的安全区/内容容器给，
         固定 spacer 在 814px 视口里只把「滚到底」变成一片 #EEF7F2 空底（实测 bottom 帧 y=147 以下 667px 全空） -->
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.love-center {
  /* R8-L07-D11（尺寸比例 P1）：删掉 min-height:100vh —— 它给容器自己定了 814px 高，
     而内容实测只有 ~570px ⇒ 实帧滚到底 MBTI 卡白底止于 y=425，其下到 home indicator(y=799)
     之间是 373px=740rpx（视口 46%）的纯页面底可滚死区（top 帧同一张卡止于 y=570，
     说明整页只滚了 144px 就到底，多出的 244px + shell 内边距都成了空转）。
     容器高度交回 AppShell 内容区定（.shell 的渐变底在 280rpx=140px 处已收敛到 --c-bg-page，
     露出的仍是同一档页面底，不会撕出色带）；底部安全区仍只由本节点 padding-bottom 单点承担
     （本页 AppShell 未开 tabBarSafe ⇒ bodyPaddingBottom 返回 '0'，AppShell.vue:120-124，不存在双计）。 */
  background: var(--c-bg-page, #f4f6fa);
  padding-bottom: env(safe-area-inset-bottom);
}

.love-center__section {
  /* R6-L09-D03（间距 P2）：水平方向归 0 —— AppShell `.shell__content` 已给 `padding: 0 32rpx`
     （components/layout/AppShell.vue:297），本页再叠 var(--sp-4)=16rpx 即成双重 gutter
     （实测卡片左缘 x=24px=48rpx，规范页边距 32rpx=16px 的 1.5 倍）。水平单一来源交回 AppShell。 */
  margin: var(--sp-5) 0;
}

.love-center__section-title {
  display: block;
  /* R6-L09-D04（字号 P2）：区块标题原引 var(--fs-lg, 32rpx)，兜底值与真值不符
     （theme/design-variables.scss:564 `--fs-lg: 28rpx`）⇒ 实测 14px，比规范 §1.3
     区块标题 18-20px 小 4-6px，且与同页 24rpx 正文几乎拉不开。改 --fs-3xl(36rpx=18px)。 */
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
  margin-bottom: var(--sp-4);
}

.love-center__board-grid {
  /* 2 列等宽网格（mp-weixin 不支持 grid，改 flex-wrap + 子项等宽） */
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.love-center__board {
  /* 2 列等宽：扣除行内 1 个间距后二等分 */
  width: calc((100% - var(--sp-3)) / 2);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: var(--sp-5);
  /* R6-L09-D02（圆角 P2）：卡片语义令牌 --card-radius(40rpx=20px)，原 --r-xl=24rpx 实测 11px 只有一半 */
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

/* R6-L09-D06：封存板块的置灰态（画面在、不可点，不再是「整块内容凭空消失」）。
   R8-L07-D09（可达性 P1）：原 `opacity: 0.5` 乘在整张卡上 ⇒ 实帧卡底由 #FFFFFF 退成 #F7FBF9
   （与左列开放卡同帧并排可见），卡内三档文字被同一次透明再压两档：
   标题最暗 #767C79 对 #F7FBF9 只有 4.08:1（28rpx=14px 不享大字号豁免）、说明 #919A96 → 2.77:1、
   「功能封存中」角标 #AFB7B3 → 1.99:1 且只有 --fs-xs 20rpx，三档都读不出。
   改按 §1.2 的分级降饱和：卡底保持 --c-bg-container（不乘透明度）、图标单独降饱和、
   标题/说明走 --c-text-tertiary #6B7571（白底 4.76:1）、角标单独给一档浅底（见下）。 */
.love-center__board--sealed {
  /* R15-L07-D16（颜色token P2）：封存态原只有一条 2rpx=1px 的 --c-status-disabled #DCE5E2 描边
     （帧 x=194 取样 rgb(220,229,226)），卡底仍 #FFFFFF 与左列开放卡完全同色，两态只靠 1px 灰线分辨。
     按 §1.2「浅底块 = --c-bg-surface」把封存卡底落到 #F3FAF6（design-variables.scss:129），
     描边取消（那 1px 灰线不再承担状态语义）。注意 box-sizing 由 global.scss 的 view{border-box} 兜住，
     去掉 2rpx 描边后外框尺寸不变，只有内衬多 2rpx，不产生卡片位移。
     卡底 #F3FAF6 对开放卡白底 #FFFFFF = 1.06:1、对页底 #EEF7F2 = 1.03:1 —— 差异读得出但很轻，
     属 §1.2 分级降饱和的浅底档，不是「换成另一个品牌色」。 */
  background: var(--c-bg-surface, #F3FAF6);
}

.love-center__board--sealed .love-center__board-icon {
  /* 分级降饱和只作用在装饰图标上，文字不再被整卡透明度连带压掉 */
  filter: saturate(0.2);
}

.love-center__board--sealed .love-center__board-title,
.love-center__board--sealed .love-center__board-desc {
  /* R15-L07-D16 连带（实算驱动，不是随手加深）：卡底从 #FFFFFF 落到 #F3FAF6 后，
     --c-text-tertiary #6B7571 压新底 = 4.4953:1（node 实算，差 0.005 不达 4.5:1，14px/15px 不享大字号豁免）
     ⇒ 两行墨色提到 --c-text-secondary #4A524E，压 #F3FAF6 = 7.60:1。 */
  color: var(--c-text-secondary, #4A524E);
}

.love-center__board-sealed {
  align-self: flex-start;
  /* R8-L07-D09 连带：角标自成一档浅底（--c-status-disabled #DCE5E2）+ --c-text-secondary 墨，
     对比 6.28:1；字号由 --fs-xs(20rpx) 提到 --fs-sm(22rpx)，不再依赖整卡透明度表达封存。
     R15-L07-D16 连带：卡底改 #F3FAF6 后，同档浅底角标压卡底只剩 1.21:1，读成「没有底」⇒
     角标底深一档取已注册的 --c-border-strong #C2CAC6（design-variables.scss:191/404），
     对卡底 1.58:1、角标墨 #4A524E 压它的实算 4.81:1 ≥4.5:1（22rpx 小字不享豁免，故不再加深）。 */
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-secondary, #4A524E);
  background: var(--c-border-strong, #C2CAC6);
  padding: 4rpx 12rpx;
  border-radius: var(--r-full, 999rpx);
}

.love-center__board-icon {
  width: 56rpx;
  height: 56rpx;
  /* R6-L09-D05（颜色token P2）：删掉 `color: var(--c-brand-500)` ——
     mp-weixin 的 `<image src="*.svg">` 是外链图片，CSS color 注不进那张图，
     这条声明从落不了画（同页 :201/:235/:270 三处同病）。描边色由素材自身决定，
     已由 F1 素材车道统一烘焙（见 tmp/qa/lanes/R6fix/F1-report.md §1.2）。 */
}

.love-center__board-title {
  /* R8-L07-D10（字号 P2）：宫格卡主标题原 var(--fs-base, 28rpx) —— 兜底值与真值不符
     （design-variables.scss:562 --fs-base: 24rpx），实帧「恋爱咨询」四字墨宽 47px ⇒ 11.75px/字
     ≈23.3rpx，落在 §1.3「小字：标签·时间戳」档，只有自己区块标题（--fs-3xl 实测 17.2px/字）的 2/3 高，
     §1.3 给列表主文字的 30/32rpx 档在本页没有任何一处标题使用。升到 --fs-xl（30rpx=15px）。 */
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.love-center__board-desc {
  /* R8-L07-D10：说明行原 --fs-xs（真值 20rpx，实测 9.7px/字≈19.2rpx，属 §1.3「极小：角标·法务」档），
     提到 --fs-md（26rpx）与 §1.3 的正文/说明两档对齐。
     R15-L07-D13（字号 P2）：--fs-md 真值 26rpx=13px（design-variables.scss:563），帧 y=358..371
     墨高 13px，与同卡标题 --fs-xl(30rpx=15px) 只差 2px、比 §1.3 说明档 14px 小 1px，四张卡副行读成标签
     ⇒ 再升一档到 --fs-lg（design-variables.scss:564 =28rpx=14px），行高 1.5 不动。 */
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-secondary, #6b7280);
  line-height: 1.5;
}

.love-center__test-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.love-center__test {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  /* R6-L09-D07②（可达性 P1）：纵向 padding 8rpx→24rpx，热区实测 38px(75rpx) → ≥88rpx 触控下限 */
  padding: var(--sp-6) var(--sp-5);
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.love-center__test-icon {
  width: 48rpx;
  height: 48rpx;
  /* R6-L09-D05：同上，`color` 注不进 `<image>` 外链 SVG，死代码已删 */
}

.love-center__test-title {
  flex: 1;
  /* R8-L07-D10 连带：入口行标题同病（缺陷卡点名「附近的人」实测 47px/4 字 = 11.75px/字 = --fs-base），
     一并与宫格卡主标题升到 §1.3 列表主文字档 --fs-xl（30rpx） */
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.love-center__test-arrow {
  font-size: var(--fs-2xl, 36rpx);
  color: var(--c-text-tertiary, #9ca3af);
}

/* ========== 任务 E3：快捷入口 ========== */
.love-center__quick-grid {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.love-center__quick {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  /* R6-L09-D07②：与 .love-center__test 同口径，热区 ≥88rpx */
  padding: var(--sp-6) var(--sp-5);
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.love-center__quick-icon {
  width: 48rpx;
  height: 48rpx;
  /* R6-L09-D05：同上，死代码已删 */
}

.love-center__quick-title {
  flex: 1;
  /* R8-L07-D10 连带：快捷入口行标题（「附近的人」即此项）同档升到 --fs-xl */
  font-size: var(--fs-xl, 30rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.love-center__quick-arrow {
  font-size: var(--fs-2xl, 36rpx);
  color: var(--c-text-tertiary, #9ca3af);
}
</style>
