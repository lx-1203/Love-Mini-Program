<script setup lang="ts">
import { computed } from "vue";
import type { UserProfileDTO } from "../../../types/profile";
import { IMAGE_PATHS } from "../../../config/images";
import { profileMetaParts } from "../../../utils/profile-meta";

const props = defineProps<{ profile: UserProfileDTO; online?: boolean }>();
const emit = defineEmits<{
  (e: "like"): void;
  (e: "message"): void;
  /** R2b-L06-D22：底栏恢复理想图的 3 枚布局后，「送心动卡」入口降级到身份卡。
   *  R7-L10-D04：身份卡右侧按理想图只留两枚胶囊，该入口再收进「打招呼」长按，
   *  上游 other.vue 的 @whisper → WhisperComposeSheet 链路不变。 */
  (e: "whisper"): void;
}>();

/** 在线状态：唯一来源（profile.online → prop）。
 *  R2b-L06-D12：此前画面上的「在线」胶囊其实来自第三行 distance-row（margin-top:16rpx 另起一行），
 *  姓名行的胶囊另有 v-if 分支，同一状态两个渲染源 → 位置漂移 + 文案重复。现在只保留姓名行这一处。
 *  R11-L10-D01（素材缺失 P1）：原来的 `?? true` 把「后端没给值」也渲染成「在线」，
 *  而本帧后端显式给 false（有设备会话但当前不活跃）时 v-if 整块塌陷、不留占位。
 *  改为三态真值：true=在线，false=离线，null/undefined=未知；三态都恒渲染一枚胶囊，
 *  不再用「在线」兜底编造状态，也不让这一格无声消失。 */
const onlineState = computed<"online" | "offline" | "unknown">(() => {
  const value = props.profile.online ?? props.online;
  if (value === true) return "online";
  if (value === false) return "offline";
  return "unknown";
});
const onlineLabel = computed(() =>
  onlineState.value === "online" ? "在线" : onlineState.value === "offline" ? "离线" : "未知",
);

/** 距离文案（理想图第三行本体只有 "2.3km"，「在线」不再在此重复 —— 见 D12） */
const distanceText = computed(() => props.profile.distanceText ?? "");

/** 基本信息行：年龄 · 学校 · 城市，与「我的页」MyHeader 共用 utils/profile-meta 的同一份口径
 *  （MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-001：两页原先同一份数据渲染成两种顺序）。 */
const basicInfo = computed(() => profileMetaParts(props.profile.basic));

const genderIconSrc = computed(() => {
  if (props.profile.basic.gender === "female") return IMAGE_PATHS.ICONS_EMOJI.GENDER_FEMALE;
  if (props.profile.basic.gender === "male") return IMAGE_PATHS.ICONS_EMOJI.GENDER_MALE;
  return "";
});
</script>

