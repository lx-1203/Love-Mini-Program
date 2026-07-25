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
 *    path         → path        (注意：wx.switchTab 要求与 pages.json 的
 *                               pagePath 完全一致，不带前导斜杠)
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
        id: "discover",
        label: "匹配",
        path: "pages/discover/index",
        iconPath: "/static/assets/icons/tabbar/discover-default.png",
        activeIconPath: "/static/assets/icons/tabbar/discover-active.png",
        // discover 作为首 tab，不再使用中间凸起样式，避免视觉/热区错位导致切换异常
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
        id: "home",
        label: "首页",
        path: "pages/home/index",
        iconPath: "/static/assets/icons/tabbar/home-default.png",
        activeIconPath: "/static/assets/icons/tabbar/home-active.png",
        prominent: false,
      },
      {
        id: "chat",
        label: "消息",
        path: "pages/chat/index",
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
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const tab = this.data.tabs[index];
      if (!tab) return;

      // 切换 Tab 时轻震动反馈
      if (index !== this.data.selected) {
        try {
          wx.vibrateShort({ type: 'light' });
        } catch (_) {
          // 静默失败
        }
      }

      // 调用 wx.switchTab 切换页面
      wx.switchTab({
        url: tab.path,
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
