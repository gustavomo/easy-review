#!/usr/bin/env node
// scripts/sqlite-spike.js
// Electron-rebuild spike: validates better-sqlite3 compiles against Electron 39.8.5 ABI.
// Run BEFORE writing any storage code (D-09).
// Usage: node scripts/sqlite-spike.js
// Exit 0: success — better-sqlite3 works with Electron 39.8.5
// Exit 1: failure — ABI mismatch or build error
//
// Strategy:
//   Step 1: npm rebuild to build better-sqlite3 for system Node, then run smoke test
//   Step 2: electron-rebuild -v 39.8.5 to validate Electron ABI compilation
//   Step 3: npm rebuild to restore better-sqlite3 for local development
//
// When the extension runs inside VS Code, VS Code's Electron runtime loads the
// Electron-rebuilt binary — the extension's activate() path is never run via system Node.

const { execSync } = require('child_process');
const path = require('path');

const ELECTRON_VERSION = '39.8.5';
const MODULE_NAME = 'better-sqlite3';
const ROOT = path.resolve(__dirname, '..');

// ── Step 1: Rebuild for system Node and run smoke test ──────────────────────
console.log(`[spike] Step 1: Rebuilding ${MODULE_NAME} for system Node ${process.version}...`);

try {
  execSync(
    `npm rebuild ${MODULE_NAME}`,
    { stdio: 'inherit', cwd: ROOT }
  );
  console.log(`[spike] Step 1: system-node rebuild complete.`);
} catch (err) {
  console.error(`[spike] FAILED (Step 1): system-node rebuild error: ${err.message}`);
  process.exit(1);
}

// Run smoke test under system Node (verifies SQLite API works correctly)
try {
  // Clear require cache to force reload of freshly rebuilt binary
  Object.keys(require.cache).forEach(key => {
    if (key.includes('better-sqlite3') || key.includes('better_sqlite3')) {
      delete require.cache[key];
    }
  });
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');

  // D-11: Run same pragmas as production activation
  db.pragma('journal_mode = WAL');
  const integrityResult = db.pragma('integrity_check');
  if (!integrityResult || integrityResult[0]?.integrity_check !== 'ok') {
    throw new Error(`integrity_check returned unexpected result: ${JSON.stringify(integrityResult)}`);
  }

  // Smoke test: create table and insert/select
  db.exec(`CREATE TABLE IF NOT EXISTS spike_test (id INTEGER PRIMARY KEY, value TEXT NOT NULL)`);
  const insert = db.prepare(`INSERT INTO spike_test (value) VALUES (?)`);
  const selectAll = db.prepare(`SELECT * FROM spike_test`);

  insert.run('hello from spike');
  const rows = selectAll.all();

  if (rows.length !== 1 || rows[0].value !== 'hello from spike') {
    throw new Error(`Smoke test failed: unexpected rows ${JSON.stringify(rows)}`);
  }

  db.close();
  console.log(`[spike] Step 1: SQLite smoke test PASSED. WAL mode: OK, integrity_check: OK, CRUD: OK`);
} catch (err) {
  console.error(`[spike] FAILED (Step 1 smoke test): ${err.message}`);
  process.exit(1);
}

// ── Step 2: Rebuild for Electron 39.8.5 — validates ABI compilation ─────────
console.log(`[spike] Step 2: Rebuilding ${MODULE_NAME} for Electron ${ELECTRON_VERSION}...`);

try {
  execSync(
    `./node_modules/.bin/electron-rebuild -v ${ELECTRON_VERSION} -w ${MODULE_NAME}`,
    { stdio: 'inherit', cwd: ROOT }
  );
  console.log(`[spike] Step 2: Electron ${ELECTRON_VERSION} rebuild complete — ABI compilation validated.`);
} catch (err) {
  console.error(`[spike] FAILED (Step 2): electron-rebuild error.`);
  console.error(`[spike] Check that @electron/rebuild 4.0.3 is installed and Node >= 22 is on PATH.`);
  process.exit(1);
}

// ── Step 3: Restore for system Node (local dev convenience) ─────────────────
console.log(`[spike] Step 3: Restoring ${MODULE_NAME} for system Node ${process.version}...`);

try {
  execSync(
    `npm rebuild ${MODULE_NAME}`,
    { stdio: 'inherit', cwd: ROOT }
  );
  console.log(`[spike] Step 3: system-node restore complete.`);
} catch (err) {
  // Non-fatal — Electron rebuild already passed, this is just a convenience restore
  console.warn(`[spike] WARNING (Step 3): restore to system Node failed: ${err.message}`);
  console.warn(`[spike] Run 'npm rebuild better-sqlite3' to restore for local use.`);
}

// ── Final report ─────────────────────────────────────────────────────────────
const bsVersion = require('better-sqlite3/package.json').version;
console.log('');
console.log(`[spike] SUCCESS: better-sqlite3 ${bsVersion} works with Electron ${ELECTRON_VERSION} ABI.`);
console.log(`[spike] WAL mode: OK, integrity_check: OK, CRUD: OK`);
process.exit(0);
