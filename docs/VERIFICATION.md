# Verification — 0.3.2

Date: 2026-11-18 (Asia/Shanghai).

## Expandable endpoint preview

The full build and test suite passed: **139 tests, 0 failed, 0 skipped**, including 41 Client checks. New coverage exercises four-endpoint previews, accessible expand/collapse controls, full TCP/UDP/IPv6 endpoint rendering, independent task disclosures and viewport height limits for very tall content.

Actual browser acceptance used official DSH **0.2.2-rc.1**, an isolated `DSH_HOME`, and the installed **`@bndynet/dsh-workspace-monitor@0.3.2`** local tarball. Installed Host/browser bundles matched the local build. Only task-created fixtures were used; no public publish was performed.

- A temporary Node process listened on **80 TCP endpoints and 1 UDP endpoint** in its test Workspace. System collection and the hover preview both reported all **81** endpoints.
- The compact row showed four ports plus an accessible **+77** button. Clicking it displayed all 81 full endpoints; clicking Less restored four compact chips and removed the expanded rows.
- A managed portless worker kept automatic refresh active. The expanded endpoint list remained expanded across subsequent scans.
- At **1280 × 720**, the popover was **430px** tall with `overflow-y: auto`, `overflow-x: hidden`, and scroll height **1716px**. Document scroll dimensions remained **1280 × 720**, with `window.scrollY === 0`.
- Scrolling inside the popover reached its final endpoint (`scrollTop` 1287.5px of 1288px), while page scroll stayed at zero.
- At **1280 × 420**, the popover automatically capped at **400px**, positioned from y=10 to y=410. Document height stayed **420px**, and expansion remained active.
- Keyboard Enter activated expansion. Closing and reopening the Workspace preview restored the collapsed four-port state. Stop controls remained enabled beside the task headings.
- Saved `workspace-monitor-ports-expanded.jpg` in the task's visualization directory as the visual proof.
- Stopped the isolated DSH server and both test processes after acceptance. A fresh system scan found **zero remaining temporary tasks and zero remaining endpoints**.

---

# Previous verification — 0.3.1

Date: 2026-11-18 (Asia/Shanghai).

## Scoped package preparation

Renamed the distributable package to **`@bndynet/dsh-workspace-monitor@0.3.1`**. The manifest, root lockfile records and quoted DSH patch package reference agree. Rebuilt the browser bundle with the scoped module-factory ID; the existing artifact test confirms that ID equals `package.json.name`. Stable UI IDs and API paths are unchanged.

Configured `publishConfig` for public access at `https://registry.npmjs.org`. This only sets publishing defaults; it does not authenticate, grant scope permissions or upload a package. The full `npm run check` passed again after the rename: **135 passed, 0 failed, 0 skipped**. The official DSH **0.2.2-rc.1** CLI also installed the scoped tarball offline into a fresh temporary `DSH_HOME`; `--dump-config` included the scoped bundle, and its installed Host/browser bundles and patch matched the local build byte-for-byte. This checks scoped packaging and configuration, while the earlier visual acceptance below was performed under the unscoped name. No login or `npm publish` was performed.

## Release packaging audit

After relocating the project to its own directory, ran a fresh `npm ci` and a normal `npm pack` on macOS with Node.js **26.13.1** and npm **11.20.0**. The `prepack` lifecycle built both bundles and ran the complete suite: **135 passed, 0 failed, 0 skipped**. The archive contained seven expected files: the manifest, bundle patch, two prebuilt bundles, README, MIT license and this verification document. Documentation-only updates were then repacked without rerunning unchanged code tests.

This verifies local packaging, not public publication. The public registry already contains `dsh-workspace-monitor` (queried latest: **0.1.3**, repository: `Rainier-Z/dsh-workspace-monitor`), and `npm whoami` against that registry returned `ENEEDAUTH`. Package ownership and publisher authentication remain to be confirmed. No login or public publish was performed.

## Compact hover presentation

Build succeeded. **39/39 targeted checks passed**: 37 Client checks and 2 prebuilt bundle checks. The added projection regression verifies that each active script retains exactly one Stop control both before and after system-process discovery, other scripts remain runnable, and failed exits remain visible. The previous complete 0.3.0 regression results are retained below; Host behavior is unchanged in 0.3.1.

Actual DSH Web UI, official **0.2.2-rc.1**, isolated macOS installation:

- Installed the precompiled 0.3.1 archive with the official plugin CLI. Installed Host and browser bundles matched the final build byte-for-byte.
- Hovered the Workspace name and verified the compact card has only the Workspace heading: no visible Available commands or Launched here headings.
- Root scripts use one row with a script-name disclosure and Run/Stop icon. Nested `hello` showed `packages/demo` on that same row. Root package metadata is omitted from this compact view.
- Expanded `dev` and read its actual `npm run dev` / `node server.mjs` definition, then collapsed it and clicked its Run icon.
- The actual service appeared as `npm run dev` with TCP port **59345** and one Stop control; its duplicate catalog entry was absent. The other two scripts retained their Run controls.
- Read-only DOM inspection measured **344 × 170 CSS pixels** for the card with one running task and two available scripts. The Workspace name was its only visible heading.
- Clicking the compact Stop icon succeeded; the UI showed **Stopped · Exit 0**, zero tasks and zero endpoints.
- Saved `workspace-monitor-compact-preview.jpg` beside the archive. The full panel retained its existing headings and layout.
- The isolated DSH service and task-created fixtures were stopped after verification.

