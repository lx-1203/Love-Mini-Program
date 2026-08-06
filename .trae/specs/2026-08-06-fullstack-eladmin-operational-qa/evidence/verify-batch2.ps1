# Comprehensive verification: batch-2 fixes (visit/like/me-disabled/404-endpoints/wallet/authorId/config)
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8080/api/v1"
$results = @()
function Check($name, $ok, $detail) {
    $script:results += [PSCustomObject]@{ Name = $name; OK = $ok; Detail = $detail }
    Write-Host ("{0} {1} - {2}" -f ($(if ($ok) { "[PASS]" } else { "[FAIL]" })), $name, $detail)
}
function Get-Json($obj) { $obj | ConvertTo-Json -Depth 10 -Compress }
function Try-Web($method, $uri, $headers, $body) {
    try {
        if ($null -eq $body) { return Invoke-WebRequest -Method $method -Uri $uri -Headers $headers -ContentType "application/json" }
        else { return Invoke-WebRequest -Method $method -Uri $uri -Headers $headers -ContentType "application/json" -Body $body }
    } catch {
        $resp = $_.Exception.Response
        if ($null -ne $resp) { $reader = New-Object System.IO.StreamReader($resp.GetResponseStream()); return [PSCustomObject]@{ StatusCode = [int]$resp.StatusCode; Content = $reader.ReadToEnd() } }
        throw
    }
}
function Get-HK($token) { @{ Authorization = "Bearer $token"; "Idempotency-Key" = [guid]::NewGuid().ToString() } }
function Get-H($token) { @{ Authorization = "Bearer $token" } }

# --- admin login ---
$al = Invoke-RestMethod -Method Post -Uri "$base/auth/admin/login" -Headers (Get-HK "") -ContentType "application/json" -Body (Get-Json @{ username = "local-dev-admin-openid-123456"; password = "Admin@123456" })
$ahk = Get-HK $al.data.token
$ah = Get-H $al.data.token
Check "AdminLogin" ($null -ne $al.data.token) "ok"

