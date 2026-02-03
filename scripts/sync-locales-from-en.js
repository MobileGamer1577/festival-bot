// scripts/sync-locales-from-en.js
// Sync: en.json -> alle anderen Locale-Dateien (außer de.json und en.json)
//
// Default: nur fehlende Keys hinzufügen (keine Übersetzungen überschreiben)
// Flags:
//   --prune     Entfernt Keys, die nicht mehr in en.json existieren
//   --force-en  Setzt ALLE Values auf Englisch (überschreibt Übersetzungen) -> Vorsicht
//   --dry       Zeigt nur an, was passieren würde (schreibt nichts)
//   --file=xx   Nur diese Locale-Datei bearbeiten (z.B. --file=fr oder --file=fr.json)

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(process.cwd(), "src", "locales");
const EN_FILE = path.join(LOCALES_DIR, "en.json");

const PRUNE = process.argv.includes("--prune");
const FORCE_EN = process.argv.includes("--force-en");
const DRY = process.argv.includes("--dry");

// NEW: optional single-file mode
const FILE_ARG = process.argv.find((a) => a.startsWith("--file="));
const ONLY_FILE = FILE_ARG ? FILE_ARG.split("=", 2)[1].trim() : null;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

/**
 * Merge template(en) into target:
 * - add missing keys
 * - optionally prune keys not in template
 * - optionally overwrite all values with template (force)
 */
function syncObject(target, template, opts) {
  const { prune, force } = opts;

  // add/update from template
  for (const [key, tVal] of Object.entries(template)) {
    const has = Object.prototype.hasOwnProperty.call(target, key);

    if (!has) {
      target[key] = deepClone(tVal);
      continue;
    }

    const cVal = target[key];

    if (isObject(tVal) && isObject(cVal)) {
      syncObject(cVal, tVal, opts);
    } else {
      if (force) {
        target[key] = deepClone(tVal);
      }
      // else: target value behalten
    }
  }

  // prune keys not in template
  if (prune) {
    for (const key of Object.keys(target)) {
      if (!Object.prototype.hasOwnProperty.call(template, key)) {
        delete target[key];
      }
    }
  }

  return target;
}

function main() {
  if (!fs.existsSync(EN_FILE)) {
    console.error(`❌ en.json nicht gefunden: ${EN_FILE}`);
    process.exit(1);
  }
  if (!fs.existsSync(LOCALES_DIR)) {
    console.error(`❌ locales Ordner nicht gefunden: ${LOCALES_DIR}`);
    process.exit(1);
  }

  const en = readJson(EN_FILE);

  let files = fs
    .readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => f !== "en.json" && f !== "de.json");

  // NEW: filter for single file if provided
  if (ONLY_FILE) {
    const wanted = ONLY_FILE.endsWith(".json") ? ONLY_FILE : `${ONLY_FILE}.json`;

    // extra safety: never allow en/de via --file
    if (wanted === "en.json" || wanted === "de.json") {
      console.error("❌ --file darf nicht en.json oder de.json sein.");
      process.exit(1);
    }

    files = files.filter((f) => f === wanted);

    if (files.length === 0) {
      console.error(`❌ Datei nicht gefunden in ${LOCALES_DIR}: ${wanted}`);
      process.exit(1);
    }
  }

  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const file of files) {
    const full = path.join(LOCALES_DIR, file);

    try {
      const before = fs.readFileSync(full, "utf8");
      const json = JSON.parse(before);

      const synced = syncObject(json, en, { prune: PRUNE, force: FORCE_EN });

      const after = JSON.stringify(synced, null, 2) + "\n";

      if (after !== before) {
        updated++;
        if (!DRY) writeJson(full, synced);
        console.log(`${DRY ? "🧪 (dry) " : ""}✅ aktualisiert: ${file}`);
      } else {
        unchanged++;
        console.log(`${DRY ? "🧪 (dry) " : ""}➖ unverändert: ${file}`);
      }
    } catch (e) {
      errors++;
      console.error(`❌ Fehler bei ${file}: ${e.message}`);
    }
  }

  console.log("\n--- Ergebnis ---");
  console.log(`📄 Dateien gescannt: ${files.length}`);
  console.log(`✅ Aktualisiert: ${updated}`);
  console.log(`➖ Unverändert: ${unchanged}`);
  console.log(`❌ Fehler: ${errors}`);

  console.log("\nOptionen:");
  console.log("  --dry       nur anzeigen, nichts schreiben");
  console.log("  --prune     Keys entfernen, die nicht in en.json sind");
  console.log("  --force-en  ALLE Values auf Englisch setzen (überschreibt Übersetzungen!)");
  console.log("  --file=xx   nur diese Locale-Datei bearbeiten (z.B. --file=fr)");
}

main();