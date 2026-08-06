# Verify post persisted via admin API + retry create with unique keys
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

# admin login
$al = Invoke-RestMethod -Method Post -Uri "$base/auth/admin/login" -Headers @{ "Idempotency-Key" = [guid]::NewGuid().ToString() } -ContentType "application/json" -Body (@{ username = "local-dev-admin-openid-123456"; password = "Admin@123456" } | ConvertTo-Json -Compress)
$ah = @{ Authorization = "Bearer $($al.data.token)" }
Write-Host "admin token ok"

Write-Host "`n===== GET admin/posts (latest) ====="
$r = Try-Request "Get" "$base/admin/posts?page=1&size=5" $ah $null
Write-Host "status=$($r.StatusCode)"
Write-Host $r.Content
