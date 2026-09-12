const fs = require('fs');
let code = fs.readFileSync('server/routes/orderRoutes.ts', 'utf8');

if (!code.includes('generateServerInvoicePDF')) {
  console.error("Not updated properly");
} else {
  // Wait, I used require() in the previous script! That's bad for ESM.
  code = code.replace(
    `const { generateServerInvoicePDF } = require('../services/serverPdfService.js');`,
    ``
  );
  
  if (!code.includes('import { generateServerInvoicePDF } from "../services/serverPdfService.js";')) {
     code = `import { generateServerInvoicePDF } from "../services/serverPdfService.js";\n` + code;
  }
  
  fs.writeFileSync('server/routes/orderRoutes.ts', code);
  console.log("Patched order routes");
}
