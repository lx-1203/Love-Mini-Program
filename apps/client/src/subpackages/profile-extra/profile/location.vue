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
// R10-P1-003：注入 --statusbar/--capsule-right（DevTools env(safe-area-inset-top) 恒 0，标题叠印状态栏）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const { t } = useI18n();
const sessionStore = useSessionStore();

const city = ref("");
const campusName = computed(() => sessionStore.userSession?.campusName || "");
// MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-001：城市可能不是从这对经纬度解析来的——
// 逆地理拿不到时，utils/location 会退回按请求方 IP 归属地推断的城市（那是 MP-R1-PAGES-NEARBY-INDEX-005
// 的补救，两个值可以差出一个省）。本页是全站唯一把「城市」和「坐标」并排展示的地方，所以必须同源诚实：
// ip 来源加「服务器所在城市」标注；城市为空时**不再**走 buildLocationText——
// 那条链会落到硬编码「北京大学 · 附近」，等于把假城市写进与坐标同源的展示里，改后只见坐标行。
const cityFromIp = ref(false);
/* LOCATION-001 的后一半：IP 推断出来的城市离本次坐标超过 CITY_COORD_MAX_KM 时，
   这个城市与这对坐标说的不是同一个地方，必须整个丢弃（不是加个标注了事）。
   量不出来（后端没有该城市中心表）同样丢——"同源"是要证据的结论，缺证据不默认成立。
   丢弃后不走 buildLocationText（那条链会落到硬编码「北京大学 · 附近」），只剩坐标行。 */
const cityDistant = ref(false);
const shownCity = computed(() => (cityDistant.value ? "" : city.value));
const coords = ref<{ latitude: number; longitude: number } | null>(null);
const locating = ref(false);
/** 物理地址文本（chooseLocation 返回 address；或校区/城市文本） */
const addressText = ref("");

/* R6-B57/D07（空态文案 P1，2026-10-20）：原实现在"城市/校区/坐标/物理地址全拿不到"时
   把一句工程诊断语铺到卡片主值位（帧实测卡内只有「当前位置」+ 粗体「地址解析不可用」，
   坐标行/校区行/地址行三行 v-if 全部塌陷，卡高只剩 154rpx）。现拆成两层：
   ① 主值位 = 用户可读空态（走 i18n，键在 zh-CN.ts:1750 / en-US.ts:1701 均已登记）；
   ② 失败原因降级为次级说明（addressUnavailable，实测值已由 F1 换成用户口吻
      「暂时获取不到位置」），并给出**可行动**指引，指向页内真实存在的两颗按钮
      （:203「地图选点」/:210「重新定位」，逐字对齐按钮文案）。
   指引这句沿用本页既有的页内字面量风格（本页「当前位置」「所属校区」「物理地址」
   「轻点下方按钮，在地图上选择新位置」都是模板字面量），未新增 locale 键。 */
const hasAnyLocationFact = computed(
  () => Boolean(shownCity.value || campusName.value || coords.value || addressText.value),
);
const displayText = computed(() => {
  if (shownCity.value) {
    return cityFromIp.value
      ? `${shownCity.value} · ${t("locationPage.serverCityTag")}`
      : buildLocationText(shownCity.value, campusName.value);
  }
  if (campusName.value) return buildLocationText("", campusName.value);
  return t("locationPage.locationEmpty");
});
/** 坐标行的占位：拿不到坐标也要留行（用户要知道"这一栏存在但暂时为空"，不是整行消失） */
const coordText = computed(() => {
  if (!coords.value) return "经度 — · 纬度 —";
  return `经度 ${coords.value.longitude.toFixed(4)} · 纬度 ${coords.value.latitude.toFixed(4)}`;
});

/** 地图中心：优先已选/定位坐标，无则默认北京中心（北京大学一带），避免地图空白 */
const DEFAULT_CENTER = { latitude: 39.9042, longitude: 116.4074 };
const mapCenter = computed(() => coords.value ?? DEFAULT_CENTER);

