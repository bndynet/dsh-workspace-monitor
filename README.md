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

`npm pack` 自动构建并运行测试，生成 `bndynet-dsh-workspace-monitor-0.2.0.tgz`。单独检查使用 `npm run check`；安装端无需构建。

## 发布

包名为 **`@bndynet/dsh-workspace-monitor`**，**尚未发布到 npm**。发布后可在 **Plugins → Add plugin** 输入 `@bndynet/dsh-workspace-monitor@0.2.0` 在线安装；当前使用本地 `.tgz`。

流程：**打包测试 → DSH 安装验收 → 发布同一安装包到 `next` → 线上验收 → 设置 `latest`**。权限、认证和具体命令见[发布指南](docs/PUBLISHING.md)。

[使用与限制](docs/USAGE.md) · [验证记录](docs/VERIFICATION.md) · [MIT License](LICENSE)
