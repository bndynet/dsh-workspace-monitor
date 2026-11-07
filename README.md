# DSH Workspace Monitor

在 DeepSeek Harness 中查看项目运行任务、监听端口，并一键启动或停止任务。

## 功能

- 悬停 Workspace 名称查看精简列表，端口超过 4 个可展开；在右侧 **Running Tasks** 面板查看详情和日志。
- 发现当前项目的进程，包括从其他终端启动的服务和没有端口的 worker。
- 读取根项目及子项目的 `package.json` scripts，支持 npm、pnpm、yarn、bun。
- 点击 **▶** 启动、**■** 停止；点击脚本名展开实际命令。

## 兼容范围

- **Node.js >=24.9.0，DSH 0.2.2-rc.1 Web UI**。
- macOS 已做界面验收；Linux 已做容器采集和脚本管理测试。
- Windows 仅有解析测试，运行和停止不可用；其他客户端尚未验证。

采集范围为 DSH Host 可见的进程，Docker 部署不会自动扫描宿主机或其他容器。自动指令发现目前仅覆盖 `package.json` scripts。

## 安装使用

1. 按下方步骤生成 `.tgz`，放到**运行 DSH 的机器**上。
2. 在 **Plugins → Add plugin** 输入安装包绝对路径，安装并点击 **Enable now**。
3. 按提示刷新或重启 DSH，悬停左侧 Workspace 名称，或打开右侧 **Running Tasks** 面板。

升级时先卸载旧版，勿与旧的 `dsh-workspace-monitor` 并装。只有 DSH owner 可以查看和管理任务；归属不明时停止按钮会禁用。关闭浮层或浏览器不会停止已启动的任务。

## 开发与打包

```sh
npm ci
npm pack
```

`npm pack` 自动构建并运行测试，生成 `bndynet-dsh-workspace-monitor-0.2.1.tgz`。单独检查使用 `npm run check`；安装端无需构建。

### 本地调试

启动一个独立于日常环境的 DSH：

```sh
npm run dev
```

- 使用仓库下的 `.dsh-dev/` 作为 `DSH_HOME`（已加入 `.gitignore`），不会修改 `~/.dsh`。
- 默认在 `http://127.0.0.1:3081` 启动 Web UI，不自动打开浏览器。
- 需要 `dsh` 在 `PATH` 中，也可用 `DSH_BIN` 指定；换端口用 `npm run dev -- --port 3082`。
- 用 `DSH_DEV_HOME=/tmp/dsh-dev npm run dev` 可指定其他开发目录。

首次启动后，在 **Plugins → Add plugin** 输入 `link:/当前仓库绝对路径`，安装并点 **Enable now**；然后在 dev 实例里添加一个 Workspace。使用 `link:` 很重要：profile 会直接引用仓库，而不是复制一份安装包。

开发循环：

```sh
npm run build
```

- 修改 `src/client`（面板、悬停浮层、样式）：构建后 DSH 会轮询 `lib/client.js` 并自动热替换，通常无需刷新页面。
- 修改 `src/host`、`src/actions`、`src/monitor`：构建后重启 `npm run dev`。
- HMR 没生效时先看 **Settings → Plugins** 的加载错误，或 `Ctrl+Shift+R` 强制刷新。

调试入口：

- 悬停 Workspace 后的浮层是 `[data-dwm-hover]`，右侧面板是 `[data-dwm-panel]`。
- DevTools → Network 过滤 `workspace-monitor`，可查看 `scan/commands/run/stop/output` 的请求和响应。
- DevTools → Sources 搜索 `plugins/@bndynet/dsh-workspace-monitor/client.js`，构建产物未压缩，可直接下断点。
- Host 报错看运行 `npm run dev` 的终端；启动日志在 `.dsh-dev/logs/`。

只调逻辑或组件渲染时不必启动 DSH：

```sh
npm test
node --test tests/client/hover.test.mjs
node --test --test-name-pattern="Run/Stop" tests/client/hover.test.mjs
```

注意：日常 `127.0.0.1:3080` 运行的是 `~/.dsh/profiles/web` 中已安装的插件副本，仓库改动不会自动进入那里。要更新日常环境，使用 `npm pack` 重新打包安装。

## 发布

包名为 **`@bndynet/dsh-workspace-monitor`**，**尚未发布到 npm**。发布后可在 **Plugins → Add plugin** 输入 `@bndynet/dsh-workspace-monitor@0.2.1` 在线安装；当前使用本地 `.tgz`。

流程：**打包测试 → DSH 安装验收 → 发布同一安装包到 `next` → 线上验收 → 设置 `latest`**。权限、认证和具体命令见[发布指南](docs/PUBLISHING.md)。

[使用与限制](docs/USAGE.md) · [验证记录](docs/VERIFICATION.md) · [MIT License](LICENSE)
