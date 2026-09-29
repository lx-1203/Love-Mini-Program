#!/usr/bin/env node
/* 源码级判点：给那些"载体本来就是源码、不是渲染帧"的台账行一个可重跑的机器判据。

 为什么要有这个载体：台账里有相当一部分行的判据其实是代码结构命题
 （"模板里不许每次调用 statsOf"、"avatarFailedIds 必须有清除点"、"白色前景改用 --c-text-inverse
 且禁改 --c-bg-container"、"删掉 .catch(() => {}) 空兜底"）。
 这类命题永远等不到帧——帧既看不见调用次数，也看不见 import 在哪一行。
 于是它们既不该记"待修复"（改动确实在位），也不该记"已修复（帧级复验）"（那是假借帧的名义给绿）。
 这里给的是第三种：**已修复（源码级判点）**，并把每条判点的原文谓词一起写进 statusEvidence。

 三条规矩：
   1. 谓词写成数据（SPEC），不写成"我看过没问题"；改判必须能重跑复现。
   2. 注释里出现被禁的写法 **不算违反**（本轮实测：`// 这里原来每次都 fetchProgress()` 是在解释修复），
      所以匹配前先剥掉行注释与块注释。
   3. 一条不过就 exit 非 0，且不许把不过的那条从计划里悄悄删掉。

 用法：node scripts/qa/verify-source-shape.mjs [--out reports/audit/round-7/cellplan-source-shape.json] [--dry]
*/
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
let DRY = process.argv.includes("--dry");
const SPEC_EXTRA = arg("spec-extra", "");const OUT = resolve(REPO, arg("out", "reports/audit/round-7/cellplan-source-shape.json"));

/* 每条判点：id=台账行号，file=承载文件，claim=判据原文要求，checks=可重跑谓词。
   谓词只允许四种：absent / present / countEq / countTemplateEq。 */
