import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {Agent, fetch} from 'undici';

test('Undici honors explicit certificate trust and rejects hostname mismatches', {timeout: 20000}, async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'synthetic-tls-'));
  const key = path.join(directory, 'key.pem'); const certificate = path.join(directory, 'cert.pem');
  let server; const agents = [];
  try {
    // Ephemeral fixture only. No operational certificate/key is read or stored.
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
      '-addext', 'subjectAltName=DNS:localhost', '-keyout', key, '-out', certificate], {stdio: 'ignore', timeout: 10000});
    const cert = await fs.readFile(certificate);
    server = https.createServer({key: await fs.readFile(key), cert}, (_req, res) => res.end('synthetic response'));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `https://127.0.0.1:${server.address().port}`;
    const agent = options => {const value = new Agent(options); agents.push(value); return value;};
    await assert.rejects(fetch(url, {dispatcher: agent({connect: {servername: 'localhost'}})}),
      error => ['DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN'].includes(error.cause?.code));
    const trusted = await fetch(url, {dispatcher: agent({connect: {ca: cert, servername: 'localhost', rejectUnauthorized: true}})});
    assert.equal(await trusted.text(), 'synthetic response');
    await assert.rejects(fetch(url, {dispatcher: agent({connect: {ca: cert, servername: 'wrong.invalid', rejectUnauthorized: true}})}),
      error => error.cause?.code === 'ERR_TLS_CERT_ALTNAME_INVALID');
  } finally {
    await Promise.all(agents.map(agent => agent.destroy()));
    if (server) await new Promise(resolve => server.close(resolve));
    await fs.rm(directory, {recursive: true, force: true});
  }
});

test('Undici controls response size and aborts without breaking subsequent requests', {timeout: 10000}, async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/large') res.end('x'.repeat(512));
    else res.end('ok');
  });
  const agent = new Agent({maxResponseSize: 64});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await assert.rejects(async () => {
      const response = await fetch(url + '/large', {dispatcher: agent}); await response.text();
    }, error => error.cause?.code === 'UND_ERR_RES_EXCEEDED_MAX_SIZE' || error.code === 'UND_ERR_RES_EXCEEDED_MAX_SIZE');
    const controller = new AbortController(); controller.abort();
    await assert.rejects(fetch(url, {dispatcher: agent, signal: controller.signal}), {name: 'AbortError'});
    assert.equal(await (await fetch(url, {dispatcher: agent})).text(), 'ok');
  } finally {await agent.destroy(); await new Promise(resolve => server.close(resolve));}
});
