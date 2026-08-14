/**
 * ============================================================
 *  微信小程序自定义 TabBar 配置
 * ============================================================
 *
 *  注意：此文件中的 tabs 配置必须与 src/config/navigation.ts
 *  中的 appTabs 数组保持完全一致（顺序、路径、图标）。
 *
 *  唯一真相源：src/config/navigation.ts
 *
 *  由于微信小程序原生 .js 文件无法直接 import TypeScript，
 *  此处配置需手动同步。修改 Tab 配置时请遵循以下顺序：
 *  1. 先修改 src/config/navigation.ts 中的 appTabs
 *  2. 再同步更新此文件中的 tabs 配置
 *  3. 同时更新 src/pages.json 中的 tabBar.list
 *
 *  配置映射关系（navigation.ts → 本文件）：
 *    id           → id
 *    label        → label
 *    path         → path        (注意：wx.switchTab 的 url 必须以 "/" 开头（绝对路径），
 *                               否则微信会基于当前页面目录解析相对路径，导致
 *                               "pages/profile/pages/discover/index is not found"
 *                               类错误；pages.json 的 tabBar.pagePath 则不带前导斜杠)
 *    iconPath     → iconPath    (注意：静态资源路径前加 /)
 *    selectedIconPath → activeIconPath (注意：静态资源路径前加 /)
 *    prominent    → prominent
 *
 * ============================================================
 */
Component({
  properties: {
    selected: {
      type: Number,
      value: 0,
    },
  },
  data: {
    tabs: [
      {
        id: "home",
        label: "首页",
        path: "pages/home/index",
        iconPath: "/static/assets/icons/tabbar/home-default.png",
        activeIconPath: "/static/assets/icons/tabbar/home-active.png",
        prominent: false,
      },
      {
        id: "discover",
        label: "匹配",
        path: "pages/discover/index",
        iconPath: "/static/assets/icons/tabbar/discover-default.png",
        activeIconPath: "/static/assets/icons/tabbar/discover-active.png",
        // 匹配页是启动默认页（pages 数组第一项），但 tab 顺序中位于第 2 位
        prominent: false,
      },
      {
        id: "village",
        label: "圈子",
        path: "pages/village/index",
        iconPath: "/static/assets/icons/tabbar/village-default.png",
        activeIconPath: "/static/assets/icons/tabbar/village-active.png",
        prominent: false,
      },
      {
        id: "chat",
        label: "消息",
        path: "pages/messages/index",
        iconPath: "/static/assets/icons/tabbar/chat-default.png",
        activeIconPath: "/static/assets/icons/tabbar/chat-active.png",
        prominent: false,
      },
      {
        id: "profile",
        label: "我的",
        path: "pages/profile/index",
        iconPath: "/static/assets/icons/tabbar/profile-default.png",
        activeIconPath: "/static/assets/icons/tabbar/profile-active.png",
        prominent: false,
      },
    ],
    // A2：消息 Tab 未读角标数（0 = 不显示红点）。
    // 由 composables/useUnreadBadge.ts 写入本地存储（TABBAR_CHAT_UNREAD），
    // syncBadge() 在 attached/show 时读取同步；仅 mp-weixin 自定义 TabBar 使用，
    // H5 端继续走 uni.setTabBarBadge，不受影响。
    chatBadge: 0,
  },
  // 组件实例生命周期：附着时同步一次角标（保证冷启动首帧即有红点）
  lifetimes: {
    attached() {
      this.syncBadge();
    },
  },
  // 按当前页面路由动态同步选中态：
  // 冷启动默认页是「匹配」（discover，第 2 个 tab），若经分享/场景值
  // 直达任意 tab 页，也需让高亮跟随实际页面，不能依赖 selected 默认值 0。
  pageLifetimes: {
    show() {
      this.syncSelected();
      // A2：每次页面展示刷新角标（消息页已读清零后，回到任意 tab 页都需同步移除红点）
      this.syncBadge();
    },
  },
  methods: {
    /**
     * A2：从本地存储同步消息 Tab 未读角标。
     *
     * 存储键与 src/constants/storage-keys.ts 的 TABBAR_CHAT_UNREAD 保持一致：
     * 原生 .js 文件无法 import TS 常量，此处需手动同步（键值变更时一并修改）。
     */
    syncBadge() {
      let count = 0;
      try {
        count = Number(wx.getStorageSync("tabbar_chat_unread")) || 0;
      } catch (_e) {
        // 读取失败按 0 处理，不影响 TabBar 展示
      }
      if (count !== this.data.chatBadge) {
        this.setData({ chatBadge: count });
      }
    },
    syncSelected() {
      const pages = getCurrentPages();
      if (!pages || !pages.length) return;
      const route = pages[pages.length - 1].route || "";
      const index = this.data.tabs.findIndex((tab) => tab.path === route);
      if (index >= 0 && index !== this.data.selected) {
        this.setData({ selected: index });
      }
    },
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const tab = this.data.tabs[index];
      if (!tab) return;

      // 调用 wx.switchTab 切换页面
      // 修复（Phase R2）：wx.switchTab 的 url 必须以 "/" 开头（绝对路径），
      // 否则微信会基于当前页面目录解析相对路径，导致
      // switchTab:fail page "pages/profile/pages/discover/index" is not found。
      // Phase 收尾：移除切换震动反馈（用户反馈"切换总震动一下"）
      wx.switchTab({
        url: tab.path.startsWith("/") ? tab.path : "/" + tab.path,
        success: () => {
          // 切换成功后更新 selected 状态（立即反馈，不等页面 onShow 回传）
          this.setData({ selected: index });
        },
        fail: (err) => {
          console.error("[custom-tab-bar] switchTab 失败:", tab.path, err);
        },
      });
    },
  },
});
