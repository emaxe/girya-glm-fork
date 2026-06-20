'use strict';

const { exec, spawn } = require('child_process');
const path = require('path');

// Возможные пути ZCode на macOS
const ZCODE_PATHS = [
  '/Applications/ZCode.app/Contents/MacOS/ZCode',
  path.join(process.env.HOME || '', 'Applications', 'ZCode.app', 'Contents', 'MacOS', 'ZCode'),
];
const ZCODE_PROCESS_NAME = 'ZCode';

function resolveZcodePath() {
  for (const p of ZCODE_PATHS) {
    try {
      const fs = require('fs');
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  // Если не нашли — возвращаем дефолтный, spawn сам упадёт с понятной ошибкой
  return ZCODE_PATHS[0];
}

const ZCODE_EXE = resolveZcodePath();

function killZcode() {
  return new Promise((resolve) => {
    const cmd =
      process.platform === 'darwin'
        ? `pkill -f "${ZCODE_PROCESS_NAME}" 2>/dev/null; echo done`
        : `taskkill /F /T /FI "IMAGENAME eq ${ZCODE_PROCESS_NAME}.exe"`;
    exec(cmd, () => {
      resolve({ killed: 1 }); // pkill не различает, убил ли он что-то — считаем успехом
    });
  });
}

function isRunning() {
  return new Promise((resolve) => {
    const cmd =
      process.platform === 'darwin'
        ? `pgrep -f "${ZCODE_PROCESS_NAME}" 2>/dev/null || true`
        : `tasklist /FI "IMAGENAME eq ${ZCODE_PROCESS_NAME}.exe" /NH`;
    exec(cmd, (err, stdout) => {
      if (err) return resolve(false);
      if (process.platform === 'darwin') {
        resolve((stdout || '').trim().length > 0);
      } else {
        resolve((stdout || '').toLowerCase().includes('zcode.exe'));
      }
    });
  });
}

function launchZcode() {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(ZCODE_EXE, [], {
        detached: true,
        stdio: 'ignore',
      });
      child.on('error', (e) => reject(new Error('Не удалось запустить ZCode: ' + e.message)));
      child.unref();
      setTimeout(() => resolve(true), 300);
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  ZCODE_EXE,
  killZcode,
  launchZcode,
  isRunning,
};
