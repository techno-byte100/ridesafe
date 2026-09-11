const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components', 'super-admin');
const i18nDir = path.join(__dirname, 'src', 'i18n');

const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));
const keysInCode = new Set();

files.forEach(file => {
  const content = fs.readFileSync(path.join(componentsDir, file), 'utf8');
  const regex = /t\(['"]superAdmin\.([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keysInCode.add(match[1]);
  }
});

const enPath = path.join(i18nDir, 'en.json');
const msPath = path.join(i18nDir, 'ms.json');
const zhPath = path.join(i18nDir, 'zh.json');

const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const msJson = JSON.parse(fs.readFileSync(msPath, 'utf8'));
const zhJson = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

if (!enJson.superAdmin) enJson.superAdmin = {};
if (!msJson.superAdmin) msJson.superAdmin = {};
if (!zhJson.superAdmin) zhJson.superAdmin = {};

function humanize(key) {
  let text = key.split('.').pop();
  if (text === text.toUpperCase()) {
    text = text.toLowerCase().replace(/_/g, ' ');
  }
  text = text.replace(/([A-Z])/g, ' $1').trim();
  text = text.charAt(0).toUpperCase() + text.slice(1);
  text = text.replace(/Btn$/i, '').replace(/Label$/i, '').replace(/Title$/i, '').replace(/Sub$/i, '').trim();
  return text;
}

let added = 0;
keysInCode.forEach(fullKey => {
  const parts = fullKey.split('.');
  let enRef = enJson.superAdmin;
  let msRef = msJson.superAdmin;
  let zhRef = zhJson.superAdmin;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!enRef[p]) enRef[p] = {};
    if (!msRef[p]) msRef[p] = {};
    if (!zhRef[p]) zhRef[p] = {};
    enRef = enRef[p];
    msRef = msRef[p];
    zhRef = zhRef[p];
  }
  
  const last = parts[parts.length - 1];
  if (enRef[last] === undefined) {
    const val = humanize(fullKey);
    enRef[last] = val;
    msRef[last] = val; // fallback
    zhRef[last] = val; // fallback
    added++;
  }
});

fs.writeFileSync(enPath, JSON.stringify(enJson, null, 2));
fs.writeFileSync(msPath, JSON.stringify(msJson, null, 2));
fs.writeFileSync(zhPath, JSON.stringify(zhJson, null, 2));

console.log(`Added ${added} missing keys to en, ms, zh with humanized fallbacks.`);
