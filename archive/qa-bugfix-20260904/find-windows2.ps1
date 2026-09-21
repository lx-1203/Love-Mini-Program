Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win2 {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr l);
  public delegate bool EnumWindowsProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  public struct RECT { public int L, T, R, B; }
}
'@
$lines = @()
$cb = {
  param($h, $l)
  $vis = [Win2]::IsWindowVisible($h)
  $sb = New-Object System.Text.StringBuilder 256
  [Win2]::GetWindowText($h, $sb, 256) | Out-Null
  $t = $sb.ToString()
  $r = New-Object Win2+RECT
  [Win2]::GetWindowRect($h, [ref]$r) | Out-Null
  if ($t.Length -gt 0) {
    $script:lines += ("VIS=" + $vis + " RECT=" + $r.L + "," + $r.T + "," + $r.R + "," + $r.B + " TITLE=" + $t)
  }
  return $true
}
[Win2]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
$lines | Out-File -FilePath "D:\6\恋爱小程序\qa-bugfix-20260904\windows.txt" -Encoding UTF8
