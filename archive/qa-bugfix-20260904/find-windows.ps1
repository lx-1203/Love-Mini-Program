Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr l);
  public delegate bool EnumWindowsProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  public struct RECT { public int L, T, R, B; }
}
'@
$cb = {
  param($h, $l)
  if ([Win]::IsWindowVisible($h)) {
    $sb = New-Object System.Text.StringBuilder 256
    [Win]::GetWindowText($h, $sb, 256) | Out-Null
    $t = $sb.ToString()
    if ($t -match '微信开发者工具|校园恋爱') {
      $r = New-Object Win+RECT
      [Win]::GetWindowRect($h, [ref]$r) | Out-Null
      Write-Output ("HWND=" + $h + " RECT=" + $r.L + "," + $r.T + "," + $r.R + "," + $r.B + " TITLE=" + $t)
    }
  }
  return $true
}
[Win]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
