<script setup lang="ts">
/**
 * Admin v2 能力总览（内部审计页，仅 SUPER_ADMIN 有菜单）。
 *
 * 这页解决一个反复出现的问题：后台有 40 多个页面，但没人说得清「哪些真的能出数据」。
 * 于是每次验收都要重翻一遍代码。此页把结论固化下来，并且**每条都带证据**。
 *
 * 分桶口径（先读这三句，否则容易误读）：
 *   usable —— 视图里有 api/* 调用，且每个端点都能在 @Profile("real") 的控制器里找到映射；
 *   backend —— 前端已接线但后端没有端点（或页面自述无接口），必须补后端才会有数据；
 *   none   —— 本轮不做的存量页（菜单 hidden=1，路由仍可直达）与登录/布局壳等非业务页。
 *             ⚠ none ≠ 坏：这些行的「后端实现」列大多写着 ✓控制器名，接口是齐的，
 *             只是本次收缩没把它们纳入三组菜单，也没有逐页复验。
 *
 * 证据是怎么来的（不是猜的，是可复现的检索）：
 *   1) 逐文件 grep `apps/admin/src/views/**` 里 `from "…/api/xxx"` 的导入 —— 没有 api 导入
 *      就没有数据源（全表只有 VipPlans.vue 与 4 个框架页命中这一条）；
 *   2) 把 `apps/admin/src/api/*.ts` 里出现的每个 `/v1/admin/...` 字面量路径，
 *      去匹配 `apps/api` 中 controller 的 @RequestMapping + @Get/Post/Put/DeleteMapping 全集。
 *      完整路径必须是「类前缀 + 方法路径」拼出来的，且要注意 feedback/FeedbackController 这类
 *      **没有类级前缀、直接在方法注解里写绝对路径**的情况；漏掉这一类会得出「一条都没命中」
 *      的假结论——本页就踩过。
 *      2026-10-15 用脚本按同口径复跑：apps/admin/src/api/*.ts 里 119 条 `/v1/admin/...` 字面量，
 *      118 条能在 @RestController 映射中找到，唯一未命中是 stats.ts:5 文档注释里的通配占位
 *      /admin/stats/*（不是真实调用）。这两个数字会随 api/*.ts 改动漂移，所以**结论一律以每行
 *      写明的 file:line 为准，不要引用这里的计数下判断**。
 *      ⚠ 原稿在此写「3 条未命中，含 /admin/feedback、/admin/feedback/{id}/reply」——那两条其实是
 *      FeedbackController:110（GET）/:125（PUT）的映射，属于假缺口，已改正（见「反馈管理」行）。
 *   3) 方法级 @PreAuthorize 单独核对，把「非超管点了会 403」写进备注列。
 *   核查时间：2026-10-14 初版；2026-10-15 复跑路由检索并改正「反馈管理」「VIP 套餐」两行。
 *   对应迁移 database/flyway/sql/V2026.10.14.0003__reshape_admin_menus.sql。
 *
 * 还有一条必须写在这页上的环境说明：apps/api 里 admin 包下的控制器**全部**是 @Profile("real")
 * （脚本核对：39 个 *Controller.java 全部带 @Profile("real")），所以 mock profile 下每个业务页
 * 都会报错——那是环境，不是页面坏了，本页不因此扣分。
 * 有一个例外要知道：feedback/FeedbackController 不在 admin 包、也不带 @Profile，但它用方法级
 * 绝对路径提供了 /api/v1/admin/feedback 与 PUT /api/v1/admin/feedback/{id}/reply 两条 admin 路由，
 * 这两条在 mock 下同样存在（MockSecurityConfig:216 给 /api/v1/admin/** 注入 ROLE_ADMIN）。
 * 「控制器存在但当前 profile 不加载」和「端点根本不存在」是两回事，本页只在后者时写 ✗ 缺失。
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

/** 能力分桶 */
type CapabilityBucket = "usable" | "backend" | "none";

/** 一行 = 一个后台页面 */
interface CapabilityRow {
  /** 页面名（与菜单 title / componentMap 对应） */
  page: string;
  /** 源码路径（componentMap 的 key） */
  component: string;
  /** 直达 URL（menus.path；非菜单页为静态路由） */
  route: string;
  /** 归属分组（迁移后的三组 + 已退役分组 + 非业务页） */
  group: string;
  /** 是否已挂到菜单：menu=有行且 hidden=0，hidden=有行但隐藏，none=menus 表根本没有这一行 */
  menu: "menu" | "hidden" | "none";
  bucket: CapabilityBucket;
  /** 前端数据源：api 模块（无则给出「无 api 导入」的字面原因） */
  api: string;
  /** 端点证据 */
  endpoints: string;
  /** 后端实现证据：控制器名，或 ✗缺失 */
  backend: string;
  /** 备注：权限口径 / 本轮变化 / 无数据的字面原因 */
  note: string;
}

/** 分组代号 → 展示名（与迁移后的菜单标题一致） */
const GROUP_CONTENT = "内容";
const GROUP_OPERATE = "运营";
const GROUP_PERMISSION = "权限";
const GROUP_RETIRED = "退役分组（已隐藏）";
const GROUP_STATIC = "非菜单页";
const GROUP_SHELL = "框架页";

