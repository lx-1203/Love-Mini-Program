<script setup lang="ts">
/**
 * 校园话题发布页
 *
 * 功能：
 * - 选择话题分类（6选1）
 * - 标题输入
 * - 内容输入
 * - 匿名开关
 * - 提交按钮
 * - 功能4：集成 TopicSelector 话题选择器（带搜索 + 自定义创建，最多 3 个）
 *
 * mp-weixin 兼容性：
 * - 不使用 :hover 伪类（hover-class 替代）
 * - 不使用 import.meta.env 直读 DEV 标志
 * - 不使用 optional catch binding
 */
import { ref, computed, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
// 修复 no-duplicate-imports：合并 ../../stores/campus 的重复 import
import { useCampusStore, CAMPUS_CATEGORY_MAP, type CampusTopicCategory, type CampusTopicItem } from "../../../stores/campus";
import { useMock } from "../../../stores/helpers/use-mock";
// 2026-08-26 P7：校园圈发帖支持上传图片（chooseImage + 预览 + 上传）
import { clientApi } from "../../../services/api";
// 未登录不发受保护请求（认证状态预取的门卫），与 pages/nearby/index.vue 同一取法
import { getToken } from "../../../services/http";
// Task 0.2.4：调用 chooseImage 前需检查隐私授权
import { ensurePrivacyAuthorized } from "../../../utils/privacy";
// MP-R1-CAMPUSPOSTTOPIC-202：未认证/未绑定学校的发布请求必然被服务端门禁拒，
// 页面需按认证状态给差异化引导（跳转目标见 ROUTES.CAMPUS.CERTIFICATION）
import { ROUTES } from "../../../constants/routes";
// 认证引导跳转统一走 openAppPath（含 tab 页/栈底兜底），与 campus/campus/index.vue 同源
import { openAppPath } from "../../../utils/navigation";
// MP-R7-REALNAME-001：本地临时路径判定统一走 isUploadedMediaUrl（DevTools http://tmp/ 误判修复）
import { isUploadedMediaUrl } from "../../../utils/media";
import { UI_LIMITS } from "../../../constants/limits";
// 功能4：帖子创建话题选择器（带搜索 + 自定义创建）
import TopicSelector from "../../../components/village/TopicSelector.vue";
import { designTokens } from "../../../theme/tokens";
// R10-P1-003：注入 --statusbar/--capsule-right（DevTools env(safe-area-inset-top) 恒 0，标题叠印状态栏）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const campusStore = useCampusStore();
const { t } = useI18n();

/**
 * MP-R1-CAMPUSPOSTTOPIC-201 能力开关（客户端唯一改点，后端补字段后改成 true 即恢复）。
 *
 * 只读核对结论：后端真实请求契约
 * `record CreateCampusTopicRequest(@NotBlank String category, @NotBlank @Size(max=200) String title,
 *  @NotBlank @Size(max=5000) String content, @Size(max=5) List<@Size(max=20) String> tags)`
 * —— apps/api/src/main/java/com/campuslove/api/campus/CampusController.java:452-457，
 * **没有 images**；读侧 CampusTopicView.java:14 与实体列 CampusTopic.java:61-63（JSON 列）都在，
 * 写侧 RealCampusService.java:151-165 建话题时也没有 setImages。
 * Jackson 未开 FAIL_ON_UNKNOWN_PROPERTIES（config/WebConfig.java:180-187 仅注册 Long 反序列化器），
 * 所以多传 images 不报错、只被**静默丢弃**——这正是本条被判「发帖带图、发布后无图」的机理。
 *
 * 既知服务端不落库，客户端就不该再演一遍成功：real 模式下不再选图/不再上传/不再提交该字段，
 * 并把原因写在图片区，而不是发完 6 个请求、在服务端留孤儿文件、再给用户一个假的「发布成功」。
 * （幂等键 = hash(url|body)，http.ts:262-274：把临时路径塞进 body 还会绕开本该生效的判重。）
 */
const CAMPUS_TOPIC_IMAGES_SUPPORTED = false;

/** mock 判定（useMock 是静态 env 检查，setup 期取一次即可） */
const isMockMode = useMock();

/** 本模式是否真正接受配图：mock 本地闭环恒真，real 取决于上面的后端能力 */
const imagesAccepted = computed(() => isMockMode || CAMPUS_TOPIC_IMAGES_SUPPORTED);

/**
 * SubTask 1.5.2：发布成功跳转定时器引用，便于卸载清理。
 */
let postSuccessNavTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * SubTask 1.5.2：页面卸载时清理所有未触发的定时器，避免在已销毁页面上修改响应式状态或触发导航。
 */
onUnmounted(() => {
  if (postSuccessNavTimer) {
    clearTimeout(postSuccessNavTimer);
    postSuccessNavTimer = null;
  }
});

/** 选中的分类 */
const selectedCategory = ref<CampusTopicCategory>("course_exchange");
// MP-R2-CAMPUSINDEX-002(a)：消费 campus/index 透传的当前分类（原恒默认 course_exchange，
// 发布回流后新帖出现在错误 Tab 顶部）
import { onLoad } from "@dcloudio/uni-app";

/**
 * 校园发布资格三态（未认证视角差异化，MP-R1-CAMPUSPOSTTOPIC-202 同族的 real 可达性前置）：
 * `allowed` 可发 / `denied` 明确不可发（未认证、审核中、被驳回）/ `unknown` 状态未取到（不拦）。
 */
const certGate = ref<"allowed" | "denied" | "unknown">("unknown");

/**
 * 依据 store 的认证状态判定发布资格。
 *
 * 依据（后端只读核对，apps/api 未改动）：POST /campus/topics 除
 * `@PreAuthorize("hasRole('USER')")`（CampusController.java:169）外还有私域门禁
 * `campusPermissionService.requireVerifiedSameSchool(userId, campusName)`（同文件 :175-177），
 * 不通过即抛 IllegalArgumentException（CampusPermissionService.java:72-76）；
 * real profile 下该消息被脱敏为「请求参数错误」且响应无 code 字段
 * （GlobalExceptionHandler.java:118-126 与 :784-791）→ 客户端拿不到任何可行动的原因。
 * 故本页在本地前置判定并给「去认证」入口，不再发起这条必败请求
 * （口径同 subpackages/circles/circles/post-topic.vue 的 MP-R1-POSTTOPIC-004）。
 * 注：本判定只能覆盖「未认证/审核中/被驳回」；「已认证但非本校」在校内发帖路径上不存在
 * （schoolId 由当前用户自己的校区名解析，CampusController.java:173、:370-376）。
 */
function resolveCertGate(): "allowed" | "denied" | "unknown" {
  // mock 无校园认证语义（本地闭环），一律放行，保证 QA 在 mock 下仍能走完发布链路
  if (isMockMode) return "allowed";
  // 取状态本身就失败（网络/后端异常）：不拦，避免把可用功能判死
  if (campusStore.errorMessage) return "unknown";
  if (campusStore.certificationStatus === "verified") return "allowed";
  return "denied";
}

/** 跳转校园认证页（未认证引导的唯一出口） */
function goCertification() {
  openAppPath(ROUTES.CAMPUS.CERTIFICATION);
}

onLoad((query) => {
  const cat = query?.category;
  if (typeof cat === "string" && cat.trim().length > 0) {
    selectedCategory.value = cat as CampusTopicCategory;
  }
  // 正常路径由 campus/campus/index.vue onShow 取过认证状态；但本页可被深链直达，
  // 彼时 store 仍是默认值 "unverified" —— 直接据此判 denied 会把已认证用户挡在门外，
  // 所以先置 unknown（不拦），补一次 GET 后再判（与 index.vue onShow 同一端点，幂等读）。
  certGate.value = isMockMode ? "allowed" : "unknown";
  // 未登录不发受保护请求（同 pages/nearby/index.vue canFetchProtected 口径）：
  // GET /campus/certification 在 real 下要求鉴权，未登录发出会被 http 层的 401 处理
  // 强制跳登录页 —— 那等于把「只是打开发布页」劫持成一次登录流程。
  // 未登录时保持 unknown（不显示横幅），登录态问题交给写操作路径的集中 401 处理呈现。
  if (!isMockMode && getToken().length > 0) {
    // fetchCertificationStatus 自身会在入口清空 errorMessage，无需页面预清
    void campusStore.fetchCertificationStatus().then(() => {
      certGate.value = resolveCertGate();
    });
  }
});
/** 话题标题 */
const title = ref("");
/** 话题内容 */
const content = ref("");
/** 是否匿名 */
const isAnonymous = ref(false);
/** 是否正在提交 */
const isSubmitting = ref(false);
/** 2026-08-26 P7：已选配图（校园圈发帖照片墙，上限 6 张与项目约定一致） */
const images = ref<string[]>([]);
/** 配图上限（复用抬分约定：照片墙 6 张内） */
const MAX_IMAGES = UI_LIMITS.PHOTO_GALLERY_MAX;

/**
 * MP-R1-CAMPUSPOSTTOPIC-202（real 视角）：后端发帖/回复契约都没有 isAnonymous
 * （CampusController.java:452-457、:462-464），建记录时更是硬编码
 * `setIsAnonymous(false)`（RealCampusService.java:159、:196）→ real 下开了匿名
 * 也会以本人昵称公开。原 `campus.postTopic.anonymousDesc` 承诺「将显示为"匿名校友"」
 * 是一句服务端会当场打破的承诺，故 real + 开启匿名时原地替换为「暂不会生效」的说明
 * （复用同一行文案位，不增行、不改卡片高度）。mock 分支本地真实生效，保留原文案。
 */
const anonymousBlocked = computed(() => !isMockMode && isAnonymous.value);

/**
 * switch 品牌色：小程序 switch 的 color 为原生属性，不支持 CSS 变量，
 * 此处取 design token --c-brand（designTokens.color.brand[500]）的实际色值（ui-ux B9 修复）。
 */
const brandColor = designTokens.color.brand[500];

/**
 * 功能4：TopicSelector 已选话题列表（不含 # 前缀）。
 * 由 TopicSelector 组件通过 v-model 双向绑定。
 * 2026-08-10 B5：real 模式以 tags 数组字段提交（后端已支持 ≤5 个、每个 ≤20 字符）；
 * mock 模式保留内容末尾 #话题 拼接（后端 mock 无 tags 语义）。
 */
const selectedTopics = ref<string[]>([]);

/** 6个话题分类选项 */
const categoryOptions: { key: CampusTopicCategory; label: string }[] = [
  { key: "course_exchange", label: CAMPUS_CATEGORY_MAP.course_exchange },
  { key: "club_recruitment", label: CAMPUS_CATEGORY_MAP.club_recruitment },
  { key: "campus_activity", label: CAMPUS_CATEGORY_MAP.campus_activity },
  { key: "study_help", label: CAMPUS_CATEGORY_MAP.study_help },
  { key: "life_service", label: CAMPUS_CATEGORY_MAP.life_service },
  { key: "alumni_news", label: CAMPUS_CATEGORY_MAP.alumni_news },
];

/**
 * 内容最大字数（客户端口径，严于后端）。
 * 后端真实上限为 `@NotBlank @Size(max = 5000)`（CampusController.java:452-455），
 * 标题为 `@Size(max = 200)`（同文件 :454，本页 input maxlength=50）。
 * 取 500 与 subpackages/circles/circles/post-topic.vue:149 同构，好处是不会因长度被服务端拒；
 * 代价是长文用户被本地截断 —— 是否放宽属产品决策（取舍见本轮报告的「500 vs 后端上限」一节），
 * 本次不动数值，仅把两侧口径写清，并保证超长态可观测（内容计数器 + isOverLimit 变红）。
 */
const MAX_LENGTH = 500;

/** 当前字数 */
const currentLength = computed(() => content.value.length);
/** 是否超出字数限制 */
const isOverLimit = computed(() => currentLength.value > MAX_LENGTH);
/** 是否可以提交 */
const canSubmit = computed(
  () => title.value.trim().length > 0 && content.value.trim().length > 0 && !isOverLimit.value && !isSubmitting.value,
);

/**
 * 选择分类
 * @param category - 分类 key
 */
function selectCategory(category: CampusTopicCategory) {
  selectedCategory.value = category;
}

/**
 * 切换匿名
 */
function toggleAnonymous() {
  isAnonymous.value = !isAnonymous.value;
}

/**
 * 2026-08-26 P7：选择配图上传（Task 0.2.4 隐私授权检查；上限 MAX_IMAGES 张）
 */
async function chooseImage() {
  // MP-R1-CAMPUSPOSTTOPIC-201：real 契约不收 images（依据见上方 CAMPUS_TOPIC_IMAGES_SUPPORTED
  // 注释），选图即注定丢失 → 在选择环节就把原因讲出来，而不是让用户选完 6 张图后
  // 收到一个「发布成功」但配图全没了的结果（那才是本条 issue 的原始表现）。
  if (!imagesAccepted.value) {
    uni.showToast({ title: t("campus.postTopic.imagesUnsupported"), icon: "none" });
    return;
  }
  if (images.value.length >= MAX_IMAGES) {
    uni.showToast({ title: // MP-R2-CAMPUSPOST-002：插值变量与文案占位符对齐（zh/en 均为 {n}，{max} 渲染空串）
        t("campus.postTopic.maxImages", { n: MAX_IMAGES }), icon: "none" });
    return;
  }
  try {
    await ensurePrivacyAuthorized();
  } catch (_e) {
    uni.showToast({ title: t("campus.postTopic.privacyRequired"), icon: "none" });
    return;
  }
  uni.chooseImage({
    count: MAX_IMAGES - images.value.length,
    sizeType: ["compressed"],
    sourceType: ["album", "camera"],
    success: (res) => {
      images.value.push(...(res.tempFilePaths as string[]));
    },
    fail: (err) => {
          console.error("选择图片失败:", err);
          // MP-R2-CAMPUSPOST-005：区分用户取消与真实失败（权限被拒等），失败给可见反馈
          const msg = String((err as { errMsg?: string })?.errMsg ?? "");
          if (!/cancel/i.test(msg)) {
            uni.showToast({ title: "选择图片失败，请检查相册/相机权限", icon: "none" });
          }
        },
  });
}

/** 2026-08-26 P7：删除已选配图 */
function removeImage(index: number) {
  images.value.splice(index, 1);
}

/**
 * 发布话题
 *
 * 功能4：real 模式将话题标签作为 tags 字段提交（后端原生支持）；
 * mock 模式（B5 兼容）将标签以 #话题 格式追加到内容末尾（mock 无 tags 语义）。
 */
async function submitTopic() {
  // MP-R1-CAMPUSPOST-001：空表单发布不再静默——原 if (!canSubmit) return 在
  // 校验 toast 之前拦截，空表单点击发布毫无反馈。改为提交中守卫 + 逐项校验提示
  //（对齐「请输入标题」toast 模式），仅超字数沿用既有静默禁用（按钮置灰可见）。
  if (isSubmitting.value) return;

  if (!title.value.trim()) {
    uni.showToast({ title: t("campus.postTopic.errTitle"), icon: "none" });
    return;
  }

  if (!content.value.trim()) {
    uni.showToast({ title: t("campus.postTopic.errContent"), icon: "none" });
    return;
  }

  if (isOverLimit.value) {
    return;
  }

  // 未认证/审核中/被驳回视角：服务端私域门禁必拒（CampusController.java:175-177），
  // 且 400 消息在 real profile 被脱敏成「请求参数错误」（GlobalExceptionHandler.java:118-126）
  // → 与其发一条用户读不懂的必败请求，就地给可读原因 + 「去认证」出口（页顶横幅已常驻）。
  if (certGate.value === "denied") {
    uni.showToast({ title: t("campus.postTopic.certRequired"), icon: "none" });
    return;
  }

  isSubmitting.value = true;
  try {
    const trimmedContent = content.value.trim();
    // 2026-08-26 P7：配图本地临时路径（tempFilePath）在 real 模式先经
    // clientApi.uploadPostImage 逐张上传换取可访问 URL，mock 模式保留原始路径。
    // MP-R1-CAMPUSPOSTTOPIC-201：real 后端契约无 images（CampusController.java:452-457），
    // 上传结果注定被丢弃 → 由 CAMPUS_TOPIC_IMAGES_SUPPORTED 单点关掉整条上传链路。
    let submitImages = images.value;
    if (
      imagesAccepted.value &&
      !isMockMode &&
      images.value.some((img) => !isUploadedMediaUrl(img))
    ) {
      const uploaded: string[] = [];
      for (const img of images.value) {
        if (isUploadedMediaUrl(img)) {
          uploaded.push(img);
          continue;
        }
        // MP-R1-CAMPUSPOST-002：文件名含每图唯一量（时间戳+序号，对齐 village/post.vue 惯例）
        // ——Idempotency-Key 按「endpoint|file.name」纯 FNV-1a 哈希，恒定 "campus-topic.jpg"
        // 使同帖多图第 2 张起 key 完全相同 → 409「重复请求已被拦截」→ 整个发布失败；
        // 且 key 与内容无关，4h TTL 内本页任何再次带图发帖都被同一 key 拦截
        const result = await clientApi.uploadPostImage({
          name: `campus-topic-${Date.now()}-${uploaded.length}.jpg`,
          path: img,
        });
        uploaded.push(result?.url ?? img);
      }
      submitImages = uploaded;
    }

    // 实际提交给服务端的正文（mock 走「内容末尾拼 #话题」，real 走 tags 字段），
    // 用于发布后比对回传文本，判断敏感词过滤是否动过内容。
    let submittedContent = trimmedContent;
    // store action 的返回值（real 为后端回包映射，mock 为本地构造）
    let created: CampusTopicItem | null = null;

    if (isMockMode) {
      // mock：拼接最终内容（如有话题标签则追加到末尾）
      const topics = selectedTopics.value.map((name) => `#${name}`).join(" ");
      const finalContent = topics ? `${trimmedContent}\n\n${topics}` : trimmedContent;
      submittedContent = finalContent;
      created = await campusStore.createCampusTopic({
        category: selectedCategory.value,
        title: title.value.trim(),
        content: finalContent,
        isAnonymous: isAnonymous.value,
        images: submitImages,
      });
    } else {
      // real：tags 字段提交（后端校验 ≤5 个、每个 ≤20 字符，超限前端先截断）
      const tags = selectedTopics.value
        .slice(0, 5)
        .map((name) => name.slice(0, 20))
        .filter((name) => name.trim().length > 0);
      created = await campusStore.createCampusTopic({
        category: selectedCategory.value,
        title: title.value.trim(),
        content: trimmedContent,
        isAnonymous: isAnonymous.value,
        images: submitImages,
        ...(tags.length > 0 ? { tags } : {}),
      });
    }

    // 特殊字符三态：后端敏感词是**静默替换**（RealCampusService.java:146-148
    // filterWithLog，落库文本只体现在响应体里），不比对就永远只报「发布成功」，
    // 用户会以为是自己打错了字。回包文本 ≠ 提交文本时如实告知。
    const maskedBySensitiveFilter =
      !isMockMode && created != null && created.contentPreview !== submittedContent;

    if (maskedBySensitiveFilter) {
      uni.showToast({ title: t("campus.postTopic.contentMasked"), icon: "none" });
    } else {
      uni.showToast({ title: t("campus.postTopic.publishSuccess"), icon: "success" });
    }
    // MP-R1-CAMPUSPOST-004：成功路径不复位 isSubmitting——原 finally 立即复位，
    // 成功 toast 与 800ms navigateBack 之间的窗口内唯一重入守卫失效，
    // 再点一次即完整重跑创建产生重复帖子。保持提交态由页面销毁自然终结，仅失败复位。
    if (postSuccessNavTimer) clearTimeout(postSuccessNavTimer);
    postSuccessNavTimer = setTimeout(() => {
      postSuccessNavTimer = null;
      // A3「Loading 不永驻」/ MP-R2-CAMPUSPOST-008（轮 2 已登记 P4，本条只闭合其中的
      // 发布成功跳转半边；goBack() 的裸 navigateBack 半边仍开放，留给该 ID 的 owning 泳道）：
      // 栈底直达本页（分享卡/深链 reLaunch）时裸 navigateBack 必 fail，
      // 而成功路径按 MP-R1-CAMPUSPOST-004 刻意不复位提交态 → 发布钮对该页面实例永久吞点击
      // 且无任何提示。补 fail 分支复位（同 subpackages/circles/circles/post-topic.vue
      // MP-R1-POSTTOPIC-102 已修口径；此时帖子**已发布成功**，故文案仍是「发布成功」）。
      uni.navigateBack({
        fail: () => {
          isSubmitting.value = false;
          uni.showToast({ title: t("campus.postTopic.publishSuccess"), icon: "none" });
        },
      });
    }, 800);
  } catch (_e) {
    // 失败回滚不留幽灵内容：store 的 createCampusTopic 只在请求成功后 topics.unshift
    // （mock 分支同理），此分支不改列表；输入框文本与已选配图全部保留，可直接重试。
    // errorMessage 已由 store 按 status 归一：409=「刚才已发布成功，请勿重复提交」
    //（服务端幂等判重兜住，非失败），400=「仅本校已认证同学…」。
    uni.showToast({
      title: campusStore.errorMessage || t("campus.postTopic.publishFailed"),
      icon: "none",
    });
    isSubmitting.value = false;
  }
}

/**
 * 返回上一页
 */
function goBack() {
  uni.navigateBack();
}
</script>

<template>
  <view class="post-page" :style="menuStyleVars">
    <!-- 顶部导航栏 -->
    <view class="post-header">
      <view class="post-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <text class="back-icon">{{ t('campus.postTopic.cancel') }}</text>
      </view>
      <text class="post-header__title">{{ t('campus.postTopic.navTitle') }}</text>
      <view
        class="post-header__submit press-feedback"
        :class="{ 'post-header__submit--disabled': !canSubmit }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="submitTopic"
      >
        <text class="submit-text">{{ isSubmitting ? t('campus.postTopic.submitPublishing') : t('campus.postTopic.submitPublish') }}</text>
      </view>
    </view>

    <scroll-view class="post-body" scroll-y>
      <!-- 未认证/审核中/被驳回视角（real）：服务端私域门禁必拒且 400 消息被脱敏，
           页顶常驻可读原因 + 唯一出口「去认证」，避免用户填完整个表单才被拒 -->
      <view v-if="certGate === 'denied'" class="cert-banner">
        <text class="cert-banner__text">{{ t('campus.postTopic.certRequired') }}</text>
        <view class="cert-banner__btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('campus.postTopic.goCertification')" @tap="goCertification">
          <text class="cert-banner__btn-text">{{ t('campus.postTopic.goCertification') }}</text>
        </view>
      </view>

      <!-- 选择分类 -->
      <view class="category-section">
        <text class="section-label">{{ t('campus.postTopic.labelCategory') }}</text>
        <view class="category-list" role="list">
          <view class="category-row">
            <view
              v-for="cat in categoryOptions.slice(0, 3)" :key="cat.key"
              class="category-option"
              :class="{ 'category-option--selected': selectedCategory === cat.key }"
              @tap="selectCategory(cat.key)"
            >
              <text class="category-option__text">{{ cat.label }}</text>
            </view>
          </view>
          <view class="category-row">
            <view
              v-for="cat in categoryOptions.slice(3, 6)" :key="cat.key"
              class="category-option"
              :class="{ 'category-option--selected': selectedCategory === cat.key }"
              @tap="selectCategory(cat.key)"
            >
              <text class="category-option__text">{{ cat.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 标题输入 -->
      <view class="title-section">
        <text class="section-label">{{ t('campus.postTopic.labelTitle') }}</text>
        <input
  cursor-spacing="20"
          v-model="title"
          class="title-input"
          :placeholder="t('campus.postTopic.placeholderTitle')"
          maxlength="50" :aria-label="t('campus.postTopic.placeholderTitle')"
        />
      </view>

      <!-- 内容输入区 -->
      <view class="content-section">
        <text class="section-label">{{ t('campus.postTopic.labelContent') }}</text>
        <textarea
  cursor-spacing="20"
          v-model="content"
          class="content-input"
          :placeholder="t('campus.postTopic.placeholderContent')"
          :maxlength="MAX_LENGTH"
          :show-confirm-bar="false" :aria-label="t('campus.postTopic.placeholderContent')"
        />
        <view class="content-count" :class="{ 'content-count--over': isOverLimit }">
          <text>{{ currentLength }}/{{ MAX_LENGTH }}</text>
        </view>
      </view>

      <!-- 2026-08-26 P7：图片上传区（晒照片墙，上限 6 张） -->
      <view class="images-section">
        <view class="images-section__head">
          <text class="section-label">{{ t('campus.postTopic.imagePickLabel') }}</text>
          <text class="images-section__hint">{{ images.length }}/{{ MAX_IMAGES }}</text>
        </view>
        <!-- MP-R1-CAMPUSPOSTTOPIC-201：real 后端契约不收 images（见 script 内能力开关注释）
             → 常驻说明写在这里，而不是只在点「+」时闪一个 toast -->
        <text v-if="!imagesAccepted" class="images-section__warn">{{ t('campus.postTopic.imagesUnsupported') }}</text>
        <view class="images-list">
          <view v-for="(img, idx) in images" :key="idx" class="image-item">
            <image class="image-item__img" :src="img" mode="aspectFill" lazy-load alt="" />
            <view class="image-item__remove press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" aria-label="删除图片" @tap="removeImage(idx)">
              <text class="image-item__remove-icon">×</text>
            </view>
          </view>
          <view
            v-if="images.length < MAX_IMAGES"
            class="image-upload press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('campus.postTopic.imagePickLabel')"
            @tap="chooseImage"
          >
            <text class="image-upload__icon">+</text>
            <text class="image-upload__text">{{ t('campus.postTopic.imagePickHint') }}</text>
          </view>
        </view>
      </view>

      <!-- 功能4：帖子创建话题选择器（带搜索 + 自定义创建） -->
      <view class="topic-selector-section">
        <TopicSelector v-model="selectedTopics" />
      </view>

      <!-- 匿名开关 -->
      <view class="options-section">
        <view class="option-row">
          <view class="option-info">
            <text class="option-label">{{ t('campus.postTopic.labelAnonymous') }}</text>
            <!-- MP-R1-CAMPUSPOSTTOPIC-202：real 下匿名不落库（后端硬编码 false），
                 开启后原地把承诺文案替换为不可生效说明（同一文案位，不改卡片结构） -->
            <text class="option-desc" :class="{ 'option-desc--warn': anonymousBlocked }">{{ anonymousBlocked ? t('campus.postTopic.anonymousUnsupported') : t('campus.postTopic.anonymousDesc') }}</text>
          </view>
          <switch
            :checked="isAnonymous"
            :color="brandColor"
            @change="toggleAnonymous"
          />
        </view>
      </view>

      <!-- 底部提交按钮（移动端可见，防止内容过长时找不到顶部按钮） -->
      <view class="bottom-submit">
        <view
          class="bottom-submit__btn press-feedback"
          :class="{ 'bottom-submit__btn--disabled': !canSubmit }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="submitTopic"
        >
          <text class="bottom-submit__text">{{ isSubmitting ? t('campus.postTopic.submitPublishingBottom') : t('campus.postTopic.submitPublishBottom') }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
$green-primary: var(--c-brand);
$green-light: var(--c-brand-50);
$pink-primary: var(--c-romance-500);
$pink-light: var(--c-romance-50);
$white: var(--c-neutral-0);
$bg-page: var(--c-bg-page);
$text-primary: var(--c-text-primary);
/* ui-ux 修复：$text-secondary 统一映射到文本次要色 token */
$text-secondary: var(--c-text-secondary);
$text-tertiary: var(--c-text-tertiary);
/* ui-ux 修复：$border-light 统一为 border 系列 token */
$border-light: var(--c-border-light);
$error: var(--c-error);
$card-soft-shadow: 0 2rpx 16rpx var(--c-black-shadow-xs);

.post-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域。
     MP-R1-CAMPUSPOST-101：必须定高（height:100% 而非 min-height:100%）——
     原容器随内容增长，flex:1 的 .post-body scroll-view 失去高度约束 → 整页窗口滚动：
     自定义 header（取消/发布）滚出视口、分类 chips 与 textarea 顶入状态栏文字区
     （四帧像素扫描实证）。定高后恢复内滚、头部常驻（本页长表单是常态）。 */
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, var(--c-bg-brand) 0%, var(--c-bg-page) 20%);
}

/* ========== 顶部导航栏 ========== */
.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 20rpx) 32rpx 24rpx;
  /* MP-R1-CAMPUSPOST-003：header 右端「发布」按钮避让微信胶囊（全局 navigationStyle:custom，
     胶囊占位约右缘 7~94px 且纵向同带）——同 hub.vue R4 修复口径 */
  padding-right: calc(var(--capsule-right, 7px) + 104px);
  background: linear-gradient(135deg, $green-primary 0%, var(--c-brand-300) 60%, var(--c-romance-300) 100%);
}

