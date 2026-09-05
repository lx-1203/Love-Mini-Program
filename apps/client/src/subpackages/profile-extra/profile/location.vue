<script setup lang="ts">
/**
 * 我的位置 · 定位设置
 *
 * 2026-09-02 R5：用户需求 9——顶部定位按钮可点击并跳转到专门的「位置定位」页面。
 * 这里展示当前定位（经纬度+城市+校区）、允许用户手动切换/重定位、跳回到 home 顶部按钮体验闭环。
 *
 * 2026-09-03 用户项 5：位置信息卡下方、按钮上方插入真实地图（mp 原生 map = 腾讯地图底座，
 * 合规免 key），marker 展示当前位置；支持「在地图上选点」（uni.chooseLocation 原生选点器，
 * 返回坐标+物理地址）修改位置；坐标可上报后端，后续可扩展持久化。
 */
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../../stores/session";
import { fetchCurrentLocation, buildLocationText, reportLocation } from "../../../utils/location";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import { IMAGE_PATHS } from "../../../config/images";
import { resolveMediaUrl } from "../../../utils/media";

const { t } = useI18n();
const sessionStore = useSessionStore();

const city = ref("");
const campusName = computed(() => sessionStore.userSession?.campusName || "");
const displayText = computed(() => buildLocationText(city.value, campusName.value));
const coords = ref<{ latitude: number; longitude: number } | null>(null);
const locating = ref(false);
/** 物理地址文本（chooseLocation 返回 address；或校区/城市文本） */
const addressText = ref("");

/** 地图中心：优先已选/定位坐标，无则默认北京中心（北京大学一带），避免地图空白 */
const DEFAULT_CENTER = { latitude: 39.9042, longitude: 116.4074 };
const mapCenter = computed(() => coords.value ?? DEFAULT_CENTER);

/** marker：使用本地定位 pin PNG（marker iconPath 仅支持本地/网络位图） */
const mapMarkers = computed(() => [
  {
    id: 0,
    latitude: mapCenter.value.latitude,
    longitude: mapCenter.value.longitude,
    iconPath: resolveMediaUrl(IMAGE_PATHS.HOME_ICONS.LOCATION_PIN),
    width: 36,
    height: 36,
    callout: {
      content: addressText.value || city.value || "当前位置",
      display: "ALWAYS",
      borderRadius: 10,
      padding: 8,
      fontSize: 12,
    },
  },
]);

async function loadLocation() {
  locating.value = true;
  try {
    const loc = await fetchCurrentLocation();
    if (loc) {
      city.value = loc.city || "";
      coords.value = { latitude: loc.latitude, longitude: loc.longitude };
      void reportLocation(loc.latitude, loc.longitude);
    }
  } finally {
    locating.value = false;
  }
}

/**
 * 在地图上选点（原生选点器，微信腾讯地图底座，合规）：
 * 返回所选坐标 + 物理地址，立即更新 marker 与地址展示。
 */
async function pickFromMap() {
  // #ifdef MP-WEIXIN
  try {
    const res: any = await new Promise((resolve, reject) => {
      uni.chooseLocation({
        latitude: mapCenter.value.latitude,
        longitude: mapCenter.value.longitude,
        success: resolve,
        fail: reject,
      });
    });
    if (res?.latitude && res?.longitude) {
      coords.value = { latitude: res.latitude, longitude: res.longitude };
      city.value = res.address || res.name || "";
      addressText.value = res.address || res.name || "";
      void reportLocation(res.latitude, res.longitude, true);
    }
  } catch (_e) {
    uni.showToast({ title: "未获取到选点结果，请检查定位权限后重试", icon: "none" });
  }
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: "地图选点仅小程序端可用", icon: "none" });
  // #endif
}

function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.reLaunch({ url: ROUTES.HOME });
  }
}

function goHome() {
  openAppPath(ROUTES.HOME);
}

onLoad(() => {
  loadLocation();
});
</script>

