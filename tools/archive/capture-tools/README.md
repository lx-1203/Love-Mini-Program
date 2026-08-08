# tools/archive/capture-tools - 截图/DevTools 自动化工具归档（R4-02101）

2026-08-09 R4 批次 B4-5 从仓库根目录移入的 C# 一次性窗口捕获/自动化工具
（CaptureByTitle / CaptureDevTools / ClickDetails / CloseDialog / ListWindows /
MaximizeAndCapture / ReviewApp / ScreenshotTest / SendEscape 等 .cs/.exe/.dll），
以及对应截图产物（devtools-*.png / ref_img.png / 6e53afe*.png / ChatGPT Image*.png）
与 JVM 崩溃日志（hs_err_pid*.log）、backend.log。

这些工具为本地一次性走查脚本（目标窗口标题随环境变化），无维护计划；
`*.exe/.dll` 为编译产物，仅供复现当时截图流程使用，不应分发或纳入构建。
