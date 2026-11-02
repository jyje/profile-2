import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import {gzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import bodyParser from 'body-parser';
import qs from 'qs';
import {requestPath} from './request-path.mjs';

test('malformed request targets return a client error and leave serving alive', async () => {
  assert.match(readFileSync(new URL('./dev-all.mjs', import.meta.url), 'utf8'), /pathname === null[\s\S]*?writeHead\(400/);
  const server = http.createServer((req, res) => {
    res.writeHead(requestPath(req.url) === null ? 400 : 200);
    res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const get = path => new Promise((resolve, reject) => {
    http.get({host: '127.0.0.1', port: server.address().port, path}, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    }).on('error', reject);
  });
  try {
    assert.equal(await get('//['), 400);
    assert.equal(await get('/wiki/?q=test'), 200);
    assert.equal(requestPath('/wiki/?q=test#hash'), '/wiki/');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('compressed JSON errors remain bounded and subsequent requests succeed', {timeout: 10000}, async () => {
  const parser = bodyParser.json({limit: '8kb'});
  const server = http.createServer((req, res) => parser(req, res, error => {
    res.writeHead(error ? error.status || 500 : 200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(error ? {error: true} : req.body));
  }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const send = body => fetch(`http://127.0.0.1:${server.address().port}`, {
    method: 'POST', headers: {'Content-Type': 'application/json', 'Content-Encoding': 'gzip'}, body,
  });
  try {
    const good = gzipSync(JSON.stringify({ok: true}));
    for (const bad of [Buffer.from('synthetic invalid compressed data'), Buffer.concat([good, Buffer.from([1, 2, 3])])]) {
      const response = await send(bad);
      assert.equal(response.status, 400);
      await response.arrayBuffer();
    }
    const response = await send(good);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {ok: true});
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('qs preserves query values, encodes empty-array keys and handles unusual values', () => {
  const data = {name: 'a+b', nested: {value: '한글'}, items: ['x', 'y']};
  assert.deepEqual(qs.parse(qs.stringify(data)), data);
  assert.equal(qs.stringify({'a b': []}, {allowEmptyArrays: true}), 'a%20b[]');
  assert.doesNotThrow(() => qs.stringify({items: [Object.create(null)]}, {arrayFormat: 'comma'}));
});
