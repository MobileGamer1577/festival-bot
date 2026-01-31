const fs = require("fs");
const path = require("path");

// --- Server Sprache speichern ---
const dataPath = path.join(__dirname, "../../data");
const langFile = path.join(dataPath, "languages.json");

function ensureStore() {
  if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
  if (!fs.existsSync(langFile)) fs.writeFileSync(langFile, JSON.stringify({}), "utf8");
}

function readLangs() {
  ensureStore();
  return JSON.parse(fs.readFileSync(langFile, "utf8"));
}

function writeLangs(obj) {
  ensureStore();
  fs.writeFileSync(langFile, JSON.stringify(obj, null, 2), "utf8");
}

function setGuildLang(guildId, lang) {
  const all = readLangs();
  all[guildId] = lang;
  writeLangs(all);
}

function getGuildLang(guildId) {
  if (!guildId) return "de";
  const all = readLangs();
  return all[guildId] || "de";
}

// --- Übersetzungen laden aus src/locales/*.json ---
const localesDir = path.join(__dirname, "../locales");
const STRINGS = {};

for (const file of fs.readdirSync(localesDir)) {
  if (!file.endsWith(".json")) continue;
  const lang = file.replace(".json", "");
  const filePath = path.join(localesDir, file);
  STRINGS[lang] = JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function t(lang, key) {
  return (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS.de && STRINGS.de[key]) || key;
}

function availableLanguages() {
  return Object.keys(STRINGS);
}

module.exports = { setGuildLang, getGuildLang, t, availableLanguages };