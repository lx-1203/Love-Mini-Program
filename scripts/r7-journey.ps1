# 第七轮：自录屏全流程用户旅程（automator 手 + OBS 摄像机）
# 用法：powershell -ExecutionPolicy Bypass -File scripts\r7-journey.ps1
# 前置：DevTools 已开项目窗口（real 构建产物）；OBS 已启动且场景含 DevTools 窗口采集
# 产物：反馈媒体\_self_frames\journey-timestamps.jsonl（秒级时间戳）+ shots\*.png（节点取证）

$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序\apps\client\dist\build\mp-weixin"
$framesDir = "D:\6\恋爱小程序\反馈媒体\_self_frames"
$shotsDir = Join-Path $framesDir "shots"
$tsFile = Join-Path $framesDir "journey-timestamps.jsonl"
$node = "D:\codex-tools\node-v20.19.5-win-x64\node.exe"
$obsCtl = "D:\6\恋爱小程序\scripts\r7-obs-control.mjs"

New-Item -ItemType Directory -Force -Path $shotsDir | Out-Null
"" | Set-Content -Path $tsFile -Encoding UTF8

$sw = [System.Diagnostics.Stopwatch]::StartNew()

function LogAct([string]$type, [string]$sel, [string]$label, [string]$extra = "ok") {
  $t = [Math]::Round($sw.Elapsed.TotalSeconds, 3)
  $line = '{"t": ' + $t + ', "act": "' + $type + '", "sel": "' + $sel + '", "label": "' + $label + '", "result": "' + $extra + '"}'
  Add-Content -Path $tsFile -Value $line -Encoding UTF8
}

function Wi([string[]]$argList) {
  $raw = & $wi @argList 2>&1 | Out-String
  return ($raw -match '"success": true')
}

function WiRaw([string[]]$argList) {
  return (& $wi @argList 2>&1 | Out-String)
}

# 读取元素 class 属性（用于登录页勾选框状态判断）
function GetClass([string]$sel) {
  $raw = WiRaw @("-c", "TRAE", "automation_element_action", "--project", $proj, "--selector", $sel, "--action", "attribute", "--name", "class")
  return $raw
}

function Tap([string]$sel, [string]$label, [double]$wait = 2) {
  $ok = Wi @("-c", "TRAE", "automation_element_action", "--project", $proj, "--selector", $sel, "--action", "tap")
  LogAct "tap" $sel $label ($(if ($ok) { "ok" } else { "fail" }))
  Write-Host ("  [tap {0}] {1} -> {2}" -f $label, $sel, $(if ($ok) { "ok" } else { "FAIL" }))
  Start-Sleep -Milliseconds ([int]($wait * 1000))
}

function Nav([string]$action, [string]$url, [double]$wait = 3, [string]$label = "") {
  if ($url -and $url.Length -gt 0) {
    $ok = Wi @("-c", "TRAE", "automation_navigate", "--project", $proj, "--action", $action, "--url", $url)
  } else {
    $ok = Wi @("-c", "TRAE", "automation_navigate", "--project", $proj, "--action", $action)
  }
  $lb = if ($label) { $label } else { "$action $url" }
  LogAct "nav" $action $lb ($(if ($ok) { "ok" } else { "fail" }))
  Write-Host ("  [nav] {0} -> {1}" -f $lb, $(if ($ok) { "ok" } else { "FAIL" }))
  Start-Sleep -Milliseconds ([int]($wait * 1000))
}

function Shot([string]$name, [double]$wait = 1) {
  $ok = Wi @("-c", "TRAE", "simulator_screenshot", "--project", $proj, "--path", (Join-Path $shotsDir "$name.png"))
  LogAct "shot" "" $name ($(if ($ok) { "ok" } else { "fail" }))
  Write-Host ("  [shot] {0} -> {1}" -f $name, $(if ($ok) { "ok" } else { "FAIL" }))
  Start-Sleep -Milliseconds ([int]($wait * 1000))
}

function Scroll([int]$top, [double]$wait = 1.5) {
  $ok = Wi @("-c", "TRAE", "automation_viewport_action", "--project", $proj, "--action", "pageScrollTo", "--scroll-top", $top)
  LogAct "scroll" "$top" "scrollTo-$top" ($(if ($ok) { "ok" } else { "fail" }))
  Start-Sleep -Milliseconds ([int]($wait * 1000))
}

function Input([string]$sel, [string]$value, [string]$label, [double]$wait = 1) {
  $ok = Wi @("-c", "TRAE", "automation_element_action", "--project", $proj, "--selector", $sel, "--action", "input", "--value", $value)
  LogAct "input" $sel $label ($(if ($ok) { "ok" } else { "fail" }))
  Write-Host ("  [input] {0} -> {1}" -f $label, $(if ($ok) { "ok" } else { "FAIL" }))
  Start-Sleep -Milliseconds ([int]($wait * 1000))
}

# ============ 开始录制 ============
Write-Host "== start OBS recording =="
& $node $obsCtl start
Start-Sleep -Seconds 2
$sw.Restart()

