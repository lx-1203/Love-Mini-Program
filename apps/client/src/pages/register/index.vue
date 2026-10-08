<script setup lang="ts">
/**
 * 注册页（2026-09-12 注册页设计包落地）
 *
 * 设计稿：deliverables/注册页/寻觅注册页-高保真设计稿.html（01 默认 / 07 契约对齐变体合并实现）
 * 设计规范：deliverables/注册页/寻觅注册页-设计规范.md
 *
 * 契约决策（设计稿 §10 拍板记录）：采用方案 B（契约对齐变体）——
 * 后端 POST /v1/auth/register 要求 nickname/birthDate 必填（3-N 未成年人保护，
 * 未满 18 返 403 MINOR_NOT_ALLOWED），且完善资料流程不收集出生日期，
 * 故注册页在四要素（手机号/验证码/密码/协议）基础上补昵称 + 出生日期，
 * 视觉语言与设计稿 01 主屏一致（07 变体的字段样式）。
 *
 * 链路镜像登录页（P0-32）：注册成功即自动登录（JWT 已落 storage），
 * 主动 sessionStore.refreshSession() 消除「已登录但页面认为未登录」间隙。
 *
 * 文案（MP-R2-PAGES-REGISTER-INDEX-013）：校验/toast 文案一律取 t("register.*")，
 * zh-CN/en-US 成对维护；键值逐字抄自设计规范 §7 错误文案表，§7 未列的几条
 * （密码 20 位上限、确认密码为空、昵称必填/超长、生日必填）取自 §1.3 字段清单
 * 与上文契约决策段。仍为中文硬编码的只剩模板展示文案（标题、字段标签、占位符、
 * 强度档位弱/中/强）——§7 只规范错误文案，这类不在本行判据内。
 */
import { computed, ref, onUnmounted } from "vue";
// MP-R2-PAGES-REGISTER-INDEX-013：本页校验/toast 文案全部经 t()（键见 i18n/locales
// 的 register 命名空间，zh-CN/en-US 成对维护），不再在组件内硬编码中文校验文案
import { useI18n } from "vue-i18n";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { ROUTES, SUBPACKAGE_ROUTES } from "../../constants/routes";
// MP-R2-PAGES-REGISTER-INDEX-002：注入 --statusbar（与 login/success 同模式；
// DevTools env 恒 0，样式层 calc(var(--statusbar,...)) 必须由 JS 注入才有真机补偿值）
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
import { IMAGE_PATHS } from "../../config/images";
import { registerUser, sendSmsCode } from "../../services/auth";
// 2026-10-05 合规接线：注册请求体携带 agreedLegalVersion（后端落库留存）
import { fetchAgreedLegalVersion } from "../../services/config";
import { AppApiError } from "../../services/api-error";
import { useAppConfigStore } from "../../stores/app-config";
import { useSessionStore } from "../../stores/session";
import { addBreadcrumb, captureException } from "../../services/sentry";
import { createButtonGuard } from "../../utils/debounce";
// MP-R2-PAGES-REGISTER-INDEX-010：脱敏正则收编到 utils 单一实现（与 success.vue 同源）
import { maskPhone } from "../../utils/form-validator";
import { isDev, isMockMode } from "../../config/env";

// 使用 vue-i18n 组合式 API 获取 t 函数（组件内优先使用 useI18n 而非全局 t）
const { t } = useI18n();

const ICONS = IMAGE_PATHS.REGISTER_ICONS;

const appConfigStore = useAppConfigStore();
const { isRegisterOpen } = storeToRefs(appConfigStore);
const sessionStore = useSessionStore();
// MP-R2-PAGES-REGISTER-INDEX-002：--statusbar 注入到页面根节点
const { styleVars: menuStyleVars } = useMenuButtonRect();

/* ---------------- 表单状态 ---------------- */
/** 手机号（显示态：自动格式化 138 8888 8888） */
const phone = ref("");
const smsCode = ref("");
const password = ref("");
const confirmPassword = ref("");
/** 昵称（后端契约必填 1-20 字） */
const nickname = ref("");
/** 出生日期（3-N 未成年人保护：picker mode=date，end=今天） */
const birthDate = ref("");
/** 协议：进入页面一律未勾选，不预选（合规要求） */
const agreed = ref(false);

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const focusField = ref("");

type FieldKey = "phone" | "sms" | "password" | "confirm" | "nickname" | "birth";
/** 行内错误（管「哪个字段错了」，Toast 管「整次结果」，行内优先） */
const errors = ref<Record<FieldKey, string>>({
  phone: "",
  sms: "",
  password: "",
  confirm: "",
  nickname: "",
  birth: "",
});
/** 抖动中的字段（错误定位：红框 + 抖动 4px × 2） */
const shakeField = ref<FieldKey | "">("");
let shakeTimer: ReturnType<typeof setTimeout> | null = null;
/** 协议勾选框抖动（未勾选点注册） */
const agreeShake = ref(false);
let agreeShakeTimer: ReturnType<typeof setTimeout> | null = null;
/** 手机号已注册：出现「用这个手机号登录」次级出口 */
const phoneRegistered = ref(false);

/* ---------------- 验证码 ---------------- */
const smsSending = ref(false);
/** 倒计时剩余秒数（时间戳基准：endTime = Date.now() + 60000，
 *  小程序切后台 setInterval 冻结也不产生假倒计时，回前台按剩余时间刷新） */
const smsCountdown = ref(0);
let smsEndTime = 0;
let smsTimer: ReturnType<typeof setInterval> | null = null;

/* ---------------- 提交 ---------------- */
const submitting = ref(false);

