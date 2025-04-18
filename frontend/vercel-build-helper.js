const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Vercel build helper for Vue frontend...');

// Check if node_modules/@vue/cli-service exists
const cliServicePath = path.join(__dirname, 'node_modules', '@vue', 'cli-service');
if (!fs.existsSync(cliServicePath)) {
  console.log('@vue/cli-service not found in node_modules, installing...');
  execSync('npm install @vue/cli-service', { stdio: 'inherit' });
} else {
  console.log('@vue/cli-service already installed.');
}

// Create a simple script to run vue-cli-service
const binScript = `#!/usr/bin/env node
require('@vue/cli-service/bin/vue-cli-service.js');
`;

const binDir = path.join(__dirname, 'node_modules', '.bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const vueCliBinPath = path.join(binDir, 'vue-cli-service');
fs.writeFileSync(vueCliBinPath, binScript);
fs.chmodSync(vueCliBinPath, '755');

console.log('Created vue-cli-service executable in node_modules/.bin');
console.log('Running the build now...');

try {
  execSync('node_modules/.bin/vue-cli-service build', { stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 