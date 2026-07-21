const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace escaped backticks
code = code.replace(/\\`/g, '`');

// Replace escaped dollar signs
code = code.replace(/\\\$/g, '$');

// The tricky part: we only want to replace '\\n' with '\n' in the places where it was double-escaped by mistake.
// Let's look at the ones we know:
code = code.replace(/\\n\\n/g, '\n\n');

// Line 559: replace(/\\n/g, "\\n") -> it should be replace(/\\n/g, "\n") like line 58.
code = code.replace(/replace\(\/\\\\n\/g, "\\\\n"\)/g, 'replace(/\\\\n/g, "\\n")');

// Line 1907: replace(/\\n/g, '<br>')
// In the file it's probably replace(/\\\\n/g, '<br>')? Let's check what it is.
fs.writeFileSync('server.ts.fixed', code);
