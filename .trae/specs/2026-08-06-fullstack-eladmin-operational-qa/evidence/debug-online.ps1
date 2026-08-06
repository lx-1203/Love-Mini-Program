# Debug online-users & kick
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8080/api/v1"
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

$al = Invoke-RestMethod -Method Post -Uri "$base/auth/admin/login" -Headers (Get-HK "") -ContentType "application/json" -Body (Get-Json @{ username = "local-dev-admin-openid-123456"; password = "Temp@654321" })
$at = $al.data.token
Write-Host "admin ok (Temp@654321)"
# restore original password
$restore = Try-Web "Post" "$base/admin/account/change-password" (Get-HK $at) (Get-Json @{ oldPassword = "Temp@654321"; newPassword = "Admin@123456" })
Write-Host "restore password status=$($restore.StatusCode)"

$u = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body (Get-Json @{ phone = "136" + (Get-Random -Minimum 10000000 -Maximum 99999999).ToString().Substring(0,8); password = "Test@123456"; nickname = "DbgOnline" })
$ut = $u.data.token
$uid = $u.data.userId
Write-Host "user registered uid=$uid"

$ol = Invoke-RestMethod -Method Get -Uri "$base/admin/online-users" -Headers (Get-H $at)
Write-Host "online-users raw:"
Write-Host ($ol | ConvertTo-Json -Depth 5)

Write-Host "`nkick uid=$uid"
$kick = Try-Web "Post" "$base/admin/online-users/$uid/kick" (Get-HK $at) $null
Write-Host "kick status=$($kick.StatusCode) body=$($kick.Content)"

$me = Invoke-RestMethod -Method Get -Uri "$base/auth/me" -Headers (Get-H $ut)
Write-Host "me after kick: loggedIn=$($me.loggedIn)"
