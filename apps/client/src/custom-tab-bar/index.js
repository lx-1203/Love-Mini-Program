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
        path: "/pages/discover/index",
        iconPath: "/static/assets/icons/tabbar/discover-default.png",
        activeIconPath: "/static/assets/icons/tabbar/discover-active.png",
        prominent: true,
      },
      {
        id: "village",
        label: "圈子",
        path: "/pages/village/index",
        iconPath: "/static/assets/icons/tabbar/village-default.png",
        activeIconPath: "/static/assets/icons/tabbar/village-active.png",
        prominent: false,
      },
      {
        id: "home",
        label: "首页",
        path: "/pages/home/index",
        iconPath: "/static/assets/icons/tabbar/home-default.png",
        activeIconPath: "/static/assets/icons/tabbar/home-active.png",
        prominent: false,
      },
      {
        id: "chat",
        label: "消息",
        path: "/pages/chat/index",
        iconPath: "/static/assets/icons/tabbar/chat-default.png",
        activeIconPath: "/static/assets/icons/tabbar/chat-active.png",
        prominent: false,
      },
      {
        id: "profile",
        label: "我的",
        path: "/pages/profile/index",
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