const rows = computed<CapabilityRow[]>(() => [
  /* ==================== 内容（看与审） ==================== */
  {
    page: "数据看板", component: "views/Dashboard.vue", route: "/dashboard",
    group: GROUP_CONTENT, menu: "menu", bucket: "usable",
    api: "api/stats.ts + api/users.ts + api/reports.ts",
    endpoints: "GET /v1/admin/stats/users · /active · /matches · /community-overview；GET /v1/admin/users；GET /v1/admin/reports",
    backend: "AdminStatsController + AdminUserController + AdminReportController",
    note: "本轮新增社区总览与待办清单；getStats() 用 Promise.allSettled 聚合，单块失败不拖垮整页",
  },
  {
    page: "村落动态", component: "views/forum/VillagePosts.vue", route: "/forum/village-posts",
    group: GROUP_CONTENT, menu: "menu", bucket: "usable",
    api: "api/forum.ts + api/system.ts + api/circle.ts",
    endpoints: "GET /v1/admin/forum/village-posts(/{id}) · /{id}/comments · /{id}/views；POST /{id}/audit · /pin · /unpin；DELETE /{id}；GET /v1/admin/schools；GET /v1/admin/circle-layers",
    backend: "AdminVillagePostController + AdminSchoolController + CircleLayerController",
    note: "本轮接入圈层筛选（listAllLayers 构树）与「查看」跳详情页",
  },
  {
    page: "评论管理", component: "views/forum/Comments.vue", route: "/forum/comments",
    group: GROUP_CONTENT, menu: "menu", bucket: "usable",
    api: "api/forum.ts",
    endpoints: "GET /v1/admin/comments；DELETE /v1/admin/comments/{id}",
    backend: "AdminCommentController",
    note: "",
  },
  {
    page: "用户管理", component: "views/content/Users.vue", route: "/content/users",
    group: GROUP_CONTENT, menu: "menu", bucket: "usable",
    api: "api/users.ts + api/account.ts + api/media.ts",
    endpoints: "GET/POST /v1/admin/users；GET/PUT /{id}；POST /{id}/disable · /enable；GET /v1/admin/interest-tags；GET/PUT /v1/admin/users/{id}/interest-tags；POST /v1/admin/account/change-password",
    backend: "AdminUserController + AdminInterestTagController + AdminAccountController",
    note: "本轮把详情弹窗改成抽屉；头像走 withMediaToken 签名直连",
  },
  {
    page: "图片审核", component: "views/content/MediaAssets.vue", route: "/content/media-assets",
    group: GROUP_CONTENT, menu: "menu", bucket: "usable",
    api: "api/media.ts",
    endpoints: "GET /v1/admin/media-assets；GET /{id}；POST /{id}/audit",
    backend: "AdminMediaAssetController",
    note: "",
  },

  /* ==================== 运营（发与管） ==================== */
  {
    page: "发布内容", component: "views/forum/PostCompose.vue", route: "/forum/compose",
    group: GROUP_OPERATE, menu: "menu", bucket: "usable",
    api: "api/compose.ts + api/media.ts",
    endpoints: "POST /v1/admin/posts；POST /v1/admin/media/upload（multipart，走 LONG_REQUEST_TIMEOUT_MS）",
    backend: "AdminContentComposeController",
    note: "本轮新增。写接口是 hasAnyRole('ADMIN','SUPER_ADMIN')，AUDITOR 无此菜单（后端按方法拦掉它全部写请求）",
  },
  {
    page: "官方号公告", component: "views/config/OfficialAccounts.vue", route: "/configs/official-accounts",
    group: GROUP_OPERATE, menu: "menu", bucket: "usable",
    api: "api/official-accounts.ts + api/activities.ts",
    endpoints: "GET /v1/admin/official-accounts；GET/POST /{code}/messages；DELETE /{code}/messages/{id}；GET /v1/admin/activities",
    backend: "AdminOfficialAccountController",
    note: "本轮新增公告/广播写接口；发布与删除标注 hasRole('SUPER_ADMIN')，校区管理员只读",
  },
  {
    page: "私信会话", component: "views/content/Conversations.vue", route: "/content/conversations",
    group: GROUP_OPERATE, menu: "menu", bucket: "usable",
    api: "api/conversations.ts",
    endpoints: "GET /v1/admin/conversations；GET /{id}；GET /{id}/messages",
    backend: "AdminConversationController",
    note: "本轮新增只读会话；正文仅 SUPER_ADMIN 可见，其余角色后端已脱敏",
  },
  {
    page: "圈层管理", component: "views/system/CircleLayers.vue", route: "/system/circle-layers",
    group: GROUP_OPERATE, menu: "menu", bucket: "usable",
    api: "api/circle.ts",
    endpoints: "GET /v1/admin/circle-layers；GET /{id}/descendants；GET /v1/admin/evidence/circle/{layerId}/users",
    backend: "CircleLayerController + EvidenceController",
    note: "本轮修复畸形 SFC 并接上真实数据。页面只用读接口；createLayer/updateLayer/deleteLayer/admin-layers 后端已实现但 UI 未接。菜单只绑 SUPER_ADMIN",
  },
  {
    page: "活动管理", component: "views/activity/Activities.vue", route: "/activity/activities",
    group: GROUP_OPERATE, menu: "menu", bucket: "usable",
    api: "api/activities.ts",
    endpoints: "GET/POST /v1/admin/activities；GET/PUT/DELETE /{id}；POST /{id}/publish · /unpublish",
    backend: "AdminActivityController",
    note: "",
  },

  /* ==================== 权限（配置与追责） ==================== */
  {
    page: "管理员管理", component: "views/system/Admins.vue", route: "/system/admins",
    group: GROUP_PERMISSION, menu: "menu", bucket: "usable",
    api: "api/system.ts",
    endpoints: "GET/POST /v1/admin/users/admins；POST /v1/admin/users/{id}/disable · /enable；GET /v1/admin/schools/options",
    backend: "AdminUserController（admins 相关方法级 SUPER_ADMIN）",
    note: "",
  },
  {
    page: "角色管理", component: "views/system/Roles.vue", route: "/system/roles",
    group: GROUP_PERMISSION, menu: "menu", bucket: "usable",
    api: "api/system.ts",
    endpoints: "GET/POST /v1/admin/roles；GET/PUT/DELETE /{id}；GET/PUT /{id}/menus；GET /v1/admin/menus",
    backend: "AdminRoleController（类级 SUPER_ADMIN）",
    note: "本页是本次菜单收缩的可见入口——改完 role_menus 后靠它核对角色勾选",
  },
  {
    page: "菜单管理", component: "views/system/Menus.vue", route: "/system/menus",
    group: GROUP_PERMISSION, menu: "menu", bucket: "usable",
    api: "api/system.ts",
    endpoints: "GET/POST /v1/admin/menus；GET/PUT/DELETE /{id}",
    backend: "AdminMenuController（写操作类级 SUPER_ADMIN）",
    note: "列表来自 GET /menus（全量，含 hidden=1），因此隐藏项在这里仍可见可编辑",
  },
  {
    page: "审计日志", component: "views/system/AuditLogs.vue", route: "/system/audit-logs",
    group: GROUP_PERMISSION, menu: "menu", bucket: "usable",
    api: "api/system.ts",
    endpoints: "GET /v1/admin/audit-logs",
    backend: "AdminAuditLogController",
    note: "",
  },
  {
    page: "系统配置", component: "views/config/Config.vue", route: "/configs/global",
    group: GROUP_PERMISSION, menu: "menu", bucket: "usable",
    api: "api/config.ts",
    endpoints: "GET/PUT /v1/admin/configs(/{key})；GET/PUT /v1/admin/rules(/{id})；GET/PUT /v1/admin/switches(/{key})",
    backend: "AdminConfigController",
    note: "⚠ 三组 PUT 全部 hasRole('SUPER_ADMIN')，但 603 仍绑给 ADMIN/AUDITOR（本次未动 role_menus）→ 非超管能进来看、保存会 403",
  },
  {
    page: "能力总览", component: "views/system/CapabilityOverview.vue", route: "/system/capability",
    group: GROUP_PERMISSION, menu: "menu", bucket: "usable",
    api: "无 api 导入（本页刻意不依赖后端）",
    endpoints: "—（静态清单，数据来自对本仓代码的检索）",
    backend: "—（无需控制器）",
    note: "本轮新增，仅绑 SUPER_ADMIN。这也是本迁移里唯一新增的菜单行（id 700）",
  },

  /* ==================== 需后端补（2026-10-15 路由复跑后 bucket=backend 只剩这一行） ==================== */
  {
    page: "VIP 套餐", component: "views/business/VipPlans.vue", route: "/business/vip-plans",
    group: GROUP_RETIRED, menu: "hidden", bucket: "backend",
    api: "无 api 导入 —— 页面自述「套餐说明数据（占位说明，非接口数据）」（VipPlans.vue:38）",
    endpoints: "页面注释给出待补端点：GET/PUT /v1/admin/business/vip/plans（VipPlans.vue:13）",
    backend: "✗ 缺失（2026-10-15 脚本检索确认）：apps/api 下 106 个 @RestController 的映射里没有任何含 plan 的路径；AdminVipController（类前缀 /api/v1/admin/business/vip，:43）只有 GET /bills（:73）、GET /bills/{id}（:114）、POST /orders/{orderNo}/refund（:144）",
    note: "缺口成立：客户端那侧也没有套餐端点，只有账单/续费/兑换码/下单四组（GET /api/v1/vip/bills、POST|DELETE /api/v1/vip/auto-renew、POST /api/v1/vip/promo-codes/validate|redeem、POST /api/v1/vip/orders），所以 VipPlans.vue 只能是占位页。全表唯一一个「有页面、有菜单、零数据源」的业务页；页面顶部 dataSourceText 已如实声明无接口，故不算隐藏缺陷，但确实需要后端补端点才能变成真数据。菜单 hidden=1（迁移 E 段列出的 501），要放出必须先补后端",
  },

  /* ==================== 本轮不做：原 100 系统管理 ==================== */
  {
    page: "高校管理", component: "views/system/Schools.vue", route: "/system/schools",
    group: GROUP_PERMISSION, menu: "hidden", bucket: "none",
    api: "api/system.ts",
    endpoints: "GET/POST /v1/admin/schools；GET/PUT/DELETE /{id}；POST /{id}/status；GET /schools/options",
    backend: "✓ AdminSchoolController",
    note: "接口齐全，本轮未纳入三组 → hidden=1，/system/schools 仍可直达",
  },
  {
    page: "数据字典", component: "views/system/Dicts.vue", route: "/system/dicts",
    group: GROUP_PERMISSION, menu: "hidden", bucket: "none",
    api: "api/system.ts",
    endpoints: "GET/POST /v1/admin/dicts；GET/PUT/DELETE /{id}；GET /{code}/items；POST /{dictId}/items；PUT/DELETE /items/{itemId}",
    backend: "✓ AdminDictController",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "在线用户", component: "views/system/OnlineUsers.vue", route: "/system/online-users",
    group: GROUP_PERMISSION, menu: "hidden", bucket: "none",
    api: "api/system.ts",
    endpoints: "GET /v1/admin/online-users；POST /{userId}/kick",
    backend: "✓ OnlineUserAdminController（kick 为 SUPER_ADMIN）",
    note: "接口齐全，本轮未纳入三组",
  },

  /* ==================== 本轮不做：原 200 用户与内容 ==================== */
  {
    page: "校园认证", component: "views/content/Certifications.vue", route: "/content/certifications",
    group: GROUP_CONTENT, menu: "hidden", bucket: "none",
    api: "api/certifications.ts",
    endpoints: "GET /v1/admin/certifications；POST /{id}/review",
    backend: "✓ AdminCertificationController",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "举报管理", component: "views/content/Reports.vue", route: "/content/reports",
    group: GROUP_CONTENT, menu: "hidden", bucket: "none",
    api: "api/reports.ts",
    endpoints: "GET /v1/admin/reports；POST /{id}/handle",
    backend: "✓ AdminReportController",
    note: "接口齐全，本轮未纳入三组。若要把调阅证据放出，走 api/circle.ts 的 /v1/admin/evidence",
  },
  {
    page: "反馈管理", component: "views/content/Feedback.vue", route: "/content/feedback",
    group: GROUP_CONTENT, menu: "hidden", bucket: "none",
    api: "api/feedback.ts",
    endpoints: "本页在调：GET /v1/admin/feedback/tickets、POST /v1/admin/feedback/tickets/{id}/handle（Feedback.vue:94/:166）；api/feedback.ts 还导出了 GET /v1/admin/feedback、PUT /v1/admin/feedback/{id}/reply —— 四组路径全部有映射",
    backend: "✓ AdminFeedbackController（类前缀 /api/v1/admin/feedback/tickets @:72；GET @:97、POST /{id}/handle @:163，带 @Auditable(HANDLE_FEEDBACK) 与提交人校区越权校验 @:178；类级 hasAnyRole('ADMIN','SUPER_ADMIN','AUDITOR')、@Profile(\"real\")）＋ ✓ FeedbackController（GET /api/v1/admin/feedback @:110、PUT /api/v1/admin/feedback/{id}/reply @:125；该类没有类级前缀、方法里写绝对路径，也没有 @Profile）",
    note: "⚠ 2026-10-15 更正：这一行原先写「✗ 缺失：apps/api 只有客户端 FeedbackController…没有任何 /api/v1/admin/feedback 路由」，是假缺口——FeedbackController 用方法级绝对路径，只按类前缀检索就会把它漏掉，上面 :110/:125 就是那两条映射本身；后端一直是齐的，本页也不欠后端任何东西。备注里引用的 api/feedback.ts 头部「已实现，见 FeedbackController#replyFeedback」那句注释在磁盘上已经不存在（该文件由另一路在改），所以本页到底走 tickets 那组还是裸列表那组，以 api/feedback.ts 当前导出为准。权限口径：POST/PUT /api/v1/admin/** 只放 ADMIN/SUPER_ADMIN（SecurityConfig:189-196），其余 admin 读放 ADMIN/SUPER_ADMIN/AUDITOR（:197）→ AUDITOR 能看、点处理 403。菜单仍是 hidden=1（迁移 E 段把 204 列入未入选），放出只需改菜单绑定，不需要动后端。归属分组也从「退役分组」改回「内容」：V2026.08.07.0011__create_menus.sql:132 里 204 的 parent_id 一直是 200（内容），和 202 校园认证、203 举报管理同组",
  },
  {
    page: "敏感词管理", component: "views/content/SensitiveWords.vue", route: "/content/sensitive-words",
    group: GROUP_CONTENT, menu: "hidden", bucket: "none",
    api: "api/sensitive-words.ts",
    endpoints: "GET /v1/admin/sensitive-words；POST /v1/admin/sensitive-words；DELETE /{id}",
    backend: "✓ AdminSensitiveWordController（写为 SUPER_ADMIN，另有 batch-import 未被前端使用）",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "实名认证", component: "views/content/RealNameCertifications.vue", route: "/content/real-name-certifications",
    group: GROUP_CONTENT, menu: "hidden", bucket: "none",
    api: "api/real-name-certifications.ts",
    endpoints: "GET /v1/admin/real-name-certifications；POST /{id}/review",
    backend: "✓ AdminRealNameController",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "悄悄话", component: "views/content/Whispers.vue", route: "/content/whispers",
    group: GROUP_CONTENT, menu: "hidden", bucket: "none",
    api: "api/whisper.ts",
    endpoints: "GET /v1/admin/whispers?page&size；DELETE /{id}",
    backend: "✓ AdminWhisperController",
    note: "接口齐全，本轮未纳入三组",
  },

  /* ==================== 本轮不做：原 300 论坛管理 ==================== */
  {
    page: "兴趣圈管理", component: "views/forum/InterestCircles.vue", route: "/forum/interest-circles",
    group: GROUP_RETIRED, menu: "hidden", bucket: "none",
    api: "api/forum.ts",
    endpoints: "GET/POST /v1/admin/forum/circles；PUT/DELETE /{id}",
    backend: "✓ AdminCircleController",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "圈内话题", component: "views/forum/CircleTopics.vue", route: "/forum/circle-topics",
    group: GROUP_RETIRED, menu: "hidden", bucket: "none",
    api: "api/forum.ts",
    endpoints: "GET /v1/admin/forum/circles；GET /{circleId}/topics；POST /topics/{id}/pin · /unpin；DELETE /topics/{id}",
    backend: "✓ AdminCircleController（另有 POST /topics/{id}/audit 未被前端使用）",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "校园圈话题", component: "views/forum/CampusTopics.vue", route: "/forum/campus-topics",
    group: GROUP_RETIRED, menu: "hidden", bucket: "none",
    api: "api/forum.ts",
    endpoints: "GET /v1/admin/forum/campus-topics；POST /{id}/audit；DELETE /{id}",
    backend: "✓ AdminCampusTopicController",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "热度榜管理", component: "views/forum/HotBoardManage.vue", route: "/forum/hot-board-manage",
    group: GROUP_RETIRED, menu: "hidden", bucket: "none",
    api: "api/forum.ts",
    endpoints: "GET /v1/admin/forum/village-posts；POST /{id}/hot-boost · /hot-ban · /hot-recalc",
    backend: "✓ AdminVillagePostController",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "热搜词管理", component: "views/forum/HotSearchManage.vue", route: "/forum/hot-search-manage",
    group: GROUP_RETIRED, menu: "hidden", bucket: "none",
    api: "api/forum.ts",
    endpoints: "GET /v1/admin/search/hot；POST /{keyword}/remove · /restore",
    backend: "✓ AdminHotSearchController",
    note: "接口齐全，本轮未纳入三组",
  },

  /* ==================== 本轮不做：原 400 活动运营 ==================== */
  {
    page: "报名管理", component: "views/activity/Enrollments.vue", route: "/activity/enrollments",
    group: GROUP_OPERATE, menu: "hidden", bucket: "none",
    api: "api/activities.ts + api/media.ts",
    endpoints: "GET /v1/admin/activities/{id}/enrollments；GET /{id}/enrollments/export",
    backend: "✓ AdminActivityController",
    note: "接口齐全，本轮未纳入三组（运营组第 6 项会挤掉「活动管理」，故留白）",
  },

  /* ==================== 本轮不做：原 500 商业模式 ==================== */
  {
    page: "VIP 账单", component: "views/business/VipBills.vue", route: "/business/vip-bills",
    group: GROUP_RETIRED, menu: "hidden", bucket: "none",
    api: "api/business.ts",
    endpoints: "GET /v1/admin/business/vip/bills；GET /bills/{id}",
    backend: "✓ AdminVipController（另有 POST /orders/{orderNo}/refund 未被前端使用）",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "兑换码", component: "views/business/PromoCodes.vue", route: "/business/promo-codes",
    group: GROUP_RETIRED, menu: "hidden", bucket: "none",
    api: "api/business.ts",
    endpoints: "GET /v1/admin/business/promo-codes；POST /batch；POST /{id}/disable；GET /export",
    backend: "✓ AdminPromoCodeController",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "钱包管理", component: "views/business/Wallets.vue", route: "/business/wallets",
    group: GROUP_RETIRED, menu: "hidden", bucket: "none",
    api: "api/business.ts",
    endpoints: "GET /v1/admin/business/wallets；GET /transactions；POST /{userId}/adjust",
    backend: "✓ AdminWalletController",
    note: "接口齐全，本轮未纳入三组。调账是写库操作，放出前建议先接审计",
  },
  {
    page: "金币管理", component: "views/business/Coins.vue", route: "/business/coins",
    group: GROUP_RETIRED, menu: "hidden", bucket: "none",
    api: "api/business.ts",
    endpoints: "GET /v1/admin/business/coins",
    backend: "✓ AdminCoinController",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "积分商城", component: "views/business/Shop.vue", route: "/business/shop",
    group: GROUP_RETIRED, menu: "hidden", bucket: "none",
    api: "api/business.ts",
    endpoints: "GET/POST /v1/admin/business/shop；PUT/DELETE /{id}；POST /{id}/publish · /unpublish",
    backend: "✓ AdminShopController",
    note: "接口齐全，本轮未纳入三组",
  },

  /* ==================== 本轮不做：原 600 配置管理 ==================== */
  {
    page: "通知配置", component: "views/config/NotifyConfig.vue", route: "/configs/notify",
    group: GROUP_PERMISSION, menu: "hidden", bucket: "none",
    api: "api/notify-config.ts",
    endpoints: "GET /v1/admin/notify-config；PUT /v1/admin/notify-config",
    backend: "✓ AdminNotifyConfigController（PUT 为 SUPER_ADMIN）",
    note: "接口齐全但菜单绑给了 ADMIN/AUDITOR → 非超管保存会 403",
  },
  {
    page: "匹配配置", component: "views/config/MatchConfig.vue", route: "/configs/match",
    group: GROUP_PERMISSION, menu: "hidden", bucket: "none",
    api: "api/match-config.ts",
    endpoints: "GET/PUT /v1/admin/match-config；GET/PUT /v1/admin/recommend-strategy",
    backend: "✓ AdminMatchConfigController（recommend-strategy 写为 SUPER_ADMIN）",
    note: "接口齐全，本轮未纳入三组",
  },
  {
    page: "主页配置", component: "views/config/ProfileConfig.vue", route: "/configs/profile",
    group: GROUP_PERMISSION, menu: "none", bucket: "none",
    api: "api/config.ts",
    endpoints: "GET /v1/admin/profile-config；PUT /v1/admin/profile-config",
    backend: "✓ AdminProfileConfigController",
    note: "⚠ 与上面几条不同：menus 表**从来没有这一行**（componentMap 里有、dev 兜底树里有），所以真实环境既不进侧边栏也不注册路由，直达 /configs/profile 会 404。本轮不处理，若要放出需单独补一行 menus + role_menus",
  },

  /* ==================== 框架页 ==================== */
  {
    page: "登录页", component: "views/Login.vue", route: "/login",
    group: GROUP_SHELL, menu: "none", bucket: "none",
    api: "无 api/* 导入（登录与会话走 stores/session）",
    endpoints: "—",
    backend: "—（客户端 auth 控制器）",
    note: "静态路由，不在菜单体系内",
  },
  {
    page: "布局壳", component: "views/Layout.vue", route: "/",
    group: GROUP_SHELL, menu: "none", bucket: "none",
    api: "无 api/* 导入（读 stores/menu + stores/session）",
    endpoints: "间接：GET /v1/admin/menus/current（由 stores/menu.ts 拉取）",
    backend: "✓ AdminMenuController",
    note: "侧边栏/面包屑宿主。⚠ 本次收缩依赖它按 hidden 过滤，而它目前只看 superAdminOnly、没读 hidden —— 不改这里，hidden=1 不会生效",
  },
  {
    page: "无权限页", component: "views/Forbidden.vue", route: "/403",
    group: GROUP_SHELL, menu: "none", bucket: "none",
    api: "无 api/* 导入",
    endpoints: "—",
    backend: "—",
    note: "静态路由",
  },
  {
    page: "404 页", component: "views/NotFound.vue", route: "/:pathMatch(.*)*",
    group: GROUP_SHELL, menu: "none", bucket: "none",
    api: "无 api/* 导入",
    endpoints: "—",
    backend: "—",
    note: "catch-all；动态路由注册前就存在，深链靠它兜住",
  },

  /* ==================== 详情页（非菜单） ==================== */
  {
    page: "帖子详情", component: "views/forum/PostDetail.vue", route: "/forum/posts/{id}",
    group: GROUP_STATIC, menu: "none", bucket: "usable",
    api: "api/forum.ts + api/media.ts",
    endpoints: "GET /v1/admin/forum/village-posts/{id}；GET /{id}/comments；GET /{id}/views；POST /{id}/audit · /pin · /unpin；DELETE /{id}",
    backend: "✓ AdminVillagePostController",
    note: "本轮新增独立详情页（九宫格）。刻意只在 router/index.ts 静态注册、不进 menus：详情页进侧边栏会多出一个无数据的入口",
  },
]);

