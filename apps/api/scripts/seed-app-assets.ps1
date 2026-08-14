#requires -Version 5.1
<#
.SYNOPSIS
    应用资产种子脚本（2026-08-10）：客户端静态装饰图片 -> 后端媒体存储 + media_asset 播种。

.DESCRIPTION
    小程序主包 16MB 超限瘦身方案的一部分（后端"应用资产"托管）：
      - 源：apps/client/src/static/generated/images/** 与 apps/client/src/static/assets/images/**
      - 文件：复制到 {StorageRoot}/app-assets/{static 相对路径}
              （如 uploads/app-assets/generated/images/campus/campus-gate.jpg）
      - DB：为每个文件插入 media_asset 行（type=app_asset / audit_status=approved / user_id=0）
      - URL：/api/v1/media/app-assets/{static 相对路径}（公开访问，免登录）

    幂等性（重复执行安全）：
      - 文件：Copy-Item -Force 覆盖（内容相同等于无操作）
      - DB 行：按 url 判重（INSERT ... WHERE NOT EXISTS），且迁移 V2026.08.10.0030
        已为 media_asset.url 建立唯一索引 uk_media_asset_url 双重兜底

    前置条件：
      - 已应用 Flyway 迁移 V2026.08.10.0030（url 唯一索引）
      - 目标 media_asset 表存在（正常启动过一次后端即可）

.PARAMETER ClientStaticDir
    客户端 static 根目录。默认：<仓库>/apps/client/src/static

.PARAMETER StorageRoot
    后端媒体存储根目录。默认：<仓库>/apps/api/uploads
    （对应 application.yml 的 app.media.storage-root=./uploads，即后端应用工作目录 apps/api）

.PARAMETER DbHost
    MySQL 主机。默认 $env:MYSQL_HOST 或 127.0.0.1

.PARAMETER DbPort
    MySQL 端口。默认 $env:MYSQL_PORT 或 3306。
    注意：本机开发库实际端口见项目 memory（曾为 3307），需按实际情况显式指定。

.PARAMETER DbUser
    MySQL 用户。默认 $env:DB_USERNAME / $env:MYSQL_USER / root

.PARAMETER DbPassword
    MySQL 密码。默认 $env:DB_PASSWORD / $env:MYSQL_PASSWORD。
    缺失时仅生成 SQL 文件不执行（-ApplySql 时要求提供）。

.PARAMETER DbName
    数据库名。默认 $env:DB_NAME / $env:MYSQL_DATABASE / campus_love

.PARAMETER ApplySql
    复制文件后尝试直接执行 SQL（需要 mysql CLI，或 docker compose 的 mysql 容器）。
    未指定时：复制文件 + 生成 SQL 文件，并打印手动执行指引。

.PARAMETER OnlyGenerateSql
    仅生成 SQL 文件（不复制文件、不执行），用于离线审阅。

.EXAMPLE
    # 完整流程（本机 MySQL 端口 3307，root 账号）：
    .\apps\api\scripts\seed-app-assets.ps1 -DbPort 3307 -DbUser root -DbPassword 'xxx' -ApplySql

.EXAMPLE
    # 仅复制文件 + 生成 SQL，稍后手动执行：
    .\apps\api\scripts\seed-app-assets.ps1
    mysql -h127.0.0.1 -P3306 -ucampus -p campus_love < apps/api/scripts/output/app-assets-seed.sql
#>
param(
    [string]$ClientStaticDir,
    [string]$StorageRoot,
    [string]$DbHost,
    [int]$DbPort,
    [string]$DbUser,
    [string]$DbPassword,
    [string]$DbName,
    [switch]$ApplySql,
    [switch]$OnlyGenerateSql
)

$ErrorActionPreference = 'Stop'

# ============================================================
# 0) 路径与参数解析（环境变量兜底）
# ============================================================
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = [System.IO.Path]::GetFullPath((Join-Path $scriptDir '..\..\..'))

if (-not $ClientStaticDir) {
    $ClientStaticDir = [System.IO.Path]::GetFullPath((Join-Path $repoRoot 'apps\client\src\static'))
}
if (-not $StorageRoot) {
    $StorageRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDir '..\uploads'))
}
if (-not $DbHost) {
    $DbHost = if ($env:MYSQL_HOST) { $env:MYSQL_HOST } else { '127.0.0.1' }
}
if (-not $DbPort) {
    $DbPort = if ($env:MYSQL_PORT) { [int]$env:MYSQL_PORT } else { 3306 }
}
if (-not $DbUser) {
    if ($env:DB_USERNAME) { $DbUser = $env:DB_USERNAME }
    elseif ($env:MYSQL_USER) { $DbUser = $env:MYSQL_USER }
    else { $DbUser = 'root' }
}
if (-not $DbPassword) {
    if ($env:DB_PASSWORD) { $DbPassword = $env:DB_PASSWORD }
    elseif ($env:MYSQL_PASSWORD) { $DbPassword = $env:MYSQL_PASSWORD }
}
if (-not $DbName) {
    if ($env:DB_NAME) { $DbName = $env:DB_NAME }
    elseif ($env:MYSQL_DATABASE) { $DbName = $env:MYSQL_DATABASE }
    else { $DbName = 'campus_love' }
}

# ============================================================
# 1) 源目录检查与文件收集
# ============================================================
$sourceRoots = @(
    (Join-Path $ClientStaticDir 'generated\images'),
    (Join-Path $ClientStaticDir 'assets\images')
)
foreach ($root in $sourceRoots) {
    if (-not (Test-Path $root)) {
        Write-Error "源目录不存在: $root（可用 -ClientStaticDir 指定）"
        exit 1
    }
}

$files = @()
foreach ($root in $sourceRoots) {
    $files += Get-ChildItem -Path $root -Recurse -File | ForEach-Object { $_.FullName }
}
if ($files.Count -eq 0) {
    Write-Error "未在源目录找到任何文件: $($sourceRoots -join ', ')"
    exit 1
}
Write-Host "[1/3] 源目录共发现 $($files.Count) 个文件"

# ============================================================
# 2) 复制文件到 {StorageRoot}/app-assets/{static 相对路径}
# ============================================================
function Get-MimeType([string]$ext) {
    switch ($ext) {
        'jpg'  { return 'image/jpeg' }
        'jpeg' { return 'image/jpeg' }
        'png'  { return 'image/png' }
        'webp' { return 'image/webp' }
        default { return 'application/octet-stream' }
    }
}

Add-Type -AssemblyName System.Drawing
function Get-ImageSize([string]$path) {
    try {
        $img = [System.Drawing.Image]::FromFile($path)
        try { return @($img.Width, $img.Height) } finally { $img.Dispose() }
    } catch {
        return @($null, $null)
    }
}

$appAssetDir = Join-Path $StorageRoot 'app-assets'
$prefix      = $ClientStaticDir.TrimEnd('\', '/') + '\'

$sqlLines = New-Object 'System.Collections.Generic.List[string]'
$sqlLines.Add('-- app-assets 种子数据（由 seed-app-assets.ps1 生成，幂等：按 url 判重）')
$sqlLines.Add('-- 表结构依赖迁移 V2026.08.10.0030（media_asset.url 唯一索引 uk_media_asset_url）')

$imageCount = 0
foreach ($file in $files) {
    $full = [System.IO.Path]::GetFullPath($file)
    if (-not $full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Warning "文件不在客户端 static 目录下，跳过: $full"
        continue
    }
    $rel      = $full.Substring($prefix.Length).Replace('\', '/')
    $ext      = [System.IO.Path]::GetExtension($full).ToLowerInvariant().TrimStart('.')
    if ($ext -notin @('jpg', 'jpeg', 'png', 'webp')) {
        Write-Warning "跳过非图片文件: $rel"
        continue
    }

    # 复制文件（-Force 覆盖，幂等）
    if (-not $OnlyGenerateSql) {
        $dest = Join-Path $appAssetDir ($rel -replace '/', [System.IO.Path]::DirectorySeparatorChar)
        $destDir = Split-Path -Parent $dest
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -Path $full -Destination $dest -Force
    }

    # 元信息
    $fileInfo = Get-Item $full
    $mime = Get-MimeType $ext
    $size = $fileInfo.Length
    $dims = Get-ImageSize $full
    $widthSql  = if ($null -eq $dims[0]) { 'NULL' } else { "$($dims[0])" }
    $heightSql = if ($null -eq $dims[1]) { 'NULL' } else { "$($dims[1])" }
    $nameSql   = $fileInfo.Name.Replace("'", "''")
    $url       = '/api/v1/media/app-assets/' + $rel
    $urlSql    = $url.Replace("'", "''")

    $sqlLines.Add("INSERT INTO media_asset (user_id, type, url, original_name, mime, size, width, height, status, audit_status, created_at)")
    $sqlLines.Add("SELECT 0, 'app_asset', '$urlSql', '$nameSql', '$mime', $size, $widthSql, $heightSql, 'ready', 'approved', NOW()")
    $sqlLines.Add("FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM media_asset WHERE url = '$urlSql');")

    $imageCount++
}
Write-Host "[2/3] 已处理 $imageCount 个图片（$($files.Count - $imageCount) 个非图片跳过）"

# ============================================================
# 3) 生成 SQL 文件并（可选）执行
# ============================================================
$outputDir = Join-Path $scriptDir 'output'
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}
$sqlFile = Join-Path $outputDir 'app-assets-seed.sql'
[System.IO.File]::WriteAllLines($sqlFile, $sqlLines, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "[3/3] SQL 已生成: $sqlFile"

if ($ApplySql) {
    if (-not $DbPassword) {
        Write-Error "执行 SQL 需要数据库密码（-DbPassword 或 env DB_PASSWORD / MYSQL_PASSWORD）"
        exit 1
    }
    $mysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue
    if ($mysqlCmd) {
        $argList = @(
            "--host=$DbHost",
            "--port=$DbPort",
            "--user=$DbUser",
            "--password=$DbPassword",
            "--default-character-set=utf8mb4",
            $DbName
        )
        Write-Host "执行: mysql --host=$DbHost --port=$DbPort --user=$DbUser --database=$DbName < $sqlFile"
        Get-Content -Path $sqlFile -Raw | & $mysqlCmd.Source @argList
        if ($LASTEXITCODE -ne 0) {
            Write-Error "mysql 执行失败（exit=$LASTEXITCODE），SQL 文件保留在 $sqlFile 供排查"
            exit 1
        }
        Write-Host "[完成] SQL 已通过 mysql CLI 执行成功（重复执行安全：按 url 判重）"
        exit 0
    }
    $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerCmd) {
        $composeFile = Join-Path $repoRoot 'docker-compose.yml'
        if (Test-Path $composeFile) {
            $argList = @(
                'compose', '-f', $composeFile, 'exec', '-T', 'mysql',
                'mysql', "--host=$DbHost", "--port=$DbPort", "--user=$DbUser",
                "--password=$DbPassword", "--default-character-set=utf8mb4", $DbName
            )
            Write-Host "执行: docker compose exec -T mysql mysql ..."
            Get-Content -Path $sqlFile -Raw | & $dockerCmd.Source @argList
            if ($LASTEXITCODE -ne 0) {
                Write-Error "docker mysql 执行失败（exit=$LASTEXITCODE），SQL 文件保留在 $sqlFile 供排查"
                exit 1
            }
            Write-Host "[完成] SQL 已通过 docker mysql 容器执行成功（重复执行安全：按 url 判重）"
            exit 0
        }
    }
    Write-Error "未找到 mysql CLI 或 docker compose mysql 容器，请手动执行 SQL 文件: $sqlFile"
    exit 1
}

# ============================================================
# 4) 未指定 -ApplySql：打印手动执行指引
# ============================================================
Write-Host ""
Write-Host "========================= 手动执行指引 ========================="
Write-Host "1. 文件已复制到: $appAssetDir"
Write-Host "2. 数据行已生成 SQL，两种执行方式任选："
Write-Host "   方式 A（mysql CLI）:"
Write-Host "     mysql -h$DbHost -P$DbPort -u$DbUser -p $DbName < $sqlFile"
Write-Host "   方式 B（docker 容器，需已启动 docker compose 的 mysql 服务）:"
Write-Host "     docker compose -f $repoRoot\docker-compose.yml exec -T mysql mysql -h$DbHost -P$DbPort -u$DbUser -p $DbName < $sqlFile"
Write-Host "3. 验证：SELECT type, COUNT(*) FROM media_asset WHERE type='app_asset' GROUP BY type;"
Write-Host "4. 也可加 -ApplySql 参数让脚本自动执行（需 -DbPassword）"
Write-Host "=================================================================="
