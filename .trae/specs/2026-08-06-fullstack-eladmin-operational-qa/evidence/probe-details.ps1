# Probe 422 details and remaining endpoints (PS 5.1 compatible)
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8080/api/v1"

function Try-Request($method, $uri, $headers, $body) {
    try {
        if ($null -eq $body) {
            return Invoke-WebRequest -Method $method -Uri $uri -Headers $headers -ContentType "application/json"
        } else {
            return Invoke-WebRequest -Method $method -Uri $uri -Headers $headers -ContentType "application/json" -Body $body
        }
    } catch {
        $resp = $_.Exception.Response
        if ($null -ne $resp) {
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $content = $reader.ReadToEnd()
            return [PSCustomObject]@{ StatusCode = [int]$resp.StatusCode; Content = $content }
        }
        throw
    }
}

$suffix = (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$phone = "139" + $suffix.Substring(0, 8)
$regBody = @{ phone = $phone; password = "Test@123456"; nickname = "Probe3" } | ConvertTo-Json -Compress
$reg = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body $regBody
$token = $reg.data.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "uid=$($reg.data.userId)"

Write-Host "`n===== POST posts (with Idempotency-Key) ====="
$h2 = @{ Authorization = "Bearer $token"; "Idempotency-Key" = [guid]::NewGuid().ToString() }
$b = @{ content = "probe post"; category = "interest"; tags = @("daily") } | ConvertTo-Json -Compress
$r = Try-Request "Post" "$base/posts" $h2 $b
Write-Host "status=$($r.StatusCode) body=$($r.Content)"

Write-Host "`n===== POST check-in (with Idempotency-Key) ====="
$r = Try-Request "Post" "$base/check-in" $h2 "{}"
Write-Host "status=$($r.StatusCode) body=$($r.Content)"

Write-Host "`n===== POST campus/certification ====="
$b = @{ schoolName = "Tsinghua"; major = "CS"; studentIdCardUrl = "https://example.com/card.jpg" } | ConvertTo-Json -Compress
$r = Try-Request "Post" "$base/campus/certification" $h2 $b
Write-Host "status=$($r.StatusCode) body=$($r.Content)"

Write-Host "`n===== GET recommendations (raw content) ====="
$r = Try-Request "Get" "$base/recommendations" $headers $null
Write-Host "status=$($r.StatusCode) body=$($r.Content)"