---

# 0.3.0 regression baseline

Date: 2026-11-18 (Asia/Shanghai).

## Automated checks

Final build succeeded. The full 0.3.0 suite passed: **134 tests, 0 failures, 0 skipped** across 12 files on macOS, Node.js 26.13.1.

- 24 collector tests: platform parsers, directory boundaries, wrapper grouping, missing ports, command redaction, PID identity, and actual temporary TCP/UDP listeners plus a portless worker.
- 38 Host tests: owner authorization, session-bound and Workspace-registry paths, empty-workspace scanning without a session, persisted headers, cache and identity isolation, cancellation, deadlines, concurrency limits, lifecycle disposal, the five exact API routes, RPC envelope validation and correlation, command discovery, scoped run/stop/output dispatch, external stop routing, mutation validation, and sanitized action failures.
- 36 Client tests: filtering, uptime, IPv6 endpoints, React rendering and text escaping, no-port display, sidebar and overlay registration, Connection invocation, delayed hover/grace timers, rapid re-entry, switching projects and stale replies, Escape dismissal, native-card suppression and restoration, readable command shortening, the compact five-task limit, script catalogs and run/stop controls, duplicate-action suppression, managed run projections, failed exit display, partial-stop feedback, polling without overlapping slow scans, and action refresh superseding stale replies.
- 17 Actions tests: root/subproject script discovery, package-manager selection and inheritance, command identities and stale-definition rejection, symlink and traversal limits, discovery without execution, real npm startup/stop, duplicate starts, exit codes, bounded/redacted output including sensitive values split across truncated chunks, concurrency limits, disposal, missing managers, Workspace-scoped run identities, and launch cancellation.
- 17 Process-control tests: fresh-scan task identities, invalid IDs, missing tasks, weak project evidence, infrastructure/host/ancestor protection, PID reuse before and after preflight, Linux start-tick comparison, cwd and user boundaries, verified children-first SIGTERM, graceful shutdown without forced external kills, changed process titles, permission failures, Windows refusal, cancellation before and during the final identity check, and an actual temporary TCP service stopped by identity.
- 2 prebuilt artifact tests: DSH module-factory loading with shared Host React, and importing the Host bundle without runtime package dependencies.

Verified targeted results for 0.3.0:

- Host suite: **38/38 passed** on macOS during integration.
- Process-control suite: **17/17 passed** on macOS, including launching its own isolated temporary TCP child, locating it with a fresh system scan, checking its identity, sending SIGTERM, and confirming exit. Unit fixtures cover Linux start ticks and PID reuse; this does not claim a Linux machine was used for the external-stop integration test.
- Actions suite: **17/17 passed** on both macOS and a Linux container, including real npm startup and managed stopping, output, concurrency and cleanup. This is not a claim that every installed package manager was exercised: pnpm/yarn/bun selection is covered by catalog fixtures.

Historical collector verification: **24/24 passed** in an ephemeral `node:24-bookworm-slim` Docker container, source mounted read-only, with `--network none --rm`. Those tests create only their own TCP/UDP fixtures and worker. This validates the Linux kernel `/proc` path; it is not a claim of testing the user's Ubuntu installation.

Windows: fixture parsing and attribution tests only; no Windows machine was used.

## Actual DSH Web UI — 0.3.0

Runtime: official `@deepseek-ai/dsh@0.2.2-rc.1`, isolated npm installation and `DSH_HOME` on macOS. Installed the prebuilt 0.3.0 archive with the official plugin CLI, then used the actual DSH Web UI in a browser.

- Hovered the **Workspace Monitor Demo** Workspace name and verified root `dev` / `worker` scripts, their run icons and expandable script definitions. No model key or conversation was needed.
- Clicked Run for `dev` inside the hover card, then opened the full Running Tasks panel. It showed the managed npm leader PID **27817**, child **27858**, and real TCP port **53719**. A separate request to this port returned the fixture's HTTP response.
- Expanded the task's Output and read the actual startup message containing that same port.
- Started an independent, task-created portless worker in another terminal, PID **28935**. The panel discovered it with “No listening ports”. Clicking its stop icon terminated it with exit 0 and removed it from the scan.
- Clicked the managed development service's stop icon inside the Workspace hover card. The UI showed “Stopped · Exit 0”; separate checks confirmed both PIDs had exited and port 53719 refused connections.
- Changed the fixture's `package.json` and added `packages/demo/package.json`. Reopening the hover card listed the new root scripts and the nested `hello` script with its package directory.
- Clicked `check` and `fail`; the full panel showed **Completed · Exit 0** and **Failed · Exit 7** respectively. Expanding the failed run showed its actual stderr message.
- Captured `workspace-monitor-controls-preview.jpg` (full panel) and `workspace-monitor-controls-hover.jpg` (Workspace hover card) beside the archive.

