<script setup lang="ts">
/**
 * LockScreen - 权限拦截全屏引导页
 *
 * 未登录 / 未完成基础资料填写的用户访问受限功能时展示：
 * - 未登录：主文案侧重「登录」，主按钮先登录、登录成功后自动进入资料完善页；
 * - 已登录但资料未完善：主文案侧重「完善资料」，主按钮直接进入资料完善页；
 * - 提供「× 关闭」（返回上一可浏览页）与「先逛逛公开内容」备选路径，弱化强制感；
 * - 权益清单具象化完善资料的收益，提升转化意愿。
 *
 * 布局说明：原实现依赖父容器高度（height:100%），而宿主页面仅设置 min-height:100%，
 * 百分比高度退化为 auto，导致内容堆在屏幕上半区、下半屏空白；2026-08-09 改成
 * min-height:100vh 后又带来新问题（R6-L09-D25 / R6-L08-D10）——相对定位的 100vh 容器会随页滚，
 * 关闭键漂移进微信胶囊带、宿主额外安全区把底部提示顶出首屏。
 * 现改为固定铺满视口的模态层（position:fixed + 四边 0），内容纵向居中、
 * 底部提示贴近屏底、超长内容由内容区内部滚动。
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
// R4-00229：路径走 ROUTES / SUBPACKAGE_ROUTES 常量
import { ROUTES, SUBPACKAGE_ROUTES } from "../../constants/routes";
// 2026-08-09：未登录「立即登录并完善」→ 登录成功后自动进入资料完善页
import { openAppPath, replaceAppPath, isTabPath, setPendingLoginRedirect } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
// R6-B06（根因①消费点侧）：所有 IMAGE_PATHS 一律过 resolveMediaUrl 再绑给 <image :src>。
// real 发布包里 icons/{v2,social,emoji,login,home,match,nearby} 与 images/** 均不随包
// （实测 apps/client/dist/build/mp-weixin-real/static/assets 下只剩 icons/{common,register,tabbar}
// 与 profile/svg、svg-spec），裸绑常量 = 直接 404 空白；解析器按 cdn-buckets.json 把它改写成
// 后端 app-assets URL（§1.6 铁律 3）。包内命中的目录（icons/common、svg-spec）幂等原样返回。
import { resolveMediaUrl } from "../../utils/media";
// compat 的 getCurrentPagePath（含 H5/MP 平台差异处理），用于判断是否处于 Tab 页（底部有 TabBar）
import { getCurrentPagePath } from "../../compat";
// R8-L07-D02（层级遮挡 P2）：组件自带 --statusbar 注入（见下方 rootStyleVars）
import { useStatusBarHeight } from "../../composables/useStatusBarHeight";

const { t, locale } = useI18n();

const props = defineProps<{
  /** 当前资料完善度百分比（已登录未完善时展示进度） */
  completionPercent?: number;
  /**
   * R6-L09-D27（文案）：宿主按页覆盖主标题。
   * 本组件此前把「登录后解锁完整交友功能」这一句通稿铺给 5 个宿主
   * （village 广场 / 喜欢与访客 / 心动信号 / 会话 / 官方号），
   * 心动信号页 14 条墨迹带里 0 处出现页名 ⇒ 画面与页面语义脱节。
   * 不传时保持原通用口径，行为逐字不变。
   */
  titleOverride?: string;
  /** R6-L09-D27：宿主按页覆盖副标题（一句说明「这里为什么锁、解锁后拿到什么」） */
  subtitleOverride?: string;
  /** R6-L09-D27：宿主按页覆盖权益清单（不传则用通用三条） */
  benefitsOverride?: string[];
}>();

const sessionStore = useSessionStore();
/** 是否已登录：决定主文案 / 主按钮 / 行为分支 */
const loggedIn = computed(() => sessionStore.isLoggedIn);

/** 主标题：未登录侧重登录授权，已登录未完善侧重完善资料；宿主可按页覆盖 */
const title = computed(
  () => props.titleOverride || t(loggedIn.value ? "lock.titleLoggedIn" : "lock.titleLoggedOut")
);

/** 副标题：具象化说明完善后可获得的能力；宿主可按页覆盖 */
const subtitle = computed(
  () =>
    props.subtitleOverride ||
    t(loggedIn.value ? "lock.subtitleLoggedIn" : "lock.subtitleLoggedOut")
);

/** 主按钮文案 */
const primaryText = computed(() =>
  t(loggedIn.value ? "lock.primaryLoggedIn" : "lock.primaryLoggedOut")
);

/** 完善进度是否展示：已登录且进度 >0（文字行与进度条共用同一判据，不两处各写一遍） */
const showProgress = computed(
  () => loggedIn.value && props.completionPercent !== undefined && props.completionPercent > 0
);

/** 进度文字（已登录且进度 >0 时展示，支持中途退出后继续完善） */
// `?? 0` 只喂类型（showProgress 已保证此处非 undefined），不改变任何取值
const progressText = computed(() =>
  showProgress.value ? t("lock.completionProgress", { n: props.completionPercent ?? 0 }) : ""
);

/**
 * R14-L08-D02（需新建 P2 · heart-signals bottom 帧）：进度条填充宽度。
 * 真值来源＝宿主传入的 completionPercent（heart-signals/index.vue:41 / chat-session:555 /
 * official-chat:81 均由 sessionStore.profileCompletion 派生，village 同口径），
 * 与上方「当前完善度 N%」那一行是同一个数、同一个 v-if 判据 ⇒ 不存在「有条没数」。
 * 钳到 0..100 只防后端越界值把条撑爆，不改写、不补位（口径同既有
 * components/profile/mine/MyCompletion.vue:18 的同型钳位）。
 * ⚠️ 卡上「看不出解锁线在哪」那一半不接：解锁阈值没有真相源——后端没有
 * 「解锁所需完善度」这一列，本组件只知 props.completionPercent；画一条 70%/80% 的
 * 阈值线就是造一个没有真相源的承诺（§12.4 第三形态）。槽的右端＝100%＝资料完整，
 * 这一条线由条本身的总宽度给出，不额外发明第二个数。
 */
const progressBarStyle = computed(() => ({
  width: `${Math.min(100, Math.max(0, props.completionPercent ?? 0))}%`,
}));

/** 权益清单：具象化完善资料的收益；宿主可按页覆盖 */
const benefits = computed(() =>
  props.benefitsOverride && props.benefitsOverride.length > 0
    ? props.benefitsOverride
    : [t("lock.benefitMatch"), t("lock.benefitCampus"), t("lock.benefitChat")]
);