/* ==================== 统计与筛选 ==================== */

const BUCKETS: CapabilityBucket[] = ["usable", "backend", "none"];

const activeBucket = ref<"all" | CapabilityBucket>("all");
const keyword = ref("");

/** 各桶行数（用于顶部摘要与筛选按钮计数） */
const bucketCounts = computed<Record<CapabilityBucket, number>>(() => {
  const acc: Record<CapabilityBucket, number> = { usable: 0, backend: 0, none: 0 };
  for (const row of rows.value) acc[row.bucket] += 1;
  return acc;
});

const visibleRows = computed<CapabilityRow[]>(() => {
  const kw = keyword.value.trim().toLowerCase();
  return rows.value.filter((row) => {
    if (activeBucket.value !== "all" && row.bucket !== activeBucket.value) return false;
    if (!kw) return true;
    return [row.page, row.component, row.route, row.group, row.api, row.endpoints, row.backend, row.note]
      .join("\n")
      .toLowerCase()
      .includes(kw);
  });
});

function bucketLabel(bucket: CapabilityBucket): string {
  if (bucket === "usable") return t("capability.bucketUsable");
  if (bucket === "backend") return t("capability.bucketNeedsBackend");
  return t("capability.bucketNotThisRound");
}

function bucketClass(bucket: CapabilityBucket): string {
  return `badge badge--${bucket}`;
}

