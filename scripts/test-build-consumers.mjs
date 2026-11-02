import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);

test('serialization overrides retain worker CSS source maps and callable copy transforms', {timeout: 60000}, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'build-consumers-'));
  const webpack = require('webpack');
  const Extract = require('mini-css-extract-plugin');
  const Minimize = require('css-minimizer-webpack-plugin');
  const Copy = require('copy-webpack-plugin');
  let compiler;
  try {
    await fs.writeFile(path.join(root, 'entry.js'), 'import "./style.css";');
    await fs.writeFile(path.join(root, 'style.css'), '.example { color: #ff0000; padding: 0px 0px 0px 0px; }');
    await fs.writeFile(path.join(root, 'asset.txt'), 'synthetic public asset');
    compiler = webpack({mode: 'production', context: root, entry: './entry.js', devtool: 'source-map',
      output: {path: path.join(root, 'out'), filename: 'bundle.js'},
      module: {rules: [{test: /\.css$/, use: [Extract.loader, require.resolve('css-loader')]}]},
      plugins: [new Extract({filename: 'styles.css'}), new Copy({patterns: [{from: 'asset.txt', to: 'copied.txt',
        transform: {transformer: input => Buffer.from(input.toString().toUpperCase()), cache: true}}]})],
      optimization: {minimizer: [new Minimize({parallel: 2})]},
    });
    const stats = await new Promise((resolve, reject) => compiler.run((error, result) => error ? reject(error) : resolve(result)));
    assert.equal(stats.hasErrors(), false, 'Build consumer compilation must succeed');
    const css = await fs.readFile(path.join(root, 'out/styles.css'), 'utf8');
    assert.match(css, /\.example\{color:red;padding:0\}/);
    const map = JSON.parse(await fs.readFile(path.join(root, 'out/styles.css.map')));
    assert.ok(map.sources.some(source => source.includes('style.css')));
    assert.equal(await fs.readFile(path.join(root, 'out/copied.txt'), 'utf8'), 'SYNTHETIC PUBLIC ASSET');
  } finally {
    if (compiler) await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve()));
    await fs.rm(root, {recursive: true, force: true});
  }
});
