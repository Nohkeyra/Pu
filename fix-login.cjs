const fs = require('fs');
let code = fs.readFileSync('src/pages/LoginPage.tsx', 'utf8');

code = code.replace(
  '<div className="relative flex items-center justify-center">',
  '<div className="relative flex items-center justify-center" style={{ perspective: 1000 }}>'
);

code = code.replace(
  /className="w-56 h-56 flex items-center justify-center z-10"\s*>/g,
  'className="w-56 h-56 flex items-center justify-center z-10"\n                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>'
);

code = code.replace(
  /className="w-56 h-56 mb-4 flex items-center justify-center"\s*>/g,
  'className="w-56 h-56 mb-4 flex items-center justify-center"\n              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>'
);

// We should also add perspective to the parent of the second logo
code = code.replace(
  /className="relative z-10 w-full max-w-md px-6 flex flex-col items-center"\s*>/g,
  'className="relative z-10 w-full max-w-md px-6 flex flex-col items-center"\n            style={{ perspective: 1000 }}>'
);

fs.writeFileSync('src/pages/LoginPage.tsx', code);
