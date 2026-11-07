# 发布指南

[返回 README](../README.md)

## 当前状态

本项目使用 **`@bndynet/dsh-workspace-monitor`**。npm 上已发布稳定版 **`0.2.0`**（`latest`）；仓库当前源码版本为 **`0.2.1`**，尚未发布。

旧的 unscoped 名称 `dsh-workspace-monitor` 已在公共 npm 存在，本项目现在采用 `@bndynet` scope。名称已确定，无需再改名；发布者仍须确认账号拥有该 scope 的创建及发布权限。

| 项目 | 当前结论 |
| --- | --- |
| 构建与分发 | 正常 `npm pack` 自动构建并运行测试；安装包包含预编译 Host / Web、bundle patch、说明与 MIT 许可证，安装端无需构建 |
| 安装包 | `bndynet-dsh-workspace-monitor-0.2.1.tgz`；发布前须验收这份 scoped 安装包，不能沿用旧包的验收结果 |
| npm 账号 | `0.2.0` 已发布；后续自动发布使用 Trusted Publisher / OIDC，不再依赖 `NPM_TOKEN` |
| 支持范围 | 仅声明 DSH **0.2.2-rc.1 Web UI**；macOS 已做界面验收，Linux 已做容器采集和脚本管理测试；Windows 运行/停止不可用 |
| 项目元数据 | `repository` 已指向 GitHub；`author`、`homepage`、`bugs` 仍建议按真实信息补齐 |

详细验证记录见 [VERIFICATION](VERIFICATION.md)。不要为了安装到其他 DSH 版本而直接放宽 `engines.dsh`；Workspace hover 适配需在目标版本重新验收。

## 1. 确认账号、scope 权限及版本

使用 Node.js **>=24.9.0** 和新版 npm。下面的命令明确指向公共 npm，避免误用镜像源：

```sh
node --version
npm --version
npm view @bndynet/dsh-workspace-monitor version dist-tags --registry=https://registry.npmjs.org
npm login --registry=https://registry.npmjs.org
npm whoami --registry=https://registry.npmjs.org
```

包已存在于公共 npm。发布前确认登录账号拥有该 scoped 包的发布权限：

```sh
npm owner ls @bndynet/dsh-workspace-monitor --registry=https://registry.npmjs.org
```

本地手动发布按 npm 提示完成登录与 2FA 验证，认证要求以 [npm 官方说明](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)为准。登录成功和 `--dry-run` 都不等于拥有发布权限。

## 2. 构建并制作安装包

`0.2.0` 已发布，`0.2.1` 是下一个待发布版本。以后修改代码并发布时须使用新版本，例如 `npm version patch --no-git-tag-version` 同时更新两个 package 文件；不能覆盖已经发布过的同名同版本。

在项目根目录执行：

```sh
npm ci
npm pack
tar -tzf ./bndynet-dsh-workspace-monitor-0.2.1.tgz
```

