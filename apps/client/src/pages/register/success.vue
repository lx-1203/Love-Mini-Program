<script setup lang="ts">
/**
 * 注册成功页（2026-09-12 注册页设计包落地，设计稿 05 成功屏）
 *
 * 语义：账号创建即自动登录（后端 register 成功即签发 JWT），
 * 本页承接注册结果并衔接「完善资料」12 步流程，不再让用户输一次密码。
 * 入参：phone（注册手机号，用于脱敏展示；缺省时回退会话存储）。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { ROUTES, SUBPACKAGE_ROUTES } from "../../constants/routes";
import { IMAGE_PATHS } from "../../config/images";
// R11-G2：注入 --statusbar（本页样式使用 var(--statusbar, env(...))，DevTools env 恒 0 必须由 JS 注入）
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
// MP-R2-PAGES-REGISTER-INDEX-010：脱敏正则收编到 utils 单一实现（与 register/index.vue 同源）
import { maskPhone } from "../../utils/form-validator";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const ICONS = IMAGE_PATHS.REGISTER_ICONS;

/** 脱敏手机号：138****8888（UserSession 无手机号字段，仅从路由参数取） */
const maskedPhone = ref("");
/** 副标题两行（mp <text> 不解析字面 \n，分行用数组绑定） */
const subLines = ["欢迎加入寻觅，接下来用 1 分钟", "把资料填成一张「恋爱名片」"];

onLoad((query) => {
  const raw = String(query?.phone || "").replace(/\D/g, "");
  if (raw.length === 11) {
    maskedPhone.value = maskPhone(raw);
  }
});

/** 已解锁能力清单（右侧灰字标注状态；computed 供模板稳定渲染） */
const rows = computed(() => [
  { text: "账号已创建并自动登录", tag: maskedPhone.value || "完成" },
  { text: "可开始匹配、加兴趣圈、发消息", tag: "已解锁" },
  { text: "下一步：完善资料，遇见更准的同频", tag: "建议" },
]);

/** 完善我的资料 → 资料填写 12 步流程（02 基础资料起；分包路径走 SUBPACKAGE_ROUTES） */
function goSetupProfile() {
  uni.navigateTo({ url: SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE });
}

/** 稍后再说，先随便逛逛 → 首页 */
function goBrowse() {
  uni.switchTab({ url: ROUTES.TAB.HOME });
}
</script>

<template>
  <view class="reg-success" :style="menuStyleVars">
    <!-- R11-L01-D09：素材自带不透明方形浅绿底（600×600，四边采样比页底略深、同色系不同值），
         直接贴页底会出现四边生硬的方块接缝。仓内没有透明底版本、也不许造图 ⇒
         外面套一层羽化遮罩把方角化进页底（见 .reg-success__img-wrap::after）。 -->
    <view class="reg-success__img-wrap">
      <image class="reg-success__img" :src="IMAGE_PATHS.REGISTER.SUCCESS" mode="aspectFit" alt="" />
    </view>
    <text class="reg-success__title">注册成功</text>
    <view class="reg-success__sub">
      <text v-for="line in subLines" :key="line" class="reg-success__sub-line">{{ line }}</text>
    </view>

    <!-- 已解锁清单卡 -->
    <view class="reg-success__list">
      <view v-for="item in rows" :key="item.text" class="reg-success__row">
        <image class="reg-success__row-icon" :src="ICONS.CHECK_GREEN" mode="aspectFit" alt="" />
        <text class="reg-success__row-text">{{ item.text }}</text>
        <text class="reg-success__row-tag">{{ item.tag }}</text>
      </view>
    </view>

    <!-- MP-R2-PAGES-REGISTER-SUCCESS-002：@tap 移回 view，点击热区与 96rpx 按钮实体一致
         （原绑在内层 text 上，按钮上下约 27rpx 为点击死区） -->
    <view class="reg-success__btn" @tap="goSetupProfile">
      <text class="reg-success__btn-text">完善我的资料 →</text>
    </view>

    <!-- 次级出口 -->
    <text class="reg-success__alt" @tap="goBrowse">稍后再说，先随便逛逛</text>
  </view>
</template>