/**
 * R15-L02-D13（素材缺失 P2 · village top 帧）：三行权益原共用 :326 的 lockIconSrc，
 * 帧上三枚图标逐像素同形同尺寸（约 12px 见方的同一枚锁），三条不同能力在图标层 0 区分。
 * 按卡上口径给三行各配一枚**仓内既有**图标（register/ 系，与 lock.svg 同一描线档
 * stroke="#4A524E" = --c-text-secondary，压页底 #EEF7F2 实算 7.37:1 ≥ 非文本 3:1，
 * 三枚同档不存在「一枚深一枚浅」）：
 *   解锁精准匹配推荐 → register/heart.svg（匹配 / 心动）
 *   查看同校校友主页 → register/graduation-cap.svg（校园 / 学历）
 *   发起私信与匿名聊天 → register/message.svg（私信）
 * 锁形只保留在主插画（.illustration__lock），不再兼任清单行首。
 * 不新增/下载/生成素材：三枚均已注册在 config/images.ts 的 REGISTER_ICONS（HEART / GRADUATION /
 * MESSAGE），且 icons/register 随 real 包发布（文件头 :28-30 已证），不依赖 CDN 桶。
 * ⚠️ 只对组件自带的默认三条生效：宿主 benefitsOverride 的行语义组件无从得知
 * （heart-signals/index.vue:76-80 的第二行是 slogan「双向心动，从这里开始」，不是校园能力），
 * 按序号硬套会给出语义相悖的图标 ⇒ 覆盖态保留中性锁形（= 原行为，不制造新错配）。
 */
const DEFAULT_BENEFIT_ICONS: readonly string[] = [
  IMAGE_PATHS.REGISTER_ICONS.HEART,
  IMAGE_PATHS.REGISTER_ICONS.GRADUATION,
  IMAGE_PATHS.REGISTER_ICONS.MESSAGE,
];
const benefitIcons = computed<string[]>(() =>
  props.benefitsOverride && props.benefitsOverride.length > 0
    ? []
    : DEFAULT_BENEFIT_ICONS.map((path) => resolveMediaUrl(path))
);

/* ========== 素材出口：一律过 resolveMediaUrl（R6-B06，见文件头注释） ========== */
/* R8-L08-D03（颜色token P2 · heart-signals）+ R8-L02-D18（可达性 P2 · village）：
   本组件三枚图标出口的描线色都写死在 SVG 源文件里，页面令牌覆盖不到，
   而本车道只许改组件（不许动 static/** 素材），故改指「同语义、描线色已在 §1.2 色板内」的
   既有素材（均已核：dist/build/mp-weixin-real/static/assets 与 apps/api/uploads/app-assets 双份在盘）：
   · lock.svg  stroke="#94A3B8"（非色板档）→ register/lock.svg stroke="#4A524E" = --c-text-secondary，
     压 280rpx --c-gradient-brand 环（#36C99A→#55D5A7）实测 3.85:1（深端）~4.86:1（浅端），
     过非文本 3:1 门槛；原 #94A3B8 压环色 #4FD3A5 只有 1.37:1。
   · check-circle.svg stroke="#94A3B8" → register/check-green.svg stroke="#36C99A" = --c-brand，
     勾选语义全站为品牌绿；环上徽章的 6rpx --c-brand 描边（:503 上一轮刚改）与勾本身终于同色。
     ⚠️ R14-L02-D05 之后本组件不再消费勾素材：主视觉环底的 ✓ 徽章整枚撤掉（理由见 lockIconSrc 下方注），
     checkIconSrc 出口随之删除，REGISTER_ICONS.CHECK_GREEN 键保持注册（他处仍在用），未动。
   × close.svg 无同语义的色板档素材可换 ⇒ 落在样式侧 filter（见 .lock-screen__close-icon）。 */
const closeIconSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.CLOSE_SVG));
const lockIconSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.REGISTER_ICONS.LOCK));
/**
 * R13-L02-D05（语义 P3 · village top 帧）：权益清单行首原也吃 checkIconSrc——
 * ✓ 的既定语义是「已完成」，而同屏明写「当前完善度 30%」、三条权益恰恰全部未解锁，
 * 勾选图形与门槛事实相反。行首改吃 lockIconSrc（register/lock.svg，stroke="#4A524E"
 * = --c-text-secondary 档，压页底 #EEF7F2 实测 7.37:1，同 .benefit__text 注的既有实算）。
 *
 * R14-L02-D05（文案 P3 · village top 帧）：上一轮只改了权益清单行首那一处 ✓，
 * 主视觉（280rpx 品牌绿大圆里一枚锁）底部叠的那枚 76rpx「白圆 + 绿 ✓」徽章漏改，
 * 新帧上仍然在场 ⇒ 同一屏里锁（未解锁）与 ✓（已完成/已解锁）同时承诺，矛盾没消除。
 * 卡给两条形态（改中性/进度语义，或撤掉 ✓），取「撤掉」：
 * 本屏三条权益全锁、完善度是 30%，画面没有任何一处真的「完成」可被 ✓ 指认，
 * ✓ 属没有真相源支撑的画面承诺 ⇒ §12.4 第二合法形态是撤掉它，而不是换成另一枚
 * 自造的完成图形。进度语义不消失，改由下方按 completionPercent 真值渲染的
 * 进度条承载（同批 R14-L08-D02），比在 38px 白圆里塞百分比数字更少重复、更少误读。
 * 连带删除的死码：.illustration__badge / .illustration__badge-icon 两处样式
 * （含 R9-L08-D04 为绿勾校准的 brightness(0.53) filter，节点没了它就是死样式）、
 * checkIconSrc 出口、模板里的徽章节点。
 */
/**
 * 漂浮爱心（R6-L03-D02 / R6-L08-D09 / R6-L09-D22 · R8-L07-D01 颜色token P2）：
 * 上一档取 ICONS_SOCIAL.LIKE_FILLED，该文件第 1 行写死 fill="#EF4444" —— §1.2 色板里没有的
 * 正红（帧上左颗 24×20px / 右颗 17×15px 区域众数色实测 #EF4444，211 px 命中），
 * 而规范给「喜欢」的色档是 romance-500 #FF6B81（差 R-16/G+25/B+61）。
 * 本组件不许动素材，故改指仓内既有的同图形档 ICONS_COMMON.HEART_FILLED_SVG
 * （common/heart-filled.svg，fill/stroke 逐字 = #FF6B81，即 §1.2 色板档），
 * 色值来自资产本身而非组件内字面量，图标形状/位置/尺寸不变。
 */
const heartIconSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.HEART_FILLED_SVG));
/**
 * R13-L02-D06（捏造用户 P3 · village bottom 帧）：插画两侧「同校头像」原是静态素材
 * PEOPLE.AVATAR_8 / AVATAR_3（R12-L02-D08 换绑、:138-139 写死），并非真实同校用户——
 * 画面在暗示「同校校友在等你」，后端并无这两人，与 messages 页删除捏造用户
 * （pages/messages/index.vue:125-127）的全站口径相悖。
 * 卡上两条合法形态取「撤掉人像」：本组件只在前置门槛（未登录 / 资料未完善）时渲染，
 * 此刻用户连归属学校都没有，「真实同校用户」在这个流程位上没有真相源可接
 * （同校列表接口要求已登录 + 资料完善，恰是本屏拦住的前置；游客态调用只会 401），
 * 接真形态在本组件不成立 ⇒ 删掉两侧人像节点，插画只留解锁徽章 + 漂浮爱心。
 * PEOPLE.AVATAR_1/2 的另两组消费者（NotLoggedWaiting.vue:113、circles/index.vue:306）
 * 不在本卡范围，不动。
 */
const heartsVisible = ref(true);

/**
 * 是否处于 Tab 页（底部有固定 TabBar）。
 * Tab 页中引导页底部需为 TabBar 预留空间，避免底部提示被遮挡。
 */
const isTabHost = isTabPath(getCurrentPagePath() ?? "");

/**
 * R8-L07-D02（层级遮挡 P2 · likes-visitors）：× 关闭钮的 top 写的是
 * `calc(var(--statusbar, env(safe-area-inset-top)) + var(--sp-3))`，
 * 但 env() 在本拍摄环境恒 0，而 --statusbar 是「宿主页」经 <page-meta :page-style> 注入的变量——
 * likes-visitors/index.vue:33-35 上一轮已改走 useStatusBarHeight，组件这一半却没跟上，
 * 于是 --statusbar 在组件作用域里解析不到、回落到 env()=0 ⇒ top=12px，
 * 半透明白圆顶边落在系统状态栏文字带内（帧上「0:58」字形 x=12..24/y=18..26 与圆底 x=14..56/y=8..47
 * 交叠 11×9px，× 被挤到时间右侧读成「0:58×」）。
 * 修法在组件这一半：自己测状态栏高度并把 --statusbar 以内联自定义属性挂在模态层根节点上，
 * 5 个宿主（village / likes-visitors / heart-signals / messages / 官方号）同口径一次覆盖，
 * 不依赖宿主是否注入；与 AppShell.vue:329、daily-question/index.vue:356 同源同一 API。
 */
const statusBarHeight = useStatusBarHeight();
const rootStyleVars = computed<Record<string, string>>(() => ({
  "--statusbar": `${statusBarHeight.value}px`,
}));

/**
 * 主操作：
 * - 未登录：记录「登录后待跳转资料完善」→ 跳登录页；
 * - 已登录未完善：直接进入资料完善页。
 */
function onPrimary() {
  if (!loggedIn.value) {
    setPendingLoginRedirect(SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE);
    replaceAppPath(ROUTES.LOGIN);
    return;
  }
  openAppPath(SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE);
}

/**
 * 「×」关闭：返回上一个可浏览的公开页面。
 * - 页面栈有上一页（如从喜欢/心动信号 navigateTo 进入）→ navigateBack；
 * - Tab 直达（栈深为 1）→ 切换到公开 Tab（匹配推荐页，无拦截可正常浏览）。
 */
function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: ROUTES.TAB.DISCOVER });
  }
}

/**
 * R12-L02-D09（可达性 P1 · village bottom 帧）：备选路径文案原是 t('lock.secondary')
 * ＝ zh「先逛逛公开内容」/ en "Browse public content first"，而 browsePublic() 的真实行为
 * 是切到公开 Tab（匹配推荐页 DISCOVER）、离开村社——未完善用户在村社页拿不到任何一条
 * 村社公开内容，也没有别的站内入口，「公开内容」的标签承诺兑现不了（真公开只读帖流
 * 需帖子接口公开可读，卡上自证另行立项）。按卡上短期口径把文案诚实化：
 * zh「先去逛逛匹配推荐」/ en "Browse match recommendations"，行为与去向逐字对齐。
 * ⚠️ 对卡上「抽 i18n 键」形态的偏离说明：键位落点 i18n/locales/*.ts 不在本车道可写集
 * （硬规矩 1），本波各车道 brief 的「可改文件」并集也不含任何 i18n 文件（已逐份核对）
 * ——先在组件内按 locale 出双语诚实文案；lock.secondary 目前仅本组件消费（全仓 grep 证，
 * zh-CN.ts:2911 / en-US.ts:2990 的旧值待文案车道改键值后，把本 computed 换回 t() 收编）。
 */
const secondaryText = computed(() =>
  String(locale.value).startsWith("en")
    ? "Browse match recommendations"
    : "先去逛逛匹配推荐"
);

/** 备选路径（文案见 secondaryText，R12-L02-D09 诚实化）：切换到公开 Tab（匹配推荐页），保留游客浏览路径 */
function browsePublic() {
  uni.switchTab({ url: ROUTES.TAB.DISCOVER });
}
</script>