<template>
  <view class="location-page">
    <view class="location-header">
      <view class="location-header__back press-feedback" hover-class="press-feedback--active" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <image class="location-header__back-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.BACK)" mode="aspectFit" alt="" />
      </view>
      <text class="location-header__title">我的位置</text>
      <view class="location-header__placeholder" />
    </view>

    <view class="location-body">
      <view class="location-card">
        <view class="location-card__row">
          <image class="location-card__icon" :src="resolveMediaUrl(IMAGE_PATHS.HOME_ICONS.LOCATION_PIN)" mode="aspectFit" alt="" />
          <view class="location-card__info">
            <text class="location-card__label">当前位置</text>
            <text class="location-card__value">{{ displayText }}</text>
            <text v-if="coords" class="location-card__coords">经度 {{ coords.longitude.toFixed(4) }} · 纬度 {{ coords.latitude.toFixed(4) }}</text>
          </view>
        </view>
        <view v-if="campusName" class="location-card__campus">
          <text class="location-card__campus-label">所属校区</text>
          <text class="location-card__campus-value">{{ campusName }}</text>
        </view>
        <!-- 2026-09-03 项5：物理地址（选点/定位返回；无则提示） -->
        <view v-if="addressText" class="location-card__address">
          <text class="location-card__address-label">物理地址</text>
          <text class="location-card__address-value">{{ addressText }}</text>
        </view>
      </view>

      <!-- 2026-09-03 项5：真实地图（位置信息下方、按钮上方）。原生 map 组件 = 腾讯地图底座（合规）；
           未授权定位时展示默认中心 + 引导选点；H5 端降级为提示占位 -->
      <view class="location-map">
        <!-- #ifdef MP-WEIXIN -->
        <map
          class="location-map__canvas"
          :latitude="mapCenter.latitude"
          :longitude="mapCenter.longitude"
          :markers="mapMarkers"
          :scale="15"
          :enable-scroll="true"
          :enable-zoom="true"
          :show-compass="false"
        />
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="location-map__canvas location-map__canvas--h5">
          <text class="location-map__h5-text">地图仅在小程序端展示</text>
        </view>
        <!-- #endif -->
        <view class="location-map__tip-row">
          <text class="location-map__tip">轻点下方按钮，在地图上选择新位置</text>
          <view class="location-map__pick press-feedback" hover-class="press-feedback--active" role="button" aria-label="在地图上选点" @tap="pickFromMap">
            <text class="location-map__pick-text">地图选点</text>
          </view>
        </view>
      </view>

      <view class="location-actions">
        <view class="location-btn location-btn--primary press-feedback" hover-class="press-feedback--active" role="button" aria-label="重新定位" @tap="loadLocation">
          <text class="location-btn__text">{{ locating ? '定位中...' : '重新定位' }}</text>
        </view>
        <view class="location-btn press-feedback" hover-class="press-feedback--active" role="button" aria-label="返回首页" @tap="goHome">
          <text class="location-btn__text">返回首页</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.location-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--c-bg-page, #EEF7F2);
}

.location-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top) + 20rpx) 32rpx 16rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #EEF2F0;
}

.location-header__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.location-header__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.location-header__title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1A1E1C;
}

.location-header__placeholder {
  width: 64rpx;
  height: 64rpx;
}

.location-body {
  flex: 1;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.location-card {
  padding: 40rpx 32rpx;
  border-radius: 32rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.location-card__row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}

.location-card__icon {
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.location-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.location-card__label {
  font-size: 24rpx;
  color: #9AA39F;
}

.location-card__value {
  font-size: 32rpx;
  font-weight: 700;
  color: #1A1E1C;
  word-break: break-all;
}

.location-card__coords {
  font-size: 22rpx;
  color: #94A39F;
}

.location-card__campus {
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: #E8FBF2;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.location-card__campus-label {
  font-size: 24rpx;
  color: #36C99A;
}

.location-card__campus-value {
  font-size: 26rpx;
  font-weight: 700;
  color: #22A35F;
}

.location-card__address {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: #F4F7F5;
}

.location-card__address-label {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #9AA39F;
}

.location-card__address-value {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  font-weight: 600;
  color: #1A1E1C;
  word-break: break-all;
}

/* 2026-09-03 项5：真实地图区 */
.location-map {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.location-map__canvas {
  width: 100%;
  height: 440rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #E8EEF2;
}

.location-map__canvas--h5 {
  display: flex;
  align-items: center;
  justify-content: center;
}

.location-map__h5-text {
  font-size: 26rpx;
  color: #9AA39F;
}

.location-map__tip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.location-map__tip {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  color: #9AA39F;
}

.location-map__pick {
  flex-shrink: 0;
  height: 64rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #36C99A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.location-map__pick-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ffffff;
}

.location-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.location-btn {
  height: 96rpx;
  border-radius: 999rpx;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.location-btn--primary {
  background: #36C99A;
}

.location-btn__text {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}

.location-btn:not(.location-btn--primary) .location-btn__text {
  color: #1A1E1C;
}
</style>