/* ---------------- 派生状态 ---------------- */
const phoneRaw = computed(() => phone.value.replace(/\s/g, ""));
const phoneValid = computed(() => /^1[3-9]\d{9}$/.test(phoneRaw.value));

const today = computed(() => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
});

/** 年龄是否已满 18 周岁（客户端预检，后端 AgePolicy 兜底） */
function isAdult(dateStr: string): boolean {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return false;
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const adultSince = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
  return d.getTime() <= adultSince.getTime();
}

/** 密码强度 0-3（设计规范 §5.3） */
const pwdStrength = computed(() => {
  const v = password.value;
  if (!v) return 0;
  const hasLetter = /[A-Za-z]/.test(v);
  const hasDigit = /\d/.test(v);
  const hasSymbol = /[^A-Za-z0-9]/.test(v);
  const hasCase = /[a-z]/.test(v) && /[A-Z]/.test(v);
  if (v.length >= 10 && hasLetter && hasDigit && (hasSymbol || hasCase)) return 3;
  if (v.length >= 8 && hasLetter && hasDigit) return 2;
  return 1;
});
// MP-R2-PAGES-REGISTER-INDEX-005：色值改走 CSS 变量（内联 :style 支持 var()），
// 不再硬编码 hex——深色主题/品牌色调整时自动跟随
const PWD_STRENGTH_META = [
  { label: "", color: "", text: "" },
  { label: "弱", color: "var(--c-error, #E5454D)", text: "var(--c-error, #E5454D)" },
  { label: "中", color: "var(--c-warning, #F59E0B)", text: "var(--c-warning, #B87400)" },
  { label: "强", color: "var(--c-brand, #36C99A)", text: "var(--c-brand-700, #1F8D6A)" },
];

/** 按强度取样式元数据（noUncheckedIndexedAccess 下索引访问为 T|undefined，越界回退空样式） */
function pwdStrengthMeta(i: number): { label: string; color: string; text: string } {
  return PWD_STRENGTH_META[i] ?? { label: "", color: "", text: "" };
}

/** 表单是否完整（按钮置灰态仍可点，给出「哪里没填对」定位提示） */
const formComplete = computed(() =>
  phoneValid.value &&
  /^\d{6}$/.test(smsCode.value) &&
  validatePassword(password.value) === "" &&
  confirmPassword.value === password.value &&
  nickname.value.trim().length >= 1 &&
  !!birthDate.value &&
  agreed.value,
);

/* ---------------- 输入处理 ---------------- */
// 事件参数统一按 `Event & { detail? }` 声明：
// uni input 的原生事件基型是 Event，detail 为 uni 扩展字段，运行时由 uni 注入。
function onPhoneInput(e: Event & { detail?: { value?: string } }) {
  const digits = String(e.detail?.value ?? "").replace(/\D/g, "").slice(0, 11);
  // 自动格式化 3-4-4：138 8888 8888
  phone.value = digits.replace(/(\d{3})(\d{1,4})?(\d{1,4})?/, (_m, a: string, b?: string, c?: string) =>
    [a, b, c].filter(Boolean).join(" "),
  );
  if (errors.value.phone) errors.value.phone = "";
  // MP-R2-PAGES-REGISTER-INDEX-004：号码内容变化即认为「已注册」结论失效，
  // 与 clearPhone 的复位口径对齐（否则「用这个手机号登录」出口仍指向旧号码语境）
  if (phoneRegistered.value) phoneRegistered.value = false;
}

function onSmsInput(e: Event & { detail?: { value?: string } }) {
  smsCode.value = String(e.detail?.value ?? "").replace(/\D/g, "").slice(0, 6);
  if (errors.value.sms) errors.value.sms = "";
}

function onPasswordInput(e: Event & { detail?: { value?: string } }) {
  password.value = String(e.detail?.value ?? "").replace(/\s/g, "");
  if (errors.value.password) errors.value.password = "";
}

function onConfirmInput(e: Event & { detail?: { value?: string } }) {
  confirmPassword.value = String(e.detail?.value ?? "").replace(/\s/g, "");
  // MP-R2-PAGES-REGISTER-INDEX-012：@input 只负责「已有错误时清除」，不再即时比对置错
  // （原实现边打字边红框，用户还没打完第二遍密码就被判错）
  if (errors.value.confirm) errors.value.confirm = "";
}

/**
 * MP-R2-PAGES-REGISTER-INDEX-012：密码一致性比对时机从 @input 迁到 @blur
 * （设计规范 §6.1「失焦后比对」），并在此复位 focusField（原模板 @blur 为内联赋值）。
 */
function onConfirmBlur() {
  focusField.value = "";
  if (password.value && confirmPassword.value) {
    errors.value.confirm = confirmPassword.value === password.value ? "" : t("register.errPasswordMismatch");
  } else if (errors.value.confirm) {
    errors.value.confirm = "";
  }
}

function onNicknameInput(e: Event & { detail?: { value?: string } }) {
  nickname.value = String(e.detail?.value ?? "");
  if (errors.value.nickname) errors.value.nickname = "";
}

function onBirthChange(e: { detail: { value: string } }) {
  birthDate.value = String(e.detail.value || "");
  if (errors.value.birth) errors.value.birth = "";
}

function clearPhone() {
  phone.value = "";
  errors.value.phone = "";
  phoneRegistered.value = false;
}

/* ---------------- 校验（文案表：设计规范 §7） ---------------- */
function validatePassword(v: string): string {
  if (!v) return t("register.errPasswordRequired");
  if (v.length < 8) return t("register.errPasswordWeak");
  if (v.length > 20) return t("register.errPasswordMax");
  if (/\s/.test(v) || /[\uFF00-\uFFEF]/.test(v)) return t("register.errPasswordNoSpace");
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return t("register.errPasswordLetterDigit");
  return "";
}

