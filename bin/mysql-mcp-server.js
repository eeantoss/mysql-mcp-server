#!/usr/bin/env node

// CLI entry for mysql-mcp-server
// Ensures the built ESM entry is executed and start() is called.

import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    const buildEntry = pathToFileURL(join(__dirname, '..', 'build', 'index.js')).href;
    const mod = await import(buildEntry);
    if (typeof mod.start === 'function') {
      await mod.start();
    } else {
      // Fallback: if start() is not exported (older builds), try default behavior by importing the module
      console.error('[mysql-mcp-server] start() not found on build/index.js, imported module only.');
    }
  } catch (err) {
    console.error('[mysql-mcp-server] Failed to start:', err);
    process.exit(1);
  }
}

main();
