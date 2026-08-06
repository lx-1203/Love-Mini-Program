# Smoke regression v2: verify fixed defects (id-not-null + 409 + no-500)
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
function Get-H($token) { @{ Authorization = "Bearer $token" } }
function Get-HK($token) { @{ Authorization = "Bearer $token"; "Idempotency-Key" = [guid]::NewGuid().ToString() } }

# 1) Register
$suffix = (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$phone = "139" + $suffix.Substring(0, 8)
$reg = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body (Get-Json @{ phone = $phone; password = "Test@123456"; nickname = "SmokeV2" })
$token = $reg.data.token
Check "Register+JWT" ($null -ne $token) "phone=$phone"
$h = Get-H $token
$hk = Get-HK $token

# 2) Daily question today (seed data, no 500)
try {
    $r = Invoke-RestMethod -Method Get -Uri "$base/daily-question/today" -Headers $h
    Check "DailyQuestionToday" ($null -ne $r.data -and $null -ne $r.data.id) "id=$($r.data.id)"
} catch { Check "DailyQuestionToday" $false $_.Exception.Message }

# 3) Recommendations (200, may be empty array - not 500)
try {
    $r = Invoke-WebRequest -Method Get -Uri "$base/recommendations" -Headers $h
    Check "RecommendationsAlias" ($r.StatusCode -eq 200) "status=$($r.StatusCode) bodyLen=$($r.Content.Length)"
} catch { Check "RecommendationsAlias" $false $_.Exception.Message }

# 4) Post tags (array)
try {
    $r = Invoke-RestMethod -Method Get -Uri "$base/post-tags" -Headers $h
    Check "PostTags" ($null -ne $r -and @($r).Count -gt 0) "tags=$(@($r).Count)"
} catch { Check "PostTags" $false $_.Exception.Message }

# 5) Create post -> id non-null (KEY FIX)
try {
    $body = Get-Json @{ content = "smoke v2 post " + $suffix; category = "interest"; tags = @("daily") }
    $r = Invoke-RestMethod -Method Post -Uri "$base/posts" -Headers $hk -ContentType "application/json" -Body $body
    $script:postId = $r.data.id
    Check "PostIdNotNull" ($null -ne $script:postId -and $script:postId -ne "") "postId=$script:postId"
} catch { Check "PostIdNotNull" $false $_.Exception.Message }

# 6) Chat overview (no data wrapper)
try {
    $r = Invoke-RestMethod -Method Get -Uri "$base/chat/overview" -Headers $h
    Check "ChatOverview" ($null -ne $r.sessions) "sessions=$(@($r.sessions).Count)"
} catch { Check "ChatOverview" $false $_.Exception.Message }

# 7) Campus certification: first 200, second 409 (distinct keys)
try {
    $body = Get-Json @{ schoolName = "Tsinghua"; major = "CS"; studentIdCardUrl = "https://example.com/card.jpg" }
    $r1 = Try-Web "Post" "$base/campus/certification" (Get-HK $token) $body
    $r2 = Try-Web "Post" "$base/campus/certification" (Get-HK $token) $body
    Check "CertFirstOk" ($r1.StatusCode -eq 200) "status=$($r1.StatusCode)"
    Check "CertSecond409" ($r2.StatusCode -eq 409) "status=$($r2.StatusCode)"
} catch { Check "CertChain" $false $_.Exception.Message }

# 8) Check-in (distinct key) -> points
try {
    $r = Invoke-RestMethod -Method Post -Uri "$base/check-in" -Headers (Get-HK $token) -ContentType "application/json" -Body "{}"
    Check "CheckIn" ($null -ne $r.data) "points=$($r.data.pointsEarned)"
} catch { Check "CheckIn" $false $_.Exception.Message }

# 9) Comment on post -> comment id non-null (KEY FIX)
try {
    $body = Get-Json @{ content = "smoke comment " + $suffix }
    $r = Invoke-RestMethod -Method Post -Uri "$base/posts/$script:postId/comments" -Headers (Get-HK $token) -ContentType "application/json" -Body $body
    Check "CommentIdNotNull" ($null -ne $r.data.id) "commentId=$($r.data.id)"
} catch { Check "CommentIdNotNull" $false $_.Exception.Message }

# 10) Sensitive word add + immediate filter
try {
    $al = Invoke-RestMethod -Method Post -Uri "$base/auth/admin/login" -Headers (Get-HK "") -ContentType "application/json" -Body (Get-Json @{ username = "local-dev-admin-openid-123456"; password = "Admin@123456" })
    $ahk = Get-HK $al.data.token
    $sw = "smoke" + (Get-Random -Minimum 1000 -Maximum 9999)
    $r = Invoke-RestMethod -Method Post -Uri "$base/admin/sensitive-words" -Headers $ahk -ContentType "application/json" -Body (Get-Json @{ word = $sw; category = "OTHER" })
    Check "SensitiveWordAdd" ($null -ne $r.id) "word=$sw id=$($r.id)"
    $r2 = Try-Web "Post" "$base/posts" (Get-HK $token) (Get-Json @{ content = "contains $sw"; category = "interest" })
    $filtered = $r2.Content -notmatch [regex]::Escape($sw)
    Check "SensitiveWordFilter" ($r2.StatusCode -eq 200 -and $filtered) "status=$($r2.StatusCode) filtered=$filtered"
} catch { Check "SensitiveWordChain" $false $_.Exception.Message }

# 11) /me (no data wrapper)
try {
    $r = Invoke-RestMethod -Method Get -Uri "$base/auth/me" -Headers $h
    Check "MeSession" ($r.loggedIn -eq $true -and $null -ne $r.userId) "uid=$($r.userId)"
} catch { Check "MeSession" $false $_.Exception.Message }

# 12) Logout then old token /me -> loggedIn=false (jti blacklist)
try {
    Invoke-RestMethod -Method Post -Uri "$base/auth/logout" -Headers $h
    Start-Sleep -Milliseconds 300
    $r = Invoke-RestMethod -Method Get -Uri "$base/auth/me" -Headers $h
    Check "LogoutBlacklist" ($r.loggedIn -eq $false) "loggedIn=$($r.loggedIn)"
} catch { Check "LogoutBlacklist" $false $_.Exception.Message }

Write-Host ""
Write-Host "===== SMOKE V2 SUMMARY ====="
$fail = $results | Where-Object { -not $_.OK }
Write-Host ("PASS {0}/{1}" -f ($results.Count - $fail.Count), $results.Count)
if ($fail) { $fail | ForEach-Object { Write-Host ("  FAIL: {0} - {1}" -f $_.Name, $_.Detail) }; exit 1 }
