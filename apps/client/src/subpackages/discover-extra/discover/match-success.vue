<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShareAppMessage } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useMatchStore } from "../../../stores/match";
import { useProfileStore } from "../../../stores/profile";
import { clientApi } from "../../../services/api";
import { mapToDiscoverCard } from "../../../stores/discover/utils";
import { buildMatchReasons, toMatchCardUser } from "../../../view-models/match";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { IMAGE_PATHS } from "../../../config/images";
import { resolveMediaUrl } from "../../../utils/media";
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
import type { MatchCardUser } from "../../../types/match";
import MatchSuccess from "../../../components/match/MatchSuccess.vue";

const { t } = useI18n();
const matchStore = useMatchStore();
const profileStore = useProfileStore();
// 注入 --statusbar/--capsule-right：顶部 nav 返回钮/分享钮需避让状态栏与胶囊
const { styleVars: menuStyleVars } = useMenuButtonRect();

const fallbackPartner = ref<MatchCardUser | null>(null);
const loading = ref(false);
/** R11-L06-D01：query.userId 留存——store 残留与补拉都拿不到对象时，它仍是唯一真身份入参 */
const queryUserId = ref("");
/* R2b-L06-D04（素材缺失 P1）：右上相机图标加载失败兜底——原取 IMAGE_PATHS.LOGIN_SPLIT['r06_c01']
   （登录总览图网格裁片，非本页图标）导致实帧该位是一枚空白白圆。换成 icons 目录线性相机图标后，
   仍保留 @error 兜底：加载失败时隐藏 <image>，只留干净圆底，不再出现坏图占位。 */
const navIconFailed = ref(false);
function onNavIconError() {
  navIconFailed.value = true;
}

/* R10-L06-D02（文案 P1）：matchedUser 可能带空昵称（右侧头像有真图、全页却只显示「TA」），
   此时以按 userId 补拉到的资料为准展示。 */
const partner = computed(() => {
  const stored = matchStore.matchedUser;
  const fb = fallbackPartner.value;
  if (stored && !(stored.name || "").trim() && fb && (fb.name || "").trim()) return fb;
  return stored ?? fb;
});
/**
 * R10-L06-D02（文案 P1）：partner 缺 name 时不再静默落 i18n「TA」（=匿名冒充）。
 * R11-L06-D01（文案 P0）修订其回落形态：原实现把内部取证串「对方昵称加载失败」直出到
 * 用户名槽位（实帧读作「你和 对方昵称加载失败 互相喜欢上了」，且 goChat 被拦成 toast），
 * 按缺陷卡口径改为两种可识别出口——
 * ① 有真 userId（query 或 store 残留，均为真入参、非编造）⇒ 渲染「TA（@id）」，
 *    且「立即聊天」照常可发（chat 会话只需 userId，见 goChat）；
 * ② 无 id（直开缺参，无从识别）⇒ 落既有 i18n「TA」（discover.partnerDefaultName，
 *    zh-CN.ts:946；即组件 MatchSuccess.vue:93 的缺省槽位），聊天出口给可重试导向文案。
 * 加载中不再占用用户名槽位。
 */
const partnerUserId = computed(() =>
  String(partner.value?.userId || queryUserId.value || ""),
);
const partnerName = computed(() => {
  const name = (partner.value?.name || "").trim();
  if (name) return name;
  if (partnerUserId.value) return `TA（@${partnerUserId.value}）`;
  return t("discover.partnerDefaultName");
});
const myAvatar = computed(
  () =>
    // R10-P1-004：avatarUrl 为服务端原始路径（/uploads/...），必须经统一媒体出口解析；
    // 解析失败/为空时落地本地默认头像，禁止空白圆
    resolveMediaUrl(profileStore.avatarUrl) || IMAGE_PATHS.DEFAULT_AVATAR,
);
// MP-R1-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS-002：partnerAvatar 与
// myAvatar 同口径——store 透传的服务端原始路径（/uploads/... 或 /api/v1/media/...）
// 必须经统一媒体出口 resolveMediaUrl 解析（mp-weixin 把相对路径当包内文件且 <image>
// 无法携带鉴权头），加载失败落默认头像。原 mock /static 路径验收掩盖了该缺陷。
const partnerAvatar = computed(
  () =>
    resolveMediaUrl(partner.value?.avatar || partner.value?.photo || "") ||
    IMAGE_PATHS.DEFAULT_AVATAR,
);
const reasons = computed(() => (partner.value ? buildMatchReasons(partner.value) : []));

