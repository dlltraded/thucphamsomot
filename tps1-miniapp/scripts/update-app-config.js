import fs from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist');
const assetsDir = path.join(distDir, 'assets');
const appConfigPath = path.resolve(process.cwd(), 'app-config.json');

try {
  if (!fs.existsSync(assetsDir)) {
    throw new Error('dist/assets not found. Please run build first.');
  }

  const files = fs.readdirSync(assetsDir);

  // Tìm file JS (index-*.js)
  const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
  // Tìm file CSS (index-*.css) — optional với iife format
  const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));

  if (!jsFile) {
    throw new Error('Could not find compiled JS in dist/assets/');
  }

  const jsPath = `/assets/${jsFile}`;
  const cssPath = cssFile ? `/assets/${cssFile}` : null;

  console.log(`Found compiled JS: ${jsPath}`);
  if (cssPath) console.log(`Found compiled CSS: ${cssPath}`);
  else console.log('No separate CSS file found (likely inlined in JS).');

  // Update app-config.json
  const configContent = fs.readFileSync(appConfigPath, 'utf8');
  const appConfig = JSON.parse(configContent);

  appConfig.listSyncJS = [jsPath];
  appConfig.listCSS = cssPath ? [cssPath] : [];

  fs.writeFileSync(appConfigPath, JSON.stringify(appConfig, null, 2), 'utf8');
  console.log('Successfully updated app-config.json with latest assets!');

} catch (error) {
  console.error('Error updating app-config.json:', error.message);
  process.exit(1);
}
