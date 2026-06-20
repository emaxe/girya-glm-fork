'use strict';

const fs = require('fs');
const path = require('path');

const ZCODE_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.zcode', 'v2');
const CONFIG_PATH = path.join(ZCODE_DIR, 'config.json');
const PROVIDER_ID = 'builtin:zai-start-plan';

function readConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeConfig(configObj) {
  if (fs.existsSync(CONFIG_PATH)) {
    const bak = CONFIG_PATH + '.bak';
    fs.copyFileSync(CONFIG_PATH, bak);
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(configObj, null, 2), 'utf8');
}

function getCurrentApiKey() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  const config = readConfig();
  const provider = config && config.provider && config.provider[PROVIDER_ID];
  if (!provider || !provider.options) return null;
  const key = provider.options.apiKey;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

function setCurrentApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Пустой apiKey');
  }
  const config = readConfig();
  if (!config.provider || !config.provider[PROVIDER_ID]) {
    throw new Error(`Провайдер ${PROVIDER_ID} не найден в config.json`);
  }
  if (!config.provider[PROVIDER_ID].options) {
    config.provider[PROVIDER_ID].options = {};
  }
  config.provider[PROVIDER_ID].options.apiKey = apiKey;
  writeConfig(config);
}

module.exports = {
  CONFIG_PATH,
  PROVIDER_ID,
  readConfig,
  writeConfig,
  getCurrentApiKey,
  setCurrentApiKey,
};