.post-header__back {
  padding: 12rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-overlay-white-bg-mid-strong);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.post-header__back:active {
  transform: scale(0.96);
  background: var(--c-overlay-white-bg-stronger);
}
/* #endif */

.back-icon {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-inverse);
  font-weight: 500;
}

.post-header__title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.post-header__submit {
  padding: 14rpx 32rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-overlay-bg-pure);
  min-width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;
  box-shadow: 0 4rpx 12rpx var(--c-black-shadow-md);
}

/* #ifdef H5 */
.post-header__submit:active {
  transform: scale(0.96);
}
/* #endif */

.post-header__submit--disabled {
  background: var(--c-overlay-white-bg-stronger);
  box-shadow: none;
}

.submit-text {
  font-size: var(--fs-md, 26rpx);
  color: $green-primary;
  font-weight: 600;
}

.post-header__submit--disabled .submit-text {
  color: var(--c-overlay-white-text-strong);
}

.post-body {
  flex: 1;
  padding: 24rpx;
}

/* ========== 未认证引导横幅（real 视角，MP-R1-CAMPUSTOPIC 未认证差异化） ========== */
.cert-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx 28rpx;
  margin-bottom: 20rpx;
  border-radius: var(--r-xl, 24rpx);
  border: 2rpx solid var(--c-warning-border-tint);
  background: var(--c-warning-bg-tint);
}

