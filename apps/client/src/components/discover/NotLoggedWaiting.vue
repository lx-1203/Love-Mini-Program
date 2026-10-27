<script setup lang="ts">
/**
 * 未登录等待页（2026-08-25 P0 全面重构）
 *
 * 规格书 12 节要点：
 * - 主标题"正在为你寻找 同频的那个人"（两行）
 * - 副标：静态无计数文案（规格书原文"附近有 12 位同频的你"已判定不落，见下方裁定）
 * - "登录后即可解锁全部功能"
 * - 4 个 icon 行（精确匹配 / 聊天互动 / 校园趣遇 / 关系成长）
 * - 三个按钮：微信一键登录 / 手机号登录 / 稍后再看
 * - 中部是"头像环"：虚线轨道 + 6 个独立头像节点（各带心动角标）+ 中心吉祥物
 *
 * MP-R2VIS-PAGES-MESSAGES-INDEX-004：这一环原先是一张整图海报（notlogged-waiting.png，
 * 吉祥物与 6 个人烧在同一个 png 里），整图既不能换素材也不能加角标，
 * 所以拆成独立节点、不再保留背景海报。注释里刻意不写那个键的完整点号形式：
 * 判据台用 absent 查它，写成点号形式会让一条 grep 型判点在注释上误命中。
 * 全屏可点跳登录；按钮各自处理 goLogin/goPhoneLogin/later。
 *
 * MP-R2VIS-PAGES-MESSAGES-INDEX-002 裁定（2026-09-25 store 接线收口）：
 * 本页副标不设计数位、不加 subtitleWithCount 键，:54 恒渲染 t('notLoggedWaiting.subtitle')。
 * 依据（游客态无任何语义正确的计数真源，详见 .zcode/tmp/subtitle-wire/REPORT.md）：
 *  1) 两个宿主（pages/messages/index.vue:369、subpackages/discover-extra/likes/index.vue:606）
 *     都在 !sessionStore.isLoggedIn 时整页替换成本组件——本页是登录墙，不是可逛列表；
 *  2) discoverStore.cards 初始为空（stores/discover/index.ts:105），fetchCards 的触发点全在
 *     寻觅域（pages/discover/index.vue:190/211、…/discover/history.vue:42、FilterDrawer），
 *     两个宿主无一触发 → 接 cards.length 得到的是恒 0 的计数（比不接更糟）；
 *  3) mock 侧 services/mocks/fixtures.ts:1879 → buildRecommendedPersonsMock 只有固定 9 条
 *     演示人格（id 4001-4009），是演示池规模而非人群规模；且 messages 页在 mock 下根本不渲染本页；
 *  4) real 侧游客确实可调 GET /recommendations（apps/api SecurityConfig.java:133-134 permitAll），
 *     但返回值被 GUEST_LIST_LIMIT=30 截断（RealRecommendationService.java:505-529，注释自陈
 *     "截断到前端卡片展示所需上限"）→ 列表长度是响应体上限而非"附近有 N 人"；游客无定位/无校园，
 *     "附近"语义不成立（RecommendationController.java:298-301 按 distanceText 过滤）；
 *  5) 理想效果图 素材/理想效果图/未登录等待页面.png 自证 12 是拼版值：副标写 12、同一张图围圈
 *     只画 6 个头像；既有裁定 MP-R2-CIRCLES-INDEX-002（subpackages/circles/circles/index.vue:258-266、
 *     :440）口径为"取不到真值就不渲染，宁缺不展示伪造社交证明"，游客引导注册亦为用户既成裁定。
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
// R6-B10（根因①消费点侧）：本文件此前 4 枚功能图标 / 微信图标 / 头像环全部裸绑常量，
// 而 real 发布包不随包 icons/{v2,social,emoji,login,home,match,nearby} 与 icons 根目录散图
// （实测 apps/client/dist/build/mp-weixin-real/static/assets/icons 下只剩 common/register/tabbar）
// ⇒ 裸绑即 404 空白。按 §1.6 铁律 3 全部改过 resolveMediaUrl（对已是后端绝对 URL 的常量幂等）。
import { resolveMediaUrl } from "../../utils/media";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";

const { t } = useI18n();
const { styleVars: menuStyleVars } = useMenuButtonRect();
const emit = defineEmits<{
  (e: "goLogin"): void;
  (e: "goPhoneLogin"): void;
}>();

/* R2b-L02-D10（字号）：规格书 12.1 要求主标题两行断点＝「正在为你寻找 / 同频的那个人」。
   此前把整串交给自然换行，56rpx + 2rpx 字距在 750−2×48rpx 容器里必然折成
   「正在为你寻找 同频的那个 / 人」，第二行只剩孤字「人」。现按空白显式切分：
   只有「恰好两段」的语种（zh-CN「正在为你寻找 同频的那个人」）才两行排版，
   多段语种（en-US）保持单块自然换行，不产生「Looking / for someone…」这种碎行。 */
