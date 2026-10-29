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
 *  4. 同时更新 i18n/locales/zh-CN.ts 的 tabs.<id>（H5 端与任何走 t() 的渲染读它；
 *     2026-10-29 英文版不上线，en-US.ts 已删除，唯一语言资源是 zh-CN.ts）
 *
 *  「四处单一来源」＝ navigation.ts + 本文件 + pages.json + i18n tabs.*。四处只要有一个值不同，
 *  真机上就等于没修：tabBar.custom:true ⇒ mp-weixin 只渲染本组件的 label，
 *  而 H5 端由 uni-app 按 pages.json + i18n 自绘 tabBar，两侧各自的读者会各拿到一份值。
 *  自检（2026-10-19 R6-L08 实测，四处已同值）：五枚 label 逐字为
 *  首页 / 附近 / 匹配 / 消息 / 我的；中央项 id 仍是 discover，但文案是「匹配」，
 *  「寻觅」只保留为**页面标题**（i18n discover.title、理想图《寻觅匹配卡片页面》左上角），
 *  不是 tab 标签——两者不要混改。
 *  可重跑核对：node apps/client/scripts/check-tabbar-consistency.mjs（路径/顺序/图标）
 *  + node scripts/qa/verify-tab-bar-single-source.mjs（面板字面量相加 == --tab-bar-total-h）。
 *
 *  ⚠ 改完必须重建对应档位再看帧：apps/client/dist 下 mp-weixin / mp-weixin-showcase /
 *  verify-mock 三档的 custom-tab-bar 至今是 2026-08-31 的旧版（label「寻觅」+ 已退役的
 *  .tab-bar__item--prominent 圆盘规则仍在），只有 mp-weixin-real 是新版。
 *  取景/真机复核若指向前三档，圆盘与「寻觅」会一直出现在帧里，与源码无关。
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
 *    prominent    → prominent   (R2b-L01-D21 / R2b-L02-D05 / R2b-L03-D13 起中央项不再做
 *                               凸起浮岛，五项等大同基线；本字段仅保留 schema 对齐，
 *                               index.wxml / index.wxss 均已不消费它)
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
    // 2026-08-31：全屏弹层（筛选抽屉等）打开时由页面经 getTabBar().setData({hidden:true})
    // 隐藏 tabbar——原生 custom-tab-bar 恒在页面内容之上，z-index 无法穿透
    hidden: false,
    tabs: [
      {
        id: "home",
        label: "首页",
        path: "pages/home/index",
        iconPath: "/static/assets/icons/tabbar/home.png",
        activeIconPath: "/static/assets/icons/tabbar/home-active.png",
        prominent: false,
      },
      {
        id: "nearby",
        label: "附近",
        path: "pages/nearby/index",
        iconPath: "/static/assets/icons/tabbar/nearby.png",
        activeIconPath: "/static/assets/icons/tabbar/nearby-active.png",
        prominent: false,
      },
      {
        id: "discover",
        // R2b-L02-D17 / R2b-L03-D13：本 label 是 mp-weixin 运行时唯一上屏的中央项文案
        // （pages.json tabBar.custom:true ⇒ 微信渲染本组件，list[].text 不参与绘制）。
        // 取理想图口径「匹配」；navigation.ts / pages.json tabBar.list / i18n tabs.* 同值。
        label: "匹配",
        path: "pages/discover/index",
        // R2b-L01-D21 / R2b-L02-D05：中央项改平铺 44rpx 线性爱心。
        // 原 match-heart.png 是 #E0E0E0 实心白心（为绿色圆盘底而设计），平铺到白底上几乎不可见，
        // 故与 H5 端 TabBar.vue 同口径改用 tabbar 家族描边爱心的 default / active 两态。
        iconPath: "/static/assets/icons/tabbar/discover.png",
        activeIconPath: "/static/assets/icons/tabbar/discover-active.png",
        // 凸起浮岛档已退役（五项等大同基线）；字段保留仅为与 navigation.ts 的 schema 对齐
        prominent: false,
      },
      {
        id: "chat",
        label: "消息",
        path: "pages/messages/index",
        iconPath: "/static/assets/icons/tabbar/chat.png",
        activeIconPath: "/static/assets/icons/tabbar/chat-active.png",
        prominent: false,
      },
      {
        id: "profile",
        label: "我的",
        path: "pages/profile/index",
        iconPath: "/static/assets/icons/tabbar/profile.png",
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
