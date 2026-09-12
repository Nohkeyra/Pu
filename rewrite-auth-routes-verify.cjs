const fs = require('fs');
let code = fs.readFileSync('server/routes/authRoutes.ts', 'utf8');

// Replace /admin/verify
code = code.replace(
  /router\.get\('\/admin\/verify', verifyAdminToken, async \(_req, res\) => \{[\s\S]*?\}\);/,
  `router.get('/admin/verify', verifyAdminToken, async (_req, res) => {
  return res.json({ success: true, verified: true });
});`
);

// Delete /admin/login
code = code.replace(
  /router\.post\('\/admin\/login', adminLoginLimiter, async \(req, res\) => \{[\s\S]*?\}\);/,
  ``
);

// Delete /admin/logout
code = code.replace(
  /router\.post\('\/admin\/logout', verifyAdminToken, async \(req, res\) => \{[\s\S]*?\}\);/,
  ``
);

fs.writeFileSync('server/routes/authRoutes.ts', code);
console.log("Rewrote authRoutes.ts verify");
