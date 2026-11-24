# DSH Workspace Monitor

在 DeepSeek Harness 中查看项目运行任务、监听端口，并一键启动或停止任务。

## 使用者：安装

### 从 npm 安装

1. 打开 **Plugins → Add plugin**。
2. 输入 `@bndynet/dsh-workspace-monitor`；需要固定版本时使用 `@bndynet/dsh-workspace-monitor@<version>`。
3. 安装后点击 **Enable now**，按提示刷新或重启 DSH。
4. 悬停左侧 Workspace 名称，或打开右侧 **Running Tasks** 面板。

升级可在 Plugins 页面进行；若更新不可用，卸载旧版后重装。勿与旧的 unscoped `dsh-workspace-monitor` 并装。只有 DSH owner 可以查看和管理任务；归属不明时停止按钮会禁用。

### 从本地安装包安装

```sh
npm ci
npm pack
```

生成 `bndynet-dsh-workspace-monitor-<version>.tgz` 后，在 **Plugins → Add plugin** 输入该文件的绝对路径，安装并启用。

平台支持、兼容版本和功能限制见[使用与限制](docs/USAGE.md)。当前声明支持 DSH `>=0.2.2-rc.1 <0.4.0`；为什么用范围、新版本如何验证见[兼容性](docs/COMPATIBILITY.md)。

## 开发者：本地调试

### 准备

```sh
npm ci
```

要求 `dsh` 在 `PATH` 中，Node/npm 版本与 DSH 运行环境一致；兼容范围以 `package.json` 的 `engines` 为准。

### 单元与组件测试

```sh
npm test
npm run check

node --test tests/client/hover.test.mjs
node --test --test-name-pattern="Run/Stop" tests/client/hover.test.mjs
```

`tests/client` 使用 esbuild + `react-dom/server`，不需要启动 DSH。

### 检查当前 DSH 的兼容性

```sh
npm run check:dsh
```

读取本机已安装的 DSH（或用 `DSH_INSTALL_DIR` 指定），按 DSH 自己的兼容检查验证版本范围，并确认插件依赖的模块、服务与槽位仍然存在。`npm test` 在装有 DSH 时也会运行同一组契约测试，没有 DSH 时跳过；周更 CI 会对最新 DSH 运行它。失败时的处理步骤见[兼容性](docs/COMPATIBILITY.md)。

### 启动隔离的 DSH

```sh
npm run dev
```

- 使用仓库下 `.dsh-dev/` 作为 `DSH_HOME`，不会修改日常 `~/.dsh`。
- 默认在 `http://127.0.0.1:3081` 启动，不自动打开浏览器。
- 换端口：`npm run dev -- --port 3082`；换目录：`DSH_DEV_HOME=/tmp/dsh-dev npm run dev`。
- 可用 `DSH_BIN` 指定 `dsh` 可执行文件。

首次启动后，在 **Plugins → Add plugin** 输入 `link:/当前仓库绝对路径`，安装并启用；然后在 dev 实例里添加一个 Workspace。

### 开发循环

```sh
npm run build
```

- 修改 `src/client`（面板、悬停浮层、样式）：DSH 会轮询 `lib/client.js` 并自动热替换，通常无需刷新。
- 修改 `src/host`、`src/actions`、`src/monitor`：构建后重启 `npm run dev`。
- HMR 未生效时查看 **Settings → Plugins** 的加载错误，或 `Ctrl+Shift+R` 强制刷新。

### 调试入口

- 悬停浮层是 `[data-dwm-hover]`，右侧面板是 `[data-dwm-panel]`。
- DevTools → Network 过滤 `workspace-monitor`，查看 `scan/commands/run/stop/output` 请求。
- DevTools → Sources 搜索 `plugins/@bndynet/dsh-workspace-monitor/client.js`，可直接下断点。
- Host 报错看 `npm run dev` 的终端；启动日志在 `.dsh-dev/logs/`。

注意：日常 DSH 运行的是 profile 中已安装的插件副本，仓库改动不会自动进入那里。用 `npm pack` 安装本地版本，或发布后从 npm 升级。

## 更多

[使用与限制](docs/USAGE.md) · [兼容性](docs/COMPATIBILITY.md) · [发布指南](docs/PUBLISHING.md) · [验证记录](docs/VERIFICATION.md) · [MIT License](LICENSE)