/** 逐项校验，返回首个错误（手机号 → 验证码 → 密码 → 确认密码 → 昵称 → 生日 → 协议）；无错误时 field 为 null */
function validateFirstError(): { field: FieldKey | "agree" | null; message: string } {
  if (!phoneRaw.value) return { field: "phone", message: t("register.errPhoneRequired") };
  if (!phoneValid.value) return { field: "phone", message: t("register.errPhoneFormat") };
  if (!smsCode.value) return { field: "sms", message: t("register.errSmsRequired") };
  if (!/^\d{6}$/.test(smsCode.value)) return { field: "sms", message: t("register.errSmsLength") };
  const pwdError = validatePassword(password.value);
  if (pwdError) return { field: "password", message: pwdError };
  if (!confirmPassword.value) return { field: "confirm", message: t("register.errConfirmRequired") };
  if (confirmPassword.value !== password.value) return { field: "confirm", message: t("register.errPasswordMismatch") };
  if (!nickname.value.trim()) return { field: "nickname", message: t("register.errNicknameRequired") };
  if (nickname.value.trim().length > 20) return { field: "nickname", message: t("register.errNicknameMax") };
  if (!birthDate.value) return { field: "birth", message: t("register.errBirthRequired") };
  if (!isAdult(birthDate.value)) return { field: "birth", message: t("register.errMinorBlocked") };
  if (!agreed.value) return { field: "agree", message: t("register.errAgreeRequired") };
  return { field: null, message: "" };
}

function shake(field: FieldKey | "agree") {
  if (field === "agree") {
    agreeShake.value = false;
    if (agreeShakeTimer) clearTimeout(agreeShakeTimer);
    // 强制重启动画：先摘掉类，下一帧再挂上
    agreeShakeTimer = setTimeout(() => {
      agreeShake.value = true;
      agreeShakeTimer = setTimeout(() => {
        agreeShake.value = false;
      }, 400);
    }, 30);
    return;
  }
  shakeField.value = "";
  if (shakeTimer) clearTimeout(shakeTimer);
  shakeTimer = setTimeout(() => {
    shakeField.value = field;
    shakeTimer = setTimeout(() => {
      shakeField.value = "";
    }, 400);
  }, 30);
}

function toast(message: string, duration = 2000) {
  uni.showToast({ title: message, icon: "none", duration });
}

/* ---------------- 验证码链路（设计规范 §6.2） ---------------- */
async function handleSendSms() {
  if (smsSending.value || smsCountdown.value > 0 || submitting.value) return;
  if (!phoneValid.value) {
    errors.value.phone = t("register.errPhoneFormat");
    shake("phone");
    toast(t("register.toastPhoneRequired"));
    return;
  }
  smsSending.value = true;
  try {
    const res = await sendSmsCode(phoneRaw.value);
    if (res?.success === false && res.message) {
      toast(res.message);
      return;
    }
    // 模拟短信：提示 mockCode。MP-R1-PAGES-REGISTER-INDEX-009：与登录页同口径
    // （login showMockCode）——mockCode 仅 isDev || isMockMode() 展示，真实构建
    // 不得向用户明文 toast 验证码本体（后端 SmsCodeController 当前恒返回 mockCode）。
    const masked = maskPhone(phoneRaw.value);
    const showMockCode = Boolean(res?.mockCode) && (isDev || isMockMode());
    toast(
      showMockCode ? t("register.smsSentMock", { code: res?.mockCode }) : t("register.smsSent", { phone: masked }),
      1500,
    );
    smsEndTime = Date.now() + 60_000;
    smsCountdown.value = 60;
    if (smsTimer) clearInterval(smsTimer);
    smsTimer = setInterval(() => {
      smsCountdown.value = Math.max(0, Math.ceil((smsEndTime - Date.now()) / 1000));
      if (smsCountdown.value <= 0 && smsTimer) {
        clearInterval(smsTimer);
        smsTimer = null;
      }
    }, 500);
  } catch (error) {
    toast(error instanceof Error && error.message ? error.message : t("register.networkError"));
  } finally {
    smsSending.value = false;
  }
}

// MP-R2-PAGES-REGISTER-INDEX-003：B6 兜底跳转定时器保存引用——
// ① onUnmounted 可取消（原实现 800ms 窗口内离开页面后 goLogin 仍执行，
//    navigateBack/reLaunch 语义在页面出栈后失真）；② onShow 重入先取消防叠加。
let b6ExitTimer: ReturnType<typeof setTimeout> | null = null;

onShow(() => {
  // 时间戳基准：回前台按剩余时间刷新（切后台 setInterval 冻结场景）
  if (smsEndTime > Date.now()) {
    smsCountdown.value = Math.max(0, Math.ceil((smsEndTime - Date.now()) / 1000));
  } else if (smsEndTime > 0) {
    smsCountdown.value = 0;
    smsEndTime = 0;
  }
  // B6：注册功能被后台关闭（register_open=false）→ 提示并退出
  if (!isRegisterOpen.value) {
    toast(t("register.registerClosed"));
    if (b6ExitTimer) clearTimeout(b6ExitTimer);
    b6ExitTimer = setTimeout(() => {
      b6ExitTimer = null;
      goLogin();
    }, 800);
  }
});

onUnmounted(() => {
  if (smsTimer) clearInterval(smsTimer);
  if (shakeTimer) clearTimeout(shakeTimer);
  if (agreeShakeTimer) clearTimeout(agreeShakeTimer);
  // MP-R2-PAGES-REGISTER-INDEX-003：取消挂起的 B6 跳转
  if (b6ExitTimer) {
    clearTimeout(b6ExitTimer);
    b6ExitTimer = null;
  }
});

