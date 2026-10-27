/**
 * 图片资源路径配置
 * 集中管理所有静态图片路径，统一修改入口
 *
 * 实际文件位于 src/static/assets/ 目录下，构建后映射到 /static/assets/。
 * 以下路径与磁盘文件一一对应，修改时请同步检查文件是否存在。
 *
 * 使用方式：import { IMAGE_PATHS } from "@/config/images";
 * 禁止在页面/组件中硬编码 "/static/assets/..." 字符串。
 *
 * 相关文件（infra R2-00137）：
 * - config/assets-index.ts 为 scripts/media-gen/generate.ts 的生成产物
 *   （指向 /static/generated/**），与手工维护的本文件职责不同；
 *   业务代码统一走本文件，生成素材按需引用 assets-index。
 */
/**
 * 2026-08-29 真机 2MB 门禁（主包素材全量迁后端）：
 * real 模式下基址直出后端 app-assets（免登录端点），
 * 全站 IMAGE_PATHS 常量自动指向后端托管资源；dev/mock 仍为 /static 本地包内路径。
 *
 * 2026-10-19 R6/L01（体积下不来的根因收口）：**不再按「整包 assets/images 一刀切」**。
 * 哪个目录能出后端，唯一判据是 `apps/client/config/cdn-buckets.json` 的 `cdnPrefixes`
 * —— 与 utils/media.ts 运行时改写、与构建期 prepare-static/prune-unreferenced-static
 * 读的是同一份清单。于是：
 *   - 命中 cdnPrefixes 的目录在 real 档直出后端 URL，构建期不随主包发布。清单自 3af02dd4
 *     （发布链第一次整条跑通、主包 1.54MB/2.00MB、12.66MB 素材改由后端托管）起是 10 桶：
 *     `static/generated/`、**`static/assets/images/`（整目录，含 mascot/activities/products/
 *     banners/register/match/home-split 等旧「未登记」目录）**、`static/assets/message/`、
 *     `static/assets/icons/{home,match,v2,emoji,login,social,nearby}/`；
 *   - 命中 localPrefixes 的目录（assets/icons/{tabbar,register,common}/、assets/svg-spec/）恒为
 *     包内 `/static/...`，real 档也不出后端（221 个图标共 771,964B，包内一定有一份，指后端只是白拿网络依赖）；
 *   - 两个清单都没登记的目录（`assets/icons/` 根、`assets/profile/`、audio、default-avatar…）
 *     按契约「否则留包内」，real 档也是 `/static/...`。
 * 判据仍是这一份清单，只是桶位从 6 个扩到 10 个：**改清单必须同时改这里的枚举**，
 * 否则下一次有人照本段注释写「mascot 未登记 ⇒ 留包内」就又红了（2026-10-21 media.spec 三红的根因）。
 * 这样同一张图不可能既被判为包内、又被直出成 URL、再被 media.ts 反写回 /static（旧三条分支
 * 互不认账时正是这么漏的）。非 real 档（mock/dev/showcase/H5）三个分支都不触发，逐字保持 /static。
 */
import cdnBuckets from "../../config/cdn-buckets.json";

const APP_ASSETS_ENDPOINT = "/api/v1/media/app-assets";
/** real 档的后端公开端点绝对前缀（不含结尾斜杠）；非 real 档为空串 */
const REAL_ASSETS = (() => {
  try {
    // 环境判定：与 services/env.ts 的 VITE_API_MODE 对齐（real → 后端托管基址）
    const mode = String(import.meta.env.VITE_API_MODE);
    const base = String(import.meta.env.VITE_API_BASE_URL);
    if (mode === "real" && base) {
      return base.replace(/\/api\/?$/, "") + APP_ASSETS_ENDPOINT;
    }
  } catch (_e) { /* 忽略：按本地处理 */ }
  return "";
})();

/** 取清单里的某一桶前缀列表；缺失/类型漂移时退回空数组（保守：全部留包内） */
function bucketPrefixes(kind: "cdnPrefixes" | "localPrefixes"): string[] {
  const raw = (cdnBuckets as unknown as Record<string, unknown>)[kind];
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.length > 0);
}

/**
 * 目录（包内相对路径，形如 `assets/images/covers`）是否属于 real 档可出后端的桶。
 * localPrefixes 先判：清单正常不重叠，但真写出重叠时以「包内一定有的那份」为准。
 */
function isCdnDir(pkgRelDir: string): boolean {
  const key = `static/${pkgRelDir}/`;
  if (bucketPrefixes("localPrefixes").some((prefix) => key.startsWith(prefix))) return false;
  return bucketPrefixes("cdnPrefixes").some((prefix) => key.startsWith(prefix));
}

/**
 * 目录基址：real 档且该目录登记在 cdnPrefixes → 后端 app-assets 前缀；否则包内 `/static/...`。
 *
 * 返回串不带结尾斜杠，用法与旧基址一致（`POSTS_DIR + '/post-1.jpg'`）。
 */
function assetDir(pkgRelDir: string): string {
  if (REAL_ASSETS && isCdnDir(pkgRelDir)) {
    return `${REAL_ASSETS}/${pkgRelDir}`;
  }
  return `/static/${pkgRelDir}`;
}

/* ===== cdnPrefixes 命中的目录（real 档出后端） ===== */
const POSTS_DIR = assetDir('assets/images/posts');
const COVERS_DIR = assetDir('assets/images/covers');
const POSTERS_DIR = assetDir('assets/images/posters');
const AVATAR_BASE = assetDir('assets/images/avatars');
const PEOPLE_DIR = assetDir('assets/images/people');
const GENERATED_BASE = assetDir('generated');

/* ===== 基址组（逐个目录由 assetDir() 按清单判桶，real 档命中 cdnPrefixes 者直出后端）：
 *   命中 cdnPrefixes（real 档出后端、构建期不随包）：assets/images/ 及其全部子目录
 *     （activities/products/banners/register/match/home-split/mascot/covers/posters/avatars/people/posts）、
 *     icons/{social,login,v2,home,match,emoji,nearby}/、message/、generated/；
 *   命中 localPrefixes 或未登记（任何档都留包内）：assets 根、icons 根、
 *     icons/{common,register,tabbar}/、svg-spec/、profile/。===== */
const ASSETS_DIR = assetDir('assets');
const IMAGES_DIR = assetDir('assets/images');
const ACTIVITIES_DIR = assetDir('assets/images/activities');
const PRODUCTS_DIR = assetDir('assets/images/products');
const BANNERS_DIR = assetDir('assets/images/banners');
const REGISTER_DIR = assetDir('assets/images/register');
const MATCH_DIR = assetDir('assets/images/match');
const HOME_SPLIT_DIR = assetDir('assets/images/home-split');
const MASCOT_DIR = assetDir('assets/images/mascot');
const ICONS_BASE = assetDir('assets/icons');
/* R6/F7（2026-10-20，R6-L11-D01/D02/D03、R6-L01-D01/D02、R6-L01-D09）：
 * icons 的**已登记子目录**必须按子目录取基址，不能从未登记的根目录拼串。
 * 实测两侧判据原本是不重叠的：
 *   - 契约：`cdn-buckets.json` 把 `static/assets/icons/{home,match,v2,emoji,login,social,nearby}/`
 *     划进 cdnPrefixes ⇒ prepare-static --real 根本不把这些目录复制进 src/static
 *     （盘上证据：src/static/assets/icons/ 现只剩 common/register/tabbar + 14 枚根文件，
 *     social/ v2/ login/ home/ 目录在 static-local-backup/full-static 里，不在 src/static）；
 *   - 运行时：这些键此前由 ICONS_BASE 直接拼上 `'/v2/sliders.png'` 这类子目录串，而 ICONS_BASE 求值走的是**根目录**
 *     （根未登记 ⇒ 任何档都是 `/static/assets/icons`）⇒ real 档拿到包内路径，
 *     而包内根本没有该目录 ⇒ 空白。产物侧的记账证实这是漏判而非设计：
 *     `dist/build/mp-weixin-real/CDN_OFFLOAD_MANIFEST.json` 里 icons 族 80 个条目
 *     （social 12 / v2 27 / home 28 / login 2 / match 8 / emoji 3）都是按「运行时指后端」出包的。
 * 逐子目录走 assetDir() 后：real 档解析成后端 app-assets URL（匿名 GET 已逐枚实测 200），
 * mock/dev/showcase/H5 档 assetDir() 求值与原来的拼串**逐字相同**（`/static/assets/icons/<sub>/…`），
 * 取值零变化。本批改 social / login / v2 三个目录（本批缺陷所需），逐目录收全，
 * 不留同目录半截基址；home / match / emoji / nearby 四个登记目录同型待接（见交件）。 */
const ICONS_SOCIAL_DIR = assetDir('assets/icons/social');
const ICONS_LOGIN_DIR = assetDir('assets/icons/login');
const ICONS_V2_DIR = assetDir('assets/icons/v2');
const SVG_SPEC_DIR = assetDir('assets/svg-spec');
const PROFILE_SVG_DIR = assetDir('assets/profile/svg');

/**
 * 「必须随包」资产双登记表（2026-10-19 · 系统性缺陷车道：真档图标/图片渲染为空白）
 * ─────────────────────────────────────────────────────────────────────────────
 * 真档链 `build:mp-weixin:real` → release-chain.mjs 上有**两道按源码文本认引用**的过滤器，
 * 它们的判据互不重叠，于是一种登记形态必在其中一道上落空（实测读数见下）：
 *
 *  ① prepare-static.mjs --real（scripts/prepare-static.mjs:274 的引用正则）
 *     只认「整串以 `/static/` 开头且带扩展名的字面量」→ 它决定 src/static 留谁
 *     （它把 src/static 原地换成裁剪态，见 release-chain.mjs:124 的 `--scan src`）。
 *     经基址拼接出来的常量（`ICONS_BASE + '/home/toolbar/x.png'`）在它眼里等于没写
 *     ⇒ 文件根本没进包。
 *     实测：chain-R3-041020.log:197「本地保留 tabBar + 源码字面量引用 125 个文件」，
 *     src/static 由 HEAD 的 1344 个文件被换成 129 个；`assets/icons/home/**`（HEAD 72 个文件）
 *     一个都没留下 ⇒ 首页铃铛与社区动态三枚工具图标必为空白。
 *
 *  ② prune-unreferenced-static.mjs（scripts/prune-unreferenced-static.mjs:92 + :153-156）
 *     把产物包内相对路径（`assets/images/mascot/default.png`）逐段后缀去命中源码字面量集合，
 *     而整串 `/static/<rel>` 会被它的正则读成 `static/<rel>`，与 `<rel>` 的任何后缀都不等
 *     ⇒ 「未被引用」，只要后端 app-assets 有同名副本就剪。
 *     实测：chain-R3-041020.log:899-901「removed 64 files, 1138714B, keptMissingOnBackend=0」，
 *     被剪清单（archive/prune-backup/real-20261018T201320/）里正是整个 `assets/images/mascot/`
 *     与 MyMore 的四枚 `assets/images/profile-*.svg`。
 *
 * 结论：随包资产必须**同时**以两种形态出现在源码文本里——
 *   pkg  = "/static/<rel>"  → 过 ①
 *   tail = "/<rel>"         → 过 ②
 * 本表逐条把两个形态写在一起（同一条目、不会漂移）。运行时取值仍按各组既有约定：
 * 本地固定组（MASCOT / ICONS_PROFILE.*_SVG）直接取本表的 pkg，值与登记前逐字相同；
 * 基址派生组（HOME_ICONS / ICONS_EMOJI / ICONS_COMMON…）由 assetDir() 出值——
 * 它们全落在 `cdn-buckets.json` 的 localPrefixes（`static/assets/icons/`、
 * `static/assets/svg-spec/`）里，于是任何档都是包内 `/static/...`，
 * 不再出现「常量直出后端 URL、再由 utils/media.ts 反写回 /static」这种两侧都认的样子。
 *
 * 2026-10-19 R6/L01 与单一真源对齐：**登记范围 = 非 cdnPrefixes 的目录**。
 * 命中 cdnPrefixes 的目录（generated/、assets/images/{covers,posters,avatars,people,posts}/）
 * 在 real 档不随主包发布、运行时由 media.ts 解析成后端 app-assets URL，
 * 所以本表**不得**再登记其中的文件——原 `POST_PLACEHOLDER`（`assets/images/posts/`，33,754B）
 * 已按此删除：它既被登记成「必须随包」又被基址直出成后端 URL，两条判据打架；
 * 该 rel 逐字节实测由后端托管（见 tmp/qa/lanes/R6/L01-media.md 的桶表），走后端不空源。
 * 内容级大图（`assets/images/posts/post-*.jpg` 共 556KB、`assets/images/covers/**` 等）
 * 同理不进本表。
 *
 * 只登记**确有消费方**的素材：主包门禁 2.00MB，上一发裁剪后实测 1.74MB
 * （chain-R3-041020.log:906），本表合计新增约 145KB，留出的余量是给后续车道的，
 * 不是可以随手填满的。
 */
