<script setup lang="ts">
import { computed } from "vue";

/** 旧 mood 名 -> V2 文件名映射（向后兼容） */
/** 旧 mood 名 -> V2 文件名映射（向后兼容） */
const LEGACY_MAP: Record<string, string> = {
  default: "mascot_default",
  happy: "mascot_happy",
  love: "mascot_love",
  thinking: "mascot_thinking",
  waving: "mascot_wave",
  sad: "mascot_cry",
  // 拆分素材语义化映射
  smile: "mascot_smile",
  wink: "mascot_wink",
  surprised: "mascot_surprised",
  tearful: "mascot_tearful",
  angry: "mascot_angry",
  sleepy: "mascot_sleepy",
  calm: "mascot_calm",
  shy: "mascot_shy",
  crush: "mascot_crush",
  // 表情特写
  face_love: "expression_19",
  face_shy: "expression_20",
  face_wink: "expression_21",
  face_happy: "expression_22",
  face_laugh: "expression_23",
  face_excited: "expression_24",
  face_calm: "expression_25",
  face_sad: "expression_26",
  face_surprised: "expression_27",
  face_thinking: "expression_28",
  face_sleepy: "expression_29",
  face_angry: "expression_30",
  // 装饰元素
  decor_sparkle: "decor_31",
  decor_star: "decor_32",
  decor_heart: "decor_33",
  decor_flower: "decor_34",
  decor_leaf: "decor_35",
  decor_confetti: "decor_36",
  decor_bubble: "decor_37",
  decor_sprout: "decor_38",
  decor_cloud: "decor_39",
  decor_rainbow: "decor_40",
  decor_music: "decor_41",
  decor_camera: "decor_42",
  decor_book: "decor_43",
  decor_heart_pair: "decor_44",
  decor_dotted_circle: "decor_45",
  decor_heart_small: "decor_46",
  decor_leaf_pair: "decor_47",
  decor_exclamation: "decor_48",
  decor_question: "decor_49",
  decor_check: "decor_50",
  decor_cross: "decor_51",
  decor_plus: "decor_52",
  // 场景功能图标
  util_greeting: "utility_53",
  util_match: "utility_54",
  util_chat: "utility_55",
  util_like: "utility_56",
  util_profile: "utility_57",
  util_search: "utility_58",
  util_notification: "utility_59",
  util_settings: "utility_60",
  util_share: "utility_61",
  util_camera: "utility_62",
  // 额外吉祥物变体
  extra_walking: "mascot_extra_10",
  extra_running: "mascot_extra_11",
  extra_reading: "mascot_extra_12",
  extra_phone: "utility_53",
  extra_photo: "mascot_extra_14",
  extra_dancing: "mascot_extra_15",
  extra_sleeping: "mascot_extra_16",
  extra_wave: "mascot_extra_17",
  extra_ref: "mascot_extra_18",
};

const props = withDefaults(
  defineProps<{
    /**
     * 表情 / 场景名称。
     * 主吉祥物：default / smile / happy / wink / thinking / surprised / tearful / angry / sleepy
     * 互动：wave / heart / love / cheer / clap / greeting / jump / party / hug / like / shy / sleep / crush
     * 聊天气泡：chat_hi / chat_good / chat_are_you / chat_great / chat_goodnight / chat_received
     * 导航：nav_home / nav_match / nav_message / nav_nearby / nav_profile
     * 头像：head_default / head_happy / head_glasses / head_crush / head_sleepy
     * 装饰：sparkle / star / heart_pink / heart_green / flower / party / confetti / question / sprout / exclamation
     * 状态：status_online / status_offline / status_busy / status_crush
     * 场景：mascot_camera / mascot_phone / mascot_search
     */
    mood?: string;
    /** 尺寸：xs=32px sm=40px md=80px lg=120px xl=200px */
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    /** 资源分类（可选，自动推断） */
    category?: "mascot" | "expression" | "state" | "chat" | "nav" | "avatar" | "decor" | "scene";
    /** 是否播放呼吸动效 */
    animated?: boolean;
    /** 是否使用小尺寸迷你头像（用于导航栏等） */
    mini?: boolean;
  }>(),
  { mood: "default", size: "lg", animated: false, mini: false }
);

const SIZE_RPX = { xs: 64, sm: 80, md: 160, lg: 240, xl: 400 };
const SIZE_RPX_MINI = { xs: 48, sm: 56, md: 80, lg: 120, xl: 160 };

const resolvedMood = computed(() => {
  // 向后兼容：旧 mood 名自动映射到 V2 文件名
  const m = props.mood ?? "default";
  return LEGACY_MAP[m] ?? m;
});

const imgSrc = computed(() => `/static/assets/images/mascot/${resolvedMood.value}.png`);
const sizeRpx = computed(() =>
  props.mini ? SIZE_RPX_MINI[props.size] : SIZE_RPX[props.size]
);
</script>

<template>
  <view
    class="xunmi-mascot"
    :class="{ 'xunmi-mascot--animated': animated }"
    :style="{ width: `${sizeRpx}rpx`, height: `${sizeRpx}rpx` }"
  >
    <image class="xunmi-mascot__img" :src="imgSrc" mode="aspectFit" :alt="resolvedMood" />
  </view>
</template>

<style scoped lang="scss">
.xunmi-mascot {
  position: relative;
}

.xunmi-mascot__img {
  width: 100%;
  height: 100%;
}

.xunmi-mascot--animated {
  animation: xunmi-breathe 2.4s ease-in-out infinite;
}

@keyframes xunmi-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
</style>
