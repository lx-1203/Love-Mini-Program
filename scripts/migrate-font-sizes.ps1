# 字号 token 化脚本 (SubTask 3.4.2)
# 将 .vue/.scss 文件中硬编码的 font-size 值替换为 CSS 变量
# 映射：
#   20rpx -> var(--fs-xs, 20rpx)
#   22rpx -> var(--fs-sm, 22rpx)
#   24rpx -> var(--fs-base, 24rpx)
#   26rpx -> var(--fs-md, 26rpx)
#   28rpx -> var(--fs-lg, 28rpx)
#   30rpx -> var(--fs-xl, 30rpx)
#   32rpx -> var(--fs-2xl, 32rpx)
#   36rpx -> var(--fs-3xl, 36rpx)
#   40rpx -> var(--fs-4xl, 40rpx)
#   44rpx -> var(--fs-5xl, 44rpx)
#   48rpx -> var(--fs-6xl, 48rpx)
#   56rpx -> var(--fs-7xl, 56rpx)

$targets = @(
    'd:\6\恋爱小程序\apps\client\src\pages\vip\index.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\vip\bills.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\vip\red-packet.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\vip\promo-code.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\village\detail.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\village\tag-posts.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\village\post.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\campus\topic-detail.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\campus\index.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\campus\post-topic.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\settings\dnd.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\settings\index.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\chat\video-call.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\chat\red-packet.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\verification\index.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\discover\history.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\circles\post-topic.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\circle\index.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\feedback\history.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\shop\index.vue',
    'd:\6\恋爱小程序\apps\client\src\pages\dev\index.vue',
    'd:\6\恋爱小程序\apps\client\src\components\UnlockGuideModal.vue',
    'd:\6\恋爱小程序\apps\client\src\components\UnlockGuideOverlay.vue',
    'd:\6\恋爱小程序\apps\client\src\components\social\MatchGuideOverlay.vue',
    'd:\6\恋爱小程序\apps\client\src\components\social\SocialProgressIndicator.vue'
)

# 注意：从大到小匹配，避免 22rpx 被 2rpx 替换
$replacements = @(
    @{ Pattern = 'font-size:\s*56rpx\s*;'; Replacement = 'font-size: var(--fs-7xl, 56rpx);' },
    @{ Pattern = 'font-size:\s*48rpx\s*;'; Replacement = 'font-size: var(--fs-6xl, 48rpx);' },
    @{ Pattern = 'font-size:\s*44rpx\s*;'; Replacement = 'font-size: var(--fs-5xl, 44rpx);' },
    @{ Pattern = 'font-size:\s*40rpx\s*;'; Replacement = 'font-size: var(--fs-4xl, 40rpx);' },
    @{ Pattern = 'font-size:\s*36rpx\s*;'; Replacement = 'font-size: var(--fs-3xl, 36rpx);' },
    @{ Pattern = 'font-size:\s*32rpx\s*;'; Replacement = 'font-size: var(--fs-2xl, 32rpx);' },
    @{ Pattern = 'font-size:\s*30rpx\s*;'; Replacement = 'font-size: var(--fs-xl, 30rpx);' },
    @{ Pattern = 'font-size:\s*28rpx\s*;'; Replacement = 'font-size: var(--fs-lg, 28rpx);' },
    @{ Pattern = 'font-size:\s*26rpx\s*;'; Replacement = 'font-size: var(--fs-md, 26rpx);' },
    @{ Pattern = 'font-size:\s*24rpx\s*;'; Replacement = 'font-size: var(--fs-base, 24rpx);' },
    @{ Pattern = 'font-size:\s*22rpx\s*;'; Replacement = 'font-size: var(--fs-sm, 22rpx);' },
    @{ Pattern = 'font-size:\s*20rpx\s*;'; Replacement = 'font-size: var(--fs-xs, 20rpx);' }
)

$totalReplaced = 0
foreach ($file in $targets) {
    if (-not (Test-Path $file)) { continue }
    $content = Get-Content $file -Raw -Encoding UTF8
    $original = $content
    foreach ($r in $replacements) {
        $content = $content -replace $r.Pattern, $r.Replacement
    }
    if ($content -ne $original) {
        Set-Content -Path $file -Value $content -NoNewline -Encoding UTF8
        $totalReplaced++
        Write-Host "Updated: $file"
    }
}
Write-Host "Total files updated: $totalReplaced"