/* ---------------- 注册链路（设计规范 §6.3） ---------------- */
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function handleSubmit() {
  if (submitting.value) return;
  // B6 兜底：入口被后台关闭
  if (!isRegisterOpen.value) {
    toast(t("register.registerClosed"));
    return;
  }
  const first = validateFirstError();
  if (first.field) {
    if (first.field === "agree") {
      shake("agree");
      toast(first.message);
      return;
    }
    const key = first.field;
    errors.value[key] = first.message;
    shake(key);
    toast(first.message);
    return;
  }
  submitting.value = true;
  try {
    // 2026-10-05 合规接线：注册落库携带用户勾选协议时的法定文本版本号。
    // fetchAgreedLegalVersion 内部任何失败回退 '1.0.0'，不会阻断注册主流程。
    // loading 最短展示 400ms 防闪烁；注册成功即签发 JWT（无需二次登录）
    const [session] = await Promise.all([
      registerUser(
        phoneRaw.value,
        password.value,
        nickname.value.trim(),
        birthDate.value,
        smsCode.value,
        await fetchAgreedLegalVersion(),
      ),
      delay(400),
    ]);
    addBreadcrumb("ui", "register_success", { userId: String(session?.userId ?? "") });
    // 链路镜像登录页（P0-32）：主动同步会话，消除空会话窗口（失败不影响注册）
    sessionStore.refreshSession().catch((err: unknown) => {
      if (isDev) console.warn("[Register] 注册后会话同步失败（守卫将自愈）:", err);
    });
    uni.redirectTo({ url: `${ROUTES.REGISTER_SUCCESS}?phone=${encodeURIComponent(phoneRaw.value)}` });
  } catch (error) {
    handleRegisterError(error);
  } finally {
    submitting.value = false;
    // 失败不清空已填内容，仅密码框重新置为密文
    showPassword.value = false;
    showConfirmPassword.value = false;
  }
}

function handleRegisterError(error: unknown) {
  const apiError = error instanceof AppApiError ? error : null;
  // real 模式：注册业务拒绝经 RegisterValidationException 透出 ErrorMessages 用户面文案
  // （message/code 同文案；AppApiError.error 仅 HTTP reason phrase，故按 message 分支）
  const detail = error instanceof Error && error.message ? error.message : "";
  addBreadcrumb("ui", "register_failed", { status: apiError ? String(apiError.status) : "network", detail });
  if (detail.includes("已注册")) {
    errors.value.phone = t("register.errPhoneRegistered");
    phoneRegistered.value = true;
    shake("phone");
    toast(t("register.toastPhoneRegistered"));
    return;
  }
  if (detail.includes("验证码")) {
    errors.value.sms = t("register.errSmsInvalid");
    shake("sms");
    toast(t("register.errSmsInvalid"));
    return;
  }
  if (detail.includes("未满 18")) {
    errors.value.birth = t("register.errBirthMinor");
    shake("birth");
    toast(t("register.errMinorBlocked"));
    return;
  }
  if (detail.includes("手机号格式")) {
    errors.value.phone = t("register.errPhoneFormat");
    shake("phone");
    toast(detail);
    return;
  }
  if (detail.includes("密码长度")) {
    errors.value.password = t("register.errPasswordWeak");
    shake("password");
    toast(detail);
    return;
  }
  if (detail.includes("昵称长度")) {
    errors.value.nickname = t("register.errNicknameLength");
    shake("nickname");
    toast(detail);
    return;
  }
  if (detail.includes("暂未开放")) {
    toast(detail || t("register.registerClosed"));
    return;
  }
  // MP-R2-PAGES-REGISTER-INDEX-001：预期业务拒绝（AppApiError 4xx，已注册/验证码错误/
  // 未成年/昵称长度等）为噪音不上报；非 AppApiError（网络/未知）或 5xx 才补报
  if (!apiError) {
    captureException(error, { source: "register.submit" });
    toast(t("register.networkError"));
    return;
  }
  if (apiError.status >= 500) {
    captureException(error, { source: "register.submit" });
    toast(t("register.serviceUnavailable"));
    return;
  }
  toast(detail || t("register.networkError"));
}

/* ---------------- 导航 ---------------- */
function goLogin() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.reLaunch({ url: ROUTES.LOGIN });
  }
}

function openAgreement() {
  // 点击协议链接不得改变勾选状态（设计规范 §5.4）；分包页面路径走 SUBPACKAGE_ROUTES
  uni.navigateTo({ url: SUBPACKAGE_ROUTES.LEGAL.AGREEMENT });
}

function openPrivacy() {
  uni.navigateTo({ url: SUBPACKAGE_ROUTES.LEGAL.PRIVACY });
}

/** 主按钮防重复：提交期与 toast+跳转窗口内不响应 */
const onSubmitGuarded = createButtonGuard(handleSubmit, 2000);
</script>