export const IN_PACKAGE_ASSETS = {
  /**
   * 吉祥物唯一真源（2026-10-21 测试红三件 media.spec#2/#3 + not-logged-waiting-orbit 车道收口）：
   * 默认那尊 = `assets/svg-spec/08-mascot/sprout-default.svg`，不是 `assets/images/mascot/default.png`。
   * 三条证据：
   *   ① 契约：`cdn-buckets.json` 的 cdnPrefixes 自 3af02dd4 起是 `static/assets/images/`（整目录），
   *      而 `static/assets/svg-spec/` 在 localPrefixes——同一张图不许两侧都认（本表铁律，见 :156-158 的
   *      POST_PLACEHOLDER 先例）。
   *   ② 盘上实测 real 包：`apps/client/dist/build/mp-weixin-real/static/assets/` 下只有
   *      `icons、profile、svg-spec`（外加根上的 default-avatar.jpg/.png）——`images/` 整目录不在包里，
   *      `svg-spec/08-mascot/sprout-default.svg` 在。指 PNG 的裸绑（pages/messages/index.vue:450）
   *      在 real 档必然空白。
   *   ③ 车道裁定：c56f6d2d 修「未登录等待卡中心空盘」（R2b-L02-D11 的后续）时，选的就是改绑
   *      `ICONS_EMOJI.SPROUT`（同一枚 SVG），理由写在 NotLoggedWaiting.vue:68-75。
   * 本条目因此按 SVG 登记（pkg 在 localPrefixes 内，任何档都在包里，裸绑与 resolveMediaUrl 两条路都不空源），
   * `IMAGE_PATHS.MASCOT.DEFAULT` 与 `ICONS_EMOJI.SPROUT` 同值，三处（本表/契约/组件）自此一致。
   */
  MASCOT_DEFAULT: { pkg: '/static/assets/svg-spec/08-mascot/sprout-default.svg', tail: '/assets/svg-spec/08-mascot/sprout-default.svg' },
  /* ── 以下 13 条登记于 2026-10-19 图标空白车道，同日 22:27 被 3af02dd4 把契约从 6 桶扩到 10 桶
     （cdnPrefixes 新增 `static/assets/images/`、`static/assets/message/`、`static/assets/icons/{home,match,v2,emoji,login,social,nearby}/`）
     之后**逐条失效并删除**（2026-10-21）：命中 cdnPrefixes 的文件 prepare-static.mjs --real 根本不复制进
     src/static（实测 real 包内 `assets/` 只剩 icons/{common,register,tabbar} + svg-spec + profile + audio），
     于是「必须随包」这一侧的声称不可能兑现——留着就是同一张图两侧都认，正是 media.spec.ts:257-260
     那条双登记表 ↔ localPrefixes 对齐判点在红的东西。删除不改动任何运行时取值：九枚仍取同一条
     `/static/...` 字面量（改为在 IMAGE_PATHS 里就地写死，逐字相同），real 档经 resolveMediaUrl 指后端
     （后端 `apps/api/uploads/app-assets/` 里这 13 枚逐一在盘，3af02dd4 读数 缺资产=0）。
     被删清单：HEADER_BELL、TB_LIKE/TB_COMMENT/TB_SHARE（`static/assets/icons/home/` 进桶）、
     MASCOT_STAR/SPARKLE/HEART_PINK_LARGE/HEART_GREEN（`assets/images/mascot/` 进桶）、
     MASCOT_HEART_GRADIENT 与 PROFILE_{FAVORITES,VISITORS,ALBUM,PRIVACY}_SVG（`assets/images/` 进桶）。
     ⚠️ 登记给渲染车道（不在本车道可写集，也不属任何在红判点）：MatchLoading.vue:52/55/63-70/104 与
     pages/messages/index.vue:465 是**裸绑 IMAGE_PATHS.MASCOT.***、没过 resolveMediaUrl，real 档这些
     PNG 会取包内不存在的文件；R6 交件对这类消费点的定性是「≥19 处裸绑 :src 没过解析器」。 */
  /** 「更多功能」八宫格里 MyMore.vue:20-23 的那四枚（同一张卡，避免只修半张）；
   *  :16-19 那四枚 `assets/images/profile-*.svg` 已随上方 13 条一起出表（见被删清单）。 */
  EMOJI_USER_SVG: { pkg: '/static/assets/icons/common/user.svg', tail: '/assets/icons/common/user.svg' },
  EMOJI_HEART_FILLED_SVG: { pkg: '/static/assets/icons/common/heart-filled.svg', tail: '/assets/icons/common/heart-filled.svg' },
  EMOJI_FILE_TEXT_SVG: { pkg: '/static/assets/icons/common/file-text.svg', tail: '/assets/icons/common/file-text.svg' },
  EMOJI_CHECK_SVG: { pkg: '/static/assets/icons/common/check.svg', tail: '/assets/icons/common/check.svg' },
  /**
   * 2026-10-26 首页邀请横幅「带翅膀爱心」插画（对齐理想图 素材/理想效果图/首页.png）。
   * 素材来源：从该理想图邀请横幅区域裁切 + 浅粉底透明化（88x56 @2x，约 9.5KB）。
   * 落盘目录 icons/common/ 在 cdn-buckets.json 的 localPrefixes（恒包内），
   * 按 EMOJI_USER_SVG 同款 pkg+tail 双形态登记，过 prepare-static --real 与
   * prune-unreferenced-static 两道按源码文本认引用的过滤器。消费方 InviteBanner.vue。
   */
  INVITE_WINGED_HEART: { pkg: '/static/assets/icons/common/invite-winged-heart.png', tail: '/assets/icons/common/invite-winged-heart.png' },
  /**
   * 2026-10-26 寻觅页「打个招呼」按钮图标（对齐理想图 寻觅匹配卡片页面.png）：
   * 粉色实心对话气泡内含白色爱心眼（原 ICONS_V2.CHAT_PINK 为描边空心气泡+文本线条）。
   * 素材来源：从该理想图 CTA 键区域裁切 + 边缘泛洪去白底（61x62 @2x，6.5KB），
   * 内部白色爱心眼经连通域判定保留。落盘 icons/common/（localPrefixes 恒包内），
   * 同款 pkg+tail 双形态登记。消费方 MatchActions.vue。
   */
  GREET_HEART_BUBBLE: { pkg: '/static/assets/icons/common/greet-heart-bubble.png', tail: '/assets/icons/common/greet-heart-bubble.png' },
  /**
   * 2026-10-26 寻觅页头「已喜欢列表」入口图标（对齐理想图 寻觅匹配卡片页面.png）：
   * 黑描边心形+右下小弧尾（原 icons/heart.svg 素描边标准心形，无弧尾）。
   * 素材来源：从该理想图收藏键区域裁切 + 边缘泛洪去白底（64x64 @2x）。
   * 落盘 icons/common/，同款 pkg+tail 双形态登记。消费方 pages/discover/index.vue。
   */
  FAV_HEART_SWOOSH: { pkg: '/static/assets/icons/common/fav-heart-swoosh.png', tail: '/assets/icons/common/fav-heart-swoosh.png' },
  /**
   * 2026-10-26 匹配成功页导航右上「取景框/扫描」图标（对齐理想图 匹配成功页面.png）：
   * 四角框+中心符号的扫码式字形（原 ICONS_EMOJI.CAMERA_ICON 相机形态用错）。
   * 纯几何字形自绘（24x24 stroke 体系，同 common/ 图标族）。落盘 icons/common/，
   * 同款 pkg+tail 双形态登记。消费方 subpackages/discover-extra/discover/match-success.vue。
   */
  SCAN_VIEWFINDER_SVG: { pkg: '/static/assets/icons/common/scan-viewfinder.svg', tail: '/assets/icons/common/scan-viewfinder.svg' },
  /**
   * R6/F7（2026-10-20）：`assets/icons/` **根目录**的 6 枚同判据双登记（R6-L11-D03 / R6-L02-D04
   * / R6-L02-D05 / R6-L02-D07 / R6-L01-D09）。根目录既不在 cdnPrefixes 也不在 localPrefixes
   * ⇒ real 档按契约留包内，但盘上实测它们**发不出去**：
   * `dist/build/mp-weixin-real/static/assets/icons/` 只剩 common/register/tabbar，
   * 而 `archive/prune-backup/real-20261019T142618/assets/icons/` 里正好躺着这 14 枚根文件
   * （bookmark/cake/chat/fire/gift/group/heart/location/microphone/plus/search/smile/
   * sparkles/thumbs-up）⇒ 是 prune-unreferenced-static.mjs 按「无 raw 引用」剪掉的，不是桶出包
   * （CDN_OFFLOAD_MANIFEST.json 里 0 条 assets/icons/ 根条目，逐条 grep 已证）。
   * 剪的判点是 PATH_RE 需要「目录/文件」两级字面量，而这些键在源码里只以
   * `ICONS_BASE + '/gift.svg'` 的**拼接**形态出现 ⇒ 单文件名进不了 raw 集合。
   * 本条按上方 :124-126 既有纪律同时给 pkg 与 tail 两个形态，6 枚合计 2.0KB（逐枚 230–416B），
   * 对 real 档 1.54MB/2.00MB 的实测读数无影响。
   * 2026-10-21 接完同型其余 8 枚（bookmark/cake/fire/microphone/plus/smile/sparkles/thumbs-up，
   * 合计 2,617B，逐枚 230–388B）。盘上实测：`src/static/assets/icons/` 根 14 枚、
   * `dist/build/mp-weixin-real/static/assets/icons/` 根只有 6 枚，且
   * `CDN_OFFLOAD_MANIFEST.json` 里 assets/icons/ 根条目 0 条 ⇒ 缺席 8 枚是 prune 剪的。
   * 剪因同 :199-200：这些键在源码里只以 `ICONS_BASE + '/cake.svg'` 出现，字面量段是**单段**
   * `cake.svg`，PATH_RE 要「目录/文件」两级 ⇒ 进不了 raw 集合；而 `'/common/fire.svg'` 那类
   * 两级串能进（所以 common/ 的 fire.svg  twin 一直在包里）。本条登记的是**根**那枚 fire.svg，
   * 消费方是 search/index.vue:289 与 config/circle-icons.ts:40（CIRCLE_FIRE）；
   * nearby/index.vue:622 用的 common/ twin 不动。运行时取值一律不变——`ICONS_EMOJI.*` 8 枚
   * 仍是基址拼单段串的纯字符串（消费方直接绑 :src / resolveMediaUrl），
   * 本表条目只承担「把两级字面量写进源码文本」这一道判据，与上方 6 枚同一形态。 */
  ICONS_GIFT_SVG: { pkg: '/static/assets/icons/gift.svg', tail: '/assets/icons/gift.svg' },
  ICONS_CHAT_SVG: { pkg: '/static/assets/icons/chat.svg', tail: '/assets/icons/chat.svg' },
  ICONS_GROUP_SVG: { pkg: '/static/assets/icons/group.svg', tail: '/assets/icons/group.svg' },
  ICONS_SEARCH_SVG: { pkg: '/static/assets/icons/search.svg', tail: '/assets/icons/search.svg' },
  ICONS_HEART_SVG: { pkg: '/static/assets/icons/heart.svg', tail: '/assets/icons/heart.svg' },
  ICONS_LOCATION_SVG: { pkg: '/static/assets/icons/location.svg', tail: '/assets/icons/location.svg' },
  ICONS_BOOKMARK_SVG: { pkg: '/static/assets/icons/bookmark.svg', tail: '/assets/icons/bookmark.svg' },
  ICONS_CAKE_SVG: { pkg: '/static/assets/icons/cake.svg', tail: '/assets/icons/cake.svg' },
  ICONS_FIRE_SVG: { pkg: '/static/assets/icons/fire.svg', tail: '/assets/icons/fire.svg' },
  ICONS_MICROPHONE_SVG: { pkg: '/static/assets/icons/microphone.svg', tail: '/assets/icons/microphone.svg' },
  ICONS_PLUS_SVG: { pkg: '/static/assets/icons/plus.svg', tail: '/assets/icons/plus.svg' },
  ICONS_SMILE_SVG: { pkg: '/static/assets/icons/smile.svg', tail: '/assets/icons/smile.svg' },
  ICONS_SPARKLES_SVG: { pkg: '/static/assets/icons/sparkles.svg', tail: '/assets/icons/sparkles.svg' },
  ICONS_THUMBS_UP_SVG: { pkg: '/static/assets/icons/thumbs-up.svg', tail: '/assets/icons/thumbs-up.svg' },
} as const;

