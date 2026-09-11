<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useMatchStore } from "../../../stores/match";
import { useProfileStore } from "../../../stores/profile";
import { clientApi } from "../../../services/api";
import { mapToDiscoverCard } from "../../../stores/discover/utils";
import { buildMatchReasons, toMatchCardUser } from "../../../view-models/match";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { IMAGE_PATHS } from "../../../config/images";
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

const partner = computed(() => matchStore.matchedUser ?? fallbackPartner.value);
const myAvatar = computed(() => profileStore.avatarUrl || IMAGE_PATHS.DEFAULT_AVATAR);
const partnerAvatar = computed(() => partner.value?.avatar || partner.value?.photo || IMAGE_PATHS.DEFAULT_AVATAR);
const reasons = computed(() => (partner.value ? buildMatchReasons(partner.value) : []));

onLoad((query) => {
  if (!profileStore.avatarUrl) {
    void profileStore.load().catch(() => {});
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

  if (!matchStore.matchedUser) {
    const userId = typeof query?.userId === "string" ? query.userId : "";
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
  if (!partner.value) return;
  matchStore.markChatReady();
  openAppPath(
    `${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(partner.value.userId)}`
  );
}

function keepExploring() {
  uni.switchTab({ url: ROUTES.TAB.DISCOVER });
}

function handleShare() {
  uni.showToast({ title: "分享功能即将上线", icon: "none" });
}

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
    <!-- 2026-08-25 P0：顶部 nav（左返回 + 右相机/分享） -->
    <view class="success-nav">
      <view
        class="success-nav__btn press-feedback"
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
          <image class="success-nav__icon-img" :src="IMAGE_PATHS.LOGIN_SPLIT['r06_c01']" mode="aspectFit" alt="" />
        </view>
        <view
          class="success-nav__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="'更多'"
          @tap="handleShare"
        >
          <text class="success-nav__icon">···</text>
        </view>
      </view>
    </view>

    <MatchSuccess
      :my-avatar="myAvatar"
      :partner-avatar="partnerAvatar"
      :partner-name="partner?.name ?? t('discover.partnerDefaultName')"
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
  background: linear-gradient(180deg, #E8FBF2 0%, #F0FFF5 60%);
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
}
</style>