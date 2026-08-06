# Debug comment 409: create post + comment, print keys
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8080/api/v1"
function Get-Json($obj) { $obj | ConvertTo-Json -Depth 10 -Compress }
$suffix = (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$phone = "139" + $suffix.Substring(0, 8)
$reg = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body (Get-Json @{ phone = $phone; password = "Test@123456"; nickname = "CmtDebug" })
$token = $reg.data.token
$k1 = [guid]::NewGuid().ToString()
$h1 = @{ Authorization = "Bearer $token"; "Idempotency-Key" = $k1 }
Write-Host "post key = $k1"
$body = Get-Json @{ content = "debug post " + $suffix; category = "interest" }
$r = Invoke-RestMethod -Method Post -Uri "$base/posts" -Headers $h1 -ContentType "application/json" -Body $body
$postId = $r.data.id
Write-Host "post created id=$postId"

$k2 = [guid]::NewGuid().ToString()
$h2 = @{ Authorization = "Bearer $token"; "Idempotency-Key" = $k2 }
Write-Host "comment key = $k2"
$body2 = Get-Json @{ content = "debug comment " + $suffix }
try {
    $rc = Invoke-RestMethod -Method Post -Uri "$base/posts/$postId/comments" -Headers $h2 -ContentType "application/json" -Body $body2
    Write-Host "comment ok id=$($rc.data.id)"
} catch {
    Write-Host "comment ERR: $($_.Exception.Message)"
    $resp = $_.Exception.Response
    if ($resp) { $reader = New-Object System.IO.StreamReader($resp.GetResponseStream()); Write-Host "body: $($reader.ReadToEnd())" }
}
