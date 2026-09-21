param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$FlywayArgs
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$toolsRoot = Join-Path $projectRoot "tools"
$sharedConfig = Join-Path $projectRoot "database\\flyway\\flyway.toml"
$userConfig = Join-Path $projectRoot "database\\flyway\\flyway.user.toml"
$userConfigExample = Join-Path $projectRoot "database\\flyway\\flyway.user.toml.example"

$flywayDir = Get-ChildItem -LiteralPath $toolsRoot -Directory |
    Where-Object { $_.Name -like "flyway-*" } |
    Sort-Object Name -Descending |
    Select-Object -First 1

if (-not $flywayDir) {
    throw "Flyway is not installed under $toolsRoot."
}

$flywayExe = Join-Path $flywayDir.FullName "flyway.cmd"
if (-not (Test-Path -LiteralPath $flywayExe)) {
    throw "Flyway executable not found: $flywayExe"
}

if (-not (Test-Path -LiteralPath $sharedConfig)) {
    throw "Shared Flyway config not found: $sharedConfig"
}

$flywayArgs = if ($FlywayArgs.Count -gt 0) { @($FlywayArgs) } else { @("help") }
$skipUserConfig = @("help", "version", "list-engines", "-v", "--version", "-h", "--help", "-?") |
    Where-Object { $flywayArgs -contains $_ } |
    Select-Object -First 1

if ((-not $skipUserConfig) -and (-not (Test-Path -LiteralPath $userConfig))) {
    Copy-Item -LiteralPath $userConfigExample -Destination $userConfig
    Write-Host "Created $userConfig from the example template."
    Write-Host "Edit that file with your database connection, then rerun the command."
    exit 1
}

$configFiles = if (Test-Path -LiteralPath $userConfig) {
    "-configFiles=$sharedConfig,$userConfig"
}
else {
    "-configFiles=$sharedConfig"
}

$exitCode = 1
Push-Location $projectRoot
try {
    & $flywayExe $configFiles @flywayArgs
    $exitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

exit $exitCode
