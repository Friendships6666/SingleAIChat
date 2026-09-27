# SingleAIChat

一个基于 Svelte、TypeScript 和 Vite 的浏览器聊天应用，支持自定义 OpenAI 兼容 API、会话本地保存与导入导出，以及 Markdown、公式和代码高亮。AI 回复中的 HTML、SVG、Typst 和 LaTeX 代码块可以点击运行预览。

## 本地运行

需要 Node.js 22。

```bash
npm ci
npm run dev
```

打开终端显示的本地地址，在“配置 API”中填写接口地址、密钥和模型。配置与会话保存在当前浏览器的本地存储中。浏览器需要能够跨域访问所填写的 API。

## 构建与部署

```bash
npm run check
npm test
npm run build
```

推送到 `main` 后，GitHub Actions 会运行 `npm run build:pages` 并发布 `dist`。首次部署需在仓库的 **Settings → Pages** 中将发布来源设为 **GitHub Actions**。

站点地址：<https://friendships6666.github.io/SingleAIChat/>。

不要将共用 API 密钥写入前端源码。Typst 预览首次运行需要下载较大的浏览器编译器；HTML/SVG 预览允许加载外部资源，但脚本仍在隔离的 iframe 中运行。
