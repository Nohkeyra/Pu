const fs = require('fs');
let code = fs.readFileSync('.env.example', 'utf8');

if (!code.includes('ADMIN_EMAILS')) {
  code = code.replace(
    `# Admin JWT Secret (Required for production)`,
    `# Admin Auto-Provision Emails (Comma-separated list of emails that will receive admin: true custom claims automatically)
ADMIN_EMAILS=madnor.noisy@gmail.com

# Admin JWT Secret (Required for production)`
  );
  fs.writeFileSync('.env.example', code);
  console.log("Patched .env.example");
}
