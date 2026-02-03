// src/utils/localeSync.js
const fs = require("fs");
const path = require("path");

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}
function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}
function syncObject(target, template, opts) {
  const { prune, force } = opts;

  for (const [key, tVal] of Object.entries(template)) {
    const has = Object.prototype.hasOwnProperty.call(target, key);

    if (!has) {
      target[key] = deepClone(tVal);
      continue;
    }

    const cVal = target[key];

    if (isObject(tVal) && isObject(cVal)) {
      syncObject(cVal, tVal, opts);
    } else if (force) {
      target[key] = deepClone(tVal);
    }
  }

  if (prune) {
    for (const key of Object.keys(target)) {
      if (!Object.prototype.hasOwnProperty.call(template, key)) delete target[key];
    }
  }

  return target;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

async function syncLocalesFromEn({
  localesDir = path.join(process.cwd(), "src", "locales"),
  prune = false,
  forceEn = false,
  dry = false,
} = {}) {
  const enFile = path.join(localesDir, "en.json");
  if (!fs.existsSync(enFile)) throw new Error(`en.json nicht gefunden: ${enFile}`);
  if (!fs.existsSync(localesDir)) throw new Error(`locales Ordner nicht gefunden: ${localesDir}`);

  const en = readJson(enFile);

  const files = fs
    .readdirSync(localesDir)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => f !== "en.json" && f !== "de.json");

  let updated = 0;
  let unchanged = 0;

  for (const file of files) {
    const full = path.join(localesDir, file);
    const before = fs.readFileSync(full, "utf8");
    const json = JSON.parse(before);

    const synced = syncObject(json, en, { prune, force: forceEn });
    const after = JSON.stringify(synced, null, 2) + "\n";

    if (after !== before) {
      updated++;
      if (!dry) writeJson(full, synced);
    } else {
      unchanged++;
    }
  }

  return { scanned: files.length, updated, unchanged, dry, prune, forceEn };
}

module.exports = { syncLocalesFromEn };