# --- register user A ---
$suffix = (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$phoneA = "139" + $suffix.Substring(0, 8)
$regA = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body (Get-Json @{ phone = $phoneA; password = "Test@123456"; nickname = "VerifyA" })
$tokA = $regA.data.token
Check "RegUserA" ($null -ne $tokA) "uid=$($regA.data.userId)"

# --- 1) matches/visit (was 500) ---
try {
    $r = Try-Web "Post" "$base/matches/visit" (Get-HK $tokA) (Get-Json @{ visitedUserId = 1 })
    Check "MatchesVisit" ($r.StatusCode -eq 200) "status=$($r.StatusCode)"
} catch { Check "MatchesVisit" $false $_.Exception.Message }

# --- 2) like toggle (like -> unlike -> like) ---
try {
    $postBody = Get-Json @{ content = "like toggle post " + $suffix; category = "interest" }
    $p = Invoke-RestMethod -Method Post -Uri "$base/posts" -Headers (Get-HK $tokA) -ContentType "application/json" -Body $postBody
    $postId = $p.data.id
    $l1 = Invoke-RestMethod -Method Post -Uri "$base/posts/$postId/like" -Headers (Get-HK $tokA)
    $l2 = Invoke-RestMethod -Method Post -Uri "$base/posts/$postId/like" -Headers (Get-HK $tokA)
    $l3 = Invoke-RestMethod -Method Post -Uri "$base/posts/$postId/like" -Headers (Get-HK $tokA)
    $ok = ($l1.data.liked -eq $true -and $l2.data.liked -eq $false -and $l3.data.liked -eq $true)
    Check "LikeToggle" $ok "l1=$($l1.data.liked) l2=$($l2.data.liked) l3=$($l3.data.liked) counts=$($l1.data.likeCount)/$($l2.data.likeCount)/$($l3.data.likeCount)"
} catch { Check "LikeToggle" $false $_.Exception.Message }

# --- 3) /me reflects disabled state ---
try {
    $adminDisable = Try-Web "Post" "$base/admin/users/$($regA.data.userId)/disable" $ahk $null
    $me1 = Invoke-RestMethod -Method Get -Uri "$base/auth/me" -Headers (Get-H $tokA)
    $adminEnable = Try-Web "Post" "$base/admin/users/$($regA.data.userId)/enable" $ahk $null
    $me2 = Invoke-RestMethod -Method Get -Uri "$base/auth/me" -Headers (Get-H $tokA)
    Check "MeDisabledReflect" ($me1.loggedIn -eq $false -and $me2.loggedIn -eq $true) "disabled=$($me1.loggedIn) enabled=$($me2.loggedIn) disableStatus=$($adminDisable.StatusCode)"
} catch { Check "MeDisabledReflect" $false $_.Exception.Message }

# --- 4) 3 formerly-404 endpoints ---
foreach ($ep in @("growth/social-progress", "campus/activities", "campus/feed")) {
    try {
        $r = Try-Web "Get" "$base/$ep" (Get-H $tokA) $null
        Check "Endpoint404Fix:$ep" ($r.StatusCode -eq 200) "status=$($r.StatusCode)"
    } catch { Check "Endpoint404Fix:$ep" $false $_.Exception.Message }
}

# --- 5) wallet balance/recharge/transactions ---
try {
    $b = Invoke-RestMethod -Method Get -Uri "$base/wallet/balance" -Headers (Get-H $tokA)
    $rch = Invoke-RestMethod -Method Post -Uri "$base/wallet/recharge" -Headers (Get-HK $tokA) -ContentType "application/json" -Body (Get-Json @{ amountCents = 10000 })
    $tx = Invoke-RestMethod -Method Get -Uri "$base/wallet/transactions?page=0&size=10" -Headers (Get-H $tokA)
    Check "WalletBalance" ($null -ne $b.balanceCents) "balanceCents=$($b.balanceCents)"
    Check "WalletRecharge" ($null -ne $rch.orderId -and $rch.balanceAfterCents -ge 10000) "orderId=$($rch.orderId) after=$($rch.balanceAfterCents)"
    Check "WalletTx" ($null -ne $tx -and $tx.total -ge 1) "total=$($tx.total)"
} catch { Check "WalletChain" $false $_.Exception.Message }

# --- 6) posts by authorId (my posts) ---
try {
    $p2 = Invoke-RestMethod -Method Post -Uri "$base/posts" -Headers (Get-HK $tokA) -ContentType "application/json" -Body (Get-Json @{ content = "my post " + $suffix; category = "interest" })
    $r = Invoke-RestMethod -Method Get -Uri "$base/posts?authorId=$($regA.data.userId)&page=1&size=10" -Headers (Get-H $tokA)
    $allMine = @($r.items | Where-Object { $_.author.userId -ne $regA.data.userId }).Count -eq 0
    Check "PostsByAuthor" ($null -ne $r.items -and $allMine -and @($r.items).Count -ge 1) "count=$(@($r.items).Count) allMine=$allMine"
} catch { Check "PostsByAuthor" $false $_.Exception.Message }

# --- 7) config DB linkage (notify/match) ---
try {
    $cn = Try-Web "Get" "$base/config/notify-config" (Get-H $tokA) $null
    $cm = Try-Web "Get" "$base/config/match-config" (Get-H $tokA) $null
    Check "ConfigNotify" ($cn.StatusCode -eq 200) "status=$($cn.StatusCode)"
    Check "ConfigMatch" ($cm.StatusCode -eq 200) "status=$($cm.StatusCode)"
} catch { Check "ConfigChain" $false $_.Exception.Message }

Write-Host ""
Write-Host "===== BATCH-2 SUMMARY ====="
$fail = $results | Where-Object { -not $_.OK }
Write-Host ("PASS {0}/{1}" -f ($results.Count - $fail.Count), $results.Count)
if ($fail) { $fail | ForEach-Object { Write-Host ("  FAIL: {0} - {1}" -f $_.Name, $_.Detail) }; exit 1 }
