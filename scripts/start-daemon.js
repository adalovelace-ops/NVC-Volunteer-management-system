const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const pidDir = path.join(projectRoot, '.dev-pids');

if (!fs.existsSync(pidDir)) {
  fs.mkdirSync(pidDir, { recursive: true });
}

// Ensure clean log files
const backendLog = path.join(pidDir, 'backend.log');
const backendErrLog = path.join(pidDir, 'backend.err.log');
const webLog = path.join(pidDir, 'web.log');
const webErrLog = path.join(pidDir, 'web.err.log');

const backendOut = fs.openSync(backendLog, 'w');
const backendErr = fs.openSync(backendErrLog, 'w');
const webOut = fs.openSync(webLog, 'w');
const webErr = fs.openSync(webErrLog, 'w');

// Spawn Backend Daemon
const backendProc = spawn(
  process.execPath,
  [path.join(projectRoot, 'scripts', 'run-python.js'), '-m', 'uvicorn', 'backend.api:app', '--host', '0.0.0.0', '--port', '8000', '--ws', 'websockets'],
  {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', backendOut, backendErr],
    windowsHide: true,
  }
);
fs.writeFileSync(path.join(pidDir, 'backend.pid'), String(backendProc.pid));
backendProc.unref();

// Spawn Web Daemon
const webProc = spawn(
  process.execPath,
  [path.join(projectRoot, 'scripts', 'run-vite.mjs')],
  {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', webOut, webErr],
    windowsHide: true,
  }
);
fs.writeFileSync(path.join(pidDir, 'web.pid'), String(webProc.pid));
webProc.unref();

console.log(`Volunteer System daemons detached:`);
console.log(`  Backend: PID ${backendProc.pid} on port 8000`);
console.log(`  Web:     PID ${webProc.pid} on port 8081`);
