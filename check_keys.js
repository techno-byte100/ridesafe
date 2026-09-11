const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components', 'super-admin');
const i18nDir = path.join(__dirname, 'src', 'i18n');

const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));
const keysInCode = new Set();

files.forEach(file => {
  const content = fs.readFileSync(path.join(componentsDir, file), 'utf8');
  // Match t('superAdmin.namespace.key' or t("superAdmin.namespace.key"
  const regex = /t\(['"]superAdmin\.([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keysInCode.add(match[1]);
  }
});

const enJson = JSON.parse(fs.readFileSync(path.join(i18nDir, 'en.json'), 'utf8'));

const missingKeys = [];
keysInCode.forEach(fullKey => {
  const [namespace, key] = fullKey.split('.');
  if (!enJson.superAdmin || !enJson.superAdmin[namespace] || enJson.superAdmin[namespace][key] === undefined) {
    missingKeys.push(fullKey);
  }
});

console.log(`Found ${missingKeys.length} missing keys in en.json.`);
if (missingKeys.length > 0) {
    console.log(missingKeys.slice(0, 50));
}
