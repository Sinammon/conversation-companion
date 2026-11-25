import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';

function launchEnv(overrides) {
  return { ...process.env, HOST: '127.0.0.1', PORT: '0', GEMINI_API_KEY: '', ...overrides };
}

function expectStartupError(overrides, code, hint) {
  const result = spawnSync(process.execPath, ['server/index.mjs'], {
    env: launchEnv(overrides), encoding: 'utf8', timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, code);
  assert.match(result.stderr, hint);
  assert.doesNotMatch(result.stderr, /\n\s+at |Unhandled 'error' event/);
}

test('a duplicate server explains how to check the existing listener', async () => {
  const occupied = createServer().listen(0, '127.0.0.1');
  await once(occupied, 'listening');
  try {
    expectStartupError({ PORT: String(occupied.address().port) }, /EADDRINUSE/, /\/health/);
  } finally {
    await new Promise(resolve => occupied.close(resolve));
  }
});

test('an unavailable LAN address points the user to HOST', () => {
  expectStartupError({ HOST: '192.0.2.1' }, /EADDRNOTAVAIL/, /HOST.*Wi-Fi/);
});

test('invalid ports get a configuration error before listening', () => {
  for (const PORT of ['oops', '65536', '1.5', '-1', '0x100']) {
    expectStartupError({ PORT }, /PORT/, /whole number/);
  }
});

test('a server starts on a free port and health works without a key', { timeout: 10000 }, async () => {
  const child = spawn(process.execPath, ['server/index.mjs'], { env: launchEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = once(child, 'exit');
  try {
    const [output] = await Promise.race([
      once(child.stdout, 'data'),
      exited.then(([code]) => { throw new Error('Server exited before startup with code ' + code); }),
    ]);
    const url = String(output).match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    assert.ok(url);
    const reply = await fetch(url + '/health', { signal: AbortSignal.timeout(3000) });
    assert.equal(reply.status, 200);
    assert.equal((await reply.json()).status, 'missing-key');
  } finally {
    child.kill();
    await exited;
  }
});