function menuClass(menu: CapabilityRow["menu"]): string {
  return `tag tag--${menu}`;
}

function menuLabel(menu: CapabilityRow["menu"]): string {
  if (menu === "menu") return t("capability.menuVisible");
  if (menu === "hidden") return t("capability.menuHidden");
  return t("capability.menuAbsent");
}

/**
 * 路由能不能直接点。
 * 带路径参数的详情页（/forum/posts/{id}）和 catch-all 404 不是可跳转的字面 URL，
 * 做成链接会一路跳到 NotFound，所以这两类只渲染文本。
 */
function isLinkable(route: string): boolean {
  return !route.includes("{") && !route.includes("*");
}
</script>

<template>
  <div class="capability">
    <div class="page-header">
      <h1 class="page-title">{{ t("capability.title") }}</h1>
      <p class="page-subtitle">{{ t("capability.subtitle") }}</p>
    </div>

    <!-- 分桶摘要：三张卡 + 总数 -->
    <div class="summary-grid">
      <div class="summary-card summary-card--usable">
        <span class="summary-card__num">{{ bucketCounts.usable }}</span>
        <span class="summary-card__label">{{ t("capability.bucketUsable") }}</span>
        <span class="summary-card__desc">{{ t("capability.legendUsable") }}</span>
      </div>
      <div class="summary-card summary-card--backend">
        <span class="summary-card__num">{{ bucketCounts.backend }}</span>
        <span class="summary-card__label">{{ t("capability.bucketNeedsBackend") }}</span>
        <span class="summary-card__desc">{{ t("capability.legendNeedsBackend") }}</span>
      </div>
      <div class="summary-card summary-card--none">
        <span class="summary-card__num">{{ bucketCounts.none }}</span>
        <span class="summary-card__label">{{ t("capability.bucketNotThisRound") }}</span>
        <span class="summary-card__desc">{{ t("capability.legendNotThisRound") }}</span>
      </div>
      <div class="summary-card summary-card--total">
        <span class="summary-card__num">{{ rows.length }}</span>
        <span class="summary-card__label">{{ t("capability.totalPages") }}</span>
        <span class="summary-card__desc">{{ t("capability.totalDesc") }}</span>
      </div>
    </div>

    <!-- mock profile 说明：错误态不等于坏页面 -->
    <div class="notice">
      <span class="notice__mark">i</span>
      <span class="notice__text">{{ t("capability.mockNote") }}</span>
    </div>

    <!-- 筛选 -->
    <div class="toolbar">
      <div class="chips">
        <button
          type="button"
          class="chip"
          :class="{ 'chip--active': activeBucket === 'all' }"
          @click="activeBucket = 'all'"
        >{{ t("capability.filterAll") }} · {{ rows.length }}</button>
        <button
          v-for="bucket in BUCKETS"
          :key="bucket"
          type="button"
          class="chip"
          :class="['chip--' + bucket, { 'chip--active': activeBucket === bucket }]"
          @click="activeBucket = bucket"
        >{{ bucketLabel(bucket) }} · {{ bucketCounts[bucket] }}</button>
      </div>
      <input
        v-model="keyword"
        class="search"
        type="search"
        :placeholder="t('capability.searchPlaceholder')"
        :aria-label="t('capability.searchPlaceholder')"
      />
    </div>

    <!-- 清单 -->
    <div class="panel">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t("capability.colPage") }}</th>
            <th>{{ t("capability.colGroup") }}</th>
            <th>{{ t("capability.colStatus") }}</th>
            <th>{{ t("capability.colApi") }}</th>
            <th>{{ t("capability.colEndpoints") }}</th>
            <th>{{ t("capability.colBackend") }}</th>
            <th>{{ t("capability.colNote") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visibleRows" :key="row.component">
            <td class="cell-page">
              <span class="page-name">{{ row.page }}</span>
              <router-link v-if="isLinkable(row.route)" class="page-route" :to="row.route">{{ row.route }}</router-link>
              <span v-else class="page-route page-route--static">{{ row.route }}</span>
              <code class="page-component">{{ row.component }}</code>
            </td>
            <td>
              <span class="group-name">{{ row.group }}</span>
              <span :class="menuClass(row.menu)">{{ menuLabel(row.menu) }}</span>
            </td>
            <td><span :class="bucketClass(row.bucket)">{{ bucketLabel(row.bucket) }}</span></td>
            <td class="cell-mono">{{ row.api }}</td>
            <td class="cell-mono cell-endpoints">{{ row.endpoints }}</td>
            <td class="cell-mono">{{ row.backend }}</td>
            <td class="cell-note">{{ row.note }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="visibleRows.length === 0" class="empty">{{ t("capability.noMatch") }}</div>
    </div>

    <p class="footnote">{{ t("capability.sourceNote") }}</p>
  </div>
</template>

<style scoped>
@import "../../styles/admin-common.css";

.capability {
  max-width: var(--admin-page-max-width);
}

/* ===== 摘要卡 ===== */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--admin-space-lg);
  margin-bottom: var(--admin-space-lg);
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: var(--admin-space-xs);
  padding: var(--admin-space-lg);
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
}

.summary-card__num {
  font-size: 28px;
  line-height: 36px;
  font-weight: 600;
}

.summary-card__label {
  font-size: var(--admin-font-md);
  font-weight: 500;
  color: var(--admin-color-text-primary);
}

.summary-card__desc {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-tertiary);
}