export const IMAGE_PATHS = {
  POST_PLACEHOLDER: POSTS_DIR + '/post-placeholder.jpg',
  DEFAULT_AVATAR: ASSETS_DIR + '/default-avatar.jpg',

  AVATARS: {
    AVATAR_1: AVATAR_BASE + '/avatar-1.jpg',
    AVATAR_2: AVATAR_BASE + '/avatar-2.jpg',
    AVATAR_3: AVATAR_BASE + '/avatar-3.jpg',
    AVATAR_4: AVATAR_BASE + '/avatar-4.jpg',
    AVATAR_5: AVATAR_BASE + '/avatar-5.jpg',
    AVATAR_6: AVATAR_BASE + '/avatar-6.jpg',
    AVATAR_7: AVATAR_BASE + '/avatar-7.jpg',
    AVATAR_8: AVATAR_BASE + '/avatar-8.jpg',
    AVATAR_9: AVATAR_BASE + '/avatar-9.jpg',
    AVATAR_10: AVATAR_BASE + '/avatar-10.jpg',
    AVATAR_11: AVATAR_BASE + '/avatar-11.jpg',
    AVATAR_12: AVATAR_BASE + '/avatar-12.jpg',
    /* 2026-09-29 主包体积车道：AVATAR_13 ~ AVATAR_49 收编。
       stores/likes/mock-data.ts 与 stores/village/mock-data.ts 此前把 43 个头像写成
       完整 `…/avatars/avatar-<n>.jpg` 的 /static 字面量，被 prepare-static.mjs
       strip() 的 /static/** 字面量正则命中 → 发布形态主包保留集被塞进 40 张共 235,243B。
       这些串只服务于 mock 演示数据（real 构建由 strip-mock-for-mp.mjs 整段剔除），
       且 13~49 全部已托管在后端公开端点 /api/v1/media/app-assets/assets/images/avatars/
       （与 full-static 逐字节一致），属本文件 2026-08-29「主包素材全量迁后端」的正统口径。
       mock/dev 档 AVATAR_BASE 求值仍是 /static/assets/images/avatars → 运行时取值逐字节不变。 */
    AVATAR_13: AVATAR_BASE + '/avatar-13.jpg',
    AVATAR_14: AVATAR_BASE + '/avatar-14.jpg',
    AVATAR_15: AVATAR_BASE + '/avatar-15.jpg',
    AVATAR_16: AVATAR_BASE + '/avatar-16.jpg',
    AVATAR_17: AVATAR_BASE + '/avatar-17.jpg',
    AVATAR_18: AVATAR_BASE + '/avatar-18.jpg',
    AVATAR_19: AVATAR_BASE + '/avatar-19.jpg',
    AVATAR_20: AVATAR_BASE + '/avatar-20.jpg',
    AVATAR_21: AVATAR_BASE + '/avatar-21.jpg',
    AVATAR_22: AVATAR_BASE + '/avatar-22.jpg',
    AVATAR_23: AVATAR_BASE + '/avatar-23.jpg',
    AVATAR_24: AVATAR_BASE + '/avatar-24.jpg',
    AVATAR_25: AVATAR_BASE + '/avatar-25.jpg',
    AVATAR_26: AVATAR_BASE + '/avatar-26.jpg',
    AVATAR_27: AVATAR_BASE + '/avatar-27.jpg',
    AVATAR_28: AVATAR_BASE + '/avatar-28.jpg',
    AVATAR_29: AVATAR_BASE + '/avatar-29.jpg',
    AVATAR_30: AVATAR_BASE + '/avatar-30.jpg',
    AVATAR_31: AVATAR_BASE + '/avatar-31.jpg',
    AVATAR_32: AVATAR_BASE + '/avatar-32.jpg',
    AVATAR_33: AVATAR_BASE + '/avatar-33.jpg',
    AVATAR_34: AVATAR_BASE + '/avatar-34.jpg',
    AVATAR_35: AVATAR_BASE + '/avatar-35.jpg',
    AVATAR_36: AVATAR_BASE + '/avatar-36.jpg',
    AVATAR_37: AVATAR_BASE + '/avatar-37.jpg',
    AVATAR_38: AVATAR_BASE + '/avatar-38.jpg',
    AVATAR_39: AVATAR_BASE + '/avatar-39.jpg',
    AVATAR_40: AVATAR_BASE + '/avatar-40.jpg',
    AVATAR_41: AVATAR_BASE + '/avatar-41.jpg',
    AVATAR_42: AVATAR_BASE + '/avatar-42.jpg',
    AVATAR_43: AVATAR_BASE + '/avatar-43.jpg',
    AVATAR_44: AVATAR_BASE + '/avatar-44.jpg',
    AVATAR_45: AVATAR_BASE + '/avatar-45.jpg',
    AVATAR_46: AVATAR_BASE + '/avatar-46.jpg',
    AVATAR_47: AVATAR_BASE + '/avatar-47.jpg',
    AVATAR_48: AVATAR_BASE + '/avatar-48.jpg',
    AVATAR_49: AVATAR_BASE + '/avatar-49.jpg',
    DEFAULT: ASSETS_DIR + '/default-avatar.jpg',
  },

  /** v3.1 人物素材（素材/人物 9 张，docs/design/people-fixture.json 映射） */
  PEOPLE: {
    CARD_1: PEOPLE_DIR + '/person-01.png',
    CARD_2: PEOPLE_DIR + '/person-02.png',
    CARD_3: PEOPLE_DIR + '/person-03.png',
    CARD_4: PEOPLE_DIR + '/person-04.png',
    CARD_5: PEOPLE_DIR + '/person-05.png',
    CARD_6: PEOPLE_DIR + '/person-06.png',
    CARD_7: PEOPLE_DIR + '/person-07.png',
    CARD_8: PEOPLE_DIR + '/person-08.png',
    CARD_9: PEOPLE_DIR + '/person-09.png',
    AVATAR_1: AVATAR_BASE + '/person-01-avatar.png',
    AVATAR_2: AVATAR_BASE + '/person-02-avatar.png',
    AVATAR_3: AVATAR_BASE + '/person-03-avatar.png',
    AVATAR_4: AVATAR_BASE + '/person-04-avatar.png',
    AVATAR_5: AVATAR_BASE + '/person-05-avatar.png',
    AVATAR_6: AVATAR_BASE + '/person-06-avatar.png',
    AVATAR_7: AVATAR_BASE + '/person-07-avatar.png',
    AVATAR_8: AVATAR_BASE + '/person-08-avatar.png',
    AVATAR_9: AVATAR_BASE + '/person-09-avatar.png',
  },

  POSTS: {
    CAMPUS_LIBRARY: POSTS_DIR + '/campus-library.jpg',
    POST_PLACEHOLDER: POSTS_DIR + '/post-placeholder.jpg',
    POST_1: POSTS_DIR + '/post-1.jpg',
    POST_2: POSTS_DIR + '/post-2.jpg',
    POST_3: POSTS_DIR + '/post-3.jpg',
    POST_4: POSTS_DIR + '/post-4.jpg',
    POST_5: POSTS_DIR + '/post-5.jpg',
    POST_6: POSTS_DIR + '/post-6.jpg',
    POST_7: POSTS_DIR + '/post-7.jpg',
    POST_8: POSTS_DIR + '/post-8.jpg',
  },

  ACTIVITIES: {
    ACTIVITY_1: ACTIVITIES_DIR + '/activity-1.jpg',
    ACTIVITY_2: ACTIVITIES_DIR + '/activity-2.jpg',
    ACTIVITY_3: ACTIVITIES_DIR + '/activity-3.jpg',
    ACTIVITY_4: ACTIVITIES_DIR + '/activity-4.jpg',
    ACTIVITY_5: ACTIVITIES_DIR + '/activity-5.jpg',
    ACTIVITY_6: ACTIVITIES_DIR + '/activity-6.jpg',
    ACTIVITY_SPORTS: ACTIVITIES_DIR + '/activity-sports.jpg',
    ACTIVITY_STUDY: ACTIVITIES_DIR + '/activity-study.jpg',
  },

  PRODUCTS: {
    FOOD_1: PRODUCTS_DIR + '/food-1.jpg',
    FOOD_2: PRODUCTS_DIR + '/food-2.jpg',
    MERCH_1: PRODUCTS_DIR + '/merch-1.jpg',
    MERCH_2: PRODUCTS_DIR + '/merch-2.jpg',
    TICKET_1: PRODUCTS_DIR + '/ticket-1.jpg',
    TICKET_2: PRODUCTS_DIR + '/ticket-2.jpg',
  },


  /** 消息模块 V3 图标（素材\消息\2 + 素材\消息\2\2） */
  MESSAGE_ICONS: {
    ASSISTANT_AVATAR: '/static/assets/message/svg/assistant_avatar.svg',
    LIKE_NOTICE: '/static/assets/message/svg/like_notice.svg',
    OFFICIAL: '/static/assets/message/svg/official.svg',
    SEND_HEART: '/static/assets/message/svg/send_heart.svg',
    VOICE: '/static/assets/message/svg/voice.svg',
    LOCATION: '/static/assets/message/svg/location.svg',
    CALENDAR: '/static/assets/message/svg/calendar.svg',
    ONLINE: '/static/assets/message/svg/avatar/online.svg',
    AVATAR_RING: '/static/assets/message/svg/avatar/avatar-ring.svg',
    CARD_BASE: '/static/assets/message/svg/card/card-base.svg',
    PHOTO_PLACEHOLDER: '/static/assets/message/svg/gallery/photo-placeholder.svg',
    HERO_GRADIENT: '/static/assets/message/svg/hero/hero-gradient-bg.svg',
    ADD: '/static/assets/message/svg/icon/add.svg',
    HEART: '/static/assets/message/svg/icon/heart.svg',
    COMMON_INTEREST_BG: '/static/assets/message/svg/interest/common-interest-bg.svg',
    MATCH_PROGRESS: '/static/assets/message/svg/match/match-progress.svg',
    EMPTY_STORY: '/static/assets/message/svg/story/story-empty.svg',
    ACTIVITY_CARD: '/static/assets/message/svg/card/card-base.svg',
    SEND_HEART_LEGACY: '/static/assets/message/svg/chat_send_heart.svg',
    ONLINE_DOT: '/static/assets/message/svg/avatar/online.svg',
    HEART_FILL: '/static/assets/message/svg/icon/heart.svg',
    HEART_OUTLINE: '/static/assets/icons/heart.svg',
    MESSAGE: '/static/assets/message/svg/message.svg',
    CAMERA: '/static/assets/icons/common/camera.svg',
    SMILE: '/static/assets/icons/smile.svg',
  },

  POSTERS: {
    LOGIN: POSTERS_DIR + '/login-poster.png',
    LOGIN_ILLUSTRATION: POSTERS_DIR + '/login-illustration.jpg', // 2026-08-20：改为校园插画（原 png 为图标设计板，非登录背景）
    HOME: POSTERS_DIR + '/home-poster.jpg',
    NOT_LOGGED_WAITING: POSTERS_DIR + '/notlogged-waiting.png',
  },

  /**
   * 生成素材（/static/generated 根目录，R4-00245：image-local.ts 兜底映射引用本组，
   * 不再散落硬编码 /static/generated/... 路径）。
   */
  GENERATED: {
    CAMPUS_GATE: GENERATED_BASE + '/images/campus/campus-gate.jpg',
    CAMPUS_LAKE: GENERATED_BASE + '/images/campus/campus-lake.jpg',
    CAMPUS_LIBRARY: GENERATED_BASE + '/images/campus/campus-library.jpg',
    CAMPUS_NIGHT: GENERATED_BASE + '/images/campus/campus-night.jpg',
    CAMPUS_PLAYGROUND: GENERATED_BASE + '/images/campus/campus-playground.jpg',
    CAMPUS_CAFETERIA: GENERATED_BASE + '/images/campus/campus-cafeteria.jpg',
    CAMPUS_CLASSROOM: GENERATED_BASE + '/images/campus/campus-classroom.jpg',
    CAMPUS_RAIN: GENERATED_BASE + '/images/campus/campus-rain.jpg',
    /* 2026-09-03 可选缺口清零：校园圈专属地标封面插画（AI 生成实景风格，无水印） */
    CAMPUS_GATE_LANDMARK: GENERATED_BASE + '/images/campus/campus-gate-landmark.jpg',
    CAMPUS_ARCH_LANDMARK: GENERATED_BASE + '/images/campus/campus-arch-landmark.jpg',
    CAMPUS_LAKE_PAVILION: GENERATED_BASE + '/images/campus/campus-lake-pavilion.jpg',
    HOME_POSTER: GENERATED_BASE + '/images/posters/home-poster.jpg',
  },

  BANNERS: {
    VILLAGE: BANNERS_DIR + '/village-banner.jpg',
    HOME: BANNERS_DIR + '/home-banner.jpg',
  },

  /** 首页邀请横幅带翅膀爱心插画（包内恒驻，见 IN_PACKAGE_ASSETS.INVITE_WINGED_HEART） */
  INVITE_WINGED_HEART: IN_PACKAGE_ASSETS.INVITE_WINGED_HEART.pkg,

  /** 寻觅页「打个招呼」心眼气泡图标（包内恒驻，见 IN_PACKAGE_ASSETS.GREET_HEART_BUBBLE） */
  GREET_HEART_BUBBLE: IN_PACKAGE_ASSETS.GREET_HEART_BUBBLE.pkg,

  /** 寻觅页头「已喜欢列表」入口图标（包内恒驻，见 IN_PACKAGE_ASSETS.FAV_HEART_SWOOSH） */
  FAV_HEART_SWOOSH: IN_PACKAGE_ASSETS.FAV_HEART_SWOOSH.pkg,

  /** 寻觅页头筛选漏斗（svg-spec 03-icons，黑色描边漏斗，对齐理想图页头右上筛选入口） */
  FILTER_FUNNEL: SVG_SPEC_DIR + '/03-icons/filter.svg',

  /** 通用图标（common 目录） */
  ICONS_COMMON: {
    ADD: ICONS_BASE + '/common/add.png',
    ADD_WHITE: ICONS_BASE + '/common/add-white.png',
    AI: ICONS_BASE + '/common/ai.png',
    ARROW_RIGHT: ICONS_BASE + '/common/arrow-right.png',
    BACK: ICONS_BASE + '/common/back.png',
    BUILDING: ICONS_BASE + '/common/building.png',
    CAMERA: ICONS_BASE + '/common/camera.png',
    CELEBRATION: ICONS_BASE + '/common/celebration.png',
    CHECK: ICONS_BASE + '/common/check.png',
    CLOSE: ICONS_BASE + '/common/close.png',
    EDIT: ICONS_BASE + '/common/edit.png',
    FIRE: ICONS_BASE + '/common/fire.png',
    GRADUATION: ICONS_BASE + '/common/graduation.png',
    HEART: ICONS_BASE + '/common/heart.png',
    LOCATION: ICONS_BASE + '/common/location.png',
    NEW_BADGE: ICONS_BASE + '/common/new-badge.png',
    NOTIFICATION: ICONS_BASE + '/common/notification.png',
    SCHEDULE: ICONS_BASE + '/common/schedule.png',
    SCHOOL: ICONS_BASE + '/common/school.png',
    SEARCH: ICONS_BASE + '/common/search.png',
    SETTINGS: ICONS_BASE + '/common/settings.png',
    SHOP: ICONS_BASE + '/common/shop.png',
    STAR: ICONS_BASE + '/common/star.png',
    VIP: ICONS_BASE + '/common/vip.png',
    // SVG 变体（支持 currentColor 主题色，用于替换 emoji 场景）
    SCHOOL_SVG: ICONS_BASE + '/common/school.svg',
    CELEBRATION_SVG: ICONS_BASE + '/common/celebration.svg',
    NOTIFICATION_SVG: ICONS_BASE + '/common/notification.svg',
    STAR_SVG: ICONS_BASE + '/common/star.svg',
    SCHEDULE_SVG: ICONS_BASE + '/common/schedule.svg',
    GRADUATION_SVG: ICONS_BASE + '/common/graduation.svg',
    // 新增 SVG 图标（feather/lucide 风格 24x24 stroke，替换 emoji）
    USER_SVG: ICONS_BASE + '/common/user.svg',
    WARNING_SVG: ICONS_BASE + '/common/warning.svg',
    BOOK_SVG: ICONS_BASE + '/common/book.svg',
    FOOD_SVG: ICONS_BASE + '/common/food.svg',
    HIKING_SVG: ICONS_BASE + '/common/hiking.svg',
    RULER_SVG: ICONS_BASE + '/common/ruler.svg',
    MONEY_SVG: ICONS_BASE + '/common/money.svg',
    LOCK_SVG: ICONS_BASE + '/common/lock.svg',
    PENCIL_SVG: ICONS_BASE + '/common/pencil.svg',
    EYE_SVG: ICONS_BASE + '/common/eye.svg',
    EYE_OFF_SVG: ICONS_BASE + '/common/eye-off.svg',
    BELL_SVG: ICONS_BASE + '/common/bell.svg',
    PROHIBITED_SVG: ICONS_BASE + '/common/prohibited.svg',
    SHARE_ICON_SVG: ICONS_BASE + '/common/share.svg',
    OPEN_BOOK_SVG: ICONS_BASE + '/common/open-book.svg',
    TREND_UP_SVG: ICONS_BASE + '/common/trend-up.svg',
    CHART_SVG: ICONS_BASE + '/common/chart.svg',
    CLIPBOARD_SVG: ICONS_BASE + '/common/clipboard.svg',
    KEY_SVG: ICONS_BASE + '/common/key.svg',
    MOBILE_SVG: ICONS_BASE + '/common/mobile.svg',
    CLOCK_SVG: ICONS_BASE + '/common/clock.svg',
    CALENDAR_SVG: ICONS_BASE + '/common/calendar.svg',
    HEART_FILLED_SVG: ICONS_BASE + '/common/heart-filled.svg',
    CROWN_SVG: ICONS_BASE + '/common/crown.svg',
    REFRESH_SVG: ICONS_BASE + '/common/refresh.svg',
    FILE_TEXT_SVG: ICONS_BASE + '/common/file-text.svg',
    INFO_SVG: ICONS_BASE + '/common/info.svg',
    LOG_OUT_SVG: ICONS_BASE + '/common/log-out.svg',
    CHEVRON_DOWN_SVG: ICONS_BASE + '/common/chevron-down.svg',
    UPLOAD_SVG: ICONS_BASE + '/common/upload.svg',
    PACKAGE_SVG: ICONS_BASE + '/common/package.svg',
    BOX_SVG: ICONS_BASE + '/common/box.svg',
    PIN_SVG: ICONS_BASE + '/common/pin.svg',
    CHECK_CIRCLE_SVG: ICONS_BASE + '/common/check-circle.svg',
    CHECK_SVG: ICONS_BASE + '/common/check.svg',
    CHECK_WHITE_SVG: ICONS_BASE + '/common/check-white.svg',
    CLOSE_SVG: ICONS_BASE + '/common/close.svg',
    X_CIRCLE_SVG: ICONS_BASE + '/common/x-circle.svg',
    GRADUATION_CAP_SVG: ICONS_BASE + '/common/graduation-cap.svg',
    CHEVRON_RIGHT_SVG: ICONS_BASE + '/common/chevron-right.svg',
    CHEVRON_LEFT_SVG: ICONS_BASE + '/common/chevron-left.svg',
    BOLT_SVG: ICONS_BASE + '/common/bolt.svg',
    LIST_SVG: ICONS_BASE + '/common/list.svg',
    CHECK_FAIL_SVG: ICONS_BASE + '/common/check-fail.svg',
    PENDING_SVG: ICONS_BASE + '/common/pending.svg',
    SETTINGS_GEAR_SVG: ICONS_BASE + '/common/settings-gear.svg',
    TERMINAL_SVG: ICONS_BASE + '/common/terminal.svg',
    ROBOT_SVG: ICONS_BASE + '/common/robot.svg',
    LOG_IN_SVG: ICONS_BASE + '/common/log-in.svg',
    DOWNLOAD_SVG: ICONS_BASE + '/common/download.svg',
    VIDEO_SVG: ICONS_BASE + '/common/video.svg',
    BRIEFCASE_SVG: ICONS_BASE + '/common/briefcase.svg', // 💼 职业
    RING_SVG: ICONS_BASE + '/common/ring.svg',           // 💍 感情状态
    PLAY_SVG: ICONS_BASE + '/common/play.svg',           // ▶ 播放
    PAUSE_SVG: ICONS_BASE + '/common/pause.svg',         // ❚❚ 暂停
    CLOSE_WHITE_SVG: ICONS_BASE + '/common/close-white.svg', // 白色 ✕（深色背景关闭）
    SCAN_VIEWFINDER_SVG: IN_PACKAGE_ASSETS.SCAN_VIEWFINDER_SVG.pkg, // 取景框/扫描（匹配成功页 nav）
  },

  /** 社交图标（social 目录）
   * Phase 9 选图研究：全部切换为 SVG（lucide 风格，currentColor 可主题化），png 历史资产不再引用 */
  ICONS_SOCIAL: {
    CHECKIN: ICONS_SOCIAL_DIR + '/checkin.svg',
    COMMENT: ICONS_SOCIAL_DIR + '/comment.svg',
    FOLLOW: ICONS_SOCIAL_DIR + '/follow.svg',
    HEART_SIGNAL: ICONS_SOCIAL_DIR + '/heart-signal.svg',
    LIKE: ICONS_SOCIAL_DIR + '/like.svg',
    LIKE_FILLED: ICONS_SOCIAL_DIR + '/like-filled.svg',
    MATCH: ICONS_SOCIAL_DIR + '/match.svg',
    MESSAGE: ICONS_SOCIAL_DIR + '/message.svg',
    PASS: ICONS_SOCIAL_DIR + '/pass.svg',
    SHARE: ICONS_SOCIAL_DIR + '/share.svg',
    SUPER_LIKE: ICONS_SOCIAL_DIR + '/super-like.svg',
    VISITOR: ICONS_SOCIAL_DIR + '/visitor.svg',
  },

  /** 附近页入口图标
   *  2026-10-26 对齐理想图（附近的首页.png 五宫格）：「附近的人」= 绿色双人人群
   *  （原 common/user.svg 单人像）、「校园圈」= 蓝色学士帽（原 common/school.svg 楼宇格窗）。
   *  两枚仅 nearby/index.vue 五宫格消费；group.svg 已有 ICONS_GROUP_SVG pkg+tail 双登记，
   *  graduation-cap.svg 在 localPrefixes 的 common/ 桶（ICONS_COMMON.GRADUATION_CAP_SVG 同款路径）。 */
  NEARBY_ICONS: {
    PEOPLE:  ICONS_BASE + '/group.svg',
    CIRCLE:  ICONS_BASE + '/group.svg',          // 2026-08-26 P1-1：原 common/group.svg 不存在导致渲染 404 → 指向真实文件
    CAMPUS:  ICONS_BASE + '/common/graduation-cap.svg',
    ACTIVITY: ICONS_BASE + '/common/schedule.svg',
    DYNAMIC: ICONS_BASE + '/common/fire.svg',
  },

  /** 首页拆分图标（精修版 — 从素材/首页/最终/拆分图标-精修版/ 复制） */
  HOME_ICONS: {
    // 01-tabbar-top：顶部导航区
    SEARCH: ICONS_BASE + '/home/tabbar-top/icon_row1_01.png',
    LOCATION_PIN: ICONS_BASE + '/home/tabbar-top/icon_row1_02.png',
    HEADER_BELL: ICONS_BASE + '/home/tabbar-top/icon_row1_07.png',
    HEADER_MORE: ICONS_BASE + '/home/tabbar-top/icon_row1_06.png',
    // 02-buttons-badges：按钮与徽章
    BTN_SEE: ICONS_BASE + '/home/buttons-badges/btn_row2_01.png',
    BTN_LIKE: ICONS_BASE + '/home/buttons-badges/btn_row2_02.png',
    BTN_INVITE: ICONS_BASE + '/home/buttons-badges/btn_row2_05.png',
    // 03-tags：兴趣标签（彩色圆底）
    TAG_PHOTOGRAPHY: ICONS_BASE + '/home/tags/tag_row3_01.png',
    TAG_TRAVEL: ICONS_BASE + '/home/tags/tag_row3_02.png',
    TAG_MUSIC: ICONS_BASE + '/home/tags/tag_row3_03.png',
    TAG_FOOD: ICONS_BASE + '/home/tags/tag_row3_04.png',
    TAG_SPORTS: ICONS_BASE + '/home/tags/tag_row3_05.png',
    TAG_READING: ICONS_BASE + '/home/tags/tag_row3_06.png',
    // 04-photos-stats：信息与统计图标
    STAT_HEART: ICONS_BASE + '/home/photos-stats/item_row4_01.png',
    STAT_MESSAGE: ICONS_BASE + '/home/photos-stats/item_row4_02.png',
    STAT_VISITOR: ICONS_BASE + '/home/photos-stats/item_row4_03.png',
    STAT_MATCH: ICONS_BASE + '/home/photos-stats/item_row4_04.png',
    // 05-task-cards：恋爱进度四步卡片
    TASK_PROFILE: ICONS_BASE + '/home/task-cards/card_row5_01.png',
    TASK_DISCOVER: ICONS_BASE + '/home/task-cards/card_row5_02.png',
    TASK_WHISPER: ICONS_BASE + '/home/task-cards/card_row5_03.png',
    TASK_INTEREST: ICONS_BASE + '/home/task-cards/card_row5_04.png',
    // 06-circle-entries：兴趣圈入口
    CIRCLE_PHOTO: ICONS_BASE + '/home/circle-entries/circle_row6_01.png',
    CIRCLE_TRAVEL: ICONS_BASE + '/home/circle-entries/circle_row6_02.png',
    CIRCLE_MUSIC: ICONS_BASE + '/home/circle-entries/circle_row6_03.png',
    CIRCLE_FOOD: ICONS_BASE + '/home/circle-entries/circle_row6_04.png',
    // 07-toolbar：社区动态互动栏
    TB_LIKE: ICONS_BASE + '/home/toolbar/toolbar_row7_01.png',
    TB_COMMENT: ICONS_BASE + '/home/toolbar/toolbar_row7_02.png',
    TB_SHARE: ICONS_BASE + '/home/toolbar/toolbar_row7_03.png',
  },

  /**
   * 寻觅吉祥物 xunmi_mascot_design_system_v2（2026-09-02 R5：关系动态图标替换素材）
   * 路径指向本地 static 资源（base lib 3.16.2 强制 https，开发模式走本地避免 HTTP 警告）
   *
   * 2026-10-19 图标空白车道：本组里**有消费方且需要随包**的六枚改由 IN_PACKAGE_ASSETS 供值
   * （pkg 串与登记前逐字相同），其余仍写本地字面量——那些素材后端 app-assets 也有一份，
   * 随包要占 2MB 主包预算，没进包就让它显式待在后端出口，不静默进保留集。
   * 2026-10-21 收口：六枚里只有 DEFAULT 还留在本表（且它的值已换成 localPrefixes 内的 SVG，见
   * IN_PACKAGE_ASSETS.MASCOT_DEFAULT），其余五枚在 3af02dd4 把 `assets/images/` 整目录划进
   * cdnPrefixes 之后不可能随包 ⇒ 退回就地字面量，值逐字不变。
   */
  MASCOT: {
    /* MP-R2-PAGES-MESSAGES-INDEX-005：空态默认吉祥物收编（messages 页原硬编码路径）
       —— 2026-10-21 收口到 svg-spec 那尊（见 IN_PACKAGE_ASSETS.MASCOT_DEFAULT 三条证据）：
       `assets/images/mascot/` 自 3af02dd4 起整目录命中 cdnPrefixes ⇒ 不在 real 包内，
       而本页 :450 是裸绑 :src、没过 resolveMediaUrl，指 PNG 在 real 档必空白。 */
    DEFAULT: IN_PACKAGE_ASSETS.MASCOT_DEFAULT.pkg,
    /* MP-R2-MATCHING-004：匹配进度卡图标收编（matching 页原硬编码路径）
       —— R2b-L07-D10：star / sparkle 两枚同因（进度卡空圆）。
       这两枚所在目录已被 3af02dd4 划进 cdnPrefixes，real 档不可能随包 ⇒ 双登记已删，
       字面量逐字不变地写在这里（值不变），real 档由 resolveMediaUrl 指后端。 */
    STAR: '/static/assets/images/mascot/star.png',
    SPARKLE: '/static/assets/images/mascot/sparkle.png',
    HEART: '/static/assets/images/mascot/mascot_heart.png',         // 心动/喜欢
    CRUSH: '/static/assets/images/mascot/mascot_crush.png',         // 暗恋/心动
    LIKE: '/static/assets/images/mascot/mascot_like.png',           // 喜欢
    WAVE: '/static/assets/images/mascot/mascot_wave.png',           // 挥手/打招呼
    GREETING: '/static/assets/images/mascot/mascot_greeting.png',   // 问候/到访
    CHEER: '/static/assets/images/mascot/mascot_cheer.png',         // 欢呼/新匹配
    SHY: '/static/assets/images/mascot/mascot_shy.png',             // 害羞（悄悄话）
    CLAP: '/static/assets/images/mascot/mascot_clap.png',           // 鼓掌
    HUG: '/static/assets/images/mascot/mascot_hug.png',             // 拥抱
    SMILE: '/static/assets/images/mascot/mascot_smile.png',         // 微笑
    CHAT_HI: '/static/assets/images/mascot/chat_hi.png',            // 问候气泡
    CHAT_RECEIVED: '/static/assets/images/mascot/chat_received.png', // 收到消息气泡
    CHAT_GOOD: '/static/assets/images/mascot/chat_good.png',         // 好的气泡
    STATUS_ONLINE: '/static/assets/images/mascot/status_online.png', // 在线状态
    STATUS_BUSY: '/static/assets/images/mascot/status_busy.png',     // 忙碌状态
    STATUS_CRUSH: '/static/assets/images/mascot/status_crush.png',   // 心动状态
    // 匹配/加载装饰爱心素材（2026-09-17 R7：模板禁止硬编码 /static/，收敛到常量；
    // 与本组一致固定本地 /static 路径，不随 real 模式切后端基址）
    // R2b-L07-D10（这三枚漂浮爱心 ×8 + 中央白底心徽）的 IN_PACKAGE_ASSETS 双登记已于
    // 2026-10-21 删除：`assets/images/` 整目录在 3af02dd4 之后命中 cdnPrefixes，real 档根本
    // 不随包，「随包」那条声称兑不了现（同 HEART_PINK 的处置——它一直是就地字面量、走后端出口）。
    // 字面量逐字不变，值不变。
    HEART_PINK: '/static/assets/images/mascot/heart_pink.png',             // 粉色小爱心
    HEART_PINK_LARGE: '/static/assets/images/mascot/heart_pink_large.png', // 粉色大爱心
    HEART_GREEN: '/static/assets/images/mascot/heart_green.png',           // 绿色小爱心
    HEART_GRADIENT: '/static/assets/images/heart-gradient.svg',            // 渐变爱心装饰（MatchLoading 背景板）
  },

  /** TabBar 图标（tabbar 目录） */
  ICONS_TABBAR: {
    HOME_ACTIVE: ICONS_BASE + '/tabbar/home-active.png',
    HOME_DEFAULT: ICONS_BASE + '/tabbar/home.png',
    CHAT_ACTIVE: ICONS_BASE + '/tabbar/chat-active.png',
    CHAT_DEFAULT: ICONS_BASE + '/tabbar/chat.png',
    DISCOVER_ACTIVE: ICONS_BASE + '/tabbar/discover-active.png',
    DISCOVER_DEFAULT: ICONS_BASE + '/tabbar/discover.png',
    MATCH_HEART: ICONS_BASE + '/tabbar/match-heart.png',
    MATCH_HEART_ACTIVE: ICONS_BASE + '/tabbar/match-heart-active.png',
    NEARBY_ACTIVE: ICONS_BASE + '/tabbar/nearby-active.png',
    NEARBY_DEFAULT: ICONS_BASE + '/tabbar/nearby.png',
    PROFILE_ACTIVE: ICONS_BASE + '/tabbar/profile-active.png',
    PROFILE_DEFAULT: ICONS_BASE + '/tabbar/profile.png',
  },

  /** 纯匹配版动作图标（v2 图标资源：freesvglab flat + 素材回退，固定色 PNG） */
  ICONS_MATCH: {
    /** 喜欢（心动粉 #FF6B81） */
    HEART: ICONS_V2_DIR + '/heart-pink.png',
    /** 超级喜欢（消息蓝 #4D8DFF） */
    STAR: ICONS_V2_DIR + '/star-blue.png',
    /** 跳过（次文字灰 #666666） */
    X: ICONS_V2_DIR + '/x-gray.png',
    /** 匹配爱心（白色，供浮岛/图标使用） */
    MATCH_HEART: ICONS_V2_DIR + '/heart-white.png',
  },

  /** 寻觅 V1 图标（icons/match 目录，构建期 SVG→PNG） */
  ICONS_MATCH_V1: {
    PASS: ICONS_BASE + '/match/pass.png',
    LIKE: ICONS_BASE + '/match/like.png',
    SUPER_LIKE: ICONS_BASE + '/match/super-like.png',
    HEART_MATCH: ICONS_BASE + '/match/heart-match.png',
    LOADING_RING: ICONS_BASE + '/match/loading-ring.png',
  },

  /** 寻觅 V1 聊天图标（icons/match 目录，构建期 SVG→PNG） */
  ICONS_CHAT_V1: {
    SEND: ICONS_BASE + '/match/chat-send.png',
    IMAGE: ICONS_BASE + '/match/chat-image.png',
    VOICE: ICONS_BASE + '/match/chat-voice.png',
  },

  /** v2 核心图标（icons/v2 目录：freesvglab flat-icon + 素材回退，96px 固定色 PNG） */
  ICONS_V2: {
    DISCOVER: ICONS_V2_DIR + '/discover.png',
    NEARBY: ICONS_V2_DIR + '/nearby.png',
    HEART: ICONS_V2_DIR + '/heart.png',
    CHAT: ICONS_V2_DIR + '/chat.png',
    PROFILE: ICONS_V2_DIR + '/profile.png',
    STAR: ICONS_V2_DIR + '/star.png',
    X: ICONS_V2_DIR + '/x.png',
    SEARCH: ICONS_V2_DIR + '/search.png',
    MORE: ICONS_V2_DIR + '/more.png',
    // SVG 变体（2026-09-17 R7：circle-home「更多」按钮，固定本地 /static 路径）
    MORE_SVG: '/static/assets/icons/v2/more.svg',
    BACK: ICONS_V2_DIR + '/back.png',
    PLUS: ICONS_V2_DIR + '/plus.png',
    EDIT: ICONS_V2_DIR + '/edit.png',
    BELL: ICONS_V2_DIR + '/bell.png',
    SLIDERS: ICONS_V2_DIR + '/sliders.png',
      DIAMOND_FILTER: IMAGES_DIR + '/diamond-filter.svg',
    VERIFY: ICONS_V2_DIR + '/verify.png',
    ONLINE: ICONS_V2_DIR + '/online.png',
    // 品牌色变体
    HEART_PINK: ICONS_V2_DIR + '/heart-pink.png',
    CHAT_WHITE: ICONS_V2_DIR + '/chat-white.png',
    CHAT_PINK: ICONS_V2_DIR + '/chat-pink.png',
    CHAT_GREEN: ICONS_V2_DIR + '/chat-green.png',
    X_WHITE: ICONS_V2_DIR + '/x-white.png',
    HEART_WHITE: ICONS_V2_DIR + '/heart-white.png',
    HEART_BRAND: ICONS_V2_DIR + '/heart-brand.png',
    STAR_BLUE: ICONS_V2_DIR + '/star-blue.png',
    X_GRAY: ICONS_V2_DIR + '/x-gray.png',
    /* 2026-08-25 P0：登录页微信绿色气泡 SVG（自绘，参见 报告/2026-08-25-逐页差异规格书.md 2.9） */
    WECHAT_GREEN_SVG: ICONS_LOGIN_DIR + '/wechat-green.svg',
    /* 2026-08-25 P0：登录页主标题后绿色小苗图标（复用吉祥物 sprout，渲染最稳） */
    SPROUT: MASCOT_DIR + '/sprout.png',
  },

  /** 个人中心菜单图标（profile 目录，全部复用现有图标，避免下载新资源） */
  ICONS_PROFILE: {
    /* MP-R2-PROFILE-010：MyMore 菜单图标收编（原页面硬编码 /static 路径）
       2026-10-19 图标空白车道：四枚字形改由 IN_PACKAGE_ASSETS 供值（pkg 串逐字不变）。
       它们此前**登记齐全但仍在真档里渲染为空圆**——因为整串 /static 字面量过不了
       prune-unreferenced-static.mjs 的后缀判点（同文件 :153-156），实测被剪清单见
       apps/client/archive/prune-backup/real-20261018T201320/assets/images/profile-*.svg。
       双登记后 tail 形式补上第二道判点，四枚随包。
       2026-10-21 再更正：`assets/images/` 整目录已进 cdnPrefixes（3af02dd4），real 包里根本
       没有 `assets/images/`（实测 dist/build/mp-weixin-real/static/assets/ 只剩 icons/profile/svg-spec）
       ⇒ 「随包」这条兑现不了，本表四条已删（留着即 media.spec 的「同一张图不能两侧都认」在红）。
       值逐字不变；MyMore.vue:36 过 resolveMediaUrl ⇒ real 档取后端那份（后端 4 枚逐一在盘）。*/
    FAVORITES_SVG: '/static/assets/images/profile-favorite.svg',
    VISITORS_SVG: '/static/assets/images/profile-visitors.svg',
    ALBUM_SVG: '/static/assets/images/profile-album.svg',
    PRIVACY_SVG: '/static/assets/images/profile-privacy.svg',
    POSTS:        ICONS_SOCIAL_DIR + '/heart-signal.svg', // 我的动态 → 复用 heart-signal
    FAVORITES:    ICONS_BASE + '/common/star.png',          // 我的收藏 → 复用 star
    MATCHES:      ICONS_SOCIAL_DIR + '/match.svg',         // 我的匹配 → 复用 social.match
    VISITORS:     ICONS_SOCIAL_DIR + '/visitor.svg',       // 访客记录 → 复用 social.visitor
    EYE:          ICONS_BASE + '/common/eye.svg',           // 浏览记录 → eye（与访客/动态图标区分）
    CLOCK:        ICONS_BASE + '/common/clock.svg',         // 浏览记录 → clock（R4：与访客记录 eye 撞形，改时间语义）
    ALBUM:        ICONS_BASE + '/common/album.svg',         // 我的相册 → album（R4：与我的动态 pulse 撞形）
    NETWORK:      ICONS_SOCIAL_DIR + '/follow.svg',        // 我的人脉 → 人物+加号（R3 修正：原 LOGIN_SPLIT r10_c02 实为 WiFi 图）
    PHOTO_WALL:   ICONS_SOCIAL_DIR + '/heart-signal.svg',  // 相册 → 复用 heart-signal（暂用占位）
    VERIFICATION: ICONS_BASE + '/common/check.png',         // 恋爱认证 → 复用 check
    LAB:          ICONS_BASE + '/common/ai.png',            // 情感实验室 → 复用 ai
    SHARE:        ICONS_SOCIAL_DIR + '/share.svg',         // 推荐给好友 → 复用 social.share
    SETTINGS:     ICONS_BASE + '/common/settings.png',      // 设置 → 复用 common.settings
    INFO:         ICONS_BASE + '/common/notification.png',  // 关于我们 → 复用 notification
  },

  /**
   * Emoji 替换 SVG 图标（icons 根目录）
   * 用于替换页面中的 emoji 字符（📍👥🎂✨🔍🎤😊+❤️💬🔖🎁🔥👍）
   * SVG 使用 currentColor，可通过父元素 color 控制主题色
   */
  ICONS_EMOJI: {
    LOCATION:    ICONS_BASE + '/location.svg',    // 📍 附近 / 位置
    GROUP:       ICONS_BASE + '/group.svg',        // 👥 群组 / 不限
    CAKE:        ICONS_BASE + '/cake.svg',         // 🎂 生日 / 年龄
    SPARKLES:    ICONS_BASE + '/sparkles.svg',    // ✨ 闪光 / 推荐
    SEARCH:      ICONS_BASE + '/search.svg',      // 🔍 搜索
    MICROPHONE:  ICONS_BASE + '/microphone.svg',  // 🎤 语音房
    SMILE:       ICONS_BASE + '/smile.svg',       // 😊 微笑
    PLUS:        ICONS_BASE + '/plus.svg',        // + 新增
    HEART:       ICONS_BASE + '/heart.svg',       // ❤️ 喜欢
    CHAT:        ICONS_BASE + '/chat.svg',        // 💬 评论
    BOOKMARK:    ICONS_BASE + '/bookmark.svg',   // 🔖 收藏
    GIFT:        ICONS_BASE + '/gift.svg',        // 🎁 礼物
    FIRE:        ICONS_BASE + '/fire.svg',       // 🔥 热门
    THUMBS_UP:   ICONS_BASE + '/thumbs-up.svg',  // 👍 点赞
    // 新增 emoji→SVG 映射（feather/lucide style）
    USER:        ICONS_BASE + '/common/user.svg',           // 👤 用户
    WARNING:     ICONS_BASE + '/common/warning.svg',        // ⚠️ 警告
    BOOK:        ICONS_BASE + '/common/book.svg',           // 📚 读书
    CAMERA_ICON: ICONS_BASE + '/common/camera.svg',         // 📷 相机
    RULER:       ICONS_BASE + '/common/ruler.svg',          // 📏 身高
    MONEY:       ICONS_BASE + '/common/money.svg',          // 💰 月消费
    LOCK:        ICONS_BASE + '/common/lock.svg',           // 🔒 锁定
    PENCIL:      ICONS_BASE + '/common/pencil.svg',         // ✏️ 编辑
    EYE:         ICONS_BASE + '/common/eye.svg',            // 👀 查看
    EYE_OFF:     ICONS_BASE + '/common/eye-off.svg',        // 🙅 不看
    BELL:        ICONS_BASE + '/common/bell.svg',           // 🔔 通知
    PROHIBITED:  ICONS_BASE + '/common/prohibited.svg',     // 🚫 禁止
    CROWN:       ICONS_BASE + '/common/crown.svg',          // 👑 皇冠
    ROCKET:      ICONS_BASE + '/common/trend-up.svg',       // 🚀 趋势/加权
    PALETTE:     ICONS_BASE + '/common/settings-gear.svg',   // 🎨 主题
    CHECK_CIRCLE:ICONS_BASE + '/common/check-circle.svg',   // ✅ 已选
    CHECK_FAIL:  ICONS_BASE + '/common/check-fail.svg',     // ❌ 未通过
    INFO:        ICONS_BASE + '/common/info.svg',           // ℹ️ 信息
    SHIELD:      ICONS_BASE + '/common/lock.svg',           // 🛡️ 隐私
    CLIPBOARD:   ICONS_BASE + '/common/clipboard.svg',      // 📋 列表
    BROOM:       ICONS_BASE + '/common/refresh.svg',        // 🧹 清理
    PENDING:     ICONS_BASE + '/common/pending.svg',        // ⏳ 审核中
    GRAD_CAP:    ICONS_BASE + '/common/graduation-cap.svg',  // 🎓 毕业
    TARGET:      ICONS_BASE + '/common/pin.svg',            // 🎯 目标
    SCORE:       ICONS_BASE + '/common/check-circle.svg',   // 💯 满分
    UPLOAD:      ICONS_BASE + '/common/upload.svg',         // 📤 上传
    LAB:         ICONS_BASE + '/common/robot.svg',          // 🔬 实验室
    SETTINGS:    ICONS_BASE + '/common/settings-gear.svg',   // ⚙️ 设置
    HEART_FILLED:ICONS_BASE + '/common/heart-filled.svg',  // 💝/💕 爱心填色
    // 曾另有 HEART_FILLED_WHITE → common/heart-filled-white.svg（仅 fill 色不同）。
    // 该文件只存在于本地 static，未迁移进后端 app-assets（media_asset 0 行），
    // real 模式必然 404；改色需求已由 MatchSuccess 的 filter 反色承担，故删除常量。
    MOBILE:      ICONS_BASE + '/common/mobile.svg',         // 📱 手机
    KEY:         ICONS_BASE + '/common/key.svg',            // 🔑 钥匙
    CLOCK:       ICONS_BASE + '/common/clock.svg',          // 🕐 时钟
    CALENDAR:    ICONS_BASE + '/common/calendar.svg',       // 📅 日历
    VIDEO:       ICONS_BASE + '/common/video.svg',          // 📹 视频
    LOG_IN:      ICONS_BASE + '/common/log-in.svg',         // 📲 登录
    DOWNLOAD:    ICONS_BASE + '/common/download.svg',       // 📥 下载
    CHART:       ICONS_BASE + '/common/chart.svg',          // 📊 图表
    LIST:        ICONS_BASE + '/common/list.svg',           // 📝 列表
    FILE_TEXT:   ICONS_BASE + '/common/file-text.svg',      // 📜 文档
    REFRESH_CW:  ICONS_BASE + '/common/refresh.svg',        // 🔄 刷新
    // 业务图标别名（与 ICONS_COMMON 中 SVG 资源对应，便于 emoji 风格统一引用）
    PIN:         ICONS_BASE + '/common/pin.svg',            // 📌 置顶 / 定位
    BOLT:        ICONS_BASE + '/common/bolt.svg',           // ⚡ 闪电 / 快捷
    FOOD:        ICONS_BASE + '/common/food.svg',           // 🍔 美食
    // ===== Feedback 改版 emoji 全量替换补充映射（lucide 风格，currentColor）=====
    MEGAPHONE:   ICONS_BASE + '/common/megaphone.svg',      // 📣 官方号 / 通知
    PUZZLE:      ICONS_BASE + '/common/puzzle.svg',         // 🧩 MBTI / 拼图
    GAMEPAD:     ICONS_BASE + '/common/gamepad.svg',        // 🎮 游戏
    COOKING:     ICONS_BASE + '/common/cooking-pot.svg',    // 🍳 美食 / 烹饪
    PLANE:       ICONS_BASE + '/common/plane.svg',          // ✈️ 旅行
    CLAPPER:     ICONS_BASE + '/common/clapperboard.svg',   // 🎬 电影
    MUSIC:       ICONS_BASE + '/common/music.svg',          // 🎵 音乐 / 舞蹈
    LINK:        ICONS_BASE + '/common/link.svg',           // 🔗 绑定
    MOON:        ICONS_BASE + '/common/moon.svg',           // 🌙 夜间 / 深色
    TICKET:      ICONS_BASE + '/common/ticket.svg',         // 🎫 卡券 / 兑换码
    VOLUME_HIGH: ICONS_BASE + '/common/volume-high.svg',    // 🔊 音量高
    VOLUME_LOW:  ICONS_BASE + '/common/volume-low.svg',     // 🔈 音量低
    VOLUME_X:    ICONS_BASE + '/common/volume-x.svg',       // 🔇 静音
    MAIL:        ICONS_BASE + '/common/mail.svg',           // ✉️ 私信 / 悄悄话
    PHONE:       ICONS_BASE + '/common/phone.svg',          // 📞 语音通话
    HEART_OUTLINE: ICONS_BASE + '/heart.svg',               // 🤍 空心心（未赞）
    DOUBLE_HEART:ICONS_BASE + '/common/heart-filled.svg',   // 💞 恋爱咨询
    SPEECH:      ICONS_BASE + '/chat.svg',                  // 🗣️ 社交咨询
    // ===== 2026-08-25 emoji→SVG 全量替换补充映射（映射表 v1，P0/P1）=====
    STAR:        SVG_SPEC_DIR + '/03-icons/star.svg',        // ☆ 空星（悄悄话/未赞）
    CLOSE:       SVG_SPEC_DIR + '/03-icons/close.svg',       // ✕ 关闭
    CHECK:       ICONS_BASE + '/common/check.svg',                   // ✓ 对勾
    COMMENT:     SVG_SPEC_DIR + '/03-icons/comment.svg',     // 💬 聊天气泡
    IMAGE:       SVG_SPEC_DIR + '/03-icons/image.svg',       // 🖼 图片/相册
    EDIT:        SVG_SPEC_DIR + '/03-icons/edit.svg',        // ✎ / ✏ 铅笔编辑
    PLAY:        ICONS_BASE + '/common/play.svg',                    // ▶ 播放
    SCHOOL:      ICONS_BASE + '/common/school.svg',                  // 🏫 学校
    SPROUT:      SVG_SPEC_DIR + '/08-mascot/sprout-default.svg', // 🌱 寻觅品牌嫩芽
    LEAF:        SVG_SPEC_DIR + '/09-decorations/leaf-2.svg',    // 🌿 叶子
    STATUS_ONLINE: SVG_SPEC_DIR + '/04-avatars/status-online.svg', // 🟢 在线
    GENDER_FEMALE: ICONS_BASE + '/emoji/gender-female.svg',          // ♀ 女（新下载）
    GENDER_MALE:   ICONS_BASE + '/emoji/gender-male.svg',            // ♂ 男（新下载）
    RUN:         ICONS_BASE + '/emoji/run.svg',                      // 🏃 跑步（新下载）
    // ===== 2026-08-26 兴趣圈图标 emoji→SVG 全量替换（来源：素材/附近/兴趣圈 icon system + xunmi icon pack）=====
    CIRCLE_CAMERA:  ICONS_BASE + '/common/camera.svg',   // 📷 摄影
    CIRCLE_TRAVEL:  ICONS_BASE + '/common/travel.svg',   // 🧳 / ✈️ 旅行
    CIRCLE_MUSIC:   ICONS_BASE + '/common/music.svg',    // 🎵 音乐
    CIRCLE_SPORT:   PROFILE_SVG_DIR + '/v2/interest/sport.svg', // ⚽ / 🏀 运动 / 篮球（2026-08-31 修正：指向实际存在的 sport.svg）
    CIRCLE_FOOD:    ICONS_BASE + '/common/food.svg',     // 🍜 美食
    CIRCLE_GAME:    ICONS_BASE + '/common/gamepad.svg',  // 🎮 游戏
    CIRCLE_BOOK:    ICONS_BASE + '/common/book.svg',     // 📚 阅读 / 考研
    CIRCLE_PET:     ICONS_BASE + '/common/paw.svg',      // 🐾 宠物
    CIRCLE_CAT:     ICONS_BASE + '/common/cat.svg',      // 🐱 萌宠
    CIRCLE_PLANET:  ICONS_BASE + '/common/planet.svg',   // 🪐 天文 / 星空
    CIRCLE_DICE:    ICONS_BASE + '/common/ticket.svg',   // 🎲 桌游（票券代）
    CIRCLE_STAR:    ICONS_BASE + '/common/star.svg',     // ⭐ 通用
    CIRCLE_FIRE:    ICONS_BASE + '/fire.svg',            // 🔥 热门 / 活力
  },

  /** 首页拆分素材（素材/首页/最终/拆分图标-精修版）
   *  2026-09-29 主包体积车道：本组当前 0 消费方（全仓 grep `HOME_SPLIT` 只命中本定义），
   *  原先写成完整 `/static/...` 字面量 → 被 prepare-static.mjs strip() 的 /static/** 字面量
   *  正则命中，把 200,028B（12 张 PNG）拖进发布形态主包保留集，故改走基址拼接。
   *
   *  2026-10-19 R6/L01 校正：基址不再「real 档一刀切指后端」，改由 cdn-buckets.json 判桶。
   *  `static/assets/images/home-split/` **不在** cdnPrefixes 里（契约清单只有 generated/ 与
   *  assets/images/{covers,posters,avatars,people,posts}/），因此本组任何档都求值为
   *  `/static/assets/images/home-split/...`（= 包内路径，按契约「否则留包内」）。
   *  ⚠️ 已知隐患（登记给体积车道，不在本车道可写集）：这 12 张既无源码 `/static` 字面量、
   *  又没进 cdnPrefixes，构建期若被 prune 剪掉而运行时又指 `/static`，就是空白图。
   *  当前 0 消费方 ⇒ 不会真的显示，但要么把它列入 cdnPrefixes（后端已托管、字节一致，
   *  见 tmp/qa/lanes/R6/L01-media.md §5），要么给它补 IN_PACKAGE_ASSETS 式双登记。 */
  HOME_SPLIT: {
    CIRCLE_PHOTO: HOME_SPLIT_DIR + '/circle/circle_row6_01.png',
    CIRCLE_TRAVEL: HOME_SPLIT_DIR + '/circle/circle_row6_02.png',
    CIRCLE_MUSIC: HOME_SPLIT_DIR + '/circle/circle_row6_03.png',
    CIRCLE_FOOD: HOME_SPLIT_DIR + '/circle/circle_row6_04.png',
    CIRCLE_SPORTS: HOME_SPLIT_DIR + '/circle/circle_row6_05.png',
    CIRCLE_READING: HOME_SPLIT_DIR + '/circle/circle_row6_06.png',
    JOIN_BTN: HOME_SPLIT_DIR + '/circle/circle_row6_07.png',
    MEMBER_BADGE: HOME_SPLIT_DIR + '/circle/circle_row6_08.png',
    HOT_BADGE: HOME_SPLIT_DIR + '/circle/circle_row6_09.png',
    LIKE: HOME_SPLIT_DIR + '/toolbar/toolbar_row7_01.png',
    COMMENT: HOME_SPLIT_DIR + '/toolbar/toolbar_row7_02.png',
    SHARE: HOME_SPLIT_DIR + '/toolbar/toolbar_row7_03.png',
  },

  /** 兴趣圈大封面摄影图（static/assets/images/covers/，参考图风格） */
  CIRCLE_COVERS: {
    /* 2026-09-12 素材补齐：摄影/旅行/音乐/运动换 AI 摄影级新封面（750x562 JPEG，
       与理想图 兴趣圈列表.png 的摄影感风格对齐）；FOOD 沿用旧素材 */
    PHOTO:     COVERS_DIR + '/circle-cover-photography.jpg',
    TRAVEL:    COVERS_DIR + '/circle-cover-travel.jpg',
    MUSIC:     COVERS_DIR + '/circle-cover-music.jpg',
    FOOD:      COVERS_DIR + '/circle-food.png',
    SPORTS:    COVERS_DIR + '/circle-cover-sports.jpg',
    /* 校园圈兜底封面（campus/hub.vue：无地标专属封面的学校使用） */
    CAMPUS:    COVERS_DIR + '/campus-circle-cover.jpg',
    // 第五轮 QA 一致性收敛：原 GAME/READING/PET 是宽幅场景大图（600KB+ AI 摄影），
    // 与理想图 素材/理想效果图/兴趣圈列表.png 的方形场景缩略风格（Style A）不同，
    // 改用本地 AI 生成的方形居中场景图（与 ideal style 一致：摄影感/场景图优先）。
    GAME:      COVERS_DIR + '/Cozy_flat_lay_of_video_game_co_2026-08-21T03-34-01.png',
    READING:   COVERS_DIR + '/A_person_reading_a_book_in_a_c_2026-08-21T03-35-17.png',
    PET:       COVERS_DIR + '/A_cute_golden_retriever_dog_lo_2026-08-21T03-36-28.png',
    STUDY:     COVERS_DIR + '/circle-studybuddy.png',
    POSTGRAD:  COVERS_DIR + '/circle-postgraduate.png',
    ASTRONOMY: COVERS_DIR + '/circle-sky.png',
    DEFAULT:   COVERS_DIR + '/circle-photo.png',
  },

  /** 注册页素材（2026-09-12 注册页设计包落地，750x480 / 600x600 JPEG @2x） */
  REGISTER: {
    HERO:      REGISTER_DIR + '/reg-hero-illustration.jpg',
    SUCCESS:   REGISTER_DIR + '/reg-success-illustration.jpg',
  },

  /**
   * 注册页 lucide 风格 SVG 图标（36rpx 下 AI 图标必虚，走 SVG 体系；
   * 表单关键图标固定本地 /static 路径——不随 real 模式切后端基址，
   * 避免弱网下表单图标空白，体积仅数 KB）
   */
  REGISTER_ICONS: {
    MOBILE:    '/static/assets/icons/register/mobile.svg',
    MESSAGE:   '/static/assets/icons/register/message.svg',
    LOCK:      '/static/assets/icons/register/lock.svg',
    SHIELD:    '/static/assets/icons/register/shield.svg',
    USER:      '/static/assets/icons/register/user.svg',
    CAKE:      '/static/assets/icons/register/cake.svg',
    EYE:       '/static/assets/icons/register/eye.svg',
    EYE_OFF:   '/static/assets/icons/register/eye-off.svg',
    ALERT:     '/static/assets/icons/register/alert.svg',
    CHECK:     '/static/assets/icons/register/check-white.svg',
    CHECK_GREEN: '/static/assets/icons/register/check-green.svg',
    BACK:      '/static/assets/icons/register/back.svg',
    CLEAR:     '/static/assets/icons/register/clear.svg',
    ARROW_RIGHT: '/static/assets/icons/register/arrow-right.svg',
    // MP-R6-EDITPAGE（2026-09-14）：编辑资料页对齐注册页设计语言，补齐字段图标（同 stroke #4A524E / 1.8 体系）
    BOOK:      '/static/assets/icons/register/book.svg',
    RULER:     '/static/assets/icons/register/ruler.svg',
    GRADUATION: '/static/assets/icons/register/graduation-cap.svg',
    HEART:     '/static/assets/icons/register/heart.svg',
    MAP_PIN:   '/static/assets/icons/register/map-pin.svg',
    BUILDING:  '/static/assets/icons/register/building.svg',
    SPARKLES:  '/static/assets/icons/register/sparkles.svg',
    SMILE:     '/static/assets/icons/register/smile.svg',
    CHEVRON_RIGHT: '/static/assets/icons/register/chevron-right.svg',
  },

  /** 匹配卡素材（2026-09-12：无照片用户的卡片兜底主视觉，640x1024 JPEG） */
  MATCH_CARD: {
    HERO:      MATCH_DIR + '/match-card-hero.jpg',
  },

  /** 登录页拆分素材（素材/登录页/拆分图标_登录页；文件前缀 登录页_） */
  LOGIN_SPLIT: {
    "r01_c01": '/static/assets/images/login-split/登录页_r01_c01.png',
    "r01_c02": '/static/assets/images/login-split/登录页_r01_c02.png',
    "r02_c01": '/static/assets/images/login-split/登录页_r02_c01.png',
    "r02_c02": '/static/assets/images/login-split/登录页_r02_c02.png',
    "r02_c03": '/static/assets/images/login-split/登录页_r02_c03.png',
    "r03_c01": '/static/assets/images/login-split/登录页_r03_c01.png',
    "r03_c02": '/static/assets/images/login-split/登录页_r03_c02.png',
    "r03_c03": '/static/assets/images/login-split/登录页_r03_c03.png',
    "r03_c04": '/static/assets/images/login-split/登录页_r03_c04.png',
    "r04_c01": '/static/assets/images/login-split/登录页_r04_c01.png',
    "r04_c02": '/static/assets/images/login-split/登录页_r04_c02.png',
    "r04_c03": '/static/assets/images/login-split/登录页_r04_c03.png',
    "r04_c04": '/static/assets/images/login-split/登录页_r04_c04.png',
    "r05_c01": '/static/assets/images/login-split/登录页_r05_c01.png',
    "r06_c01": '/static/assets/images/login-split/登录页_r06_c01.png',
    "r06_c02": '/static/assets/images/login-split/登录页_r06_c02.png',
    "r06_c03": '/static/assets/images/login-split/登录页_r06_c03.png',
    "r06_c04": '/static/assets/images/login-split/登录页_r06_c04.png',
    "r07_c01": '/static/assets/images/login-split/登录页_r07_c01.png',
    "r07_c02": '/static/assets/images/login-split/登录页_r07_c02.png',
    "r07_c03": '/static/assets/images/login-split/登录页_r07_c03.png',
    "r07_c04": '/static/assets/images/login-split/登录页_r07_c04.png',
    "r08_c01": '/static/assets/images/login-split/登录页_r08_c01.png',
    "r08_c02": '/static/assets/images/login-split/登录页_r08_c02.png',
    "r08_c03": '/static/assets/images/login-split/登录页_r08_c03.png',
    "r08_c04": '/static/assets/images/login-split/登录页_r08_c04.png',
    "r09_c01": '/static/assets/images/login-split/登录页_r09_c01.png',
    "r10_c01": '/static/assets/images/login-split/登录页_r10_c01.png',
    "r10_c02": '/static/assets/images/login-split/登录页_r10_c02.png',
    "r10_c03": '/static/assets/images/login-split/登录页_r10_c03.png',
    "r10_c04": '/static/assets/images/login-split/登录页_r10_c04.png',
    "r11_c01": '/static/assets/images/login-split/登录页_r11_c01.png',
    "r11_c02": '/static/assets/images/login-split/登录页_r11_c02.png',
    "r11_c03": '/static/assets/images/login-split/登录页_r11_c03.png',
    "r11_c04": '/static/assets/images/login-split/登录页_r11_c04.png',
    "r12_c01": '/static/assets/images/login-split/登录页_r12_c01.png',
    "r12_c02": '/static/assets/images/login-split/登录页_r12_c02.png',
    "r12_c03": '/static/assets/images/login-split/登录页_r12_c03.png',
    "r12_c04": '/static/assets/images/login-split/登录页_r12_c04.png',
    "r13_c01": '/static/assets/images/login-split/登录页_r13_c01.png',
    "r13_c02": '/static/assets/images/login-split/登录页_r13_c02.png',
    "r13_c03": '/static/assets/images/login-split/登录页_r13_c03.png',
    "r13_c04": '/static/assets/images/login-split/登录页_r13_c04.png',
    "r14_c01": '/static/assets/images/login-split/登录页_r14_c01.png',
    "r14_c02": '/static/assets/images/login-split/登录页_r14_c02.png',
    "r14_c03": '/static/assets/images/login-split/登录页_r14_c03.png',
    "r14_c04": '/static/assets/images/login-split/登录页_r14_c04.png',
    "r15_c01": '/static/assets/images/login-split/登录页_r15_c01.png',
    "r15_c02": '/static/assets/images/login-split/登录页_r15_c02.png',
    "r15_c03": '/static/assets/images/login-split/登录页_r15_c03.png',
    "r15_c04": '/static/assets/images/login-split/登录页_r15_c04.png',
    "r16_c01": '/static/assets/images/login-split/登录页_r16_c01.png',
  },

  /** 消息页拆分素材（素材/消息/最终/拆分图标_消息） */
  MESSAGES_SPLIT: {
    "r01_c01": '/static/assets/images/messages-split/消息_r01_c01.png',
    "r01_c02": '/static/assets/images/messages-split/消息_r01_c02.png',
    "r02_c01": '/static/assets/images/messages-split/消息_r02_c01.png',
    "r02_c02": '/static/assets/images/messages-split/消息_r02_c02.png',
    "r02_c03": '/static/assets/images/messages-split/消息_r02_c03.png',
    "r02_c04": '/static/assets/images/messages-split/消息_r02_c04.png',
    "r02_c05": '/static/assets/images/messages-split/消息_r02_c05.png',
    "r02_c06": '/static/assets/images/messages-split/消息_r02_c06.png',
    "r02_c07": '/static/assets/images/messages-split/消息_r02_c07.png',
    "r02_c08": '/static/assets/images/messages-split/消息_r02_c08.png',
    "r02_c09": '/static/assets/images/messages-split/消息_r02_c09.png',
    "r03_c01": '/static/assets/images/messages-split/消息_r03_c01.png',
    "r03_c02": '/static/assets/images/messages-split/消息_r03_c02.png',
    "r03_c03": '/static/assets/images/messages-split/消息_r03_c03.png',
    "r03_c04": '/static/assets/images/messages-split/消息_r03_c04.png',
    "r04_c01": '/static/assets/images/messages-split/消息_r04_c01.png',
    "r04_c02": '/static/assets/images/messages-split/消息_r04_c02.png',
    "r04_c03": '/static/assets/images/messages-split/消息_r04_c03.png',
    "r04_c04": '/static/assets/images/messages-split/消息_r04_c04.png',
    "r04_c05": '/static/assets/images/messages-split/消息_r04_c05.png',
    "r04_c06": '/static/assets/images/messages-split/消息_r04_c06.png',
    "r04_c07": '/static/assets/images/messages-split/消息_r04_c07.png',
    "r04_c08": '/static/assets/images/messages-split/消息_r04_c08.png',
    "r04_c09": '/static/assets/images/messages-split/消息_r04_c09.png',
    "r04_c10": '/static/assets/images/messages-split/消息_r04_c10.png',
    "r04_c11": '/static/assets/images/messages-split/消息_r04_c11.png',
    "r04_c12": '/static/assets/images/messages-split/消息_r04_c12.png',
    "r05_c01": '/static/assets/images/messages-split/消息_r05_c01.png',
    "r05_c02": '/static/assets/images/messages-split/消息_r05_c02.png',
    "r06_c01": '/static/assets/images/messages-split/消息_r06_c01.png',
    "r06_c02": '/static/assets/images/messages-split/消息_r06_c02.png',
    "r06_c03": '/static/assets/images/messages-split/消息_r06_c03.png',
    "r06_c04": '/static/assets/images/messages-split/消息_r06_c04.png',
    "r06_c05": '/static/assets/images/messages-split/消息_r06_c05.png',
    "r06_c06": '/static/assets/images/messages-split/消息_r06_c06.png',
    "r06_c07": '/static/assets/images/messages-split/消息_r06_c07.png',
    "r06_c08": '/static/assets/images/messages-split/消息_r06_c08.png',
    "r06_c09": '/static/assets/images/messages-split/消息_r06_c09.png',
    "r06_c10": '/static/assets/images/messages-split/消息_r06_c10.png',
    "r06_c11": '/static/assets/images/messages-split/消息_r06_c11.png',
    "r07_c01": '/static/assets/images/messages-split/消息_r07_c01.png',
    "r07_c02": '/static/assets/images/messages-split/消息_r07_c02.png',
    "r08_c01": '/static/assets/images/messages-split/消息_r08_c01.png',
    "r08_c02": '/static/assets/images/messages-split/消息_r08_c02.png',
    "r08_c03": '/static/assets/images/messages-split/消息_r08_c03.png',
    "r08_c04": '/static/assets/images/messages-split/消息_r08_c04.png',
    "r08_c05": '/static/assets/images/messages-split/消息_r08_c05.png',
    "r08_c06": '/static/assets/images/messages-split/消息_r08_c06.png',
    "r08_c07": '/static/assets/images/messages-split/消息_r08_c07.png',
    "r08_c08": '/static/assets/images/messages-split/消息_r08_c08.png',
    "r08_c09": '/static/assets/images/messages-split/消息_r08_c09.png',
    "r08_c10": '/static/assets/images/messages-split/消息_r08_c10.png',
    "r08_c11": '/static/assets/images/messages-split/消息_r08_c11.png',
    "r08_c12": '/static/assets/images/messages-split/消息_r08_c12.png',
    "r09_c01": '/static/assets/images/messages-split/消息_r09_c01.png',
    "r09_c02": '/static/assets/images/messages-split/消息_r09_c02.png',
    "r09_c03": '/static/assets/images/messages-split/消息_r09_c03.png',
    "r10_c01": '/static/assets/images/messages-split/消息_r10_c01.png',
    "r10_c02": '/static/assets/images/messages-split/消息_r10_c02.png',
    "r10_c03": '/static/assets/images/messages-split/消息_r10_c03.png',
    "r10_c04": '/static/assets/images/messages-split/消息_r10_c04.png',
    "r10_c05": '/static/assets/images/messages-split/消息_r10_c05.png',
    "r10_c06": '/static/assets/images/messages-split/消息_r10_c06.png',
    "r11_c01": '/static/assets/images/messages-split/消息_r11_c01.png',
    "r11_c02": '/static/assets/images/messages-split/消息_r11_c02.png',
    "r11_c03": '/static/assets/images/messages-split/消息_r11_c03.png',
    "r12_c01": '/static/assets/images/messages-split/消息_r12_c01.png',
    "r12_c02": '/static/assets/images/messages-split/消息_r12_c02.png',
    "r12_c03": '/static/assets/images/messages-split/消息_r12_c03.png',
    "r12_c04": '/static/assets/images/messages-split/消息_r12_c04.png',
    "r12_c05": '/static/assets/images/messages-split/消息_r12_c05.png',
    "r12_c06": '/static/assets/images/messages-split/消息_r12_c06.png',
    "r12_c07": '/static/assets/images/messages-split/消息_r12_c07.png',
    "r12_c08": '/static/assets/images/messages-split/消息_r12_c08.png',
    "r12_c09": '/static/assets/images/messages-split/消息_r12_c09.png',
    "r12_c10": '/static/assets/images/messages-split/消息_r12_c10.png',
    "r13_c01": '/static/assets/images/messages-split/消息_r13_c01.png',
    "r13_c02": '/static/assets/images/messages-split/消息_r13_c02.png',
    "r13_c03": '/static/assets/images/messages-split/消息_r13_c03.png',
    "r14_c01": '/static/assets/images/messages-split/消息_r14_c01.png',
    "r14_c02": '/static/assets/images/messages-split/消息_r14_c02.png',
    "r14_c03": '/static/assets/images/messages-split/消息_r14_c03.png',
    "r14_c04": '/static/assets/images/messages-split/消息_r14_c04.png',
    "r14_c05": '/static/assets/images/messages-split/消息_r14_c05.png',
    "r14_c06": '/static/assets/images/messages-split/消息_r14_c06.png',
    "r14_c07": '/static/assets/images/messages-split/消息_r14_c07.png',
    "r14_c08": '/static/assets/images/messages-split/消息_r14_c08.png',
    "r14_c09": '/static/assets/images/messages-split/消息_r14_c09.png',
    "r14_c10": '/static/assets/images/messages-split/消息_r14_c10.png',
    "r14_c11": '/static/assets/images/messages-split/消息_r14_c11.png',
    "r15_c01": '/static/assets/images/messages-split/消息_r15_c01.png',
    "r16_c01": '/static/assets/images/messages-split/消息_r16_c01.png',
    "r16_c02": '/static/assets/images/messages-split/消息_r16_c02.png',
    "r16_c03": '/static/assets/images/messages-split/消息_r16_c03.png',
    "r16_c04": '/static/assets/images/messages-split/消息_r16_c04.png',
    "r16_c05": '/static/assets/images/messages-split/消息_r16_c05.png',
    "r16_c06": '/static/assets/images/messages-split/消息_r16_c06.png',
    "r16_c07": '/static/assets/images/messages-split/消息_r16_c07.png',
    "r17_c01": '/static/assets/images/messages-split/消息_r17_c01.png',
    "r17_c02": '/static/assets/images/messages-split/消息_r17_c02.png',
    "r18_c01": '/static/assets/images/messages-split/消息_r18_c01.png',
    "r18_c02": '/static/assets/images/messages-split/消息_r18_c02.png',
    "r18_c03": '/static/assets/images/messages-split/消息_r18_c03.png',
    "r18_c04": '/static/assets/images/messages-split/消息_r18_c04.png',
    "r18_c05": '/static/assets/images/messages-split/消息_r18_c05.png',
    "r18_c06": '/static/assets/images/messages-split/消息_r18_c06.png',
    "r18_c07": '/static/assets/images/messages-split/消息_r18_c07.png',
    "r18_c08": '/static/assets/images/messages-split/消息_r18_c08.png',
    "r19_c01": '/static/assets/images/messages-split/消息_r19_c01.png',
    "r19_c02": '/static/assets/images/messages-split/消息_r19_c02.png',
    "r20_c01": '/static/assets/images/messages-split/消息_r20_c01.png',
    "r20_c02": '/static/assets/images/messages-split/消息_r20_c02.png',
    "r20_c03": '/static/assets/images/messages-split/消息_r20_c03.png',
    "r20_c04": '/static/assets/images/messages-split/消息_r20_c04.png',
  },

  /** 个人主页拆分素材 */
  PROFILE_SELF_SPLIT: {
    "主页_个人_r01_c01": '/static/assets/images/profile-self-split/主页_个人_r01_c01.png',
    "主页_个人_r01_c02": '/static/assets/images/profile-self-split/主页_个人_r01_c02.png',
    "主页_个人_r01_c03": '/static/assets/images/profile-self-split/主页_个人_r01_c03.png',
    "主页_个人_r02_c01": '/static/assets/images/profile-self-split/主页_个人_r02_c01.png',
    "主页_个人_r02_c02": '/static/assets/images/profile-self-split/主页_个人_r02_c02.png',
    "主页_个人_r02_c03": '/static/assets/images/profile-self-split/主页_个人_r02_c03.png',
    "主页_个人_r02_c04": '/static/assets/images/profile-self-split/主页_个人_r02_c04.png',
    "主页_个人_r02_c05": '/static/assets/images/profile-self-split/主页_个人_r02_c05.png',
    "主页_个人_r03_c01": '/static/assets/images/profile-self-split/主页_个人_r03_c01.png',
    "主页_个人_r03_c02": '/static/assets/images/profile-self-split/主页_个人_r03_c02.png',
    "主页_个人_r03_c03": '/static/assets/images/profile-self-split/主页_个人_r03_c03.png',
    "主页_个人_r03_c04": '/static/assets/images/profile-self-split/主页_个人_r03_c04.png',
    "主页_个人_r04_c01": '/static/assets/images/profile-self-split/主页_个人_r04_c01.png',
    "主页_个人_r05_c01": '/static/assets/images/profile-self-split/主页_个人_r05_c01.png',
    "主页_个人_r06_c01": '/static/assets/images/profile-self-split/主页_个人_r06_c01.png',
    "主页_个人_r06_c02": '/static/assets/images/profile-self-split/主页_个人_r06_c02.png',
    "主页_个人_r06_c03": '/static/assets/images/profile-self-split/主页_个人_r06_c03.png',
    "主页_个人_r06_c04": '/static/assets/images/profile-self-split/主页_个人_r06_c04.png',
    "主页_个人_r06_c05": '/static/assets/images/profile-self-split/主页_个人_r06_c05.png',
    "主页_个人_r07_c01": '/static/assets/images/profile-self-split/主页_个人_r07_c01.png',
    "主页_个人_r07_c02": '/static/assets/images/profile-self-split/主页_个人_r07_c02.png',
    "主页_个人_r07_c03": '/static/assets/images/profile-self-split/主页_个人_r07_c03.png',
    "主页_个人_r07_c04": '/static/assets/images/profile-self-split/主页_个人_r07_c04.png',
    "主页_个人_r08_c01": '/static/assets/images/profile-self-split/主页_个人_r08_c01.png',
    "主页_个人_r08_c02": '/static/assets/images/profile-self-split/主页_个人_r08_c02.png',
    "主页_个人_r08_c03": '/static/assets/images/profile-self-split/主页_个人_r08_c03.png',
    "主页_个人_r08_c04": '/static/assets/images/profile-self-split/主页_个人_r08_c04.png',
    "主页_个人_r08_c05": '/static/assets/images/profile-self-split/主页_个人_r08_c05.png',
    "图标预览_联系表": '/static/assets/images/profile-self-split/图标预览_联系表.png',
  },

  /** 他人主页1拆分素材 */
  PROFILE_OTHER1_SPLIT: {
    "主页_他人1_r01_c01": '/static/assets/images/profile-other1-split/主页_他人1_r01_c01.png',
    "主页_他人1_r01_c02": '/static/assets/images/profile-other1-split/主页_他人1_r01_c02.png',
    "主页_他人1_r01_c03": '/static/assets/images/profile-other1-split/主页_他人1_r01_c03.png',
    "主页_他人1_r01_c04": '/static/assets/images/profile-other1-split/主页_他人1_r01_c04.png',
    "主页_他人1_r01_c05": '/static/assets/images/profile-other1-split/主页_他人1_r01_c05.png',
    "主页_他人1_r01_c06": '/static/assets/images/profile-other1-split/主页_他人1_r01_c06.png',
    "主页_他人1_r01_c07": '/static/assets/images/profile-other1-split/主页_他人1_r01_c07.png',
    "主页_他人1_r01_c08": '/static/assets/images/profile-other1-split/主页_他人1_r01_c08.png',
    "主页_他人1_r02_c01": '/static/assets/images/profile-other1-split/主页_他人1_r02_c01.png',
    "主页_他人1_r02_c02": '/static/assets/images/profile-other1-split/主页_他人1_r02_c02.png',
    "主页_他人1_r02_c03": '/static/assets/images/profile-other1-split/主页_他人1_r02_c03.png',
    "主页_他人1_r02_c04": '/static/assets/images/profile-other1-split/主页_他人1_r02_c04.png',
    "主页_他人1_r02_c05": '/static/assets/images/profile-other1-split/主页_他人1_r02_c05.png',
    "主页_他人1_r02_c06": '/static/assets/images/profile-other1-split/主页_他人1_r02_c06.png',
    "主页_他人1_r03_c01": '/static/assets/images/profile-other1-split/主页_他人1_r03_c01.png',
    "主页_他人1_r03_c02": '/static/assets/images/profile-other1-split/主页_他人1_r03_c02.png',
    "主页_他人1_r03_c03": '/static/assets/images/profile-other1-split/主页_他人1_r03_c03.png',
    "主页_他人1_r03_c04": '/static/assets/images/profile-other1-split/主页_他人1_r03_c04.png',
    "主页_他人1_r03_c05": '/static/assets/images/profile-other1-split/主页_他人1_r03_c05.png',
    "主页_他人1_r03_c06": '/static/assets/images/profile-other1-split/主页_他人1_r03_c06.png',
    "主页_他人1_r04_c01": '/static/assets/images/profile-other1-split/主页_他人1_r04_c01.png',
    "主页_他人1_r04_c02": '/static/assets/images/profile-other1-split/主页_他人1_r04_c02.png',
    "主页_他人1_r04_c03": '/static/assets/images/profile-other1-split/主页_他人1_r04_c03.png',
    "主页_他人1_r04_c04": '/static/assets/images/profile-other1-split/主页_他人1_r04_c04.png',
    "主页_他人1_r05_c01": '/static/assets/images/profile-other1-split/主页_他人1_r05_c01.png',
    "主页_他人1_r05_c02": '/static/assets/images/profile-other1-split/主页_他人1_r05_c02.png',
    "主页_他人1_r05_c03": '/static/assets/images/profile-other1-split/主页_他人1_r05_c03.png',
    "主页_他人1_r05_c04": '/static/assets/images/profile-other1-split/主页_他人1_r05_c04.png',
    "主页_他人1_r05_c05": '/static/assets/images/profile-other1-split/主页_他人1_r05_c05.png',
    "主页_他人1_r05_c06": '/static/assets/images/profile-other1-split/主页_他人1_r05_c06.png',
    "主页_他人1_r05_c07": '/static/assets/images/profile-other1-split/主页_他人1_r05_c07.png',
    "主页_他人1_r05_c08": '/static/assets/images/profile-other1-split/主页_他人1_r05_c08.png',
    "主页_他人1_r05_c09": '/static/assets/images/profile-other1-split/主页_他人1_r05_c09.png',
    "主页_他人1_r06_c01": '/static/assets/images/profile-other1-split/主页_他人1_r06_c01.png',
    "主页_他人1_r06_c02": '/static/assets/images/profile-other1-split/主页_他人1_r06_c02.png',
    "主页_他人1_r06_c03": '/static/assets/images/profile-other1-split/主页_他人1_r06_c03.png',
    "主页_他人1_r06_c04": '/static/assets/images/profile-other1-split/主页_他人1_r06_c04.png',
    "主页_他人1_r06_c05": '/static/assets/images/profile-other1-split/主页_他人1_r06_c05.png',
    "主页_他人1_r06_c06": '/static/assets/images/profile-other1-split/主页_他人1_r06_c06.png',
    "主页_他人1_r06_c07": '/static/assets/images/profile-other1-split/主页_他人1_r06_c07.png',
    "主页_他人1_r07_c01": '/static/assets/images/profile-other1-split/主页_他人1_r07_c01.png',
    "主页_他人1_r07_c02": '/static/assets/images/profile-other1-split/主页_他人1_r07_c02.png',
    "主页_他人1_r07_c03": '/static/assets/images/profile-other1-split/主页_他人1_r07_c03.png',
    "主页_他人1_r07_c04": '/static/assets/images/profile-other1-split/主页_他人1_r07_c04.png',
    "主页_他人1_r07_c05": '/static/assets/images/profile-other1-split/主页_他人1_r07_c05.png',
    "主页_他人1_r07_c06": '/static/assets/images/profile-other1-split/主页_他人1_r07_c06.png',
    "主页_他人1_r07_c07": '/static/assets/images/profile-other1-split/主页_他人1_r07_c07.png',
    "主页_他人1_r07_c08": '/static/assets/images/profile-other1-split/主页_他人1_r07_c08.png',
    "主页_他人1_r07_c09": '/static/assets/images/profile-other1-split/主页_他人1_r07_c09.png',
    "主页_他人1_r08_c01": '/static/assets/images/profile-other1-split/主页_他人1_r08_c01.png',
    "主页_他人1_r08_c02": '/static/assets/images/profile-other1-split/主页_他人1_r08_c02.png',
    "主页_他人1_r08_c03": '/static/assets/images/profile-other1-split/主页_他人1_r08_c03.png',
    "主页_他人1_r08_c04": '/static/assets/images/profile-other1-split/主页_他人1_r08_c04.png',
    "主页_他人1_r08_c05": '/static/assets/images/profile-other1-split/主页_他人1_r08_c05.png',
    "主页_他人1_r09_c01": '/static/assets/images/profile-other1-split/主页_他人1_r09_c01.png',
    "主页_他人1_r09_c02": '/static/assets/images/profile-other1-split/主页_他人1_r09_c02.png',
    "主页_他人1_r09_c03": '/static/assets/images/profile-other1-split/主页_他人1_r09_c03.png',
    "主页_他人1_r09_c04": '/static/assets/images/profile-other1-split/主页_他人1_r09_c04.png',
    "主页_他人1_r09_c05": '/static/assets/images/profile-other1-split/主页_他人1_r09_c05.png',
    "主页_他人1_r09_c06": '/static/assets/images/profile-other1-split/主页_他人1_r09_c06.png',
    "主页_他人1_r09_c07": '/static/assets/images/profile-other1-split/主页_他人1_r09_c07.png',
    "主页_他人1_r09_c08": '/static/assets/images/profile-other1-split/主页_他人1_r09_c08.png',
    "主页_他人1_r09_c09": '/static/assets/images/profile-other1-split/主页_他人1_r09_c09.png',
    "主页_他人1_r09_c10": '/static/assets/images/profile-other1-split/主页_他人1_r09_c10.png',
    "图标预览_联系表": '/static/assets/images/profile-other1-split/图标预览_联系表.png',
  },

  /** 他人主页2拆分素材 */
  PROFILE_OTHER2_SPLIT: {
    "主页_他人2_r01_c01": '/static/assets/images/profile-other2-split/主页_他人2_r01_c01.png',
    "主页_他人2_r01_c02": '/static/assets/images/profile-other2-split/主页_他人2_r01_c02.png',
    "主页_他人2_r01_c03": '/static/assets/images/profile-other2-split/主页_他人2_r01_c03.png',
    "主页_他人2_r01_c04": '/static/assets/images/profile-other2-split/主页_他人2_r01_c04.png',
    "主页_他人2_r01_c05": '/static/assets/images/profile-other2-split/主页_他人2_r01_c05.png',
    "主页_他人2_r02_c01": '/static/assets/images/profile-other2-split/主页_他人2_r02_c01.png',
    "主页_他人2_r02_c02": '/static/assets/images/profile-other2-split/主页_他人2_r02_c02.png',
    "主页_他人2_r02_c03": '/static/assets/images/profile-other2-split/主页_他人2_r02_c03.png',
    "主页_他人2_r02_c04": '/static/assets/images/profile-other2-split/主页_他人2_r02_c04.png',
    "主页_他人2_r02_c05": '/static/assets/images/profile-other2-split/主页_他人2_r02_c05.png',
    "主页_他人2_r02_c06": '/static/assets/images/profile-other2-split/主页_他人2_r02_c06.png',
    "主页_他人2_r03_c01": '/static/assets/images/profile-other2-split/主页_他人2_r03_c01.png',
    "主页_他人2_r03_c02": '/static/assets/images/profile-other2-split/主页_他人2_r03_c02.png',
    "主页_他人2_r03_c03": '/static/assets/images/profile-other2-split/主页_他人2_r03_c03.png',
    "主页_他人2_r04_c01": '/static/assets/images/profile-other2-split/主页_他人2_r04_c01.png',
    "主页_他人2_r04_c02": '/static/assets/images/profile-other2-split/主页_他人2_r04_c02.png',
    "主页_他人2_r04_c03": '/static/assets/images/profile-other2-split/主页_他人2_r04_c03.png',
    "主页_他人2_r05_c01": '/static/assets/images/profile-other2-split/主页_他人2_r05_c01.png',
    "主页_他人2_r05_c02": '/static/assets/images/profile-other2-split/主页_他人2_r05_c02.png',
    "主页_他人2_r05_c03": '/static/assets/images/profile-other2-split/主页_他人2_r05_c03.png',
    "主页_他人2_r05_c04": '/static/assets/images/profile-other2-split/主页_他人2_r05_c04.png',
    "主页_他人2_r06_c01": '/static/assets/images/profile-other2-split/主页_他人2_r06_c01.png',
    "主页_他人2_r06_c02": '/static/assets/images/profile-other2-split/主页_他人2_r06_c02.png',
    "主页_他人2_r06_c03": '/static/assets/images/profile-other2-split/主页_他人2_r06_c03.png',
    "主页_他人2_r06_c04": '/static/assets/images/profile-other2-split/主页_他人2_r06_c04.png',
    "主页_他人2_r06_c05": '/static/assets/images/profile-other2-split/主页_他人2_r06_c05.png',
    "主页_他人2_r06_c06": '/static/assets/images/profile-other2-split/主页_他人2_r06_c06.png',
    "主页_他人2_r06_c07": '/static/assets/images/profile-other2-split/主页_他人2_r06_c07.png',
    "主页_他人2_r06_c08": '/static/assets/images/profile-other2-split/主页_他人2_r06_c08.png',
    "主页_他人2_r06_c09": '/static/assets/images/profile-other2-split/主页_他人2_r06_c09.png',
    "主页_他人2_r07_c01": '/static/assets/images/profile-other2-split/主页_他人2_r07_c01.png',
    "主页_他人2_r07_c02": '/static/assets/images/profile-other2-split/主页_他人2_r07_c02.png',
    "主页_他人2_r07_c03": '/static/assets/images/profile-other2-split/主页_他人2_r07_c03.png',
    "主页_他人2_r07_c04": '/static/assets/images/profile-other2-split/主页_他人2_r07_c04.png',
    "主页_他人2_r07_c05": '/static/assets/images/profile-other2-split/主页_他人2_r07_c05.png',
    "主页_他人2_r07_c06": '/static/assets/images/profile-other2-split/主页_他人2_r07_c06.png',
    "主页_他人2_r07_c07": '/static/assets/images/profile-other2-split/主页_他人2_r07_c07.png',
    "主页_他人2_r07_c08": '/static/assets/images/profile-other2-split/主页_他人2_r07_c08.png',
    "图标预览_联系表": '/static/assets/images/profile-other2-split/图标预览_联系表.png',
  },

  /** 匹配页拆分素材 */
  MATCH_SPLIT: {
    "匹配_r01_c01": '/static/assets/images/match-split/匹配_r01_c01.png',
    "匹配_r01_c02": '/static/assets/images/match-split/匹配_r01_c02.png',
    "匹配_r01_c03": '/static/assets/images/match-split/匹配_r01_c03.png',
    "匹配_r02_c01": '/static/assets/images/match-split/匹配_r02_c01.png',
    "匹配_r02_c02": '/static/assets/images/match-split/匹配_r02_c02.png',
    "匹配_r02_c03": '/static/assets/images/match-split/匹配_r02_c03.png',
    "匹配_r02_c04": '/static/assets/images/match-split/匹配_r02_c04.png',
    "匹配_r02_c05": '/static/assets/images/match-split/匹配_r02_c05.png',
    "匹配_r02_c06": '/static/assets/images/match-split/匹配_r02_c06.png',
    "匹配_r03_c01": '/static/assets/images/match-split/匹配_r03_c01.png',
    "匹配_r03_c02": '/static/assets/images/match-split/匹配_r03_c02.png',
    "匹配_r04_c01": '/static/assets/images/match-split/匹配_r04_c01.png',
    "匹配_r04_c02": '/static/assets/images/match-split/匹配_r04_c02.png',
    "匹配_r04_c03": '/static/assets/images/match-split/匹配_r04_c03.png',
    "匹配_r05_c01": '/static/assets/images/match-split/匹配_r05_c01.png',
    "匹配_r05_c02": '/static/assets/images/match-split/匹配_r05_c02.png',
    "匹配_r05_c03": '/static/assets/images/match-split/匹配_r05_c03.png',
    "匹配_r05_c04": '/static/assets/images/match-split/匹配_r05_c04.png',
    "匹配_r05_c05": '/static/assets/images/match-split/匹配_r05_c05.png',
    "匹配_r05_c06": '/static/assets/images/match-split/匹配_r05_c06.png',
    "匹配_r05_c07": '/static/assets/images/match-split/匹配_r05_c07.png',
    "匹配_r05_c08": '/static/assets/images/match-split/匹配_r05_c08.png',
    "匹配_r06_c01": '/static/assets/images/match-split/匹配_r06_c01.png',
    "匹配_r06_c02": '/static/assets/images/match-split/匹配_r06_c02.png',
    "匹配_r07_c01": '/static/assets/images/match-split/匹配_r07_c01.png',
    "匹配_r07_c02": '/static/assets/images/match-split/匹配_r07_c02.png',
    "匹配_r07_c03": '/static/assets/images/match-split/匹配_r07_c03.png',
    "匹配_r07_c04": '/static/assets/images/match-split/匹配_r07_c04.png',
    "匹配_r07_c05": '/static/assets/images/match-split/匹配_r07_c05.png',
    "匹配_r08_c01": '/static/assets/images/match-split/匹配_r08_c01.png',
    "匹配_r08_c02": '/static/assets/images/match-split/匹配_r08_c02.png',
    "匹配_r08_c03": '/static/assets/images/match-split/匹配_r08_c03.png',
    "匹配_r08_c04": '/static/assets/images/match-split/匹配_r08_c04.png',
    "匹配_r09_c01": '/static/assets/images/match-split/匹配_r09_c01.png',
    "匹配_r09_c02": '/static/assets/images/match-split/匹配_r09_c02.png',
    "匹配_r09_c03": '/static/assets/images/match-split/匹配_r09_c03.png',
    "匹配_r10_c01": '/static/assets/images/match-split/匹配_r10_c01.png',
    "匹配_r10_c02": '/static/assets/images/match-split/匹配_r10_c02.png',
    "匹配_r10_c03": '/static/assets/images/match-split/匹配_r10_c03.png',
    "匹配_r10_c04": '/static/assets/images/match-split/匹配_r10_c04.png',
    "匹配_r10_c05": '/static/assets/images/match-split/匹配_r10_c05.png',
    "匹配_r10_c06": '/static/assets/images/match-split/匹配_r10_c06.png',
    "匹配_r10_c07": '/static/assets/images/match-split/匹配_r10_c07.png',
    "匹配_r10_c08": '/static/assets/images/match-split/匹配_r10_c08.png',
    "匹配_r10_c09": '/static/assets/images/match-split/匹配_r10_c09.png',
    "匹配_r10_c10": '/static/assets/images/match-split/匹配_r10_c10.png',
    "匹配_r11_c01": '/static/assets/images/match-split/匹配_r11_c01.png',
    "匹配_r11_c02": '/static/assets/images/match-split/匹配_r11_c02.png',
    "匹配_r11_c03": '/static/assets/images/match-split/匹配_r11_c03.png',
    "匹配_r12_c01": '/static/assets/images/match-split/匹配_r12_c01.png',
    "匹配_r12_c02": '/static/assets/images/match-split/匹配_r12_c02.png',
    "匹配_r12_c03": '/static/assets/images/match-split/匹配_r12_c03.png',
    "匹配_r12_c04": '/static/assets/images/match-split/匹配_r12_c04.png',
    "匹配_r12_c05": '/static/assets/images/match-split/匹配_r12_c05.png',
    "匹配_r12_c06": '/static/assets/images/match-split/匹配_r12_c06.png',
    "匹配_r12_c07": '/static/assets/images/match-split/匹配_r12_c07.png',
    "匹配_r13_c01": '/static/assets/images/match-split/匹配_r13_c01.png',
    "匹配_r13_c02": '/static/assets/images/match-split/匹配_r13_c02.png',
    "匹配_r13_c03": '/static/assets/images/match-split/匹配_r13_c03.png',
    "匹配_r13_c04": '/static/assets/images/match-split/匹配_r13_c04.png',
    "匹配_r14_c01": '/static/assets/images/match-split/匹配_r14_c01.png',
    "匹配_r14_c02": '/static/assets/images/match-split/匹配_r14_c02.png',
    "匹配_r14_c03": '/static/assets/images/match-split/匹配_r14_c03.png',
    "匹配_r15_c01": '/static/assets/images/match-split/匹配_r15_c01.png',
    "匹配_r15_c02": '/static/assets/images/match-split/匹配_r15_c02.png',
    "匹配_r16_c01": '/static/assets/images/match-split/匹配_r16_c01.png',
    "匹配_r16_c02": '/static/assets/images/match-split/匹配_r16_c02.png',
    "匹配_r16_c03": '/static/assets/images/match-split/匹配_r16_c03.png',
    "匹配_r16_c04": '/static/assets/images/match-split/匹配_r16_c04.png',
    "匹配_r16_c05": '/static/assets/images/match-split/匹配_r16_c05.png',
    "图标预览_联系表": '/static/assets/images/match-split/图标预览_联系表.png',
  },
} as const;






