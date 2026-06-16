const fs = require('fs');
const https = require('https');
const path = require('path');

const categories = [
  { id: 'rau-cu', keyword: 'vegetables' },
  { id: 'thit', keyword: 'raw,meat' },
  { id: 'hai-san', keyword: 'raw,seafood' },
  { id: 'ga-vit', keyword: 'raw,chicken' },
  { id: 'dong-lanh', keyword: 'frozen,food' },
  { id: 'gia-vi', keyword: 'spices' }
];

const imagesDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const { execSync } = require('child_process');

async function run() {
  const imagesPerCategory = 5;
  for (const cat of categories) {
    for (let i = 1; i <= imagesPerCategory; i++) {
      const url = `https://loremflickr.com/200/200/${cat.keyword}?lock=${i * 10}`;
      const dest = path.join(imagesDir, `${cat.id}-${i}.jpg`);
      console.log(`Downloading ${dest}...`);
      try {
        execSync(`curl -L -s -o "${dest}" "${url}"`);
      } catch (e) {
        console.error(`Failed to download ${dest}:`, e.message);
      }
    }
  }
  console.log('Done downloading images.');
}

run();
