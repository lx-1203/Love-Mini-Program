# Targeted experiment: create post then check ids in list/detail
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8080/api/v1"
function Try-Request($method, $uri, $headers, $body) {
    try {
        if ($null -eq $body) { return Invoke-WebRequest -Method $method -Uri $uri -Headers $headers -ContentType "application/json" }
        else { return Invoke-WebRequest -Method $method -Uri $uri -Headers $headers -ContentType "application/json" -Body $body }
    } catch {
        $resp = $_.Exception.Response
        if ($null -ne $resp) { $reader = New-Object System.IO.StreamReader($resp.GetResponseStream()); return [PSCustomObject]@{ StatusCode = [int]$resp.StatusCode; Content = $reader.ReadToEnd() } }
        throw
    }
}
$suffix = (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$phone = "139" + $suffix.Substring(0, 8)
$reg = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType "application/json" -Body (@{ phone = $phone; password = "Test@123456"; nickname = "IdProbe" } | ConvertTo-Json -Compress)
$h = @{ Authorization = "Bearer $($reg.data.token)"; "Idempotency-Key" = [guid]::NewGuid().ToString() }
Write-Host "uid=$($reg.data.userId)"

Write-Host "`n=== CREATE POST ==="
$b = @{ content = "id-probe-post-" + $suffix; category = "interest" } | ConvertTo-Json -Compress
$r = Try-Request "Post" "$base/posts" $h $b
Write-Host "create status=$($r.StatusCode)"
Write-Host $r.Content

Write-Host "`n=== GET /posts list (latest) ==="
$r2 = Try-Request "Get" "$base/posts?page=1&size=3" $h $null
Write-Host "list status=$($r2.StatusCode)"
Write-Host $r2.Content
