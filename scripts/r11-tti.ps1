# R11 Phase5: TTI baseline for 5 tab pages (reLaunch -> page ready -> stable shot)
$ErrorActionPreference = "Continue"
$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序"
$shots = "D:\6\恋爱小程序\reports\audit\r11-acceptance"
New-Item -ItemType Directory -Force -Path $shots | Out-Null

function WiRaw([string[]]$argList) { return (& $wi @argList 2>&1 | Out-String) }

$tabs = @(
  @("home", "/pages/home/index"),
  @("nearby", "/pages/nearby/index"),
  @("discover", "/pages/discover/index"),
  @("messages", "/pages/messages/index"),
  @("profile", "/pages/profile/index")
)

$out = @("tab`titi_ms`tfirst_shot_entropy_note")
foreach ($t in $tabs) {
  $name = $t[0]; $url = $t[1]
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $js = 'function(){ wx.reLaunch({ url: ''__U__'' }); return 1; }'.Replace('__U__', $url)
  $null = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$js)
  # poll until current page path matches
  $ready = $false
  while ($sw.ElapsedMilliseconds -lt 20000) {
    Start-Sleep -Milliseconds 300
    $raw = WiRaw @("-c","ZCode","automation_runtime_info","--project",$proj,"--action","currentPage")
    if ($raw -match [regex]::Escape($url.TrimStart('/'))) { $ready = $true; break }
  }
  # +1s settle for first render/data
  Start-Sleep -Seconds 1
  $tti = $sw.ElapsedMilliseconds
  $file = Join-Path $shots ("tti-{0}.png" -f $name)
  $null = WiRaw @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",$file)
  $out += ("{0}`t{1}ms`tready={2}" -f $name, $tti, $ready)
  Write-Host ("{0}: TTI={1}ms ready={2}" -f $name, $tti, $ready)
}
$out | Set-Content -Path (Join-Path $shots "tti-baseline.tsv") -Encoding UTF8
Write-Host "TTI baseline saved"