<template>
  <view
    class="lock-screen"
    :style="rootStyleVars"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
  >
    <!-- 径向渐变心动氛围叠加层 -->
    <view class="lock-screen__atmosphere" />

    <!-- 模糊头像装饰背景 -->
    <view class="lock-screen__decoration">
      <view class="blur-avatar blur-avatar--1" />
      <view class="blur-avatar blur-avatar--2" />
      <view class="blur-avatar blur-avatar--3" />
      <view class="blur-avatar blur-avatar--4" />
      <view class="blur-avatar blur-avatar--5" />
    </view>

    <!-- 顶部操作区：× 关闭按钮（返回上一个可浏览页面） -->
    <button
      class="lock-screen__close"
      @tap="goBack"
      :aria-label="t('lock.closeAria')"
    >
      <image
        class="lock-screen__close-icon"
        :src="closeIconSrc"
        mode="aspectFit"
        alt=""
      />
    </button>

    <!-- 主体内容区（纵向铺满、三组贴顶铺开，R14-L08-D01） -->
    <view class="lock-screen__body">
      <!-- 主题插画：锁形主视觉 + 漂浮爱心
           （R13-L02-D06：静态写死的「同校头像」已撤；R14-L02-D05：环底那枚白圆绿 ✓
           徽章一并撤——✓ 的既定语义是「已完成/已解锁」，与本屏的门槛事实相反，
           「进度」这一语义改由下方真值进度条承载，见 R14-L08-D02） -->
      <view class="lock-screen__illustration">
        <view class="illustration__ring">
          <image
            class="illustration__lock"
            :src="lockIconSrc"
            mode="aspectFit"
            alt=""
          />
        </view>
        <view v-if="heartsVisible" class="illustration__heart illustration__heart--1">
          <image
            class="illustration__heart-img"
            :src="heartIconSrc"
            mode="aspectFit"
            alt=""
            @error="heartsVisible = false"
          />
        </view>
        <view v-if="heartsVisible" class="illustration__heart illustration__heart--2">
          <image
            class="illustration__heart-img"
            :src="heartIconSrc"
            mode="aspectFit"
            alt=""
          />
        </view>
      </view>

      <!-- 核心文案 + 权益清单 -->
      <view class="lock-screen__content">
        <text class="lock-screen__title">{{ title }}</text>
        <text class="lock-screen__subtitle">{{ subtitle }}</text>
        <text v-if="showProgress" class="lock-screen__progress">{{ progressText }}</text>
        <!-- R14-L08-D02：与上一行同一判据、同一个数——条状档（不是环形），
             槽的右端即「资料完整 100%」，填充宽度按 completionPercent 真值 -->
        <view v-if="showProgress" class="lock-screen__progress-bar">
          <view class="lock-screen__progress-fill" :style="progressBarStyle" />
        </view>
        <!-- R13-L02-D05：三条权益此刻均未解锁，行首语义用「锁」不用「✓」
             （R14-L02-D05 起主视觉环底那枚 ✓ 也已撤——本屏没有任何真正的已完成态）。
             R15-L02-D13：默认三条各配一枚同档既有图标（heart / graduation-cap / message，
             见 script 的 DEFAULT_BENEFIT_ICONS 注），锁形只留在主插画；
             宿主覆盖清单时 benefitIcons 为空 ⇒ 回落到 lockIconSrc（中性锁，不猜语义）。 -->
        <view class="lock-screen__benefits">
          <view v-for="(benefit, index) in benefits" :key="benefit" class="benefit">
            <image
              class="benefit__icon"
              :src="benefitIcons[index] || lockIconSrc"
              mode="aspectFit"
              alt=""
            />
            <text class="benefit__text">{{ benefit }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮区：主按钮 + 备选路径 -->
      <view class="lock-screen__action">
        <button
          class="lock-screen__btn"
          @tap="onPrimary"
          :aria-label="t('lock.completeNowAria')"
        >
          <text class="lock-screen__btn-text">{{ primaryText }}</text>
        </button>
        <view class="lock-screen__btn-link" @tap="browsePublic">
          <text class="lock-screen__btn-link-text">{{ secondaryText }}</text>
        </view>
      </view>
    </view>

    <!-- 底部补充提示（贴近屏底） -->
    <view class="lock-screen__footer" :class="{ 'lock-screen__footer--tab': isTabHost }">
      <text class="lock-screen__footer-text">{{ t('lock.footerTip') }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   权限拦截全屏引导页
   - 修复（2026-08-09）：原 height:100% 依赖父容器确定高度，而宿主页面
     仅有 min-height:100%（height 不定），百分比高度退化为 auto，
     内容堆在屏幕上半区、下半屏空白。
   - R6-L09-D25（位置 P1）+ R6-L08-D10（可达性 P2）：上一版用
     `position: relative; min-height: 100vh`，于是
       ① 唯一的退出「×」键挂在会滚的容器上（bottom 帧实测上移 69px，
          挤进微信胶囊 y=56-71 横带）——本组件自标 role="dialog" aria-modal="true"，
          模态层不该随背景滚；
       ② 宿主 likes-visitors/index.vue:317 又额外给 paddingTop=statusBar+sp-6，
          与组件自己的 100vh 叠加 ⇒ 总高超视口，底部提示要滚 90px 才露出。
     现改为铺满视口的固定层（5 个宿主均为 v-if/v-else 独占渲染，见
     grep "<LockScreen" 的 5 处调用点，不存在与页面正文并排渲染的宿主），
     关闭键与底部提示恒在屏内，内容超长时由 __body 内部滚动。
   ================================================================ */
.lock-screen {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--c-gradient-page);
}

/* ========== 径向渐变心动氛围叠加层（M-14） ========== */
/* R4-02512：以下为品牌色低不透明度氛围光晕（青藤绿/浪漫粉的 alpha 混色），
   品牌色在深色模式下保持不变（tokens.scss 设计约定），
   低 alpha 光晕在深色底上同样成立，无需暗色覆盖。
   R4-02166~169：以下 4 处 rgba 氛围渐变（浪漫粉/绿氛围渐变），无对应 token，保留原值。 */
.lock-screen__atmosphere {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(ellipse at 20% 20%, rgba(61, 201, 148, 0.18) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 30%, rgba(249, 168, 196, 0.2) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 80%, rgba(124, 217, 166, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 15% 70%, rgba(244, 114, 182, 0.12) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
}

/* ========== 模糊头像装饰（增强若隐若现感 M-14） ========== */
.lock-screen__decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.blur-avatar {
  position: absolute;
  border-radius: var(--r-full);
  /* #ifndef MP-WEIXIN */
  /* H5 / App 端：使用 filter:blur 实现真实模糊效果 */
  filter: blur(40rpx); /* 固定布局尺寸（模糊半径），无对应 token */
  /* #endif */
  /* #ifdef MP-WEIXIN */
  /* mp-weixin 不支持 filter:blur，用半透明遮罩 + 提升 opacity 兜底模拟若隐若现感 */
  opacity: 0.25;
  /* #endif */

  &--1 {
    width: 320rpx;
    height: 320rpx;
    top: -80rpx;
    left: -100rpx;
    background: linear-gradient(135deg, var(--c-brand-200), var(--c-brand-400));
    opacity: 0.15;
  }

  &--2 {
    width: 280rpx;
    height: 280rpx;
    top: 100rpx; /* 固定布局尺寸（装饰头像偏移），无对应 token */
    right: -80rpx;
    background: linear-gradient(135deg, var(--c-romance-200), var(--c-romance-400));
    opacity: 0.12;
  }

  &--3 {
    width: 360rpx;
    height: 360rpx;
    top: 200rpx;
    left: -60rpx;
    background: linear-gradient(135deg, var(--c-brand-100), var(--c-brand-300));
    opacity: 0.1;
  }

  &--4 {
    width: 240rpx;
    height: 240rpx;
    bottom: 200rpx; /* 固定布局尺寸（装饰头像偏移），无对应 token */
    right: -40rpx;
    background: linear-gradient(135deg, var(--c-romance-100), var(--c-romance-300));
    opacity: 0.13;
  }

  &--5 {
    width: 200rpx;
    height: 200rpx;
    bottom: -60rpx;
    left: 20%;
    background: linear-gradient(135deg, var(--c-brand-200), var(--c-romance-200));
    opacity: 0.12;
  }
}

/* ========== 顶部操作区：× 关闭按钮 ========== */
.lock-screen__close {
  position: absolute;
  top: calc(var(--statusbar, env(safe-area-inset-top)) + var(--sp-3));
  left: var(--sp-5);
  z-index: 2;
  /* R7-L08-D06（可达性 P3 · 【R6 已批过，未落地】）：× 是全屏锁定层里唯一「原路返回」出口
     （主按钮跳资料完善），实测直径 36px=72rpx，比仓内自陈触控下限 AppShell.vue:334
     「min-height: 88rpx(44px)」少 16rpx。同页 search/index.vue:696 .search-tab 的既有做法
     就是给按钮本体补到 88rpx（不是叠透明层）⇒ 同口径把圆钮本身扩到 88rpx。
     刻意不用「外扩透明命中区」那种写法：本车道硬规矩要求每条修复在帧上可测到像素差别，
     透明命中区在静态帧里一个像素都不动，等于没修。× 字形仍由 .lock-screen__close-icon
     的 40rpx 锁定，不随圆变大。 */
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-circle);
  background: var(--c-overlay-bg-strong);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
  &::after {
    border: none;
  }
}

.lock-screen__close:active {
  transform: scale(0.98);
}

.lock-screen__close-icon {
  width: 40rpx;
  height: 40rpx;
  /* R8-L08-D03（颜色token P2 · heart-signals）：close.svg 第 2 行写死 stroke="#94A3B8"，
     既不在 §1.2 色板、又因写在 SVG 里而无法被页面令牌覆盖
     —— × 字形最暗 #99A8BC 压半透明白圆 #E4F6F0 只有 2.19:1，低于非文本 3:1 门槛。
     本车道不许动 static/** 素材 ⇒ 按缺陷卡给的第二条口径在组件内加 filter，
     与 EmptyState.vue:163 同口径：grayscale(1) 抹掉蓝偏（#94A3B8 → 亮度 161 的灰），
     brightness(0.7) 压到 ≈#717171，压 #E4F6F0 实测 4.34:1 ≥ 3:1。
     同批的 lock/check 两枚已在 script 侧改指同语义色板档素材（REGISTER_ICONS.LOCK /
     REGISTER_ICONS.CHECK_GREEN），三枚出口一次覆盖。 */
  /* #ifdef MP-WEIXIN */
  filter: grayscale(1) brightness(0.7);
  /* #endif */
}

/* ========== 主体内容区：纵向铺满、三组贴顶铺开（固定层内部可滚，见 .lock-screen 注释；
   组间定值 + 余量集中一处由 R14-L08-D01 收口） ========== */
.lock-screen__body {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* R11-L08-D10（间距 P2 · heart-signals bottom 帧）：原 `justify-content:center` 把
     「插画 / 文案+权益 / 操作区」三组当成一个整块居中，内容矮于 body 时余量全部堆到
     块外 —— 帧上实测「先逛逛公开内容」墨迹止于 y=601、底部提示起于 y=732，中间 131px
     (≈260rpx) 是一条不落在 §1.4 sp 阶梯上的无主空带。
     按卡上给的第二种形态收口：三组各自贴顶/贴底铺开（space-between），钮下的空带被三组
     之间的呼吸位吃掉；内容超长时 space-between 退化成 flex-start，仍由 overflow-y:auto 滚，
     不会裁切。body 下内距同时从 --sp-6(24rpx) 提到 --sp-9(48rpx) —— 卡上第一条口径要的
     「由 --sp-9/--sp-10 定值收口」，即钮下间隙从此只有这一枚令牌 + 页脚自己的 --sp-4，
     不再有 260rpx 的浮动余量。5 个宿主（village / heart-signals / likes-visitors /
     messages / 官方号）共用本组件，同批同治。 */
  /* R14-L08-D01（间距 P2 · heart-signals top 帧）：上面那条 space-between 是 R11-L08-D10
     为「钮下 131px 无主空带」引入的，但它把视口余量按 1/n 摊到组间，帧上实测反而造出两条
     不落在 §1.4 sp 阶梯上的浮动空带——插画块底缘 y≈241 → 主标题墨迹起 y=353 = 112px(222rpx)，
     权益清单第 3 行墨迹止 y=507 → 主按钮顶缘 y=601 = 94px(187rpx)，两值都随屏高浮动，
     声明的 --sp-8/--sp-6 被余量吃掉（屏高一变就不是这两个数）。
     按卡上改法收口：组间一律定值（插画 margin-bottom --sp-8 已在 .lock-screen__illustration
     声明，.lock-screen__action 的 margin-top 由 --sp-8 提到 --sp-9），视口余量集中交给
     .lock-screen__footer 那一处吸收——body 是 flex:1 的内容区、footer 是它的兄弟节点，
     body 贴顶铺开后余量只剩「action 之下」这一条带，不再两处分摊。
     内容超长时 flex-start 与 space-between 行为一致（首组仍贴顶），由 overflow-y:auto 滚，
     不裁切。5 个宿主（village / heart-signals / likes-visitors / messages / 官方号）
     共用本组件，同批同治。 */
  justify-content: flex-start;
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + var(--sp-8)) var(--sp-8) var(--sp-9);
}

/* ========== 主题插画：锁形主视觉 + 漂浮爱心 ========== */
.lock-screen__illustration {
  position: relative;
  width: 440rpx;
  /* R15-L08-D05（间距 P2 · heart-signals top 帧）：原定高 400rpx(200px)，而环只有 280rpx
     且 top:30rpx ⇒ 环底缘距容器底缘余 400−30−280 = 90rpx(45px) 的空尾，
     再加 --sp-8(16px) 的 margin-bottom，帧上环底 y=214 → 主标题墨迹 y=281 净空 67px，
     声明的 --sp-8 被放大 4 倍。按卡上第一条把容器高收到 30 + 280 = 310rpx：
     环底缘与容器底缘重合，环下净空回到 --sp-8 一档（16px + 标题行盒上缘 ~6px）。
     漂浮爱心挂在 top:0 / top:60rpx，全部在 310rpx 以内，收高不裁切任何一个子节点。 */
  height: 310rpx;
  margin-bottom: var(--sp-8);
}

/* 解锁徽章圆环（品牌渐变，承载锁图标；R14-L02-D05 起环底不再有 ✓ 徽章） */
.illustration__ring {
  position: absolute;
  top: 30rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 280rpx;
  height: 280rpx;
  border-radius: var(--r-circle);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.illustration__lock {
  width: 120rpx;
  height: 120rpx;
}

/* R14-L02-D05（文案 P3 · village top 帧）：环底那枚「白圆 + 绿 ✓」徽章整枚撤除
   （模板节点 + checkIconSrc 出口 + 本节样式一起删，处置注与理由见 script 中
   lockIconSrc 下方的 R14-L02-D05 注），
   因此以下三段历史裁量记录所描述的规则已不存在，只留结论备查，不再各挂一份死样式：
   · R6-L08-D12：`border: 6rpx solid var(--c-gradient-brand)` 是非法声明（<background-image>
     值当 border-color 用 ⇒ 整条 border 不生效），当年改成 var(--c-brand) 纯色；
   · R8-L02-D19 / R8-L08-D04：徽章原挂环右下会与「同校头像」交叠压人像，故挪到环底居中
     （头像本身已在 R13-L02-D06 撤掉，这条碰撞随之失效）；
   · R9-L08-D04：白圆内的 ✓ 描线色 #36C99A 压白只有 2.10:1，曾用 brightness(0.53) 压到
     ≈#1D6B52（6.41:1）——本轮节点撤了，该 filter 一并删，不留惰性声明。
   盘上素材 register/check-green.svg 未动（他处仍在消费）。 */

/* 漂浮爱心点缀 */
.illustration__heart {
  position: absolute;
  width: 52rpx;
  height: 52rpx;

  &--1 {
    top: 0;
    left: 60rpx;
    animation: float var(--d-loop-slow, 2000ms) ease-in-out infinite;
  }

  &--2 {
    top: 60rpx;
    right: 36rpx;
    width: 40rpx;
    height: 40rpx;
    animation: float var(--d-loop, 1500ms) ease-in-out infinite;
  }
}

.illustration__heart-img {
  width: 100%;
  height: 100%;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-16rpx) scale(1.1);
  }
}

