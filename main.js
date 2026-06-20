'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const RENDERER_LOG = path.join(app.getPath('userData'), 'renderer-errors.log');
function logRenderer(msg) {
  try {
    fs.appendFileSync(RENDERER_LOG, `[${new Date().toISOString()}] ${msg}\n`, 'utf8');
  } catch {}
}

const store = require('./lib/store');
const config = require('./lib/config');
const limits = require('./lib/limits');
const credentials = require('./lib/credentials');
const zcode = require('./lib/zcode');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 760,
    minWidth: 560,
    minHeight: 520,
    title: 'ГиряGLM',
    backgroundColor: '#0b0d12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.env.ZS_DEBUG === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) logRenderer(`[console:${level}] ${message}`);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    logRenderer(`[render-process-gone] ${JSON.stringify(details)}`);
  });
  mainWindow.webContents.on('preload-error', (_e, p, error) => {
    logRenderer(`[preload-error] ${p} ${error && error.message}`);
  });
}

function getActiveApiKey() {
  return credentials.getCurrentJwt() || config.getCurrentApiKey();
}

ipcMain.handle('accounts:list', async () => {
  const accounts = store.listAccounts();
  const currentKey = getActiveApiKey();
  const currentId = currentKey ? store.makeId(currentKey) : null;
  return {
    accounts,
    activeId: accounts.find((a) => a.id === currentId) ? currentId : null,
    zcodeRunning: await zcode.isRunning(),
  };
});

ipcMain.handle('accounts:importCurrent', async () => {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    return { ok: false, error: 'Не найден активный JWT (ни в credentials.json, ни в config.json)' };
  }
  if (!limits.isValidJwt(apiKey)) {
    return { ok: false, error: 'Текущий apiKey не похож на валидный JWT' };
  }
  const payload = limits.decodeJwt(apiKey) || {};
  const accessToken = credentials.getCurrentAccessToken();
  const userInfo = credentials.getCurrentUserInfo();
  const rawCredentials = credentials.getRawCredentials();
  const account = store.addAccount({
    apiKey,
    userId: payload.user_id || payload.sub || null,
    accessToken,
    userInfo,
    rawCredentials: Object.keys(rawCredentials).length > 0 ? rawCredentials : null,
  });
  return { ok: true, account };
});

ipcMain.handle('accounts:addManual', async (_evt, { apiKey, label }) => {
  if (!apiKey || !limits.isValidJwt(apiKey)) {
    return { ok: false, error: 'Невалидный JWT' };
  }
  const payload = limits.decodeJwt(apiKey) || {};
  const account = store.addAccount({ apiKey, userId: payload.user_id || payload.sub || null, label });
  return { ok: true, account };
});

ipcMain.handle('accounts:delete', async (evt, { id }) => {
  const accounts = store.listAccounts();
  const acc = accounts.find((a) => a.id === id);
  const confirmed = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Удалить', 'Отмена'],
    defaultId: 1,
    cancelId: 1,
    title: 'Удаление аккаунта',
    message: `Удалить «${acc ? acc.label : id}»?`,
    detail: 'JWT будет удалён только из этой программы. Текущий config.json ZCode не изменится.',
  });
  if (confirmed.response !== 0) return { ok: false, canceled: true };
  const removed = store.removeAccount(id);
  limitsCache.delete(id);
  return { ok: removed };
});

ipcMain.handle('accounts:rename', async (_evt, { id, label }) => {
  const acc = store.renameAccount(id, label);
  return { ok: !!acc, account: acc };
});

const LIMITS_TTL_MS = 60 * 1000;
const limitsCache = new Map();

ipcMain.handle('limits:fetch', async (_evt, { id, force }) => {
  const accounts = store.listAccounts();
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return { ok: false, error: 'Аккаунт не найден' };

  if (!force) {
    const hit = limitsCache.get(id);
    if (hit && Date.now() - hit.at < LIMITS_TTL_MS) {
      return { ok: true, cached: true, cachedAt: hit.at, ...hit.result };
    }
  }

  try {
    const result = await limits.fetchLimits(acc.apiKey);
    limitsCache.set(id, { at: Date.now(), result });
    return { ok: true, cached: false, fetchedAt: Date.now(), ...result };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
});

ipcMain.handle('account:switchAndLaunch', async (_evt, { id }) => {
  const accounts = store.listAccounts();
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return { ok: false, error: 'Аккаунт не найден' };
  if (!limits.isValidJwt(acc.apiKey)) {
    return { ok: false, error: 'JWT аккаунта невалиден' };
  }

  limitsCache.clear();

  try {
    await zcode.killZcode();
    await new Promise((r) => setTimeout(r, 600));
  } catch (e) {
    return { ok: false, error: 'Не удалось закрыть ZCode: ' + (e.message || e) };
  }

  try {
    if (acc.rawCredentials) {
      credentials.writeCredentials(acc.rawCredentials);
    } else {
      credentials.setActiveAccount({ jwt: acc.apiKey, accessToken: acc.accessToken, userInfo: acc.userInfo });
    }
  } catch (e) {
    return { ok: false, error: 'Не удалось записать credentials.json: ' + (e.message || e) };
  }

  try {
    config.setCurrentApiKey(acc.apiKey);
  } catch (e) {
    console.warn('config.json update failed (non-fatal):', e.message);
  }

  try {
    await zcode.launchZcode();
  } catch (e) {
    return { ok: false, error: 'Ключ применён, но ZCode не запустился: ' + (e.message || e) };
  }

  return { ok: true, activeId: acc.id };
});

app.whenReady().then(() => {
  store.init(app.getPath('userData'));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
