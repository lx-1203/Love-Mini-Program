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
        path: "/pages/home/index",
        iconPath: "/static/assets/icons/tabbar/home-default.png",
        activeIconPath: "/static/assets/icons/tabbar/home-active.png",
        prominent: false,
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
        id: "discover",
        label: "匹配",
        path: "/pages/discover/index",
        iconPath: "/static/assets/icons/tabbar/discover-default.png",
        activeIconPath: "/static/assets/icons/tabbar/discover-active.png",
        prominent: true,
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
      if (tab) {
        // 切换 Tab 时轻震动反馈（仅在选中的 tab 变化时触发，避免重复点击产生冗余震动）
        if (index !== this.data.selected) {
          // 震动 API 兼容性处理：旧版本基础库不支持 type 参数，做降级
          if (wx.vibrateShort) {
            wx.vibrateShort({ type: 'light', fail: () => {
              // 降级：不带 type 的调用
              try { wx.vibrateShort(); } catch (err) { /* 静默失败，不影响切换 */ }
            }});
          }
        }
        wx.switchTab({ url: tab.path });
      }
    },
  },
});
