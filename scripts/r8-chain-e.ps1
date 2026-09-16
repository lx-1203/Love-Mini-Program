$wi = "D:\微信开发者\微信web开发者工具\wechatide.cmd"
$proj = "D:\6\恋爱小程序"
$shotsDir = "D:\6\恋爱小程序\reports\screenshots\r8-audit"
function WiRaw([string[]]$argList) { return (& $wi @argList 2>&1 | Out-String) }
function Ev([string]$js, [double]$wait = 3) {
  $raw = WiRaw @("-c","ZCode","automation_evaluate","--project",$proj,"--fn-source",$js)
  Start-Sleep -Milliseconds ([int]($wait*1000))
  return $raw
}
function ElAct([string]$sel, [string]$action, [string]$value) {
  $args2 = @("-c","ZCode","automation_element_action","--project",$proj,"--selector",$sel,"--action",$action)
  if ($value -ne "") { $args2 += @("--value",$value) }
  $raw = WiRaw $args2
  Write-Host ("  [{0} {1}] ok={2}" -f $action, $sel, ($raw -match '"success": true'))
}
# 1. open editor
Ev "function(){ wx.reLaunch({ url: '/subpackages/village/village/post', fail: function(e){ console.error('NF'); } }); return 1; }" 5
# 2. fill title + content
ElAct ".post-title__input" "input" "Round-8 audit: UI smoke post r8-chain-e"
ElAct ".post-content__input" "input" "Round-8 audit chain E: publishing to verify draft cleanup works end to end."
$null = WiRaw @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",(Join-Path $shotsDir "chain-e1-filled.png"))
# 3. publish
ElAct ".post-header__submit" "tap" ""
Start-Sleep -Seconds 5
$null = WiRaw @("-c","ZCode","simulator_screenshot","--project",$proj,"--path",(Join-Path $shotsDir "chain-e2-after-publish.png"))
Write-Host "CHAIN E DONE"