<template>
  <view class="register-page" :style="menuStyleVars">
    <!-- 页头：插图全出血 + 底部渐隐（设计稿 01） -->
    <view class="hero">
      <image class="hero__img" :src="IMAGE_PATHS.REGISTER.HERO" mode="aspectFill" alt="" />
      <view class="hero__fade" />
      <!-- 返回：白底 78% 圆形 + 背景模糊 -->
      <!-- MP-R2-PAGES-REGISTER-INDEX-011：@tap 移到外包 88rpx 透明热区（视觉 68rpx 圆钮不动，
           hover-class 仍挂在圆钮上，点在钮上时按压反馈不破） -->
      <view class="hero__back-hit" @tap="goLogin">
        <view class="hero__back press-feedback" hover-class="press-feedback--active" hover-stay-time="40">
          <image class="hero__back-icon" :src="ICONS.BACK" mode="aspectFit" alt="" />
        </view>
      </view>
      <!-- 标题组：插图左上留白区 -->
      <view class="hero__txt">
        <text class="hero__eyebrow">XUNMI · CAMPUS</text>
        <text class="hero__title">创建账号</text>
        <text class="hero__sub">用手机号注册，开始遇见同频的人</text>
      </view>
    </view>

    <!-- 表单卡：骑压插图 64rpx（32px），卡片阴影 -->
    <view class="card">
      <view class="card__cap">
        <text>账号信息</text>
        <view class="card__cap-line" />
      </view>

      <!-- 手机号 -->
      <view
        class="field"
        :class="{
          'field--focus': focusField === 'phone' && !errors.phone,
          'field--error': !!errors.phone,
          shake: shakeField === 'phone',
        }"
      >
        <image class="field__icon" :src="ICONS.MOBILE" mode="aspectFit" alt="" />
        <input
          class="field__input"
          type="number"
          :value="phone"
          placeholder="请输入手机号"
          placeholder-class="field__ph"
          maxlength="13"
          :disabled="submitting"
          cursor-spacing="120"
          @input="onPhoneInput"
          @focus="focusField = 'phone'"
          @blur="focusField = ''"
        />
        <!-- MP-R2-PAGES-REGISTER-INDEX-011：@tap 移到外包 88rpx 透明热区（视觉 32rpx 图标不动） -->
        <view v-if="phone" class="field__tap field__tap--32" @tap="clearPhone">
          <image class="field__clear" :src="ICONS.CLEAR" mode="aspectFit" alt="" />
        </view>
      </view>
      <view v-if="errors.phone" class="field-error">
        <image class="field-error__icon" :src="ICONS.ALERT" mode="aspectFit" alt="" />
        <text class="field-error__text">{{ errors.phone }}</text>
      </view>

      <!-- 短信验证码 -->
      <view
        class="field"
        :class="{
          'field--focus': focusField === 'sms' && !errors.sms,
          'field--error': !!errors.sms,
          shake: shakeField === 'sms',
        }"
      >
        <image class="field__icon" :src="ICONS.MESSAGE" mode="aspectFit" alt="" />
        <input
          class="field__input"
          type="number"
          :value="smsCode"
          placeholder="短信验证码"
          placeholder-class="field__ph"
          maxlength="6"
          :disabled="submitting"
          cursor-spacing="120"
          @input="onSmsInput"
          @focus="focusField = 'sms'"
          @blur="focusField = ''"
        />
        <!-- 验证码按钮：idle / sending / countdown / disabled（设计规范 §5.2） -->
        <view
          class="sms-btn"
          :class="{
            'sms-btn--sending': smsSending,
            'sms-btn--cd': !smsSending && smsCountdown > 0,
            'sms-btn--disabled': submitting,
          }"
          @tap="handleSendSms"
        >
          <view v-if="smsSending" class="sms-btn__spinner" />
          <text v-else class="sms-btn__text">
            {{ smsCountdown > 0 ? `重新发送 ${smsCountdown}s` : "获取验证码" }}
          </text>
        </view>
      </view>
      <view v-if="errors.sms" class="field-error">
        <image class="field-error__icon" :src="ICONS.ALERT" mode="aspectFit" alt="" />
        <text class="field-error__text">{{ errors.sms }}</text>
      </view>

      <!-- 设置密码 -->
      <view
        class="field"
        :class="{
          'field--focus': focusField === 'password' && !errors.password,
          'field--error': !!errors.password,
          shake: shakeField === 'password',
        }"
      >
        <image class="field__icon" :src="ICONS.LOCK" mode="aspectFit" alt="" />
        <input
          class="field__input"
          :password="!showPassword"
          :value="password"
          placeholder="设置密码（8–20 位）"
          placeholder-class="field__ph"
          maxlength="20"
          :disabled="submitting"
          cursor-spacing="120"
          @input="onPasswordInput"
          @focus="focusField = 'password'"
          @blur="focusField = ''"
        />
        <!-- MP-R2-PAGES-REGISTER-INDEX-011：@tap 移到外包 88rpx 透明热区（视觉 40rpx 图标不动） -->
        <view class="field__tap field__tap--40" @tap="showPassword = !showPassword">
          <image
            class="field__eye"
            :src="showPassword ? ICONS.EYE : ICONS.EYE_OFF"
            mode="aspectFit"
            alt=""
          />
        </view>
      </view>
      <!-- 密码强度条（3 格，实时刷新） -->
      <view v-if="password" class="strength">
        <view class="strength__bars">
          <view
            v-for="i in 3"
            :key="i"
            class="strength__bar"
            :class="{ 'strength__bar--on': pwdStrength >= i }"
            :style="pwdStrength >= i ? { background: pwdStrengthMeta(pwdStrength).color } : {}"
          />
        </view>
        <text class="strength__label" :style="{ color: pwdStrengthMeta(pwdStrength).text }">
          {{ pwdStrengthMeta(pwdStrength).label }}
        </text>
      </view>
      <view v-if="errors.password" class="field-error">
        <image class="field-error__icon" :src="ICONS.ALERT" mode="aspectFit" alt="" />
        <text class="field-error__text">{{ errors.password }}</text>
      </view>

      <!-- 确认密码 -->
      <view
        class="field"
        :class="{
          'field--focus': focusField === 'confirm' && !errors.confirm,
          'field--error': !!errors.confirm,
          shake: shakeField === 'confirm',
        }"
      >
        <image class="field__icon" :src="ICONS.SHIELD" mode="aspectFit" alt="" />
        <input
          class="field__input field__input--confirm"
          :password="!showConfirmPassword"
          :value="confirmPassword"
          placeholder="再次输入密码"
          placeholder-class="field__ph"
          maxlength="20"
          :disabled="submitting"
          cursor-spacing="120"
          @input="onConfirmInput"
          @focus="focusField = 'confirm'"
          @blur="onConfirmBlur"
        />
        <!-- MP-R2-PAGES-REGISTER-INDEX-011：@tap 移到外包 88rpx 透明热区（视觉 40rpx 图标不动） -->
        <view class="field__tap field__tap--40" @tap="showConfirmPassword = !showConfirmPassword">
          <image
            class="field__eye"
            :src="showConfirmPassword ? ICONS.EYE : ICONS.EYE_OFF"
            mode="aspectFit"
            alt=""
          />
        </view>
      </view>
      <view v-if="errors.confirm" class="field-error">
        <image class="field-error__icon" :src="ICONS.ALERT" mode="aspectFit" alt="" />
        <text class="field-error__text">{{ errors.confirm }}</text>
      </view>

      <!-- 基础身份（契约对齐变体 07：昵称 + 出生日期） -->
      <view class="card__cap card__cap--second">
        <text>基础身份</text>
        <view class="card__cap-line" />
      </view>

      <view
        class="field"
        :class="{
          'field--focus': focusField === 'nickname' && !errors.nickname,
          'field--error': !!errors.nickname,
          shake: shakeField === 'nickname',
        }"
      >
        <image class="field__icon" :src="ICONS.USER" mode="aspectFit" alt="" />
        <input
          class="field__input"
          type="text"
          :value="nickname"
          placeholder="昵称（1–20 字）"
          placeholder-class="field__ph"
          maxlength="20"
          :disabled="submitting"
          cursor-spacing="120"
          @input="onNicknameInput"
          @focus="focusField = 'nickname'"
          @blur="focusField = ''"
        />
      </view>
      <view v-if="errors.nickname" class="field-error">
        <image class="field-error__icon" :src="ICONS.ALERT" mode="aspectFit" alt="" />
        <text class="field-error__text">{{ errors.nickname }}</text>
      </view>

      <view
        class="field"
        :class="{
          'field--focus': focusField === 'birth' && !errors.birth,
          'field--error': !!errors.birth,
          shake: shakeField === 'birth',
        }"
      >
        <picker
          class="field__picker"
          mode="date"
          :value="birthDate || '2005-01-01'"
          :end="today"
          fields="day"
          :disabled="submitting"
          @change="onBirthChange"
        >
          <view class="field__picker-inner">
            <image class="field__icon" :src="ICONS.CAKE" mode="aspectFit" alt="" />
            <text class="field__pick-text" :class="{ 'field__pick-text--filled': birthDate }">
              {{ birthDate || "出生日期" }}
            </text>
          </view>
        </picker>
        <text class="field__hint">需满 18 周岁</text>
      </view>
      <view v-if="errors.birth" class="field-error">
        <image class="field-error__icon" :src="ICONS.ALERT" mode="aspectFit" alt="" />
        <text class="field-error__text">{{ errors.birth }}</text>
      </view>

      <!-- 主按钮：置灰仍可点，给「哪里没填对」定位提示 -->
      <view
        class="submit-btn"
        :class="{ 'submit-btn--disabled': !formComplete, 'submit-btn--loading': submitting }"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        @tap="onSubmitGuarded"
      >
        <view v-if="submitting" class="submit-btn__spinner" />
        <text class="submit-btn__text">{{ submitting ? "注 册 中" : "注 册" }}</text>
      </view>

      <!-- 手机号已注册：次级出口（设计稿 06） -->
      <view v-if="phoneRegistered" class="ghost-btn" @tap="goLogin">
        <text class="ghost-btn__text">用这个手机号登录</text>
      </view>
    </view>

    <!-- 协议行：必须完整可见，不得被键盘完全遮住 -->
    <view class="agree" :class="{ 'agree--error': agreeShake }">
      <!-- MP-R2-PAGES-REGISTER-INDEX-011：@tap 移到外包 88rpx 透明热区
           （视觉 32rpx 方框不动；padding 28rpx + 等量负 margin 抵消位移，
           原 .agree__chk 的 margin-top: 2rpx 一并上移到热区层） -->
      <view class="agree__hit" @tap="agreed = !agreed">
        <view class="agree__chk" :class="{ 'agree__chk--on': agreed, 'agree__chk--shake': agreeShake }">
          <image v-if="agreed" class="agree__chk-icon" :src="ICONS.CHECK" mode="aspectFit" alt="" />
        </view>
      </view>
      <view class="agree__text-wrap">
        <text class="agree__text" :class="{ 'agree__text--error': agreeShake }">
          我已阅读并同意
          <text class="agree__link" @tap.stop="openAgreement">《用户协议》</text>
          和
          <text class="agree__link" @tap.stop="openPrivacy">《隐私政策》</text>
        </text>
      </view>
    </view>

    <!-- 底部安全说明：降低填表焦虑 -->
    <text class="safety-note">注册即代表你已满 18 周岁；信息仅用于校园身份核验，严格保密</text>

    <!-- 去登录出口 -->
    <view class="to-login">
      <text class="to-login__text">已有账号？</text>
      <text class="to-login__link" @tap="goLogin">去登录</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ============================================================
 * 注册页样式 —— 令牌来源 theme/design-variables.scss v4.0.0
 * 设计稿 375×812（rpx = px × 2）
 * ============================================================ */
