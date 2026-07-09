# 批量生成校园恋爱小程序图片资源
$ErrorActionPreference = "Continue"
$baseDir = "apps/client/src/static/assets/images"
$apiBase = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image"

function Download-Image($prompt, $size, $outPath) {
    $encoded = [uri]::EscapeDataString($prompt)
    $url = "$apiBase`?prompt=$encoded&image_size=$size"
    try {
        Invoke-WebRequest -Uri $url -OutFile $outPath -UseBasicParsing -TimeoutSec 90
        $f = Get-Item $outPath
        if ($f.Length -lt 1000) {
            Write-Output "WARN: $outPath too small ($($f.Length) bytes)"
            return $false
        }
        Write-Output "OK: $outPath ($($f.Length) bytes)"
        return $true
    } catch {
        Write-Output "FAIL: $outPath - $($_.Exception.Message)"
        return $false
    }
}

# 头像生成函数
function Avatar-Prompt($desc) {
    return "college student portrait avatar, $desc, warm soft lighting, clean light background, modern illustration style, campus romance dating app, high quality, friendly"
}

$avatars = @(
    @{file="user-4002.png"; prompt=(Avatar-Prompt "young Asian male, short hair, glasses, gentle smile, casual shirt")}
    @{file="user-4003.png"; prompt=(Avatar-Prompt "young Asian female, long straight hair, sweet smile, light makeup")}
    @{file="user-4004.png"; prompt=(Avatar-Prompt "young Asian male, sporty short hair, bright smile, t-shirt")}
    @{file="user-4005.png"; prompt=(Avatar-Prompt "young Asian female, bob hair, artistic temperament, soft expression")}
    @{file="user-4006.png"; prompt=(Avatar-Prompt "young Asian female, wavy long hair, warm smile, knit sweater")}
    @{file="user-4007.png"; prompt=(Avatar-Prompt "young Asian male, neat hair, calm expression, shirt")}
    @{file="person-1.png"; prompt=(Avatar-Prompt "young Asian female, ponytail, friendly smile, casual outfit")}
    @{file="person-2.png"; prompt=(Avatar-Prompt "young Asian male, medium hair, relaxed smile, hoodie")}
    @{file="person-3.png"; prompt=(Avatar-Prompt "young Asian female, short hair, confident smile, blazer")}
    @{file="current-user.png"; prompt=(Avatar-Prompt "young Asian person, modern style, approachable smile")}
)

$activities = @(
    @{file="activity-1.png"; prompt="campus club recruitment fair, colorful booths, students gathering, banner, lively atmosphere, daytime, illustration style"; size="landscape_4_3"}
    @{file="activity-2.png"; prompt="university academic lecture hall, speaker on stage, audience seats, projector screen, warm lighting, illustration style"; size="landscape_4_3"}
    @{file="activity-3.png"; prompt="campus sports meet, running track, students cheering, sunny day, energetic atmosphere, illustration style"; size="landscape_4_3"}
)

$products = @(
    @{file="ticket-1.png"; prompt="concert event ticket design, modern colorful, music festival theme, illustration style"; size="square"}
    @{file="ticket-2.png"; prompt="movie ticket design, cinema theme, elegant, illustration style"; size="square"}
    @{file="food-1.png"; prompt="campus cafe latte coffee with latte art, cozy atmosphere, wooden table, illustration style"; size="square"}
    @{file="food-2.png"; prompt="campus cafeteria meal set, rice bowl with vegetables, appetizing, illustration style"; size="square"}
    @{file="merch-1.png"; prompt="campus souvenir tote bag with university logo, canvas material, illustration style"; size="square"}
    @{file="merch-2.png"; prompt="campus cultural notebook with pen, minimal design, illustration style"; size="square"}
)

$posts = @(
    @{file="post-1.png"; prompt="cozy campus cafe interior, warm lighting, students chatting, coffee cups, illustration style"; size="landscape_4_3"}
    @{file="post-2.png"; prompt="modern university library, bookshelves, students reading, soft natural light, illustration style"; size="landscape_4_3"}
    @{file="post-3.png"; prompt="campus playground at sunset, running track, green field, golden light, illustration style"; size="landscape_4_3"}
    @{file="post-4.png"; prompt="bright campus cafeteria, food trays, students dining, clean modern design, illustration style"; size="landscape_4_3"}
    @{file="post-5.png"; prompt="campus night scene, library building with lights, starry sky, peaceful atmosphere, illustration style"; size="landscape_4_3"}
)

$poster = @{file="login-poster.png"; prompt="beautiful university campus scenery, cherry blossom trees, academic buildings, blue sky, romantic atmosphere, illustration style"; size="portrait_16_9"}

# 默认头像
$defaultAvatar = @{file="default-avatar.png"; prompt="neutral default user avatar, simple person silhouette, soft gradient background, minimal illustration style"; size="square"}

Write-Output "=== 开始生成头像 ==="
foreach ($a in $avatars) {
    Download-Image $a.prompt "square" "$baseDir/avatars/$($a.file)"
}

Write-Output "=== 生成默认头像 ==="
Download-Image $defaultAvatar.prompt "square" "apps/client/src/static/default-avatar.png"

Write-Output "=== 生成活动封面 ==="
foreach ($a in $activities) {
    Download-Image $a.prompt $a.size "$baseDir/activities/$($a.file)"
}

Write-Output "=== 生成商品图片 ==="
foreach ($p in $products) {
    Download-Image $p.prompt $p.size "$baseDir/products/$($p.file)"
}

Write-Output "=== 生成帖子配图 ==="
foreach ($p in $posts) {
    Download-Image $p.prompt $p.size "$baseDir/posts/$($p.file)"
}

Write-Output "=== 生成登录海报 ==="
Download-Image $poster.prompt $poster.size "$baseDir/posters/$($poster.file)"

Write-Output "=== 全部完成 ==="
