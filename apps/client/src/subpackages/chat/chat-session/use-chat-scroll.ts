/**
 * 会话页滚动管理 composable（N-5 首期拆分，2026-11-03）。
 *
 * <p>从 {@code chat-session/index.vue}（3761 行巨型页面）抽出的<b>内聚块之一</b>：
 * scroll-view 的滚动位置、贴底判定（nearBottom）、上拉加载视口保持、
 * 新消息滚动策略（贴底自动滚 / 浏览历史亮提示条）与相关查询。
 * 逻辑与抽取前逐行等价（含 2026-08-09 微信化重构的全部修复注释语义），
 * 页面通过 {@link useChatScroll} 取回模板所需状态与回调。</p>
 *
 * <p>mp-weixin 兼容：查询走 {@code uni.createSelectorQuery().in(instance)}
 * （组件内查询必须限定实例）；scrollOffset 字段语义见 queryScrollHeight 注释。</p>
 */
import { nextTick, ref, watch, getCurrentInstance } from "vue";

/** 底部锚点 id（常量，模板与脚本共用） */
export const BOTTOM_ANCHOR_ID = "chat-bottom-anchor";

/** 距底多少 px 内视为「贴底」（微信行为阈值；固定字面量，无对应 token 档位） */
const NEAR_BOTTOM_THRESHOLD_PX = 120;

/** 上拉加载失败时的兜底提示文案（由调用方注入，保持 i18n 归属页面） */
export interface UseChatScrollOptions {
  /** 当前会话 ID（null=未就绪，上拉加载跳过） */
  sessionId: () => string | null;
  /** 是否临时匿名会话（temp 会话无历史分页概念，上拉加载跳过——见原 2026-08-09 修复注释） */
  isTempSession: () => boolean;
  /** 是否还有更早的历史消息（messagesStore.messageHasMore） */
  hasMore: () => boolean;
  /** 加载下一页更早消息（页面注入闭包：messagesStore.fetchOlderMessages(sessionId, messagePage + 1)）。
   * 设计说明：composable 不依赖任何具体 store，页码/会话 ID 归调用方闭包——单测可零依赖构造。 */
  loadOlder: () => Promise<unknown>;
  /** 新消息到达的监听源（messagesStore.currentMessages.length） */
  messageCount: () => number;
  /** 分页失败提示文案（t("chat.loadFailed") 由页面解析后注入） */
  loadFailedText: () => string;
}

/**
 * 滚动区选择器（.chat-scroll）：与页面模板的 scroll-view class 对应。
 * 抽成常量便于单测替换与防拼错。
 */
const SCROLL_SELECTOR = ".chat-scroll";

