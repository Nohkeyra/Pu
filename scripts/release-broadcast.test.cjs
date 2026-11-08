const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

// Exercise the actual workflow shell against local HTTP responses. No GitHub
// release is created, and no production service or credential is used.
const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/build-apk.yml'), 'utf8');
const step = workflow.slice(workflow.indexOf('- name: Trigger Automatic In-App Live Update Broadcast'));
const body = step.slice(step.indexOf('run: |') + 'run: |'.length).trimEnd()
  .split('\n').slice(1).map(line => line.slice(10)).join('\n');

for (const [status, success, expected] of [[401, false, false], [200, false, false], [200, true, true]]) {
  test(`release broadcast: HTTP ${status}, success=${success} produces the correct result`, async () => {
    const server = http.createServer((_request, response) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ success }));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const script = body
        .replace('https://restoran-wawasan-bio.onrender.com/api/app-version/github-sync', `http://127.0.0.1:${server.address().port}/sync`)
        .replaceAll('${{ env.VERSION_NAME }}', '1.3.179')
        .replaceAll('${{ env.VERSION_CODE }}', '311');
      const result = await new Promise((resolve, reject) => {
        const child = spawn('bash', ['-c', script], { env: { ...process.env, SYNC_SECRET: 'local-test-only' } });
        let output = '';
        child.stdout.on('data', chunk => { output += chunk; });
        child.stderr.on('data', chunk => { output += chunk; });
        child.on('error', reject);
        child.on('close', code => resolve({ code, output }));
      });
      assert.equal(result.code === 0, expected, result.output);
      assert.equal(result.output.includes('Broadcast request completed successfully!'), expected);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
}