/* ========== 核心文案 + 权益清单 ========== */
.lock-screen__content {
  width: 100%;
  max-width: 560rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
}

.lock-screen__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
  text-align: center;
  line-height: 1.4;
}

.lock-screen__subtitle {
  font-size: var(--fs-lg);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.5;
  /* R15-L02-D14（尺寸比例 P3 · village top 帧）：副标题在 :643 的 560rpx 内容列里折两行，
     且断点落在词中间——实测容器 560rpx(280px) / 字宽 --fs-lg 28rpx(14px) = 20 字，
     默认句（zh-CN.ts:2906「完成基础资料填写，即可开启匹配、聊天、校园活动等全部功能」共 28 字）
     断在第 20/21 字之间，把「校园」拆成「校」「园活动…」，次行只剩 8 字。
     ⚠️ 卡上写的「校园圈」是 R14 之前的旧文案；现行值是「校园活动」（28 字、无「圈」），
     故卡上建议的 620rpx 在这里不成立：620rpx(310px)/14px = 22.14 字 ⇒ 断在第 22/23 字之间，
     把「活动」拆开（校园活 | 动等全部功能），比现状更糟。
     按卡上第二条口径「按语义手动断成两行、首行≈次行」落到盒宽上：取 550rpx(275px)
     = 19.6 字 ⇒ 断在第 19/20 字之间，正好落在顿号后（…聊天、| 校园活动等全部功能），
     两个词都完整、次行 9 字(126px) 是首行 19 字(266px) 的 47%（原 8/20=40%）。
     取 550rpx 而不是 546rpx(=19.5 字) 是为了留 5px 余量，避开断点正落在字宽整数倍上的边界。
     内容列的 560rpx 不动：标题/权益两行本来不折，改列宽只会动它们的左对齐起点。 */
  max-width: 550rpx;
}