/** marker：使用本地定位 pin PNG（marker iconPath 仅支持本地/网络位图）
 *  R10-L10-D09（空态文案 P1）：hasAnyLocationFact 为 false 时——城市/校区/坐标/物理地址全空，
 *  白卡写「暂无位置信息」/「经度 — · 纬度 —」——地图下方不能再钉一枚写死 DEFAULT_CENTER
 *  (39.9042/116.4074) 的红针 + ALWAYS 气泡「当前位置」，否则空态与地图在同一帧互相打脸：
 *  用户看地图会判定"我已定位成功"，既不会点「重新定位」也不会点「地图选点」。
 *  按卡上第一条建议：无定位事实 ⇒ mapMarkers 返回空数组，地图只留默认中心视图，不出针、不出气泡。 */
const mapMarkers = computed(() => {
  if (!hasAnyLocationFact.value) return [];
  return [
    {
      id: 0,
      latitude: mapCenter.value.latitude,
      longitude: mapCenter.value.longitude,
      iconPath: resolveMediaUrl(IMAGE_PATHS.HOME_ICONS.LOCATION_PIN),
      width: 36,
      height: 36,
      callout: {
        content: addressText.value || shownCity.value || "当前位置",
        display: "ALWAYS",
        borderRadius: 10,
        padding: 8,
        fontSize: 12,
      },
    },
  ];
});

