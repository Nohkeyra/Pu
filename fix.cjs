const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
code = code.replace(/\\n\\n/g, '\n\n');

// Also fix the other known bad replacements:
code = code.replace(/replace\(\/\\\\n\/g, "\\\\n"\)/g, 'replace(/\\\\n/g, "\\n")');

fs.writeFileSync('server.ts', code);
