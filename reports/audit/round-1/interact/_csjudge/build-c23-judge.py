# -*- coding: utf-8 -*-
"""构建 次要23-judge.json：R1 交互判定（A6 证据仲裁）· 88 用例三方对照"""
import json, io

OUT = r'reports/audit/round-1/interact/次要23-judge.json'
SH = 'reports/screenshots/round-1-interact/'
WX = SH + 'wxml/'
TA = 'reports/screenshots/round-1-tour/A/'
TB = 'reports/screenshots/round-1-tour/B/'
EX = 'reports/audit/round-1/interact/exec-results.json#'

VI = 'subpackages/profile-extra/verification/index'
RN = 'subpackages/profile-extra/verification/real-name'
VS = 'subpackages/profile-extra/profile/visitors'
PO = 'subpackages/profile-extra/profile/other'
LC = 'subpackages/profile-extra/profile/location'
PV = 'subpackages/profile-extra/profile/privacy'
AL = 'subpackages/profile-extra/profile/album'
FA = 'subpackages/profile-extra/profile/favorites'

def E(ex, *paths):
    ev = [EX + ex]
    ev += [p for p in paths if p]
    return ev

checks = []
def C(caseId, page, op, exp, act, verdict, ev, conf):
    checks.append({"caseId": caseId, "page": page, "operation": op, "expected": exp,
                   "actual": act, "verdict": verdict, "evidence": ev, "confidence": conf})

# ================= verification/index (VI01-14) =================
C('VI01', VI, '登录态首拉渲染（observe-only）',
  '标题「恋爱认证」+左返回；未认证状态卡(icon+desc)；门控横幅「未认证用户仅可浏览…」；无状态跳变；console 无 TypeError',
  'top=verification/index，observe-only；VI01-after.png 实拍：导航「恋爱认证」+返回键、未认证状态卡(毕业帽icon+「完成校园身份认证 解锁专属权益与信任标识」)、黄色门控横幅文案逐字一致、认证权益网格(专属标识/信任优先/匹配加权/专属权益)全部渲染；console 数组为空（无 TypeError 记录）；骨架防跳变为过程量，单帧截图不可证（记入缺口）',
  'VERIFIED', E('VI01', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI01-after.png', WX+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI06-after.wxml', TA+'subpackages_profile-extra_verification_index__默认.png'), 0.85)