.summary-card--usable .summary-card__num { color: var(--admin-color-success); }
.summary-card--backend .summary-card__num { color: var(--admin-color-danger); }
.summary-card--none .summary-card__num { color: var(--admin-color-text-tertiary); }
.summary-card--total .summary-card__num { color: var(--admin-color-primary); }

/* ===== 提示条 ===== */
.notice {
  display: flex;
  gap: var(--admin-space-sm);
  align-items: flex-start;
  padding: var(--admin-space-md) var(--admin-space-lg);
  margin-bottom: var(--admin-space-lg);
  background: var(--admin-color-info-softer);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-md);
}

.notice__mark {
  flex: none;
  width: 18px;
  height: 18px;
  font-size: var(--admin-font-xs);
  line-height: 18px;
  text-align: center;
  border-radius: 50%;
  color: var(--admin-color-on-primary);
  background: var(--admin-color-info);
}

.notice__text {
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-secondary);
}

/* ===== 工具条 ===== */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--admin-space-md);
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--admin-space-md);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--admin-space-sm);
}

.chip {
  min-height: var(--admin-control-height-sm);
  padding: 0 var(--admin-space-md);
  font-size: var(--admin-font-sm);
  color: var(--admin-color-text-secondary);
  cursor: pointer;
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
}

.chip:focus-visible {
  outline: none;
  box-shadow: var(--admin-focus-ring);
}

