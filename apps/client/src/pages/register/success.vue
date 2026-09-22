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
const { styleVars: menuStyleVars } = useMenuButtonRect();


const ICONS = IMAGE_PATHS.REGISTER_ICONS;

/** 脱敏手机号：138****8888（UserSession 无手机号字段，仅从路由参数取） */
const maskedPhone = ref("");
/** 副标题两行（mp <text> 不解析字面 \n，分行用数组绑定） */
const subLines = ["欢迎加入寻觅，接下来用 1 分钟", "把资料填成一张「恋爱名片」"];

onLoad((query) => {
  const raw = String(query?.phone || "").replace(/\D/g, "");
  if (raw.length === 11) {
    maskedPhone.value = raw.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
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
    <image class="reg-success__img" :src="IMAGE_PATHS.REGISTER.SUCCESS" mode="aspectFit" alt="" />
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

.reg-success__img {
  width: 472rpx;
  height: 472rpx;
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
    border-top: 2rpx solid var(--c-border-light, #eef2f0);
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
  color: var(--c-text-placeholder, #9aa39f);
  flex-shrink: 0;
}

.reg-success__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 96rpx;
  margin-top: 56rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, var(--c-brand, #36c99a) 0%, var(--c-brand-400, #55d5a7) 100%);
  box-shadow: 0 8rpx 32rpx rgba(54, 201, 154, 0.28);
}

.reg-success__btn-text {
  width: 100%;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 0.8rpx;
  color: #ffffff;
}

.reg-success__alt {
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