<template>
  <view class="public-identity">
    <view class="public-identity__main">
      <view class="public-identity__info">
        <view class="public-identity__name-row">
          <text class="public-identity__name">{{ profile.basic.name }}</text>
          <view v-if="genderIconSrc" class="public-identity__gender" :class="`public-identity__gender--${profile.basic.gender}`">
            <image class="public-identity__gender-symbol" :src="genderIconSrc" mode="aspectFit" alt="" />
          </view>
          <!-- R11-L10-D01：性别缺失时不再整块塌陷，给一枚恒渲染的「未填写」占位徽
               （与 :88「资料暂未完善」/ :99「距离待更新」同一口径，不编造性别）。 -->
          <view v-else class="public-identity__gender public-identity__gender--unknown" role="img" aria-label="性别未填写">
            <text class="public-identity__gender-unknown-text">未填写</text>
          </view>
          <!-- R11-L10-D01：在线胶囊恒渲染；true=在线 / false=离线 / 无值=未知，
               颜色与文案都跟随后端真值，缺值时不再整块消失。 -->
          <view class="public-identity__online" :class="`public-identity__online--${onlineState}`">
            <text class="public-identity__online-dot"></text>
            <text class="public-identity__online-text">{{ onlineLabel }}</text>
          </view>
        </view>
        <text v-if="profile.relation.matchScore" class="public-identity__match">
          匹配度 {{ profile.relation.matchScore }}%
        </text>
      </view>
      <view class="public-identity__actions">
        <!-- R2b-L06-D14：理想图身份卡右侧是上下叠放的两枚「图标 + 文字」胶囊
             （浅粉底粉字「喜欢」/ 浅绿底绿字「打招呼」）。实帧是两枚 80rpx 纯图标圆钮，
             没有任何文字标签，用户无法判断动作。配色沿用原注释口径，补齐 <text>。 -->
        <view class="public-identity__pill public-identity__pill--like" hover-class="public-identity__pill--pressed" @tap="emit('like')">
          <image class="public-identity__pill-icon" :src="IMAGE_PATHS.ICONS_V2.HEART_PINK" mode="aspectFit" alt="" />
          <text class="public-identity__pill-text public-identity__pill-text--like">喜欢</text>
        </view>
        <view
          class="public-identity__pill public-identity__pill--hello"
          hover-class="public-identity__pill--pressed"
          @tap="emit('message')"
          @longpress="emit('whisper')"
        >
          <image class="public-identity__pill-icon" :src="IMAGE_PATHS.ICONS_V2.CHAT_GREEN" mode="aspectFit" alt="" />
          <text class="public-identity__pill-text public-identity__pill-text--hello">打招呼</text>
        </view>
        <!-- R7-L10-D04（文案 P3）：理想图（素材/理想效果图/他人显示主页.png）身份卡右侧
             只有浅粉「喜欢」+ 浅绿「打招呼」上下两枚胶囊，规范 §3.9 同口径；实帧多出第三行
             「送心动卡」下划线文字链，把两枚的动作区切成三段。按缺陷卡建议把该入口并进
             「打招呼」长按（emit('whisper') 链路不变，other.vue → WhisperComposeSheet 照旧），
             身份卡回到理想图的两枚胶囊。 -->
      </view>
    </view>
    <!-- R2b-L06-D13：理想图姓名下方两行（「21岁 · 北京大学 · 北京」/「2.3km」）。
         原实现两行各挂 v-if，无数据时整块塌陷 → 身份卡比理想图矮一半。
         现在缺项只省略缺的那一段（profileMetaParts 已保证不产空段），全缺时给固定占位文案。 -->
    <view class="public-identity__meta-row">
      <template v-if="basicInfo.length">
        <template v-for="(part, index) in basicInfo" :key="part">
          <text v-if="index > 0" class="public-identity__meta-sep">·</text>
          <text class="public-identity__meta-item">{{ part }}</text>
        </template>
      </template>
      <text v-else class="public-identity__meta-item public-identity__meta-item--empty">资料暂未完善</text>
    </view>
    <!-- R10-L10-D03（需新建 P1）：第三行不再按 distanceText 有无整块开关。
         先纠正本文件旧注释的事实错误：后端 /profile/{id} **已经**有这两列
         （apps/api/.../profile/UserProfileDTO.java:36 `String distanceText` / :56 `Boolean online`，
         UserProfileController.java:179-195 仅在查看者未上报坐标、或两点超 300km 判为 GPS 漂移时给 null），
         ⇒ 真机上缺的是「值」不是「列」，前端不许编造距离（§6/§8），但必须给出「这格暂时取不到」的信号。
         落法：与 :88「资料暂未完善」同口径恒渲染，空值固定占位「距离待更新」。
         「在线」胶囊按 R11-L10-D01 改为三态恒渲染（true=在线 / false=离线 / 无值=未知）；
         仍不采纳「缺省兜底 true」——那等于给离线用户伪造在线状态。 -->
    <view class="public-identity__distance-row">
      <text class="public-identity__distance-text">{{ distanceText || "距离待更新" }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.public-identity {
  /* R10-L10-D07（间距 P2）：横向外边距原 40rpx，而本页其余五张卡（PublicBio:14 /
     PublicInterest:36 / PublicCommon:107 / PublicGallery:70）都是 24rpx，两档都不等于
     §1.4 的 --page-padding = 32rpx ⇒ 卡缘不成一条竖边。本车道可改文件集只有这一份，
     按缺陷卡落点把身份卡收到 var(--page-padding)（帧上身份卡左缘 21px→16px，
     与页头返回键、shop/wallet 同页边距档取齐）；其余五张卡不在本轮派发集内（见交付「跨车道遗留」）。 */
  margin: -72rpx var(--page-padding, 32rpx) 0;
  /* R10-L10-D01（位置 P1）：padding-top 148rpx 把 __main 推到 y≈716rpx（卡顶 568 + 148），
     而头像下缘在 680rpx ⇒ 姓名/资料整块落在头像之外，身份卡读成「头像→姓名→资料」竖排，
     不是 §3.9 的「头像在左 + 右侧文字」两栏。卡顶到头像下缘的可见带 = 568..680 = 112rpx，
     姓名行 38rpx 居中于该带 ⇒ 起点 568+(112-38)/2 ≈ 605 ⇒ padding-top 40rpx。
     头像骑压量（bottom:-40rpx，绝对下探 112rpx）不动，见 PublicHero.vue:84。 */
  padding: 40rpx 32rpx 28rpx;
  border-radius: 40rpx;
  background: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 4;
}

.public-identity__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
  /* R10-L10-D01（位置 P1）：D01 的第二半 —— 只收 padding-top 会让姓名行横着插进头像里。
     头像左缘 40rpx + 144rpx（border-box，含描边）= 右缘 184rpx；本行内容原本从
     卡左缘 32 + 卡内衬 32 = 64rpx 起排 ⇒ 需再让 184 - 64 + 12（留缝）= 132rpx。
     缺陷卡给的 ≈120rpx 是按旧 176rpx 头像算的（右缘 216 ⇒ 起点 192 也够），
     但 D02 已把头像收到 144rpx，120rpx 只剩 8rpx 缝、且与 D07 的卡左缘 32rpx 叠加后
     会重新咬上头像 ⇒ 按真实几何取 132rpx（起点 196rpx，离头像右缘 12rpx）。
     右侧胶囊列走 justify-content:space-between，仍贴卡内右缘，不受本行左内衬影响。 */
  padding-left: 132rpx;
}

