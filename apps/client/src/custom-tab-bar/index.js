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
        label: "寻觅",
        path: "/pages/discover/index",
        iconPath: "/static/assets/icons/discover.png",
        activeIconPath: "/static/assets/icons/discover-active.png",
        prominent: false,
      },
      {
        id: "likes",
        label: "喜欢",
        path: "/pages/likes/index",
        iconPath: "/static/assets/icons/likes.png",
        activeIconPath: "/static/assets/icons/likes-active.png",
        prominent: false,
      },
      {
        id: "village",
        label: "村口",
        path: "/pages/village/index",
        iconPath: "/static/assets/icons/village.png",
        activeIconPath: "/static/assets/icons/village-active.png",
        prominent: true,
      },
      {
        id: "campus",
        label: "校园",
        path: "/pages/campus/index",
        iconPath: "/static/assets/icons/village.png",
        activeIconPath: "/static/assets/icons/village-active.png",
        prominent: false,
      },
      {
        id: "messages",
        label: "消息",
        path: "/pages/messages/index",
        iconPath: "/static/assets/icons/messages.png",
        activeIconPath: "/static/assets/icons/messages-active.png",
        prominent: false,
      },
      {
        id: "profile",
        label: "我的",
        path: "/pages/profile/index",
        iconPath: "/static/assets/icons/profile.png",
        activeIconPath: "/static/assets/icons/profile-active.png",
        prominent: false,
      },
    ],
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const tab = this.data.tabs[index];
      if (tab) {
        wx.switchTab({ url: tab.path });
      }
    },
  },
});
