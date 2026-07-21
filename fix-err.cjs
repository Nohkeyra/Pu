const fs = require('fs');
let code = fs.readFileSync('src/hooks/useDeviceMotion3D.ts', 'utf8');

code = code.replace(/catch\(err\) \{/g, 'catch (_err) {');
code = code.replace(/console\.warn\('Device motion permission requires user gesture', e\);/g, 'console.warn("Device motion permission requires user gesture", _err);');
code = code.replace(/} catch \{/g, '} catch (_err) {');
code = code.replace(/console\.warn\("Motion setup failed", err\);/g, 'console.warn("Motion setup failed", _err);');

fs.writeFileSync('src/hooks/useDeviceMotion3D.ts', code);