.chip--active {
  color: var(--admin-color-primary);
  background: var(--admin-color-primary-softer);
  border-color: var(--admin-color-primary);
}

.search {
  min-width: 240px;
  height: var(--admin-control-height-sm);
  padding: 0 var(--admin-space-md);
  font-size: var(--admin-font-sm);
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-md);
}

/* ===== 表格 ===== */
.panel {
  overflow-x: auto;
  background: var(--admin-color-bg-container);
  border: 1px solid var(--admin-color-border-light);
  border-radius: var(--admin-radius-lg);
}

.table {
  width: 100%;
  font-size: var(--admin-font-sm);
  border-collapse: collapse;
}

.table th {
  position: sticky;
  top: 0;
  padding: var(--admin-space-md);
  font-weight: 500;
  color: var(--admin-color-text-tertiary);
  text-align: left;
  background: var(--admin-color-bg-subtle);
  border-bottom: 1px solid var(--admin-color-border-light);
  white-space: nowrap;
}

.table td {
  padding: var(--admin-space-md);
  color: var(--admin-color-text-secondary);
  vertical-align: top;
  border-bottom: 1px solid var(--admin-color-border-light);
}

.table tr:last-child td {
  border-bottom: none;
}

.cell-page {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 150px;
}

.page-name {
  font-weight: 500;
  color: var(--admin-color-text-primary);
}

