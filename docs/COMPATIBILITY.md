# 兼容性

[返回 README](../README.md)

## 声明范围

`package.json` 的 `engines.dsh` 是 **semver range**，不是精确版本：

```json
"dsh": ">=0.2.2-rc.1 <0.4.0"
```

DSH 在加载插件前用这个范围校验运行版本（`includePrerelease`）。精确写 `0.2.2-rc.1`
会让插件只在那个构建上通过；升级到 `0.2.2-rc.5` 后 DSH 会跳过插件并报告
`incompatible`。这就是 0.2.2 及更早版本实际发生的情况。

| 范围 | 含义 |
| --- | --- |
| `>=0.2.2-rc.1` | 最低验证过的版本，更早的 DSH 不声明支持 |
| `<0.4.0` | 已验证到 0.3.x 线；0.4.0 起需要重新验证后再放宽 |

不写无上限的 `>=0.2.2-rc.1`，是因为 DSH 在 1.0 前每个 minor 都可能改动插件接口。
上限明确"已经验证到哪"，比让插件在未知版本上加载成半可用状态更可预期。

## 不匹配时会怎样

- **整个版本不在范围内**：DSH 拒绝加载该 bundle，Plugins 页面显示不兼容原因；不会崩溃，也不会执行插件代码。
- **部分接口缺失**（版本在范围内、但某个服务或槽位改名）：Host 与 Web 入口会先做能力检测。
  - Host 在 `connection.fetch.register` 不可用时记录原因并保持 inactive，不抛异常。
  - Web 端在 `slots` / `connection.rpc` 不可用时保持 inactive；侧栏标签接口单独失败时，
    面板与悬停预览仍会注册。
  - `slots.inject` 依赖的槽位被移除时，该入口不渲染，其余入口继续工作。
- 需要临时绕过范围校验时，可使用 DSH 的精确版本豁免（`dsh plugin allow-version` 或
  Plugins 页面）。豁免只对确切的 `插件名@版本` + `DSH 版本` 对生效，风险由使用者承担；
  优先选择放宽范围前先验证。

## 验证方式

### 本地：契约测试

```sh
npm test          # 有 DSH 时运行 tests/compat；没有时跳过
npm run check:dsh # 必须找到 DSH，否则失败
```

`tests/compat/dsh-surface.test.mjs` 直接调用 DSH 自己的
`evaluatePluginCompatibility` 校验 `engines.dsh`，并检查插件实际依赖的表面仍存在：

- `dsh.client.inject` 里的每个 Web 模块仍导出 `./client`；
- Host 服务 `connection`、`sessions`、`sessionPersistence`、`jobs`、`workspaceRegistry`；
- Web 服务 `slots`、`sidebarRightTabs`、`connection`、`uiWorkspace`；
- 槽位 `shell.overlay`、`sidebar.right.pane.tab`；
- `connection` 的 Host Fetch 路由注册能力。

DSH 安装位置的解析顺序：`DSH_INSTALL_DIR`、`DSH_PACKAGE_JSON`、仓库内
`node_modules/@deepseek-ai/dsh`、`PATH` 上的 `dsh`。远程服务器或临时安装可用：

```sh
DSH_INSTALL_DIR=/path/to/dsh npm run check:dsh
```

### CI：跟随最新版

`.github/workflows/compat.yml` 在每周一、手动触发，以及 `package.json`、`src/`、
`tests/compat/` 变更时，把 `@deepseek-ai/dsh@latest` 安装到仓库外的 `.dsh-compat/`，
再执行 `npm run check:dsh`。新版本改动了插件接口时，CI 会在发布前给出具体的失败表面。

## 新 DSH 版本发布后

1. 升级本机 DSH，运行 `npm ci && npm run check:dsh`。
2. 测试失败时，按报错的位置适配代码；同时更新 `tests/compat` 中对应的断言和输入。
3. 全部通过后，只放宽一个 minor 上限（例如 `<0.4.0` → `<0.5.0`），同步更新本文和
   `README.md`、`docs/USAGE.md` 中的范围说明。
4. `npm version patch`，重新 `npm pack` / 发布；用户升级后在 Plugins 页面启用。

不要为了省事删除 `engines.dsh` 或改成精确版本：前者会让 DSH 失去加载前的保护，
后者会在下一次 DSH 构建时再次失效。

## 已验证基线

| DSH 版本 | 插件版本 | 验证内容 |
| --- | --- | --- |
| 0.2.2-rc.5 | 0.2.3 | 契约测试、隔离 profile 加载、Host/Client bundle 生成 |
| 0.2.2-rc.1 | 0.3.2 | 历史版本：面板、悬停预览、端口展开、脚本启动/停止的真实浏览器验收 |