onLoad((query) => {
  if (!profileStore.avatarUrl) {
    void profileStore.load().catch((e) => {
      // MP-R2-...-MATCH-SUCCESS-003：留排查痕迹（头像有 DEFAULT_AVATAR 兜底，不打断主流程）
      console.warn("[match-success] profile load failed", e);
    });
  }

  // 2026-08-25 P1：dev-preview=1 直接渲染匹配成功页（QA 复验入口，规格书 07）
  const q = (query || {}) as Record<string, string>;
  if (String(q["dev-preview"]) === "1") {
    fallbackPartner.value = {
      userId: "dev-preview",
      id: "dev-preview",
      name: "星野",
      photo: IMAGE_PATHS.AVATARS.AVATAR_1,
      avatar: IMAGE_PATHS.AVATARS.AVATAR_1,
    } as MatchCardUser;
    return;
  }

  // MP-R2-...-MATCH-SUCCESS-005：query.userId 存在且与 store 残留对象不一致时，
  // 以入口参数为准（matchedUser 在 matched/chat_ready 态跨页存续，直达分享链接
  // 会展示旧匹配对象且「立即聊天」跳错人）
  const qUserId = q.userId || "";
  // R11-L06-D01：留存真入参，供昵称缺失时的「TA（@id）」识别与聊天/分享出口使用
  queryUserId.value = qUserId;
  if (qUserId && matchStore.matchedUser && String(matchStore.matchedUser.userId) !== qUserId) {
    matchStore.reset();
  }
  // R10-L06-D02（文案 P1）：补拉触发从「无 matchedUser」扩到「matchedUser 缺昵称」——
  // store 残留对象带真头像但 name 空时，此前永远不补拉，全页静默显示「TA」。
  const stored = matchStore.matchedUser;
  const needLookup = !stored || !(stored.name || "").trim();
  if (needLookup) {
    const userId = qUserId || String(stored?.userId ?? "");
    if (userId) {
      void loadFallbackPartner(userId);
    }
  }
});

async function loadFallbackPartner(userId: string) {
  loading.value = true;
  try {
    const person = await clientApi.getPersonProfile(userId);
    if (!person) return;
    fallbackPartner.value = toMatchCardUser(mapToDiscoverCard(person));
  } catch (_e) {
    fallbackPartner.value = null;
  } finally {
    loading.value = false;
  }
}

function goChat() {
  // R11-L06-D01（文案 P0）：聊天对象身份 = userId（真入参），不再被「昵称为空」拦死——
  // 原实现补拉失败即把「立即聊天」toast 掉，用户既不知道对方是谁也发不出第一条消息。
  // 仅当连 id 都拿不到（直开缺参）才拦，且给可重试导向而非取证串。
  const targetId = partnerUserId.value;
  if (!targetId) {
    uni.showToast({ title: "暂时无法识别对方身份，请到寻觅页重新匹配", icon: "none" });
    return;
  }
  matchStore.markChatReady();
  openAppPath(
    `${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(targetId)}`
  );
}

function keepExploring() {
  uni.switchTab({ url: ROUTES.TAB.DISCOVER });
}

function handleShare() {
  // R11-L06-D06（需新建 P2）：不再用「即将上线」toast 冒充不存在的链路。
  // 微信不允许脚本化调起转发面板，页内「分享喜悦」节点在组件 MatchSuccess.vue:173
  // （view，非 <button open-type="share">，该文件不在本车道可写集）⇒ 本侧先把
  // 回复改成真存在的出口导向（onShareAppMessage 已注册，胶囊菜单转发为真能力）。
  uni.showToast({ title: "点右上角「···」选择发送给朋友即可转发", icon: "none" });
}

/* R11-L06-D06（需新建 P2）：真分享出口——注册页面级 onShareAppMessage，系统胶囊
   「···→发送给朋友」由此产出真转发卡片。标题只携页上已有的显示昵称做脱敏首字（无真名
   落「TA」，不编造）；分享卡片图：仓内没有本页现成素材、硬规矩 5 禁生成/下载 ⇒ 不指定
   imageUrl，走微信默认页面截图卡。接收方按 query.userId 落地可识别对方（R11-L06-D01 链）。 */
onShareAppMessage(() => {
  const name = (partner.value?.name || "").trim();
  const masked = name ? `${name.slice(0, 1)}**` : t("discover.partnerDefaultName");
  const base = { title: `我和 ${masked} 匹配成功啦` };
  return partnerUserId.value
    ? {
        ...base,
        path: `${ROUTES.DISCOVER.MATCH_SUCCESS}?userId=${encodeURIComponent(partnerUserId.value)}`,
      }
    : base;
});

