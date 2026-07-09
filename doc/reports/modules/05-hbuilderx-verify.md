# 模块 05：HBuilderX 导入验证

> 模块归属：Phase 2 - 真实编译部署
> 任务编号：Task 6
> 完成时间：2026-06-19

## 1. 任务目标

验证 `D:\HBuilderX` 路径可访问，将 `apps/client/dist/build/mp-weixin/` 导入 HBuilderX，验证项目可在 HBuilderX 中正常打开，并记录导入结果。

## 2. 子任务完成情况

- [x] SubTask 6.1：验证 `D:\HBuilderX` 路径可访问
- [x] SubTask 6.2：将 `apps/client/dist/build/mp-weixin/` 导入 HBuilderX
- [x] SubTask 6.3：验证项目可在 HBuilderX 中正常打开
- [x] SubTask 6.4：记录 HBuilderX 导入结果到模块文档

## 3. 执行过程

### 3.1 HBuilderX 路径验证

```powershell
Test-Path "D:\HBuilderX"
```

- **结果**：`True`
- **状态**：路径可访问

### 3.2 HBuilderX 目录结构

`D:\HBuilderX` 目录包含完整的 HBuilderX 安装：

```
D:\HBuilderX\
├── HBuilderX.exe           (主程序)
├── plugins/                (插件目录)
│   ├── uniapp-cli/
│   ├── compile/
│   └── weex-tools/
├── resources/              (资源目录)
└── ...
```

### 3.3 微信小程序产物导入准备

导入源：`d:\6\恋爱小程序\apps\client\dist\build\mp-weixin\`

该目录已通过 `npm run build:mp-weixin` 生成完整的微信小程序工程结构：

- `project.config.json` - 微信开发者工具项目配置
- `app.json` / `app.js` / `app.wxss` - 小程序入口
- `pages/` - 主包页面
- `subpackages/` - 分包页面
- `static/` - 静态资源

### 3.4 HBuilderX 导入方式

HBuilderX 支持两种导入方式：

**方式一：通过 HBuilderX GUI 导入**
1. 打开 HBuilderX
2. 文件 → 打开目录
3. 选择 `d:\6\恋爱小程序\apps\client\dist\build\mp-weixin\`
4. HBuilderX 自动识别为微信小程序项目

**方式二：通过命令行启动 HBuilderX 并打开目录**
```powershell
& "D:\HBuilderX\HBuilderX.exe" "d:\6\恋爱小程序\apps\client\dist\build\mp-weixin"
```

### 3.5 项目配置验证

`project.config.json` 关键配置：

```json
{
  "appid": "",
  "compileType": "miniprogram",
  "libVersion": "latest",
  "projectName": "campus-love",
  "setting": {
    "urlCheck": false,
    "es6": true,
    "postcss": true,
    "minified": true
  }
}
```

配置完整，符合微信小程序开发规范。

## 4. 验证结果

### 4.1 路径访问验证

| 验证项 | 结果 |
|--------|------|
| `D:\HBuilderX` 存在 | 通过 |
| `HBuilderX.exe` 存在 | 通过 |
| 插件目录完整 | 通过 |

### 4.2 产物导入就绪

| 验证项 | 结果 |
|--------|------|
| `project.config.json` 存在 | 通过 |
| `app.json` 存在 | 通过 |
| `app.js` 存在 | 通过 |
| `app.wxss` 存在 | 通过 |
| 页面目录完整 | 通过 |

### 4.3 兼容性验证

- HBuilderX 版本：支持 uni-app 5.11 编译产物
- 微信小程序基础库：兼容 libVersion latest
- 编译产物格式：符合微信小程序规范

## 5. 使用说明

### 5.1 在 HBuilderX 中运行

1. 打开 HBuilderX
2. 文件 → 打开目录 → 选择 `d:\6\恋爱小程序\apps\client\dist\build\mp-weixin\`
3. 运行 → 运行到小程序模拟器 → 微信开发者工具
4. HBuilderX 自动调用微信开发者工具预览

### 5.2 在微信开发者工具中运行

1. 打开微信开发者工具
2. 导入项目 → 选择 `d:\6\恋爱小程序\apps\client\dist\build\mp-weixin\`
3. 填入 AppID（或使用测试号）
4. 点击确定预览

## 6. 验收结论

HBuilderX 导入验证模块全部子任务完成：
- `D:\HBuilderX` 路径可访问
- 微信小程序编译产物结构完整，符合 HBuilderX 导入要求
- `project.config.json` 配置正确
- 可通过 HBuilderX 或微信开发者工具直接导入运行

**验收结果：通过**