正常 `npm pack` 会执行 `prepack → npm run check → build + test`；任一步失败都不能继续。它只在本地生成安装包，不上传 npm。版本升级后同步调整本文命令中的版本与安装包名。详见 [npm pack](https://docs.npmjs.com/cli/v11/commands/npm-pack/)。

安装包应包含 `package.json`、`cordis.patch.yml`、`lib/index.js`、`lib/client.js`、`README.md`、`LICENSE` 和 `docs/`。源码、测试、`node_modules`、本地配置和认证文件不应混入运行安装包。

`npm pack --ignore-scripts` 仅适合已经对当前代码完成构建和全部测试后的重新封包，不要用它跳过检查。

## 3. 验收将要发布的同一份安装包

用独立的 `DSH_HOME` 或测试机器，通过 **Plugins → Add plugin → 安装包绝对路径 → Enable now** 安装 `bndynet-dsh-workspace-monitor-0.2.1.tgz`。路径属于运行 DSH 的机器。

- 悬停 Workspace 名称，检查精简列表、端口、脚本展开及运行/停止；Session 行继续使用自身提示。
- 验证根项目和子项目脚本启动、正常完成、失败退出码和日志，以及重复启动的处理。
- 停止测试服务后确认进程与端口退出；检查项目切换、手动刷新脚本列表和重启加载。
- 将系统、Node / DSH 版本及结果更新到 `docs/VERIFICATION.md`。

**旧的 `dsh-workspace-monitor` 与 `@bndynet/dsh-workspace-monitor` 不要并装或同时启用**，两者共用面板 ID 和 API 路由。先卸载旧包，再验收新包。兼容范围或运行逻辑改变后，也需重新验收。

## 4. 发布到 npm

以下为发布者完成前面步骤后手动执行的命令；本次未执行发布。上传已经验收的**同一份 `.tgz`**：

```sh
RELEASE_NAME='@bndynet/dsh-workspace-monitor'
RELEASE_VERSION='0.2.1'
RELEASE_TARBALL='./bndynet-dsh-workspace-monitor-0.2.1.tgz'

# 预演不验证包名权限
npm publish "$RELEASE_TARBALL" --dry-run --access public --tag next --registry=https://registry.npmjs.org

# 上传已验收的安装包，按提示完成认证
npm publish "$RELEASE_TARBALL" --access public --tag next --registry=https://registry.npmjs.org

# 核对线上版本、标签及完整性
npm view "$RELEASE_NAME@$RELEASE_VERSION" version dist.tarball dist.integrity --registry=https://registry.npmjs.org
npm view "$RELEASE_NAME" dist-tags --registry=https://registry.npmjs.org
```

`next` 是分发标签，上面的命令不会主动设为 `latest`；它不限制访问权限，也不表示 DSH 市场会隐藏该包。兼容范围仍由 `engines.dsh` 声明。

发布后，在全新 DSH 测试配置的 **Plugins → Add plugin** 输入 **`@bndynet/dsh-workspace-monitor@0.2.1`**，验证在线下载、启用和运行。确认通过后再将该版本设为默认：

```sh
npm dist-tag add @bndynet/dsh-workspace-monitor@0.2.1 latest --registry=https://registry.npmjs.org
```

发布与版本不可复用的规则见 [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)。

### GitHub Actions 自动发布

仓库已包含 [`.github/workflows/publish.yml`](../.github/workflows/publish.yml)，它按 [`bndynet/gh.flows` README](https://github.com/bndynet/gh.flows/blob/main/README.md) 的示例复用 [`npm.yml`](https://github.com/bndynet/gh.flows/blob/main/.github/workflows/npm.yml)：

- 调用方只传 `publish-enabled`、`publish-version` 等参数，不自己 checkout
- 共享 workflow 执行 checkout、`npm ci`、`npm test`、`npm run build`，再用 `npm publish --ignore-scripts --provenance` 发布，避免重复执行 `prepack`
- 调用方授予 `contents: write` 和 `id-token: write`；`contents: write` 用于可选的手动版本 bump 后提交并推送 tag
- npm 侧按调用方文件名 **`publish.yml`** 配置 Trusted Publisher；不要填 `npm.yml`

`0.2.0` 已在 npm 上，可以直接在 npm 包设置中配置 **Trusted Publisher**：

- Repository：`bndynet/dsh-workspace-monitor`
- Workflow：`publish.yml`
- Environment：留空（工作流未使用 environment）

工作流不需要 `NPM_TOKEN`，通过 GitHub OIDC 发布并生成 provenance。触发方式：

- 发布 GitHub Release：`publish-enabled` 为 true，使用当前 `package.json` 版本发布到 `latest`；建议 Release tag（如 `v0.2.1`）与包版本保持一致，工作流本身不做这项校验。
- Actions 页面手动运行：`publish_enabled` 默认 false，只执行测试和构建；勾选后才会发布。`publish-version` 可选 `none` / `patch` / `minor` / `major`，选择 bump 时会由共享 workflow 更新版本、发布，然后提交并推送 `v<version>` tag。
- `publish-command` 固定使用 `latest`；如需先发布到 `next`，修改该命令中的 `--tag`。

发布前会执行 `npm ci`、`npm test`、`npm run build`，然后直接发布当前工作区。

## 5. 更新、回退与插件发现

后续版本继续走“新版本 → 构建测试 → 本地包验收 → GitHub Actions 发布 → 线上安装验收”。建议用 Git 追踪源码并记录发行版本。

出问题时可将 `latest` 指回已验证版本，并让用户手动安装旧版。**修改 dist-tag 不会自动回退已安装的插件**；修复须发布新版本，不能覆盖旧版本或依赖撤包重复使用版本号。

若需在 DSH Discover 展示，还要将公开包加入用户订阅的插件索引并提供订阅地址。**发布 npm 不等于自动进入官方中心市场**；直接通过 Add plugin 输入包名安装无需订阅索引。参见 [DSH 插件索引文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/plugin-market.md)。

自动发布使用 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) 的 OIDC 方式，并通过 `bndynet/gh.flows` 复用共享 workflow；配置好 npm 侧的 Trusted Publisher 后即可由 GitHub Actions 发布。包结构参考 [DSH 官方打包文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)。