.public-identity__info {
  flex: 1;
  min-width: 0;
}

.public-identity__name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.public-identity__name {
  /* R9-L10-D03（字号 P2）：原 44rpx 在本帧渲染成 ≈19.3px/378px=5.1% 屏宽，比基准
     4% 放大约一档半；降到 --fs-2xl=32rpx（≈16.1px/378px=4.3%）。注：--fs-3xl 实值
     36rpx（design-variables.scss:567），不是缺陷卡里写的 40rpx。 */
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: #333A37;
  line-height: 1.2;
}

/* 性别徽章：20×20px 圆形底色 + 白色符号（男蓝 #54A0FF / 女粉 #FF6B81） */
.public-identity__gender {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.public-identity__gender--male {
  background: #54A0FF;
}

.public-identity__gender--female {
  background: #FF6B81;
}

.public-identity__gender-symbol {
  width: 26rpx;
  height: 26rpx;
  color: #ffffff;
}

/* R11-L10-D01：性别缺失时的中性占位徽（不再是彩色圆形徽，也不伪造 ♂/♀）。
   深灰字压浅灰底 ≥4.5:1，与在线胶囊同高（40rpx）以保持姓名行基线一致。 */
.public-identity__gender--unknown {
  width: auto;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: var(--c-line, #EEF2F0);
}

.public-identity__gender-unknown-text {
  font-size: 20rpx;
  line-height: 1;
  font-weight: 500;
  color: var(--c-text-secondary, #4A524E);
}

.public-identity__online {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #E8FBF3;
}

.public-identity__online-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #36C99A;
}

.public-identity__online-text {
  font-size: 20rpx;
  color: #36C99A;
  font-weight: 500;
}

/* R11-L10-D01：离线/未知两态用中性灰（复用 --c-line 令牌），与「在线」绿区分；
   文字取二级文本色 #4A524E 压 #EEF2F0 ≈ 7.1:1，不引入新的低对比读数。 */
.public-identity__online--offline,
.public-identity__online--unknown {
  background: var(--c-line, #EEF2F0);
}

.public-identity__online--offline .public-identity__online-dot,
.public-identity__online--unknown .public-identity__online-dot {
  background: var(--c-text-secondary, #4A524E);
}

.public-identity__online--offline .public-identity__online-text,
.public-identity__online--unknown .public-identity__online-text {
  color: var(--c-text-secondary, #4A524E);
}

.public-identity__match {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #FF6B81;
  font-weight: 500;
}

/* 右侧动作组（R2b-L06-D14）：上下叠放的「喜欢 / 打招呼」文字胶囊 + 次级「送心动卡」文字链。
   配色：浅粉 tint + --c-love 文字 / 浅绿 tint + 品牌绿文字（与理想图一致，不做实心强调）。 */
.public-identity__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
  flex-shrink: 0;
}

.public-identity__pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  /* R10-L10-D08（可达性 P2）：身份卡「喜欢」「打招呼」是首屏两枚主操作，原 56rpx=28.3px
     只有同页底栏同名两枚按钮（RelationshipCTA.vue:97 的 92rpx）的六成，
     帧内可见带实测 ≈30px / ≈20px（含内衬不足 88rpx 档的一半）。
     提到 88rpx=44.4px（= 全站最小可点档，与 shop/detail 的命中盒同档）；
     图标 28rpx / 文字 --fs-sm 均不动，靠既有 flex 居中吸收多出的 16rpx 上下留白，
     胶囊宽度由 padding 0 20rpx 决定 ⇒ 视觉体量变大但不改字号、不改配色角色。 */
  height: 88rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
}

.public-identity__pill--pressed {
  transform: scale(0.96);
}

.public-identity__pill--like {
  background: var(--c-tint-pink-50, #FCE4EC);
}

.public-identity__pill--hello {
  /* 与本文件「在线」胶囊同档浅绿底（保持卡内两处 tint 逐字一致） */
  background: #E8FBF3;
}

.public-identity__pill-icon {
  width: 28rpx;
  height: 28rpx;
}

.public-identity__pill-text {
  font-size: var(--fs-sm, 22rpx);
  font-weight: 600;
}

.public-identity__pill-text--like {
  /* R10-L10-D04（颜色token P2）：判点成立（#B3264A 是 R9 自造的私有色），但卡上两条改法
     对着真实令牌表都不达标 ⇒ 本条登记「未修」，色值维持 R9 档，理由写在这里当登记处：
     ① 选项「--c-romance-700 #CC4A5F 配更深一档 tint 底」实测：压现底 --c-tint-pink-50 #FCE4EC
        = 3.70:1、压 romance-50 #FFECEF = 3.93:1（底更深只会更低），全部 <4.5:1 ⇒
        照改等于把 R9-L10-D05 刚修好的可达性轴退回去（已知机制 §2「对比度要算，不要看着改」）。
        现值 #B3264A（L=0.11465）压 #FCE4EC = 5.30:1，是这一格目前唯一的达标档。
     ② 粉族到 700 就是表内最深档（design-variables.scss:43 $romance-700，无 800/900），
        要在浅粉底上同时满足「禁私有色 + ≥4.5:1」必须新增一枚 --c-romance-800（≈#B3264A），
        那是 theme/design-variables.scss，不在本车道可改文件集（硬规矩 1）。
     ⇒ 缺的东西点名：theme 粉族深档令牌 --c-romance-800。补齐后本行换成 var(--c-romance-800) 即可。
     （R9-L10-D05 原注：--c-love #FF6B81 压 #FCE4EC = 2.27:1，22rpx 标签不达 4.5:1，故当时取深色。） */
  color: #B3264A;
}

.public-identity__pill-text--hello {
  /* R9-L10-D05：--c-brand #36C99A 压 #E8FBF3 = 1.96:1；--c-brand-700 #1F8D6A 仅 3.85:1（仍不达标），
     取 --c-brand-800 #156B51 = 6.00:1（design-variables.scss:18）。 */
  color: var(--c-brand-800, #156B51);
}

/* R7-L10-D04：.public-identity__whisper / --whisper--pressed / --whisper-text 三条规则
   随「送心动卡」文字链一并删除（入口已并入打招呼长按），不留无节点可选的死选择器。 */

/* 基本信息行：13px 文字，· 分隔 */
.public-identity__meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 20rpx;
}

.public-identity__meta-item {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-tertiary, #6B7571);
}

.public-identity__meta-item--empty {
  /* R9-L10-D04（可达性 P1）：「资料暂未完善」是解释年龄/学校/城市整排缺席的唯一正文行，
     原 --c-text-quaternary #9AA39F 压白卡 = 2.59:1（低于 3:1 非文字底线，更低于 4.5:1 正文线）。
     改 tertiary #6B7571：对 #FFFFFF = 4.76:1（design-variables.scss:125），达正文级。 */
  color: var(--c-text-tertiary, #6B7571);
}

.public-identity__meta-sep {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-line, #EEF2F0);
}

/* 距离行（R2b-L06-D12/D13）：理想图第三行是普通灰字（"2.3km"），
   不再是绿色胶囊 —— 绿色胶囊只用于姓名行的「在线」，避免同一状态两种渲染。 */
.public-identity__distance-row {
  display: inline-flex;
  align-items: center;
  margin-top: 8rpx;
}

.public-identity__distance-text {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-tertiary, #6B7571);
}
</style>
