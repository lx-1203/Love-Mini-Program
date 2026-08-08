using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;

public class CaptureDevTools {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdcBlt, uint nFlags);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public const int SW_RESTORE = 9;
    public const uint PW_RENDERFULLCONTENT = 0x00000002;

    public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

    static IntPtr targetHwnd = IntPtr.Zero;

    static bool EnumCallback(IntPtr hWnd, IntPtr lParam) {
        var sb = new StringBuilder(256);
        GetWindowText(hWnd, sb, 256);
        string t = sb.ToString();
        if (t.Contains("校园恋爱") || t.Contains("项目列表")) {
            targetHwnd = hWnd;
            Console.WriteLine("Found window: " + t);
            return false;
        }
        return true;
    }

    public static void Main(string[] args) {
        string outPath = args.Length > 0 ? args[0] : @"D:\6\恋爱小程序\devtools-screenshot.png";

        targetHwnd = IntPtr.Zero;
        EnumWindows(EnumCallback, IntPtr.Zero);
        if (targetHwnd == IntPtr.Zero) { Console.WriteLine("Window not found"); return; }

        ShowWindow(targetHwnd, SW_RESTORE);
        System.Threading.Thread.Sleep(300);
        SetForegroundWindow(targetHwnd);
        System.Threading.Thread.Sleep(500);

        RECT rect;
        GetWindowRect(targetHwnd, out rect);
        int w = rect.Right - rect.Left;
        int h = rect.Bottom - rect.Top;
        Console.WriteLine("Size: {0}x{1}", w, h);

        using (Bitmap bmp = new Bitmap(w, h)) {
            using (Graphics gfx = Graphics.FromImage(bmp)) {
                IntPtr hdc = gfx.GetHdc();
                bool ok = PrintWindow(targetHwnd, hdc, PW_RENDERFULLCONTENT);
                gfx.ReleaseHdc(hdc);
                Console.WriteLine("PrintWindow: " + ok);
                bmp.Save(outPath, ImageFormat.Png);
            }
        }
        Console.WriteLine("Saved: " + outPath);
    }
}
