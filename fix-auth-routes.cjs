const fs = require('fs');
let code = fs.readFileSync('server/routes/authRoutes.ts', 'utf8');

// I will just remove the weird floating block
code = code.replace(
  /    \}[\s\n]*console\.warn\([\s\S]*?\}\);[\s\n]*\}/,
  ''
);
// Also remove bcrypt, jsonwebtoken, revokeJti since they aren't used
code = code.replace(`import bcrypt from 'bcryptjs';\n`, '');
code = code.replace(`import jwt from 'jsonwebtoken';\n`, '');

fs.writeFileSync('server/routes/authRoutes.ts', code);
console.log("Fixed authRoutes.ts");
