#!/usr/bin/env node
/**
 * Display system startup information with QR code
 * Shows all access URLs and connection details
 * Usage: node scripts/show-startup-info.js
 */

const os = require('os');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

function getLanIp() {
  const interfaces = os.networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    if (!addresses) continue;

    for (const address of addresses) {
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }

  return '127.0.0.1';
}

async function generateQRCode(url) {
  try {
    return await QRCode.toString(url, {
      errorCorrectionLevel: 'H',
      type: 'terminal',
      width: 10,
    });
  } catch (err) {
    return null;
  }
}

async function showInfo() {
  const lanIp = getLanIp();
  const webUrl = `exp://${lanIp}:8081`;
  const webUrl = 'http://localhost:8081';
  const backendUrl = 'http://localhost:8000';
  const apiLanUrl = `http://${lanIp}:8000`;

  console.log('\x1b[36m╔═══════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║        📋 VOLUNTEER SYSTEM - CONNECTION INFORMATION       ║\x1b[0m');
  console.log('\x1b[36m╚═══════════════════════════════════════════════════════════╝\x1b[0m');
  console.log('\n');

  console.log('\x1b[32m✅ LOCAL DEVELOPMENT URLs:\x1b[0m');
  console.log('\x1b[33m┌─────────────────────────────────────────────────────────┐\x1b[0m');
  console.log('\x1b[33m│ Backend API:  \x1b[36m' + backendUrl + '\x1b[33m                │\x1b[0m');
  console.log('\x1b[33m│ Web App:      \x1b[36m' + webUrl + '\x1b[33m              │\x1b[0m');
  console.log('\x1b[33m│ API Docs:     \x1b[36m' + backendUrl + '/docs\x1b[33m                  │\x1b[0m');
  console.log('\x1b[33m└─────────────────────────────────────────────────────────┘\x1b[0m');
  console.log('\n');

  console.log('\x1b[35m📱 MOBILE DEVICE URLs (LAN - Same WiFi):\x1b[0m');
  console.log('\x1b[33m┌─────────────────────────────────────────────────────────┐\x1b[0m');
  console.log('\x1b[33m│ Your LAN IP:  \x1b[36m' + lanIp + '\x1b[33m                         │\x1b[0m');
  console.log('\x1b[33m│ Web URL:     \x1b[36m' + webUrl + '\x1b[33m      │\x1b[0m');
  console.log('\x1b[33m│ API URL:      \x1b[36m' + apiLanUrl + '\x1b[33m                │\x1b[0m');
  console.log('\x1b[33m└─────────────────────────────────────────────────────────┘\x1b[0m');
  console.log('\n');

  const qr = await generateQRCode(webUrl);
  console.log('\x1b[36m📲 WEB GO QR CODE:\x1b[0m');
  console.log('   (Scan with mobile web app or press "w" in dev server)\n');
  if (qr) {
    console.log(qr);
  } else {
    console.log('   URL: ' + webUrl);
  }
  console.log('\n');

  console.log('\x1b[34m📚 USAGE:\x1b[0m');
  console.log('   \x1b[33mnpm start\x1b[0m          → Start everything (Backend + Web)');
  console.log('   \x1b[33mnpm run web:web\x1b[0m   → Web version only');
  console.log('   \x1b[33mnpm run backend\x1b[0m    → Backend API only');
  console.log('   \x1b[33mnpm run web:start\x1b[0m  → Web with QR code');
  console.log('\n');

  console.log('\x1b[32m✨ QUICK TIPS:\x1b[0m');
  console.log('   • Web: Open http://localhost:8081 in your browser');
  console.log('   • Mobile: Scan QR code with mobile web app');
  console.log('   • LAN: Use ' + lanIp + ' for mobile API access');
  console.log('   • Press "w" in dev server for web, "a" for Android, "i" for iOS');
  console.log('\n');

  console.log('\x1b[36m═══════════════════════════════════════════════════════════\x1b[0m\n');
}

showInfo().catch(err => {
  console.error('\x1b[31m✗ Error:\x1b[0m', err.message);
  process.exit(1);
});