Final rebuilt-artifact recheck passed:

- Reinstalled the archive and compared both installed bundle SHA-256 hashes with the final build; Host and browser files matched.
- Started a short `check` script from the hover card and kept the pointer in it. Without closing/reopening, the card changed to **Completed · Exit 0** after its active-run refresh.
- Added a `refresh-check` script while the full panel remained open. Clicking its top-level Refresh added the script to Available commands.
- Started nested `fixture-subproject: hello` through the full panel and read **Subproject ready** from its output; the run completed with exit 0.
- Started `dev` again: PID **34182**, real TCP port **55985**. Stopped it from the Workspace hover card; the final UI showed Stopped / zero tasks. Independent OS and network checks confirmed process exit, refused connections, and **zero remaining fixture tasks**.
- Hovered the New Session row and observed its original name/path/Idle tooltip. Read-only DOM inspection confirmed **zero plugin Workspace popovers** on the Session row.
- Stopped the task's isolated DSH service after verification. All fixture processes are cleaned up.

## Historical actual DSH Web UI — 0.1.0

Runtime: official npm `@deepseek-ai/dsh@0.2.2-rc.1`, installed in an isolated task working directory with a separate `DSH_HOME`.

- Installed the precompiled `.tgz` through **Plugins → Add plugin**; no install-time build was required.
- Enabled the bundle and validated Host and browser loading after restarting DSH.
- Opened **Running Tasks** through the right sidebar guide.
- Started two temporary processes in the selected test workspace: an HTTP listener and a worker without sockets.
- Confirmed the actual listener port **63362** and both process IDs were visible, with the worker explicitly showing **No listening ports**.
- Confirmed filtering by port returned only the matching task.
- Expanded a task to verify cwd-based attribution, the actual endpoint, and its process details.
- Confirmed turning off automatic refresh displayed **Paused**.
- Captured `workspace-monitor-preview.jpg` in the parent output directory.

All test fixtures are task-created and are stopped after verification. No model API key or model call is needed for the monitor.

## Historical Workspace hover preview — 0.2.0

- Registered two additional test Workspaces through DSH's public Workspace registry: a project with running commands and an empty project. Neither project needed a DSH session.
- Left the selected session in a different Workspace, then hovered the running project's sidebar row.
- Verified the compact popover displayed `npm run dev`, its real listener port **65191**, and a portless worker. The selected session did not change.
- Moved the pointer from the row into the popover; the preview remained readable.
- Pressed Escape and verified that the preview closed.
- Hovered the empty project and verified an explicit zero-task empty state.
- Verified the native Workspace metadata card did not appear alongside the plugin's preview.
- Captured `workspace-monitor-hover-preview.jpg` in the parent output directory.

## Integration choice

The plugin uses the owner-only `ctx.connection.fetch.register` API for five endpoints under `/api/workspace-monitor/`: `scan`, `commands`, `run`, `stop`, and `output`. The browser calls the official Connection RPC client on `/api`, preserving its request IDs, response envelope, authentication and deployment URL handling. Each Host adapter accepts only its matching RPC method. Project paths are resolved from the selected Session header or a registered Workspace ID; mutations accept opaque command/task/run identities rather than client-supplied commands, PIDs or directories.

Managed runs retain their own ChildProcess and use a separate process group. On Linux, group signalling additionally checks the leader's kernel start ticks and group ID, then rechecks that its exit has not already been observed. External stops use an uncached scan and re-read each individual PID's identity immediately before SIGTERM. Node's numeric PID API does not make the final identity read and signal atomic; the implementation minimizes that interval and never sends process-group signals or SIGKILL to scanner-discovered external tasks.

A script that backgrounds/daemonizes a child and exits is outside the retained managed leader's lifecycle. This was independently reproduced with an isolated `node worker.cjs &` script: the run completed while its child remained alive, and managed disposal did not claim ownership through a stale group ID. The test-created worker was explicitly cleaned up. Such services remain eligible for ordinary system scanning and the external-stop rules; this limitation is documented in README.

The hover preview renders through `shell.overlay`. Because rc.1 has no Workspace-specific hover content slot, a version-pinned adapter observes only Workspace tree rows within the sidebar's `sidebar.workspaces` slot and validates IDs against the public Workspace model. It does not intercept row click, expand, menu or drag events. Native-card suppression is restricted to the current Workspace path and restores its private DOM markers on dismissal/cleanup.

This avoids the `0.2.2-rc.1` generic custom-channel registration path, which encounters a Cordis service injection error. No DSH runtime files were patched.

Compatibility is deliberately declared as the exact validated DSH release in `engines.dsh`. Validate other DSH releases before widening it.