/** 2026-08-25 P0：左上返回（规格书 7.1） */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: ROUTES.TAB.DISCOVER });
  }
}

/** 2026-08-25 P0：右上相机/截图（规格书 7.2，素材库 r06_c01 相机图标） */
function handleScreenshot() {
  uni.showToast({ title: "截图功能即将上线", icon: "none" });
}
</script>

<template>
  <view class="success-page" :style="menuStyleVars">
    <!-- 2026-08-25 P0：顶部 nav（左返回 + 右相机/分享）
         2026-10-26 对齐理想图（匹配成功页面.png）：返回键为无底色纯黑 chevron（撤白圆底+阴影）；
         右上图标为取景框/扫描式字形（原相机图标形态用错），白圆底保留 -->
    <view class="success-nav">
      <view
        class="success-nav__btn success-nav__btn--bare press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.back')"
        @tap="goBack"
      >
        <text class="success-nav__icon">‹</text>
      </view>
      <view class="success-nav__right">
        <view
          class="success-nav__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="'截图'"
          @tap="handleScreenshot"
        >
          <image
            v-if="!navIconFailed"
            class="success-nav__icon-img"
            :src="resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.SCAN_VIEWFINDER_SVG)"
            mode="aspectFit"
            alt=""
            @error="onNavIconError"
          />
        </view>
        <!-- R11-L06-D04（位置 P2）：删除页内自绘「···」钮——原与系统胶囊 ••• 同形同义、
             相距仅 17px 并排重复，点击只弹 toast，是假控件；右上收成唯一一枚图标位。 -->
      </view>
    </view>

    <!-- §12.3（R11 在册裁定，派单前定案）：match-score 不再接 partner?.matchScore——
         它由 constants/match.ts:92/95/98 写死 80+n×5（共同圈为 0 也报 80%）派生，非真值。
         后端出真 match_score 列之前本页不显示匹配度百分比（冻结契约 §12，
         MatchLoading.vue:48-54 已认同一口径），R10 的 defaultScores/DEFAULT_REASON_LABELS
         假补位不回归（§11.2：真理由为空 ⇒ 整卡隐藏的判据保持不动）。
         登记缺列：后端匹配度真值列。 -->
    <MatchSuccess
      :my-avatar="myAvatar"
      :partner-avatar="partnerAvatar"
      :partner-name="partnerName"
      :reasons="reasons"
      @chat="goChat"
      @explore="keepExploring"
      @share="handleShare"
    />
  </view>
</template>

<style scoped lang="scss">
.success-page {
  position: relative;
  min-height: 100%;
  /* MP-R2VIS-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-002：匹配域底渐变单一来源
     （理想图 匹配成功页面.png 为薄荷绿→浅粉洗色，即 $gradient-match 本体） */
  background: var(--c-gradient-match);
  /* MP-R2-...-MATCH-SUCCESS-009：纵向 flex 容器，使组件宿主 flex:1 高度链成立 */
  display: flex;
  flex-direction: column;
}

/* 2026-08-25 P0：顶部 nav（规格书 7.1 / 7.2）
   2026-09-10 R3：--statusbar 由 useMenuButtonRect 注入（开发者工具 env 恒 0），
   返回钮/换一换原 env 兜底失败会与系统时间、状态栏图标叠印 */
.success-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 24rpx) calc(var(--capsule-right, 7px) + 104px) 0 24rpx;
  z-index: 20;
  pointer-events: none;
}

.success-nav__btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  pointer-events: auto;
}

/* 2026-10-26 对齐理想图：返回键无底色（白圆底/阴影仅保留给右上图标钮） */
.success-nav__btn--bare {
  background: transparent;
  box-shadow: none;
}

.success-nav__right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.success-nav__icon {
  font-size: 40rpx;
  color: #333A37;
  line-height: 1;
  font-weight: 500;
}

.success-nav__icon-img {
  width: 40rpx;
  height: 40rpx;
  /* R2b-L06-D04：camera.svg 描边烘焙为 #94A3B8（浅灰蓝），mp <image> 不响应 CSS color；
     用 filter 把已渲染位图压黑，与左侧返回箭头（#333A37 深色线性）成对，符合理想图深色图标 */
  filter: brightness(0);
  opacity: 0.82;
}
</style>