'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let storePath = null;

function init(userDataDir) {
  storePath = path.join(userDataDir, 'accounts.json');
  if (!fs.existsSync(storePath)) {
    saveAll([]);
  }
}

function readAll() {
  if (!storePath) throw new Error('Store не инициализирован (вызови init)');
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch {
    return [];
  }
}

function saveAll(accounts) {
  if (!storePath) throw new Error('Store не инициализирован');
  fs.writeFileSync(storePath, JSON.stringify(accounts, null, 2), 'utf8');
}

function nextLabel(accounts) {
  let max = 0;
  for (const a of accounts) {
    const m = /^Аккаунт\s+(\d+)$/i.exec(a.label || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `Аккаунт ${max + 1}`;
}

function makeId(apiKey) {
  return crypto.createHash('sha1').update(apiKey).digest('hex').slice(0, 12);
}

function addAccount({ apiKey, userId, label, accessToken, userInfo, rawCredentials }) {
  const accounts = readAll();
  const id = makeId(apiKey);

  const existing = accounts.find((a) => a.id === id);
  if (existing) {
    if (rawCredentials && !existing.rawCredentials) {
      existing.rawCredentials = rawCredentials;
      saveAll(accounts);
    }
    return existing;
  }

  const account = {
    id,
    label: label && label.trim() ? label.trim() : nextLabel(accounts),
    apiKey,
    userId: userId || null,
    accessToken: accessToken || null,
    userInfo: userInfo || null,
    rawCredentials: rawCredentials || null,
    addedAt: Date.now(),
  };
  accounts.push(account);
  saveAll(accounts);
  return account;
}

function removeAccount(id) {
  const accounts = readAll();
  const next = accounts.filter((a) => a.id !== id);
  saveAll(next);
  return accounts.length !== next.length;
}

function listAccounts() {
  return readAll();
}

function renameAccount(id, label) {
  const accounts = readAll();
  const acc = accounts.find((a) => a.id === id);
  if (!acc) return null;
  acc.label = label && label.trim() ? label.trim() : acc.label;
  saveAll(accounts);
  return acc;
}

module.exports = {
  init,
  readAll,
  addAccount,
  removeAccount,
  listAccounts,
  renameAccount,
  nextLabel,
  makeId,
};
