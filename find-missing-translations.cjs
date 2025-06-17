#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = './client/src';
const translationFiles = {
  en: './client/src/i18n/locales/en/translation.json',
  pl: './client/src/i18n/locales/pl/translation.json',
  es: './client/src/i18n/locales/es/translation.json'
};

const translationKeyRegex = /t\(['"`]([^'"`]+)['"`]\)/g;
const missingKeys = {
  en: [],
  pl: [],
  es: []
};

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
      arrayOfFiles.push(filePath);
    }
  });
  return arrayOfFiles;
}

function extractTranslationKeys(content) {
  const keys = new Set();
  let match;
  while ((match = translationKeyRegex.exec(content)) !== null) {
    keys.add(match[1]);
  }
  return Array.from(keys);
}

function loadTranslationFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function checkMissingKeys(keys, translations) {
  return keys.filter(key => {
    const parts = key.split('.');
    let obj = translations;
    for (const part of parts) {
      if (!obj || !obj.hasOwnProperty(part)) {
        return true;
      }
      obj = obj[part];
    }
    return false;
  });
}

function main() {
  const files = getAllFiles(projectRoot);
  const allKeys = new Set();

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const keys = extractTranslationKeys(content);
    keys.forEach(k => allKeys.add(k));
  });

  for (const lang in translationFiles) {
    const file = translationFiles[lang];
    const translationData = loadTranslationFile(file);
    const missing = checkMissingKeys(Array.from(allKeys), translationData);
    missingKeys[lang] = missing;
  }

  console.log('\n==== Missing Translation Keys ====');
  for (const lang in missingKeys) {
    console.log(`\n[${lang.toUpperCase()}] Missing Keys:`);
    missingKeys[lang].forEach(k => console.log(`- ${k}`));
  }
}

main();
