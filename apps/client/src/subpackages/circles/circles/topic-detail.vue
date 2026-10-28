<script setup lang="ts">


/**
 * 话题详情页
 * 展示话题完整内容、作者信息、回复列表，底部回复输入框
 * 支持从回复直接"打招呼"跳转到私信会话
 */
import { ref, computed } from "vue";
import { onLoad, onShareAppMessage } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCircleStore, formatCircleTime, type ReplyItem, type CircleMentionCandidate } from "../../../stores/circle";
import { ROUTES } from "../../../constants/routes";
import { useSessionStore } from "../../../stores/session";
import { useReportStore } from "../../../stores/report";
import { openAppPath } from "../../../utils/navigation";
import { useMock } from "../../../stores/helpers/use-mock";
// B4 认证门控：打招呼（发起私信）为互动操作，需已通过实名认证
import { ensureCertified } from "../../../guards/campus-gate";
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../../utils/media";
import EmptyState from "../../../components/common/EmptyState.vue";
import MentionPickerSheet from "../../../components/circle/MentionPickerSheet.vue";
// R11-G2：注入 --statusbar（本页样式使用 var(--statusbar, env(...))，DevTools env 恒 0 必须由 JS 注入）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const { t } = useI18n();
const circleStore = useCircleStore();
const sessionStore = useSessionStore();
const reportStore = useReportStore();
const { currentTopic, replies, loading } = storeToRefs(circleStore);

/** 回复内容 */
const replyContent = ref("");
/** 是否正在提交回复 */
const isSubmitting = ref(false);
/** 话题 ID */
const topicId = ref("");

/* ===== 2026-10-28：回复 @提及同圈成员 ===== */
const mentionPickerOpen = ref(false);
const mentionLoading = ref(false);
const mentionCandidates = ref<CircleMentionCandidate[]>([]);
const mentionedUsers = ref<CircleMentionCandidate[]>([]);
const canMention = computed(() => {
  const circleId = currentTopic.value?.circleId;
  return !useMock() && !!circleId && /^\d+$/.test(String(circleId));
});

async function openMentionPicker(): Promise<void> {
  const circleId = currentTopic.value?.circleId;
  if (!canMention.value || !circleId || mentionLoading.value) return;
  mentionPickerOpen.value = true;
  mentionLoading.value = true;
  try {
    mentionCandidates.value = await circleStore.fetchMentionCandidates(String(circleId));
  } catch (_e) {
    uni.showToast({ title: t("circle.mentionLoadFailed"), icon: "none" });
  } finally {
    mentionLoading.value = false;
  }
}

function confirmMentions(ids: number[]): void {
  mentionedUsers.value = mentionCandidates.value.filter((c) => ids.includes(c.userId));
  mentionPickerOpen.value = false;
  for (const user of mentionedUsers.value) {
    const token = `@${user.nickname}`;
    if (!replyContent.value.includes(token)) {
      const separator = replyContent.value.trim().length > 0 ? " " : "";
      replyContent.value = `${replyContent.value}${separator}${token} `;
    }
  }
}

/* ========== R4-00102：回复分页加载更多 ========== */
/** 当前已加载的回复页码（从第 1 页开始，store.fetchReplies 支持 page 追加） */
const replyPage = ref(1);
/** 是否正在加载更多回复 */
const isLoadingMoreReplies = ref(false);
/** 是否还有更多回复（已加载回复数 < 服务端总数 replyCount） */
const repliesHasMore = computed(() =>
  replies.value.length < (currentTopic.value?.replyCount ?? 0)
);

/**
 * 加载下一页回复（store.fetchReplies(topicId, page) 对 page>1 追加到 replies）。
 */
async function loadMoreReplies(): Promise<void> {
  if (!topicId.value || isLoadingMoreReplies.value || !repliesHasMore.value) return;
  isLoadingMoreReplies.value = true;
  try {
    await circleStore.fetchReplies(topicId.value, replyPage.value + 1);
    replyPage.value += 1;
  } catch (_e) {
    uni.showToast({ title: t("circle.topicDetailLoadMoreFailed"), icon: "none" });
  } finally {
    isLoadingMoreReplies.value = false;
  }
}

/**
 * R4-00104：昵称首字符兜底（author.name 为空/null 时返回占位符，
 * 避免 name[0] 抛 TypeError 崩溃渲染）。
 */
