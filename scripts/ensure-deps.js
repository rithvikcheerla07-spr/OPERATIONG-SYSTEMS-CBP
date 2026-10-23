#!/usr/bin/env node

/**
 * Cross-platform dependency check.
 * Runs `npm install` only if node_modules directory does not exist or is empty.
 * Operates portably across Linux, macOS, and Windows.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const nodeModulesPath = path.join(rootDir, 'node_modules');

let needsInstall = false;

if (!fs.existsSync(nodeModulesPath)) {
  needsInstall = true;
} else {
  try {
    const entries = fs.readdirSync(nodeModulesPath);
    if (entries.length === 0) {
      needsInstall = true;
    }
  } catch (err) {
    needsInstall = true;
  }
}

if (needsInstall) {
  console.log('[ensure-deps] node_modules not found. Running npm install...');
  try {
    execSync('npm install', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log('[ensure-deps] Dependencies installed successfully.');
  } catch (err) {
    console.error('[ensure-deps] Error installing dependencies:', err);
    process.exit(1);
  }
} else {
  console.log('[ensure-deps] node_modules already present. Skipping install.');
}
