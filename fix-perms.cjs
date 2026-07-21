const fs = require('fs');
let code = fs.readFileSync('src/hooks/useDeviceMotion3D.ts', 'utf8');

const permCode = `
      try {
        if (!Capacitor.isNativePlatform()) {
          if (typeof (DeviceMotionEvent as any) !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
              const perm = await (DeviceMotionEvent as any).requestPermission();
              if (perm !== 'granted') {
                console.warn('Device motion permission not granted');
              }
            } catch(e) {
              // Might require user gesture
              console.warn('Device motion permission requires user gesture', e);
            }
          }
        }
      } catch(e) {}
`;

code = code.replace(
  'const requestPermsAndSetup = async () => {',
  'const requestPermsAndSetup = async () => {' + permCode
);

fs.writeFileSync('src/hooks/useDeviceMotion3D.ts', code);