function initialOf(name?: string | null): string {
  return name && name.length > 0 ? name.charAt(0) : "?";
}

/** 当前登录用户 ID */
const currentUserId = computed(() => sessionStore.userSession?.userId ?? "");


/**
 * SubTask 1.5.2：页面卸载时清理未触发的淡入定时器。
 */
/**
 * 提交回复
 */
async function submitReply() {
  if (!topicId.value || !replyContent.value.trim()) return;

  isSubmitting.value = true;
  try {
    await circleStore.replyToTopic(
      topicId.value,
      replyContent.value.trim(),
      mentionedUsers.value.map((u) => u.userId)
    );
    replyContent.value = "";
    mentionedUsers.value = [];
    uni.showToast({ title: t("circle.topicDetailReplySuccess"), icon: "success" });
  } catch (_e) {
    uni.showToast({
      title: circleStore.errorMessage || t("circle.topicDetailReplyFailed"),
      icon: "none",
    });
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * 向回复者发起"打招呼"，跳转到私信会话页并预填破冰文案
 * @param reply - 目标回复项
 */
function sayHello(reply: ReplyItem) {
  if (!currentTopic.value || !reply.author.userId) return;
  // B4 认证门控：打招呼（发起私信）为互动操作，需已通过实名认证
  if (!ensureCertified("realname")) return;

  const topicTitle = currentTopic.value.title;

  // 基于话题上下文生成破冰文案
  const prefillMessage = t("circle.topicDetailSayHelloPrefill", { topic: topicTitle });

  // 引用上下文：话题标题 + 回复内容 + 回复者名
  const quoteContext = JSON.stringify({
    topicTitle,
    topicId: topicId.value,
    replyId: reply.id,
    replyContent: reply.content,
    replyAuthorName: reply.author.name,
  });

  // 跳转到私信会话页，携带目标用户 ID、预填消息和引用上下文
  openAppPath(
    `/subpackages/chat/chat-session/index?userId=${reply.author.userId}&prefillMessage=${encodeURIComponent(prefillMessage)}&quoteContext=${encodeURIComponent(quoteContext)}`
  );
}

/**
 * 跳转到作者 / 回复者个人主页（F1.3）
 * 头像点击事件使用 catchtap 阻止冒泡，避免触发外层卡片或长按事件
 * @param authorId - 作者 userId
 */
function goToAuthorProfile(authorId: string) {
  if (!authorId) return;
  openAppPath(`/pages/profile/index?userId=${encodeURIComponent(authorId)}`);
}

/**
 * 返回上一页
 */
function goBack() {
  circleStore.clearCurrentTopic();
  // MP-R2-NAV-001：栈底兜底
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.reLaunch({ url: "/subpackages/circles/circles/index" });
  }
}

/** 举报原因选项（与产品约定，覆盖常见违规场景；Task 28：i18n 化计算属性） */
const REPORT_REASONS = computed<string[]>(() => [
  t("circle.topicDetailReportSpam"),
  t("circle.topicDetailReportAbuse"),
  t("circle.topicDetailReportPorn"),
  t("circle.topicDetailReportIllegal"),
  t("circle.topicDetailReportOther"),
]);

/**
 * 长按话题触发举报流程。
 * 1. 弹出 ActionSheet 选择举报原因
 * 2. 弹出 Modal 收集可选补充描述
 * 3. 调用后端举报接口持久化
 */
async function handleReportTopic() {
  if (!topicId.value) return;

  // 1. 选择举报原因
  let reason: string;
  try {
    const res = await uni.showActionSheet({ itemList: REPORT_REASONS.value });
    // 修复（严格模式 noUncheckedIndexedAccess）：REPORT_REASONS[res.tapIndex] 索引访问返回 string | undefined，
    // 此处兜底取第一项，确保 reason 始终为 string（与 showActionSheet 的 itemList 一一对应，正常流程不会越界）。
    reason = REPORT_REASONS.value[res.tapIndex] ?? REPORT_REASONS.value[0] ?? "";
  } catch (_e) {
    // 用户取消选择，静默退出
    return;
  }

  // 2. 收集可选补充描述
  let description: string | undefined;
  try {
    const res = await uni.showModal({
      title: t("circle.topicDetailReportSupplementTitle"),
      editable: true,
      placeholderText: t("circle.topicDetailReportSupplementPlaceholder"),
      confirmText: t("circle.topicDetailReportSubmit"),
      cancelText: t("circle.topicDetailReportSkip"),
    });
    if (res.confirm && res.content) {
      description = res.content;
    }
  } catch (_e) {
    // 取消则不附加描述，继续提交
  }

  // 3. 调用举报接口
  try {
    await reportStore.reportTarget("TOPIC", topicId.value, reason, description);
    uni.showToast({ title: t("circle.topicDetailReportSubmitted"), icon: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t("circle.topicDetailReportFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

onLoad((query) => {
  // P1-03 修复（review）：改用 onLoad(query) 取参，替代 getCurrentPages().options。
  // 原实现依赖页面栈读取参数，H5 端直开链接/分享进入时 getCurrentPages 拿不到 query，
  // 导致话题详情恒为空。onLoad 的 query 由路由统一注入，mp-weixin 与 H5 双端可靠。
  // 2026-08-27 兴趣圈修复：兼容 topicId / id 两种参数名，避免 ?id=1 直开显示"话题不存在"。
  topicId.value = query?.topicId ?? query?.id ?? "";

  if (topicId.value) {
    // R4-00102：进入新话题时重置回复分页游标
    replyPage.value = 1;
    void circleStore.fetchTopicDetail(topicId.value);
    void circleStore.fetchReplies(topicId.value, 1);
  } else {
    // infra R2-00074 / R11-L04-D06：topicId 缺失（直开分享链接、参数名不对）是「链接不完整」，
    // 不是「话题已被删除」。原先只弹一条 2 秒 toast，页面随后落到「不存在」空态，
    // 用户拿不到真实成因也没有可点出口 ⇒ 现由模板的 missing-id 空态分支承接（含返回出口）。
    // 先清掉上一跳留在 store 里的 currentTopic/errorMessage，否则 v-if="currentTopic" 会
    // 展示陈旧话题、把这次空态整支短路掉。
    circleStore.clearCurrentTopic();
    circleStore.errorMessage = null;
  }
});

// MP-R1-TOPICDETAIL-001：加载失败错误态（与 campus/topic-detail review #18 同款）——
// fetchTopicDetail 失败 store 置 errorMessage 并 rethrow，模板原只有「话题不存在」分支，
// 401/网络失败被误渲染成「话题不存在」；现加 network 分支 + 重试
const errorMessage = computed(() => circleStore.errorMessage);
function retryLoad() {
  if (!topicId.value) return;
  circleStore.errorMessage = null;
  void circleStore.fetchTopicDetail(topicId.value);
  void circleStore.fetchReplies(topicId.value, 1);
}

// 修复（严格模式 noUnusedLocals）：sayHello/goToAuthorProfile 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ sayHello, goToAuthorProfile, confirmMentions });

/**
 * 圈子话题分享（2026-08-10 A3 补齐）：分享卡片指向圈子话题详情
 * （topicId + circleId 双参数，接收方点开即落到对应话题）。
 */
onShareAppMessage(() => {
  const title = currentTopic.value?.title?.trim() || "";
  const base = ROUTES.CIRCLES.TOPIC_DETAIL;
  return {
    title: title ? t("share.shareCircleTopic", { title }) : t("share.shareVillage"),
    path: `${base}?topicId=${encodeURIComponent(topicId.value)}&circleId=${encodeURIComponent(String(currentTopic.value?.circleId ?? ""))}`,
  };
});
</script>

<template>
  <view class="detail-page" :style="menuStyleVars">
    <!-- 顶部导航栏 -->
    <view class="detail-header">
      <view class="detail-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="goBack">
        <text class="back-icon">{{ t("circle.topicDetailBack") }}</text>
      </view>
      <text class="detail-header__title">{{ t("circle.topicDetailNavTitle") }}</text>
      <view class="detail-header__spacer" />
    </view>

    <!-- 话题内容 -->
    <scroll-view v-if="currentTopic" class="detail-body" scroll-y>
      <!-- 作者信息 -->
      <view class="topic-author">
        <view
          class="author-avatar"
  @tap.stop="goToAuthorProfile(currentTopic.author.userId)"
        >
          <image
            v-if="currentTopic.author.avatar"
            class="author-avatar__img"
            :src="resolveMediaUrl(currentTopic.author.avatar)"
            mode="aspectFill" lazy-load alt=""
          />
          <text v-else class="author-avatar__char">{{ initialOf(currentTopic.author.name) }}</text>
        </view>
        <view class="author-info">
          <text class="author-info__name">{{ currentTopic.author.name }}</text>
          <text class="author-info__headline">{{ currentTopic.author.headline }}</text>
        </view>
        <text class="topic-time">{{ formatCircleTime(currentTopic.createdAt) }}</text>
      </view>

      <!-- 话题正文 -->
      <view class="topic-content" @longpress="handleReportTopic">
        <text class="topic-title">{{ currentTopic.title }}</text>
        <text class="topic-text">{{ currentTopic.content }}</text>

        <!-- 图片展示 -->
        <view v-if="currentTopic.images.length > 0" class="topic-images">
          <view
            v-for="(img, idx) in currentTopic.images" :key="img || idx"
            class="topic-image-wrap"
          >
            <image
              class="topic-image"
              :src="resolveMediaUrl(img)"
              mode="aspectFill"
              lazy-load alt=""
            />
          </view>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="replies-section">
        <view class="replies-header">
          <text class="replies-title">{{ t("circle.topicDetailRepliesTitle") }}</text>
          <!-- review #54：改用服务端 replyCount（含未加载分页回复），而非仅本地已加载 replies.length -->
          <text class="replies-count">{{ currentTopic.replyCount }}</text>
        </view>

        <!-- 加载状态 -->
        <view v-if="loading" class="replies-loading">
          <view class="loading-spinner" role="status" aria-live="polite" :aria-label="t('circle.topicDetailLoadingAria')" />
          <text class="loading-text">{{ t("circle.topicDetailLoadingReplies") }}</text>
        </view>

        <!-- 回复列表 -->
        <view v-else-if="replies.length > 0" class="replies-list" role="list">
          <view
            v-for="reply in replies" :key="reply.id"
            class="reply-item list-item"
          >
            <view
              class="reply-avatar"
  @tap.stop="goToAuthorProfile(reply.author.userId)"
            >
              <image
                v-if="reply.author.avatar"
                class="reply-avatar__img"
                :src="resolveMediaUrl(reply.author.avatar)"
                mode="aspectFill" lazy-load alt=""
              />
              <text v-else class="reply-avatar__char">{{ initialOf(reply.author.name) }}</text>
            </view>
            <view class="reply-body">
              <view class="reply-content">
                <view class="reply-header">
                  <text class="reply-author">{{ reply.author.name }}</text>
                  <text class="reply-time">{{ formatCircleTime(reply.createdAt) }}</text>
                </view>
                <text class="reply-text">{{ reply.content }}</text>
              </view>
              <!-- 打招呼按钮：不显示在自己回复上 -->
              <view
                v-if="reply.author.userId !== currentUserId"
                class="reply-say-hello"
  @tap.stop="sayHello(reply)"
              >
                <text class="reply-say-hello__text">{{ t("circle.topicDetailSayHello") }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-else class="replies-empty">
          <text class="replies-empty__text">{{ t("circle.topicDetailEmptyReplies") }}</text>
        </view>

        <!-- R4-00102：回复分页「加载更多」 -->
        <view
          v-if="repliesHasMore"
          class="replies-more press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('circle.topicDetailLoadMoreReplies')"
          @tap="loadMoreReplies"
        >
          <text class="replies-more__text">
            {{ isLoadingMoreReplies ? t("circle.topicDetailLoadingMoreReplies") : t("circle.topicDetailLoadMoreReplies") }}
          </text>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="body-footer" />
    </scroll-view>

    <!-- R11-L04-D06（空态文案 P1）：topicId 缺失单独一档——原实现落到下面「不存在或已被删除」
         分支，把「参数缺失」谎报成「话题被删」，且没有自助出口。EmptyState 只支持一个动作
         （EmptyState.vue:31 单 actionText），故保留唯一有意义的「返回」出口（栈底时 goBack
         会 reLaunch 回圈子列表，见 :145-153），不做无 topicId 可重试的死按钮。 -->
    <EmptyState
      v-else-if="!loading && !topicId"
      class="empty-state"
      :hide-sub="true"
      :title="t('storeErrors.circle.topicIdInvalid')"
      :action-text="t('circle.topicDetailBack')"
      type="no-data"
      @action="goBack"
    />

    <!-- MP-R1-TOPICDETAIL-001：加载失败错误态（与"话题不存在"区分，提供重试）
         R10-L04-D04（位置 P2）：把模板上真实存在的宿主 class `empty-state` 挂到组件标签自身
         （已知机制 §1：跨 SafeImage/EmptyState 作用域边界的唯一宿主面就是组件标签节点），
         于是本文件 :810 那条 `flex:1 + justify-content:center` 从死样式变成生效规则。 -->
    <EmptyState
      v-else-if="!loading && errorMessage"
      class="empty-state"
      type="network"
      :title="errorMessage || t('circle.topicDetailNotExist')"
      :action-text="t('common.retry')"
      @action="retryLoad"
    />

    <!-- 话题不存在
         R10-L04-D07（文案 P3）：组件已为本页备好 hide-sub（EmptyState.vue:92「R10-P2-008：
         hideSub 允许只留一句」），这里补传 ⇒ 主标题「话题不存在或已被删除」不再与
         预设副标题「这里空空如也」重复；动作文案「返回」本身就是回列表的指引。
         用显式 :hide-sub="true"（同族页 campus/topic-detail.vue:328 同口径），
         不留给 mp 编译器对裸布尔属性的解释空间。 -->
    <EmptyState
      v-else-if="!loading"
      class="empty-state"
      :hide-sub="true"
      :title="t('circle.topicDetailNotExist')"
      :action-text="t('circle.topicDetailBack')"
      type="no-data"
      @action="goBack"
    />

    <!-- 底部回复栏 -->
    <view v-if="currentTopic" class="detail-footer">
      <view v-if="canMention" class="reply-mention press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="openMentionPicker">
        <text class="reply-mention__icon">@</text>
      </view>
      <view class="reply-input-wrap">
        <input
  cursor-spacing="20"
          v-model="replyContent"
          class="reply-input"
          :placeholder="t('circle.topicDetailReplyPlaceholder')"
          confirm-type="send"
          @confirm="submitReply" :aria-label="t('circle.topicDetailReplyPlaceholder')"
        />
      </view>
      <view
        class="reply-btn press-feedback"
        :class="{ 'reply-btn--disabled': !replyContent.trim() || isSubmitting }"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="submitReply"
      >
        <text class="reply-btn__text">{{ isSubmitting ? t("circle.topicDetailReplySending") : t("circle.topicDetailReplySend") }}</text>
      </view>
    </view>

    <MentionPickerSheet
      :visible="mentionPickerOpen"
      :candidates="mentionCandidates"
      :loading="mentionLoading"
      :selected-ids="mentionedUsers.map((u) => u.userId)"
      @close="mentionPickerOpen = false"
      @confirm="confirmMentions"
    />
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域
     R10-L04-D04（位置 P2）修正这条口径：本页 navigationStyle 是 custom，100vh 就等于可视区，
     而 `min-height:100%` 在祖先（page/body）无确定高时退化成 auto ⇒ 整条 flex 列高度不可解析，
     空态的 flex:1 无处伸展（实测空态块中心 y=240，而页头下内容区中线 451，偏上 211px≈419rpx）。
     与 AppShell R8 同口径改 100vh（已知机制 §3），既有内容态只是把内滚交给 .detail-body，不产生新遮挡。 */
  min-height: 100vh;
  background: linear-gradient(180deg, var(--c-bg-brand) 0%, var(--c-bg-page) 20%);
}

/* ========== 顶部导航栏 ========== */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(calc(var(--statusbar, env(safe-area-inset-top)) + 20px) + var(--sp-6)) var(--sp-8) var(--sp-6);
  background: var(--c-gradient-brand);
  z-index: 10;
}

.detail-header__back {
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-full);
  /* R10-L04-D06（可达性 P1）：改前 rgba(255,255,255,.25) 半透明白胶囊叠在页头
     --c-gradient-brand（实测 #48D0A1）上 → 胶囊成 #D1F3E8，白字压它只有 1.19:1，
     文字与胶囊边界一起消失。改用仓内既有的「图上徽标成对令牌」深玻璃档
     --c-badge-on-image-bg（rgba(15,23,42,.7)）：叠后 ≈#204E4D，
     文字（--c-badge-on-image-text）8.4:1、胶囊边界压头图 4.78:1，两项同过（≥4.5 / ≥3）。
     页头渐变本身按 §11.3 的在册方向不动（那是页头语言，不是本条判点）。 */
  background: var(--c-badge-on-image-bg);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.detail-header__back:active {
  transform: scale(0.96);
  background: var(--c-overlay-stronger);
}
/* #endif */

.back-icon {
  font-size: var(--fs-lg);
  /* R10-L04-D06：成对令牌的另一半（深底白字档 rgba(255,255,255,.95)），
     不再用 --c-neutral-0 直接压半透明白。 */
  color: var(--c-badge-on-image-text);
  font-weight: 500;
}

.detail-header__title {
  font-size: var(--fs-xl);
  font-weight: 700;
  /* R10-L04-D06 同带在册项：标题同为 var(--c-neutral-0) 白字压 mint 页头 = 2.10:1，
     与返回控件是一条判线（卡要求「把返回文字做到 ≥4.5」，标题留在 2.1 会立刻被复判打回）。
     页头渐变是定值 mint→brand-300（非用户图），深墨 --c-text-primary 压两档分别 8.00 / 9.74:1。 */
  color: var(--c-text-primary);
}

.detail-header__spacer {
  min-width: 80rpx;
}

/* ========== 内容区 ========== */
.detail-body {
  flex: 1;
  /* R10-L04-D04 配套（防回归）：.detail-page 有了 100vh 可解析高度后，flex 子项默认
     min-height:auto 会让长话题把列撑高、页脚回复栏被顶出视口 —— 与同族根因
     （topics.vue:892 .topics-list）同口径补 min-height:0，把滚动交给 scroll-view 自身。 */
  min-height: 0;
  padding: var(--sp-6);
}

/* 作者信息 */
.topic-author {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-7);
  background: var(--c-neutral-0);
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  box-shadow: var(--s-card-soft);
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.topic-author:active {
  transform: scale(0.98);
}
/* #endif */

.author-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.author-avatar__img {
  border-radius: var(--r-full);

  width: 100%;
  height: 100%;
}

.author-avatar__char {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-brand-500);
}

.author-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.author-info__name {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.author-info__headline {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-time {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

/* 话题正文 */
.topic-content {
  padding: var(--sp-7);
  background: var(--c-neutral-0);
  border-radius: 0 0 var(--r-xl) var(--r-xl);
  margin-bottom: var(--sp-5);
  box-shadow: var(--s-card-soft);
}

.topic-title {
  display: block;
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1.5;
  margin-bottom: var(--sp-5);
}

.topic-text {
  font-size: var(--fs-lg);
  color: var(--c-text-secondary);
  line-height: 1.8;
  display: block;
  margin-bottom: var(--sp-5);
  white-space: pre-wrap;
}

.topic-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.topic-image-wrap {
  width: calc((100% - 20rpx) / 3);
}

.topic-image {
  width: 100%;
  height: 200rpx;
  border-radius: var(--r-md);
  background: var(--c-bg-page);
}

/* ========== 评论区 ========== */
.replies-section {
  background: var(--c-neutral-0);
  padding: var(--sp-7);
  border-radius: var(--r-xl);
  box-shadow: var(--s-card-soft);
}

.replies-header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-6);
}

.replies-title {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.replies-count {
  font-size: var(--fs-base);
  color: var(--c-brand-500);
  background: var(--c-bg-brand);
  padding: 6rpx 18rpx;
  border-radius: var(--r-full);
  font-weight: 600;
}

.replies-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  padding: 40rpx 0;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid var(--c-border-default);
  border-top-color: var(--c-brand-500);
  border-radius: var(--r-circle, 50%);
  animation: spin var(--d-loop, 1000ms) linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
}

.reply-item {
  display: flex;
  gap: var(--sp-4);
  padding: var(--sp-5);
  background: var(--c-bg-page);
  border-radius: var(--r-lg);
  transition: transform var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.reply-item:active {
  transform: scale(0.98);
}
/* #endif */

.reply-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: var(--r-circle, 50%);
  overflow: hidden;
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.reply-avatar__img {
  border-radius: var(--r-full);

  width: 100%;
  height: 100%;
}

.reply-avatar__char {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-brand-500);
}

.reply-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.reply-content {
  flex: 1;
  min-width: 0;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: 10rpx;
}

.reply-author {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.reply-time {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.reply-text {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
  line-height: 1.6;
}

/* ========== 打招呼按钮 ========== */
.reply-say-hello {
  align-self: flex-start;
  padding: 10rpx var(--sp-6);
  border-radius: var(--r-full);
  background: linear-gradient(135deg, var(--c-bg-brand) 0%, var(--c-bg-romance) 100%);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.reply-say-hello:active {
  transform: scale(0.96);
  background: var(--c-gradient-float-btn);
}
/* #endif */

/* #ifdef H5 */
.reply-say-hello:active .reply-say-hello__text {
  color: var(--c-neutral-0);
}
/* #endif */

.reply-say-hello__text {
  font-size: var(--fs-sm);
  color: var(--c-brand-500);
  font-weight: 600;
}

.replies-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;
}

.replies-empty__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

/* R4-00102：回复分页「加载更多」按钮 */
.replies-more {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 热区高度 ≥ 44px 可点击标准 */
  min-height: 88rpx;
  margin-top: var(--sp-4);
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: 1rpx solid var(--c-border-light);
}

.replies-more__text {
  font-size: var(--fs-md);
  font-weight: 500;
  color: var(--c-brand-700);
}

.body-footer {
  height: 40rpx;
}

/* ========== 空状态 ========== */
/* R10-L04-D04（位置 P2）：这条规则此前是死样式 —— 模板渲染的是 <EmptyState> 组件
   （组件根类名 .empty），页面上没有 `.empty-state` 节点，所以「flex:1 + 居中」从未生效
   （已知机制 §3 第 2 形态）。现在两个 EmptyState 标签自身挂上了 class="empty-state"，
   规则落到宿主节点；配合 .detail-page 改 min-height:100vh 给出可解析高度，
   空态才真正在「页头以下到页面底」之间垂直居中（不再是偏上 419rpx 的贴顶块）。
   align-items 从 center 改 stretch：让组件继续占满整幅、由它自己的内部居中负责水平排版，
   避免宿主把组件压成内容宽后出现新的换行错位。 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: var(--sp-6);
}

.empty-state__text {
  font-size: var(--fs-xl);
  color: var(--c-text-tertiary);
}

.empty-state__back {
  padding: 18rpx 48rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  box-shadow: var(--s-brand);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.empty-state__back:active {
  transform: scale(0.96);
}
/* #endif */

.back-text {
  font-size: var(--fs-lg);
  color: var(--c-neutral-0);
  font-weight: 600;
}

/* ========== 底部回复栏 ========== */
.detail-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-5) var(--sp-8);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-5));
  background: var(--c-neutral-0);
  box-shadow: 0 -4rpx 16rpx var(--c-black-shadow-xs, var(--c-black-shadow-xs, rgba(0, 0, 0, 0.04)));
}

.reply-input-wrap {
  flex: 1;
}

.reply-mention {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-brand-50);
  flex-shrink: 0;
}

.reply-mention__icon {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--c-brand-700);
}

.reply-input {
  padding: var(--sp-5) var(--sp-7);
  border-radius: var(--r-full);
  background: var(--c-bg-page);
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  border: 2rpx solid transparent;
  transition: all var(--d-normal, 200ms) ease;
}

.reply-input:focus {
  border-color: var(--c-brand-500);
  background: var(--c-neutral-0);
}

.reply-btn {
  padding: 18rpx var(--sp-8);
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  flex-shrink: 0;
  box-shadow: var(--s-brand-md);
  transition: all var(--d-fast, 120ms) ease;
}

/* #ifdef H5 */
.reply-btn:active {
  transform: scale(0.96);
}
/* #endif */

.reply-btn--disabled {
  background: var(--c-border-default);
  box-shadow: none;
  pointer-events: none;
}

.reply-btn__text {
  font-size: var(--fs-md);
  color: var(--c-neutral-0);
  font-weight: 600;
  white-space: nowrap;
}

.reply-btn--disabled .reply-btn__text {
  color: var(--c-text-tertiary);
}
</style>