/* R9-L02-D21（可达性 P1 · village）+ R9-L08-D03（可达性 P2 · heart-signals）同一条：
   「当前完善度 N%」原取 var(--c-brand) #36C99A（design-variables.scss:15），L=0.44896，
   压 --c-gradient-page（:181，#DFF3EA→#EEF7F2）：
     底中段 #E8F5EE L=0.88632 ⇒ 0.93632/0.49896 = 1.88:1（下段 #EEF7F2 也只有 1.93:1）
   --fs-base 24rpx 不享大字号豁免 ⇒ 差 4.5:1 两倍多；本行还是画面里唯一的完善度数值。
   缺陷卡给的两条实算：--c-brand-800 #156B51 L=0.11271 ⇒ 5.75:1（下段 5.91:1）够；
   --c-text-secondary #4A524E L=0.08037 ⇒ 7.18:1（下段 7.37:1）更高，
   且同组件 :837 .lock-screen__footer-text 已在 R8-L08-D05 升到这一档 —— 取它能消掉
   「同一组件两档结论」的残留，故选它。
   （R10-L02-D12 之后 .lock-screen__btn-link-text 改吃 --c-brand-800（:800-804），
     那是「像不像可点」轴要的链接色，与本行的「唯一数值读数」轴不冲突，两档都 ≥4.5:1。） */
.lock-screen__progress {
  /* R15-L08-D06（字号 P2 · heart-signals top 帧）：「当前完整度 30%」是整屏唯一的进度读数，
     却吃 --fs-base(24rpx=12px)，帧上墨迹仅 10px 高，比同屏权益正文（--fs-xl 15px）低一档，
     还紧贴在 16rpx(8px) 的进度条上方。按卡上第二条升到 --fs-xl(30rpx=15px) 并加 600 字重：
     字号与 .benefit__text 同档、与它承载的数值同权重；行盒 12→15px 使该行 +4px，
     全部被 body 的余量吸收（action 已由 R15-L08-D07 贴底，不再往下推内容）。
     取色不动：--c-text-secondary #4A524E 压页面底 #EEF7F2 实算 7.37:1（≥正文 4.5:1），
     加粗只增不减。 */
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-secondary);
  text-align: center;
}

