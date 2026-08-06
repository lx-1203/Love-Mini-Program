# Probe raw responses for smoke endpoints
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8080/api/v1"
$suffix = (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$phone = "139" + $suffix.Substring(0, 8)
$regBody = @{ phone = $phone; password = "Test@123456"; nickname = "ProbeUser" } | ConvertTo-Json -Compress
$reg = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body $regBody
$token = $reg.data.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "TOKEN ok, uid=$($reg.data.userId)"

foreach ($ep in @("recommendations", "post-tags", "chat/overview", "auth/me")) {
    Write-Host "`n===== GET $ep ====="
    try {
        $r = Invoke-RestMethod -Method Get -Uri "$base/$ep" -Headers $headers
        Write-Host ($r | ConvertTo-Json -Depth 4 -Compress)
    } catch {
        Write-Host "ERR: $($_.Exception.Message)"
    }
}

Write-Host "`n===== POST posts (create) ====="
try {
    $b = @{ content = "probe post"; category = "interest"; tags = @("daily") } | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Method Post -Uri "$base/posts" -Headers $headers -ContentType "application/json" -Body $b
    Write-Host ($r | ConvertTo-Json -Depth 4 -Compress)
} catch { Write-Host "ERR: $($_.Exception.Message)" }

Write-Host "`n===== POST check-in ====="
try {
    $r = Invoke-RestMethod -Method Post -Uri "$base/check-in" -Headers $headers
    Write-Host ($r | ConvertTo-Json -Depth 4 -Compress)
} catch { Write-Host "ERR: $($_.Exception.Message)" }

Write-Host "`n===== POST campus/certifications ====="
try {
    $b = @{ schoolName = "Tsinghua"; major = "CS"; studentIdCardUrl = "https://example.com/card.jpg" } | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Method Post -Uri "$base/campus/certifications" -Headers $headers -ContentType "application/json" -Body $b
    Write-Host ($r | ConvertTo-Json -Depth 4 -Compress)
} catch { Write-Host "ERR: $($_.Exception.Message)" }

Write-Host "`n===== POST temp-chat/sessions ====="
try {
    $b = @{ matchId = "" } | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Method Post -Uri "$base/temp-chat/sessions" -Headers $headers -ContentType "application/json" -Body $b
    Write-Host ($r | ConvertTo-Json -Depth 4 -Compress)
} catch { Write-Host "ERR: $($_.Exception.Message)" }
