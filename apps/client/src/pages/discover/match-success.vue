<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useMatchStore } from "../../stores/match";
import { useProfileStore } from "../../stores/profile";
import { clientApi } from "../../services/api";
import { mapToDiscoverCard } from "../../stores/discover/utils";
import { buildMatchReasons, toMatchCardUser } from "../../view-models/match";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";
import { IMAGE_PATHS } from "../../config/images";
import type { MatchCardUser } from "../../types/match";
import MatchSuccess from "../../components/match/MatchSuccess.vue";

const { t } = useI18n();
const matchStore = useMatchStore();
const profileStore = useProfileStore();

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
</script>

<template>
  <view class="success-page">
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
  min-height: 100%;
  background: linear-gradient(180deg, #E8FBF2 0%, #F0FFF5 60%);
}
</style>