/* R14-L08-D02（需新建 P2 · heart-signals bottom 帧）：完善度此前只有一行 12px 文字
   （帧上实测墨迹 y=469..480），整屏没有任何可视进度形态 ⇒ 30% 离解锁还差多少读不出来。
   按卡上口径补条状档（不引圆形：卡上点名「同域我的页已用条状档」，且本组件上一轮刚撤掉
   环底 ✓ 徽章，再往环上挂进度只会与主视觉打架）。
   形制复用仓内既有同型件 subpackages/profile-extra/profile/tasks.vue:599-610
   （height 16rpx + --r-full + overflow:hidden + transition width），不自创尺寸档；
   宽度由 progressBarStyle 按 completionPercent 真值内联，槽右端 = 100% = 资料完整。
   取色（本卡建议的 --c-brand 填充 + --c-brand-100 槽按 §2 算法不达标，已实算否掉）：
     填充 --c-brand #36C99A 压槽 --c-brand-100 #D1F5E7 = 1.80:1、压页面底 #E7F5EE（--c-gradient-page
       :181 在 y≈470 处的插值）= 1.93:1 —— 都低于非文本图形 3:1 下限，进度条等于糊在底上；
     填充改同族深档 --c-brand-800 #156B51（design-variables.scss:18）压槽 --c-brand-100 = 5.51:1，
       但与页面底仅 1.04:1 的槽几乎看不见，「还差多少」的那半条没落点；
     终值：槽 = --c-brand-200 #A3EBCF（品牌梯内，压页面底 1.22:1，帧上每通道差 20~40 的实色带，
       可辨且不与氛围层抢），填充 = --c-brand-800 #156B51（压槽 4.72:1、压页面底 5.75:1，
       ≥非文本 3:1；与本文件 .lock-screen__btn 主 CTA 同档，选中/主操作与进度同源一把尺）。 */
.lock-screen__progress-bar {
  align-self: stretch;
  height: 16rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand-200, #A3EBCF);
  overflow: hidden;
  /* R15-L08-D08（颜色token P2 · heart-signals top 帧）：槽底 --c-brand-200 #A3EBCF 压在页面底
     #D5ECE3 上实算 1.10:1（<3:1），「还差 70%」那 192px 槽段在帧上几乎看不出边界——
     填充段本身是达标的（#156B51 压槽 4.72:1），坏的是槽与页底的边界。
     按卡上口径加 2rpx solid --c-brand-700 #1F8D6A 描边：边 vs 页底 #D5ECE3 实算 3.34:1、
     边 vs 槽 #A3EBCF 3.02:1（两侧都 ≥ 非文本 3:1），槽右端=100% 的终点由这圈线给出。
     配 box-sizing: border-box：条的总高仍是 16rpx(8px)，描边向内收，
     不让 2rpx 描边把整条撑高 4rpx 并推动下方文案（帧上只该多一圈线，不该整体位移）；
     槽底与填充色都不动（槽底仍只作填充背景）。 */
  border: 2rpx solid var(--c-brand-700, #1F8D6A);
  box-sizing: border-box;
}

.lock-screen__progress-fill {
  height: 100%;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand-800, #156B51);
  transition: width var(--d-normal, 200ms) ease;
}

/* 权益清单：左对齐，锁形图标 + 文案（R13-L02-D05：✓ → 锁，语义见 script 注） */
.lock-screen__benefits {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-top: var(--sp-6);
  /* R15-L08-D07 兜底：action 的 margin-top:auto 在内容溢出时解析为 0，
     这一枚保证「权益清单 → 主按钮」永远至少 --sp-9(24px)，不与按钮贴死。 */
  margin-bottom: var(--sp-9);
}

.benefit {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.benefit__icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.benefit__text {
  /* R11-L08-D08（字号 P2 · heart-signals top 帧）：这三条权益清单是本屏唯一的
     「解锁后能拿到什么」正文，原取 --fs-md（真值 26rpx=13.5px，design-variables.scss:563），
     帧上三行墨迹带高仅 12-13px（y=441..453 / 464..476 / 488..499），落在 §1.3 只分配给
     「标签·时间戳」的档，比同屏主标题（--fs-3xl）低两级，与它的层级不匹配。
     按卡上改法升 --fs-xl（30rpx=15px，§1.3 正文档）并显式写 1.5 行距（卡上口径）：
     行盒 26→45rpx，三行合计约 +57rpx，全部落进 .lock-screen__body 那条本来无主的底部空带（见 R11-L08-D10），
     不产生溢出/遮挡。颜色不动 —— --c-text-secondary #4A524E 压页面底 #EEF7F2 本就 7.37:1
     （R6-L08-D13 / R8-L08-D05 已裁），升字号只会更好读。 */
  font-size: var(--fs-xl);
  line-height: 1.5;
  color: var(--c-text-secondary);
}

/* ========== 操作按钮区：主按钮 + 备选路径 ========== */
.lock-screen__action {
  width: 100%;
  max-width: 560rpx;
  /* R14-L08-D01：原 --sp-8(32rpx=16px) 在 space-between 下被余量顶成帧上 94px 的浮动带；
     body 改贴顶后这里才是真正生效的定值，按卡上口径提到 --sp-9(48rpx=24px)
     ——权益清单与主按钮之间的呼吸位由这一枚令牌单独决定，不再随屏高漂移。
     R15-L08-D07（间距 P2 · heart-signals top 帧）：R14 把 body 收到 flex-start 后，
     视口余量全部沉到 action 之下——帧上「先去逛逛匹配推荐」墨迹止 y=561、页脚提示起 y=732，
     中间 171px(342rpx) 无内容空带（R11 实测 131px，本轮反而涨了）。
     按卡上第一条让 body 自己吸收余量：action 用 margin-top:auto 贴到 body 内容盒底缘，
     余量上移到「权益清单 → 主按钮」这一段（CTA 下沉到拇指区，是这一屏该有的构图），
     action 之下只剩 body 的 --sp-9 下内距 + 页脚自己的 --sp-4 上内距。
     实算（1rpx=0.5px，同帧）：盒间距 = body 下内距 48rpx(24px) + 页脚上内距 16rpx(8px) = 32px，
     再扣掉 link 自身下内距 24rpx(12px) 与两侧行盒留白 ⇒ 墨迹净空 ≈ 24~25px ≈ --sp-9 一档。
     溢出（内容高于 body）时 auto 解析为 0，最小呼吸位由 .lock-screen__benefits 的
     margin-bottom:--sp-9 兜住，不会把按钮摁到权益行上。 */
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
}

/* R8-L07-D03（可达性 P1 · likes-visitors，village / heart-signals / messages / 官方号同源）：
   主出口「立即登录并完善」白字压 --c-gradient-brand（= linear-gradient(135deg,#36C99A,#55D5A7)，
   design-variables.scss:171）。钮面 280×47px 众数实测 #45CFA0（另见 #49D0A2/#4BD1A3 渐变段），
   白字对其只有 1.97:1；文字实测 15.3px/字 ≈ 30rpx（声明 --fs-2xl=32rpx=16.1px），
   bold 16px 不享 WCAG 大字号（≥18.66px bold）豁免 ⇒ 4.5:1 门槛差 2.5 倍。
   同一缺陷 R6 只修了 daily-question 页内那颗 CTA，LockScreen 这颗仍走渐变。
   渐变终点侧的 brand-600(#2AAE83)=2.81:1、brand-700(#1F8D6A)=4.14:1 都够不到 4.5:1，
   故取同族深档 --c-brand-800(#156B51) 纯色 ⇒ 白字 6.45:1，与 §1.2 色板同族、与
   daily-question/index.vue:484 的「深档承载白字」结论同向（该页取 brand-600，实测仍不达标，
   已在报告登记给对应页面车道）。 */
.lock-screen__btn {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-full);
  background: var(--c-brand-800);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-brand-lg);
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.lock-screen__btn:active {
  transform: scale(0.98);
}

.lock-screen__btn-text {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--c-neutral-0);
}

