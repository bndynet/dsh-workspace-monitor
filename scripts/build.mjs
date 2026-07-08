import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
await mkdir(resolve(root, 'lib'), { recursive: true });
await build({
  absWorkingDir: root,
  entryPoints: ['src/host/index.mjs'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  legalComments: 'eof',
});

const client = await build({
  absWorkingDir: root,
  entryPoints: ['src/client/index.jsx'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  legalComments: 'eof',
});
// DSH's browser loader materializes a package factory; React is supplied by DSH.
const wrapped = `window.__ModuleLoader__.load({id:${JSON.stringify(pkg.name)},factory:(require)=>{\nvar module={exports:{}};var exports=module.exports;\n${client.outputFiles[0].text}\nreturn module.exports;\n}});\n`;
await writeFile(resolve(root, 'lib/client.js'), wrapped);
console.log(`Built ${pkg.name}@${pkg.version} (Host + Web UI).`);
