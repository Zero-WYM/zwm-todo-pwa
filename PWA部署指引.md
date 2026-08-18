# Zero望月明工作台 · PWA 部署指引

本目录（`ZeroWangyuemingApp/`）已包含改造版 `index.html` 与 PWA 三件套（`manifest.webmanifest` + `sw.js` + `icons/`）。
按以下步骤即可把「单文件待办」变成可「添加到主屏幕」、类原生 App 的渐进式 Web 应用（PWA）。

## 重要前提

- **纯本地双击打开 `index.html`（file://）只是普通书签**：Service Worker 与 standalone 安装态需要 **HTTPS 或 localhost** 环境，因此必须通过托管访问。
- **离线缓存（断网也能开）依赖 HTTPS 托管**，本地 file:// 打开无法注册 Service Worker。

## 部署步骤（推荐：GitHub Pages，免费、自带 HTTPS）

1. 在 GitHub 新建一个公开仓库（如 `zwm-todo-pwa`）。
2. 把本目录 `ZeroWangyuemingApp/` 下的**全部内容**推送到仓库根目录（含 `index.html`、`manifest.webmanifest`、`sw.js`、`icons/`）。
   ```bash
   git init
   git add .
   git commit -m "Zero望月明工作台 PWA"
   git remote add origin https://github.com/<你的用户名>/zwm-todo-pwa.git
   git push -u origin main
   ```
3. 仓库 → **Settings → Pages** → Source 选 `main` 分支、`/ (root)` 目录 → Save。
4. 等待约 1 分钟，访问 `https://<你的用户名>.github.io/zwm-todo-pwa/`。
5. 手机用 **Chrome** 打开该地址 → 地址栏右侧「⋮」→ **添加到主屏幕**（Add to Home screen）。
6. 桌面即出现「望月明」图标，点开即为全屏独立 App（深色紫光、弯月，数据存本机 localStorage）。

## 其他托管方式（任选其一）

- **任意静态托管 + HTTPS**：Vercel / Netlify / Cloudflare Pages / 自己的 Nginx，把目录传上去并开启 HTTPS 即可。
- **本地临时预览**：可用 `npx serve` 或 `python3 -m http.server` 起 localhost（仅本机开发测试，手机需同一局域网 + 电脑 hosts 可达）。

## 校验清单

- [ ] `manifest.webmanifest` 可被浏览器读取（DevTools → Application → Manifest 无报错）。
- [ ] `sw.js` 注册成功（Application → Service Workers 显示 activated）。
- [ ] `icons/icon-192.png` 与 `icon-512.png` 存在且可访问。
- [ ] 手机 Chrome 出现「添加到主屏幕」并正常安装、离线可开。

## 说明

- 包名 / 显示名固定为：`Zero望月明工作台` / `com.zerowangyueming.todoapp` / 版本 `1.2`（见 `index.html` 内 `APP_META`）。
- 安卓原生 App（带图标、WebView 壳）在 `android/` 子目录，另见 `android/README.md`。
