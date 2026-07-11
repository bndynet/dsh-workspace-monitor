# 发布指南

[返回 README](../README.md)

## 当前状态

本项目使用 **`@bndynet/dsh-workspace-monitor`**，当前版本 **`0.2.0`**，**尚未发布到 npm**。本次仅更新包名与文档，没有执行登录或公开发布。

旧的 unscoped 名称 `dsh-workspace-monitor` 已在公共 npm 存在，本项目现在采用 `@bndynet` scope。名称已确定，无需再改名；发布者仍须确认账号拥有该 scope 的创建及发布权限。

| 项目 | 当前结论 |
| --- | --- |
| 构建与分发 | 正常 `npm pack` 自动构建并运行测试；安装包包含预编译 Host / Web、bundle patch、说明与 MIT 许可证，安装端无需构建 |
| 安装包 | `bndynet-dsh-workspace-monitor-0.2.0.tgz`；发布前须验收这份 scoped 安装包，不能沿用旧包的验收结果 |
| npm 账号 | 此前公共 registry 的 `npm whoami` 返回 `ENEEDAUTH`；尚未确认发布账号及 scope 权限，发布前须重新核对 |
| 支持范围 | 仅声明 DSH **0.2.2-rc.1 Web UI**；macOS 已做界面验收，Linux 已做容器采集和脚本管理测试；Windows 运行/停止不可用 |
| 项目元数据 | 尚无 `author`、`repository`、`homepage`、`bugs`；建议按真实信息补齐，勿填写不存在的链接 |

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

首次发布前，包查询返回 `E404` 可以是尚未创建，并不证明当前账号有 scope 权限。请在 npm 确认登录账号对 `@bndynet` 的创建与发布权限；若该 scoped 包已经存在，还需确认包权限：

```sh
npm owner ls @bndynet/dsh-workspace-monitor --registry=https://registry.npmjs.org
```

本地手动发布按 npm 提示完成登录与 2FA 验证，认证要求以 [npm 官方说明](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)为准。登录成功和 `--dry-run` 都不等于拥有发布权限。

## 2. 构建并制作安装包

首次发布可保留尚未使用的 `0.2.0`。以后修改代码并发布时须使用新版本，例如 `npm version patch --no-git-tag-version` 同时更新两个 package 文件；不能覆盖已经发布过的同名同版本。

在项目根目录执行：

```sh
npm ci
npm pack
tar -tzf ./bndynet-dsh-workspace-monitor-0.2.0.tgz
```

正常 `npm pack` 会执行 `prepack → npm run check → build + test`；任一步失败都不能继续。它只在本地生成安装包，不上传 npm。版本升级后同步调整本文命令中的版本与安装包名。详见 [npm pack](https://docs.npmjs.com/cli/v11/commands/npm-pack/)。

安装包应包含 `package.json`、`cordis.patch.yml`、`lib/index.js`、`lib/client.js`、`README.md`、`LICENSE` 和 `docs/`。源码、测试、`node_modules`、本地配置和认证文件不应混入运行安装包。

`npm pack --ignore-scripts` 仅适合已经对当前代码完成构建和全部测试后的重新封包，不要用它跳过检查。

## 3. 验收将要发布的同一份安装包

用独立的 `DSH_HOME` 或测试机器，通过 **Plugins → Add plugin → 安装包绝对路径 → Enable now** 安装 `bndynet-dsh-workspace-monitor-0.2.0.tgz`。路径属于运行 DSH 的机器。

- 悬停 Workspace 名称，检查精简列表、端口、脚本展开及运行/停止；Session 行继续使用自身提示。
- 验证根项目和子项目脚本启动、正常完成、失败退出码和日志，以及重复启动的处理。
- 停止测试服务后确认进程与端口退出；检查项目切换、手动刷新脚本列表和重启加载。
- 将系统、Node / DSH 版本及结果更新到 `docs/VERIFICATION.md`。

**旧的 `dsh-workspace-monitor` 与 `@bndynet/dsh-workspace-monitor` 不要并装或同时启用**，两者共用面板 ID 和 API 路由。先卸载旧包，再验收新包。兼容范围或运行逻辑改变后，也需重新验收。

## 4. 发布到 npm

以下为发布者完成前面步骤后手动执行的命令；本次未执行发布。上传已经验收的**同一份 `.tgz`**：

```sh
RELEASE_NAME='@bndynet/dsh-workspace-monitor'
RELEASE_VERSION='0.2.0'
RELEASE_TARBALL='./bndynet-dsh-workspace-monitor-0.2.0.tgz'

# 预演不验证包名权限
npm publish "$RELEASE_TARBALL" --dry-run --access public --tag next --registry=https://registry.npmjs.org

# 上传已验收的安装包，按提示完成认证
npm publish "$RELEASE_TARBALL" --access public --tag next --registry=https://registry.npmjs.org

# 核对线上版本、标签及完整性
npm view "$RELEASE_NAME@$RELEASE_VERSION" version dist.tarball dist.integrity --registry=https://registry.npmjs.org
npm view "$RELEASE_NAME" dist-tags --registry=https://registry.npmjs.org
```

`next` 是分发标签，上面的命令不会主动设为 `latest`；它不限制访问权限，也不表示 DSH 市场会隐藏该包。兼容范围仍由 `engines.dsh` 声明。

发布后，在全新 DSH 测试配置的 **Plugins → Add plugin** 输入 **`@bndynet/dsh-workspace-monitor@0.2.0`**，验证在线下载、启用和运行。确认通过后再将该版本设为默认：

```sh
npm dist-tag add @bndynet/dsh-workspace-monitor@0.2.0 latest --registry=https://registry.npmjs.org
```

发布与版本不可复用的规则见 [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)。

## 5. 更新、回退与插件发现

后续版本继续走“新版本 → 构建测试 → 本地包验收 → npm next → 线上安装验收 → latest”。建议用 Git 追踪源码并记录发行版本；需要自动发布时再接入 CI。

出问题时可将 `latest` 指回已验证版本，并让用户手动安装旧版。**修改 dist-tag 不会自动回退已安装的插件**；修复须发布新版本，不能覆盖旧版本或依赖撤包重复使用版本号。

若需在 DSH Discover 展示，还要将公开包加入用户订阅的插件索引并提供订阅地址。**发布 npm 不等于自动进入官方中心市场**；直接通过 Add plugin 输入包名安装无需订阅索引。参见 [DSH 插件索引文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/plugin-market.md)。

后续可采用 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) 的 OIDC 发布方式，需先配置真实仓库与 workflow。包结构参考 [DSH 官方打包文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)。