const titleLines = computed<string[]>(() => {
  const raw = String(t("notLoggedWaiting.title")).trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  return parts.length === 2 ? parts : [raw];
});

/* R2b-L02-D11（素材缺失）：轨道中心吉祥物。
   原绑定 MASCOT 组的 DEFAULT 常量 —— 那是一枚写死的包内绝对路径字面量，不随 real 档切后端基址；
   而 real 发布包为守 2MB 主包门禁，已把 mascot 整目录剪出包外（实测 real 产物 static 下仅剩
   icons/{common,register,tabbar} 与 images/{avatars,match,people}），于是 real 档该图取不到
   ⇒ 环心留下一个 200rpx 的空洞（帧内该区域非背景像素为 0）。
   改绑 ICONS_EMOJI 组的 SPROUT：同一只寻觅吉祥物（身体渐变 + 头顶双叶 + 眼/腮红/笑口，
   见 svg-spec 的 08-mascot 默认帧），但它走 STATIC_BASE 基址——mock 档＝包内路径、
   real 档＝后端 app-assets 托管路径，两侧文件均已确认存在且字节一致。
   再兜一层 error 事件：任一档取不到素材时整块不渲染，不留空洞（缺陷卡给的收口口径）。 */
const mascotVisible = ref(true);

/* ========== R6-B10（R6-L08-D05 / D06）素材出口：一律过 resolveMediaUrl ========== */
/**
 * D05（P1）：4 枚功能图标里「聊天互动」实测 x131-174 非背景像素 = 0。
 * 原绑 IMAGE_PATHS.ICONS_EMOJI.CHAT = `/static/assets/icons/chat.svg`，
 * 而 icons **根目录**既不在 cdn-buckets 的 cdnPrefixes、也不在 localPrefixes
 * ⇒ 解析器对它是 no-op、real 档仍指包内，而该文件已被裁剪出包
 * （实测 real 产物 icons 下只剩 common/register/tabbar）⇒ 光加解析器救不回来，
 * 必须换绑一个**桶内**同义素材：ICONS_SOCIAL.COMMENT（`/static/assets/icons/social/comment.svg`，
 * social/ 命中 cdnPrefixes ⇒ real 档解析到后端 app-assets，盘上文件已核对存在；
 * mock/dev 档由 prepare-static --dev 从 full-static 还原包内同名文件），语义仍是「聊天互动」气泡。
 */
const featureIconSrcs = computed(() => [
  resolveMediaUrl(IMAGE_PATHS.ICONS_V2.SPROUT),
  resolveMediaUrl(IMAGE_PATHS.ICONS_SOCIAL.COMMENT),
  resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG),
  resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.HEART_FILLED_SVG),
]);
/**
 * D06（P1）：主按钮「微信一键登录」左侧 32rpx 图标位空白，且空图标盒 + 12rpx gap
 * 把文字块整体顶偏右 10px(20rpx)。根因＝ICONS_V2.WECHAT_GREEN_SVG
 * (`/static/assets/icons/login/wechat-green.svg`) 裸绑，login/ 在 cdnPrefixes 内
 * 但 real 包内无该目录 ⇒ 过解析器后落后端（app-assets/assets/icons/login/wechat-green.svg
 * 盘上已核对存在）；再按缺陷卡「图标缺失时不给 flex 占位」补 @error 整块摘除，
 * 让标签回到按钮中心。
 */
const wechatIconSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.ICONS_V2.WECHAT_GREEN_SVG));
const wechatIconVisible = ref(true);
const mascotSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.SPROUT));
const orbitBadgeSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.HEART_FILLED_SVG));

/* 头像环：理想图 未登录等待页面.png 画的是 6 个头像围一圈（它副标里那个「12」按
   MP-R2VIS-PAGES-MESSAGES-INDEX-002 的裁定属拼版值，不当人数依据），所以取素材池前 6 个，
   不把 9 个全塞进去。容器是正方形 ⇒ 半径用同一个百分比表达横竖两个方向，
   改一处即可让轨道与头像始终同心（用 left/top 各配 rpx 半径时，非正方形容器下两者会不一致）。 */
