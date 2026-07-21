const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  '<AppContent />',
  `<motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={!isAppLoading ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  className="flex-grow flex flex-col w-full h-full"
                >
                  <AppContent />
                </motion.div>`
);
fs.writeFileSync('src/App.tsx', code);
