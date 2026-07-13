# PRD: LaTeX Preview — 桌面端公式编辑器

## Goal
一个 Tauri v2 桌面应用，输入 LaTeX 公式代码，实时 KaTeX 渲染预览，支持复制导出。

## Tech Stack
- **Frontend:** Tauri v2 + vanilla HTML/CSS/JS（或轻量框架）
- **Editor:** CodeMirror 6（LaTeX 语法高亮、自动补全）
- **Renderer:** KaTeX（CDN 内联或 bundled）
- **Symbol Panel:** 自建分类面板
- **Themes:** CSS 变量多主题切换
- **Build:** `cargo tauri build` → Windows/Linux/macOS

## User Stories

### P0 — 核心编辑 + 预览
```
As a user,
I want 左右分栏实时编辑和预览，
So that 我打代码的同时能看到公式效果。
```

- [ ] 左侧 CodeMirror 6 编辑器，LaTeX 语法高亮
- [ ] 右侧 KaTeX 实时渲染预览（每次按键后 debounce 重渲染）
- [ ] 分栏可拖拽调整宽度
- [ ] 布局可选左右/上下（设置中切换）
- [ ] 语法错误时：编辑器标红错误行 + 右侧预览下方显示错误信息
- [ ] 错误时预览区 fallback：该公式显示红色纯文本，其他正常渲染

### P0 — 符号面板（侧栏 + 搜索）
```
As a user,
I want 左侧符号面板分类插入，
So that 我不记 LaTeX 命令也能打出公式。
```

- [ ] 左侧可折叠侧栏，分类：希腊字母、运算符、箭头、集合论、矩阵模板、积分/求和等
- [ ] 点击符号/模板 → 插入到编辑器光标位置
- [ ] 快捷键 `Ctrl+M` 弹出符号搜索面板，输入名称过滤
- [ ] 侧栏可收起腾出空间

### P0 — 自动补全
```
As a user,
I want 输入 \ 时自动补全 LaTeX 命令，
So that 我少打字。
```

- [ ] 输入 `\` 触发补全列表，继续打字过滤
- [ ] 选中补全项 → 插入完整命令 + 占位花括号
- [ ] 补全项旁边显示 KaTeX 渲染缩略图

### P1 — 复制与导出
- [ ] 右键公式 → 复制为 PNG（clipboard）
- [ ] 右键公式 → 复制为 SVG（clipboard）
- [ ] 工具栏按钮 → 导出 PNG（分辨率与预览窗口一致）
- [ ] 工具栏按钮 → 导出 SVG
- [ ] 导出设置：默认使用预览窗口大小，可在设置中调整 DPI

### P1 — Session 恢复
- [ ] 应用关闭时保存当前编辑器内容到 localstorage
- [ ] 下次打开自动恢复
- [ ] 设置中可关闭此功能

### P1 — 多主题
- [ ] 内置主题：Dracula、Adwaita、Breeze、GitHub Dark/Light、Monokai
- [ ] 设置中切换，立即生效
- [ ] 跟随系统（自动暗色/亮色）

### P2 — 高级错误处理
- [ ] 错误时预览区公式降级显示：不阻塞整体渲染，仅错误公式显示红色纯文本
- [ ] 多行公式（align/cases 等）完整支持

### P2 — 缩放
- [ ] 预览区支持滚轮缩放
- [ ] 重置缩放按钮

## Out of Scope
- AI 生成公式
- 文件保存/打开
- tikz/化学式等扩展包（Phase 2）
- 批量导出

## UI 布局（参考）

```
┌─────────────────────────────────────────────────┐
│ 工具栏 [主题切换] [导出PNG] [导出SVG] [布局切换] │
├──────────┬──────────────────────────────────────┤
│ 符号面板  │  CodeMirror 编辑器      │  KaTeX 预览 │
│ 希腊字母  │  \frac{x^2}{y}  ...    │  x²         │
│ 运算符   │                        │  ───        │
│ 箭头     │                        │  y          │
│ 矩阵     │                        │             │
│ ...      │                        │ 错误信息栏  │
├──────────┴──────────────────────────────────────┤
│ 状态栏: 行/列  主题名  渲染状态                 │
└─────────────────────────────────────────────────┘
```

## Architecture

```
tauri-app/
├── src-tauri/         # Rust 后端（窗口管理、剪贴板、导出）
│   ├── main.rs
│   └── Cargo.toml
├── src/
│   ├── index.html     # 主页面
│   ├── style.css      # 全局样式 + 主题变量
│   ├── editor.js      # CodeMirror 6 配置 + 补全
│   ├── preview.js     # KaTeX 渲染 + 错误处理
│   ├── symbols.js     # 符号面板 + 搜索
│   ├── export.js      # 复制/导出 PNG/SVG
│   ├── themes.js      # 主题切换
│   └── settings.js    # 设置面板
├── package.json
└── tauri.conf.json
```

## Development Mode
- TDD 不适用（前端 UI 为主）
- 先搭骨架（Tauri + CodeMirror + KaTeX），再逐功能迭代
- Claude Code 生成代码，本地 `cargo tauri dev` 预览

## Key Decisions
- KaTeX 而非 MathJax（速度优先，功能够用）
- CodeMirror 6 而非 Monaco（轻量，LaTeX 扩展成熟）
- CSS 变量实现主题（无额外依赖）
- html2canvas + canvas.toBlob 实现 PNG 导出
- SVG 直接取 KaTeX 生成的 SVG 元素