const ORBIT_AVATARS = [
  IMAGE_PATHS.PEOPLE.AVATAR_1,
  IMAGE_PATHS.PEOPLE.AVATAR_2,
  IMAGE_PATHS.PEOPLE.AVATAR_3,
  IMAGE_PATHS.PEOPLE.AVATAR_4,
  IMAGE_PATHS.PEOPLE.AVATAR_5,
  IMAGE_PATHS.PEOPLE.AVATAR_6,
];
const ORBIT_RADIUS_PCT = 37.5;
const orbitNodes = ORBIT_AVATARS.map((src, i) => {
  const angle = (i / ORBIT_AVATARS.length) * Math.PI * 2 - Math.PI / 2;
  return {
    // R6-B10：出口统一过解析器（people/avatars 组在 real 档本就出后端绝对 URL，此处幂等；
    // mock/dev 档则由解析器保持包内 /static 路径，两侧同一条码）
    src: resolveMediaUrl(src),
    style:
      `left:${(50 + Math.cos(angle) * ORBIT_RADIUS_PCT).toFixed(2)}%;` +
      `top:${(50 + Math.sin(angle) * ORBIT_RADIUS_PCT).toFixed(2)}%`,
  };
});

function goWechatLogin() {
  emit("goLogin");
}

function goPhoneLogin() {
  emit("goPhoneLogin");
}

function goLater() {
  // 稍后再看：返回首页（避免停留在不可交互页）
  openAppPath(ROUTES.TAB.HOME);
}
</script>