async function loadLocation() {
  locating.value = true;
  try {
    const loc = await fetchCurrentLocation();
    if (loc) {
      city.value = loc.city || "";
      cityFromIp.value = loc.citySource === "ip";
      cityDistant.value = loc.citySource === "ip" && loc.cityTrusted === false;
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
    const res = await new Promise<UniApp.ChooseLocationSuccess>((resolve, reject) => {
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
      /* 选点返回的地址就是这对坐标逆解析出来的，天然同源：上一次定位留下的 ip 来源/超距
         丢弃标记必须一并清掉，否则刚选出的位置要么被冠上「服务器所在城市」的错误出处，
         要么被 cityDistant 整个吞掉、只剩「地址解析不可用」。 */
      cityFromIp.value = false;
      cityDistant.value = false;
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
    // 首页路径在 ROUTES.TAB.HOME（顶层无 ROUTES.HOME 字段）
    uni.reLaunch({ url: ROUTES.TAB.HOME });
  }
}

function goHome() {
  openAppPath(ROUTES.TAB.HOME);
}

onLoad(() => {
  loadLocation();
});
</script>

<template>
  <view class="location-page" :style="menuStyleVars">
    <view class="location-header">
      <!-- R7-L10-D09（可达性 P3，R6-B57/D09 已批未落地）与 R7-L10-D10（可达性 P3，
           R6-B57/D10 同批已批未落地）一起按 album.vue R6-B55/D17 的已验证配方重做：
           ① 热区 64rpx→88rpx（AppShell.vue:334 仓内口径；本页 navigationStyle:custom，
              这枚是唯一返回出口），64rpx 视觉圆底移进 __back-circle，尺寸不动；
           ② 图标从 ICONS_COMMON.BACK 换成页内文字字形——那张 png 是 common/back.svg 的
              栅格化（stroke #94A3B8 蓝灰，24  viewBox 里折线只占 x9..15 / y6..18，留白过大），
              压白色页头实测字形 (183,193,207)~(215,221,229)、对比度≈1.6:1、可见带高≈8px；
              仓内 real 包 icons/common 目录逐枚核过 stroke 色值，没有深色返回素材可换，
              故按同域 other.vue:378 / privacy.vue:73 已用的「‹ 字形 + --c-text-primary」
              范式落地：52rpx 深色字形 + 薄荷底描边圆钮，对比度与可点示能同时解决。 -->
      <view class="location-header__back press-feedback" hover-class="press-feedback--active" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <view class="location-header__back-circle">
          <text class="location-header__back-glyph">‹</text>
        </view>
      </view>
      <text class="location-header__title">我的位置</text>
      <view class="location-header__placeholder" />
    </view>

    <view class="location-body">
      <view class="location-card">
        <view class="location-card__row">
          <image class="location-card__icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.LOCATION)" mode="aspectFit" alt="" />
          <view class="location-card__info">
            <text class="location-card__label">当前位置</text>
            <text class="location-card__value">{{ displayText }}</text>
            <!-- R6-B57/D07：坐标行不再整行消失，拿不到时留「—」占位（不编造数值） -->
            <text class="location-card__coords">{{ coordText }}</text>
            <!-- R6-B57/D07：空态时给次级说明 + 可行动指引（指引对象是页内真实按钮文案） -->
            <text v-if="!hasAnyLocationFact" class="location-card__hint">
              {{ t("locationPage.addressUnavailable") }}，可点下方「重新定位」，或用「地图选点」手动选位置
            </text>
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
        <!-- R7-L10-D08（圆角 P3）：原生 map 层不吃父容器/自身的 border-radius+overflow，
             帧实测左上角 x=20/y=263 直接是地图红色像素 (217,69,70)、角部无 12px 缺角。
             圆角改由一层真实 view 卡片 __frame 承担：它自带背景 + 24rpx 圆角（普通 view，
             圆角确实渲染），12rpx 内衬把方形地图让开角部弧线（r=24rpx 时几何下限≈7rpx），
             地图四角落在卡片内，不再与上方 32rpx 圆角白卡视觉断裂。 -->
        <view class="location-map__frame">
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
        </view>
        <view class="location-map__tip-row">
          <!-- R7-L10-D07（文案 P3）：原「轻点下方按钮」方位指错——唯一打开选点器的
               「地图选点」钮与提示文字同行、在文字右侧（帧实测 y=483..527 / x=294..356），
               文字下方那枚是「重新定位」（GPS 重定位，不是地图选点）。按建议改法第一条
               把方位词与实际可点对象对齐。 -->
          <text class="location-map__tip">轻点右侧「地图选点」，在地图上选择新位置</text>
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
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 20rpx) 32rpx 16rpx;
  background: var(--c-bg-container, #ffffff);
  border-bottom: 1rpx solid var(--c-line, #EEF2F0);
}

/* R7-L10-D09（可达性 P3）：热区 64rpx→88rpx（AppShell.vue:334 口径，本页唯一返回出口）；
   64rpx 视觉圆底移入 __back-circle —— album.vue:607-627 同款配方。 */
.location-header__back {
  width: 88rpx;
  height: 88rpx;
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.location-header__back-circle {
  width: 64rpx;
  height: 64rpx;
  box-sizing: border-box;
  border-radius: var(--r-full, 9999rpx);
  /* 页头本身是白底，圆底取页面薄荷档 + 卡片描边，才能在白头上读成"可点圆钮" */
  background: var(--c-bg-page, #EEF7F2);
  border: var(--c-border-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* R7-L10-D10（可达性 P3）：原 40rpx 蓝灰 PNG 字形（素材留白过大，实测可见带高≈8px、
   对比度≈1.6:1）换成 52rpx 深色 ‹ 字形压白/薄荷底。52rpx 高于字号档位上限 --fs-5xl=44rpx，
   按同域 other.vue:515 `.other-header__back-arrow`（同一枚 ‹、同样 52rpx）的既有口径保留为
   固定布局尺寸，不写 var(--fs-5xl, 52rpx) 那种永不生效的假兜底。 */
.location-header__back-glyph {
  font-size: 52rpx;
  font-weight: 700;
  line-height: 1;
  color: var(--c-text-primary);
}

/* R6-B57/D10（字号 P2，2026-10-20）：页头标题原裸写 font-size: 36rpx——36rpx 是 --fs-3xl 的
   值却被硬编码、不入档位（规范 §1.1 第 3 条「一令牌一值，页面只准 var(--*)」），并且
   profile-extra 同域三页页头各写一档（相册 --fs-5xl 44rpx / 本页 36rpx / 隐私 --fs-xl 30rpx）。
   按建议改法三页统一收敛到 var(--fs-4xl)=40rpx（本页 + album.vue + privacy.vue 同批已改）。 */
.location-header__title {
  font-size: var(--fs-4xl);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}

.location-header__placeholder {
  /* R7-L10-D09 同批：与 88rpx 返回热区同宽，保证 space-between 下标题仍居中 */
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
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
  background: var(--c-bg-container, #ffffff);
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
  /* R10-L10-D10（字号 P3）：24rpx 裸值落 --fs-base 档 ⇒ 归令牌；清掉写成 #9AA39F 的假兜底
     （--c-text-tertiary 真值 #6B7571，见 design-variables.scss:125），同域 album.vue 同角色行已归 var。 */
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

.location-card__value {
  /* R10-L10-D10：32rpx 裸值落 --fs-2xl 档 ⇒ 归令牌 */
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  word-break: break-all;
}

.location-card__coords {
  /* R10-L10-D10：22rpx 裸值落 --fs-sm 档 ⇒ 归令牌；清掉写成 #94A39F 的假兜底 */
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

/* R6-B57/D07：次级说明（失败原因 + 可行动指引），字阶/色阶按规范 §1.3 取档位令牌 */
.location-card__hint {
  font-size: var(--fs-sm);
  line-height: 1.5;
  color: var(--c-text-tertiary);
}

.location-card__campus {
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: var(--c-brand-50, #E8FBF2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.location-card__campus-label {
  font-size: 24rpx;
  color: var(--c-brand, #36C99A);
}

.location-card__campus-value {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-success, #22A35F);
}

.location-card__address {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  background: var(--c-bg-page, #F4F7F5);
}

.location-card__address-label {
  flex-shrink: 0;
  font-size: 24rpx;
  /* R10-L10-D10：清掉写成 #9AA39F 的假兜底 */
  color: var(--c-text-tertiary);
}

.location-card__address-value {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--c-text-primary, #1A1E1C);
  word-break: break-all;
}

/* 2026-09-03 项5：真实地图区 */
.location-map {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

/* R7-L10-D08：真正承担圆角的一层（普通 view，border-radius 会渲染） */
.location-map__frame {
  width: 100%;
  box-sizing: border-box;
  padding: 12rpx;
  border-radius: 24rpx;
  background: var(--c-bg-container, #ffffff);
  border: var(--c-border-card);
  overflow: hidden;
}

.location-map__canvas {
  width: 100%;
  height: 440rpx;
  /* R7-L10-D08：这两条原样挂在这里是死声明——原生 map 层不被自身/父级 border-radius +
     overflow 裁剪（帧实测角部仍是地图像素），圆角已由外层 .location-map__frame 承担，
     地图作为方形内衬图落在卡片里，声明与实渲一致。 */
  background: var(--c-bg-page, #E8EEF2);
}

.location-map__canvas--h5 {
  display: flex;
  align-items: center;
  justify-content: center;
}

.location-map__h5-text {
  font-size: 26rpx;
  /* R10-L10-D10：清掉 #9AA39F 假兜底（此行仅 H5 分支渲染，mp 帧不变） */
  color: var(--c-text-tertiary);
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
  /* R10-L10-D11（可达性 P1）：本页唯一手动选点指引「轻点右侧「地图选点」…」压在 --c-bg-page
     #EEF7F2 薄荷底上，原 --c-text-tertiary #6B7571 实算 4.33:1（<正文级 4.5:1），且兜底还写成
     更浅的 #9AA39F（2.37:1）。按 R9-L10-D18 同口径升到 --c-text-secondary #4A524E（同底 7.37:1），
     字号从 22rpx 提到 var(--fs-base) 起步，并删掉假兜底。同页压在白卡上的 .location-card__hint
     仍留 --c-text-tertiary（白底 4.76:1 达标），两行不再一处达标一处不达标。 */
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
}

/* R6-B57/D09（可达性 P2，2026-10-20）：实测胶囊高 30px=60rpx（源码 64rpx 与实测差 4rpx
   为抗锯齿），低于仓内自陈热区口径 AppShell.vue:334 的 88rpx；它是本页唯一「手动改位置」
   入口（chooseLocation 那条路的入口钮，manifest 声明缺失另由 F8/R6-B25 接手）。
   同页「重新定位」实测 98rpx、「返回首页」94rpx 已达标 ⇒ 提到同档 88rpx。 */
.location-map__pick {
  flex-shrink: 0;
  height: 88rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--c-brand, #36C99A);
  display: flex;
  align-items: center;
  justify-content: center;
}

.location-map__pick-text {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-neutral-0, #ffffff);
}

.location-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.location-btn {
  height: 96rpx;
  border-radius: 999rpx;
  background: var(--c-bg-container, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
}

.location-btn--primary {
  background: var(--c-brand, #36C99A);
}

.location-btn__text {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-neutral-0, #ffffff);
}

.location-btn:not(.location-btn--primary) .location-btn__text {
  color: var(--c-text-primary, #1A1E1C);
}
</style>