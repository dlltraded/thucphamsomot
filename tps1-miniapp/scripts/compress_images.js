import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputDir = path.resolve(process.cwd(), 'public/images/products');
const outputDir = path.resolve(process.cwd(), 'public/images/products');

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.png'));

console.log(`Found ${files.length} PNG files to compress...`);

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const inputPath = path.join(inputDir, file);
  const baseName = path.basename(file, '.png');
  const outputPath = path.join(outputDir, `${baseName}.jpg`);
  
  const statBefore = fs.statSync(inputPath);
  totalBefore += statBefore.size;

  await sharp(inputPath)
    .resize(300, 300, { 
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 75, mozjpeg: true })
    .toFile(outputPath);

  const statAfter = fs.statSync(outputPath);
  totalAfter += statAfter.size;

  // Remove the old PNG
  fs.unlinkSync(inputPath);
  
  const pct = Math.round((1 - statAfter.size / statBefore.size) * 100);
  console.log(`✓ ${baseName}: ${Math.round(statBefore.size/1024)}KB → ${Math.round(statAfter.size/1024)}KB (-${pct}%)`);
}

console.log(`\n===== DONE =====`);
console.log(`Total before: ${(totalBefore/1024/1024).toFixed(2)} MB`);
console.log(`Total after:  ${(totalAfter/1024/1024).toFixed(2)} MB`);
console.log(`Saved: ${((totalBefore - totalAfter)/1024/1024).toFixed(2)} MB (${Math.round((1 - totalAfter/totalBefore)*100)}% reduction)`);
