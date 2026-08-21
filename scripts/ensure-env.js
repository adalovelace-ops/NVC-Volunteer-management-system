const fs = require('fs');
const path = require('path');

const envPath = path.join(path.resolve(__dirname, '..'), '.env');

if (fs.existsSync(envPath)) {
  process.exit(0);
}

console.warn('.env not found. Create one before starting the backend.');
process.exit(0);