.cert-banner__text {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-base, 24rpx);
  line-height: 1.5;
  color: var(--c-warning);
}

.cert-banner__btn {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-warning);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.cert-banner__btn:active {
  transform: scale(0.96);
}
/* #endif */

.cert-banner__btn-text {
  font-size: var(--fs-sm, 22rpx);
  font-weight: 600;
  color: var(--c-text-inverse);
  white-space: nowrap;
}

/* ========== 公共标签 ========== */
.section-label {
  display: block;
  font-size: var(--fs-md, 26rpx);
  color: $text-tertiary;
  margin-bottom: 16rpx;
  font-weight: 500;
}

/* ========== 分类选择 ========== */
.category-section {
  padding: 28rpx;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.category-row {
  display: flex;
  gap: 14rpx;
}

.category-option {
  flex: 1;
  padding: 20rpx 8rpx;
  border-radius: var(--r-lg, 16rpx);
  background: $bg-page;
  border: 2rpx solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.category-option:active {
  transform: scale(0.96);
}
/* #endif */

.category-option--selected {
  background: linear-gradient(135deg, $green-light, var(--c-tint-green-50));
  border-color: $green-primary;
  box-shadow: 0 4rpx 12rpx var(--c-brand-shadow-tint);
}

.category-option__text {
  font-size: var(--fs-md, 26rpx);
  font-weight: 500;
  color: $text-secondary;
  text-align: center;
}

.category-option--selected .category-option__text {
  color: $green-primary;
  font-weight: 600;
}

/* ========== 标题输入 ========== */
.title-section {
  padding: 28rpx;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.title-input {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 600;
  color: $text-primary;
  padding: 16rpx 20rpx;
  border-radius: var(--r-lg, 16rpx);
  background: $bg-page;
  border: 2rpx solid transparent;
  transition: all var(--d-normal, 200ms) ease;
}

.title-input:focus {
  border-color: $green-primary;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
}

/* ========== 内容输入区 ========== */
.content-section {
  padding: 28rpx;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.content-input {
  width: 100%;
  min-height: 240rpx;
  font-size: var(--fs-xl, 30rpx);
  color: $text-primary;
  line-height: 1.7;
  background: $bg-page;
  padding: 20rpx;
  border-radius: var(--r-lg, 16rpx);
  border: 2rpx solid transparent;
  box-sizing: border-box;
  transition: all var(--d-normal, 200ms) ease;
}

.content-input:focus {
  border-color: $green-primary;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
}

.content-count {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
  font-size: var(--fs-base, 24rpx);
  color: $text-tertiary;
}

.content-count--over {
  color: $error;
}

/* ========== 2026-08-26 P7：图片上传区 ========== */
.images-section {
  padding: 28rpx;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.images-section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.images-section__head .section-label {
  margin-bottom: 0;
}

.images-section__hint {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
}

/* MP-R1-CAMPUSPOSTTOPIC-201：real 契约不收 images 时的常驻说明（不靠 toast 一闪而过） */
.images-section__warn {
  display: block;
  margin-bottom: 16rpx;
  font-size: var(--fs-sm, 22rpx);
  line-height: 1.5;
  color: var(--c-warning);
}

.images-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item {
  position: relative;
  width: calc((100% - 32rpx) / 3);
  /* mp-weixin 不支持 aspect-ratio，用 padding-top 百分比实现 1:1 方格 */
  padding-top: calc((100% - 32rpx) / 3);
  border-radius: var(--r-lg, 16rpx);
  overflow: hidden;
  background: $bg-page;
}

.image-item__img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.image-item__remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--r-circle, 50%);
  background: var(--c-bg-overlay, rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-item__remove-icon {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-neutral-0, #ffffff);
  font-weight: 300;
  line-height: 1;
}

.image-upload {
  position: relative;
  width: calc((100% - 32rpx) / 3);
  /* mp-weixin 不支持 aspect-ratio，用 padding-top 百分比实现 1:1 方格 */
  padding-top: calc((100% - 32rpx) / 3);
  border-radius: var(--r-lg, 16rpx);
  border: 2rpx dashed $border-light;
  background: $bg-page;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-upload__icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -70%);
  font-size: var(--fs-2xl, 48rpx);
  color: $text-tertiary;
  font-weight: 300;
  line-height: 1;
}

.image-upload__text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 30%);
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
  white-space: nowrap;
}

/* ========== 选项区 ========== */
.options-section {
  padding: 28rpx;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 24rpx;
  box-shadow: $card-soft-shadow;
}

/* 功能4：话题选择器容器 */
.topic-selector-section {
  padding: 28rpx;
  /* R4-02524：卡片底色改用 --c-bg-container（深色模式自动适配） */
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 24rpx);
  margin-bottom: 20rpx;
  box-shadow: $card-soft-shadow;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
  min-width: 0;
  margin-right: 20rpx;
}

.option-label {
  font-size: var(--fs-lg, 28rpx);
  color: $text-primary;
  font-weight: 500;
}

.option-desc {
  font-size: var(--fs-sm, 22rpx);
  color: $text-tertiary;
}

/* MP-R1-CAMPUSPOSTTOPIC-202：real 下匿名开关不会生效时的替换文案态 */
.option-desc--warn {
  color: var(--c-warning);
}

/* ========== 底部提交 ========== */
.bottom-submit {
  padding: 20rpx 0 40rpx;
}

.bottom-submit__btn {
  width: 100%;
  padding: 28rpx 0;
  border-radius: var(--r-xl, 24rpx);
  background: linear-gradient(135deg, $green-primary, var(--c-brand-300));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx var(--c-brand-shadow-tint-strong);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.bottom-submit__btn:active {
  transform: scale(0.96);
  box-shadow: 0 4rpx 12rpx var(--c-brand-shadow-tint-mid);
}
/* #endif */

.bottom-submit__btn--disabled {
  background: $border-light;
  box-shadow: none;
}

.bottom-submit__text {
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-inverse);
  font-weight: 600;
}

.bottom-submit__btn--disabled .bottom-submit__text {
  color: $text-tertiary;
}
</style>