export function useChatScroll(options: UseChatScrollOptions) {
  /** scroll-view 纵向滚动位置（上拉加载旧消息时用于保持视口） */
  const scrollTop = ref(0);
  /** scroll-into-view 目标元素 id（进入/新消息滚底） */
  const scrollIntoViewId = ref("");
  /** 当前 scrollTop（onScroll 持续记录） */
  let curScrollTop = 0;
  /** 是否正在加载更早消息（防重入） */
  const loadingOlder = ref(false);
  /** 是否已滚到底部附近（决定新消息是否自动滚底 / 提示条展示） */
  let nearBottom = true;
  /** 浏览历史时收到新消息的「有新消息」提示条 */
  const unreadHintVisible = ref(false);
  /** 滚动区视口/内容高度缓存（onScroll 每帧查询会卡顿，仅在新消息到达时查询一次） */
  let scrollViewportHeight = 0;
  let scrollContentHeight = 0;

  /**
   * 记录滚动位置并维护 nearBottom（微信行为：贴底自动滚底，浏览历史亮提示条）。
   * 修复历史（2026-08-09，语义随本 composable 迁移）：原实现 onScroll 从不更新
   * nearBottom（恒 true），导致「浏览历史时收到新消息强制滚底」。
   */
  function onScroll(e: { detail?: { scrollTop?: number } }) {
    curScrollTop = e?.detail?.scrollTop ?? 0;
    const bottom = scrollContentHeight - scrollViewportHeight;
    if (bottom > 0) {
      nearBottom = bottom - curScrollTop < NEAR_BOTTOM_THRESHOLD_PX;
      if (nearBottom && unreadHintVisible.value) unreadHintVisible.value = false;
    }
  }

  /** 查询消息滚动区内容高度（Promise 包装 createSelectorQuery） */
  function queryScrollHeight(): Promise<number> {
    return new Promise((resolve) => {
      const instance = getCurrentInstance();
      const query = instance ? uni.createSelectorQuery().in(instance) : uni.createSelectorQuery();
      query
        .select(SCROLL_SELECTOR)
        // 必须 scrollOffset——fields({size:true}) 只返回 width/height，scrollHeight 恒 undefined；
        // scroll-view 用 scrollOffset 才携带 scrollHeight/scrollTop（历史缺陷判点，随拆分保留）
        .fields({ scrollOffset: true }, (res) => {
          const info = Array.isArray(res) ? res[0] : res;
          resolve(info?.scrollHeight ?? 0);
        })
        .exec();
    });
  }

  /** 查询消息滚动区视口高度（nearBottom 计算用） */
  function queryViewportHeight(): Promise<number> {
    return new Promise((resolve) => {
      const instance = getCurrentInstance();
      const query = instance ? uni.createSelectorQuery().in(instance) : uni.createSelectorQuery();
      query
        .select(SCROLL_SELECTOR)
        .fields({ size: true }, (res) => {
          const info = Array.isArray(res) ? res[0] : res;
          resolve(info?.height ?? 0);
        })
        .exec();
    });
  }

  /** 滚动到底部（进入页面 / 新消息到达） */
  function scrollToBottom() {
    scrollTop.value = 0;
    scrollIntoViewId.value = "";
    void nextTick(() => {
      scrollIntoViewId.value = BOTTOM_ANCHOR_ID;
    });
  }

  /** 刷新滚动区高度缓存（进入会话/图片加载完成后由页面调用，nearBottom 计算依赖） */
  function refreshHeights(): Promise<[number, number]> {
    return Promise.all([queryScrollHeight(), queryViewportHeight()]).then(([contentH, viewportH]) => {
      scrollContentHeight = contentH;
      scrollViewportHeight = viewportH;
      return [contentH, viewportH] as [number, number];
    });
  }

  /**
   * 上拉加载更早历史消息（微信行为：加载后视口不跳）。
   * 通过「加载前 scrollHeight - 当前 scrollTop」测量距底距离，
   * 加载后设置 scrollTop = 新scrollHeight - 原距底距离 保持视口。
   */
  function onScrollToUpper() {
    // 临时匿名会话跳过上拉分页——fetchOlderMessages 走私信接口（Long 数字主键），
    // temp 会话（"session-{a}-{b}-{hex}"）调用必然 500；temp-chat 一次性返回全部消息
    if (loadingOlder.value || !options.sessionId() || !options.hasMore() || options.isTempSession()) {
      return;
    }
    void (async () => {
      loadingOlder.value = true;
      try {
        const before = await queryScrollHeight();
        await options.loadOlder();
        await nextTick();
        const after = await queryScrollHeight();
        // 同步更新滚动区高度缓存（nearBottom 计算依赖）
        scrollContentHeight = after;
        // scroll-top 与 scroll-into-view 互斥：先清 into-view 再设置 scroll-top
        scrollIntoViewId.value = "";
        scrollTop.value = after - (before - curScrollTop);
      } catch (err) {
        // 分页失败轻提示（原 rejection 未处理进全局 onError 的历史修复语义保持）
        uni.showToast({
          title: err instanceof Error ? err.message : options.loadFailedText(),
          icon: "none",
        });
      } finally {
        loadingOlder.value = false;
      }
    })();
  }

  /**
   * 新消息到达时的滚动策略：
   * - 贴底（nearBottom）：自动滚底，最新消息始终可见；
   * - 浏览历史（未贴底）：不打断阅读，亮「有新消息」提示条；
   * - 上拉加载旧消息（loadingOlder）时长度也变化，但由 onScrollToUpper 保持视口，此处跳过。
   */
  watch(options.messageCount, () => {
    if (loadingOlder.value) return;
    if (nearBottom) {
      scrollToBottom();
    } else {
      void refreshHeights().then(() => {
        unreadHintVisible.value = true;
      });
    }
  });

  /**
   * 进入会话的滚动初始化：置贴底 → nextTick 内刷新高度缓存并滚底。
   * （onScroll 的 nearBottom 计算依赖高度缓存，不初始化则浏览历史时 nearBottom 恒 true——
   * 原 2026-08-09 微信化重构注释语义随拆分保留。）
   */
  function enterSession() {
    nearBottom = true;
    void nextTick(() => {
      void refreshHeights();
      scrollToBottom();
    });
  }

  /** 离开前台时取消贴底（onHide 调用：压栈/切后台后回来不强行滚底，微信行为） */
  function markAway() {
    nearBottom = false;
  }

  /** 点击「有新消息」提示条：跳转最新并隐藏（微信行为） */
  function jumpToLatest() {
    unreadHintVisible.value = false;
    nearBottom = true;
    scrollToBottom();
  }

  return {
    scrollTop,
    scrollIntoViewId,
    loadingOlder,
    unreadHintVisible,
    onScroll,
    onScrollToUpper,
    scrollToBottom,
    refreshHeights,
    jumpToLatest,
    enterSession,
    markAway,
  };
}