.register-page {
  min-height: 100vh;
  background: var(--c-bg-page, #eef7f2);
  padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx);
}

/* ---------------- 页头 ---------------- */
.hero {
  position: relative;
  width: 750rpx;
  height: 480rpx;
}

.hero__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* 底部 104rpx 渐隐到页面底色，消除图片与底色硬接缝 */
.hero__fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 104rpx;
  background: linear-gradient(180deg, rgba(238, 247, 242, 0) 0%, var(--c-bg-page, #eef7f2) 100%);
  pointer-events: none;
}

/* MP-R2-PAGES-REGISTER-INDEX-011：88rpx 透明热区层（abspos 定位从圆钮上移到本层，
   padding 10rpx + 等量负 margin ⇒ 圆钮视觉位置/尺寸逐像素不变，热区 68→88rpx） */
.hero__back-hit {
  position: absolute;
  left: 32rpx;
  /* MP-R2-PAGES-REGISTER-INDEX-002：状态栏高度补偿（与 login/success 同模式）——
     navigationStyle:custom 下页面自 y=0 布局，固定 88rpx 在 >44px 状态栏机型压入系统区域 */
  top: calc(var(--statusbar, env(safe-area-inset-top)) + 88rpx);
  padding: 10rpx;
  margin: -10rpx;
  z-index: 3;
}

.hero__back {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.78);
  /* #ifdef H5 */
  backdrop-filter: blur(6px);
  /* #endif */
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(15, 23, 42, 0.08);
}

