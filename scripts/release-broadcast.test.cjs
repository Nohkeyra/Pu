const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { spawn } = require('node:child_process');

// Exercise the actual workflow shell against local HTTP responses. No GitHub
// release is created, and no production service or credential is used.
const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/build-apk.yml'), 'utf8');
// Extract only the named YAML step and its indented shell block. Do not
// consume subsequent workflow steps (especially release deletion commands).
const lines = workflow.split(/\r?\n/);
const start = lines.findIndex(line => line.trim() === '- name: Trigger Automatic In-App Live Update Broadcast');
assert.ok(start >= 0, 'Release broadcast step missing');
const indent = lines[start].match(/^ */)[0].length;
const next = lines.findIndex((line, i) => i > start && line.trim() && !line.trimStart().startsWith('#') && line.match(/^ */)[0].length <= indent);
const step = lines.slice(start + 1, next < 0 ? undefined : next);
const run = step.findIndex(line => line.trim() === 'run: |');
assert.ok(run >= 0, 'Release broadcast run block missing');
const runIndent = step[run].match(/^ */)[0].length;
const bodyLines = [];
for (const line of step.slice(run + 1)) {
  if (line.trim() && line.match(/^ */)[0].length <= runIndent) break;
  bodyLines.push(line.slice(runIndent + 2));
}
const body = bodyLines.join('\n');
assert.ok(body.includes('synced=true'), 'Expected successful sync output');
assert.ok(!body.includes('gh api'), 'Release retention must not execute in broadcast tests');

for (const [status, success, expected] of [[401, false, false], [200, false, false], [200, true, true]]) {
  test(`release broadcast: HTTP ${status}, success=${success} produces the correct result`, async () => {
    const server = http.createServer((_request, response) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ success }));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'release-broadcast-test-'));
    const githubOutput = path.join(temp, 'output');
    fs.writeFileSync(githubOutput, '');
    try {
      const script = body
        .replace('https://restoran-wawasan-bio.onrender.com/api/app-version/github-sync', `http://127.0.0.1:${server.address().port}/sync`)
        .replaceAll('${{ env.VERSION_NAME }}', '1.3.179')
        .replaceAll('${{ env.VERSION_CODE }}', '311');
      const result = await new Promise((resolve, reject) => {
        const child = spawn('bash', ['-c', script], { env: { ...process.env, SYNC_SECRET: 'local-test-only', GITHUB_OUTPUT: githubOutput } });
        let output = '';
        child.stdout.on('data', chunk => { output += chunk; });
        child.stderr.on('data', chunk => { output += chunk; });
        child.on('error', reject);
        child.on('close', code => resolve({ code, output }));
      });
      assert.equal(result.code === 0, expected, result.output);
      assert.equal(result.output.includes('Broadcast request completed successfully!'), expected);
      assert.equal(fs.readFileSync(githubOutput, 'utf8').trim(), expected ? 'synced=true' : '');
    } finally {
      await new Promise(resolve => server.close(resolve));
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
}