/* 次按钮：文字链接（先逛逛公开内容） */
/* R10-L02-D12（可达性 P2 · village bottom）+ R10-L08-D07（P2 · heart-signals bottom）同根因：
   游客唯一的公开内容出口可点体太小——village 帧点击盒只有 44rpx(22px) 高
   （padding var(--sp-2)=4px 上下 + 26rpx 文本行），heart-signals 帧实测墨迹 x=147–232、
   y=590–601（86×12px）⇒ 热区约 170×32rpx，不到 88rpx(44px) 下限的一半，
   而同帧主 CTA 钮高实测 46px(91rpx) 达标，两者差近 3 倍。
   按两张卡的改法合并落地：纵向 padding 由 --sp-2 提到 --sp-6（4rpx→24rpx），
   补 min-height:88rpx + display:flex 居中（卡名口径 = 与 .empty-action 的 88rpx 同一把尺），
   横向 padding 由 --sp-6 提到 --sp-8，并给本体 align-self:stretch ——
   父级 .lock-screen__action 的 align-items:center 会把本体收成文字宽（帧上热区只有 86px），
   拉满后热区宽 = 该列的 560rpx，文字仍由 justify-content:center 居中、位置随高度自然下沉
   ≈6px ⇒ 帧上可核。 */
.lock-screen__btn-link {
  align-self: stretch;
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-6) var(--sp-8);
  box-sizing: border-box;
  transition: opacity var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.lock-screen__btn-link:active {
  opacity: 0.6;
}

/* R6-L08-D13（可达性 P2）把本行从 --c-text-tertiary（帧内 #808D88 压 --c-bg-page #EEF7F2
   只有 2.87:1）升到 --c-text-secondary #4A524E（7.37:1），读得出，但 R10-L02-D12 判的是
   「像不像可点」那一半：升到 --c-text-secondary 后它与 .lock-screen__subtitle /
   .benefit__text 逐字同色同档，游客唯一的非登录出口在画面上和普通正文没有任何区别。
   R10-L02-D12 给的三条（下划线 / 箭头 / 品牌深色）取前两条里的「品牌深色 + 下划线」：
   --c-brand-800 #156B51（design-variables.scss:18）压页面底 #EEF7F2 实测
   L=0.112709 vs 0.911098 ⇒ 5.91:1，仍 ≥4.5:1，不重开 R6 那一条；
   下划线补出链接形态。不加箭头/图标：本车道不许新增素材，行内 <image> 会改写这一行的
   布局并把热区高度重新拉回文本行高。 */
.lock-screen__btn-link-text {
  font-size: var(--fs-md);
  color: var(--c-brand-800);
  text-decoration: underline;
}

/* ========== 底部补充提示 ========== */
/* R8-L02-D21（间距 P2 · village）：下边距原写 calc(env(safe-area-inset-bottom) + var(--sp-6))，
   而本项目 env() 在拍摄环境恒为 0（该事实已在 pages/messages/index.vue:64 记录并改用 JS 注入）
   ⇒ 实际只剩 --sp-6 = 24rpx = 12px，帧上该行文字底缘 y≈772、Home Indicator 顶缘 y≈786，
   净空仅 14px≈28rpx，文字几乎坐在系统手势条上（要求 ≥68rpx）。
   改读注入变量 --safe-bottom（无注入时回落 env()），并给一个不依赖 env 的静态下限 72rpx：
   0 + 72rpx = 36px ⇒ 净空 ≈38px ≥ 68rpx 门槛；真机有安全区时 env 再叠加，不会被削减。
   72rpx 无对应 sp 档（阶梯 4/8/12/16/20/24/32/48rpx），属固定安全区尺寸，按本文件既有口径保留字面量。 */
.lock-screen__footer {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding: var(--sp-4) var(--sp-8)
    calc(var(--safe-bottom, env(safe-area-inset-bottom)) + 72rpx); // token-audit:ignore 宿主注入契约（R8-L02-D21），无宿主注入时按 env() 取值
}

/* Tab 页宿主：底部为固定 TabBar 预留空间，避免提示被遮挡 */
.lock-screen__footer--tab {
  padding-bottom: calc(env(safe-area-inset-bottom) + 112rpx);
}

/* R8-L08-D05（可达性 P2 · heart-signals bottom）：本行原取 --c-text-tertiary。
   帧上实测墨迹 x=85..293（208px）/18 字 = 11.6px/字 ≈ 24rpx（对应 --fs-base），
   字形最暗 #76807B 压页面底 #EEF7F2 只有 3.74:1，连令牌名义值 #6B7571 也只有 4.36:1，
   两档都够不到 4.5:1。同一次 R6-L08-D13 修复已把 18 行之上的 .lock-screen__btn-link-text
   升到 --c-text-secondary（:686 注释自证「实测 #808D88 → 2.87:1 ⇒ 改 7.37:1」），
   但没带上这句 .lock-screen__footer-text ⇒ 同组件同一档文案两种结论。
   按缺陷卡给的取一：升色不升字号（升 --fs-md 会把这行提示撑大、改变底部构图），
   与 .lock-screen__subtitle / .benefit__text / .lock-screen__btn-link-text 同档 #4A524E，
   压 #EEF7F2 实测 7.37:1 ≥ 4.5:1。 */
.lock-screen__footer-text {
  font-size: var(--fs-base);
  color: var(--c-text-secondary, #4A524E);
}
</style>
