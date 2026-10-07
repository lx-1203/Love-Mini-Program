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

$srcRoot = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'apps\client\src'   # scripts/ → 仓库根 → apps\client\src
$targets = @(
    'pages\vip\index.vue',
    'pages\vip\bills.vue',
    'pages\vip\red-packet.vue',
    'pages\vip\promo-code.vue',
    'pages\village\detail.vue',
    'pages\village\tag-posts.vue',
    'pages\village\post.vue',
    'pages\campus\topic-detail.vue',
    'pages\campus\index.vue',
    'pages\campus\post-topic.vue',
    'pages\settings\dnd.vue',
    'pages\settings\index.vue',
    'pages\chat\video-call.vue',
    'pages\chat\red-packet.vue',
    'pages\verification\index.vue',
    'pages\discover\history.vue',
    'pages\circles\post-topic.vue',
    'pages\circle\index.vue',
    'pages\feedback\history.vue',
    'pages\shop\index.vue',
    'pages\dev\index.vue',
    'components\UnlockGuideModal.vue',
    'components\UnlockGuideOverlay.vue',
    'components\social\MatchGuideOverlay.vue',
    'components\social\SocialProgressIndicator.vue'
) | ForEach-Object { Join-Path $srcRoot $_ }

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