.hero__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.hero__txt {
  position: absolute;
  left: 48rpx;
  /* MP-R2-PAGES-REGISTER-INDEX-002：同 hero__back，状态栏动态补偿 */
  top: calc(var(--statusbar, env(safe-area-inset-top)) + 208rpx);
  display: flex;
  flex-direction: column;
  z-index: 2;
}

.hero__eyebrow {
  font-size: 19rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
  color: var(--c-brand-700, #1f8d6a);
  margin-bottom: 10rpx;
}

.hero__title {
  font-size: 52rpx;
  font-weight: 800;
  line-height: 1.2;
  color: var(--c-text-primary, #1a1e1c);
}

.hero__sub {
  margin-top: 12rpx;
  font-size: 25rpx;
  line-height: 1.55;
  color: var(--c-text-secondary, #4a524e);
}

/* ---------------- 表单卡 ---------------- */
.card {
  position: relative;
  z-index: 2;
  margin: -64rpx 40rpx 0;
  background: var(--c-bg-container, #ffffff);
  border-radius: 40rpx;
  padding: 40rpx;
  box-shadow:
    0 16rpx 48rpx rgba(15, 23, 42, 0.06),
    0 4rpx 16rpx rgba(15, 23, 42, 0.04);
}

.card__cap {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 8rpx 0 24rpx;

  text {
    font-size: 24rpx;
    font-weight: 700;
    color: var(--c-text-primary, #1a1e1c);
  }
}

.card__cap--second {
  margin-top: 40rpx;
}

.card__cap-line {
  flex: 1;
  height: 2rpx;
  background: var(--c-border-light, #eef2f0);
}

/* ---------------- 字段（高 96rpx · 圆角 24rpx） ---------------- */
.field {
  display: flex;
  align-items: center;
  height: 96rpx;
  border-radius: 24rpx;
  padding: 0 28rpx;
  margin-bottom: 24rpx;
  background: var(--c-bg-surface, #f7faf9);
  border: 2rpx solid var(--c-border-light, #eef2f0);
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.field--focus {
  /* MP-R2-PAGES-REGISTER-INDEX-014(B)：容器/填充底 → --c-bg-container 语义域 */
  background: var(--c-bg-container, #ffffff);
  border-color: var(--c-brand, #36c99a);
  border-width: 3rpx;
  /* 边框加粗 1rpx 视觉补偿，避免内容抖动 */
  padding-left: 27rpx;
  box-shadow: 0 0 0 6rpx rgba(54, 201, 154, 0.12);
}

.field--error {
  background: var(--c-error-bg-solid, #fef5f6);
  border-color: var(--c-error, #e5454d);
  border-width: 3rpx;
  padding-left: 27rpx;
  box-shadow: 0 0 0 6rpx rgba(229, 69, 77, 0.1);
}

.field__icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.field__input {
  flex: 1;
  height: 100%;
  font-size: 30rpx;
  font-weight: 500;
  color: var(--c-text-primary, #1a1e1c);
}

.field__ph {
  color: var(--c-text-placeholder, #9aa39f);
  font-weight: 400;
}

/* MP-R2-PAGES-REGISTER-INDEX-011：小控件的 88rpx 透明热区层——
   padding + 等量负 margin（R11 §5 铁律：视觉尺寸不动、热区扩到 88rpx；
   同 components/home/CommunityFeed.vue .post-card__author-tap 口径）。
   负 margin 使 flex 主轴占位仍等于图标原宽，交叉轴由 .field 的 96rpx 高度吸收。 */
.field__tap {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.field__tap--32 {
  padding: 28rpx;
  margin: -28rpx;
}

.field__tap--40 {
  padding: 24rpx;
  margin: -24rpx;
}

.field__clear {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.field__eye {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}

.field__picker {
  flex: 1;
  min-width: 0;
}

.field__picker-inner {
  display: flex;
  align-items: center;
  height: 100%;
}

.field__pick-text {
  font-size: 30rpx;
  color: var(--c-text-placeholder, #9aa39f);
}

.field__pick-text--filled {
  color: var(--c-text-primary, #1a1e1c);
  font-weight: 500;
}

.field__hint {
  font-size: 24rpx;
  color: var(--c-text-placeholder, #9aa39f);
  flex-shrink: 0;
  margin-left: 12rpx;
}

/* 行内错误：管「哪个字段错了」，常驻至重新输入清除 */
.field-error {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin: -12rpx 0 20rpx 8rpx;
}

.field-error__icon {
  width: 26rpx;
  height: 26rpx;
}

.field-error__text {
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1.35;
  color: var(--c-error, #e5454d);
}

/* ---------------- 验证码按钮（高 64rpx · 圆角 999rpx） ---------------- */
.sms-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 176rpx;
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: var(--c-brand, #36c99a);
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.sms-btn__text {
  font-size: 24rpx;
  font-weight: 700;
  /* MP-R2-PAGES-REGISTER-INDEX-014(A)：彩色底上的白色前景 → --c-text-inverse
     （禁映射到 --c-bg-container：其暗色态为近黑，会把白字刷成黑字） */
  color: var(--c-text-inverse, #ffffff);
  white-space: nowrap;
}

.sms-btn--sending,
.sms-btn--cd {
  background: var(--c-border-light, #eef2f0);
}

.sms-btn--sending {
  background: var(--c-brand-100, #d1f5e7);
}

.sms-btn--cd .sms-btn__text {
  color: var(--c-text-placeholder, #9aa39f);
}

.sms-btn--sending .sms-btn__text {
  color: var(--c-brand-700, #1f8d6a);
}

.sms-btn--disabled {
  opacity: 0.55;
}

.sms-btn__spinner {
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(31, 141, 106, 0.25);
  border-top-color: var(--c-brand-700, #1f8d6a);
  animation: spin 0.8s linear infinite;
}

/* ---------------- 密码强度 ---------------- */
.strength {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: -8rpx 0 20rpx 8rpx;
}

.strength__bars {
  display: flex;
  gap: 8rpx;
}

.strength__bar {
  width: 64rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: var(--c-border-light, #eef2f0);
  transition: background 0.2s ease;
}

.strength__bar--on {
  background: var(--c-brand, #36c99a);
}

.strength__label {
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1;
}

/* ---------------- 主按钮（高 96rpx · 圆角 24rpx） ---------------- */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 96rpx;
  margin-top: 8rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, var(--c-brand, #36c99a) 0%, var(--c-brand-400, #55d5a7) 100%);
  box-shadow: 0 8rpx 32rpx rgba(54, 201, 154, 0.28);
  transition: transform 0.1s ease, opacity 0.1s ease;
}

.submit-btn__text {
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 0.8rpx;
  /* MP-R2-PAGES-REGISTER-INDEX-014(A)：品牌渐变底上的白色前景 → --c-text-inverse */
  color: var(--c-text-inverse, #ffffff);
}

.submit-btn--disabled {
  background: var(--c-status-disabled, #dce5e2);
  box-shadow: none;
}

.submit-btn--loading {
  opacity: 0.72;
}

.submit-btn__spinner {
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.35);
  /* MP-R2-PAGES-REGISTER-INDEX-014(A)：彩色底上的白色前景 → --c-text-inverse
     （半透环 rgba 不属本判据，台账只点名 border-top-color 一处） */
  border-top-color: var(--c-text-inverse, #ffffff);
  animation: spin 0.8s linear infinite;
}

/* 次级出口：手机号已注册 */
.ghost-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  margin-top: 20rpx;
  border-radius: 24rpx;
  border: 2rpx solid var(--c-border-default, #dde3e0);
  /* MP-R2-PAGES-REGISTER-INDEX-014(B)：容器/填充底 → --c-bg-container 语义域 */
  background: var(--c-bg-container, #ffffff);
}

.ghost-btn__text {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--c-text-secondary, #4a524e);
}

/* ---------------- 协议行 ---------------- */
.agree {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  margin: 30rpx 48rpx 0;
}

/* MP-R2-PAGES-REGISTER-INDEX-011：协议勾选 88rpx 透明热区层。
   padding 28rpx + 等量负 margin ⇒ 32rpx 方框视觉不动、占位不变；
   顶边 -26rpx = -28rpx 位移补偿 + 原 .agree__chk 的 margin-top: 2rpx（已上移到本层）。
   position: relative + z-index 让热区压在右侧文本之上（.agree__text-wrap 后置兄弟节点
   默认盖住热区右溢的 14rpx，会使热区实宽掉到 74rpx） */
.agree__hit {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 28rpx;
  margin: -26rpx -28rpx -28rpx;
}

.agree__chk {
  width: 32rpx;
  height: 32rpx;
  border-radius: 8rpx;
  border: 3rpx solid var(--c-border-default, #dde3e0);
  background: var(--c-bg-container, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.agree__chk--on {
  background: var(--c-brand, #36c99a);
  border-color: var(--c-brand, #36c99a);
}

.agree__chk--shake {
  animation: shake-x 0.28s ease 2;
}

.agree__chk-icon {
  width: 20rpx;
  height: 20rpx;
}

.agree__text-wrap {
  flex: 1;
}

.agree__text {
  font-size: 24rpx;
  line-height: 1.55;
  color: var(--c-text-tertiary, #6b7571);
}

.agree__text--error {
  color: var(--c-error, #e5454d);
}

.agree__link {
  color: var(--c-brand-700, #1f8d6a);
  font-weight: 500;
}

/* ---------------- 底部说明与出口 ---------------- */
.safety-note {
  display: block;
  margin: 28rpx 48rpx 0;
  font-size: 21rpx;
  line-height: 1.75;
  color: var(--c-text-placeholder, #9aa39f);
  text-align: center;
}

.to-login {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-top: 30rpx;
}

.to-login__text {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #6b7571);
}

.to-login__link {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--c-brand, #36c99a);
}

/* ---------------- 动效 ---------------- */
.press-feedback {
  transition: transform 0.1s ease, opacity 0.1s ease;
}

.press-feedback--active {
  transform: scale(0.98);
  opacity: 0.92;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes shake-x {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-8rpx);
  }
  75% {
    transform: translateX(8rpx);
  }
}

.shake {
  animation: shake-x 0.28s ease 2;
}
</style>
