# Final comprehensive smoke: Phase5 features + full regression
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
$at = $al.data.token
$ahk = Get-HK $at
Check "AdminLogin" ($null -ne $at) "ok"

# --- P1-A: change-password flow (change then change back) ---
try {
    $r1 = Try-Web "Post" "$base/admin/account/change-password" $ahk (Get-Json @{ oldPassword = "Admin@123456"; newPassword = "Temp@654321" })
    $login2 = Try-Web "Post" "$base/auth/admin/login" (Get-HK "") (Get-Json @{ username = "local-dev-admin-openid-123456"; password = "Temp@654321" })
    $at2 = ($login2.Content | ConvertFrom-Json).data.token
    $r2 = Try-Web "Post" "$base/admin/account/change-password" (Get-HK $at2) (Get-Json @{ oldPassword = "Temp@654321"; newPassword = "Admin@123456" })
    $login3 = Try-Web "Post" "$base/auth/admin/login" (Get-HK "") (Get-Json @{ username = "local-dev-admin-openid-123456"; password = "Admin@123456" })
    Check "ChangePassword" ($r1.StatusCode -eq 200 -and $login2.StatusCode -eq 200 -and $r2.StatusCode -eq 200 -and $login3.StatusCode -eq 200) "c1=$($r1.StatusCode) l2=$($login2.StatusCode) c2=$($r2.StatusCode) l3=$($login3.StatusCode)"
} catch { Check "ChangePassword" $false $_.Exception.Message }

# --- P1-B: admin create user ---
try {
    $r = Invoke-RestMethod -Method Post -Uri "$base/admin/users" -Headers $ahk -ContentType "application/json" -Body (Get-Json @{ phone = "137" + (Get-Random -Minimum 10000000 -Maximum 99999999).ToString().Substring(0,8); password = "Create@123"; nickname = "AdminCreated" })
    Check "AdminCreateUser" ($null -ne $r.data.id) "uid=$($r.data.id)"
} catch { Check "AdminCreateUser" $false $_.Exception.Message }

# --- P2-A: online users list + kick ---
try {
    $u = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body (Get-Json @{ phone = "138" + (Get-Random -Minimum 10000000 -Maximum 99999999).ToString().Substring(0,8); password = "Test@123456"; nickname = "OnlineProbe" })
    $ut = $u.data.token
    $ol = Invoke-RestMethod -Method Get -Uri "$base/admin/online-users" -Headers (Get-H $at)
    $found = @($ol.data | Where-Object { $_.userId -eq $u.data.userId }).Count -gt 0
    $kick = Try-Web "Post" "$base/admin/online-users/$($u.data.userId)/kick" $ahk $null
    $me = Invoke-RestMethod -Method Get -Uri "$base/auth/me" -Headers (Get-H $ut)
    Check "OnlineUsers" ($null -ne $ol -and $found) "online=$(@($ol.data).Count) found=$found"
    Check "KickOnlineUser" ($kick.StatusCode -eq 200 -and $me.loggedIn -eq $false) "kick=$($kick.StatusCode) meLoggedIn=$($me.loggedIn)"
} catch { Check "OnlineUsersChain" $false $_.Exception.Message }

# --- P2-B: audit log exception filter ---
try {
    $r = Invoke-RestMethod -Method Get -Uri "$base/admin/audit-logs?page=1&size=10&exception=true" -Headers (Get-H $at)
    Check "AuditExceptionFilter" ($null -ne $r) "items=$(@($r.items).Count)"
} catch { Check "AuditExceptionFilter" $false $_.Exception.Message }

# --- full regression: register user + key chains ---
$suffix = (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$phone = "139" + $suffix.Substring(0, 8)
$reg = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body (Get-Json @{ phone = $phone; password = "Test@123456"; nickname = "FinalSmoke" })
$tok = $reg.data.token
Check "Register" ($null -ne $tok) "uid=$($reg.data.userId)"

try {
    $r = Invoke-RestMethod -Method Get -Uri "$base/daily-question/today" -Headers (Get-H $tok)
    Check "DailyQuestion" ($null -ne $r.data.id) "id=$($r.data.id)"
} catch { Check "DailyQuestion" $false $_.Exception.Message }

try {
    $p = Invoke-RestMethod -Method Post -Uri "$base/posts" -Headers (Get-HK $tok) -ContentType "application/json" -Body (Get-Json @{ content = "final post " + $suffix; category = "interest" })
    Check "PostId" ($null -ne $p.data.id) "id=$($p.data.id)"
    $c = Invoke-RestMethod -Method Post -Uri "$base/posts/$($p.data.id)/comments" -Headers (Get-HK $tok) -ContentType "application/json" -Body (Get-Json @{ content = "final comment" })
    Check "CommentId" ($null -ne $c.data.id) "id=$($c.data.id)"
    $like1 = Invoke-RestMethod -Method Post -Uri "$base/posts/$($p.data.id)/like" -Headers (Get-HK $tok)
    $like2 = Invoke-RestMethod -Method Post -Uri "$base/posts/$($p.data.id)/like" -Headers (Get-HK $tok)
    Check "LikeToggle" ($like1.data.liked -eq $true -and $like2.data.liked -eq $false) "t=$($like1.data.liked)/$($like2.data.liked)"
} catch { Check "PostChain" $false $_.Exception.Message }

try {
    $cert = Try-Web "Post" "$base/campus/certification" (Get-HK $tok) (Get-Json @{ schoolName = "T"; major = "CS"; studentIdCardUrl = "https://e.com/c.jpg" })
    $cert2 = Try-Web "Post" "$base/campus/certification" (Get-HK $tok) (Get-Json @{ schoolName = "T"; major = "CS"; studentIdCardUrl = "https://e.com/c.jpg" })
    Check "Cert409" ($cert.StatusCode -eq 200 -and $cert2.StatusCode -eq 409) "first=$($cert.StatusCode) dup=$($cert2.StatusCode)"
} catch { Check "Cert409" $false $_.Exception.Message }

try {
    $ck = Invoke-RestMethod -Method Post -Uri "$base/check-in" -Headers (Get-HK $tok) -ContentType "application/json" -Body "{}"
    Check "CheckIn" ($null -ne $ck.data) "ok"
} catch { Check "CheckIn" $false $_.Exception.Message }

foreach ($ep in @("recommendations", "chat/overview", "post-tags", "growth/social-progress", "campus/activities", "campus/feed", "wallet/balance", "config/notify-config", "config/match-config")) {
    try {
        $r = Try-Web "Get" "$base/$ep" (Get-H $tok) $null
        Check "EP:$ep" ($r.StatusCode -eq 200) "status=$($r.StatusCode)"
    } catch { Check "EP:$ep" $false $_.Exception.Message }
}

try {
    $r = Try-Web "Get" "$base/posts?authorId=$($reg.data.userId)&page=1&size=10" (Get-H $tok) $null
    Check "PostsByAuthor" ($r.StatusCode -eq 200) "status=$($r.StatusCode)"
} catch { Check "PostsByAuthor" $false $_.Exception.Message }

Write-Host ""
Write-Host "===== FINAL SUMMARY ====="
$fail = $results | Where-Object { -not $_.OK }
Write-Host ("PASS {0}/{1}" -f ($results.Count - $fail.Count), $results.Count)
if ($fail) { $fail | ForEach-Object { Write-Host ("  FAIL: {0} - {1}" -f $_.Name, $_.Detail) }; exit 1 }
