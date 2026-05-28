#!/usr/bin/env node

/**
 * Automatic Nunito Font Downloader for Mobile
 * Downloads TTF font files from Google Fonts to assets/fonts/
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(path.dirname(__dirname), 'assets', 'fonts');
const FONT_URLS = {
  'Nunito-Light.ttf': 'https://github.com/google/fonts/raw/main/ofl/nunito/Nunito-Light.ttf',
  'Nunito-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/nunito/Nunito-Regular.ttf',
  'Nunito-SemiBold.ttf': 'https://github.com/google/fonts/raw/main/ofl/nunito/Nunito-SemiBold.ttf',
  'Nunito-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/nunito/Nunito-Bold.ttf',
  'Nunito-ExtraBold.ttf': 'https://github.com/google/fonts/raw/main/ofl/nunito/Nunito-ExtraBold.ttf',
};

// Ensure fonts directory exists
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  console.log(`✓ Created fonts directory: ${FONTS_DIR}`);
}

let downloaded = 0;
let failed = 0;

const downloadFont = (filename, url) => {
  return new Promise((resolve) => {
    const filepath = path.join(FONTS_DIR, filename);

    // Skip if already exists
    if (fs.existsSync(filepath)) {
      console.log(`⊘ ${filename} already exists`);
      return resolve();
    }

    https
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirects
          downloadFont(filename, response.headers.location).then(resolve);
          return;
        }

        const file = fs.createWriteStream(filepath);
        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log(`✓ Downloaded: ${filename}`);
          downloaded++;
          resolve();
        });

        file.on('error', (err) => {
          fs.unlink(filepath, () => {});
          console.error(`✗ Failed to download ${filename}: ${err.message}`);
          failed++;
          resolve();
        });
      })
      .on('error', (err) => {
        console.error(`✗ Error downloading ${filename}: ${err.message}`);
        failed++;
        resolve();
      });
  });
};

const downloadAllFonts = async () => {
  console.log('📥 Downloading Nunito fonts from Google Fonts...\n');

  const promises = Object.entries(FONT_URLS).map(([filename, url]) =>
    downloadFont(filename, url)
  );

  await Promise.all(promises);

  console.log(`\n✓ Download complete!`);
  console.log(`  Downloaded: ${downloaded} fonts`);
  if (failed > 0) console.log(`  Failed: ${failed} fonts`);

  if (downloaded === Object.keys(FONT_URLS).length) {
    console.log(
      '\n✓ All Nunito fonts installed! Mobile support is now enabled.\n'
    );
  }
};

downloadAllFonts().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
