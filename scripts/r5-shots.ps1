# 第五轮逐页截图脚本（微信开发者工具 automator 通道）
# 用法：powershell -ExecutionPolicy Bypass -File scripts\r5-shots.ps1
$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序\apps\client\dist\build\mp-weixin"
$out = "D:\6\恋爱小程序\shots\mp-r5"

function Shot([string]$name, [int]$scroll = 0, [int]$waitBeforeShot = 1) {
  if ($scroll -gt 0) {
    & $wi -c TRAE automation_viewport_action --project $proj --action pageScrollTo --scroll-top $scroll 2>$null | Out-Null
  }
  Start-Sleep -Seconds $waitBeforeShot
  & $wi -c TRAE simulator_screenshot --project $proj --path "$out\$name.png" 2>$null | Out-Null
  Write-Host "  [shot] $name"
}

function Go([string]$action, [string]$url, [int]$wait = 2) {
  if ($url -and $url.Length -gt 0) {
    & $wi -c TRAE automation_navigate --project $proj --action $action --url $url 2>$null | Out-Null
  } else {
    & $wi -c TRAE automation_navigate --project $proj --action $action 2>$null | Out-Null
  }
  Start-Sleep -Seconds $wait
}

# ===== 02 首页（3 屏）=====
Write-Host "== 02 home =="
Go "switchTab" "/pages/home/index" 3
Shot "02-home-top" 0 2
Shot "02-home-mid" 700
Shot "02-home-bottom" 1600

# ===== 03 附近（3 屏）=====
Write-Host "== 03 nearby =="
Go "switchTab" "/pages/nearby/index" 3
Shot "03-nearby-top" 0 2
Shot "03-nearby-mid" 700
Shot "03-nearby-bottom" 1500

# ===== 04 寻觅（卡片，2 屏）=====
Write-Host "== 04 discover =="
Go "switchTab" "/pages/discover/index" 3
Shot "04-discover-top" 0 2
Shot "04-discover-mid" 500

# ===== 05 匹配中 =====
Write-Host "== 05 matching =="
Go "navigateTo" "/subpackages/discover-extra/discover/matching" 4
Shot "05-matching-top" 0 2
Shot "05-matching-mid" 600

# ===== 06 匹配成功 =====
Write-Host "== 06 match-success =="
Go "navigateTo" "/subpackages/discover-extra/discover/match-success" 4
Shot "06-match-success" 0 2

# 返回主包
Go "navigateBack" "" 1
Go "navigateBack" "" 1

# ===== 07 消息 =====
Write-Host "== 07 messages =="
Go "switchTab" "/pages/messages/index" 3
Shot "07-messages-top" 0 2
Shot "07-messages-mid" 600

# ===== 08 我的 =====
Write-Host "== 08 profile =="
Go "switchTab" "/pages/profile/index" 3
Shot "08-profile-top" 0 2
Shot "08-profile-mid" 700
Shot "08-profile-bottom" 1500

# ===== 09 他人主页 =====
Write-Host "== 09 other-profile =="
Go "navigateTo" "/subpackages/profile-extra/profile/other?id=100005" 4
Shot "09-other-profile-top" 0 2
Shot "09-other-profile-mid" 700
Go "navigateBack" "" 1

# ===== 10 兴趣圈列表 =====
Write-Host "== 10 circles =="
Go "navigateTo" "/subpackages/circles/circles/index" 4
Shot "10-circles-top" 0 2
Shot "10-circles-mid" 700

# ===== 11 摄影圈话题 =====
Write-Host "== 11 circle-photo topics =="
Go "navigateTo" "/subpackages/circles/circles/topics?circleId=8" 4
Shot "11-circle-photo-top" 0 2
Shot "11-circle-photo-mid" 700
Go "navigateBack" "" 1
Go "navigateBack" "" 1

# ===== 12 校园圈 =====
Write-Host "== 12 campus =="
Go "navigateTo" "/subpackages/campus/campus/hub" 4
Shot "12-campus-hub" 0 2
Go "navigateBack" "" 1

# ===== 13 村落（帖子广场）=====
Write-Host "== 13 village =="
Go "navigateTo" "/subpackages/village/village/index" 4
Shot "13-village-top" 0 2
Shot "13-village-mid" 700
Shot "13-village-bottom" 1500

# ===== 14 帖子详情 =====
Write-Host "== 14 post-detail =="
Go "navigateTo" "/subpackages/village/village/detail?id=207" 4
Shot "14-post-detail-top" 0 2
Shot "14-post-detail-mid" 700
Go "navigateBack" "" 1

# ===== 15 发帖页 =====
Write-Host "== 15 publish =="
Go "navigateTo" "/subpackages/village/village/post" 4
Shot "15-publish-top" 0 2
Shot "15-publish-mid" 700
Go "navigateBack" "" 1

Write-Host "DONE"