const SPEC = [
  /* ── 以下 17 条：台账里状态写着「HEAD 已修，待下轮真机帧复验」但去向标着
     「判据台未覆盖本条 ⇒ 缺的载体=需人复判后指定」的那一批。
     逐条按 statusEvidence 给的锚点重读盘后落判点（探针 tmp/qa/probe-carrier-candidates.mjs，
     每条谓词的命中数在写之前先量过）。两条与台账措辞不同形的，按盘上真形写：
       · PROFILE-022 的让位是 padding 简式里的 calc(var(--statusbar,…))，不是 padding-top；
       · CIRCLES-003 的"两页同规则"是同一表达式形状（return 5 + (…) 且非 mock 直接 0），
         列表页把种子抽成了 circleIdSeed()，所以不能拿字面 seed % 8 去两页各搜一遍。 ── */
  {
    id: "MP-R2-POST-009",
    file: "apps/client/src/subpackages/village/village/post.vue",
    claim: "发布页圈子选择不再铺 store 全量，而是消费截断后的 joinedCircles",
    checks: [{ kind: "present", re: /joinedCircles\.slice\(0, 8\)/ }],
  },
  {
    id: "MP-R2-PROFILE-023",
    file: "apps/client/src/pages/profile/index.vue",
    claim: "growth 整链（数据与卡片）已从本人主页移除，只留解释性注释",
    checks: [
      { kind: "absent", re: /growthItems/g },
      { kind: "absent", re: /MyGrowth/g },
    ],
  },
  {
    id: "MP-R2-PROFILE-022",
    file: "apps/client/src/components/profile/NotLoggedProfile.vue",
    claim: "未登录态顶距改为让开状态栏（走 --statusbar 注入），不再是固定 32rpx 顶距",
    checks: [{ kind: "present", re: /calc\(var\(--statusbar, env\(safe-area-inset-top\)\)/ }],
  },
  {
    id: "MP-R2-POST-012",
    file: "apps/client/src/subpackages/village/village/post.vue",
    claim: "选图一次可选项上限取 POST_MAX_IMAGES，不再写死小于上限的数",
    checks: [{ kind: "present", re: /count:\s*POST_MAX_IMAGES/ }],
  },
  {
    id: "MP-R2-PUB-113",
    file: "apps/client/src/subpackages/village/village/publish.vue",
    claim: "草稿写入前一律过 hasDraftContent 守卫（本地/后端/入口回设三处），空态不再落草稿",
    checks: [
      { kind: "present", re: /function hasDraftContent/ },
      { kind: "countEq", re: /if\s*\(\s*!hasDraftContent\(/g, n: 3 },
    ],
  },
  {
    id: "MP-R2VIS-PAGES-HOME-INDEX-001",
    file: "apps/client/src/components/home/RelationActivity.vue",
    claim: "关系动态卡底色改用容器令牌，不再硬编码与页面底色同值的 #EEF7F2",
    checks: [
      { kind: "absent", re: /#EEF7F2/i },
      { kind: "present", re: /var\(--c-bg-container/ },
    ],
  },
  {
    id: "MP-R2VIS-PAGES-HOME-INDEX-002",
    file: "apps/client/src/components/home/InviteBanner.vue",
    claim: "装饰层不吃点击：pointer-events 走 WXSS，不用 WXML 属性形式（属性形式不改渲染层 hit-test）",
    checks: [
      { kind: "countTemplateEq", re: /pointer-events="none"/g, n: 0 },
      { kind: "present", re: /pointer-events:\s*none/ },
    ],
  },
  {
    id: "MP-R2-PAGES-LOGIN-INDEX-016",
    file: "apps/client/src/pages/login/index.vue",
    claim: "H5 手机号入口的 aria-label 与可见文本同取一个 i18n 键（WCAG 2.5.3 名称同源）",
    checks: [{ kind: "countEq", re: /t\(["']login\.phoneQuickLogin["']\)/g, n: 2 }],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-003",
    files: [
      {
        file: "apps/client/src/subpackages/circles/circles/index.vue",
        checks: [
          { kind: "present", re: /return 5 \+ .*% 8\);/ },
          { kind: "present", re: /if \(!useMock\(\)\) return 0;/ },
        ],
      },
      {
        file: "apps/client/src/subpackages/circles/circles/circle-home.vue",
        checks: [
          { kind: "present", re: /return 5 \+ .*% 8\);/ },
          { kind: "present", re: /if \(!useMock\(\)\) return 0;/ },
        ],
      },
    ],
    claim: "朋友加入数在列表页与圈主页按同一规则派生（真实字段优先、非 mock 直接 0、mock 才用 5+(seed%8)）",
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-002",
    file: "apps/client/src/components/profile/public/PublicHero.vue",
    claim: "他人主页顶部只保留一条压暗渐变层用于文字可读性，模板里就这一个节点（不引入深色状态栏层）",
    checks: [{ kind: "countTemplateEq", re: /class="public-hero__top-gradient"/g, n: 1 }],
  },
  {
    id: "MP-R2-POST-010",
    file: "apps/client/src/subpackages/village/village/post.vue",
    claim: "页面销毁标志与卸载钩子在位，成功回调不再在离页后清表单/弹 toast",
    checks: [
      { kind: "present", re: /pageDestroyed/ },
      { kind: "present", re: /onUnmounted/ },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-CAMPUS-CAMPUS-HUB-002",
    file: "apps/client/src/subpackages/campus/campus/hub.vue",
    claim: "页头里重复的那个认证入口已整删（模板与样式两处一起删）；保留的唯一认证入口在引导横幅侧，走 campus-guide__btn",
    checks: [{ kind: "absent", re: /campus-hub__cert-btn/g }],
  },
  {
    id: "MP-R2-VILLAGE-INDEX-011",
    file: "apps/client/src/components/village/ChannelTabs.vue",
    claim: "ChannelTabs 不声明也不发出 update:modelValue（防 MP-R1-VILLAGE-INDEX-101 的受控态回潮），同时 props 里的 modelValue 必须留着（父组件仍以 v-model 传入）——两半都要成立，只核一半就是空判点",
    checks: [
      { kind: "absent", re: /update:modelValue/g },
      { kind: "present", re: /modelValue/ },
    ],
  },
  {
    id: "MP-R2-POST-011",
    file: "apps/client/src/subpackages/village/village/post.vue",
    claim: "发布页不再触碰后端草稿单例（get/save/deleteDraft 三类调用全部移除，草稿只读本地）",
    checks: [{ kind: "absent", re: /clientApi\.(get|save|delete)Draft/g }],
  },
  {
    id: "MP-R2-POST-014",
    file: "apps/client/src/subpackages/village/village/post.vue",
    claim: "本页不留空兜底 catch（越权调用已整段删除，其余 catch 均带 _e 注释）",
    checks: [{ kind: "absent", re: /\.catch\(\(\)\s*=>\s*\{\}\)/g }],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-001",
    file: "apps/client/src/subpackages/village/village/post.vue",
    claim: ".post-row__label 与 publish 对齐：色走主文本令牌，且不再用等于字号的 height 撑高",
    checks: [{ kind: "present", re: /\.post-row__label\s*\{[^}]*var\(--c-text-primary/ }],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-003",
    file: "apps/client/src/subpackages/village/village/publish.vue",
    claim: "publish 侧存在与 post 页同形的通用弹层（70vh + 安全区），两页弹层高度口径可对账",
    checks: [
      { kind: "present", re: /\.publish-sheet__panel/ },
      { kind: "present", re: /70vh/ },
    ],
  },
  {
    id: "MP-R2VIS-THEME-DESIGN-VARIABLES-001",
    file: "apps/client/src/theme/design-variables.scss",
    claim: "圆角令牌只有唯一一组 $radius-* 声明（双映射收敛为 7 档，不再有第二处定义源）",
    checks: [{ kind: "countEq", re: /^\s*\$radius-[a-z0-9]+:/gm, n: 7 }],
  },
  {
    id: "MP-R2VIS-THEME-DESIGN-VARIABLES-002",
    file: "apps/client/src/subpackages/tools/activities/detail.vue",
    claim: "图上徽标的底色/前景走图片遮罩令牌，不再在暗色变量块里重复定义 --c-text-inverse",
    checks: [{ kind: "present", re: /--c-badge-on-image-bg/ }],
  },
  {
    /* 判据台把这条判成 UNDECIDABLE 的原话是"唯一抠到的判点是标识符 fetchProgress, socialProgressStore，
       压缩构建会改名"⇒ 产物侧永远判不了。这条本来就是删除型命题，载体只能是源码 absent。 */
    id: "MP-R2-PROFILE-034",
    file: "apps/client/src/pages/profile/index.vue",
    claim: "socialProgressStore 实例化与 onShow 里的 fetchProgress() 已从本人主页删除",
    checks: [
      { kind: "absent", re: /socialProgressStore/g },
      { kind: "absent", re: /fetchProgress\(\)/g },
    ],
  },
  {
    /* 同上：判据台说"只在源码树命中的判点（iconSrc.plus）是对局部量的成员访问，压缩会改名/内联"。
       这条判据的可判物件是模板上的 <image> 节点与被删掉的文本 glyph 类，两者都在源码层。 */
    id: "MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-006",
    file: "apps/client/src/subpackages/chat/chat-session/index.vue",
    claim: "附件「+」是 <image> 节点而不是文本 glyph，且本页不再留 .wechat-input-bar__icon-text 样式",
    checks: [
      { kind: "countTemplateEq", re: /class="wechat-input-bar__icon-img"/g, n: 2 },
      { kind: "absent", re: /\.wechat-input-bar__icon-text/g },
    ],
  },
  {
    /* 本轮判据台报 UNDECIDABLE 的十条里，这一条经逐文件 git 对照后是**唯一真的没修的**：
       nearby/index.vue 相对基线 094f7239 零改动，父行 MP-R1-PAGES-NEARBY-INDEX-018 要求的
       "onLoad/onShow 静默 void loadSchools() 存入本地 ref 派生 schoolEntries" 两载体都没有。
       本轮补上实现，判点钉的是"派生源换掉了"而不是"loadSchools 这个词在不在"（后者基线就有）。 */
    id: "MP-R2-PAGES-NEARBY-INDEX-013",
    file: "apps/client/src/pages/nearby/index.vue",
    claim: "校园圈入口的派生源从静态 SCHOOLS 换成后端列表 ref，且 onLoad/onShow/下拉各刷一次",
    checks: [
      { kind: "present", re: /const pool = schoolPool\.value/ },
      { kind: "countEq", re: /refreshSchools\(\);/g, n: 3 },
      { kind: "absent", re: /const rest = SCHOOLS\./g },
    ],
  },
  {
    /* 这三行状态都是「已修复待复验（静态判据不足…）」——活干没干得再看盘，判据在不在得先看它到底要什么。
       逐条读盘后：014 与 006 是真修了但当时没配判点；002 是**判据本身被既有裁定否掉**，
       所以它的判点证明的是"代码符合裁定"，不是"本轮修好了什么"。 */
    id: "MP-R2-CAMPUSPOST-014",
    file: "apps/client/src/subpackages/campus/campus/post-topic.vue",
    claim: "配图列表的 v-for key 用图片临时路径而不是下标（删除中间一张时不会让 Vue 复用错节点）",
    checks: [
      { kind: "countTemplateEq", re: /:key="idx"/g, n: 0 },
      { kind: "present", re: /:key="img"/ },
    ],
  },
  {
    id: "MP-R2-CIRCLES-INDEX-006",
    file: "apps/client/src/subpackages/circles/circles/index.vue",
    claim: "游客（未登录且非 mock）走独立空态文案，不与「有权但空列表」共用同一句",
    checks: [
      { kind: "present", re: /const isGuest = computed\(\(\) => !sessionStore\.isLoggedIn && !useMock\(\)\)/ },
      { kind: "present", re: /isGuest\.value \? t\("circle\./ },
    ],
  },
  {
    /* 这条不是"修复判点"而是"裁定在位判点"：原判据要求副标改成带计数的「附近有 {n} 位同频的你」，
       而 NotLoggedWaiting.vue 顶部那段裁定用五条实测理由把它否掉了（游客无计数真源、
       mock 池是演示规模、real 侧被 GUEST_LIST_LIMIT 截断、理想图那个 12 与图里 6 个头像自相矛盾）。
       判点因此钉"恒取静态键 + 计数版键不存在"，成立即说明代码与裁定一致。 */
    id: "MP-R2VIS-PAGES-MESSAGES-INDEX-002",
    file: "apps/client/src/components/discover/NotLoggedWaiting.vue",
    claim: "副标恒取静态键 notLoggedWaiting.subtitle，不接任何游客计数（原判据按既有裁定作废）",
    checks: [
      { kind: "countTemplateEq", re: /t\(['"]notLoggedWaiting\.subtitle['"]\)/g, n: 1 },
      { kind: "absent", re: /subtitleWithCount/g },
    ],
  },
  {
    /* MP-R2VIS-PAGES-HOME-INDEX-003 的裁切半段：aspectFill 的锚点在中心，竖构图半身人像被圆切成
       中心一块 ⇒ 脸出画。修法是把圆和 overflow 交给外层 clip，图片只按宽缩放贴顶。
       判点因此问三件事：clip 节点在不在、头像图是不是 widthFix、头像规则还写不写死 height
       （写死 height 等于把竖图再压扁一次，裁切就白改了）。
       同页另一处 aspectFill 是别的图，不在本行范围内，所以不拿"全模板零 aspectFill"当判点。 */
    id: "MP-R2VIS-PAGES-HOME-INDEX-003",
    file: "apps/client/src/components/home/NearbyPeople.vue",
    claim: "附近的人头像改为顶部锚定裁切（外层圆 + overflow 裁，图片按宽缩放贴顶），脸恒在画内",
    checks: [
      { kind: "present", re: /class="nearby-item__avatar-clip"/ },
      { kind: "present", re: /<image[^>]*class="nearby-item__avatar"[^>]*mode="widthFix"/s },
      { kind: "absent", re: /\.nearby-item__avatar\s*\{[^}]*height:/g },
    ],
  },
  {
    /* ②「判据含糊」收紧：游客等待卡按理想图应是分解节点（mascot + 独立头像池 + 引导层），
       盘上仍是一张整图海报。负半段可判 ⇒ 这条今天就是红的，修掉整图引用才转绿；
       不许把判据放宽成「整图也算」——那是把没做说成做了。 */
    id: "MP-R2VIS-PAGES-MESSAGES-INDEX-004",
    file: "apps/client/src/components/discover/NotLoggedWaiting.vue",
    claim: "等待卡不再以整图海报作背景，且理想图那一圈是独立节点（吉祥物 + 6 个头像 + 虚线轨道）",
    checks: [
      { kind: "absent", re: /IMAGE_PATHS\.POSTERS\.NOT_LOGGED_WAITING/g },
      { kind: "countTemplateEq", re: /class="not-logged__bg"/g, n: 0 },
      /* 负半段只能证明"整图没了"，不能证明"理想图那一环立起来了"：
         把 <image> 直接删掉也能过上面两条。所以正半段各补一条，缺任何一条都判红。 */
      { kind: "present", re: /class="not-logged__orbit-mascot"/ },
      { kind: "present", re: /class="not-logged__orbit-ring"/ },
      { kind: "present", re: /class="not-logged__orbit-avatar"/ },
      { kind: "countEq", re: /IMAGE_PATHS\.PEOPLE\.AVATAR_\d/g, n: 6 },
    ],
  },
  {
    /* 同一轮的 HOME 巡检行：mock 夹具把 resolveMediaUrl 套在自己的输出上，
       media.ts:180-190 会把前缀再改写回 /static ⇒ 双层调用把 R13 的真实构建修正原地抵消（实测盘上 1 处）。 */
    id: "MP-R2-PAGES-HOME-INDEX-112",
    file: "apps/client/src/services/mocks/fixtures.ts",
    claim: "数据层不得把 resolveMediaUrl 套在自己的输出上，photoUrl 交原始终路径由模板层单次消费",
    checks: [
      { kind: "absent", re: /resolveMediaUrl\s*\(\s*resolveMediaUrl/g },
      { kind: "absent", re: /photoUrl:\s*resolveMediaUrl/g },
    ],
  },
  {
    /* 后台内容管理列表补上「评论」这一列。原先这条被记成"后端缺计数字段"（台账 24 行），
       2026-09-27 只读探针实测详情视图 27 个分量、likesCount/commentsCount 都在且值=1/1，
       缺口其实只在展示层：页面只渲染 赞／藏／看 三个数，i18n 里 villagePosts 段也没有 statsComments。 */
    id: "MP-R7-ADMIN-VILLAGE-COMMENTSCOLUMN-001",
    claim: "后台内容管理列表必须渲染评论数（与赞／藏／看同栏），且两个语言包的 villagePosts 段都有 statsComments 文案",
    files: [
      {
        file: "apps/admin/src/views/forum/VillagePosts.vue",
        checks: [
          { kind: "countTemplateEq", re: /villagePosts\.statsComments/g, n: 1 },
          { kind: "countTemplateEq", re: /post\.commentsCount \?\? 0/g, n: 1 },
        ],
      },
      {
        file: "apps/admin/src/i18n/locales/zh-CN.ts",
        checks: [{ kind: "present", re: /statsComments: "评 \{n\}",/ }],
      },
      {
        file: "apps/admin/src/i18n/locales/en-US.ts",
        checks: [{ kind: "present", re: /statsComments: "C \{n\}",/ }],
      },
    ],
  },
  {
    /* MP-R2-PAGES-MESSAGES-INDEX-022：这条原本挂在"产物侧已见"上，判据台本轮判它 UNDECIDABLE ——
       它授予绿的探针是 console.warn，而那个 warn 在修复前的 HEAD 里就存在，命中不能证明改动落地。
       真正的修后状态是"无调用方的 action 被删掉"，那是个缺席量，只能按源码/产物两侧的 absent 判。
       实测（2026-09-27 04:46）：基线 094f7239 的 stores/messages.ts 里有 2 处，工作树 0 处，
       mock 产物 grep 0 命中；src 下剩下的命中全在 .mimosa/hook-state 的历史快照里，不是源码。 */
    id: "MP-R2-PAGES-MESSAGES-INDEX-022",
    file: "apps/client/src/stores/messages.ts",
    claim: "无调用方的 setSessionPinned 旧 action 必须从 store 源码里消失（缺席量只能按 absent 判，不能拿相邻的 console.warn 命中当证据）",
    checks: [
      { kind: "absent", re: /toggleSessionPin/g },
      { kind: "present", re: /async\s+setSessionPinned\s*\(/ },
    ],
  },
  {
    /* 收紧后顺手量出来的两行「本轮前落地」：判点在基线 094f7239 上就已全绿，
       所以它们证明的是"缺陷不在"，不是"本轮修了"——归因写在 statusEvidence 里，不靠人记。 */
    id: "MP-R2-PAGES-REGISTER-INDEX-009",
    file: "apps/client/src/pages/register/index.vue",
    claim: "isAdult 用分段年月日构造本地 Date 并与本地满 18 界点比较，不做整串 UTC 解析",
    checks: [
      { kind: "present", re: /function isAdult\(dateStr: string\): boolean \{/ },
      { kind: "present", re: /const d = new Date\(year, month - 1, day\);/ },
      { kind: "countEq", re: /adultSince/g, n: 2 },
      { kind: "absent", re: /new Date\(\s*dateStr\s*\)/g },
    ],
  },
  {
    id: "MP-R2-CAMPUS-HUB-011",
    file: "apps/client/src/subpackages/campus/campus/hub.vue",
    claim: "学校卡列表 key 只能是稳定值 school.id，任何 tab 值不得参与拼接",
    checks: [
      { kind: "absent", re: /:key="[^"]*activeTab/g },
      { kind: "countTemplateEq", re: /:key="school\.id"/g, n: 1 },
      { kind: "countTemplateEq", re: /:key=/g, n: 1 },
    ],
  },
  {
    /* MP-R7-GUEST-MATCHING-REDIRECT-RACE-001：游客进 matching 的落点由两个计时器抢出来的
       （401 兜底 500ms 后 reLaunch 登录页 vs 本页失败分支 600ms 后 goBack → switchTab 寻觅 Tab）。
       谁先跑完用户就看到谁 ⇒ 落点不确定。判点钉的是「未登录这条分支必须先判，且它写在 switchTab 之前」，
       即让位给登录引导，落点变成确定的。 */
    id: "MP-R7-GUEST-MATCHING-REDIRECT-RACE-001",
    file: "apps/client/src/subpackages/discover-extra/discover/matching.vue",
    claim: "goBack 在无 token 时先走登录引导，不再把落点定在内容 Tab；switchTab 只可能是已登录路径的兜底",
    checks: [
      { kind: "present", re: /if \(!getToken\(\)\) \{[\s\S]{0,80}replaceAppPath\(ROUTES\.LOGIN\);/ },
      { kind: "present", re: /!getToken\(\)[\s\S]{0,200}uni\.switchTab\(\{ url: ROUTES\.TAB\.DISCOVER \}\)/ },
      { kind: "countEq", re: /uni\.switchTab\(\{ url: ROUTES\.TAB\.DISCOVER \}\)/g, n: 1 },
    ],
  },

  {
    /* 帧判不了的两行改写成源码结构判点。第一行的两个取值表达式必须同形（访客列表长度优先，
       后台统计只在列表为空时兜底）；本文件与基线逐字节相同 ⇒ 证的是"缺陷不在"，不是本轮修了。 */
    id: "MP-R2-PROFILE-025",
    claim: "「最近访客」格与顶栏访客数共用同一表达式，访客列表长度优先、后台 visitorsCount 仅兜底，下游组件不得另取统计字段",
    files: [
      {
        file: "apps/client/src/pages/profile/index.vue",
        checks: [
          { kind: "countEq", re: /likesStore\.visitors\.length \|\| profileStore\.profileStats\?\.visitorsCount \|\| 0/g, n: 2 },
          { kind: "present", re: /\{ key: "visitors", label: "最近访客", value: likesStore\.visitors\.length \|\| profileStore\.profileStats\?\.visitorsCount \|\| 0 \}/ },
          { kind: "absent", re: /visitorsCount\s*(?:\?\?|\|\|)\s*likesStore\.visitors\.length/g },
        ],
      },
      {
        file: "apps/client/src/components/profile/mine/MyProfile.vue",
        checks: [
          { kind: "present", re: /:items="props\.interactionItems"/ },
          { kind: "absent", re: /profileStats|visitorsCount/g },
        ],
      },
    ],
  },
  {
    /* 免打扰图标从时间行移进昵称行：两个类名修前修后都在页上，像素分不出父子关系，
       模板里的相对位置能。三条判点在基线上实测为红 ⇒ 这一行的本轮归因是量出来的，不是继承的。 */
    id: "MP-R2VIS-PAGES-MESSAGES-INDEX-009",
    file: "apps/client/src/pages/messages/index.vue",
    claim: "免打扰图标是昵称行（chat-item__top-row）的末位子节点，时间行只承载时间文本",
    checks: [
      { kind: "countTemplateEq", re: /class="chat-item__muted-icon"[\s\S]{0,240}<\/view>\s*<EmojiText/g, n: 1 },
      { kind: "countTemplateEq", re: /<view class="chat-item__time-row">\s*<text class="chat-item__time">\{\{ formatTime\(session\.lastMessageSentAt\) \}\}<\/text>\s*<\/view>/g, n: 1 },
      { kind: "absent", re: /class="chat-item__time-row"[\s\S]{0,300}<image/g },
      { kind: "countTemplateEq", re: /class="chat-item__muted-icon"/g, n: 1 },
    ],
  },
  {
    /* ④/①：游客被 401 兜底弹到登录页（http.ts:493-494），而注册入口原先只在 v-else 的手机号表单分支里
       ⇒ 新用户落地后在默认态看不见注册路径。这条判点是"先立判据、后改代码"留下的：
       改码前实测 4 项里 2 项不过（红），改码后全过；帧侧再证一次由 verify-guest-landing.mjs 的 measure 腿负责。 */
    id: "MP-R7-GUEST-LANDING-REGENTRY-001",
    file: "apps/client/src/pages/login/index.vue",
    claim: "默认态（未展开手机号表单的 .login-quick 分支）就有可见的注册入口，且仍受 isRegisterOpen 开关控制、与表单内那处共用同一跳转函数",
    checks: [
      { kind: "present", re: /class="login-quick"/ },
      { kind: "present", re: /login-register-entry/ },
      { kind: "countEq", re: /v-if="isRegisterOpen"/g, n: 2 },
      { kind: "countEq", re: /@tap="goRegisterPage"/g, n: 2 },
    ],
  },
  {
    id: "MP-R2-CAMPUS-HUB-012", file: "apps/client/src/subpackages/campus/campus/hub.vue",
    claim: "成员数/动态数每卡只计算一次（模板不得反复调 statsOf）",
    checks: [{ kind: "countTemplateEq", re: /statsOf\s*\(/g, n: 0 }, { kind: "present", re: /stats:\s*statsOf\(/ }],
  },
  {
    id: "MP-R2-PAGES-MESSAGES-INDEX-021", file: "apps/client/src/pages/messages/index.vue",
    claim: "头像失败的置位集合必须有清除点（否则重载后永远占位）",
    checks: [{ kind: "countEq", re: /avatarFailedIds\.value\s*=\s*new Set\(\)/g, n: 1 }],
  },
  {
    id: "MP-R2-CAMPUSPOST-016", file: "apps/client/src/subpackages/circles/circles/post-topic.vue",
    claim: "onLoad 的 import 必须在文件头 import 区，不得夹在脚本中段",
    checks: [{ kind: "importHead", re: /import\s*\{[^}]*onLoad[^}]*\}\s*from/ }],
  },
  {
    id: "MP-R2-VILLAGE-INDEX-010", file: "apps/client/src/subpackages/village/village/index.vue",
    claim: "删掉 `.catch(() => {})` 这种吞异常的空兜底",
    checks: [{ kind: "absent", re: /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g }],
  },
  {
    id: "MP-R2-PROFILE-034", file: "apps/client/src/pages/profile/index.vue",
    claim: "删除 socialProgressStore 实例化与 onShow 里的 fetchProgress()",
    checks: [{ kind: "absent", re: /socialProgressStore\.(fetchProgress|load)\s*\(/g },
      { kind: "absent", re: /const\s+socialProgressStore\s*=/g }],
  },
  {
    id: "MP-R2-PAGES-REGISTER-INDEX-014", file: "apps/client/src/pages/register/index.vue",
    claim: "(A) 三处彩色底上的白色前景改用 var(--c-text-inverse)，并明令禁改 var(--c-bg-container)",
    checks: [{ kind: "countEq", re: /var\(--c-text-inverse/g, n: 3 }, { kind: "present", re: /var\(--c-bg-container/g }],
  },
  {
    id: "MP-R2-CAMPUS-HUB-009", file: "apps/client/src/subpackages/campus/campus/hub.vue",
    claim: "同文件两处 --c-bg-page 兜底值统一：:372 用 #EEF7F2，另一处不得再留 #F0F4F2",
    checks: [{ kind: "absent", re: /#F0F4F2/g }, { kind: "countEq", re: /#EEF7F2/g, n: 2 }],
  },
  {
    /* 这一条原本是"待人读帧"：取景器给的三个判点全是 FRAME_ONLY（帧里量不到圆角数值），
       而判据本身其实是 CSS 声明命题——三枚按钮的 border-radius 换成 var(--r-full)。
       逐选择器量比"整文件计数"更硬：计数 3 只能证明有 3 处，不能证明正好落在这三枚按钮上。 */
    id: "MP-R2VIS-PAGES-LOGIN-INDEX-001", file: "apps/client/src/pages/login/index.vue",
    claim: "三枚按钮（.btn-primary / .btn-phone-quick / .btn-guest）的 border-radius 全部改用 var(--r-full)",
    checks: [
      { kind: "present", re: /\.btn-primary\s*\{[^}]*border-radius:\s*var\(--r-full\)/ },
      { kind: "present", re: /\.btn-phone-quick\s*\{[^}]*border-radius:\s*var\(--r-full\)/ },
      { kind: "present", re: /\.btn-guest\s*\{[^}]*border-radius:\s*var\(--r-full\)/ },
      { kind: "countEq", re: /border-radius:\s*var\(--r-full\)/g, n: 3 },
    ],
  },
  /* 下面三条原本是挂在 `tmp/tour-R2.mjs` 上的——那个文件被 .gitignore 的 `tmp/` 挡着，
     台账写"HEAD 已修"时其实根本不在 HEAD 里（详见 NOTES §42）。
     三处修都在**已跟踪**的后继载体 scripts/qa/tour-r6.mjs 里，判点因此改指向它。 */
  {
    id: "MP-R2VIS-TMP-TOUR-R2-001", file: "scripts/qa/tour-r6.mjs",
    claim: "权限抑制点在 wx.* JS 桥那层，且注册型 API（wx.onNeedPrivacyAuthorization）故意不 mock",
    checks: [
      { kind: "present", re: /'wx\.onNeedPrivacyAuthorization':/ },
      { kind: "present", re: /notMockedOnPurpose:/ },
      { kind: "present", re: /const CAPTURE_LIMITATIONS = \{/ },
    ],
  },
  {
    id: "MP-R2VIS-TMP-TOUR-R2-002", file: "scripts/qa/tour-r6.mjs",
    claim: "帧去重要有整帧内容哈希（sha256 前 16 位），且判等口径是字节全等而非感知哈希",
    checks: [
      { kind: "present", re: /function frameHash\(buf\)/ },
      { kind: "present", re: /digest\('hex'\)\.slice\(0, 16\)/ },
      { kind: "present", re: /'state-not-applied'/ },
    ],
  },
  {
    id: "MP-R2VIS-TMP-TOUR-R2-003", file: "scripts/qa/tour-r6.mjs",
    claim: "probeRoute 不能只取栈顶：必须同时把整条页面栈（top/depth/stack）带回来",
    checks: [
      { kind: "present", re: /async function probeRoute\(\)/ },
      { kind: "present", re: /JSON\.stringify\(\{top:[^}]*stack:/ },
      { kind: "present", re: /stack:\s*(?:o\.stack\|\[\]|out)/ },
    ],
  },
  {
    /* 判据是"两处 void fetchLikes 的空 catch 要接上上报"——纯代码结构命题，
       帧里既看不见 catch 也看不见 captureException，所以按谓词结案。 */
    id: "MP-R2-PROFILE-035", file: "apps/client/src/pages/profile/index.vue",
    claim: "两处 likesStore.fetchLikes() 的 .catch(() => {}) 空兜底改为 captureException 上报",
    checks: [
      { kind: "absent", re: /fetchLikes\(\)\.catch\(\(\)\s*=>\s*\{\s*\}\)/g },
      { kind: "countEq", re: /captureException\(error,\s*\{\s*source:\s*"profile\.fetchLikes"/g, n: 2 },
    ],
  },
  {
    /* 遮蔽（shadowing）这一类：函数内再取一次同名 store 会让外层那个永远不生效。
       判点只问"整份文件里这样的实例化还剩几次"——应当只剩 setup 顶层那一次。 */
    id: "MP-R2-CIRCLES-INDEX-009", file: "apps/client/src/subpackages/circles/circles/index.vue",
    claim: "删除函数内重复的 useSessionStore 实例化，只保留 setup 顶层一处",
    checks: [{ kind: "countEq", re: /const sessionStore = useSessionStore\(\)/g, n: 1 }],
  },
  {
    /* 这条横跨两个页面 + 一处缓存写入守卫，所以用 files 逐文件核；
       任一文件不过，整条不过——不能因为 home 标注了就给整条绿灯。 */
    id: "MP-R6-F1-NEARBY-IP-CITY-001",
    claim: "citySource=ip 时城市只用于标注：home/nearby 副标题带「按服务器位置推断」，且不写进 NEARBY_CITY 缓存",
    files: [
      {
        file: "apps/client/src/pages/home/index.vue",
        checks: [
          { kind: "present", re: /loc\.citySource === "ip"/ },
          { kind: "present", re: /locationPage\.serverCityTag/ },
        ],
      },
      {
        file: "apps/client/src/pages/nearby/index.vue",
        checks: [
          { kind: "present", re: /const ipSourced = loc\.citySource === "ip";/ },
          { kind: "present", re: /locationPage\.serverCityTag/ },
          { kind: "present", re: /if \(!ipSourced\) \{[\s\S]{0,400}setStorageSync\(STORAGE_KEYS\.NEARBY_CITY/ },
        ],
      },
    ],
  },
  {
    /* 图标引用"在不在盘上"是存在性命题，不是文本命题：
       判点直接要求三个被引用的 svg 文件真的存在且非 0 字节。 */
    id: "MP-R2VIS-CONFIG-IMAGES-001", file: "apps/client/src/config/images.ts",
    claim: "config/images.ts 引用的 paw/cat/planet 三枚图标文件确实在盘上（非 0 字节）",
    checks: [
      { kind: "present", re: /CIRCLE_PET:\s*ICONS_BASE \+ '\/common\/paw\.svg'/ },
      { kind: "present", re: /CIRCLE_CAT:\s*ICONS_BASE \+ '\/common\/cat\.svg'/ },
      { kind: "present", re: /CIRCLE_PLANET:\s*ICONS_BASE \+ '\/common\/planet\.svg'/ },
      { kind: "fileExists", path: "apps/client/src/static/assets/icons/common/paw.svg" },
      { kind: "fileExists", path: "apps/client/src/static/assets/icons/common/cat.svg" },
      { kind: "fileExists", path: "apps/client/src/static/assets/icons/common/planet.svg" },
    ],
  },
  /* 下面三条都是台账写"待修复"、但**处置要求的改法其实已在源码里**的行。
     判点按处置原文逐字核，不为凑绿而放宽；帧侧拿不到的（要特定夹具）在证据里写清楚。 */
  {
    id: "MP-R2-PAGES-MESSAGES-INDEX-019", file: "apps/client/src/pages/messages/index.vue",
    claim: "活动推荐卡的 CTA 按 act.targetUrl 条件渲染（无跳转目标就不出「查看详情」）",
    checks: [
      { kind: "present", re: /<view v-if="act\.targetUrl" class="activity-rec-card__cta">/ },
      { kind: "present", re: /function openActivity\(targetUrl\?: string\) \{\s*\n\s*if \(targetUrl\)/ },
    ],
  },
  {
    id: "MP-R2-PAGES-NEARBY-INDEX-014", file: "apps/client/src/pages/nearby/index.vue",
    claim: "loadActivities 非 force 分支前置在途守卫（activityStore.loading 时直接 return），force 分支仍强制拉",
    checks: [
      { kind: "present", re: /if \(activityStore\.loading\) return;/ },
      { kind: "present", re: /async function loadActivities\(force = false\)[\s\S]{0,220}fetchActivities\(true\)/ },
    ],
  },
  {
    id: "MP-R2-PAGES-HOME-INDEX-110", file: "apps/client/src/components/home/TodayRecommendationCard.vue",
    claim: "distance 行与 metaLine 同口径：computed 里 parts 数组 join(' · ')，模板只输出一个 text",
    checks: [
      { kind: "present", re: /const parts: string\[\] = \[\];/ },
      { kind: "present", re: /return parts\.join\(" · "\);/ },
      { kind: "countEq", re: /class="today-card__distance"/g, n: 1 },
    ],
  },
  /* ↓ 这一批是"台账写待修复、处置其实早已在码"与"本轮修复波刚落的两处"混在一起，
     每条判点都按处置原文逐字核（承载文件与行号已在本轮逐个 grep 验过）：
     放宽判点去凑绿，与把已修的说成没修，是同一种账实不符的两个方向。 */
  {
    id: "MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-001",
    file: "apps/client/src/subpackages/profile-extra/profile/location.vue",
    claim: "城市与坐标同源：ip 城市超 100km 就不渲染（只留坐标 + 地址解析不可用），且地图选点必须把上一次的 ip 标记复位",
    checks: [
      { kind: "present", re: /const shownCity = computed\(\(\) => \(cityDistant\.value \? "" : city\.value\)\);/ },
      { kind: "present", re: /cityDistant\.value = loc\.citySource === "ip" && loc\.cityTrusted === false;/ },
      { kind: "present", re: /cityFromIp\.value = false;/ },
      { kind: "countEq", re: /cityFromIp\.value = false;/g, n: 1 },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-001",
    file: "apps/client/src/components/match/MatchLoading.vue",
    claim: "跳过钮走令牌（容器面底色 + 品牌绿字），且 __skip 那条规则里不许再留裸 rgba 品牌绿",
    checks: [
      { kind: "present", re: /\.match-loading__skip\s*\{[\s\S]{0,300}background:\s*var\(--c-bg-container,/ },
      { kind: "present", re: /color:\s*var\(--c-text-brand,/ },
      { kind: "absent", re: /\.match-loading__skip\s*\{[^}]*rgba\(54,/ },
    ],
  },
  {
    id: "MP-R2VIS-PAGES-LOGIN-INDEX-007",
    file: "apps/client/src/pages/login/index.vue",
    claim: "两个手机号入口分开命名且样式分级：快捷授权仍是主按钮，验证码/密码入口降级为细边小高度文字入口",
    checks: [
      { kind: "present", re: /class="login-phone-entry press-feedback"/ },
      { kind: "present", re: /class="btn-phone-quick press-feedback"/ },
      { kind: "present", re: /\.login-phone-entry\s*\{[\s\S]{0,300}min-height:\s*var\(--btn-height-sm\)/ },
      { kind: "present", re: /\.login-phone-entry\s*\{[\s\S]{0,300}border:\s*1rpx solid var\(--c-border-default/ },
    ],
  },
  {
    id: "MP-R2-PAGES-HOME-INDEX-111",
    claim: "首页两张卡在骨架分支后补了 items.length === 0 的空态块（缺一个就不算修）",
    files: [
      {
        file: "apps/client/src/components/home/InterestRecommendation.vue",
        checks: [{ kind: "present", re: /v-else-if="items\.length === 0" class="interest-recommend__empty"/ }],
      },
      {
        file: "apps/client/src/components/home/NearbyPeople.vue",
        checks: [{ kind: "present", re: /v-else-if="items\.length === 0" class="nearby-people__empty"/ }],
      },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-005",
    file: "apps/client/src/subpackages/village/village/publish.vue",
    claim: "@tap 节点补 hover-class；hover-class 一个都不许留在 <text> 上（mp-weixin 里那是死属性，话题 chip 的 × 已换型为 view）",
    checks: [
      { kind: "present", re: /publish-header__submit[\s\S]{0,260}hover-class="press-feedback--active"/ },
      { kind: "present", re: /publish-header__close[\s\S]{0,200}hover-stay-time="120"/ },
      { kind: "absent", re: /<text[^>]*hover-class=/g },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-001",
    file: "apps/client/src/subpackages/chat/chat-session/index.vue",
    claim: "先按 deletedMessageIds 过滤再进 buildChatMessageRows（过滤发生在行模型外面，时间条才不会挂在没有消息的位置上）",
    checks: [
      { kind: "present", re: /buildChatMessageRows\(\s*\n\s*currentMessagesView\.value\.filter\(\(m\) => !deletedMessageIds\.value\.has\(m\.id\)\)/ },
      { kind: "absent", re: /buildChatMessageRows\(currentMessagesView\.value\)/g },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-004",
    file: "apps/client/src/components/chat/ChatBubble.vue",
    claim: "图片泡有加载前骨架（min-height + 浅底）与 @error 后的「图片加载失败」文案态，两者都在样式与模板里落地",
    checks: [
      { kind: "present", re: /:class="\{ 'bubble__image--skeleton': !imageLoaded \}"/ },
      { kind: "present", re: /@error="imageError = true"/ },
      { kind: "present", re: /v-else-if="kind === 'image' && body" class="bubble__image-failed"/ },
      { kind: "present", re: /\.bubble__image--skeleton\s*\{[\s\S]{0,120}min-height:/ },
      { kind: "present", re: /\.bubble__image-failed\s*\{[\s\S]{0,160}min-height:/ },
    ],
  },
  /* ↓ 三条 lane 报「处置早已在码」的行：判点由我逐字 grep 复核后写死，
     结案依据是可重跑的谓词而不是 lane 的自述。 */
  {
    id: "MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-001",
    file: "apps/client/src/subpackages/circles/circles/index.vue",
    claim: "激活态频道页签是品牌绿底 + 反白字（令牌而非浅底字面量）",
    checks: [
      { kind: "present", re: /\.circles-tab--active\s*\{[\s\S]{0,160}background:\s*var\(--c-brand,\s*#36C99A\)/ },
      { kind: "present", re: /\.circles-tab--active \.circles-tab__text\s*\{[\s\S]{0,120}color:\s*var\(--c-neutral-0,\s*#FFFFFF\)/ },
      { kind: "absent", re: /\.circles-tab--active\s*\{[^}]*--c-bg-brand,/g },
    ],
  },
  {
    id: "MP-R2-POSTTOPIC-011",
    claim: "遮罩用已定义令牌 --c-bg-overlay，且 --c-bg-brand-soft 在主题层有亮/暗双值（页面代码不再自带字面量兜底）",
    files: [
      {
        file: "apps/client/src/subpackages/circles/circles/post-topic.vue",
        checks: [{ kind: "present", re: /background:\s*var\(--c-bg-overlay,/ }],
      },
      {
        file: "apps/client/src/styles/tokens.scss",
        checks: [
          { kind: "present", re: /--c-bg-brand-soft:\s*#F0FDF9;/ },
          { kind: "present", re: /--c-bg-brand-soft:\s*var\(--c-brand-50\);/ },
          { kind: "countEq", re: /^\s*--c-bg-brand-soft:/gm, n: 2 },
        ],
      },
    ],
  },
  {
    id: "MP-R2-PAGES-MESSAGES-INDEX-020",
    claim: "「标为未读」后有 toast 明示只在本地生效（zh/en 键都在），且「全部已读」只在数据加载完成那一处发生（锁定态的 onShow 不再无条件清）；后端未读元数据同步那半段仍是欠项",
    files: [
      {
        file: "apps/client/src/pages/messages/index.vue",
        checks: [
          { kind: "present", re: /uni\.showToast\(\{\s*title:\s*t\("messages\.unreadLocalHint"\)/ },
          /* loadPage 在 !isUnlocked 时 early return（:294），而 :304 在它之后 ⇒ onShow 里那次（原 :320）
             是唯一会在锁定态清未读的路径，也是"双重置"的另一半。计数判成 1 才说明两半都收在一个地方。 */
          { kind: "present", re: /if \(!isUnlocked\.value\) return;/ },
          { kind: "countEq", re: /void messagesStore\.markAllSessionsRead\(\)/g, n: 1 },
        ],
      },
      {
        file: "apps/client/src/i18n/locales/zh-CN.ts",
        checks: [{ kind: "present", re: /"unreadLocalHint":\s*"已标为未读（仅本机生效，离开页面后会还原）"/ }],
      },
      {
        file: "apps/client/src/i18n/locales/en-US.ts",
        checks: [{ kind: "present", re: /unreadLocalHint:\s*"Marked unread \(local only;/ }],
      },
    ],
  },
  /* ↓ 第二波修复波（8 个 lane、19 行）的判点。承载行逐字 grep 复核过才写死。
     两条 absent 锁「样式规则行首」而不是类名字符串——死分支的类名在删除说明的注释里还在，
     按类名判会把已删的东西读成没删。 */
  {
    id: "MP-R2-PROFILE-024",
    claim: "页底安全区分两档：游客档让开 .nlp-footer-btn 顶缘(+108rpx)，本人档让开 GlobalPublishFab 顶缘(+112rpx)，都以 --tab-bar-total-h 令牌为基准而不是重抄 184rpx",
    files: [
      { file: "apps/client/src/components/profile/NotLoggedProfile.vue", checks: [
        { kind: "present", re: /padding: calc\([^;\n]*\) 24rpx calc\(var\(--tab-bar-total-h[\s\S]{0,140}\+ 108rpx\)/ },
      ] },
      { file: "apps/client/src/components/profile/mine/MyProfile.vue", checks: [
        { kind: "present", re: /padding-bottom: calc\(var\(--tab-bar-total-h[\s\S]{0,140}\+ 112rpx\)/ },
      ] },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-001",
    /* 判点重锚（2026-09-27 04:48）：原来那三条 present 钉的是 PublicIdentity 里的内联解析
       （`const [cityPart, schoolPart] = loc.split("·")` 等）。本轮把这段抽进 utils/profile-meta.ts
       之后三条当场失效 —— 不是缺陷回归，是**判点钉错了地方**：它钉"某一页内部怎么写"，
       而这条缺陷的本体是"两页必须同序"。改成钉结构：两页都 import 且调用共用 formatter，
       且都不再就地 split；顺序断言交给共用模块本身 + profile-meta.spec.ts 的挂载测。 */
    claim: "两页 meta 同序由共用 formatter 保证：PublicIdentity 与 MyHeader 都 import 且调用 profileMeta*，且都不再就地 split location",
    files: [
      {
        file: "apps/client/src/components/profile/public/PublicIdentity.vue",
        checks: [
          { kind: "present", re: /profileMetaParts\(props\.profile\.basic\)/ },
          { kind: "absent", re: /loc\.split\("·"\)/ },
        ],
      },
      {
        file: "apps/client/src/components/profile/mine/MyHeader.vue",
        checks: [
          { kind: "present", re: /profileMetaLine\(props\.profile\.basic\)/ },
          { kind: "absent", re: /basic\.location\)\s*parts\.push/ },
        ],
      },
      {
        file: "apps/client/src/utils/profile-meta.ts",
        checks: [
          { kind: "present", re: /if \(schoolPart\) parts\.push\(schoolPart\);/ },
          { kind: "present", re: /if \(cityPart\) parts\.push\(cityPart\);/ },
        ],
      },
    ],
  },
  {
    id: "MP-R2VIS-PAGES-HOME-INDEX-004",
    file: "apps/client/src/components/home/TodayRecommendationCard.vue",
    claim: "「换一位」的刷新符从裸字符换成同族线性 SVG（IMAGE_PATHS + resolveMediaUrl），色走 --c-text-tertiary，素材真在盘上",
    checks: [
      { kind: "present", re: /:src="resolveMediaUrl\(IMAGE_PATHS\.ICONS_COMMON\.REFRESH_SVG\)"/ },
      { kind: "present", re: /\.today-card__rotate[\s\S]{0,260}--c-text-tertiary/ },
      { kind: "fileExists", path: "apps/client/src/static/assets/icons/common/refresh.svg" },
    ],
  },
  {
    id: "MP-R2-PAGES-REGISTER-INDEX-011",
    file: "apps/client/src/pages/register/index.vue",
    claim: "小目标点的热区外扩到命中层（hero 返回 / 同意勾选 / 三个字段前缀都走包一层 hit view），视觉尺寸不动",
    checks: [
      { kind: "present", re: /<view class="hero__back-hit" @tap="goLogin">/ },
      { kind: "present", re: /<view class="agree__hit" @tap="agreed = !agreed">/ },
      { kind: "countEq", re: /class="(hero__back-hit|agree__hit|field__tap[^"]*)"/g, n: 5 },
    ],
  },
  {
    id: "MP-R2-PAGES-REGISTER-INDEX-012",
    file: "apps/client/src/pages/register/index.vue",
    claim: "两次密码比对挪到确认框 @blur（onConfirmBlur），且这条 blur 绑定全页只有一处",
    checks: [
      { kind: "present", re: /function onConfirmBlur\(\)/ },
      { kind: "countEq", re: /@blur="onConfirmBlur"/g, n: 1 },
    ],
  },
  {
    id: "MP-R2-PAGES-REGISTER-INDEX-013",
    claim: "注册页提示语改走 t(register.*)，zh/en 同批配对（举两条为锚，不留裸中文）",
    files: [
      { file: "apps/client/src/pages/register/index.vue", checks: [
        { kind: "present", re: /t\("register\.errMinorBlocked"\)/ },
        { kind: "present", re: /t\("register\.errAgreeRequired"\)/ },
      ] },
      { file: "apps/client/src/i18n/locales/zh-CN.ts", checks: [
        { kind: "present", re: /"errMinorBlocked": "未满 18 岁暂无法注册"/ },
      ] },
      { file: "apps/client/src/i18n/locales/en-US.ts", checks: [
        { kind: "present", re: /errMinorBlocked: "You can't register until you're 18"/ },
      ] },
    ],
  },
  {
    id: "MP-R2-CAMPUSINDEX-010",
    claim: "认证拉取失败与通用错误拆开：store 有独立 certificationError，认证页据此出重试条，不再静默退成「未认证」",
    files: [
      { file: "apps/client/src/stores/campus.ts", checks: [
        { kind: "present", re: /certificationError: string \| null;/ },
        { kind: "present", re: /this\.certificationError = message;/ },
      ] },
      { file: "apps/client/src/subpackages/campus/campus/index.vue", checks: [
        { kind: "present", re: /certificationError/ },
      ] },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-007",
    file: "apps/client/src/subpackages/chat/chat-session/index.vue",
    claim: "消息区空态垂直居中：空态分支挂 .chat-list--empty 且该规则含 justify-content: center",
    checks: [
      { kind: "present", re: /:class="\{ 'chat-list--empty': !messagesStore\.currentMessages\.length \}"/ },
      { kind: "present", re: /\.chat-list--empty\s*\{[\s\S]{0,200}justify-content: center/ },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-A02",
    file: "apps/client/src/subpackages/chat/chat-session/index.vue",
    claim: "键盘态差异化间距那条死分支已从样式表删除（处置选「只删不猜」）；类名只允许出现在说明注释里，故判点锁规则行首",
    checks: [
      { kind: "absent", re: /^\s*\.wechat-input-bar--keyboard-up\s*\{/m },
    ],
  },
  {
    id: "MP-R2-VILLAGE-INDEX-012",
    file: "apps/client/src/subpackages/village/village/index.vue",
    claim: "精选话题失败出错误条 + 重试（复用 loadChannelData(id,true) 的 TTL 旁路），活动列表补空态且失败不冒充空态",
    checks: [
      { kind: "present", re: /errorMessage: circleErrorMessage/ },
      { kind: "present", re: /v-else-if="circleErrorMessage"/ },
      { kind: "present", re: /t\('nearby\.activitiesEmpty'\)/ },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-INDEX-001",
    file: "apps/client/src/components/village/PostCard.vue",
    claim: "话题标签统一单色绿：.post-card__tag--pink 规则已从样式表删除，绿色仍走 --c-brand-500",
    checks: [
      { kind: "absent", re: /^\s*\.post-card__tag--pink\s*\{/m },
      { kind: "present", re: /\.post-card__tag--green\s*\{[\s\S]{0,140}color: var\(--c-brand-500/ },
    ],
  },
  {
    id: "MP-R2-POST-013",
    claim: "副标题在「目标是圈子但圈子还没解析出来」时兜到圈内成员可见，与标题兜底、标签同语义，且走 i18n 键（zh/en 都在）",
    files: [
      { file: "apps/client/src/subpackages/village/village/post.vue", checks: [
        { kind: "present", re: /if \(isCircleTarget\.value\) return t\("village\.post\.visibilityCircleMembers"\);/ },
      ] },
      { file: "apps/client/src/i18n/locales/zh-CN.ts", checks: [
        { kind: "present", re: /"visibilityCircleMembers": "圈内成员可见"/ },
      ] },
      { file: "apps/client/src/i18n/locales/en-US.ts", checks: [
        { kind: "present", re: /visibilityCircleMembers: "Visible to circle members"/ },
      ] },
    ],
  },
  {
    id: "MP-R2-PUB-114",
    file: "apps/client/src/subpackages/village/village/publish.vue",
    claim: "onLoad 回设 campus/circleId 时同步 visibility（campus→school、circle→interest）",
    checks: [
      { kind: "present", re: /visibility\.value = "school";/ },
      { kind: "present", re: /visibility\.value = "interest";/ },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH-004",
    file: "apps/client/src/subpackages/village/village/publish.vue",
    claim: "24rpx 两处走等值令牌 var(--r-xl, 24rpx)；本文件一次都不许出现 --card-radius（那是 40rpx，换上就是视觉变更，须另立裁决）",
    checks: [
      { kind: "countEq", re: /var\(--r-xl, 24rpx\)/g, n: 2 },
      { kind: "absent", re: /--card-radius/g },
    ],
  },
  {
    id: "MP-R2-POSTTOPIC-013",
    file: "apps/client/src/subpackages/circles/circles/post-topic.vue",
    claim: "提交中的防重在途有可见反馈：两处提交按钮文案在 isSubmitting 时切成 common.submitting（复用既有键）",
    checks: [
      { kind: "countEq", re: /isSubmitting \? t\("common\.submitting"\)/g, n: 2 },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-002",
    file: "apps/client/src/subpackages/village/village/detail.vue",
    claim: "两张图时等宽 50/50（首图不再独占整行），与 PostCard 两图口径同算法",
    checks: [
      { kind: "present", re: /:class="\{ 'post-images--two': currentPost\.images\.length === 2 \}"/ },
      { kind: "present", re: /\.post-images--two \.post-image-wrap[\s\S]{0,200}width: calc\(\(100% - 12rpx\) \/ 2\)/ },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-CIRCLES-CIRCLES-CIRCLE-HOME-002",
    claim: "圈内置顶公告不再是写死的中文字面量：组件走 i18n 键，且两个语种都真的有这个键",
    files: [
      {
        file: "apps/client/src/subpackages/circles/circles/circle-home.vue",
        checks: [
          { kind: "absent", re: /【(圈规|规约)】/g },
          { kind: "countEq", re: /useMock\(\)\s*\?\s*t\("circle\.home\.pinnedNotice"\)/g, n: 1 },
        ],
      },
      {
        file: "apps/client/src/i18n/locales/zh-CN.ts",
        checks: [{ kind: "present", re: /"pinnedNotice":\s*"【圈规】/ }],
      },
      {
        file: "apps/client/src/i18n/locales/en-US.ts",
        checks: [{ kind: "present", re: /pinnedNotice:\s*"\[Rules\]/ }],
      },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-POST-006",
    claim: "两个发布入口的圈子候选行结构一致：不再有独立的「已加入」pill 类，成员数并进同一句 desc",
    files: [
      {
        file: "apps/client/src/subpackages/village/village/post.vue",
        checks: [
          { kind: "absent", re: /target-sheet__joined/g },
          { kind: "countTemplateEq", re: /target-sheet__desc">已加入 · \{\{ formatMemberShort\(circle\.memberCount\) \}\} 成员<\/text>/g, n: 1 },
        ],
      },
      {
        file: "apps/client/src/subpackages/village/village/publish.vue",
        checks: [
          { kind: "absent", re: /target-sheet__joined/g },
          { kind: "countTemplateEq", re: /target-sheet__desc">已加入 · \{\{ formatMemberShort\(circle\.memberCount\) \}\} 成员<\/text>/g, n: 1 },
        ],
      },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-CAMPUS-CAMPUS-HUB-006",
    claim: "校园域两级键命名空间已统一：hub 页不再用顶层扁平 campusHub.*，而是与同域其余四页一样的 campus.hub.*（两份语言包都真有这么一层）",
    files: [
      {
        file: "apps/client/src/subpackages/campus/campus/hub.vue",
        checks: [
          { kind: "absent", re: /campusHub\./g },
          { kind: "countEq", re: /campus\.hub\./g, n: 23 },
        ],
      },
      {
        file: "apps/client/src/i18n/locales/zh-CN.ts",
        checks: [{ kind: "absent", re: /"campusHub"\s*:/g }, { kind: "present", re: /^ {2}"campus"\s*:\s*\{[\s\S]{0,40000}?\n {4}"hub"\s*:\s*\{/m }],
      },
      {
        file: "apps/client/src/i18n/locales/en-US.ts",
        checks: [{ kind: "absent", re: /\bcampusHub\s*:/g }, { kind: "present", re: /^ {2}campus\s*:\s*\{[\s\S]{0,40000}?\n {4}hub\s*:\s*\{/m }],
      },
    ],
  },
  {
    id: "MP-R1-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-002",
    claim: "引用回复端到端接通：私信与临时两条发送链路都把 quoteRef 发出去，读回侧把 quoteContext 解析成行模型字段（后端早就有字段，缺的是客户端）",
    files: [
      {
        file: "apps/client/src/stores/messages.ts",
        checks: [
          { kind: "absent", re: /_quoteRef/g },
          { kind: "absent", re: /无引用字段/g },
          { kind: "present", re: /data: quoteRefPayload \? \{ content, kind, quoteRef: quoteRefPayload \} : \{ content, kind \}/ },
          { kind: "present", re: /export function parsePrivateQuoteContext\(/ },
          { kind: "present", re: /quoteContext\?: string \| null;/ },
        ],
      },
      {
        file: "apps/client/src/stores/chat/actions/messaging.ts",
        checks: [
          { kind: "present", re: /kind: SendMessageRequest\["kind"\] = "text",\s*\n\s*quoteRef\?: string \| null/ },
          { kind: "present", re: /quoteRef: quoteRef && quoteRef\.trim\(\) && quoteRef\.trim\(\)\.length <= 64/ },
        ],
      },
      {
        file: "apps/client/src/subpackages/chat/chat-session/index.vue",
        checks: [{ kind: "present", re: /chatStore\.sendText\(messageToSend, "text", quoteRef\?\.messageId \?\? null\)/ }],
      },
      {
        file: "apps/client/src/services/websocket/ws-message-adapter.ts",
        checks: [{ kind: "present", re: /parsePrivateQuoteContext\(/ }],
      },
    ],
  },
  {
    id: "MP-R7CLIENT-UPLOAD-EXT-001",
    claim: "共享上传路径有客户端扩展名闸门，白名单是单一来源且与后端同集合（图片 jpg/jpeg/png/webp、视频 mp4/mov、音频 aac/mp3/m4a/wav）",
    files: [
      {
        file: "apps/client/src/utils/media.ts",
        checks: [
          { kind: "present", re: /ALLOWED_MEDIA_EXTS/ },
          { kind: "countEq", re: /"jpg", "jpeg", "png", "webp"/g, n: 1 },
        ],
      },
      {
        file: "apps/client/src/services/api.ts",
        checks: [
          { kind: "present", re: /if \(!isAllowedMediaExt\(extSource, mediaKind\)\)/ },
          { kind: "absent", re: /"jpg", "jpeg", "png", "webp"/g },
        ],
      },
      {
        file: "apps/client/src/services/voice-upload.ts",
        checks: [{ kind: "present", re: /isAllowedMediaExt\(/ }],
      },
    ],
  },
  {
    /* MP-R2-CAMPUSPOST-010：这条一度被判"不成立"，理由是真模式配图上传整体关着、上传阶段抛不出来。
       ③ 的第①项（后端收 images）落地后那个前提反了，缺陷重新可达 —— 所以判点必须写死
       "上传失败在上传这一层被接住并给出专属文案"，否则下一次翻开关又会把它埋掉。 */
    id: "MP-R2-CAMPUSPOST-010",
    claim: "配图上传失败由上传这一层自己接住并给专属提示，不会落进发布的 catch 去显示上一次动作留下的陈旧 errorMessage",
    files: [
      {
        file: "apps/client/src/subpackages/campus/campus/post-topic.vue",
        checks: [
          { kind: "present", re: /try \{[\s\S]{0,60}for \(const img of images\.value\)/ },
          { kind: "present", re: /catch \(uploadErr\)/ },
          { kind: "present", re: /t\("campus\.postTopic\.uploadFailed"\)/ },
        ],
      },
      {
        file: "apps/client/src/i18n/locales/zh-CN.ts",
        checks: [{ kind: "present", re: /"uploadFailed":/ }],
      },
      {
        file: "apps/client/src/i18n/locales/en-US.ts",
        checks: [{ kind: "present", re: /uploadFailed:/ }],
      },
    ],
  },
  /* ↓ 帧债里唯一两条"点名就有判别力"的行（18 条候选逐个回盘核过，只有这两条的 token
     在基线 094f7239 里不存在 ⇒ 命中才等于本轮改动；其余 16 条的候选 token 基线里就有，
     拿它们当判点会把旧工作记成本轮成果，所以不立）。 */
  {
    id: "MP-R2VIS-PAGES-HOME-INDEX-004",
    claim: "首页「换一位」的刷新图标已从行内字符 ↻ 换成同族线性 SVG 资源（走 IMAGE_PATHS 常量 + resolveMediaUrl），旧字符写法不得残留",
    files: [
      {
        file: "apps/client/src/components/home/TodayRecommendationCard.vue",
        checks: [
          { kind: "present", re: /class="today-card__rotate-icon"/ },
          { kind: "present", re: /IMAGE_PATHS\.ICONS_COMMON\.REFRESH_SVG/ },
          { kind: "absent", re: /today-card__rotate">\s*↻/ },
        ],
      },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-001",
    claim: "IP 城市与坐标不同源（>100km 或量不出距离）时页面不再渲染该城市，改渲染「地址解析不可用」；阈值常量在工具层单一来源",
    files: [
      {
        file: "apps/client/src/utils/location.ts",
        checks: [
          { kind: "present", re: /export const CITY_COORD_MAX_KM\s*=\s*100/ },
          { kind: "present", re: /cityTrusted/ },
        ],
      },
      {
        file: "apps/client/src/subpackages/profile-extra/profile/location.vue",
        checks: [
          { kind: "present", re: /cityDistant/ },
          { kind: "present", re: /t\("locationPage\.addressUnavailable"\)/ },
        ],
      },
    ],
  },
  /* ── round-7 追加：两条原来挂着「待主编排层拍板」的台账行。裁决按"能写成谓词就别留人判"落，
     谓词先落盘再改源码 ⇒ 改之前这两条必须红（这才叫判点，不叫事后描述）。 ── */
  {
    id: "MP-R2-CIRCLES-INDEX-007",
    file: "apps/client/src/subpackages/circles/circles/index.vue",
    claim: "裁决：热门徽标底/字就近成对声明为页面局部变量并原值保留；不收编语义不同的 --c-badge-on-image-*（那是图上角标的深色底，收编会改观感），也不自造暗色令牌",
    checks: [
      { kind: "present", re: /--hot-badge-bg:\s*rgba\(255, 77, 92, 0\.92\)/ },
      { kind: "present", re: /--hot-badge-text:\s*#FFFFFF/ },
      { kind: "present", re: /background: var\(--hot-badge-bg\)/ },
      { kind: "present", re: /color: var\(--hot-badge-text\)/ },
      { kind: "absent", re: /background: rgba\(255, 77, 92/ },
    ],
  },
  {
    id: "MP-R2VIS-PAGES-PROFILE-INDEX-003",
    file: "apps/client/src/components/profile/mine/MyStory.vue",
    claim: "裁决：区块名保留「我的故事」，可见范围提示不再用第二个术语称呼同一批内容 ⇒ 同一区块内不得混用 故事/日常（原判据问『拍哪个词』是判不了的，改判『不许混用』）",
    checks: [
      { kind: "absent", re: /日常仅互相喜欢/ },
      { kind: "absent", re: /添加日常|我的日常/ },
      { kind: "present", re: /这些内容仅互相喜欢或你关注的人可见/ },
    ],
  },
  {
    id: "MP-R2VIS-SUBPACKAGES-VILLAGE-VILLAGE-DETAIL-001",
    file: "apps/client/src/subpackages/village/village/detail.vue",
    claim: "表情面板在场时正文底部预留必须把面板自身高度也算进去：吸底栏 140rpx + 面板 max-height 360rpx + 面板上下内距 24rpx，且该修饰类必须在 bar-expanded 之后声明（同属性后声明者胜出）",
    checks: [
      { kind: "present", re: /'detail-body--emoji-open':\s*emojiPanelVisible/ },
      { kind: "present", re: /padding-bottom: calc\(140rpx \+ 360rpx \+ 24rpx \+ env\(safe-area-inset-bottom\)\)/ },
      { kind: "countEq", re: /detail-body--emoji-open/g, n: 2 },
    ],
  },

  /* ══════════════════════════════════════════════════════════════════════════
     以下 7 条＝判据台（reports/audit/round-6/ops/**，判据正文一个字都没改）里
     class="A"（缺席断言）的行：round-7/criteria36-classification-v33.json。
     它们的 expected 判的是「某物不存在／不出现」，而用户裁定「一律按判据补齐实现」
     —— 对这 7 条，去把物件实现出来恰好让判据变红。所以只换载具：判据正文不动，
     把断言搬到能判的非帧载体上（源码级谓词＋配置级＋两档产物结构计数）。

     三条硬规矩（这一批自己加的，违反任何一条这条行就不许进表）：
       1. criteria:true ⇒ 不发台账补丁。判据台行（H13/N10/…）不是台账行（issue-matrix.md
          里 0 命中），而 scripts/qa/patch-ledger-cells.mjs:48 对「命中 0 行」是整份计划 die，
          所以把这些 id 混进 patches 会连累那 91 条本来能落的补丁一起失败。
       2. 每条都必须带 neg（命中注入负例）：把"该属性不存在"的物件真注进承载文本的内存副本，
          谓词必须变红。没注入成功、或注入后仍成立 ⇒ 这道门是恒绿的，直接判红。
          内存副本注入，绝不写 apps/client/**（两条车道正在改源码）。
       3. 每个承载层都得有一个「能变绿的正例锚点」（present / countEq n>0），否则「查不到」
          可能只是读到了空壳：产物档在构建期间会被整体重写。
     取数口径逐条写在 neg 的 marker 上；两档产物＝mp-weixin(mock) 与 mp-weixin-real(real)。
     ══════════════════════════════════════════════════════════════════════════ */
  {
    id: "MP-R7CRIT-PAGES-HOME-INDEX-H13",
    criteria: true, manifest: "PAGES-HOME-INDEX.json", caseId: "H13", page: "pages/home/index",
    claim: "判据断言的是「首页无搜索入口」这个缺席量：HomeHeader 只声明并对外挂 searchTap，模板里没有搜索物件＝死接线。补一枚搜索入口会让 expected 直接变红，故换源码级＋两档产物判点",
    bands: ["mock", "real"],
    files: [
      {
        file: "apps/client/src/components/home/HomeHeader.vue",
        checks: [
          { kind: "countEq", re: /\(e: "searchTap"\)/g, n: 1 },
          { kind: "absent", re: /\$emit\(\s*["']searchTap["']/g },
          { kind: "absent", re: /class="[^"]*header-search/g },
          { kind: "countEq", re: /role="button"/g, n: 3 },
        ],
      },
      {
        file: "apps/client/src/pages/home/index.vue",
        checks: [
          { kind: "countEq", re: /@searchTap="openNearbyList"/g, n: 1 },
          { kind: "absent", re: /class="[^"]*header-search/g },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin/components/home/HomeHeader.wxml",
        checks: [
          { kind: "absent", re: /header-search|搜索|放大镜|search/gi },
          { kind: "countEq", re: /header-icon|header-location|header-me/g, n: 7 },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin-real/components/home/HomeHeader.wxml",
        checks: [
          { kind: "absent", re: /header-search|搜索|放大镜|search/gi },
          { kind: "countEq", re: /header-icon|header-location|header-me/g, n: 7 },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin/pages/home/index.wxml",
        checks: [
          { kind: "countEq", re: /bindsearchTap/g, n: 1 },
          { kind: "absent", re: /class="[^"]*search[^"]*"/g },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin-real/pages/home/index.wxml",
        checks: [
          { kind: "countEq", re: /bindsearchTap/g, n: 1 },
          { kind: "absent", re: /class="[^"]*search[^"]*"/g },
        ],
      },
    ],
    neg: [
      { file: "apps/client/src/components/home/HomeHeader.vue", marker: '(e: "searchTap"): void', insertAfter: '，占位；实际发射：$emit("searchTap")' },
      { file: "apps/client/src/pages/home/index.vue", marker: '@searchTap="openNearbyList"', insertAfter: '\n        class="header-search"' },
      { file: "apps/client/dist/build/mp-weixin/components/home/HomeHeader.wxml", marker: '<view class="header-icon', insertBefore: '<view class="header-search" aria-label="搜索"></view><view class="header-icon' },
      { file: "apps/client/dist/build/mp-weixin-real/components/home/HomeHeader.wxml", marker: '<view class="header-icon', insertBefore: '<view class="header-search" aria-label="搜索"></view><view class="header-icon' },
      { file: "apps/client/dist/build/mp-weixin/pages/home/index.wxml", marker: 'bindsearchTap="{{c}}"', insertAfter: ' class="header-search"' },
      { file: "apps/client/dist/build/mp-weixin-real/pages/home/index.wxml", marker: 'bindsearchTap="{{c}}"', insertAfter: ' class="header-search"' },
    ],
  },
  {
    id: "MP-R7CRIT-PAGES-NEARBY-INDEX-N10",
    criteria: true, manifest: "PAGES-NEARBY-INDEX.json", caseId: "N10", page: "pages/nearby/index",
    claim: "判据断言「附近页无任何输入框（模板内无 <input>）」⇒ 正常/清空/超长/特殊字符四组输入用例不适用。给这页补输入框即反红，故换结构计数判点：源码模板＋两档产物各一条计数为 0，正例锚点是那枚「文案仍是搜索但不可输入」的按钮",
    bands: ["mock", "real"],
    files: [
      {
        file: "apps/client/src/pages/nearby/index.vue",
        checks: [
          { kind: "countTemplateEq", re: /<(input|textarea)[\s>]/g, n: 0 },
          { kind: "absent", re: /v-model/g },
          { kind: "countEq", re: /:aria-label="t\('nearby\.searchPlaceholder'\)"/g, n: 1 },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin/pages/nearby/index.wxml",
        checks: [
          { kind: "absent", re: /input|textarea/gi },
          { kind: "countEq", re: /nearby-home__search-btn/g, n: 1 },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin-real/pages/nearby/index.wxml",
        checks: [
          { kind: "absent", re: /input|textarea/gi },
          { kind: "countEq", re: /nearby-home__search-btn/g, n: 1 },
        ],
      },
    ],
    neg: [
      { file: "apps/client/src/pages/nearby/index.vue", marker: '<view class="nearby-home__actions">', insertAfter: '\n              <input v-model="kw" placeholder="搜索" />' },
      { file: "apps/client/dist/build/mp-weixin/pages/nearby/index.wxml", marker: '<view class="nearby-home__actions data-v-', insertBefore: '<input class="nearby-home__input" placeholder="搜索"/>' },
      { file: "apps/client/dist/build/mp-weixin-real/pages/nearby/index.wxml", marker: '<view class="nearby-home__actions data-v-', insertBefore: '<input class="nearby-home__input" placeholder="搜索"/>' },
    ],
  },
  {
    id: "MP-R7CRIT-SUBPACKAGES-CIRCLES-CIRCLES-INDEX-CI22",
    criteria: true, manifest: "SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json", caseId: "CI22", page: "subpackages/circles/circles/index",
    claim: "判据 pre「兴趣圈页条目无 style 配置」＋expected「不得出现伪刷新动画或未调用的 stopPullDownRefresh」都是否定命题。配置级用 pages.json 条目形状判，同文件 vip/bills 条目真配了 enablePullDownRefresh ⇒ 阳性对照证明这条判点会咬；源码级判刷新钩子零命中",
    bands: ["mock", "real"],
    files: [
      {
        file: "apps/client/src/pages.json",
        checks: [
          { kind: "countEq", re: /"path": "circles\/index"\s*\}/g, n: 1 },
          { kind: "absent", re: /"path":\s*"circles\/index"\s*,[^}]*enablePullDownRefresh/g },
          { kind: "present", re: /"path": "bills",\s*"style": \{\s*"enablePullDownRefresh": true/ },
        ],
      },
      {
        file: "apps/client/src/subpackages/circles/circles/index.vue",
        checks: [
          { kind: "absent", re: /onPullDownRefresh|stopPullDownRefresh/g },
          { kind: "absent", re: /refresher-enabled|refresherEnabled/g },
          { kind: "countEq", re: /circleStore\.circles\.length === 0/g, n: 1 },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin/subpackages/circles/circles/index.json",
        checks: [
          { kind: "absent", re: /enablePullDownRefresh/g },
          { kind: "present", re: /usingComponents/ },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin-real/subpackages/circles/circles/index.json",
        checks: [
          { kind: "absent", re: /enablePullDownRefresh/g },
          { kind: "present", re: /usingComponents/ },
        ],
      },
    ],
    neg: [
      { file: "apps/client/src/pages.json", marker: '"path": "circles/index"', insertAfter: ',\n            "style": {\n              "enablePullDownRefresh": true\n            }' },
      { file: "apps/client/src/pages.json", removeRe: /"path": "bills",\s*"style": \{\s*"enablePullDownRefresh": true\s*\}/ },
      { file: "apps/client/src/subpackages/circles/circles/index.vue", marker: 'onShow(() => {', insertBefore: 'async function onPullDownRefresh() { await circleStore.loadCircles(); }\n' },
      { file: "apps/client/dist/build/mp-weixin/subpackages/circles/circles/index.json", marker: '{\n  "usingComponents": {', insertAfter: '\n    "enablePullDownRefresh": true,' },
      { file: "apps/client/dist/build/mp-weixin-real/subpackages/circles/circles/index.json", marker: '{\n  "usingComponents": {', insertAfter: '\n    "enablePullDownRefresh": true,' },
    ],
  },
  {
    id: "MP-R7CRIT-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-MT21",
    criteria: true, manifest: "SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING.json", caseId: "MT21", page: "subpackages/discover-extra/discover/matching",
    claim: "整条 expected 全是否断言（无刷新动画/无 onPullDownRefresh/stopPullDownRefresh/零新增写请求）。配 enablePullDownRefresh 或加刷新按钮都会反红，且下拉一次就真触发一次匹配写请求＝本条要防的副作用。故配置级＋源码级＋产物档页级配置三段判；「零新增写请求」要网络计数刀，不在本载体",
    bands: ["mock", "real"],
    files: [
      {
        file: "apps/client/src/pages.json",
        checks: [
          { kind: "countEq", re: /"path": "discover\/matching"\s*\}/g, n: 1 },
          { kind: "countEq", re: /"path": "discover\/match-success"\s*\}/g, n: 1 },
          { kind: "absent", re: /"path":\s*"discover\/matching"\s*,[^}]*enablePullDownRefresh/g },
          { kind: "present", re: /"path": "bills",\s*"style": \{\s*"enablePullDownRefresh": true/ },
        ],
      },
      {
        file: "apps/client/src/subpackages/discover-extra/discover/matching.vue",
        checks: [
          { kind: "absent", re: /onPullDownRefresh|stopPullDownRefresh/g },
          { kind: "absent", re: /refresher-enabled|refresherEnabled/g },
          { kind: "present", re: /matchStore\.animationDone/ },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin/subpackages/discover-extra/discover/matching.json",
        checks: [
          { kind: "absent", re: /enablePullDownRefresh/g },
          { kind: "present", re: /usingComponents/ },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin-real/subpackages/discover-extra/discover/matching.json",
        checks: [
          { kind: "absent", re: /enablePullDownRefresh/g },
          { kind: "present", re: /usingComponents/ },
        ],
      },
    ],
    neg: [
      { file: "apps/client/src/pages.json", marker: '"path": "discover/matching"', insertAfter: ',\n            "style": {\n              "enablePullDownRefresh": true\n            }' },
      { file: "apps/client/src/pages.json", removeRe: /"path": "bills",\s*"style": \{\s*"enablePullDownRefresh": true\s*\}/ },
      { file: "apps/client/src/subpackages/discover-extra/discover/matching.vue", marker: 'onLoad((query) => {', insertBefore: 'async function onPullDownRefresh() { await matchStore.runMatchCheck(); uni.stopPullDownRefresh(); }\n' },
      { file: "apps/client/dist/build/mp-weixin/subpackages/discover-extra/discover/matching.json", marker: '{\n  "usingComponents": {', insertAfter: '\n    "enablePullDownRefresh": true,' },
      { file: "apps/client/dist/build/mp-weixin-real/subpackages/discover-extra/discover/matching.json", marker: '{\n  "usingComponents": {', insertAfter: '\n    "enablePullDownRefresh": true,' },
    ],
  },
  {
    id: "MP-R7CRIT-SUBPACKAGES-CHAT-CHAT-SESSION-INDEX-CS26",
    criteria: true, manifest: "SUBPACKAGES-CHAT-CHAT-SESSION-INDEX.json", caseId: "CS26", page: "subpackages/chat/chat-session/index",
    claim: "判据 expected「不得渲染『破冰引导＋空会话＋可用输入栏』」判的是互斥渲染：错误文案节点紧接 <template v-else>，整枚输入栏只活在 v-else 里 ⇒ pageErrorMessage 为真时输入栏结构性不可达。把输入栏搬出 v-else 即反红，故判「唯一一枚且在 else 块内」；产物档另判编译后的 <block wx:else> 同形",
    bands: ["mock", "real"],
    files: [
      {
        file: "apps/client/src/subpackages/chat/chat-session/index.vue",
        checks: [
          { kind: "countEq", re: /<view v-if="pageErrorMessage" class="meta-copy meta-copy--padded">\{\{ pageErrorMessage \}\}<\/view>\s*<template v-else>/g, n: 1 },
          { kind: "countEq", re: /<template v-else>(?:(?!<\/template>)[\s\S])*?class="wechat-input-bar__input"/g, n: 1 },
          { kind: "countEq", re: /class="wechat-input-bar__input"/g, n: 1 },
          { kind: "absent", re: /class="wechat-input-bar__input"[\s\S]{0,4000}v-if="pageErrorMessage"/g },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin/subpackages/chat/chat-session/index.wxml",
        checks: [
          { kind: "countEq", re: /class="meta-copy meta-copy--padded[^"]*">[\s\S]{0,60}<\/view><block wx:else>/g, n: 1 },
          { kind: "countEq", re: /<block wx:else>(?:(?!<\/block>)[\s\S])*?class="wechat-input-bar__input/g, n: 1 },
          { kind: "countEq", re: /<input[\s>]/g, n: 1 },
          { kind: "absent", re: /<textarea[\s>]/g },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin-real/subpackages/chat/chat-session/index.wxml",
        checks: [
          { kind: "countEq", re: /class="meta-copy meta-copy--padded[^"]*">[\s\S]{0,60}<\/view><block wx:else>/g, n: 1 },
          { kind: "countEq", re: /<block wx:else>(?:(?!<\/block>)[\s\S])*?class="wechat-input-bar__input/g, n: 1 },
          { kind: "countEq", re: /<input[\s>]/g, n: 1 },
          { kind: "absent", re: /<textarea[\s>]/g },
        ],
      },
    ],
    neg: [
      { file: "apps/client/src/subpackages/chat/chat-session/index.vue", marker: '<view class="chat-input-area"', insertAfter: ' v="x"><input class="wechat-input-bar__input" />' },
      { file: "apps/client/src/subpackages/chat/chat-session/index.vue", marker: '<template v-else>\n        <!-- 引用上下文卡片', insertBefore: '</template>' },
      { file: "apps/client/dist/build/mp-weixin/subpackages/chat/chat-session/index.wxml", marker: '<input cursor-spacing="20"', insertBefore: '<input class="leak" />' },
      { file: "apps/client/dist/build/mp-weixin/subpackages/chat/chat-session/index.wxml", marker: 'class="wechat-input-bar__input', insertBefore: '<input ' },
      { file: "apps/client/dist/build/mp-weixin-real/subpackages/chat/chat-session/index.wxml", marker: '<input cursor-spacing="20"', insertBefore: '<input class="leak" />' },
      { file: "apps/client/dist/build/mp-weixin-real/subpackages/chat/chat-session/index.wxml", marker: 'class="wechat-input-bar__input', insertBefore: '<input ' },
    ],
  },
  {
    id: "MP-R7CRIT-PAGES-PROFILE-INDEX-PFI41",
    criteria: true, manifest: "PAGES-PROFILE-INDEX.json", caseId: "PFI41", page: "pages/profile/index",
    claim: "判据 expected「本人主页主渲染树无任何输入框（无 v-model 输入元素）」⇒ 四组输入用例在本页不适用（这条存在的目的正是防执行员凭空造表单用例）。补输入框即反红，故换结构计数：源码模板＋两档产物各一条 0，正例锚点是判据点名的认证弹层",
    bands: ["mock", "real"],
    files: [
      {
        file: "apps/client/src/pages/profile/index.vue",
        checks: [
          { kind: "countTemplateEq", re: /<(input|textarea)[\s>]/g, n: 0 },
          { kind: "absent", re: /v-model/g },
          { kind: "present", re: /CertDetailSheet/ },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin/pages/profile/index.wxml",
        checks: [
          { kind: "absent", re: /input|textarea/gi },
          { kind: "countEq", re: /profile-shell/g, n: 2 },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin-real/pages/profile/index.wxml",
        checks: [
          { kind: "absent", re: /input|textarea/gi },
          { kind: "countEq", re: /profile-shell/g, n: 2 },
        ],
      },
    ],
    neg: [
      { file: "apps/client/src/pages/profile/index.vue", marker: '<ProfileShell', insertBefore: '<textarea v-model="bio" />' },
      { file: "apps/client/dist/build/mp-weixin/pages/profile/index.wxml", marker: '<profile-shell wx:if="{{c}}"', insertBefore: '<input class="profile-input" placeholder="签名"/>' },
      { file: "apps/client/dist/build/mp-weixin-real/pages/profile/index.wxml", marker: '<profile-shell wx:if="{{c}}"', insertBefore: '<input class="profile-input" placeholder="签名"/>' },
    ],
  },
  {
    id: "MP-R7CRIT-SUBPACKAGES-CAMPUS-CAMPUS-HUB-CH22",
    criteria: true, manifest: "SUBPACKAGES-CAMPUS-CAMPUS-HUB.json", caseId: "CH22", page: "subpackages/campus/campus/hub",
    claim: "本条只落「无展开箭头、无可点动作」这一半（MP-R1-CAMPUS-HUB-003 死元素已移除，不得回归出带箭头的可点假象）；补回箭头或可点「查看更多」即反红。⚠ src 的 HTML 注释里留着旧箭头字符，故箭头字符级缺席只能在产物档判；「滚到底完整可见＋scrollTop/scrollHeight 回填」那一半未落（见 NEG/RULING 说明）",
    bands: ["mock", "real"],
    needsRuling: "判据 ACTION 写「页级 window 滚动，非 scroll-view」，而 hub.vue:269-271 起列表包在 <scroll-view class=\"campus-hub__feed\"> 里、:334 才闭合 ⇒ 底部文案在 scroll-view 内不在 window 滚动流上；判据引用的 hub.vue:336-339 也已漂到 :330-332。两句冲突未裁，本行不预设任一解释。",
    files: [
      {
        file: "apps/client/src/subpackages/campus/campus/hub.vue",
        checks: [
          { kind: "countEq", re: /class="campus-hub__more-text"/g, n: 1 },
          { kind: "absent", re: /class="campus-hub__more["'][\s\S]{0,260}(?:@tap|bindtap|role="button")/g },
          { kind: "countTemplateEq", re: /campus-hub__more-arrow/g, n: 0 },
          { kind: "countTemplateEq", re: /class="campus-hub__feed"/g, n: 1 },
        ],
      },
      {
        file: "apps/client/src/i18n/locales/zh-CN.ts",
        checks: [
          { kind: "countEq", re: /"moreHint": "更多校园圈持续接入中"/g, n: 1 },
          { kind: "absent", re: /"moreHint": "[^"]*[⌄∨▼⌃]/g },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin/subpackages/campus/campus/hub.wxml",
        checks: [
          { kind: "countEq", re: /campus-hub__more-text/g, n: 1 },
          { kind: "absent", re: /⌄|campus-hub__more-arrow/g },
          { kind: "absent", re: /class="campus-hub__more[\s\S]{0,260}bindtap/g },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin-real/subpackages/campus/campus/hub.wxml",
        checks: [
          { kind: "countEq", re: /campus-hub__more-text/g, n: 1 },
          { kind: "absent", re: /⌄|campus-hub__more-arrow/g },
          { kind: "absent", re: /class="campus-hub__more[\s\S]{0,260}bindtap/g },
        ],
      },
    ],
    neg: [
      { file: "apps/client/src/subpackages/campus/campus/hub.vue", marker: '<view class="campus-hub__more">', insertAfter: '\n      <text class="campus-hub__more-arrow">⌄</text>' },
      { file: "apps/client/src/subpackages/campus/campus/hub.vue", marker: '<view class="campus-hub__more">', insertAfter: ' @tap="expandMore">' },
      { file: "apps/client/src/i18n/locales/zh-CN.ts", marker: '更多校园圈持续接入中', insertAfter: '⌄' },
      { file: "apps/client/dist/build/mp-weixin/subpackages/campus/campus/hub.wxml", marker: '<view class="campus-hub__more', insertAfter: ' bindtap="{{cm}}"><text class="campus-hub__more-arrow">⌄</text>' },
      { file: "apps/client/dist/build/mp-weixin-real/subpackages/campus/campus/hub.wxml", marker: '<view class="campus-hub__more', insertAfter: ' bindtap="{{cm}}"><text class="campus-hub__more-arrow">⌄</text>' },
    ],
  },
  {
    /* ══ LG31（判据台 round-7/ops/PAGES-LOGIN-INDEX.json，36 条 CRITERIA_NAMES_NOTHING 里唯一没去向的
       一条，class="D-unclear"）。判据正文一字不改：title「验证码长度边界（5/6/7 位，maxlength=6）」、
       action 点名 #login-sms-code、expected 引 index.vue:143「要求长度恰为 6」。
       这三句指的物件都被 MP-R2-PAGES-LOGIN-INDEX-015 整删了（:748-750 删除自证、:1221 .sms-send-btn*
       死样式已删、:131-132 canPhoneRegister 随之内删），照字面"补物件"＝逆转一条已定案的修复
       （注册唯一入口改为 pages/register/index）。所以按裁定只换载具 ⇒ 源码级＋两档产物判点。
       逐条实测过的行号（写判点前量的，不是抄判据里那些已漂移的 :143 / :857）：
         · login-sms-code：apps/client/src 全树 0、两档 login wxml 各 0 ⇒ 判据点名的节点确实不存在。
         · 幸存输入框各恰一枚：src :714 id="login-phone"、:736 id="login-password"（各 1），
           两档 wxml 也各 1；登录页唯一带截断的输入框是 maxlength="11"（:717）⇒ 正例锚点用它。
         · 「六位」在盘上是真谓词，只是搬了家：
             登录页 :129 isCodeValid = password.value.length >= 6 && <= 64（:130 canPhoneLogin 消费，
               :368-370 不过就 toast login.phoneAndCodeInvalid 后 return ⇒ 判据「5 位不放行、0 请求」的现役形态）
             注册页 :563 maxlength="6"、:177 .replace(/\D/g, "").slice(0, 6)、:153/:237 /^\d{6}$/.test(smsCode.value)
               ⇒ 判据「7 位截为 6 位」「不得污染成非数字」「恰为 6」三条真身都在注册页（LG29/LG30/LG31 一族同此）。
       ⚠ phoneRegisterMode 不能判 absent：它活在 :748 的 HTML 注释里，而 stripComments 只剥行注释与块注释，
          HTML 注释原样进 src ⇒ 判 absent 就是恒红门。sms-send-btn(:1221 块注释) 与 canPhoneRegister(:131 行注释)
          剥注释后各 0 命中，所以那两条 absent 判得动（已实测）。 */
    id: "MP-R7CRIT-PAGES-LOGIN-INDEX-LG31",
    criteria: true, manifest: "PAGES-LOGIN-INDEX.json", caseId: "LG31", page: "pages/login/index",
    bands: ["mock", "real"],
    claim: "判据点名的 #login-sms-code 已被 015 整删（补回来就是逆转已定案修复）⇒ 帧侧永远等不到这个节点；LG31 判决真正依赖的三件事实换源码级＋两档产物载具：登录页零 login-sms-code/sms-send-btn/canPhoneRegister、幸存两枚输入框各恰一枚、六位约束在盘上确为真谓词（登录页 :129 >=6&&<=64；注册页 maxlength=6＋.slice(0, 6) 截断＋两处 /^\\d{6}$/ 恰为六位）。判据正文与页归属都不许改",
    files: [
      {
        file: "apps/client/src/pages/login/index.vue",
        checks: [
          { kind: "absent", re: /login-sms-code/g },
          { kind: "absent", re: /sms-send-btn/g },
          { kind: "absent", re: /\bcanPhoneRegister\b/g },
          { kind: "countEq", re: /id="login-phone"/g, n: 1 },
          { kind: "countEq", re: /id="login-password"/g, n: 1 },
          { kind: "countTemplateEq", re: /maxlength="6"/g, n: 0 },
          { kind: "countTemplateEq", re: /maxlength="11"/g, n: 1 },
          { kind: "present", re: /const isCodeValid = computed\(\(\) => password\.value\.length >= 6 && password\.value\.length <= 64\)/ },
          { kind: "present", re: /const canPhoneLogin = computed\(\(\) => isPhoneValid\.value && isCodeValid\.value && agreed\.value\)/ },
          { kind: "countEq", re: /t\("login\.phoneAndCodeInvalid"\)/g, n: 1 },
        ],
      },
      {
        file: "apps/client/src/pages/register/index.vue",
        checks: [
          { kind: "countTemplateEq", re: /:value="smsCode"/g, n: 1 },
          { kind: "countTemplateEq", re: /maxlength="6"/g, n: 1 },
          { kind: "countTemplateEq", re: /class="sms-btn"/g, n: 1 },
          { kind: "countEq", re: /\.test\(smsCode\.value\)/g, n: 2 },
          { kind: "countEq", re: /\.slice\(0, 6\)/g, n: 1 },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin/pages/login/index.wxml",
        checks: [
          { kind: "absent", re: /login-sms-code/g },
          { kind: "countEq", re: /id="login-phone"/g, n: 1 },
          { kind: "countEq", re: /id="login-password"/g, n: 1 },
          { kind: "countEq", re: /maxlength="11"/g, n: 1 },
        ],
      },
      {
        file: "apps/client/dist/build/mp-weixin-real/pages/login/index.wxml",
        checks: [
          { kind: "absent", re: /login-sms-code/g },
          { kind: "countEq", re: /id="login-phone"/g, n: 1 },
          { kind: "countEq", re: /id="login-password"/g, n: 1 },
          { kind: "countEq", re: /maxlength="11"/g, n: 1 },
        ],
      },
    ],
    /* 负例：9 处命中注入，全部只在内存里做（apps/client/** 与产物一个字节都不写）。
       ① 把 015 删掉的验证码框原样复活＝判据字面"补物件"的形状，必须红；
       ② 幸存两枚 id 复制成一枚半＝溯源锚点漂了，必须红；
       ③ 摘掉六位谓词/toast 分支＝"5 位也放行"，必须红；
       ④ 注册页把"恰为 6"放宽成"5 位也收"或摘掉截断，必须红；
       ⑤ 两档产物各注一次，缺一档就是"只验了 mock"。 */
    neg: [
      { file: "apps/client/src/pages/login/index.vue", marker: '<view class="form-btns">', insertBefore: '<input id="login-sms-code" maxlength="6" />' },
      { file: "apps/client/src/pages/login/index.vue", marker: 'id="login-phone"', insertAfter: '\n                id="login-password"' },
      { file: "apps/client/src/pages/login/index.vue", removeRe: /const isCodeValid = computed[^\n]*\n/ },
      { file: "apps/client/src/pages/login/index.vue", removeRe: /t\("login\.phoneAndCodeInvalid"\)/ },
      { file: "apps/client/src/pages/register/index.vue", removeRe: /maxlength="6"/ },
      { file: "apps/client/src/pages/register/index.vue", removeRe: /\.slice\(0, 6\)/ },
      { file: "apps/client/src/pages/register/index.vue", marker: '  /^\\d{6}$/.test(smsCode.value) &&', insertAfter: '\n  /^\\d{5}$/.test(smsCode.value) &&' },
      { file: "apps/client/dist/build/mp-weixin/pages/login/index.wxml", marker: 'id="login-phone"', insertBefore: '<input id="login-sms-code" maxlength="6"/>' },
      { file: "apps/client/dist/build/mp-weixin-real/pages/login/index.wxml", marker: 'id="login-phone"', insertBefore: '<input id="login-sms-code" maxlength="6"/>' },
    ],
  },
];

/* 剥注释：禁用的写法只出现在注释里（说明"这里原来是怎么写的"）不算违反。
   不剥就会把 5 条已修好的行读成没修——那是反向的假红。

   ⚠ 必须先归一 CRLF：`.` 不匹配 `\r`，而 `$`（无 m 修饰）只在整个串末尾成立，
   所以 `/\/\/.*$/` 在 Windows 行尾带 `\r` 的文件上**整行都匹配不到**，
   注释里的 `.catch(() => {})` 会被当成活代码（本轮实测：MP-R2-VILLAGE-INDEX-010 因此被误判未修）。 */
function stripComments(src) {
  const norm = src.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  /* 单遍扫描：字符串字面量与注释在同一个 alternation 里竞争，谁先出现取谁。
     旧写法先无脑删「块注释」，于是**字符串里的星斜杠组合会被当成注释开头**——
     实测 publish.vue 的 ["/*、http://usr/", …]（一条误判防护清单）让匹配一路吞到
     17KB 之外的第一个收尾组合，整段模板被"剥"没了：14 个 hover-class 属性在剥完的文本里剩 0 个，
     任何指向模板的判点都会假失败（反之，若判点想证明"某写法已消失"，它就成了假通过）。
     判点载体本身必须可信，否则它量到的是我的解析器，不是产品。 */
  return norm.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g,
    (m) => (m.startsWith("//") || m.startsWith("/*") ? " " : m));
}
function templateOf(src) {
  const a = src.indexOf("<template"), b = src.lastIndexOf("</template>");
  return a >= 0 && b > a ? stripComments(src.slice(a, b)) : "";
}
/* 命中注入：把"该物件不存在"的那件物件真塞进承载文本，用来证明谓词会咬（不是恒绿门）。
   ⚠ 只在内存里做，绝不写盘：apps/client/** 正被两条车道改着。
   marker 必须在承载文本里**唯一**，否则注入点会漂、负例就成了碰运气。
   两种注法：
     insertBefore / insertAfter —— 在唯一 marker 旁边插入一段"回归后的物件"；
     removeRe —— 删掉**恰好匹配一次**的正则命中，用来打阳性对照（把真配了该属性那条配置摘掉，
                 对照判点必须跟着红；否则"对照"本身也是恒真的，整条判据仍然没被证明会咬）。 */
function inject(raw, n) {
  if (n.removeRe) {
    const hits = raw.match(n.removeRe) || [];
    if (!hits.length) return { why: "阳性对照的 removeRe 在承载文本里 0 命中（对照已经过期了）：" + String(n.removeRe).slice(0, 60) };
    if (hits.length > 1) return { why: "阳性对照的 removeRe 命中 " + hits.length + " 次，摘哪一次都不许猜" };
    return { text: raw.replace(n.removeRe, ""), removed: hits[0].slice(0, 60) };
  }
  const first = raw.indexOf(n.marker);
  if (first < 0) return { why: "负例锚点不在承载文本里（判点写的形状与盘上脱钩了）：" + n.marker.slice(0, 60) };
  if (raw.indexOf(n.marker, first + 1) >= 0) return { why: "负例锚点在承载文本里不唯一，注入点会漂：" + n.marker.slice(0, 60) };
  const piece = n.insertBefore || n.insertAfter || "";
  if (!piece) return { why: "负例既没 insertBefore/insertAfter 也没 removeRe ⇒ 什么都没注入" };
  const at = n.insertBefore ? first : first + n.marker.length;
  return { text: raw.slice(0, at) + piece + raw.slice(at), inserted: piece.slice(0, 60) };
}
/** 一条谓词跑一个文件。fileExists 是唯一不看内容、只看"在不在盘上"的判点类型
    （图标/素材这类"引用了但不存在"的判据本来就是存在性命题，不是文本命题）。
    rawOverride 只给负例注入用：同一条谓词、同一个取数管道，把承载文本换成"注入命中后的内存副本"，
    绝不写盘 ⇒ apps/client/** 一个字节都不动（两条车道正在改源码，判点不许踩别人的盘）。 */
function runChecks(fileRel, checks, rawOverride) {
  let raw = rawOverride;
  if (raw === undefined) {
    const f = resolve(REPO, fileRel);
    if (!existsSync(f)) return "承载文件不存在 " + fileRel;
    raw = readFileSync(f, "utf8");
  }
  const src = stripComments(raw);
  const tpl = templateOf(raw);
  const lines = src.split("\n");
  let importHeadLine = -1;
  for (let i = 0; i < lines.length; i++) { const m = lines[i].match(checks.find((c) => c.kind === "importHead")?.re || /$^/); if (m) { importHeadLine = i + 1; break; } }
  for (const c of checks) {
    if (c.kind === "fileExists") {
      const p = resolve(REPO, c.path);
      if (!existsSync(p)) return "要求的文件不在盘上：" + c.path;
      if (!statSyncSize(p)) return "文件在盘上但是 0 字节：" + c.path;
    } else if (c.kind === "absent") { const m = src.match(c.re); if (m) return "禁用写法仍在：" + String(m[0]).slice(0, 40); }
    else if (c.kind === "present") { if (!c.re.test(src)) return "要求的写法查不到：" + String(c.re).slice(0, 46); }
    else if (c.kind === "countEq") { const n = (src.match(c.re) || []).length; if (n !== c.n) return "计数应为 " + c.n + "，实测 " + n + "（" + String(c.re).slice(0, 40) + "）"; }
    else if (c.kind === "countTemplateEq") { const n = (tpl.match(c.re) || []).length; if (n !== c.n) return "<template> 内计数应为 " + c.n + "，实测 " + n; }
    else if (c.kind === "importHead") {
      const firstCode = lines.findIndex((l) => l.trim() && !/^\s*(\/\/|\/\*|\*)/.test(l)) + 1;
      if (importHeadLine < 0) return "找不到该 import";
      if (importHeadLine > firstCode + 40) return "import 仍在脚本中段（行 " + importHeadLine + "）";
    } else return "未知的判点类型 " + c.kind + "（写错了不许当通过）";
  }
  return null;
}
function statSyncSize(p) { try { return statSync(p).size > 0; } catch { return false; } }
/** 整条判点跑一遍：多承载文件逐条跑，任一不过整条不过。overrideFile/overrideText 供负例注入。 */
function runRow(s, overrideFile, overrideText) {
  const targets = s.files ? s.files : [{ file: s.file, checks: s.checks }];
  for (const t of targets) {
    const r = t.file === overrideFile ? runChecks(t.file, t.checks, overrideText) : runChecks(t.file, t.checks);
    if (r) return { where: t.file, why: r };
  }
  return null;
}
export { SPEC, stripComments, templateOf, inject, runChecks, runRow, REPO };
export const CRIT_ROWS = SPEC.filter((s) => s.criteria);
/* 只在被当模块 import 时短路：库模式必须由 import 方**显式**声明（QA_SHAPE_LIB=1），
   不靠"argv[1 是不是本文件"去猜——猜错就会退化成"不跑 CLI、不输出、exit 0"的哑门，
   那是最坏的失败形状（本车道实测过一次：自测件把变量带进了子进程 env，门整个空跑还报 0）。
   作为脚本跑时（emit-round-report / rerun-round7-slices / run-final-verify 都是 spawn 本文件）
   没有这个环境变量 ⇒ 照旧跑完整 CLI。 */
const IS_CLI = !process.env.QA_SHAPE_LIB;
if (!IS_CLI) { /* library 模式：只导出引擎，不出判决 */ }
else {

/* ── --spec-extra <file>：把外部 JSON 里的判点临时并进 SPEC，用**同一个** CLI 出判决。
   只给负例（注入命中的 fixture 副本）用：缺席断言要能变红，而"能变红"必须在真门的
   真退出码上验一次，不能只在自测件里自己跟自己说红。
   安全：用了它就必须是 dry —— 注入的判点永远不许打进 cellplan-source-shape.json。 */
if (SPEC_EXTRA) {
  let extra;
  try { extra = JSON.parse(readFileSync(resolve(REPO, SPEC_EXTRA), "utf8")); }
  catch (e) {
    console.log("SRC_SHAPE_RESULT=FAIL reason=--spec-extra 指过去的文件读不到/不是 JSON（" + SPEC_EXTRA + "：" + e.code + "）⇒ 空注入不许当成跑了");
    process.exit(2);
  }
  const rows = Array.isArray(extra) ? extra : extra.rows;
  if (!Array.isArray(rows) || !rows.length) {
    console.log("SRC_SHAPE_RESULT=FAIL reason=--spec-extra 指过去却读不到 rows（空注入不许当跑了）");
    process.exit(2);
  }
  let rehydrated = 0;
  const toRe = (v) => {
    if (typeof v !== "string") return v;
    const m = v.match(/^\/([\s\S]*)\/([a-z]*)$/);
    if (!m) { console.log("SRC_SHAPE_RESULT=FAIL reason=--spec-extra 里的正则不是 /x/flags 形态：" + String(v).slice(0, 60)); process.exit(2); }
    rehydrated++;
    return new RegExp(m[1], m[2]);
  };
  for (const r of rows) {
    r.criteria = true;                       // 注入行一律按判据台行记 ⇒ 不发台账补丁
    const ts = r.files || (r.file ? [{ file: r.file, checks: r.checks }] : []);
    for (const t of ts) {
      for (const c of (t.checks || [])) if (typeof c.re === "string") c.re = toRe(c.re);
    }
    for (const ng of (r.neg || [])) if (typeof ng.removeRe === "string") ng.removeRe = toRe(ng.removeRe);
    SPEC.push(r);
  }
  DRY = true;
  console.log("SRC_SHAPE_NOTE --spec-extra=" + SPEC_EXTRA + " 注入判点=" + rows.length + " 条（re 还原 " + rehydrated + " 个）⇒ 本次强制 --dry，不打进 cellplan");
}

/* 载体完整性：真档构建期间 scripts/strip-mock-for-mp.mjs 会把 en-US.ts 临时换成
   "export default {}"（实测 19:14:13Z→19:15:59Z，窗口 106s），这期间跑判点会读到假空文件，
   把两条本来成立的 locale 判点读成"写法查不到"的假红——与本轮"锁屏帧读成 absent"同一类：
   量到的是构建过程，不是产品。所以先验文件大小，异常就拒绝出判决。 */
for (const p of ["apps/client/src/i18n/locales/en-US.ts", "apps/client/src/i18n/locales/zh-CN.ts"]) {
  const abs = resolve(REPO, p);
  if (!existsSync(abs)) continue;
  const sz = statSync(abs).size;
  if (sz < 20000) {
    console.log("SRC_SHAPE_RESULT=FAIL reason=承载文件疑似被构建脚本临时改写（" + p + " 只有 " + sz + "B；"
      + "真档构建的 strip-mock-for-mp 会在这百余秒里把它换成空壳）⇒ 等构建结束再跑，不在 flux 上出判决");
    process.exit(2);
  }
}
/* 同一形状的 flux 门，第二条车道正在改的那 5 个页面 + 体积刀改过的引用点都可能在构建里：
   缺席判点的两档产物（mock / real）一旦被构建脚本清空或写成半截，absent 会"读成成立"＝假绿。
   所以判点开跑前先验：档目录在不在、每条判据点名的产物文件在不在且非 0 字节。缺就拒绝出判决。 */
{
  const BANDS = { mock: "apps/client/dist/build/mp-weixin", real: "apps/client/dist/build/mp-weixin-real" };
  const missing = [];
  for (const [band, root] of Object.entries(BANDS)) {
    if (!existsSync(resolve(REPO, root))) missing.push(band + " 整档不在盘上（" + root + "）");
  }
  for (const s of SPEC.filter((x) => x.criteria)) {
    for (const t of (s.files || [{ file: s.file }])) {
      if (!/\/dist\/build\//.test(t.file)) continue;
      const p = resolve(REPO, t.file);
      if (!existsSync(p)) missing.push(s.caseId + " 产物承载文件不在盘上：" + t.file);
      else if (!statSyncSize(p)) missing.push(s.caseId + " 产物承载文件是 0 字节：" + t.file);
    }
  }
  if (missing.length) {
    console.log("SRC_SHAPE_RESULT=FAIL reason=产物档处于构建 flux（" + missing.length + " 项）⇒ 不在 flux 上出判决");
    for (const m of missing.slice(0, 8)) console.log("  ✗ " + m);
    process.exit(2);
  }
}
const results = [];

for (const s of SPEC) {
  /* 一条判据可以横跨几个文件（"home 与 nearby 都要标注 IP 推断城市"）。
     这种情况写成 files: [{file, checks}]，逐文件跑，任一不过整条不过——
     不能只核一个文件就给整条绿灯。 */
  const targets = s.files ? s.files : [{ file: s.file, checks: s.checks }];
  const bad = runRow(s);
  /* 承载列必须**全部**谓词都过时也写得出文件名。原来这里取 s.file，而多文件判点没有 s.file，
     只有失败分支才会把 where 换成真文件 —— 于是 50 条判点里 14 条往台账写成「承载 undefined」，
     恰好是最需要溯源的那 14 条（跨文件命题）。 */
  const carriers = targets.map((t) => t.file);
  results.push({
    id: s.id, file: bad ? bad.where : carriers.join(" ＋ "), files: carriers, ok: !bad, why: bad ? bad.where + " :: " + bad.why : "", claim: s.claim,
    criteria: !!s.criteria, manifest: s.manifest || "", caseId: s.caseId || "", page: s.page || "",
    bands: s.bands || [], needsRuling: s.needsRuling || "",
  });
}

const pass = results.filter((r) => r.ok);
const fail = results.filter((r) => !r.ok);
/* 判据台行（criteria:true）一律不进 patches：H13/N10/… 这些 id 在 issue-matrix.md 里 0 命中，
   而 patch-ledger-cells.mjs:48 是「命中 ≠ 1 行 ⇒ 整份计划 die」——混进去会把另外 91 条能落的
   补丁一起打死。判据台行的落点由判据台侧（apply-ops-cellplans.mjs）自己接，本门只出判决。 */
const ledgerPass = pass.filter((r) => !r.criteria);
const critRows = results.filter((r) => r.criteria);
const patches = ledgerPass.map((r) => ({
  id: r.id, col: 6, new: "已修复（源码级判点：判据是代码结构命题，帧与像素两侧都取不到该量；谓词见 statusEvidence，可重跑 verify-source-shape.mjs 复现）",
  why: "不借帧的名义给绿，也不再挂着待修复",
})).concat(ledgerPass.map((r) => ({ id: r.id, col: 9, new: ("源码判点：" + r.claim + " ｜承载 " + r.file).replace(/\|/g, "／").slice(0, 220), why: "写明这条是靠哪个谓词成立的" })));

/* 补丁文字里出现 "undefined" 就是载具在撒谎：台账会把「承载 undefined」当成溯源写进去。
   这类形状（字段没解析出来却照原样拼进权威件）本轮已经付过一次学费，所以直接判红而不是容忍。 */
const lying = patches.filter((p) => /\bundefined\b/.test(String(p.new)));
if (lying.length) {
  console.log("SRC_SHAPE_RESULT=FAIL reason=补丁文字里出现 undefined（字段没解析出来，台账会写进空溯源）：" + lying.length + " 条");
  for (const p of lying.slice(0, 8)) console.log("  ✗ " + p.id + " col" + p.col + " :: " + String(p.new).slice(0, 140));
  process.exit(2);
}

/* ── 负例注入：缺席断言的「必须能变红」检验 ─────────────────────────────────
   缺席判据最容易长成恒绿门：物件本来就不在，谓词永远成立，产品真回归了也不会红。
   所以每条 criteria 行都带 neg：把那件"不该存在的物件"注进承载文本的**内存副本**
   （marker 必须唯一 ⇒ 注入点确定），同一条谓词、同一个取数管道重跑整条判点，必须判不成立。
     · 注入没落地（marker 不在盘上 / 不唯一 / 没给注入内容）⇒ 判红：负例是空的
     · 注入后整条仍然成立 ⇒ 判红：这道门咬不动，就是恒绿门
   ⚠ 全程只在内存里做，apps/client/** 与产物一个字节都不写（两条车道正在改源码，
      而本项目在册教训是"产物里查不到不等于运行时不存在"，反过来注入也不能靠改产物做）。 */
const critSpec = SPEC.filter((x) => x.criteria);
const negRows = [];
for (const s of critSpec) {
  const targets = s.files || [{ file: s.file, checks: s.checks }];
  const per = [];
  for (const ng of (s.neg || [])) {
    if (!targets.some((t) => t.file === ng.file)) { per.push({ file: ng.file, status: "BAD_INJECT", why: "neg 点名的承载文件不在本条判点里" }); continue; }
    let base = null;
    try { base = readFileSync(resolve(REPO, ng.file), "utf8"); } catch { per.push({ file: ng.file, status: "BAD_INJECT", why: "承载文件读不到" }); continue; }
    const inj = inject(base, ng);
    if (inj.why) { per.push({ file: ng.file, status: "BAD_INJECT", why: inj.why }); continue; }
    const after = runRow(s, ng.file, inj.text);
    per.push({
      file: ng.file,
      status: after ? "RED" : "VACUOUS",
      grew: inj.text.length - base.length,
      why: after ? after.where + " :: " + after.why : "注入命中后整条判点仍然成立 ⇒ 恒绿门",
    });
  }
  negRows.push({ id: s.id, caseId: s.caseId, manifest: s.manifest, declared: (s.neg || []).length, rows: per });
}
const noNeg = critSpec.filter((s) => !(s.neg || []).length).map((s) => s.caseId);
const negBad = negRows.flatMap((r) => r.rows.filter((n) => n.status !== "RED").map((n) => r.caseId + " :: " + n.file + " :: " + n.status + " :: " + n.why));
const negRed = negRows.reduce((a, r) => a + r.rows.filter((n) => n.status === "RED").length, 0);
const negTotal = negRows.reduce((a, r) => a + r.rows.length, 0);

if (!DRY) writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString(), source: "verify-source-shape.mjs",
  passed: pass.length, failed: fail.length, patches,
  /* 判据台行的判决单独放这里（不进 patches ⇒ patch-ledger-cells 不会被 0 命中的 id 打死），
     判据台侧要盖章时从 criteriaRows 取 manifest+caseId，负例读数一并留痕。 */
  criteriaRows: critRows.map((r) => ({
    id: r.id, manifest: r.manifest, caseId: r.caseId, page: r.page, ok: r.ok, why: r.why,
    carrier: r.files, bands: r.bands, needsRuling: r.needsRuling, claim: r.claim,
    neg: (negRows.find((n) => n.id === r.id) || { rows: [] }).rows,
  })),
}, null, 1));

/* 判点条数要能说清"唯一判点"有几个：复算发现表里存在同一 id 多条（重复会让 total 虚高，
   而"88 条判点成立"这句话读起来像 88 个不同的判决）。这里只打印 + 带 --strict-dup 才否决，
   因为去重本身要逐条判"是同一条写了两遍，还是两个不同判点共用了一个 id"。 */
{
  const idCount = new Map();
  let noId = 0;
  for (const r of results) {
    const k = String(r.id || (r.spec && r.spec.id) || "").trim();
    if (!k) { noId++; continue; }
    idCount.set(k, (idCount.get(k) || 0) + 1);
  }
  const dups = [...idCount].filter(([, v]) => v > 1);
  console.log(`SRC_SHAPE_DUP 条目=${results.length} 带id=${results.length - noId} 无id=${noId} 唯一id=${idCount.size} 重复=${dups.length}` + (dups.length ? `（${dups.map(([k, v]) => k + "×" + v).slice(0, 8).join(" ")}）` : ""));
  if (!idCount.size) console.log("SRC_SHAPE_DUP_WARN 一条 id 都没读到 ⇒ 这条去重检查其实是空跑，别把 重复=0 读成没有重复");
  if (dups.length && process.argv.includes("--strict-dup")) {
    console.log("SRC_SHAPE_RESULT=FAIL reason=同一 id 挂了多条判点 ⇒ total 与\"判点数\"不是一回事，须先逐条判是同一条写了两遍还是两个判点共用一个 id");
    process.exit(1);
  }
}
console.log("SRC_SHAPE total=" + results.length + " 成立=" + pass.length + " 不成立=" + fail.length + " 补丁=" + patches.length +
  "（守恒：" + (pass.length + fail.length === results.length ? "yes" : "NO") + "）");
console.log("SRC_SHAPE_CRIT 判据台行=" + critRows.length + " 成立=" + critRows.filter((r) => r.ok).length +
  " 不成立=" + critRows.filter((r) => !r.ok).length + " 未裁半句=" + critRows.filter((r) => r.needsRuling).length);
/* 判据台行（H13/N10/…）不是台账行：patch-ledger-cells.mjs:48 对「命中 0 行」是整份计划 die，
   所以这些 id 只要漏进 patches，就会连累另外 91 条本来能落的补丁一起失败。这里当场判红。 */
const leaked = patches.filter((p) => critRows.some((c) => c.id === p.id));
if (leaked.length) {
  console.log("SRC_SHAPE_RESULT=FAIL reason=判据台行的 id 漏进了台账补丁（会把整份 cellplan 打死）：" + leaked.map((p) => p.id).slice(0, 6).join(" "));
  process.exit(2);
}

console.log("SRC_SHAPE_NEG 注入点=" + negTotal + " 已变红=" + negRed + " 咬不动=" + (negTotal - negRed) + " 没挂负例的判据行=" + noNeg.length + (noNeg.length ? "（" + noNeg.join(" ") + "）" : ""));
for (const r of fail) console.log("SHAPE_FAIL " + r.id + " :: " + r.why);
for (const b of negBad) console.log("SHAPE_NEG_VACUOUS " + b);
/* 退出码分档：守恒破了 / 判据台行不成立 / 负例咬不动（恒绿门）都要出非 0。
   台账行不过仍走原来的 PARTIAL＋exit 0 —— 那是别的车道在读的既有语义，今天不动它。 */
const critFail = fail.filter((r) => r.criteria);
if (pass.length + fail.length !== results.length) {
  console.log("SRC_SHAPE_RESULT=FAIL reason=守恒破了（成立+不成立 ≠ 条目数）");
  process.exit(2);
}
if (critFail.length) {
  console.log("SRC_SHAPE_RESULT=FAIL reason=判据台缺席判点不成立（" + critFail.length + " 条：" + critFail.map((r) => r.caseId).join(" ") + "）⇒ 被断言缺席的物件回到了盘上");
  process.exit(1);
}
if (noNeg.length || negBad.length) {
  console.log("SRC_SHAPE_RESULT=FAIL reason=缺席判据的负例不成立（恒绿门形状：注入命中后谓词仍成立，或压根没挂负例）⇒ 判据行=" + (noNeg.length + negBad.length) + " 处");
  process.exit(1);
}
console.log("SRC_SHAPE_RESULT=" + (fail.length ? "PARTIAL（有台账判点不过，不过的那几条不落账）" : "OK"));
process.exit(0);
} /* ← if (IS_CLI) 的收尾：library 模式（被自测件 import）只导出引擎，不出判决也不退出 */