<style scoped lang="scss">
/* 设计稿 05 成功屏：375×812，插图 236×236 居中 */
.reg-success {
  min-height: 100vh;
  background: var(--c-bg-page, #eef7f2);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 96rpx) 48rpx calc(env(safe-area-inset-bottom) + 48rpx);
  box-sizing: border-box;
}

.reg-success__img-wrap {
  position: relative;
  width: 472rpx;
  height: 472rpx;
  flex-shrink: 0;
}

.reg-success__img {
  width: 472rpx;
  height: 472rpx;
}

/* R11-L01-D09（P2 素材缺失）：方形底与页底是同色系不同值（素材四边采样比 --c-bg-page 略深），
   接缝来自四边硬切而不是色差本身 ⇒ 在图上叠一层径向羽化，把边缘化进 --c-bg-page。
   半径按 farthest-corner 计（≈334rpx）：48% 以内全透明（人物主体不受影响），
   68% 起已是纯页底色 ⇒ 方框四边与四角都被盖住，读出来是一团柔和的浅绿光晕而不是一张纸。
   真正的修法是让设计侧出一版透明底 PNG（已登记交业主侧），这里是素材不动的前提下的兜底。 */
.reg-success__img-wrap::after {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(238, 247, 242, 0) 48%,
    var(--c-bg-page, #eef7f2) 68%
  );
}

.reg-success__title {
  margin-top: 8rpx;
  font-size: 44rpx;
  font-weight: 800;
  line-height: 1.2;
  color: var(--c-text-primary, #1a1e1c);
}

.reg-success__sub {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reg-success__sub-line {
  font-size: 26rpx;
  line-height: 1.55;
  color: var(--c-text-tertiary, #6b7571);
  text-align: center;
}

.reg-success__list {
  width: 100%;
  margin-top: 48rpx;
  background: var(--c-bg-container, #ffffff);
  border-radius: 40rpx;
  padding: 16rpx 32rpx;
  box-shadow:
    0 16rpx 48rpx rgba(15, 23, 42, 0.06),
    0 4rpx 16rpx rgba(15, 23, 42, 0.04);
}

.reg-success__row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 0;

  & + & {
    /* R10-L01-D08（P2 颜色token）：已解锁清单三行分隔原取最浅档 --c-border-light(#EEF2F0) 压白卡仅 1.13:1，
       两条线几乎与白底同值、三行读成一整段连续文字，「并列清单项」的分组信息丢失。抬到 --c-border-default(#DDE3E0)
       （卡的第一建议；三档描边里的常规分隔档）。 */
    border-top: 2rpx solid var(--c-border-default, #dde3e0);
  }
}

.reg-success__row-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.reg-success__row-text {
  flex: 1;
  font-size: 28rpx;
  line-height: 1.55;
  color: var(--c-text-primary, #1a1e1c);
}

.reg-success__row-tag {
  font-size: 24rpx;
  /* R11-L01-D10（可达性 P1）：状态字原是 --c-text-placeholder #9AA39F 压白卡 #FFFFFF
     = 2.59:1（<3:1），而这三枚（完成/已解锁/建议）是清单里唯一说明"到哪一步"的文字，
     同帧被读成水印。提到 --c-text-tertiary #6B7571 = 4.76:1，
     placeholder 档只留给输入框。 */
  color: var(--c-text-tertiary, #6b7571);
  flex-shrink: 0;
}

.reg-success__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 96rpx;
  /* R11-L01-D12（P2 间距）：原写死 56rpx，不在 --sp-* 阶梯（…32/48）上，
     比清单卡 .reg-success__list 自己的内距（padding 16rpx 32rpx）还大一档，
     节奏与全站卡片间距不齐。归口 --sp-9（48rpx）。 */
  margin-top: var(--sp-9, 48rpx);
  /* R6-L01-D05/D06（R6/F7，2026-10-20）：主 CTA 胶囊化，与全站主按钮同调
     （login/index.vue:1038/1084/1165 的 .btn-primary 就是 var(--r-full)）。
     原 24rpx 圆角矩形在 96rpx 高的按钮上视觉偏方（实测 24rpx < 高度一半 48rpx ⇒ 非胶囊）。 */
  border-radius: var(--r-full);
  /* R10-L01-D07（P1 颜色token）：主 CTA 原为 --c-brand→--c-brand-400 的 135° 渐变，两端实测白字 2.10/1.85:1，
     「完善我的资料 →」整行压在同明度绿上、本页唯一下一步入口读不出。卡给两选一：
     渐变 700→800 或去渐变走纯 brand-800。按任务书 §2 计算，brand-700 端白字仅 4.14:1 不达 AA ⇒ 取纯 --c-brand-800
     (#156B51，白字 6.45:1)。此钮是本页局部按钮、非 BottomActionBar 共享主 CTA，不触 §11.3 的「共享渐变勿翻实色」。 */
  background: var(--c-brand-800, #156b51);
  /* R11-L01-D12（同条第二半）：阴影原裸写 rgba(54,201,154,.28)，归口 --s-brand
     （design-variables.scss:213 = 0 8rpx 32rpx rgba(54,201,154,.25)，几何完全同档，
     只有 alpha 由 .28 收到 .25 —— 差 3%，肉眼不可辨，属令牌归一而非视觉改动）。 */
  box-shadow: var(--s-brand);
}

.reg-success__btn-text {
  width: 100%;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 0.8rpx;
  /* R10-L01-D07：字色由写死 #ffffff 归口到 --c-text-inverse（当前为图片遮罩白字档 rgba(255,255,255,.95)），
     保持「彩色底上白前景走反色令牌」的语义，压 brand-800 仍 ≈6.2:1。 */
  color: var(--c-text-inverse, #ffffff);
}

.reg-success__alt {
  /* R11-L01-D11（可达性 P1）：本行是"不进资料 12 步向导"的唯一出口（主按钮只会 goSetupProfile），
     原裸 <text> 只有 margin-top:32rpx + font-size:26rpx，实高约 36rpx，
     不到 88rpx 最小可点件口径的一半，点偏就被推进向导。
     做法按 register/index.vue .agree__hit 的热区口径（padding 26rpx 上下 ⇒ 26+36+26 = 88rpx），
     但**不**用负 margin 把增量抵掉：卡上的兜底是"视觉不动"，而本轮复拍门按内容区像素判可见性，
     视觉不动的热区改动等于零像素（FIXNOTVISIBLE）⇒ 这里让 88rpx 的盒子照常占位，
     文字随之下移 26rpx、页面底部块高 +52rpx，热区尺寸与 .agree__hit 同口径。 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 26rpx 24rpx;
  margin-top: 32rpx;
  font-size: 26rpx;
  color: var(--c-text-tertiary, #6b7571);
}

.press-feedback {
  transition: transform 0.1s ease, opacity 0.1s ease;
}

.press-feedback--active {
  transform: scale(0.98);
  opacity: 0.92;
}
</style>