.page-route {
  color: var(--admin-color-primary);
  text-decoration: none;
}

.page-route:hover {
  text-decoration: underline;
}

/* 带参数/catch-all 的路由不可直接点，降级成普通文本 */
.page-route--static {
  color: var(--admin-color-text-tertiary);
}

.page-component,
.cell-mono {
  font-family: var(--admin-font-family-mono);
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-tertiary);
}

.cell-endpoints {
  min-width: 260px;
  max-width: 420px;
  white-space: pre-wrap;
}

.cell-note {
  min-width: 220px;
  max-width: 460px;
  color: var(--admin-color-text-secondary);
}

.group-name {
  display: block;
  margin-bottom: 2px;
}

/* ===== 徽标 ===== */
.badge,
.tag {
  display: inline-block;
  padding: 1px var(--admin-space-sm);
  font-size: var(--admin-font-xs);
  border-radius: var(--admin-radius-sm);
  white-space: nowrap;
}

.badge--usable {
  color: var(--admin-color-success);
  background: var(--admin-color-success-softer);
}

.badge--backend {
  color: var(--admin-color-danger);
  background: var(--admin-color-danger-softer);
}

.badge--none {
  color: var(--admin-color-text-tertiary);
  background: var(--admin-color-bg-subtle);
}

.tag {
  color: var(--admin-color-text-tertiary);
  background: var(--admin-color-bg-hover);
}

.tag--menu {
  color: var(--admin-color-primary);
  background: var(--admin-color-primary-softer);
}

.tag--none {
  color: var(--admin-color-warning-text);
  background: var(--admin-color-warning-softer);
}

.empty {
  padding: var(--admin-space-xxl);
  font-size: var(--admin-font-md);
  color: var(--admin-color-text-tertiary);
  text-align: center;
}

.footnote {
  margin-top: var(--admin-space-md);
  font-size: var(--admin-font-xs);
  color: var(--admin-color-text-quaternary);
}
</style>
