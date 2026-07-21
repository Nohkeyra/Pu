const fs = require('fs');
let code = fs.readFileSync('src/pages/LoginPage.tsx', 'utf8');

code = code.replace(
  /className="w-full h-full object-contain mix-blend-multiply"/g,
  'className="w-full h-full object-contain mix-blend-multiply drop-shadow-2xl"\n                  style={{ transform: "translateZ(30px)" }}'
);

fs.writeFileSync('src/pages/LoginPage.tsx', code);
