const fs = require('fs');
let code = fs.readFileSync('src/hooks/useDeviceMotion3D.ts', 'utf8');

code = code.replace(/let listenerHandle: any = null;/g, 'let listenerHandle: { remove: () => void } | null = null;');
code = code.replace(/typeof \(DeviceMotionEvent as any\)/g, 'typeof (window as unknown as { DeviceMotionEvent: unknown }).DeviceMotionEvent');
code = code.replace(/await \(DeviceMotionEvent as any\)\.requestPermission\(\)/g, 'await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()');
code = code.replace(/catch\(e\) \{/g, 'catch(err) {');
code = code.replace(/} catch\(err\) \{\}/g, '} catch (err) { /* ignore */ }');

fs.writeFileSync('src/hooks/useDeviceMotion3D.ts', code);