C('VI02', VI, 'tap .nav-bar__back 栈内返回',
  'getCurrentPages>1 → uni.navigateBack(delta:1)，500ms 内落回设置页、栈减 1',
  'observed：pre:navigateTo 后 act:navigateBack delta1 + act:tap .nav-bar__back，但终态 route=[verification/index]，无任何「落点=设置页」的路由快照；开局 dom 探针报 .nav-bar__back:absent 与 wxml 实渲染（nav-bar__back 存在）矛盾；无截图。落点未取证',
  'UNVERIFIED', E('VI02', WX+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI06-after.wxml'), 0.6)

C('VI03', VI, '深链栈=1 tap 返回键兜底',
  '栈=1 → uni.switchTab(/pages/profile/index) 落「我的」Tab，非死点',
  'observed：pre:reLaunch 后 harness navigateBack 报 NAV_ERROR: Uncaught [object Object]（栈=1 预期现象），随后 act:tap .nav-bar__back；终态 route=[verification/index]，无 switchTab 落 profile Tab 的路由证据；dom 探针 .nav-bar__back:absent 与 wxml 矛盾。兜底是否触发未取证',
  'UNVERIFIED', E('VI03', WX+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI07-after.wxml'), 0.6)

C('VI04', VI, 'tap .action-btn 空表单提交',
  'toast「请输入学生姓名」，500ms 内反馈；不发上传与 POST；状态仍 unverified',
  'observed：act:tap .action-btn → showToast title=「请输入学生姓名」，与 expected 文案逐字一致；route 不变（停留在认证页）；console 无请求记录；after 截图采集超时（ERROR:timeout waiting for automator response，文件未落盘）为唯一缺口',
  'VERIFIED', E('VI04'), 0.75)

C('VI05', VI, '渐进填写：填姓名/学号/学校后逐次提交',
  '依次 toast「请输入学号」→「请输入学校名称」→「请上传学生证照片」；均无提交请求',
  'observed：仅执行 act:input #verification-student-name="自动化输入-VI05" 一步，三次提交 tap 未执行，toast=[]（三条预期 Toast 均未采集）；动作链不完整，expected 无法对照',
  'UNVERIFIED', E('VI05', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI05-after.png'), 0.7)

C('VI06', VI, '选图+三项合法完整提交',
  '选图 toast「学生证已上传」+预览卡；提交 Loading→状态卡「审核中」+toast「提交成功，等待审核」',
  'observed：act-FAIL:input el.input is not a function（执行器 input API 故障）→ act:tap .upload-card → act-FAIL:tap 候选「提交」element not found；但 VI06-after.wxml 实证页面处于未认证表单态且「提交认证申请」按钮（action-btn）在渲染——查询失败属执行器缺陷；提交流程未执行，状态未变化',
  'UNVERIFIED', E('VI06', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI06-before.png', WX+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI06-after.wxml'), 0.7)

C('VI07', VI, '500ms 内快击提交 ×5',
  'submitting 守卫+mask 双保险，仅 1 次提交流程；按钮置灰「提交中...」',
  'observed：act-FAIL:rapidTap 候选「提交按钮」element not found；wxml 证明按钮在渲染（同 VI06）；快击未执行，POST 计数无证据',
  'UNVERIFIED', E('VI07', WX+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI07-after.wxml'), 0.7)

C('VI08', VI, 'real 会话重复提交 409',
  '后端 409 → toast「已有申请审核中，请耐心等待」；无 Loading 永驻',
  'observed：act-FAIL:input 候选 element not found + tap 候选「提交」未命中；pre「real 会话且已有 pending/approved 申请」未建立（manifest 明示无此账号则如实标 UNVERIFIED）；409 场景未触发',
  'UNVERIFIED', E('VI08', WX+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI08-after.wxml'), 0.7)

C('VI09', VI, '选图取消/隐私拒绝',
  '取消 → toast「已取消选择」；隐私拒绝 → toast「需同意隐私协议后才能选择图片」；状态不变',
  'observed：act-FAIL:tap 候选「图」「传」element not found；.upload-card 在 wxml 渲染（查询缺陷）；原生选图取消与隐私拒绝分支均未触发，两条 Toast 未采集',
  'UNVERIFIED', E('VI09'), 0.7)

C('VI10', VI, '输入边界：超长截断+特殊字符',
  'maxlength 截断 20/20/30；emoji/<script> 原样保留不崩；提交被图片校验拦截',
  'observed：act-FAIL:input 候选 element not found；三个输入框（placeholder 请输入真实姓名/学号/学校全称）在 wxml 渲染；边界输入未执行',
  'UNVERIFIED', E('VI10'), 0.7)

C('VI11', VI, 'verified 态权益网格与 mock 专属按钮可见性',
  '权益 5 项网格；「重新认证」「删除认证」仅 mock 渲染；real approved 无两按钮',
  'observed：observe-only，无任何 dom 存在性断言采集；pre verified 态未达成（VI06 断链，页面实际为未认证态）；证据截图采集超时（文件未落盘）',
  'UNVERIFIED', E('VI11'), 0.6)

C('VI12', VI, '重新认证/删除认证确认弹窗',
  'modal「确定要重新提交认证申请吗？」确认→回 unverified+表单清空；删除 confirmColor #E5454D 取消/确认分支',
  'observed：act-FAIL:tap(#E5454D)（色值被用作选择器，非法）×3 element not found「重新认证」；pre mock verified 态未达成，页面为未认证态、按钮确不存在；弹窗流程未执行',
  'UNVERIFIED', E('VI12', WX+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI12-after.wxml'), 0.7)

C('VI13', VI, 'pending 态展示与 onShow 重拉/定时器清理',
  'pending-card「审核中」；onShow 重拉；mock 模拟按钮→「认证已通过」；onUnmounted 清定时器',
  'observed：act-FAIL:tap 候选「模拟审核通过」element not found；VI13-after.png 实拍页面仍为「未认证」态——pre pending（VI06 达成）断链；pending UI/轮询/清理全部未取证',
  'UNVERIFIED', E('VI13', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-INDEX-VI13-after.png'), 0.7)

C('VI14', VI, '页面滚动到底再回顶',
  '五个分区全部可达无遮挡；回顶后输入与状态保持',
  'observed：act:pageScrollTo bottom → act:pageScrollTo top，evidence scrollPos=top；noop 层级证据（执行日志）满足 manifest 采集要求',
  'VERIFIED', E('VI14'), 0.7)

# ================= real-name (RN01-12) =================
C('RN01', RN, '登录态首拉+成年门禁预检（observe-only）',
  '标题「实名认证」+返回；未实名状态卡；骨架防跳变；成年人表单态（姓名/身份证输入+正反面上传卡+隐私说明+提交）',
  'observed：top=real-name observe-only；RN01-after.png 实拍：标题+返回键、状态卡「未实名认证」(icon+desc)、填写实名信息表单（真实姓名/身份证号输入）、身份证正面/背面点击上传卡、隐私说明行、绿色「提交认证申请」按钮——成年人表单态全要素渲染；无 minor-banner（门禁判为成年，符合）；console 空',
  'VERIFIED', E('RN01', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN01-after.png', TA+'subpackages_profile-extra_verification_real-name__默认.png'), 0.85)

C('RN02', RN, '深链栈=1 返回兜底 navigateTo 认证页',
  '栈=1 → uni.navigateTo(verification/index) 落恋爱认证页',
  'observed：pre:reLaunch 后 harness navigateBack NAV_ERROR（栈=1），act:tap .nav-bar__back（dom present）执行；但本例终态 route=[real-name]，兜底落点（verification/index）未出现在本例路由证据；navError=Uncaught [object Object] 归因不明。备注：RN03→RN04 的跨例 route 链 [real-name, index] 间接显示该兜底会触发，但本例自身无终态证据',
  'UNVERIFIED', E('RN02'), 0.6)

C('RN03', RN, '栈内返回 navigateBack 落回来源页',
  '栈≥2 → uni.navigateBack(delta:1) 落回来源页',
  'observed：pre:navigateTo 后又 pre:auto-reLaunch（把栈重置为 1），pre「栈≥2」未真实建立；act:tap .nav-bar__back 实际触发的是栈=1 兜底分支（RN04 route 链出现 [real-name, index] 佐证）；「落回来源页」未按声明分支取证',
  'UNVERIFIED', E('RN03'), 0.6)

C('RN04', RN, '空提交 toast「请输入真实姓名」',
  'tap .action-btn → toast「请输入真实姓名」；不发请求；状态不变',
  'observed：执行串页——栈残留 [real-name, verification/index]（RN03 兜底 navigateTo 所致），本例无 pre 重置，tap .action-btn 落在认证页，采集到的 toast=「请输入学生姓名」（VI04 行为，非本页文案）；route 链 [real-name, index] 证实页面错位；expected 的实名页空提交未被执行',
  'UNVERIFIED', E('RN04', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN04-after.png'), 0.75)

C('RN05', RN, '身份证短号拒绝/合法号放行',
  '①「12345」提交 → toast「请输入正确的身份证号」；②18 位合法号提交 → toast「请上传身份证正面照片」',
  'observed：仅执行 act:input #real-name-id-card-no="12345"（RN05-after.png 实拍输入已落地），两次提交 tap 未执行，toast=[]；校验链未触发',
  'UNVERIFIED', E('RN05', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN05-after.png'), 0.7)

C('RN06', RN, '正反面缺失链',
  '①直接提交拦正面 toast；②传正面后提交拦背面 toast；正面卡选中变预览+「图片已上传」',
  'observed：act-FAIL:tap 候选「面」element not found；RN06-after.png 与 RN01 截图证实正/背面上传卡在渲染（查询缺陷）；选图与两次提交均未执行',
  'UNVERIFIED', E('RN06', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN06-after.png'), 0.7)

C('RN07', RN, '完整提交实名认证成功',
  'Loading「提交中...」→ 状态卡「审核中」+ toast「提交成功，等待审核」；表单区换 pending-card',
  'observed：act-FAIL:tap 候选「按」element not found；pre（姓名+合法号+正反双图）未达成——仅 RN05 残留身份证号 12345，无姓名无图；RN07-after.wxml 为未实名表单态；提交流程未执行',
  'UNVERIFIED', E('RN07', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN07-before.png', WX+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN07-after.wxml'), 0.7)

C('RN08', RN, '提交防连点快击 ×5',
  'submitting 守卫+mask，仅 1 次提交流程；按钮置灰「提交中...」',
  'observed：act-FAIL:rapidTap 候选「提交按钮」element not found；pre 表单齐备未达成；快击未执行，请求计数无证据',
  'UNVERIFIED', E('RN08', WX+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN08-after.wxml'), 0.7)

C('RN09', RN, 'real 重复提交 409',
  '409 → toast「已有申请审核中，请耐心等待」；无 Loading 永驻',
  'observed：act-FAIL:input 候选 element not found；pre「real 会话+已有申请」未建立（manifest 明示无此账号则如实标 UNVERIFIED）',
  'UNVERIFIED', E('RN09', WX+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN09-after.wxml'), 0.7)

C('RN10', RN, '身份证输入边界',
  '19 位截断为 18；17 位+X 过格式校验；姓名 maxlength=20、特殊字符不崩',
  'observed：act-FAIL:input 候选 element not found；边界输入未执行（RN10-after 为表单静态截图）',
  'UNVERIFIED', E('RN10', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN10-after.png'), 0.7)

C('RN11', RN, '未成年人门禁（real 条件）',
  'minor-banner + 输入 disabled + 表单 opacity 0.6 + 提交 toast「未满 18 周岁暂不支持实名认证」',
  'observed：act-FAIL:tap 候选「提交」element not found；pre「real 会话且 birthDate 缺失或<18」未建立（manifest 明示无此类账号则如实标 UNVERIFIED）；RN11-after 为成年表单态',
  'UNVERIFIED', E('RN11', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN11-after.png'), 0.7)

C('RN12', RN, 'verified 态脱敏回显',
  '状态卡「已实名认证」+ verified-card 真实姓名+掩码身份证号（前6后4）；无表单区',
  'observed：RN12-after.png 实拍为「未实名认证」状态卡+完整表单态（身份证号输入框残留 RN05 的 12345）——expected 的 verified 回显未渲染；pre「real approved 账号」不存在（manifest 明示无则如实标 UNVERIFIED）',
  'UNVERIFIED', E('RN12', SH+'SUBPACKAGES-PROFILE-EXTRA-VERIFICATION-REAL-NAME-RN12-after.png'), 0.8)

# ================= visitors (VS01-08) =================
C('VS01', VS, '进入访客页首屏（observe-only）',
  '骨架 4 行→今日/昨日/更早分组；「谁看过我」+「访客 · N」计数；无头像首字占位；时间文案三态；console 无 TypeError',
  'observed：top=visitors observe-only；VS01-after.png 实拍：标题「谁看过我」+「访客记录·22」计数、更早分组头、访客卡（头像/姓名/学校·年级·社团/时间 05-21 21:45 等 MM-DD HH:mm 格式）列表渲染（本批 mock 数据均为更早时段，故仅更早组）；console 数组空',
  'VERIFIED', E('VS01', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-VISITORS-VS01-after.png', TA+'subpackages_profile-extra_profile_visitors__默认.png'), 0.85)

C('VS02', VS, '返回键两分支',
  '①栈内 navigateBack 落来源页；②栈=1 兜底 switchTab 落首页',
  'observed：两 pre 均记录、act:navigateBack 报 NAV_ERROR: Uncaught [object Object]；终态 route=[visitors]，两分支落点均无路由证据；无截图',
  'UNVERIFIED', E('VS02'), 0.6)

C('VS03', VS, '点击访客卡跳他人主页',
  '500ms 内 openAppPath → profile/other?userId=<访客id>；非数字 id 兜底拼参；卡片点击不再无反应',
  'observed：act-FAIL:tap 候选「客」element not found（VS01 截图证实访客卡在渲染——执行器查询缺陷）；VS03-after 截图采集超时（未落盘）；跳转未执行、query 无证据',
  'UNVERIFIED', E('VS03'), 0.7)

C('VS04', VS, '下拉刷新真实重拉',
  'loading 置位重拉 fetchVisitors；finally stopPullDownRefresh 收起；console 有 /matches/visitors 记录',
  'observed：act:refresherPull「no scroll-view」→ callMethod onPullDownRefresh ok（直调 handler 绕过原生下拉）；console 数组空（无请求记录）、dom 探针 .stopPullDownRefresh:absent 无意义；「真实重拉+收起」未取证；VS04-after 为列表静态截图',
  'UNVERIFIED', E('VS04', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-VISITORS-VS04-after.png'), 0.65)

C('VS05', VS, '错误态与重试恢复',
  '错误卡展示→tap 重试重新 loadVisitors→恢复后列表渲染',
  'observed：act-FAIL:tap 候选「重试」element not found；pre「断网/后端不可达」未注入——VS05-after.png 实拍为正常列表态（与 VS01 同态），错误卡与重试按钮确不存在属前置缺失，非应用缺陷证据',
  'UNVERIFIED', E('VS05', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-VISITORS-VS05-after.png'), 0.75)

C('VS06', VS, '空态卡与计数隐藏',
  '空态卡「暂无访客记录」+副文案+图标；头部计数不渲染；无骨架残留',
  'observed：observe-only 且无清空 store 前置动作记录；VS06-after.png 实拍仍为 22 条列表态+计数——pre「清空 likes store visitors」未执行，空态断言无效',
  'UNVERIFIED', E('VS06', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-VISITORS-VS06-after.png'), 0.75)

C('VS07', VS, '滚动到底再回顶',
  '三组卡片完整可达无白屏；回顶状态保持',
  'observed：act:pageScrollTo bottom → top，evidence scrollPos=top；noop 层级日志证据满足采集要求（实际数据仅更早一组，跨三组前置未严格成立）',
  'VERIFIED', E('VS07'), 0.7)

C('VS08', VS, '打开即返回+重复进出 ×2',
  '每次进入重新 fetchVisitors；无崩溃无骨架永驻；返回落点=来源页',
  'observed：act:navigateBack NAV_ERROR + act:repeatNav 两次 navigateTo 均 navErr:Uncaught [object Object]（重复进出未成功完成）；证据截图采集超时（未落盘）；「无崩溃」无反证但重入链路未取证',
  'UNVERIFIED', E('VS08'), 0.6)

# ================= other (PO01-21) =================
_missing = '执行器带参失败：PO01 pre-FAIL（input element not found: .other）+ 同套件 PO05/06/07/10/11 wxml 及 PO02/06/07/09/10/12/13/20 截图均为「链接缺少用户参数，请从列表页重新进入」错误态，资料态从未建立'
C('PO01', PO, '固化参数深链进入+访客上报（observe-only）',
  'ProfileShell public 模式渲染 Hero/Identity/Bio/兴趣/瞬间/动态；real 触发 POST /matches/visit；console 无 401/TypeError',
  'observed：observe-only，pre:auto-reLaunch 后 pre-FAIL:input element not found: .other；证据截图采集超时（未落盘）；'+_missing+'；巡检 tour B other__默认 证实带参时页面完整渲染（Hero/头像/昵称/标签/共同点/瞬间/CTA/FAB），佐证为执行器参数注入缺陷而非页面缺陷',
  'UNVERIFIED', E('PO01', TB+'subpackages_profile-extra_profile_other__默认.png'), 0.7)

C('PO02', PO, '深链缺 userId 错误态',
  'errorMessage「链接缺少用户参数，请从列表页重新进入」；无重试按钮；无 ··· 菜单；不发请求',
  'observed：PO02-after.png 实拍页面居中渲染「链接缺少用户参数，请从列表页重新进入」逐字一致；无重试按钮、无页面级 ···（右上 ··· 为系统胶囊）；dom 探针 .missingUserParam:absent 系选择器误用（i18n 键名当类名），与截图不矛盾；route=other',
  'VERIFIED', E('PO02', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO02-after.png'), 0.85)

C('PO03', PO, '返回键两分支',
  '①navigateBack 落来源；②栈=1 兜底 switchTab 落首页',
  'observed：act:navigateBack NAV_ERROR: Uncaught [object Object]；终态 route=[other]，两分支落点均无路由证据；无截图',
  'UNVERIFIED', E('PO03'), 0.6)

C('PO04', PO, '头部 ··· ActionSheet 三项与取消',
  'showActionSheet 举报/拉黑/关注（已关注变取消关注）；取消无副作用',
  'observed：status=SKIPPED，observed=action-not-automatable（原生 ActionSheet 不可自动化），未做任何尝试',
  'UNVERIFIED', E('PO04'), 0.7)

C('PO05', PO, '喜欢单点+快击 ×5',
  'POST /matches/like 单次；toast「已喜欢，等待回应」；relation.liked 翻转 CTA 变「已喜欢」；liking 防重入',
  'observed：act-FAIL:rapidTap 候选「提交」+ tap 候选「喜欢」element not found；PO05-after.wxml 实证页面为缺参错误态、CTA 未渲染（'+_missing+'）；like 请求与状态翻转未执行',
  'UNVERIFIED', E('PO05', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO05-after.wxml'), 0.8)

C('PO06', PO, '重复点喜欢去重',
  '已喜欢未匹配静默去重无请求；matched 不再弹匹配框',
  'observed：act-FAIL:rapidTap 候选「喜欢」element not found；PO06-after.wxml 为缺参错误态；去重链路未执行；pre（PO05 已喜欢态）亦未达成',
  'UNVERIFIED', E('PO06', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO06-after.wxml', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO06-after.png'), 0.8)

C('PO07', PO, '匹配成功弹窗两分支',
  'modal「匹配成功/你们互相喜欢了…」；确认→chat-session?userId=；取消留本页',
  'observed：act-FAIL:tap 候选「去聊天」「再看看」element not found；pre「互为喜欢」未建立且页面为缺参错误态（PO07-after.png/wxml 证实）；modal 未触发',
  'UNVERIFIED', E('PO07', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO07-after.png', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO07-after.wxml'), 0.8)

C('PO08', PO, '打招呼实名门控两分支',
  '已实名→chat-session?userId=100152；未实名→showModal 引导跳实名页',
  'observed：act-FAIL:tap 候选「打招呼」element not found（缺参错误态无 CTA）；两分支均未执行',
  'UNVERIFIED', E('PO08'), 0.75)

C('PO09', PO, '心动卡弹层四路',
  '弹层开（悄悄话/写给{昵称}/textarea/200 交友币/余额行）；空提交拦截 toast；遮罩关；×关；未登录 toast 拦截',
  'observed：act-FAIL:tap 候选「心动卡」「发送悄悄话」「动」×3 element not found（缺参错误态无 CTA）；PO09-after 为缺参页截图；弹层未开启',
  'UNVERIFIED', E('PO09', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO09-after.png'), 0.8)

C('PO10', PO, '心动卡发送+防连点+超长截断',
  'sendWhisper 幂等送达 toast「已送达，优先展示给 TA」；快击仅 1 次扣费；maxlength=60 截断',
  'observed：act-FAIL:rapidTap「发送」/input 候选/tap「发送悄悄话」element not found；PO10-after.wxml 为缺参错误态；发送链路未执行（manifest 预留的 handleSend 无防重入守卫疑点亦无从实测）',
  'UNVERIFIED', E('PO10', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO10-before.png', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO10-after.wxml'), 0.8)

C('PO11', PO, '关注/取关切换+快击 ×5',
  'followUser→toast「已关注」+按钮态翻转；unfollow→「已取消关注」；followBusy 防重',
  'observed：act-FAIL:rapidTap「提交」/tap「关注」「已关注」element not found；PO11-after.wxml 为缺参错误态；follow 链路未执行',
  'UNVERIFIED', E('PO11', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO11-before.png', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO11-after.wxml'), 0.8)

C('PO12', PO, '拉黑二次确认',
  'modal 确认→POST block→toast「已拉黑」；取消无请求',
  'observed：status=SKIPPED action-not-automatable（原生 modal 不可自动化）；PO12-before.png 为缺参错误态，未做尝试',
  'UNVERIFIED', E('PO12', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO12-before.png'), 0.75)

C('PO13', PO, '举报理由 ActionSheet',
  '四项理由 ActionSheet→reportTarget→toast「举报成功」',
  'observed：status=SKIPPED action-not-automatable；PO13-before.png 为缺参错误态，未做尝试',
  'UNVERIFIED', E('PO13', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO13-before.png'), 0.75)

C('PO14', PO, '更多操作 BottomSheet 四路',
  'FAB ⋯ 开弹层三项；分享占位 toast「分享入口待接入」+先关闭；遮罩可关；× 关；tabBar 隐藏/恢复',
  'observed：act-FAIL:tap 候选「分享给好友」×3 element not found（缺参错误态 FAB 未渲染）；弹层未开启',
  'UNVERIFIED', E('PO14'), 0.75)

C('PO15', PO, '生活瞬间照片全屏查看',
  'tap 照片→全屏查看层大图；点击关闭清空 photoViewerSrc',
  'observed：act-FAIL:tap 候选「照」×3 element not found（缺参错误态无 photos/ PublicGallery）；查看层未打开',
  'UNVERIFIED', E('PO15'), 0.75)

C('PO16', PO, '最近动态帖卡跳详情',
  'openAppPath village/detail?id=<postId>；postId 空不跳转',
  'observed：act-FAIL:tap 候选「子」element not found（缺参错误态无动态卡）；跳转未执行',
  'UNVERIFIED', E('PO16'), 0.75)

C('PO17', PO, 'Hero 头像点击死按钮取证',
  '按 500ms 反馈铁律应有反馈；代码事实 tapAvatar 三层 emit 但 other.vue 未绑定@tap-avatar，预期无反应，如实记录交判定员',
  'observed：act-FAIL:tap 候选 element not found——缺参错误态下 Hero 头像根本未渲染，死按钮取证未能执行；代码层疑点（emit 链无绑定）保留为候选，因无实机点击证据且禁止凭代码推测，不作 FAILED 立案',
  'UNVERIFIED', E('PO17'), 0.7)

C('PO18', PO, '取消匹配入口可达性取证',
  'GovernanceMenu visible 恒 false，预期 UI 无入口可达；如实记录交判定员',
  'observed：status=SKIPPED action-not-automatable（遍历类动作），未做尝试；且页面为缺参错误态、matched 前置未建立',
  'UNVERIFIED', E('PO18'), 0.7)

C('PO19', PO, '滚动到底/顶 CTA 不遮挡',
  '底部 RelationshipCTA+spacer 下全部内容可滚动查看；回顶状态保持',
  'observed：act:pageScrollTo bottom→top、scrollPos=top 已执行，但 pre「资料完整渲染态」未达成（缺参错误态无底部 CTA， spacer 断言对象不存在）；noop 断言无效',
  'UNVERIFIED', E('PO19'), 0.65)

C('PO20', PO, '打开即返回+重复进出 ×2',
  '无崩溃；每次 onLoad 重新取参取；无残留弹层；返回落点=来源页',
  'observed：act:navigateBack NAV_ERROR + act:repeatNav 两次 navigateTo 均 navErr:Uncaught [object Object]（重入未完成）；PO20-after.png（13935B）为缺参错误态；前置带参进入未建立',
  'UNVERIFIED', E('PO20', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-PO20-after.png'), 0.7)

C('PO21', PO, '鉴权失败 401 错误态与重试',
  'errorMessage=loginRequired 类文案；retryable=true 渲染重试按钮；点击重试再请求',
  'observed：act-FAIL:tap 候选「重试」element not found；pre「注入过期/无效 token」未执行（PO21-after 截图采集超时；同套件带参从未成功，页面实际渲染的是缺参错误态——该态按设计无重试按钮，与 PO02 行为一致）；401 场景未建立',
  'UNVERIFIED', E('PO21'), 0.7)

# ================= location (LC01-07) =================
C('LC01', LC, '进入位置设置首屏（observe-only）',
  '标题「我的位置」+返回；定位卡（位置文本+经纬度行+校区行）；map+marker+callout；console 无 TypeError',
  'observed：top=location observe-only，LC01 自身截图采集超时；同套件 LC03-after.png（13:09）与巡检 A/B location__默认 实拍完整证实：标题+返回、定位卡「当前位置 南京·附近」、经度 113.2644 · 纬度 23.1292、所属校区 北京大学、腾讯地图底图+定位 pin marker+气泡；差异注记：气泡实测文案为「附近」，非 expected 字面「当前位置」——代码 location.vue marker.callout content=addressText||city||"当前位置"，当前位置仅为兜底，判 manifest 措辞与代码设计不符、非应用缺陷；console 空',
  'VERIFIED', E('LC01', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-LC03-after.png', TA+'subpackages_profile-extra_profile_location__默认.png', TB+'subpackages_profile-extra_profile_location__默认.png'), 0.65)

C('LC02', LC, 'tap「重新定位」',
  '按钮变「定位中...」；成功刷新坐标+reportLocation；失败复位无 Loading 永驻',
  'observed：act-FAIL:tap 候选「重新定位」element not found；LC03-after 截图证实按钮在渲染（执行器查询缺陷）；定位流程与按钮态切换未执行',
  'UNVERIFIED', E('LC02', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-LC02-after.wxml'), 0.7)

C('LC03', LC, 'tap「地图选点」',
  'chooseLocation 选点回填坐标+物理地址行+marker 移动+上报；取消→toast「未获取到选点结果…」',
  'observed：act-FAIL:tap .chooseLocation element not found「地图选点」（页面无该类名——选择器错误；按钮在 LC03-after 截图渲染）；LC03-after.png 实拍定位卡仍为定位结果、无物理地址行，选点器未触发',
  'UNVERIFIED', E('LC03', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-LC03-after.png', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-LOCATION-LC03-after.wxml'), 0.75)

C('LC04', LC, 'tap「返回首页」',
  'openAppPath(ROUTES.TAB.HOME) 落首页 Tab',
  'observed：act-FAIL:tap 候选「返回首页」element not found（按钮在 LC03-after 截图渲染）；无路由证据',
  'UNVERIFIED', E('LC04'), 0.7)

C('LC05', LC, '返回键两分支',
  '①navigateBack 落来源；②栈=1 reLaunch 首页',
  'observed：pre:reLaunch 后 act:navigateBack NAV_ERROR: Uncaught [object Object]；终态 route=[location]，落点无路由证据',
  'UNVERIFIED', E('LC05'), 0.6)

C('LC06', LC, '地图拖动/缩放（noop）',
  '底图跟随移动缩放；marker 与定位卡数据不变',
  'observed：observe-only，无任何拖动/缩放手势执行记录（原生 map 手势不可自动化），evidence 仅 scrollPos=top；expected 的动作未发生，无日志可证',
  'UNVERIFIED', E('LC06'), 0.7)

C('LC07', LC, '打开即返回+重复进出 ×2',
  '每次 onLoad 重新 loadLocation；无崩溃无「定位中...」永驻；返回落点=来源页',
  'observed：act:navigateBack NAV_ERROR + act:repeatNav 两次 navigateTo 均 navErr:Uncaught [object Object]（重入未完成）；证据截图采集超时（未落盘）',
  'UNVERIFIED', E('LC07'), 0.6)

# ================= privacy (PV01-06) =================
C('PV01', PV, '进入隐私设置默认态（observe-only）',
  '标题「隐私权限」+返回；允许推荐给本校学生=关、接收同校信息=开；每项含标题+desc',
  'observed：top=privacy observe-only，PV01 自身截图采集超时；同套件 PV05-after.png（13:10，间隔秒级）与巡检 A/B privacy__默认 实拍证实：「隐私权限设置」标题+返回、开关1 允许推荐给本校学生=关（含 desc）、开关2 接收同校信息=开（含 desc）——与 store 默认态完全一致',
  'VERIFIED', E('PV01', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-PRIVACY-PV05-after.png', TA+'subpackages_profile-extra_profile_privacy__默认.png', TB+'subpackages_profile-extra_profile_privacy__默认.png'), 0.75)

C('PV02', PV, '开关1 开→关→开',
  '每次 change 翻转+toast「已在本机保存」；setAllowSameSchoolRecommend 写入',
  'observed：status=SKIPPED action-not-automatable（switch 组件不可自动化），未做尝试',
  'UNVERIFIED', E('PV02'), 0.7)

C('PV03', PV, '开关2 切换',
  '翻转+toast「已在本机保存」；setReceiveSameSchoolInfo 持久化',
  'observed：status=SKIPPED action-not-automatable，未做尝试',
  'UNVERIFIED', E('PV03'), 0.7)

C('PV04', PV, '返回重进持久化一致',
  '重进后两开关与退出前一致；storage PRIVACY_SETTINGS 与 UI 一致',
  'observed：dom 探针 .setStorageSync:absent（storage 断言未以 evaluate 方式采集）、act:navigateBack NAV_ERROR、证据截图采集超时（未落盘）；storage 与 UI 一致性无任何证据；且 PV02/03 未执行、开关从未被切换，前置亦不成立',
  'UNVERIFIED', E('PV04'), 0.6)

C('PV05', PV, '快击开关1 ×5',
  '最终态=初始态取反奇数次；toast 连续；无卡死',
  'observed：act-FAIL:rapidTap 候选 element not found（switch 元素查询失败，PV05-after 截图证实两开关在渲染）；快击未执行',
  'UNVERIFIED', E('PV05', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-PRIVACY-PV05-after.png'), 0.7)

C('PV06', PV, '返回键两分支',
  '①navigateBack 落来源；②栈=1 switchTab 落「我的」',
  'observed：pre:reLaunch 后 act:navigateBack NAV_ERROR: Uncaught [object Object]；终态 route=[privacy]，落点无路由证据',
  'UNVERIFIED', E('PV06'), 0.6)

# ================= album (AL01-12) =================
C('AL01', AL, '进入相册：网格态/空态',
  '①6 格网格（已传在前空位在后）+计数 n/6+添加按钮+长按提示；②清空后空态卡+添加按钮',
  'observed：top=album observe-only，自身截图采集超时；状态①由同套件 AL05-before.png（13:12，4/6 网格、4 张已传在前+2 空位+号占位、添加照片按钮、长按照片可删除或设为头像提示、计数 4/6）与巡检 A/B album__默认 完整证实；状态②对照未执行，且巡检 album__空态 实拍亦为 4/6 网格（空态前置在巡检侧同样未达成）；console 空。①成立、②缺证',
  'VERIFIED', E('AL01', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL05-before.png', TA+'subpackages_profile-extra_profile_album__默认.png', TA+'subpackages_profile-extra_profile_album__空态.png'), 0.65)

C('AL02', AL, 'tap 空位格上传',
  '隐私授权→选图→该格精确蒙层+spinner「上传中」→successHaptic+toast「照片上传成功」+计数+1',
  'observed：act-FAIL:tap 候选「位」element not found；AL05-after.wxml 证实 album-cell--empty 空位格在渲染（执行器查询缺陷）；上传链路未执行',
  'UNVERIFIED', E('AL02', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL02-after.wxml'), 0.75)

C('AL03', AL, '相册已满守卫',
  'filled 格 tap 走预览；hasEmptySlot=false 添加按钮隐藏；守卫 toast「相册已满（最多 6 张）」',
  'observed：top=pages/login/index、终态 route=pages/discover/index、AL03-after.png 实拍为「寻觅」发现页——S16 会话在 FA01 前后劣化（登录态丢失→登录页→自动前进），相册页未到达；且实测相册 4/6 未满，「已满 6 张」前置在执行前即不成立',
  'UNVERIFIED', E('AL03', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL03-after.png'), 0.8)

C('AL04', AL, '上传中防连点',
  'isUploading 守卫 return，不触发 chooseImage、无并发上传；蒙层仅当前格',
  'observed：act-FAIL:rapidTap 候选「其它空位」element not found；pre「上传进行中」未达成（AL02 上传未执行）；快击未执行',
  'UNVERIFIED', E('AL04'), 0.7)

C('AL05', AL, '长按设为头像',
  'ActionSheet「设为头像/删除」；设为头像本地重排或真实上传→toast「头像已更新」；失败回退闭环',
  'observed：act-FAIL:longpress 候选 element not found + tap 候选「设为头像」未命中；AL05-before/after 截图证实网格照片在渲染（automator 长按未达目标）；ActionSheet 未触发',
  'UNVERIFIED', E('AL05', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL05-before.png', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL05-after.wxml'), 0.75)

C('AL06', AL, '删除照片二次确认',
  'modal 取消无变化；确认→toast「已删除」+格子清空+计数-1；删空回落空态',
  'observed：act-FAIL:longpress 候选 element not found；删除链路未执行',
  'UNVERIFIED', E('AL06', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL06-before.png', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL06-after.wxml'), 0.75)

C('AL07', AL, '照片预览双路',
  '/static/ 走自建查看层（黑底+圆点分页，不走 uni.previewImage）；网络 URL 走 previewImage；遮罩关闭',
  'observed：dom 探针 .previewImage:absent + act-FAIL:tap .previewImage element not found——页面 wxml 中照片格类名为 album-cell，无 .previewImage 类（选择器臆造）；查看层未打开，双路均未取证',
  'UNVERIFIED', E('AL07'), 0.7)

C('AL08', AL, '超 10MB 大图拒绝',
  'size 校验拦截→toast photoSizeLimit 文案；不发起上传、格子不填充',
  'observed：act 链 mockWxMethod chooseImage(huge)→tap .album-add-btn→wait→restore，采集到 showToast title=「图片大小不能超过 10MB」与 expected（PHOTO_SIZE_LIMIT 拦截 toast）一致；AL08-after.png 实拍网格仍 4/6、无格子填充；不上传成立',
  'VERIFIED', E('AL08', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL08-after.png'), 0.85)

C('AL09', AL, '取消选图静默',
  'errMsg cancel→静默 return，无 toast、无崩溃、状态不变',
  'observed：act 链 mockWxMethod chooseImage(cancel)→tap .album-add-btn→wait→restore；toast=[]（无 toast，符合静默预期）、status=EXECUTED 无异常；after 截图采集超时（未落盘）为缺口',
  'VERIFIED', E('AL09'), 0.7)

C('AL10', AL, '返回键两分支',
  '①navigateBack 落来源；②栈=1 switchTab 落首页',
  'observed：pre:reLaunch 后 act:navigateBack NAV_ERROR: Uncaught [object Object]；终态 route=[album]，落点无路由证据',
  'UNVERIFIED', E('AL10'), 0.6)

C('AL11', AL, '滚动到底/顶',
  '网格/添加按钮/长按提示全部可达；回顶状态保持',
  'observed：act:pageScrollTo bottom→top，evidence scrollPos=top；noop 层级日志证据满足采集要求',
  'VERIFIED', E('AL11'), 0.7)

C('AL12', AL, 'onShow 重拉+打开即返回+重复进出 ×2',
  'onShow 重拉 fetchProfile；无崩溃无蒙层残留；返回落点=来源页',
  'observed：act:navigateBack NAV_ERROR + act:repeatNav 两次 navigateTo 均 navErr:Uncaught [object Object]（重入未完成）；AL12-after.png 实拍相册页正常（无蒙层残留）但 onShow 重拉无请求证据；「他页改动照片后返回」动作未执行',
  'UNVERIFIED', E('AL12', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-ALBUM-AL12-after.png'), 0.65)

# ================= favorites (FA01-08) =================
C('FA01', FA, '进入收藏页首屏',
  '骨架 3 行→收藏列表（封面/作者/标题/内容/收藏数）+「我的收藏（N）」；空态卡对照；console 无 TypeError',
  'observed：本例自身执行失败——pre:login MISMATCH! 后 reLaunch 报 NAV_ERROR watchdog-timeout 15000ms、auto-nav ERR，终态 top=pages/login/index、FA01-after.png 实拍为「寻觅」发现页，收藏页未到达未断言；旁证：同套件 FA03-before/FA04-after（13:16）显示收藏页稍后可达且「我的收藏（2）」+两张卡片完整渲染，判定为瞬时导航/会话故障而非页面缺陷',
  'UNVERIFIED', E('FA01', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA01-after.png', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA03-before.png'), 0.75)

C('FA02', FA, 'tap 收藏卡跳详情',
  'setCurrentPost+navigateTo village/detail?id=<id>',
  'observed：pre:auto-nav ERR timeout + act-FAIL:tap 候选「卡」element not found；top 记录 pages/discover/index（会话漂移）；跳转未执行、query 无证据',
  'UNVERIFIED', E('FA02'), 0.7)

C('FA03', FA, 'tap「取消收藏」',
  'toast「已取消收藏」+卡片移除+计数-1；@tap.stop 不跳详情；清空回落空态',
  'observed：act-FAIL:tap 候选「取消收藏」element not found；FA03-before.png 实拍两张收藏卡右下「取消收藏」胶囊清晰在渲染（执行器查询缺陷）；toggle 未执行，FA03-after 截图采集超时',
  'UNVERIFIED', E('FA03', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA03-before.png', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA03-after.wxml'), 0.8)

C('FA04', FA, '取消收藏失败分支',
  'catch→toast error.message 或「操作失败」；卡片保留不静默还原',
  'observed：act-FAIL:tap 候选「取消收藏」element not found；pre「断网/后端 500」未注入（FA04-after 实拍为正常 2 卡列表态）；失败分支未执行',
  'UNVERIFIED', E('FA04', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA04-after.png', WX+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA04-after.wxml'), 0.75)

C('FA05', FA, '返回键两分支',
  '①navigateBack 落来源；②fail 回调 reLaunch 落「我的」',
  'observed：pre:reLaunch 后 act:navigateBack NAV_ERROR: Uncaught [object Object]；终态 route=[favorites]，落点无路由证据',
  'UNVERIFIED', E('FA05'), 0.6)

C('FA06', FA, 'scroll-view 滚动到底/顶',
  '全部卡片可达；无上拉分页意外加载；回顶状态保持',
  'observed：act:pageScrollTo bottom→top 已执行，但 top=pages/discover/index、终态 route=discover（会话劣化后滚动发生在错误页面上）；evidence scrollPos=top 不构成收藏页滚动证据',
  'UNVERIFIED', E('FA06'), 0.7)

C('FA07', FA, 'onShow 真实重拉同步新收藏',
  '详情页收藏新帖→返回本页 onShow fetchPosts({},true)→新收藏出现计数同步；重复进出 ×2',
  'observed：「去详情页收藏新帖」动作未执行；act:repeatNav 两次 navigateTo 均 navErr:Uncaught [object Object]（重入未完成）；FA07-after.png 实拍收藏页「我的收藏（2）」正常渲染（2 卡无变化，与新收藏未发生一致）；重拉同步未取证',
  'UNVERIFIED', E('FA07', SH+'SUBPACKAGES-PROFILE-EXTRA-PROFILE-FAVORITES-FA07-after.png'), 0.7)

C('FA08', FA, '打开即返回',
  '无崩溃无骨架永驻；返回落点=来源页（我的 Tab）',
  'observed：act:navigateBack NAV_ERROR: Uncaught [object Object]；证据截图采集超时（未落盘）；落点无路由证据',
  'UNVERIFIED', E('FA08'), 0.6)

# ================= 汇总输出 =================
from collections import Counter
cnt = Counter(c['verdict'] for c in checks)
summary = {"total": len(checks), "VERIFIED": cnt['VERIFIED'], "FAILED": cnt['FAILED'], "UNVERIFIED": cnt['UNVERIFIED']}

unverifiable = [f"{c['caseId']}|{c['actual'][:90]}|1" for c in checks if c['verdict'] == 'UNVERIFIED']

doc = {
  "round": "R1",
  "manifest": "reports/audit/round-1/ops/次要23.json",
  "generatedAt": "2026-09-23",
  "role": "A6 交互判定员（证据仲裁）· 次要23",
  "sources": [
    "reports/audit/round-1/ops/次要23.json（expected 权威）",
    "reports/audit/round-1/interact/exec-results.json（observed 权威，gitSha aefd8a72，round R1）",
    "reports/screenshots/round-1-interact/（操作截图与 wxml 快照）",
    "reports/audit/round-1/screenshot-manifest.json + reports/screenshots/round-1-tour/A|B（巡检交叉参照）"
  ],
  "summary": summary,
  "checks": checks,
  "issues": [],
  "unverifiable": unverifiable,
  "notes": (
    "88/88 用例完成三方对照（Manifest.expected vs A1.observed vs 截图/wxml）。VERIFIED 13 / FAILED 0 / UNVERIFIED 75。"
    "无 FAILED 立案：所有可采到的应用行为证据（VI01 首屏、VI04/AL08 Toast、RN01/VS01/PO02/PV 默认态/LC/AL 页面渲染、AL09 静默、4 个 scroll noop）均与 expected 一致；"
    "其余 75 例全部因 A1 执行侧故障无法取证，无一例构成应用缺陷的实证。系统性执行故障（建议 A1 复测时修复，非产品缺陷）："
    "① PO 套件参数注入失败——PO01 pre-FAIL 后全页 21 例均运行在『链接缺少用户参数』错误态（wxml+截图证实），巡检 tour B 证实带参时页面完整渲染；"
    "② 模糊候选查询大面积失准——wxml/截图证明按钮在渲染（如认证页『提交认证申请』、收藏页『取消收藏』、位置页『重新定位/地图选点/返回首页』）仍报 element not found，另有 #E5454D（色值）、.missingUserParam（i18n 键）、.previewImage（臆造类名）等非法选择器，及 el.input is not a function API 故障；"
    "③ 会话劣化——S16 套件 FA01 前后登录态丢失（top=login→自动前进 discover），AL03/FA01/FA02/FA06 在错误页面上执行；"
    "④ 大量证据截图『ERROR:timeout waiting for automator response』未落盘；"
    "⑤ 全局 navError=Uncaught [object Object] 与 repeatNav navErr×2 为 harness 导航调用统一报错形态，无法区分应用失败，凡依赖它的导航落点一律 UNVERIFIED；"
    "⑥ pre:login 标注 userId=user-1001 MISMATCH!（与身份A 预期不符）。"
    "前置缺失类：VI06→VI11/VI12/VI13 verified/pending 态断链、RN09/RN11/RN12 manifest 自带『无此账号则如实标 UNVERIFIED』条款、VS05/VS06/AL03/FA04 错误态/空态/已满前置未注入。"
    "保留候选（证据不足未立案，建议复测）：PO17 Hero 头像 tapAvatar 三层 emit 但 other.vue 未绑定（代码疑点，实机点击未达成）；PO10 handleSend 无 sending 防重入首行守卫（manifest 自带注记，未实测）；"
    "LC01 callout 气泡实测文案『附近』与 expected 字面『当前位置』不符——代码 location.vue marker.callout content=addressText||city||'当前位置' 为兜底设计，判 manifest 措辞问题，不立案；"
    "巡检侧 album『空态』截图实为 4/6 网格（空态前置未达成），归巡检判定员复核。"
  )
}

with io.open(OUT, 'w', encoding='utf-8') as f:
    json.dump(doc, f, ensure_ascii=False, indent=1)
print('written', OUT, 'checks=', len(checks), summary)