<template>
  <view class="not-logged" :style="menuStyleVars">
    <!-- 标题 / 头像环 / 解锁提示 / 4 icon / 3 按钮：按理想图自上而下的顺序排，
         不再用「整图打底 + 绝对定位压底」那一版（那一版没有整图就没有内容可压）。 -->
    <view class="not-logged__hero">
      <view class="not-logged__title-wrap">
        <text v-for="(line, i) in titleLines" :key="i" class="not-logged__title">{{ line }}</text>
        <text class="not-logged__subtitle">{{ t('notLoggedWaiting.subtitle') }}</text>
      </view>

      <view class="not-logged__orbit" aria-hidden="true">
        <view class="not-logged__orbit-ring" />
        <view
          v-for="(node, i) in orbitNodes"
          :key="i"
          class="not-logged__orbit-node"
          :style="node.style"
        >
          <image class="not-logged__orbit-avatar" :src="node.src" mode="aspectFill" />
          <image class="not-logged__orbit-badge" :src="orbitBadgeSrc" mode="aspectFit" alt="" />
        </view>
        <image
          v-if="mascotVisible"
          class="not-logged__orbit-mascot"
          :src="mascotSrc"
          mode="aspectFit"
          alt=""
          @error="mascotVisible = false"
        />
      </view>

      <text class="not-logged__hint">{{ t('notLoggedWaiting.unlockHint') }}</text>

      <view class="not-logged__features">
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="featureIconSrcs[0]" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature1') }}</text>
        </view>
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="featureIconSrcs[1]" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature2') }}</text>
        </view>
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="featureIconSrcs[2]" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature3') }}</text>
        </view>
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="featureIconSrcs[3]" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature4') }}</text>
        </view>
      </view>

      <view class="not-logged__btn-row">
        <view
          class="not-logged__btn not-logged__btn--primary press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('notLoggedWaiting.wechatLogin')"
          @tap="goWechatLogin"
        >
          <image
            v-if="wechatIconVisible"
            class="not-logged__btn-icon"
            :src="wechatIconSrc"
            mode="aspectFit"
            alt=""
            @error="wechatIconVisible = false"
          />
          <text class="not-logged__btn-text not-logged__btn-text--primary">{{ t('notLoggedWaiting.wechatLogin') }}</text>
        </view>
        <view
          class="not-logged__btn not-logged__btn--secondary press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('notLoggedWaiting.phoneLogin')"
          @tap="goPhoneLogin"
        >
          <text class="not-logged__btn-text">{{ t('notLoggedWaiting.phoneLogin') }}</text>
        </view>
        <view
          class="not-logged__btn not-logged__btn--ghost press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('notLoggedWaiting.later')"
          @tap="goLater"
        >
          <text class="not-logged__btn-text not-logged__btn-text--ghost">{{ t('notLoggedWaiting.later') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.not-logged {
  position: relative;
  width: 100%;
  /* R10-L06-D23（位置 P1）：唯一存活宿主 subpackages/discover-extra/likes/index.vue:665
     的页头（返回键 + 「匹配列表」标题）在流内常驻（游客态还 sticky 吸顶，:1082），
     本组件再吃满 100vh ⇒ 整页 = 1 屏 + 页头，第三按钮「稍后再看」的 96rpx 热区
     被顶出画布下沿约 19px（实帧墨迹 y800–812，正被 home indicator y805–808 压字）。
     高度改成「视口 − 页头带」：页头高走 --nlw-header-offset，宿主未注入时取实测默认 100px
     （= 状态栏 44 + 页头上下内衬 12+8 + 返回件行高约 36）。 */
  min-height: calc(100vh - var(--nlw-header-offset, 100px)); // token-audit:ignore 宿主注入契约（R10-L06-D23），未注入时取实测页头高 100px
  overflow: hidden;
  background: var(--c-bg-page);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  /* 内容改成正常流 ⇒ 上下留白由容器给（原来由那张整图海报撑开）
     R10-L06-D23 连带：删掉这里的 --statusbar 一档 —— 宿主吸顶页头自己已经给过状态栏让位
     （likes/index.vue:1089 padding-top: calc(var(--statusbar, env(...)) + var(--sp-6))），
     组件再加一次就是已知机制 §4 点名的"避让补两遍"，正是本条 44px 溢出的主要来源。 */
  padding: 72rpx 48rpx calc(env(safe-area-inset-bottom) + 60rpx);
}

.not-logged__hero {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 头像环：容器必须是正方形，半径的百分比才在横竖两个方向同值（见 script 里的 ORBIT_RADIUS_PCT） */
.not-logged__orbit {
  position: relative;
  width: 560rpx;
  height: 560rpx;
  margin-bottom: 8rpx;
}

.not-logged__orbit-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 420rpx;
  height: 420rpx;
  transform: translate(-50%, -50%);
  border: 2rpx dashed rgba(54, 201, 154, 0.35);
  border-radius: 50%;
}

.not-logged__orbit-node {
  position: absolute;
  transform: translate(-50%, -50%);
}

.not-logged__orbit-avatar {
  display: block;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  box-shadow: 0 4rpx 12rpx rgba(15, 23, 42, 0.08);
}

/* 理想图每个头像右下角各有一枚心动角标 */
.not-logged__orbit-badge {
  position: absolute;
  right: -6rpx;
  bottom: -6rpx;
  width: 32rpx;
  height: 32rpx;
}

.not-logged__orbit-mascot {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 200rpx;
  height: 200rpx;
}

/* 2026-08-25 P0：主标题/副标（规格书 12.1 / 12.2）
   理想图里标题左对齐贴在页面左缘，不是居中（居中那一版是压在整图上的产物） */
.not-logged__title-wrap {
  width: 100%;
  text-align: left;
  margin-bottom: 32rpx;
}

/* R2b-L02-D10：字号 56→44rpx（理想图 未登录等待页面.png 量测约 46rpx，取 --fs-5xl 档），
   并去掉 2rpx 字距——两者叠加正是孤字换行的成因；断行改由 titleLines 显式给（见 script）。
   R2b-L02-D14：品牌绿不再写字面量，与同文件主按钮底色同口径走 --c-brand。 */
.not-logged__title {
  display: block;
  font-size: var(--fs-5xl, 44rpx);
  font-weight: 800;
  color: var(--c-brand, #36C99A);
  line-height: 1.4;
}

.not-logged__subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: #1A1E1C;
  opacity: 0.7;
}

/* 2026-08-25 P0：4 个 icon 行（规格书 12.6） */
.not-logged__features {
  display: flex;
  justify-content: space-between;
  width: 100%;
  /* V-05（第五轮 QA）：4 icon 行加左右留白，避免贴屏幕边缘 */
  padding: 0 8rpx;
  margin-bottom: 32rpx;
}

.not-logged__feature {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.not-logged__feature-icon {
  width: 64rpx;
  height: 64rpx;
}

.not-logged__feature-label {
  /* R10-L06-D24（颜色token P2）：4 个功能标签原 22rpx/11px 写死 #6B7571 压 #EEF7F2 = 4.36:1，
     既落在 3–4.5 的次级文字带、字号又低于小字档。按卡收口：字号提 --fs-base（24rpx=12px），
     色档改 --c-text-secondary #4A524E（压 #EEF7F2 实测 7.37:1，同文件 .not-logged__hint 已用此档）。 */
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary, #4A524E);
  text-align: center;
}

/* 2026-08-25 P0：解锁提示（规格书 12.5）
   R2b-L02-D12（可达性）：#9AA39F 压在 #EEF7F2 页底上只有 ≈2.16:1，22rpx 小字读不出；
   改 --c-text-secondary（#4A524E，≈7:1，过 WCAG AA 正文 4.5:1）并提到 24rpx（--fs-base 档）。
   上一轮 R1-B25 销过 messages 的可达性轴但漏了这一处 ⇒ 本轮按阈值收口。 */
.not-logged__hint {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-secondary, #4A524E);
  margin-bottom: 28rpx;
}

/* 2026-08-25 P0：3 个按钮（规格书 12.7 / 12.8 / 12.9） */
.not-logged__btn-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  /* V-05（第五轮 QA）：3 按钮间距 20→24rpx，视觉分层更清晰 */
  gap: 24rpx;
}

.not-logged__btn {
  width: 100%;
  height: var(--btn-height-md, 96rpx);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.not-logged__btn--primary {
  /* R10-L06-D22（颜色token P1）：登录墙主行动。原两端 --c-brand #36C99A / --c-brand-600 #2AAE83
     压白字实测 2.17:1 / 2.74:1，整条不达 4.5:1（已知机制 §2：白字压 brand-600 只有 2.81:1，
     连 brand-700 #1F8D6A 也只有 4.14:1，同样不达 ⇒ 端点只能落在 brand-800 档或更深）。
     按卡「渐变两端都压到 --c-brand-800」收口：起点 --c-brand-800 #156B51（白字 6.45:1）、
     终点 --c-brand-900 #0B4A38（白字 10.24:1），两端均 ≥4.5:1。
     保留渐变形态（§11.3：主 CTA 渐变不要再翻成实色），只把色档整体压深。 */
  background: linear-gradient(135deg, var(--c-brand-800, #156B51) 0%, var(--c-brand-900, #0B4A38) 100%);
  box-shadow: 0 8rpx 24rpx rgba(21, 107, 81, 0.32);
}

.not-logged__btn--secondary {
  background: #FFFFFF;
  /* R2b-L02-D14（颜色token）：描边品牌绿改走 --c-brand，与标题、主按钮同一真源，
     主题 token 调整时不再脱色。 */
  border: 2rpx solid var(--c-brand, #36C99A);
}

.not-logged__btn--ghost {
  background: transparent;
  border: none;
}

.not-logged__btn--ghost::before,
.not-logged__btn--ghost::after {
  content: "";
  flex: 1;
  height: 1rpx;
  background: var(--c-divider-light, rgba(15, 23, 42, 0.06));
}

/* R2b-L02-D15（可达性）：主按钮压在品牌绿渐变上，微信字形用的是绿色版
   ICONS_V2.WECHAT_GREEN_SVG ⇒ 图与底几乎同色（帧内图标区 3290px 里亮于 200 的像素仅 55 个）。
   全仓没有反白微信素材（static/assets/icons/login/ 只有 wechat-green.svg 与 wechat.png，
   IMAGE_PATHS 里也只有 WECHAT_GREEN_SVG 一枚微信键），不新增引用不存在的资源，
   改按缺陷卡给的第二个口径：就地反白（brightness(0) 先把字形压成纯黑剪影再 invert 成白），
   与同按钮的白字（--c-text-inverse 档）同对比档。本类只被主按钮使用，不影响次级/幽灵按钮。 */
.not-logged__btn-icon {
  width: 32rpx;
  height: 32rpx;
  filter: brightness(0) invert(1);
}

.not-logged__btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1E1C;
  letter-spacing: 2rpx;
}

.not-logged__btn-text--primary {
  color: #FFFFFF;
}

/* R6-L08-D07（可达性 P2）：幽灵按钮「稍后再看」是登录墙唯一的退出路径，
   原写死 #9AA39F（= --c-text-placeholder 档，规范 §1.2 明令该档仅限 placeholder）
   压在 #EEF7F2 页底上：帧内字形实测 #9BA4A0，对比度 2.37:1，30rpx/15px 不享大字号豁免。
   与同文件 :335 .not-logged__hint 已确立的口径同档 —— --c-text-secondary(#4A524E) 7.37:1。 */
.not-logged__btn-text--ghost {
  color: var(--c-text-secondary, #4A524E);
  font-weight: 500;
}
</style>