try {
  # ===== Phase 0 冷启动登录页（reLaunch 模拟冷启动）=====
  Write-Host "== Phase 0 login =="
  Nav "reLaunch" "/pages/login/index" 4 "冷启动登录页"
  Shot "00-login"
  # 勾选框状态预检：仅当未勾选（class 不含 checkbox--checked）时点击，避免把默认勾选点掉
  $cbClass = GetClass ".checkbox"
  if ($cbClass -match "checkbox--checked") {
    Write-Host "  [checkbox] already checked, skip tap"
    LogAct "skip" ".checkbox" "协议已默认勾选" "ok"
  } else {
    Tap ".checkbox" "勾选同意协议" 1
  }
  Tap ".btn-guest" "游客登录" 6
  Shot "01-after-login"

  # ===== Phase 1 寻觅 =====
  Write-Host "== Phase 1 discover =="
  # 登录后显式切到寻觅 tab（navigateAfterLogin 的落点可能是首页，不保证在寻觅）
  Nav "switchTab" "/pages/discover/index" 4 "切到寻觅tab"
  Shot "01b-discover-enter"
  Tap ".match-actions__btn--like" "寻觅-喜欢" 2.5
  Shot "02-discover-like"
  Tap ".match-actions__btn--pass" "寻觅-跳过" 2.5
  Shot "03-discover-pass"
  Tap ".match-actions__btn--super" "寻觅-超级喜欢" 3
  Shot "04-discover-super"
  Tap ".discover-header__filter" "寻觅-筛选抽屉" 2
  Shot "05-filter-drawer"
  Tap ".filter-drawer__close" "筛选-关闭" 1.5
  Tap ".discover-header__tabs .discover-header__tab:nth-child(2)" "寻觅-附近tab" 3
  Shot "06-discover-nearby"
  Tap ".discover-header__tabs .discover-header__tab:nth-child(1)" "寻觅-回推荐tab" 2.5

  # ===== Phase 2 喜欢页 =====
  Write-Host "== Phase 2 likes =="
  Nav "navigateTo" "/subpackages/discover-extra/likes/index" 4 "喜欢页"
  Shot "07-likes"
  Scroll 600
  Shot "08-likes-mid"
  Nav "navigateBack" "" 1.5

  # ===== Phase 3 村口 =====
  Write-Host "== Phase 3 village =="
  Nav "navigateTo" "/subpackages/village/village/index" 4.5 "村口广场"
  Shot "09-village"
  Tap ".channel-tab:nth-child(2)" "村口-频道2" 3
  Shot "10-village-ch2"
  Tap ".channel-tab:nth-child(3)" "村口-频道3" 3
  Shot "11-village-ch3"
  Tap ".channel-tab:nth-child(1)" "村口-回频道1" 3
  Scroll 700
  Shot "12-village-scrolled"
  Tap ".post-card" "村口-帖子卡进详情" 4
  Shot "13-post-detail"
  Tap ".author-inline__avatar" "帖子-作者头像进主页" 4
  Shot "14-other-profile"
  Scroll 700
  Shot "15-other-profile-mid"
  Nav "navigateBack" "" 1.5
  Nav "navigateBack" "" 1.5

  # ===== Phase 4 发帖 =====
  Write-Host "== Phase 4 publish =="
  Nav "navigateTo" "/subpackages/village/village/post" 4 "发帖页"
  Shot "16-publish"
  Tap ".post-to__card" "发帖-选择发布目标" 2
  Shot "17-target-sheet"
  Tap ".post-target-sheet__option:nth-child(2)" "发帖-选第2个目标" 2
  Shot "18-target-selected"
  Input ".post-content__input" "今天在图书馆遇到一只很亲人的橘猫，蹲了半小时才走：）" "发帖-输入内容" 1
  Shot "19-publish-filled"
  Tap ".post-header__submit" "发帖-发布" 4.5
  Shot "20-publish-result"

  # ===== Phase 5 消息+聊天 =====
  Write-Host "== Phase 5 messages/chat =="
  Nav "switchTab" "/pages/messages/index" 3.5 "消息tab"
  Shot "21-messages"
  Tap ".chat-item" "消息-进入会话" 4
  Shot "22-chat"
  Input ".wechat-input-bar__input" "你好呀，很高兴认识你～" "聊天-输入消息1" 1
  Shot "23-chat-typed"
  Tap ".wechat-input-bar__send" "聊天-发送1" 2.5
  Shot "24-chat-sent"
  Input ".wechat-input-bar__input" "周末有空一起自习吗？" "聊天-输入消息2" 1
  Tap ".wechat-input-bar__send" "聊天-发送2" 2.5
  Shot "25-chat-sent2"
  Nav "navigateBack" "" 1.5

  # ===== Phase 6 我的 =====
  Write-Host "== Phase 6 profile =="
  Nav "switchTab" "/pages/profile/index" 3.5 "我的tab"
  Shot "26-profile"
  Scroll 700
  Shot "27-profile-mid"
  Scroll 1400
  Shot "28-profile-bottom"

  # ===== Phase 7 首页/附近 =====
  Write-Host "== Phase 7 home/nearby =="
  Nav "switchTab" "/pages/home/index" 3.5 "首页tab"
  Shot "29-home"
  Scroll 700
  Shot "30-home-mid"
  Nav "switchTab" "/pages/nearby/index" 3.5 "附近tab"
  Shot "31-nearby"
  Scroll 700
  Shot "32-nearby-mid"
}
finally {
  # ============ 停止录制 ============
  Write-Host "== stop OBS recording =="
  $sw.Stop()
  & $node $obsCtl stop
}

Write-Host "JOURNEY-DONE"
